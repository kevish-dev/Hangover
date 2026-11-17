import { prisma } from "../../prisma/client.js";
import { NotFoundError, ValidationError } from "../../core/errors/errors.js";
import { legacyTripShareFilter } from "../../utils/trip-share-token.js";
import * as repository from "./crm-trip.repository.js";

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

const syncDepartureSlots = async (tx, tripId, slots, numberOfNights) => {
  validateDepartureSlots(slots, numberOfNights);
  const existing = await tx.crmTripSlot.findMany({
    where: { crmTripId: tripId },
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
      priority: slot.priority,
    };
    if (!slot.id) {
      await tx.crmTripSlot.create({ data: { ...data, crmTripId: tripId } });
      continue;
    }
    const current = existingById.get(slot.id);
    if (!current)
      throw new ValidationError(
        "A submitted departure does not belong to this CRM trip",
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
    await tx.crmTripSlot.update({ where: { id: current.id }, data });
  }
  for (const slot of existing) {
    if (submittedIds.has(slot.id)) continue;
    if (slot._count.bookings)
      throw new ValidationError("A departure with bookings cannot be deleted");
    await tx.crmTripSlot.delete({ where: { id: slot.id } });
  }
};

const assertDestinationReferences = async (tx, trip, values) => {
  const { stayLocationId, propertyId, dropOffLocationId } = values;
  let stayLocation = null;
  if (stayLocationId) {
    stayLocation = await tx.stayLocation.findFirst({
      where: { id: stayLocationId, destinationId: trip.destinationId },
    });
    if (!stayLocation)
      throw new ValidationError(
        "Stay location must belong to the trip destination",
      );
  }
  if (propertyId) {
    const property = await tx.property.findUnique({
      where: { id: propertyId },
      include: { stayLocation: true },
    });
    if (!property || property.stayLocation.destinationId !== trip.destinationId)
      throw new ValidationError("Property must belong to the trip destination");
    if (!stayLocationId || property.stayLocationId !== stayLocationId)
      throw new ValidationError(
        "Property must belong to the selected stay location",
      );
  }
  if (dropOffLocationId) {
    const transferLocation = await tx.transferLocation.findFirst({
      where: { id: dropOffLocationId, destinationId: trip.destinationId },
    });
    if (!transferLocation)
      throw new ValidationError(
        "Drop-off location must belong to the trip destination",
      );
  }
};

export const regenerateInclusions = async (tx, tripId) => {
  const tripSummary = await tx.crmTrip.findUnique({
    where: { id: tripId },
    select: { numberOfNights: true },
  });
  if (!tripSummary) throw new NotFoundError("CRM trip not found");
  // Makes the feature safe for CRM trips created before these rows existed.
  await tx.crmTripCommonInclusion.createMany({
    data: COMMON_INCLUSION_DEFAULTS(tripSummary.numberOfNights).map((item) => ({
      ...item,
      tripId,
    })),
    skipDuplicates: true,
  });
  const trip = await tx.crmTrip.findUnique({
    where: { id: tripId },
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
  if (!trip) throw new NotFoundError("CRM trip not found");

  const inclusions = [
    {
      type: "ACCOMMODATION",
      sourceKey: "accommodation",
      title: `Accommodation for ${trip.numberOfNights} ${trip.numberOfNights === 1 ? "night" : "nights"}`,
      description: null,
      displayOrder: 0,
    },
  ];

  const breakfastDays = trip.itineraryDays.filter(
    (day) => day.breakfast,
  ).length;
  const dinnerDays = trip.itineraryDays.filter((day) => day.dinner).length;
  await Promise.all([
    tx.crmTripCommonInclusion.updateMany({
      where: { tripId, key: "BREAKFAST" },
      data: { numberOfDays: breakfastDays },
    }),
    tx.crmTripCommonInclusion.updateMany({
      where: { tripId, key: "DINNER" },
      data: { numberOfDays: dinnerDays },
    }),
  ]);
  for (const common of trip.commonInclusions) {
    if (common.key === "BREAKFAST" || common.key === "DINNER") continue;
    if (
      common.key === "TRAVEL" &&
      common.numberOfDays !== null &&
      common.numberOfDays > 0
    )
      inclusions.push({
        type: "COMMON",
        sourceKey: "common:travel",
        title: `Travel for ${common.numberOfDays} ${common.numberOfDays === 1 ? "day" : "days"}`,
        description: null,
        displayOrder: inclusions.length,
      });
    if (common.key === "VEHICLE_TYPE" && common.vehicleType)
      inclusions.push({
        type: "COMMON",
        sourceKey: "common:vehicle-type",
        title: `Vehicle type: ${common.vehicleType === "TRAVELLER" ? "Traveller" : common.vehicleType === "INNOVA" ? "Innova" : common.vehicleType === "SUV" ? "SUV" : "Sedan"}`,
        description: null,
        displayOrder: inclusions.length,
      });
    if (COMMON_INCLUSION_LABELS[common.key] && common.isIncluded)
      inclusions.push({
        type: "COMMON",
        sourceKey: `common:${common.key.toLowerCase()}`,
        title: COMMON_INCLUSION_LABELS[common.key],
        description: null,
        displayOrder: inclusions.length,
      });
  }

  for (const day of trip.itineraryDays) {
    const dayPrefix = `day:${day.id}`;
    for (const [field, label] of [
      ["breakfast", "Breakfast"],
      ["lunch", "Lunch"],
      ["dinner", "Dinner"],
    ]) {
      if (day[field])
        inclusions.push({
          type: "MEAL",
          itineraryDayId: day.id,
          sourceKey: `${dayPrefix}:meal:${field}`,
          title: `${label} - Day ${day.dayNumber}`,
          description: null,
          displayOrder: inclusions.length,
        });
    }
    if (day.visitingPlaces.length)
      inclusions.push({
        type: "SIGHTSEEING",
        itineraryDayId: day.id,
        sourceKey: `${dayPrefix}:sightseeing`,
        title: `Sightseeing - Day ${day.dayNumber}`,
        description: day.visitingPlaces
          .map((item) => item.place.name)
          .join(", "),
        displayOrder: inclusions.length,
      });
    if (day.activities.length)
      inclusions.push({
        type: "ACTIVITY",
        itineraryDayId: day.id,
        sourceKey: `${dayPrefix}:activities`,
        title: `Activities - Day ${day.dayNumber}`,
        description: day.activities.map((activity) => activity.name).join(", "),
        displayOrder: inclusions.length,
      });
    if (day.property)
      inclusions.push({
        type: "HOTEL_STAY",
        itineraryDayId: day.id,
        sourceKey: `${dayPrefix}:hotel-stay`,
        title: `Hotel stay - Day ${day.dayNumber}`,
        description: day.property.name,
        displayOrder: inclusions.length,
      });
    if (day.isDropOff && day.dropOffLocation)
      inclusions.push({
        type: "DROP_OFF_TRANSFER",
        itineraryDayId: day.id,
        sourceKey: `${dayPrefix}:drop-off`,
        title: `Drop-off transfer - Day ${day.dayNumber}`,
        description: day.dropOffLocation.name,
        displayOrder: inclusions.length,
      });
    if (day.transportEnabled)
      inclusions.push({
        type: "TRANSPORT",
        itineraryDayId: day.id,
        sourceKey: `${dayPrefix}:transport`,
        title: `Transport - Day ${day.dayNumber}`,
        description: day.transportText || "Transport provided",
        displayOrder: inclusions.length,
      });
    for (const common of day.commonInclusions) {
      inclusions.push({
        type: "COMMON",
        itineraryDayId: day.id,
        sourceKey: `${dayPrefix}:common:${common.key.toLowerCase()}`,
        title: `${DAY_COMMON_INCLUSION_LABELS[common.key]} - Day ${day.dayNumber}`,
        description: null,
        displayOrder: inclusions.length,
      });
    }
  }
  await tx.crmTripInclusion.deleteMany({ where: { tripId, isManual: false } });
  await tx.crmTripInclusion.createMany({
    data: inclusions.map((item) => ({ ...item, tripId })),
  });
  return inclusions.length;
};

export const listTrips = async (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(query.limit, 10) || 50, 1),
    100,
  );
  const { data, total } = await repository.findMany({
    skip: (page - 1) * limit,
    take: limit,
    where: query.destinationId ? { destinationId: query.destinationId } : {},
  });
  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

export const normalizeHighlightItem = (h) => {
  if (!h) return null;
  if (typeof h === "string") return { text: h.trim(), imageUrl: "" };
  if (typeof h === "object") {
    let textVal = h.text;
    let imageUrlVal = h.imageUrl || "";
    while (textVal && typeof textVal === "object") {
      if (textVal.imageUrl && !imageUrlVal) imageUrlVal = textVal.imageUrl;
      textVal = textVal.text;
    }
    const textStr = typeof textVal === "string" ? textVal.trim() : "";
    const imageStr = typeof imageUrlVal === "string" ? imageUrlVal.trim() : "";
    if (!textStr && !imageStr) return null;
    return { text: textStr, imageUrl: imageStr };
  }
  return { text: String(h).trim(), imageUrl: "" };
};

export const normalizeStayTransportImages = (arr) => {
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

export const normalizeHighlights = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeHighlightItem).filter(Boolean);
};

export const extractStayLocationImagesFromDays = (itineraryDays) => {
  if (!Array.isArray(itineraryDays)) return [];
  const images = [];
  const addedUrls = new Set();

  for (const day of itineraryDays) {
    const sl = day?.stayLocation;
    if (sl) {
      const name = sl.name || "Stay Location";
      if (sl.imageUrl && typeof sl.imageUrl === "string" && !addedUrls.has(sl.imageUrl)) {
        addedUrls.add(sl.imageUrl);
        images.push({ text: name, imageUrl: sl.imageUrl });
      }
      let slImages = sl.images;
      if (typeof slImages === "string") {
        try { slImages = JSON.parse(slImages); } catch { slImages = []; }
      }
      if (Array.isArray(slImages)) {
        for (const img of slImages) {
          const url = typeof img === "string" ? img : img?.url || img?.imageUrl;
          const caption = typeof img === "object" ? img?.caption || name : name;
          if (url && typeof url === "string" && !addedUrls.has(url)) {
            addedUrls.add(url);
            images.push({ text: caption, imageUrl: url });
          }
        }
      }
    }

    const prop = day?.property;
    if (prop) {
      const name = prop.name || "Property";
      if (prop.imageUrl && typeof prop.imageUrl === "string" && !addedUrls.has(prop.imageUrl)) {
        addedUrls.add(prop.imageUrl);
        images.push({ text: name, imageUrl: prop.imageUrl });
      }
      let propImages = prop.images;
      if (typeof propImages === "string") {
        try { propImages = JSON.parse(propImages); } catch { propImages = []; }
      }
      if (Array.isArray(propImages)) {
        for (const img of propImages) {
          const url = typeof img === "string" ? img : img?.url || img?.imageUrl;
          const caption = typeof img === "object" ? img?.caption || name : name;
          if (url && typeof url === "string" && !addedUrls.has(url)) {
            addedUrls.add(url);
            images.push({ text: caption, imageUrl: url });
          }
        }
      }
    }
  }

  return images;
};

const toPublicTrip = (trip) => {
  const firstSlot = trip.slots?.[0] || null;
  const explicitStayImages = normalizeStayTransportImages(trip.websiteStayTransportImages);
  const autoStayImages = extractStayLocationImagesFromDays(trip.itineraryDays);
  const explicitUrls = new Set(explicitStayImages.map((item) => item.imageUrl));
  const combinedStayImages = [
    ...explicitStayImages,
    ...autoStayImages.filter((item) => !explicitUrls.has(item.imageUrl)),
  ];

  return {
    id: trip.id,
    slug: trip.id,
    title: trip.name,
    location: trip.destination?.name || "",
    bannerImages: trip.websiteBannerImages || [],
    duration: trip.numberOfNights + 1,
    bestTimeToVisit: trip.bestTimeToVisit || "",
    overview: trip.websiteOverview || "",
    highlights: normalizeHighlights(trip.websiteHighlights),
    inclusions: (trip.inclusions || []).map((item) => item.title),
    exclusions: trip.exclusions || [],
    stayTransportImages: combinedStayImages,
    capacity: firstSlot?.capacity || 0,
    filledSpots: firstSlot?.filledSpots || 0,
    startDate: firstSlot?.startDate || null,
    endDate: firstSlot?.endDate || null,
    tripType: trip.tripType || "CUSTOM_TRIP",
    isActive: trip.isActive,
    isPublished: trip.isPublished,
    isFeatured: trip.isFeatured,
    isListed: trip.isListed,
    isInterestFormEnabled: Boolean(trip.isInterestFormEnabled),
    isCrmTrip: true,
    destinationId: trip.destinationId,
    destination: trip.destination
      ? {
          id: trip.destination.id,
          name: trip.destination.name,
          state: "",
          subheading: null,
        }
      : null,
    tripTags: (trip.websiteTags || []).map((tag) => ({
      id: tag.id,
      tag: tag.tag,
    })),
    faqs: (Array.isArray(trip.websiteFaqs) ? trip.websiteFaqs : []).map(
      (faq, index) => ({
        id: `${trip.id}-faq-${index}`,
        question: faq.question,
        answer: faq.answer,
        order: index,
      }),
    ),
    itinerary: (trip.itineraryDays || []).map((day) => ({
      id: day.id,
      dayNumber: day.dayNumber,
      title: `Day ${day.dayNumber}`,
      description:
        [
          day.stayLocation?.name && `Stay: ${day.stayLocation.name}`,
          day.property?.name && `Property: ${day.property.name}`,
          day.visitingPlaces?.length &&
            `Places: ${day.visitingPlaces
              .map((item) => item.place?.name)
              .filter(Boolean)
              .join(", ")}`,
          day.activities?.length &&
            `Activities: ${day.activities
              .map((item) => item.name)
              .filter(Boolean)
              .join(", ")}`,
          day.notes,
        ]
          .filter(Boolean)
          .join(" · ") || null,
      todos: [],
    })),
    packages: trip.packages || [],
    slots: trip.slots || [],
    addOns: trip.addOns || [],
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
  };
};

export const getPublicTrips = async () => ({
  data: (await repository.findPublicMany()).map(toPublicTrip),
});
export const getFeaturedPublicTrips = async () => ({
  data: (await repository.findFeaturedPublic()).map(toPublicTrip),
});

export const getPublicSignatureTrips = async () => ({
  data: (await repository.findSignatureTrips()).map(toPublicTrip),
});

export const getSignatureTripOptions = async () => {
  const trips = await repository.findSignatureTripOptions();
  const selectedIds = trips
    .filter((trip) => trip.signatureOrder !== null)
    .sort((a, b) => a.signatureOrder - b.signatureOrder)
    .map((trip) => trip.id);
  return { data: trips.map(toPublicTrip), selectedIds };
};

export const updateSignatureTrips = (tripIds) => prisma.$transaction(async (tx) => {
  // Serialize collection replacements so concurrent saves cannot mix their orders.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"crm-trip-signature-collection"}, 0))::text`;
  const eligibleCount = await tx.crmTrip.count({
    where: { ...repository.signatureTripEligibility, id: { in: tripIds } },
  });
  if (eligibleCount !== tripIds.length) {
    throw new ValidationError("Only active, published trips with a banner image can be in the Signature Collection.");
  }

  await tx.crmTrip.updateMany({
    where: { signatureOrder: { not: null } },
    data: { signatureOrder: null },
  });
  for (const [order, id] of tripIds.entries()) {
    await tx.crmTrip.update({ where: { id }, data: { signatureOrder: order + 1 } });
  }
});

const UUID_PATTERN = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

const findLegacyTrip = (identifier, user, shareToken) => {
  const key = UUID_PATTERN.test(identifier) ? "id" : "slug";
  const where = { [key]: identifier };
  if (user?.role === "ADMIN") return repository.findLegacyTripForWebsite(where);

  const access = [{ isPublished: true }];
  if (shareToken) {
    access.push(legacyTripShareFilter(shareToken));
  }
  if (user?.id) {
    access.push({ bookings: { some: { userId: user.id } } });
    access.push({ slots: { some: { bookings: { some: { userId: user.id } } } } });
  }
  return repository.findLegacyTripForWebsite({ ...where, OR: access });
};

export const getPublicTrip = async (id, user = null, shareToken = null) => {
  let trip = await repository.findPublicById(id);

  if (!trip && user) {
    if (user.role === "ADMIN") {
      trip = await repository.findById(id);
    } else {
      const booking = await prisma.booking.findFirst({
        where: {
          userId: user.id,
          crmTripId: id,
          status: { in: ["RESERVED", "CONFIRMED", "COMPLETED"] },
        },
      });
      if (booking) {
        trip = await repository.findById(id);
      }
    }
  }

  if (trip) return toPublicTrip(trip);

  const legacyTrip = await findLegacyTrip(id, user, shareToken);
  if (!legacyTrip) throw new NotFoundError("Trip not found");
  return { ...legacyTrip, isCrmTrip: false };
};

export const getTrip = async (id) => {
  const trip = await repository.findById(id);
  if (!trip) throw new NotFoundError("CRM trip not found");
  return trip;
};

export const getItineraryDay = async (id) => {
  const day = await repository.findDayById(id);
  if (!day) throw new NotFoundError("Itinerary day not found");
  return day;
};

export const createTrip = async (data) => {
  const destination = await prisma.crmDestination.findUnique({
    where: { id: data.destinationId },
    select: { id: true },
  });
  if (!destination) throw new ValidationError("Destination does not exist");
  validateDepartureSlots(data.slots, data.numberOfNights);
  const trip = await prisma.$transaction(async (tx) => {
    const {
      days,
      packages,
      addOns,
      manualInclusions,
      slots,
      websiteTagIds,
      ...tripData
    } = data;
    if (days?.length && days.length !== data.numberOfNights + 1)
      throw new ValidationError(
        "Configure one itinerary day for each trip day",
      );
    if (tripData.websiteHighlights) {
      tripData.websiteHighlights = normalizeHighlights(tripData.websiteHighlights);
    }
    if (tripData.websiteStayTransportImages) {
      tripData.websiteStayTransportImages = normalizeStayTransportImages(tripData.websiteStayTransportImages);
    }
    const created = await repository.create(
      {
        ...tripData,
        packages: { create: packages },
        addOns: { create: addOns },
        slots: { create: slots },
        websiteTags: websiteTagIds
          ? { connect: websiteTagIds.map((id) => ({ id })) }
          : undefined,
      },
      tx,
    );
    const configuredDays =
      days || Array.from({ length: data.numberOfNights + 1 }, () => ({}));
    for (const [index, input] of configuredDays.entries()) {
      const {
        placeIds = [],
        activities = [],
        commonInclusions = [],
        ...dayData
      } = input;
      await assertDestinationReferences(tx, created, dayData);
      if (placeIds.length) {
        if (!dayData.stayLocationId)
          throw new ValidationError(
            "Choose a stay location before selecting visiting places",
          );
        const matches = await tx.place.count({
          where: {
            id: { in: placeIds },
            stayLocationId: dayData.stayLocationId,
          },
        });
        if (matches !== placeIds.length)
          throw new ValidationError(
            "Every visiting place must belong to the selected stay location",
          );
      }
      await tx.crmTripItineraryDay.create({
        data: {
          tripId: created.id,
          dayNumber: index + 1,
          ...dayData,
          visitingPlaces: placeIds.length
            ? {
                create: placeIds.map((placeId, displayOrder) => ({
                  placeId,
                  displayOrder,
                })),
              }
            : undefined,
          activities: activities.length
            ? {
                create: activities.map((activity, displayOrder) => ({
                  ...activity,
                  displayOrder,
                })),
              }
            : undefined,
          commonInclusions: commonInclusions.length
            ? { create: commonInclusions.map((key) => ({ key })) }
            : undefined,
        },
      });
    }
    await tx.crmTripCommonInclusion.createMany({
      data: COMMON_INCLUSION_DEFAULTS(data.numberOfNights).map((item) => ({
        ...item,
        tripId: created.id,
      })),
    });
    await regenerateInclusions(tx, created.id);
    if (manualInclusions && manualInclusions.length) {
      await tx.crmTripInclusion.deleteMany({ where: { tripId: created.id } });
      await tx.crmTripInclusion.createMany({
        data: manualInclusions.map((item, index) => ({
          tripId: created.id,
          type: "COMMON",
          sourceKey: `manual:${index}:${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          title: item.title,
          description: item.description || null,
          displayOrder: index,
          isManual: true,
        })),
      });
    }
    return created;
  });
  return getTrip(trip.id);
};

export const updateTrip = async (id, changes) => {
  const {
    days,
    packages,
    addOns,
    manualInclusions,
    slots,
    websiteTagIds,
    ...tripChanges
  } = changes;
  if (tripChanges.websiteHighlights) {
    tripChanges.websiteHighlights = normalizeHighlights(tripChanges.websiteHighlights);
  }
  if (tripChanges.websiteStayTransportImages) {
    tripChanges.websiteStayTransportImages = normalizeStayTransportImages(tripChanges.websiteStayTransportImages);
  }
  await prisma.$transaction(async (tx) => {
    const trip = await repository.findById(id, tx);
    if (!trip) throw new NotFoundError("CRM trip not found");
    const nextTotal = tripChanges.totalAmount ?? Number(trip.totalAmount);
    const nextToken = tripChanges.tokenAmount ?? Number(trip.tokenAmount);
    if (
      Number.isFinite(nextTotal) &&
      Number.isFinite(nextToken) &&
      nextToken > nextTotal
    ) {
      throw new ValidationError("Token amount cannot exceed the total amount");
    }

    if (
      tripChanges.destinationId &&
      tripChanges.destinationId !== trip.destinationId
    ) {
      const destination = await tx.crmDestination.findUnique({
        where: { id: tripChanges.destinationId },
        select: { id: true },
      });
      if (!destination) throw new ValidationError("Destination does not exist");
      if (trip.itineraryDays.some(configuredDay))
        throw new ValidationError(
          "Clear itinerary master-data selections before changing the destination",
        );
    }
    if (
      tripChanges.numberOfNights !== undefined &&
      tripChanges.numberOfNights !== trip.numberOfNights &&
      days === undefined
    ) {
      if (slots === undefined && trip.slots.length) {
        throw new ValidationError(
          "Update the dated departure slots when changing the itinerary duration",
        );
      }
      const targetDays = tripChanges.numberOfNights + 1;
      if (targetDays < trip.itineraryDays.length) {
        const removedDays = trip.itineraryDays.filter(
          (day) => day.dayNumber > targetDays,
        );
        if (removedDays.some(configuredDay))
          throw new ValidationError(
            "Cannot reduce nights while removed itinerary days contain selections",
          );
        await tx.crmTripItineraryDay.deleteMany({
          where: { tripId: id, dayNumber: { gt: targetDays } },
        });
      } else if (targetDays > trip.itineraryDays.length) {
        await tx.crmTripItineraryDay.createMany({
          data: Array.from(
            { length: targetDays - trip.itineraryDays.length },
            (_, index) => ({
              tripId: id,
              dayNumber: trip.itineraryDays.length + index + 1,
            }),
          ),
        });
      }
    }
    if (days !== undefined) {
      const targetDays =
        (tripChanges.numberOfNights ?? trip.numberOfNights) + 1;
      if (days.length !== targetDays)
        throw new ValidationError(
          "Configure one itinerary day for each trip day",
        );
      await tx.crmTripItineraryDay.deleteMany({ where: { tripId: id } });
      const updatedTrip = {
        ...trip,
        destinationId: tripChanges.destinationId ?? trip.destinationId,
      };
      for (const [index, input] of days.entries()) {
        const {
          placeIds = [],
          activities = [],
          commonInclusions = [],
          ...dayData
        } = input;
        await assertDestinationReferences(tx, updatedTrip, dayData);
        if (placeIds.length) {
          if (!dayData.stayLocationId)
            throw new ValidationError(
              "Choose a stay location before selecting visiting places",
            );
          const matches = await tx.place.count({
            where: {
              id: { in: placeIds },
              stayLocationId: dayData.stayLocationId,
            },
          });
          if (matches !== placeIds.length)
            throw new ValidationError(
              "Every visiting place must belong to the selected stay location",
            );
        }
        await tx.crmTripItineraryDay.create({
          data: {
            tripId: id,
            dayNumber: index + 1,
            ...dayData,
            visitingPlaces: placeIds.length
              ? {
                  create: placeIds.map((placeId, displayOrder) => ({
                    placeId,
                    displayOrder,
                  })),
                }
              : undefined,
            activities: activities.length
              ? {
                  create: activities.map((activity, displayOrder) => ({
                    ...activity,
                    displayOrder,
                  })),
                }
              : undefined,
            commonInclusions: commonInclusions.length
              ? { create: commonInclusions.map((key) => ({ key })) }
              : undefined,
          },
        });
      }
    }
    if (packages !== undefined) {
      const existingPkgIds = new Set(trip.packages.map((p) => p.id));
      const suppliedPkgIds = new Set(packages.filter((p) => p.id).map((p) => p.id));

      const toDeletePkgIds = [...existingPkgIds].filter((pkgId) => !suppliedPkgIds.has(pkgId));
      if (toDeletePkgIds.length) {
        await tx.package.deleteMany({
          where: { id: { in: toDeletePkgIds }, crmTripId: id },
        });
      }

      for (const pkg of packages.filter((p) => p.id && existingPkgIds.has(p.id))) {
        await tx.package.update({
          where: { id: pkg.id },
          data: {
            title: pkg.title,
            price: pkg.price,
            tokenAmount: pkg.tokenAmount,
          },
        });
      }

      const newPkgs = packages
        .filter((p) => !p.id)
        .map(({ id: _id, ...item }) => ({ ...item, crmTripId: id }));
      if (newPkgs.length) {
        await tx.package.createMany({ data: newPkgs });
      }
    }
    if (addOns !== undefined) {
      const existingAddOnIds = new Set(trip.addOns.map((a) => a.id));
      const suppliedAddOnIds = new Set(addOns.filter((a) => a.id).map((a) => a.id));

      const toDeleteAddOnIds = [...existingAddOnIds].filter((addOnId) => !suppliedAddOnIds.has(addOnId));
      if (toDeleteAddOnIds.length) {
        await tx.addOn.deleteMany({
          where: { id: { in: toDeleteAddOnIds }, crmTripId: id },
        });
      }

      for (const item of addOns.filter((a) => a.id && existingAddOnIds.has(a.id))) {
        await tx.addOn.update({
          where: { id: item.id },
          data: {
            title: item.title,
            description: item.description || null,
            imageUrl: item.imageUrl || null,
            price: item.price,
            maxQuantityPerBooking: item.maxQuantityPerBooking || null,
            maxQuantityPerSlot: item.maxQuantityPerSlot || null,
            purchaseCutoffOffsetDays: item.purchaseCutoffOffsetDays ?? null,
            isActive: item.isActive,
          },
        });
      }

      const newAddOns = addOns
        .filter((a) => !a.id)
        .map(({ id: _id, ...item }) => ({ ...item, crmTripId: id }));
      if (newAddOns.length) {
        await tx.addOn.createMany({ data: newAddOns });
      }
    }
    if (slots !== undefined)
      await syncDepartureSlots(
        tx,
        id,
        slots,
        tripChanges.numberOfNights ?? trip.numberOfNights,
      );
    if (websiteTagIds !== undefined) {
      tripChanges.websiteTags = { set: websiteTagIds.map((id) => ({ id })) };
    }
    await repository.update(id, tripChanges, tx);
    await regenerateInclusions(tx, id);
    if (manualInclusions !== undefined) {
      await tx.crmTripInclusion.deleteMany({ where: { tripId: id } });
      if (manualInclusions.length) {
        await tx.crmTripInclusion.createMany({
          data: manualInclusions.map((item, index) => ({
            tripId: id,
            type: "COMMON",
            sourceKey: `manual:${index}:${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            title: item.title,
            description: item.description || null,
            displayOrder: index,
            isManual: true,
          })),
        });
      }
    }
  });
  return getTrip(id);
};

export const deleteTrip = async (id) => {
  await getTrip(id);
  await prisma.booking.updateMany({
    where: { crmTripId: id },
    data: { crmTripId: null },
  });
  return repository.remove(id);
};

export const updateDay = async (dayId, changes) => {
  await prisma.$transaction(async (tx) => {
    const day = await repository.findDayById(dayId, tx);
    if (!day) throw new NotFoundError("Itinerary day not found");
    const values = { ...day, ...changes };
    if (changes.stayLocationId === null && changes.propertyId === undefined)
      values.propertyId = null;
    await assertDestinationReferences(tx, day.trip, values);
    if (
      changes.stayLocationId !== undefined &&
      changes.stayLocationId !== day.stayLocationId
    ) {
      await tx.crmTripItineraryDayPlace.deleteMany({
        where: { itineraryDayId: dayId },
      });
    }
    await tx.crmTripItineraryDay.update({
      where: { id: dayId },
      data: {
        ...changes,
        ...(values.propertyId === null ? { propertyId: null } : {}),
      },
    });
    await regenerateInclusions(tx, day.tripId);
  });
  return repository.findDayById(dayId);
};

// Days are derived from nights, so adding/removing a day also adjusts the
// night count. This preserves the invariant: itinerary days = nights + 1.
export const createItineraryDay = async (tripId, input = {}) => {
  let created;
  await prisma.$transaction(async (tx) => {
    const trip = await repository.findById(tripId, tx);
    if (!trip) throw new NotFoundError("CRM trip not found");
    const values = { ...input };
    await assertDestinationReferences(tx, trip, values);
    created = await tx.crmTripItineraryDay.create({
      data: { tripId, dayNumber: trip.itineraryDays.length + 1, ...input },
    });
    await tx.crmTrip.update({
      where: { id: tripId },
      data: { numberOfNights: trip.numberOfNights + 1 },
    });
    await regenerateInclusions(tx, tripId);
  });
  return repository.findDayById(created.id);
};

export const deleteItineraryDay = async (dayId) => {
  await prisma.$transaction(async (tx) => {
    const day = await repository.findDayById(dayId, tx);
    if (!day) throw new NotFoundError("Itinerary day not found");
    const totalDays = await tx.crmTripItineraryDay.count({
      where: { tripId: day.tripId },
    });
    if (totalDays <= 1 || day.dayNumber !== totalDays) {
      throw new ValidationError(
        "Only the final itinerary day can be removed, and a trip must retain at least one day",
      );
    }
    await tx.crmTripItineraryDay.delete({ where: { id: dayId } });
    await tx.crmTrip.update({
      where: { id: day.tripId },
      data: { numberOfNights: day.trip.numberOfNights - 1 },
    });
    await regenerateInclusions(tx, day.tripId);
  });
};

export const replacePlaces = async (dayId, placeIds) => {
  await prisma.$transaction(async (tx) => {
    const day = await repository.findDayById(dayId, tx);
    if (!day) throw new NotFoundError("Itinerary day not found");
    if (placeIds.length) {
      if (!day.stayLocationId)
        throw new ValidationError(
          "Choose a stay location before selecting visiting places",
        );
      const matches = await tx.place.findMany({
        where: { id: { in: placeIds }, stayLocationId: day.stayLocationId },
        select: { id: true },
      });
      if (matches.length !== placeIds.length)
        throw new ValidationError(
          "Every visiting place must belong to the selected stay location",
        );
    }
    await tx.crmTripItineraryDayPlace.deleteMany({
      where: { itineraryDayId: dayId },
    });
    if (placeIds.length)
      await tx.crmTripItineraryDayPlace.createMany({
        data: placeIds.map((placeId, displayOrder) => ({
          itineraryDayId: dayId,
          placeId,
          displayOrder,
        })),
      });
    await regenerateInclusions(tx, day.tripId);
  });
  return repository.findDayById(dayId);
};

export const updateMeals = async (dayId, meals) => updateDay(dayId, meals);

export const updateDropOff = async (dayId, input) => {
  if (input.isDropOff && !input.dropOffLocationId)
    throw new ValidationError(
      "A drop-off location is required when drop-off is enabled",
    );
  return updateDay(dayId, {
    isDropOff: input.isDropOff,
    dropOffLocationId: input.isDropOff ? input.dropOffLocationId : null,
  });
};

export const updateCommonInclusion = async (tripId, input) => {
  if (input.key === "BREAKFAST" || input.key === "DINNER")
    throw new ValidationError(
      "Breakfast and dinner counts are controlled by day-level meal selections",
    );
  if (input.key === "FIRST_AID_KIT" && input.isIncluded === false)
    throw new ValidationError("First aid kit is always included");
  await prisma.$transaction(async (tx) => {
    const trip = await tx.crmTrip.findUnique({
      where: { id: tripId },
      select: { id: true, numberOfNights: true },
    });
    if (!trip) throw new NotFoundError("CRM trip not found");
    await tx.crmTripCommonInclusion.createMany({
      data: COMMON_INCLUSION_DEFAULTS(trip.numberOfNights).map((item) => ({
        ...item,
        tripId,
      })),
      skipDuplicates: true,
    });
    const data =
      input.key === "TRAVEL"
        ? { numberOfDays: input.numberOfDays }
        : input.key === "VEHICLE_TYPE"
          ? { vehicleType: input.vehicleType }
          : { isIncluded: input.isIncluded };
    await tx.crmTripCommonInclusion.update({
      where: { tripId_key: { tripId, key: input.key } },
      data,
    });
    await regenerateInclusions(tx, tripId);
  });
  return getTrip(tripId);
};

export const updateDayCommonInclusion = async (dayId, input) => {
  await prisma.$transaction(async (tx) => {
    const day = await repository.findDayById(dayId, tx);
    if (!day) throw new NotFoundError("Itinerary day not found");
    if (input.isIncluded) {
      await tx.crmTripItineraryDayCommonInclusion.upsert({
        where: {
          itineraryDayId_key: { itineraryDayId: dayId, key: input.key },
        },
        update: {},
        create: { itineraryDayId: dayId, key: input.key },
      });
    } else {
      await tx.crmTripItineraryDayCommonInclusion.deleteMany({
        where: { itineraryDayId: dayId, key: input.key },
      });
    }
    await regenerateInclusions(tx, day.tripId);
  });
  return repository.findDayById(dayId);
};

export const createActivity = async (dayId, input) => {
  let activity;
  await prisma.$transaction(async (tx) => {
    const day = await repository.findDayById(dayId, tx);
    if (!day) throw new NotFoundError("Itinerary day not found");
    activity = await tx.crmTripItineraryDayActivity.create({
      data: {
        itineraryDayId: dayId,
        ...input,
        displayOrder: input.displayOrder ?? day.activities.length,
      },
    });
    await regenerateInclusions(tx, day.tripId);
  });
  return activity;
};

export const updateActivity = async (dayId, activityId, input) => {
  await prisma.$transaction(async (tx) => {
    const activity = await tx.crmTripItineraryDayActivity.findFirst({
      where: { id: activityId, itineraryDayId: dayId },
      include: { itineraryDay: true },
    });
    if (!activity)
      throw new NotFoundError("Activity not found for this itinerary day");
    await tx.crmTripItineraryDayActivity.update({
      where: { id: activityId },
      data: input,
    });
    await regenerateInclusions(tx, activity.itineraryDay.tripId);
  });
  return prisma.crmTripItineraryDayActivity.findUnique({
    where: { id: activityId },
  });
};

export const deleteActivity = async (dayId, activityId) => {
  await prisma.$transaction(async (tx) => {
    const activity = await tx.crmTripItineraryDayActivity.findFirst({
      where: { id: activityId, itineraryDayId: dayId },
      include: { itineraryDay: true },
    });
    if (!activity)
      throw new NotFoundError("Activity not found for this itinerary day");
    await tx.crmTripItineraryDayActivity.delete({ where: { id: activityId } });
    await regenerateInclusions(tx, activity.itineraryDay.tripId);
  });
};

export const manuallyRegenerateInclusions = async (tripId) => {
  await prisma.$transaction(async (tx) => {
    const trip = await tx.crmTrip.findUnique({
      where: { id: tripId },
      select: { id: true },
    });
    if (!trip) throw new NotFoundError("CRM trip not found");
    await regenerateInclusions(tx, tripId);
  });
  return getTrip(tripId);
};

export const getOperationsCalendar = async (tripId, requestedSlotId) => {
  const trip = await prisma.crmTrip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      name: true,
      operationsReminderDays: true,
      slots: {
        orderBy: [{ priority: "desc" }, { startDate: "asc" }],
        include: { _count: { select: { bookings: true } } },
      },
    },
  });
  if (!trip) throw new NotFoundError("CRM trip not found");
  const datedSlots = trip.slots.filter(
    (item) => item.startDate && item.endDate,
  );
  const slot = requestedSlotId
    ? datedSlots.find((item) => item.id === requestedSlotId)
    : datedSlots[0];
  if (!slot)
    throw new ValidationError(
      "Choose a valid departure slot for this CRM trip",
    );
  const bookings = await prisma.booking.findMany({
    where: { crmTripId: tripId, crmTripSlotId: slot.id, source: "CRM" },
    select: {
      id: true,
      bookingReference: true,
      numberOfTravelers: true,
      user: {
        select: { email: true, profile: { select: { fullName: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const tasks = await prisma.operationalTask.findMany({
    where: { booking: { crmTripId: tripId, crmTripSlotId: slot.id } },
    include: {
      booking: {
        select: {
          id: true,
          bookingReference: true,
          user: {
            select: { email: true, profile: { select: { fullName: true } } },
          },
        },
      },
      crmItineraryDay: { select: { id: true, dayNumber: true } },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
  });
  return { trip, slots: datedSlots, slot, bookings, tasks };
};
