import { prisma } from "../../prisma/client.js";
import { NotFoundError, ValidationError } from "../../core/errors/errors.js";
import * as repository from "./crm-festival.repository.js";
import { normalizeHighlights } from "../crm-trip/crm-trip.service.js";

const COMMON_INCLUSION_DEFAULTS = (numberOfNights) => [
  { key: "BREAKFAST", numberOfDays: 0 },
  { key: "DINNER", numberOfDays: 0 },
  { key: "TRAVEL", numberOfDays: numberOfNights + 1 },
  { key: "VEHICLE_TYPE", vehicleType: null },
  { key: "FIRST_AID_KIT", isIncluded: true },
];

const COMMON_INCLUSION_LABELS = {
  FIRST_AID_KIT: "First aid kit",
};

const DAY_COMMON_INCLUSION_LABELS = {
  ILP_AND_PERMITS: "ILP and permits",
  BBQ: "BBQ",
  BONFIRE: "Bonfire",
  TRIP_GUIDE: "Trip guide",
};

const configuredDay = (day) =>
  day.stayLocationId ||
  day.propertyId ||
  day.breakfast ||
  day.lunch ||
  day.dinner ||
  day.notes ||
  day.isDropOff ||
  day.dropOffLocationId ||
  day.visitingPlaces.length ||
  day.activities.length;

const validateDepartureSlots = (slots, numberOfNights) => {
  if (!slots?.length)
    throw new ValidationError("At least one dated departure slot is required");
  const expectedDays = numberOfNights + 1;
  for (const slot of slots) {
    const start = new Date(slot.startDate);
    const end = new Date(slot.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
      throw new ValidationError(
        "Every departure needs a valid start and end date",
      );
    const inclusiveDays =
      Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    if (inclusiveDays !== expectedDays) {
      throw new ValidationError(
        `Each departure must cover exactly ${expectedDays} calendar days for this itinerary`,
      );
    }
  }
};

const syncDepartureSlots = async (tx, festivalId, slots, numberOfNights) => {
  validateDepartureSlots(slots, numberOfNights);
  const existing = await tx.crmFestivalSlot.findMany({
    where: { crmFestivalId: festivalId },
    include: { _count: { select: { bookings: true } } },
  });
  const existingById = new Map(existing.map((slot) => [slot.id, slot]));
  const submittedIds = new Set(
    slots.flatMap((slot) => (slot.id ? [slot.id] : [])),
  );
  if (submittedIds.size !== slots.filter((slot) => slot.id).length)
    throw new ValidationError("A departure slot can only be submitted once");

  for (const slot of slots) {
    const data = {
      startDate: new Date(slot.startDate),
      endDate: new Date(slot.endDate),
      capacity: slot.capacity,
      title: slot.title || null,
      priority: slot.priority || 0,
    };
    if (!slot.id) {
      await tx.crmFestivalSlot.create({ data: { ...data, crmFestivalId: festivalId } });
      continue;
    }
    const current = existingById.get(slot.id);
    if (!current)
      throw new ValidationError(
        "A submitted departure does not belong to this CRM festival",
      );
    if (slot.capacity < current.filledSpots)
      throw new ValidationError(
        "A departure capacity cannot be below its booked traveler count",
      );
    const datesChanged =
      current.startDate?.getTime() !== data.startDate.getTime() ||
      current.endDate?.getTime() !== data.endDate.getTime();
    if (current._count.bookings && datesChanged)
      throw new ValidationError(
        "Departure dates cannot be changed after bookings exist",
      );
    await tx.crmFestivalSlot.update({ where: { id: current.id }, data });
  }
  for (const slot of existing) {
    if (submittedIds.has(slot.id)) continue;
    if (slot._count.bookings)
      throw new ValidationError("A departure with bookings cannot be deleted");
    await tx.crmFestivalSlot.delete({ where: { id: slot.id } });
  }
};

const assertDestinationReferences = async (tx, festival, values) => {
  const { stayLocationId, propertyId, dropOffLocationId } = values;
  let stayLocation = null;
  if (stayLocationId) {
    stayLocation = await tx.stayLocation.findFirst({
      where: { id: stayLocationId, destinationId: festival.destinationId },
    });
    if (!stayLocation)
      throw new ValidationError(
        "Stay location must belong to the festival destination",
      );
  }
  if (propertyId) {
    const property = await tx.property.findUnique({
      where: { id: propertyId },
      include: { stayLocation: true },
    });
    if (!property || property.stayLocation.destinationId !== festival.destinationId)
      throw new ValidationError("Property must belong to the festival destination");
    if (!stayLocationId || property.stayLocationId !== stayLocationId)
      throw new ValidationError(
        "Property must belong to the selected stay location",
      );
  }
  if (dropOffLocationId) {
    const transferLocation = await tx.transferLocation.findFirst({
      where: { id: dropOffLocationId, destinationId: festival.destinationId },
    });
    if (!transferLocation)
      throw new ValidationError(
        "Drop-off location must belong to the festival destination",
      );
  }
};

export const regenerateInclusions = async (tx, festivalId) => {
  const festivalSummary = await tx.crmFestival.findUnique({
    where: { id: festivalId },
    select: { numberOfNights: true },
  });
  if (!festivalSummary) throw new NotFoundError("CRM festival not found");
  
  await tx.crmFestivalCommonInclusion.createMany({
    data: COMMON_INCLUSION_DEFAULTS(festivalSummary.numberOfNights).map((item) => ({
      ...item,
      festivalId,
    })),
    skipDuplicates: true,
  });
  const festival = await tx.crmFestival.findUnique({
    where: { id: festivalId },
    include: {
      itineraryDays: {
        orderBy: { dayNumber: "asc" },
        include: {
          property: true,
          dropOffLocation: true,
          visitingPlaces: {
            orderBy: { displayOrder: "asc" },
            include: { place: true },
          },
          activities: { orderBy: { displayOrder: "asc" } },
          commonInclusions: true,
        },
      },
      commonInclusions: true,
    },
  });
  if (!festival) throw new NotFoundError("CRM festival not found");

  const inclusions = [
    {
      type: "ACCOMMODATION",
      sourceKey: "accommodation",
      title: `Accommodation for ${festival.numberOfNights} ${festival.numberOfNights === 1 ? "night" : "nights"}`,
      description: null,
      displayOrder: 0,
    },
  ];

  const breakfastInclusion = festival.commonInclusions.find(
    (item) => item.key === "BREAKFAST",
  );
  if (breakfastInclusion && (breakfastInclusion.numberOfDays ?? 0) > 0) {
    inclusions.push({
      type: "MEAL",
      sourceKey: "common:BREAKFAST",
      title: `${breakfastInclusion.numberOfDays} ${breakfastInclusion.numberOfDays === 1 ? "breakfast" : "breakfasts"}`,
      description: null,
      displayOrder: inclusions.length,
    });
  }
  const dinnerInclusion = festival.commonInclusions.find(
    (item) => item.key === "DINNER",
  );
  if (dinnerInclusion && (dinnerInclusion.numberOfDays ?? 0) > 0) {
    inclusions.push({
      type: "MEAL",
      sourceKey: "common:DINNER",
      title: `${dinnerInclusion.numberOfDays} ${dinnerInclusion.numberOfDays === 1 ? "dinner" : "dinners"}`,
      description: null,
      displayOrder: inclusions.length,
    });
  }
  const travelInclusion = festival.commonInclusions.find(
    (item) => item.key === "TRAVEL",
  );
  if (travelInclusion && (travelInclusion.numberOfDays ?? 0) > 0) {
    inclusions.push({
      type: "TRANSPORT",
      sourceKey: "common:TRAVEL",
      title: `${travelInclusion.numberOfDays} ${travelInclusion.numberOfDays === 1 ? "day" : "days"} travel`,
      description: null,
      displayOrder: inclusions.length,
    });
  }
  const vehicleInclusion = festival.commonInclusions.find(
    (item) => item.key === "VEHICLE_TYPE",
  );
  if (vehicleInclusion?.vehicleType) {
    const formatted = vehicleInclusion.vehicleType.toLowerCase().replaceAll("_", " ");
    inclusions.push({
      type: "TRANSPORT",
      sourceKey: "common:VEHICLE_TYPE",
      title: `Vehicle: ${formatted}`,
      description: null,
      displayOrder: inclusions.length,
    });
  }

  for (const item of festival.commonInclusions) {
    if (item.key === "FIRST_AID_KIT" && item.isIncluded) {
      inclusions.push({
        type: "COMMON",
        sourceKey: `common:${item.key}`,
        title: COMMON_INCLUSION_LABELS[item.key],
        description: null,
        displayOrder: inclusions.length,
      });
    }
  }

  for (const day of festival.itineraryDays) {
    if (day.property) {
      inclusions.push({
        type: "HOTEL_STAY",
        sourceKey: `day:${day.id}:property`,
        title: `Day ${day.dayNumber}: ${day.property.name}`,
        description: null,
        displayOrder: inclusions.length,
        itineraryDayId: day.id,
      });
    }
    for (const item of day.visitingPlaces) {
      inclusions.push({
        type: "SIGHTSEEING",
        sourceKey: `day:${day.id}:place:${item.placeId}`,
        title: `Day ${day.dayNumber}: ${item.place.name}`,
        description: item.place.description || null,
        displayOrder: inclusions.length,
        itineraryDayId: day.id,
      });
    }
    for (const activity of day.activities) {
      inclusions.push({
        type: "ACTIVITY",
        sourceKey: `day:${day.id}:activity:${activity.id}`,
        title: `Day ${day.dayNumber}: ${activity.name}`,
        description: activity.description || null,
        displayOrder: inclusions.length,
        itineraryDayId: day.id,
      });
    }
    if (day.isDropOff) {
      const dropOffName = day.dropOffLocation?.name ? `: ${day.dropOffLocation.name}` : "";
      inclusions.push({
        type: "DROP_OFF_TRANSFER",
        sourceKey: `day:${day.id}:drop-off`,
        title: `Day ${day.dayNumber}: Drop-off transfer${dropOffName}`,
        description: null,
        displayOrder: inclusions.length,
        itineraryDayId: day.id,
      });
    }
    for (const item of day.commonInclusions) {
      inclusions.push({
        type: "COMMON",
        sourceKey: `day:${day.id}:common:${item.key}`,
        title: `Day ${day.dayNumber}: ${DAY_COMMON_INCLUSION_LABELS[item.key]}`,
        description: null,
        displayOrder: inclusions.length,
        itineraryDayId: day.id,
      });
    }
  }

  const existingInclusions = await tx.crmFestivalInclusion.findMany({
    where: { festivalId },
  });
  const existingByKey = new Map(existingInclusions.map((item) => [item.sourceKey, item]));
  const nextKeys = new Set(inclusions.map((item) => item.sourceKey));

  for (const item of inclusions) {
    const previous = existingByKey.get(item.sourceKey);
    if (!previous) {
      await tx.crmFestivalInclusion.create({ data: { ...item, festivalId } });
      continue;
    }
    await tx.crmFestivalInclusion.update({
      where: { id: previous.id },
      data: {
        type: item.type,
        title: previous.isManual ? previous.title : item.title,
        description: previous.isManual ? previous.description : item.description,
        displayOrder: item.displayOrder,
        itineraryDayId: item.itineraryDayId || null,
      },
    });
  }

  const staleManual = existingInclusions.filter(
    (item) => !nextKeys.has(item.sourceKey),
  );
  if (staleManual.length) {
    await tx.crmFestivalInclusion.deleteMany({
      where: { id: { in: staleManual.map((item) => item.id) } },
    });
  }
};

export const listFestivals = async (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(Math.max(1, parseInt(query.limit, 10) || 20), 100);
  const where = {};

  if (query.destinationId) where.destinationId = query.destinationId;
  if (query.isActive !== undefined) where.isActive = query.isActive === "true";
  if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured === "true";
  if (query.isPublished !== undefined) where.isPublished = query.isPublished === "true";
  if (query.isListed !== undefined) where.isListed = query.isListed === "true";
  if (query.search) {
    where.name = { contains: query.search.trim(), mode: "insensitive" };
  }

  return repository.findMany({
    skip: (page - 1) * limit,
    take: limit,
    where,
  });
};



const normalizeStayTransportImages = (arr) => {
  if (!arr) return [];
  let list = arr;
  if (typeof list === "string") {
    try { list = JSON.parse(list); } catch { list = []; }
  }
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    if (!item) return null;
    if (typeof item === "string") return { text: "", imageUrl: item.trim() };
    if (typeof item === "object") {
      let textVal = item.text;
      let imageUrlVal = item.imageUrl || "";
      while (textVal && typeof textVal === "object") {
        if (textVal.imageUrl && !imageUrlVal) imageUrlVal = textVal.imageUrl;
        textVal = textVal.text;
      }
      const textStr = typeof textVal === "string" ? textVal.trim() : "";
      const imageStr = typeof imageUrlVal === "string" ? imageUrlVal.trim() : "";
      if (!textStr && !imageStr) return null;
      return { text: textStr, imageUrl: imageStr };
    }
    return { text: String(item).trim(), imageUrl: "" };
  }).filter(Boolean);
};

const toPublicFestival = (festival) => {
  if (!festival) return null;
  const packages = (festival.packages || []).map((pkg) => ({
    id: pkg.id,
    title: pkg.title,
    price: Number(pkg.price),
    tokenAmount: Number(pkg.tokenAmount),
  }));

  return {
    id: festival.id,
    title: festival.name,
    slug: festival.id,
    location: festival.destination?.name || "",
    duration: festival.numberOfNights + 1,
    bannerImages: festival.websiteBannerImages || [],
    stayTransportImages: normalizeStayTransportImages(festival.websiteStayTransportImages),
    overview: festival.websiteOverview || "",
    highlights: normalizeHighlights(festival.websiteHighlights),
    bestTimeToVisit: festival.bestTimeToVisit || "",
    tripType: festival.tripType || "CUSTOM_TRIP",
    inclusions: (festival.inclusions || []).map((item) => item.title),
    exclusions: festival.exclusions || [],
    faqs: (festival.websiteFaqs || []).map((faq, index) => ({
      id: `${festival.id}-faq-${index}`,
      question: faq.question,
      answer: faq.answer,
      order: index,
    })),
    packages,
    addOns: (festival.addOns || []).map((addOn) => ({
      id: addOn.id,
      title: addOn.title,
      description: addOn.description,
      imageUrl: addOn.imageUrl,
      price: Number(addOn.price),
      maxQuantityPerBooking: addOn.maxQuantityPerBooking,
      maxQuantityPerSlot: addOn.maxQuantityPerSlot,
      purchaseCutoffOffsetDays: addOn.purchaseCutoffOffsetDays,
    })),
    slots: (festival.slots || []).map((slot) => ({
      id: slot.id,
      startDate: slot.startDate,
      endDate: slot.endDate,
      title: slot.title,
      priority: slot.priority,
      capacity: slot.capacity,
      filledSpots: slot.filledSpots ?? 0,
    })),
    itinerary: (festival.itineraryDays || []).map((day) => ({
      id: day.id,
      dayNumber: day.dayNumber,
      title: `Day ${day.dayNumber}`,
      description: day.notes || null,
      todos: [
        ...(day.visitingPlaces || []).map((item) => item.place.name),
        ...(day.activities || []).map((act) => act.name),
      ],
    })),
    tags: (festival.websiteTags || []).map((tag) => ({
      id: tag.id,
      tag: tag.tag,
    })),
    destination: festival.destination,
    videoUrl: festival.websiteVideoUrl || null,
    websiteVideoUrl: festival.websiteVideoUrl || null,
    isCrmTrip: true,
    isCrmFestival: true,
  };
};

export const getPublicFestivals = async () => ({
  data: (await repository.findPublicMany()).map(toPublicFestival),
});

export const getFeaturedPublicFestivals = async () => ({
  data: (await repository.findFeaturedPublic()).map(toPublicFestival),
});

export const getPublicFestival = async (id) => {
  const festival = await repository.findPublicById(id);
  if (!festival) throw new NotFoundError("CRM festival not found");
  return toPublicFestival(festival);
};

export const getFestival = async (id) => {
  const festival = await repository.findById(id);
  if (!festival) throw new NotFoundError("CRM festival not found");
  return festival;
};

export const getItineraryDay = async (id) => {
  const day = await repository.findDayById(id);
  if (!day) throw new NotFoundError("CRM festival day not found");
  return day;
};

export const createFestival = async (data) => {
  const destination = await prisma.crmDestination.findUnique({
    where: { id: data.destinationId },
  });
  if (!destination) throw new ValidationError("Selected CRM destination does not exist");
  validateDepartureSlots(data.slots, data.numberOfNights);

  return prisma.$transaction(async (tx) => {
    const festival = await repository.create(
      {
        name: data.name,
        numberOfNights: data.numberOfNights,
        totalAmount: data.totalAmount,
        tokenAmount: data.tokenAmount,
        destinationId: data.destinationId,
        tripType: data.tripType || null,
        bestTimeToVisit: data.bestTimeToVisit || null,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        isPublished: data.isPublished,
        isListed: data.isListed,
        operationsReminderDays: data.operationsReminderDays,
        exclusions: data.exclusions,
        websiteOverview: data.websiteOverview || null,
        websiteFaqs: data.websiteFaqs,
        websiteBannerImages: data.websiteBannerImages,
        websiteStayTransportImages: normalizeStayTransportImages(data.websiteStayTransportImages),
        websiteHighlights: normalizeHighlights(data.websiteHighlights),
        websiteVideoUrl: data.websiteVideoUrl || null,
        websiteTags: data.websiteTagIds?.length
          ? { connect: data.websiteTagIds.map((id) => ({ id })) }
          : undefined,
        packages: {
          create: data.packages.map((pkg) => ({
            title: pkg.title,
            price: pkg.price,
            tokenAmount: pkg.tokenAmount,
          })),
        },
        addOns: {
          create: data.addOns.map((item) => ({
            title: item.title,
            description: item.description || null,
            imageUrl: item.imageUrl || null,
            price: item.price,
            maxQuantityPerBooking: item.maxQuantityPerBooking || null,
            maxQuantityPerSlot: item.maxQuantityPerSlot || null,
            purchaseCutoffOffsetDays: item.purchaseCutoffOffsetDays ?? null,
            isActive: item.isActive,
          })),
        },
      },
      tx,
    );

    await syncDepartureSlots(tx, festival.id, data.slots, data.numberOfNights);

    const totalDays = data.numberOfNights + 1;
    const requestedDays = data.days || [];
    for (let dayNumber = 1; dayNumber <= totalDays; dayNumber += 1) {
      const input = requestedDays[dayNumber - 1] || {};
      await assertDestinationReferences(tx, festival, input);
      const day = await tx.crmFestivalItineraryDay.create({
        data: {
          festivalId: festival.id,
          dayNumber,
          stayLocationId: input.stayLocationId || null,
          propertyId: input.propertyId || null,
          breakfast: Boolean(input.breakfast),
          lunch: Boolean(input.lunch),
          dinner: Boolean(input.dinner),
          transportEnabled: Boolean(input.transportEnabled),
          transportText: input.transportText || null,
          notes: input.notes || null,
          isDropOff: Boolean(input.isDropOff),
          dropOffLocationId: input.dropOffLocationId || null,
          visitingPlaces: input.placeIds?.length
            ? {
                create: input.placeIds.map((placeId, index) => ({
                  placeId,
                  displayOrder: index,
                })),
              }
            : undefined,
          activities: input.activities?.length
            ? {
                create: input.activities.map((activity, index) => ({
                  name: activity.name,
                  description: activity.description || null,
                  displayOrder: index,
                })),
              }
            : undefined,
          commonInclusions: input.commonInclusions?.length
            ? {
                create: input.commonInclusions.map((key) => ({ key })),
              }
            : undefined,
        },
      });

      const dayMealsCount = [input.breakfast, input.lunch, input.dinner].filter(Boolean).length;
      if (dayMealsCount > 0) {
        const mealDays = await tx.crmFestivalItineraryDay.count({
          where: {
            festivalId: festival.id,
            OR: [{ breakfast: true }, { lunch: true }, { dinner: true }],
          },
        });
        await tx.crmFestivalCommonInclusion.upsert({
          where: { festivalId_key: { festivalId: festival.id, key: "BREAKFAST" } },
          create: { festivalId: festival.id, key: "BREAKFAST", numberOfDays: mealDays },
          update: { numberOfDays: mealDays },
        });
      }
    }

    if (data.manualInclusions?.length) {
      await tx.crmFestivalInclusion.createMany({
        data: data.manualInclusions.map((item, index) => ({
          festivalId: festival.id,
          type: "COMMON",
          sourceKey: `manual:${index}`,
          title: item.title,
          description: item.description || null,
          displayOrder: 100 + index,
          isManual: true,
        })),
      });
    }

    await regenerateInclusions(tx, festival.id);
    return repository.findById(festival.id, tx);
  });
};

export const updateFestival = async (id, changes) => {
  const current = await repository.findById(id);
  if (!current) throw new NotFoundError("CRM festival not found");

  if (changes.destinationId && changes.destinationId !== current.destinationId) {
    const destination = await prisma.crmDestination.findUnique({
      where: { id: changes.destinationId },
    });
    if (!destination) throw new ValidationError("Selected CRM destination does not exist");
  }

  const nextNights = changes.numberOfNights ?? current.numberOfNights;
  if (changes.slots) validateDepartureSlots(changes.slots, nextNights);

  return prisma.$transaction(async (tx) => {
    const updateData = {};

    for (const key of [
      "name", "numberOfNights", "totalAmount", "tokenAmount", "destinationId",
      "tripType", "bestTimeToVisit",
      "isActive", "isFeatured", "isPublished", "isListed", "operationsReminderDays",
      "exclusions", "websiteOverview", "websiteFaqs", "websiteBannerImages",
      "websiteStayTransportImages", "websiteHighlights", "websiteVideoUrl",
    ]) {
      if (changes[key] !== undefined) updateData[key] = changes[key];
    }
    if (updateData.websiteHighlights) {
      updateData.websiteHighlights = normalizeHighlights(updateData.websiteHighlights);
    }
    if (updateData.websiteStayTransportImages) {
      updateData.websiteStayTransportImages = normalizeStayTransportImages(updateData.websiteStayTransportImages);
    }

    if (changes.websiteTagIds !== undefined) {
      updateData.websiteTags = {
        set: changes.websiteTagIds.map((tagId) => ({ id: tagId })),
      };
    }

    if (changes.packages !== undefined) {
      await tx.package.deleteMany({ where: { crmFestivalId: id } });
      updateData.packages = {
        create: changes.packages.map((pkg) => ({
          title: pkg.title,
          price: pkg.price,
          tokenAmount: pkg.tokenAmount,
        })),
      };
    }

    if (changes.addOns !== undefined) {
      await tx.addOn.deleteMany({ where: { crmFestivalId: id } });
      updateData.addOns = {
        create: changes.addOns.map((item) => ({
          title: item.title,
          description: item.description || null,
          imageUrl: item.imageUrl || null,
          price: item.price,
          maxQuantityPerBooking: item.maxQuantityPerBooking || null,
          maxQuantityPerSlot: item.maxQuantityPerSlot || null,
          purchaseCutoffOffsetDays: item.purchaseCutoffOffsetDays ?? null,
          isActive: item.isActive,
        })),
      };
    }

    const updated = await repository.update(id, updateData, tx);

    if (changes.slots) {
      await syncDepartureSlots(tx, id, changes.slots, nextNights);
    }

    if (changes.numberOfNights !== undefined && changes.numberOfNights !== current.numberOfNights) {
      const currentDays = current.itineraryDays;
      const targetCount = changes.numberOfNights + 1;
      if (targetCount > currentDays.length) {
        for (let dayNumber = currentDays.length + 1; dayNumber <= targetCount; dayNumber += 1) {
          await tx.crmFestivalItineraryDay.create({
            data: { festivalId: id, dayNumber },
          });
        }
      } else if (targetCount < currentDays.length) {
        const extraDays = currentDays.filter((day) => day.dayNumber > targetCount);
        const configured = extraDays.filter(configuredDay);
        if (configured.length) {
          throw new ValidationError(
            "Cannot decrease night count because extra days contain places, activities, hotels or notes",
          );
        }
        await tx.crmFestivalItineraryDay.deleteMany({
          where: { id: { in: extraDays.map((day) => day.id) } },
        });
      }
    }

    return repository.findById(updated.id, tx);
  });
};

export const deleteFestival = async (id) => {
  const festival = await repository.findById(id);
  if (!festival) throw new NotFoundError("CRM festival not found");
  const bookingsCount = await prisma.booking.count({ where: { crmFestivalId: id } });
  if (bookingsCount > 0) throw new ValidationError("Cannot delete a festival with active bookings");

  return repository.remove(id);
};

export const updateDay = async (dayId, changes) => {
  const day = await repository.findDayById(dayId);
  if (!day) throw new NotFoundError("CRM festival day not found");

  return prisma.$transaction(async (tx) => {
    await assertDestinationReferences(tx, day.festival, {
      stayLocationId: changes.stayLocationId !== undefined ? changes.stayLocationId : day.stayLocationId,
      propertyId: changes.propertyId !== undefined ? changes.propertyId : day.propertyId,
      dropOffLocationId: day.dropOffLocationId,
    });

    const updateData = {};
    if (changes.stayLocationId !== undefined) updateData.stayLocationId = changes.stayLocationId;
    if (changes.propertyId !== undefined) updateData.propertyId = changes.propertyId;
    if (changes.breakfast !== undefined) updateData.breakfast = changes.breakfast;
    if (changes.lunch !== undefined) updateData.lunch = changes.lunch;
    if (changes.dinner !== undefined) updateData.dinner = changes.dinner;
    if (changes.notes !== undefined) updateData.notes = changes.notes;

    await tx.crmFestivalItineraryDay.update({ where: { id: dayId }, data: updateData });

    const breakfastDays = await tx.crmFestivalItineraryDay.count({
      where: { festivalId: day.festivalId, breakfast: true },
    });
    await tx.crmFestivalCommonInclusion.upsert({
      where: { festivalId_key: { festivalId: day.festivalId, key: "BREAKFAST" } },
      create: { festivalId: day.festivalId, key: "BREAKFAST", numberOfDays: breakfastDays },
      update: { numberOfDays: breakfastDays },
    });

    const dinnerDays = await tx.crmFestivalItineraryDay.count({
      where: { festivalId: day.festivalId, dinner: true },
    });
    await tx.crmFestivalCommonInclusion.upsert({
      where: { festivalId_key: { festivalId: day.festivalId, key: "DINNER" } },
      create: { festivalId: day.festivalId, key: "DINNER", numberOfDays: dinnerDays },
      update: { numberOfDays: dinnerDays },
    });

    await regenerateInclusions(tx, day.festivalId);
    return repository.findDayById(dayId, tx);
  });
};

export const createItineraryDay = async (festivalId, input = {}) => {
  const festival = await repository.findById(festivalId);
  if (!festival) throw new NotFoundError("CRM festival not found");

  return prisma.$transaction(async (tx) => {
    const nextDayNumber = festival.itineraryDays.length + 1;
    await assertDestinationReferences(tx, festival, input);

    const day = await tx.crmFestivalItineraryDay.create({
      data: {
        festivalId,
        dayNumber: nextDayNumber,
        stayLocationId: input.stayLocationId || null,
        propertyId: input.propertyId || null,
        breakfast: Boolean(input.breakfast),
        lunch: Boolean(input.lunch),
        dinner: Boolean(input.dinner),
        transportEnabled: Boolean(input.transportEnabled),
        transportText: input.transportText || null,
        notes: input.notes || null,
        isDropOff: Boolean(input.isDropOff),
        dropOffLocationId: input.dropOffLocationId || null,
      },
    });

    await tx.crmFestival.update({
      where: { id: festivalId },
      data: { numberOfNights: festival.numberOfNights + 1 },
    });

    await regenerateInclusions(tx, festivalId);
    return repository.findDayById(day.id, tx);
  });
};

export const deleteItineraryDay = async (dayId) => {
  const day = await repository.findDayById(dayId);
  if (!day) throw new NotFoundError("CRM festival day not found");

  return prisma.$transaction(async (tx) => {
    const allDays = await tx.crmFestivalItineraryDay.findMany({
      where: { festivalId: day.festivalId },
      orderBy: { dayNumber: "asc" },
    });

    if (allDays.length <= 1) {
      throw new ValidationError("A festival itinerary must have at least one day");
    }

    const lastDay = allDays.at(-1);
    if (day.id !== lastDay.id) {
      throw new ValidationError("Only the last day of the itinerary can be removed");
    }

    await tx.crmFestivalItineraryDay.delete({ where: { id: dayId } });
    await tx.crmFestival.update({
      where: { id: day.festivalId },
      data: { numberOfNights: Math.max(0, allDays.length - 2) },
    });

    await regenerateInclusions(tx, day.festivalId);
  });
};

export const replacePlaces = async (dayId, placeIds) => {
  const day = await repository.findDayById(dayId);
  if (!day) throw new NotFoundError("CRM festival day not found");

  if (!day.stayLocationId) {
    throw new ValidationError("Choose a stay location before adding visiting places");
  }

  const places = await prisma.place.findMany({
    where: { id: { in: placeIds }, stayLocationId: day.stayLocationId },
  });
  if (places.length !== placeIds.length) {
    throw new ValidationError("All visiting places must belong to the selected stay location");
  }

  return prisma.$transaction(async (tx) => {
    await tx.crmFestivalItineraryDayPlace.deleteMany({ where: { itineraryDayId: dayId } });
    if (placeIds.length) {
      await tx.crmFestivalItineraryDayPlace.createMany({
        data: placeIds.map((placeId, index) => ({
          itineraryDayId: dayId,
          placeId,
          displayOrder: index,
        })),
      });
    }
    await regenerateInclusions(tx, day.festivalId);
    return repository.findDayById(dayId, tx);
  });
};

export const updateMeals = async (dayId, meals) => updateDay(dayId, meals);

export const updateDropOff = async (dayId, input) => {
  const day = await repository.findDayById(dayId);
  if (!day) throw new NotFoundError("CRM festival day not found");

  return prisma.$transaction(async (tx) => {
    const dropOffLocationId = input.isDropOff ? (input.dropOffLocationId || null) : null;
    await assertDestinationReferences(tx, day.festival, {
      stayLocationId: day.stayLocationId,
      propertyId: day.propertyId,
      dropOffLocationId,
    });
    await tx.crmFestivalItineraryDay.update({
      where: { id: dayId },
      data: { isDropOff: input.isDropOff, dropOffLocationId },
    });
    await regenerateInclusions(tx, day.festivalId);
    return repository.findDayById(dayId, tx);
  });
};

export const updateCommonInclusion = async (festivalId, input) => {
  const festival = await repository.findById(festivalId);
  if (!festival) throw new NotFoundError("CRM festival not found");

  return prisma.$transaction(async (tx) => {
    const data = {};
    if (input.numberOfDays !== undefined) data.numberOfDays = input.numberOfDays;
    if (input.isIncluded !== undefined) data.isIncluded = input.isIncluded;
    if (input.vehicleType !== undefined) data.vehicleType = input.vehicleType;

    await tx.crmFestivalCommonInclusion.upsert({
      where: { festivalId_key: { festivalId, key: input.key } },
      create: { festivalId, key: input.key, ...data },
      update: data,
    });
    await regenerateInclusions(tx, festivalId);
    return repository.findById(festivalId, tx);
  });
};

export const updateDayCommonInclusion = async (dayId, input) => {
  const day = await repository.findDayById(dayId);
  if (!day) throw new NotFoundError("CRM festival day not found");

  return prisma.$transaction(async (tx) => {
    if (input.isIncluded) {
      await tx.crmFestivalItineraryDayCommonInclusion.upsert({
        where: { itineraryDayId_key: { itineraryDayId: dayId, key: input.key } },
        create: { itineraryDayId: dayId, key: input.key },
        update: {},
      });
    } else {
      await tx.crmFestivalItineraryDayCommonInclusion.deleteMany({
        where: { itineraryDayId: dayId, key: input.key },
      });
    }
    await regenerateInclusions(tx, day.festivalId);
    return repository.findDayById(dayId, tx);
  });
};

export const createActivity = async (dayId, input) => {
  const day = await repository.findDayById(dayId);
  if (!day) throw new NotFoundError("CRM festival day not found");

  return prisma.$transaction(async (tx) => {
    const activity = await tx.crmFestivalItineraryDayActivity.create({
      data: {
        itineraryDayId: dayId,
        name: input.name,
        description: input.description || null,
        displayOrder: input.displayOrder ?? day.activities.length,
      },
    });
    await regenerateInclusions(tx, day.festivalId);
    return activity;
  });
};

export const updateActivity = async (dayId, activityId, input) => {
  const day = await repository.findDayById(dayId);
  if (!day) throw new NotFoundError("CRM festival day not found");

  return prisma.$transaction(async (tx) => {
    const activity = await tx.crmFestivalItineraryDayActivity.update({
      where: { id: activityId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
      },
    });
    await regenerateInclusions(tx, day.festivalId);
    return activity;
  });
};

export const deleteActivity = async (dayId, activityId) => {
  const day = await repository.findDayById(dayId);
  if (!day) throw new NotFoundError("CRM festival day not found");

  return prisma.$transaction(async (tx) => {
    await tx.crmFestivalItineraryDayActivity.delete({ where: { id: activityId } });
    await regenerateInclusions(tx, day.festivalId);
  });
};

export const manuallyRegenerateInclusions = async (festivalId) => {
  return prisma.$transaction(async (tx) => {
    await regenerateInclusions(tx, festivalId);
    return repository.findById(festivalId, tx);
  });
};

export const getOperationsCalendar = async (festivalId, requestedSlotId) => {
  const festival = await repository.findById(festivalId);
  if (!festival) throw new NotFoundError("CRM festival not found");

  const slot = requestedSlotId
    ? festival.slots.find((s) => s.id === requestedSlotId)
    : festival.slots[0];
  if (!slot) return { slot: null, days: [] };

  const bookings = await prisma.booking.findMany({
    where: { crmFestivalSlotId: slot.id, status: { not: "CANCELLED" } },
    include: {
      user: { include: { profile: true } },
      operationalTasks: { include: { reminders: true } },
    },
  });

  return {
    slot,
    days: festival.itineraryDays.map((day) => ({
      ...day,
      bookings: bookings.map((b) => ({
        ...b,
        tasks: b.operationalTasks.filter((t) => t.crmFestivalItineraryDayId === day.id),
      })),
    })),
  };
};
