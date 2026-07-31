import { prisma } from "../../prisma/client.js";
import { NotFoundError, ValidationError } from "../../core/errors/errors.js";
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

const configuredDay = (day) => day.stayLocationId || day.propertyId || day.breakfast || day.lunch || day.dinner || day.notes || day.isDropOff || day.dropOffLocationId || day.visitingPlaces.length || day.activities.length;

const assertDestinationReferences = async (tx, trip, values) => {
  const { stayLocationId, propertyId, dropOffLocationId } = values;
  let stayLocation = null;
  if (stayLocationId) {
    stayLocation = await tx.stayLocation.findFirst({ where: { id: stayLocationId, destinationId: trip.destinationId } });
    if (!stayLocation) throw new ValidationError("Stay location must belong to the trip destination");
  }
  if (propertyId) {
    const property = await tx.property.findUnique({ where: { id: propertyId }, include: { stayLocation: true } });
    if (!property || property.stayLocation.destinationId !== trip.destinationId) throw new ValidationError("Property must belong to the trip destination");
    if (!stayLocationId || property.stayLocationId !== stayLocationId) throw new ValidationError("Property must belong to the selected stay location");
  }
  if (dropOffLocationId) {
    const transferLocation = await tx.transferLocation.findFirst({ where: { id: dropOffLocationId, destinationId: trip.destinationId } });
    if (!transferLocation) throw new ValidationError("Drop-off location must belong to the trip destination");
  }
};

export const regenerateInclusions = async (tx, tripId) => {
  const tripSummary = await tx.crmTrip.findUnique({ where: { id: tripId }, select: { numberOfNights: true } });
  if (!tripSummary) throw new NotFoundError("CRM trip not found");
  // Makes the feature safe for CRM trips created before these rows existed.
  await tx.crmTripCommonInclusion.createMany({
    data: COMMON_INCLUSION_DEFAULTS(tripSummary.numberOfNights).map((item) => ({ ...item, tripId })),
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
          visitingPlaces: { orderBy: { displayOrder: "asc" }, include: { place: true } },
          activities: { orderBy: { displayOrder: "asc" } },
          commonInclusions: true,
        },
      },
      commonInclusions: true,
    },
  });
  if (!trip) throw new NotFoundError("CRM trip not found");

  const inclusions = [{
    type: "ACCOMMODATION",
    sourceKey: "accommodation",
    title: `Accommodation for ${trip.numberOfNights} ${trip.numberOfNights === 1 ? "night" : "nights"}`,
    description: null,
    displayOrder: 0,
  }];
  if (trip.airportPickupEnabled) inclusions.push({ type: "AIRPORT_PICKUP", sourceKey: "airport-pickup", title: "Airport pickup", description: null, displayOrder: inclusions.length });
  if (trip.airportDropEnabled) inclusions.push({ type: "AIRPORT_DROP", sourceKey: "airport-drop", title: "Airport drop", description: null, displayOrder: inclusions.length });

  const breakfastDays = trip.itineraryDays.filter((day) => day.breakfast).length;
  const dinnerDays = trip.itineraryDays.filter((day) => day.dinner).length;
  await Promise.all([
    tx.crmTripCommonInclusion.updateMany({ where: { tripId, key: "BREAKFAST" }, data: { numberOfDays: breakfastDays } }),
    tx.crmTripCommonInclusion.updateMany({ where: { tripId, key: "DINNER" }, data: { numberOfDays: dinnerDays } }),
  ]);
  for (const common of trip.commonInclusions) {
    if (common.key === "BREAKFAST" || common.key === "DINNER") continue;
    if (common.key === "TRAVEL" && common.numberOfDays !== null && common.numberOfDays > 0) inclusions.push({ type: "COMMON", sourceKey: "common:travel", title: `Travel for ${common.numberOfDays} ${common.numberOfDays === 1 ? "day" : "days"}`, description: null, displayOrder: inclusions.length });
    if (common.key === "VEHICLE_TYPE" && common.vehicleType) inclusions.push({ type: "COMMON", sourceKey: "common:vehicle-type", title: `Vehicle type: ${common.vehicleType === "TRAVELLER" ? "Traveller" : common.vehicleType === "INNOVA" ? "Innova" : common.vehicleType === "SUV" ? "SUV" : "Sedan"}`, description: null, displayOrder: inclusions.length });
    if (COMMON_INCLUSION_LABELS[common.key] && common.isIncluded) inclusions.push({ type: "COMMON", sourceKey: `common:${common.key.toLowerCase()}`, title: COMMON_INCLUSION_LABELS[common.key], description: null, displayOrder: inclusions.length });
  }

  for (const day of trip.itineraryDays) {
    const dayPrefix = `day:${day.id}`;
    for (const [field, label] of [["breakfast", "Breakfast"], ["lunch", "Lunch"], ["dinner", "Dinner"]]) {
      if (day[field]) inclusions.push({ type: "MEAL", itineraryDayId: day.id, sourceKey: `${dayPrefix}:meal:${field}`, title: `${label} - Day ${day.dayNumber}`, description: null, displayOrder: inclusions.length });
    }
    if (day.visitingPlaces.length) inclusions.push({
      type: "SIGHTSEEING", itineraryDayId: day.id, sourceKey: `${dayPrefix}:sightseeing`,
      title: `Sightseeing - Day ${day.dayNumber}`,
      description: day.visitingPlaces.map((item) => item.place.name).join(", "), displayOrder: inclusions.length,
    });
    if (day.activities.length) inclusions.push({
      type: "ACTIVITY", itineraryDayId: day.id, sourceKey: `${dayPrefix}:activities`,
      title: `Activities - Day ${day.dayNumber}`,
      description: day.activities.map((activity) => activity.name).join(", "), displayOrder: inclusions.length,
    });
    if (day.property) inclusions.push({
      type: "HOTEL_STAY", itineraryDayId: day.id, sourceKey: `${dayPrefix}:hotel-stay`,
      title: `Hotel stay - Day ${day.dayNumber}`,
      description: day.property.name, displayOrder: inclusions.length,
    });
    if (day.isDropOff && day.dropOffLocation) inclusions.push({
      type: "DROP_OFF_TRANSFER", itineraryDayId: day.id, sourceKey: `${dayPrefix}:drop-off`,
      title: `Drop-off transfer - Day ${day.dayNumber}`,
      description: day.dropOffLocation.name, displayOrder: inclusions.length,
    });
    for (const common of day.commonInclusions) {
      inclusions.push({ type: "COMMON", itineraryDayId: day.id, sourceKey: `${dayPrefix}:common:${common.key.toLowerCase()}`, title: `${DAY_COMMON_INCLUSION_LABELS[common.key]} - Day ${day.dayNumber}`, description: null, displayOrder: inclusions.length });
    }
  }
  await tx.crmTripInclusion.deleteMany({ where: { tripId } });
  await tx.crmTripInclusion.createMany({ data: inclusions.map((item) => ({ ...item, tripId })) });
  return inclusions.length;
};

export const listTrips = async (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 50, 1), 100);
  const { data, total } = await repository.findMany({
    skip: (page - 1) * limit, take: limit,
    where: query.destinationId ? { destinationId: query.destinationId } : {},
  });
  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
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
  const destination = await prisma.crmDestination.findUnique({ where: { id: data.destinationId }, select: { id: true } });
  if (!destination) throw new ValidationError("Destination does not exist");
  const trip = await prisma.$transaction(async (tx) => {
    const created = await repository.create(data, tx);
    await tx.crmTripItineraryDay.createMany({ data: Array.from({ length: data.numberOfNights + 1 }, (_, index) => ({ tripId: created.id, dayNumber: index + 1 })) });
    await tx.crmTripCommonInclusion.createMany({ data: COMMON_INCLUSION_DEFAULTS(data.numberOfNights).map((item) => ({ ...item, tripId: created.id })) });
    await regenerateInclusions(tx, created.id);
    return created;
  });
  return getTrip(trip.id);
};

export const updateTrip = async (id, changes) => {
  await prisma.$transaction(async (tx) => {
    const trip = await repository.findById(id, tx);
    if (!trip) throw new NotFoundError("CRM trip not found");
    const nextTotal = changes.totalAmount ?? Number(trip.totalAmount);
    const nextToken = changes.tokenAmount ?? Number(trip.tokenAmount);
    if (Number.isFinite(nextTotal) && Number.isFinite(nextToken) && nextToken > nextTotal) {
      throw new ValidationError("Token amount cannot exceed the total amount");
    }
    if ((changes.totalAmount !== undefined || changes.tokenAmount !== undefined) && await tx.booking.count({ where: { crmTripId: id } })) {
      throw new ValidationError("Pricing cannot be changed after CRM bookings have been created");
    }
    if (changes.destinationId && changes.destinationId !== trip.destinationId) {
      const destination = await tx.crmDestination.findUnique({ where: { id: changes.destinationId }, select: { id: true } });
      if (!destination) throw new ValidationError("Destination does not exist");
      if (trip.itineraryDays.some(configuredDay)) throw new ValidationError("Clear itinerary master-data selections before changing the destination");
    }
    if (changes.numberOfNights !== undefined && changes.numberOfNights !== trip.numberOfNights) {
      const targetDays = changes.numberOfNights + 1;
      if (targetDays < trip.itineraryDays.length) {
        const removedDays = trip.itineraryDays.filter((day) => day.dayNumber > targetDays);
        if (removedDays.some(configuredDay)) throw new ValidationError("Cannot reduce nights while removed itinerary days contain selections");
        await tx.crmTripItineraryDay.deleteMany({ where: { tripId: id, dayNumber: { gt: targetDays } } });
      } else if (targetDays > trip.itineraryDays.length) {
        await tx.crmTripItineraryDay.createMany({ data: Array.from({ length: targetDays - trip.itineraryDays.length }, (_, index) => ({ tripId: id, dayNumber: trip.itineraryDays.length + index + 1 })) });
      }
    }
    await repository.update(id, changes, tx);
    await regenerateInclusions(tx, id);
  });
  return getTrip(id);
};

export const deleteTrip = async (id) => {
  await getTrip(id);
  return repository.remove(id);
};

export const updateDay = async (dayId, changes) => {
  await prisma.$transaction(async (tx) => {
    const day = await repository.findDayById(dayId, tx);
    if (!day) throw new NotFoundError("Itinerary day not found");
    const values = { ...day, ...changes };
    if (changes.stayLocationId === null && changes.propertyId === undefined) values.propertyId = null;
    await assertDestinationReferences(tx, day.trip, values);
    await tx.crmTripItineraryDay.update({ where: { id: dayId }, data: { ...changes, ...(values.propertyId === null ? { propertyId: null } : {}) } });
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
    await tx.crmTrip.update({ where: { id: tripId }, data: { numberOfNights: trip.numberOfNights + 1 } });
    await regenerateInclusions(tx, tripId);
  });
  return repository.findDayById(created.id);
};

export const deleteItineraryDay = async (dayId) => {
  await prisma.$transaction(async (tx) => {
    const day = await repository.findDayById(dayId, tx);
    if (!day) throw new NotFoundError("Itinerary day not found");
    const totalDays = await tx.crmTripItineraryDay.count({ where: { tripId: day.tripId } });
    if (totalDays <= 1 || day.dayNumber !== totalDays) {
      throw new ValidationError("Only the final itinerary day can be removed, and a trip must retain at least one day");
    }
    await tx.crmTripItineraryDay.delete({ where: { id: dayId } });
    await tx.crmTrip.update({ where: { id: day.tripId }, data: { numberOfNights: day.trip.numberOfNights - 1 } });
    await regenerateInclusions(tx, day.tripId);
  });
};

export const replacePlaces = async (dayId, placeIds) => {
  await prisma.$transaction(async (tx) => {
    const day = await repository.findDayById(dayId, tx);
    if (!day) throw new NotFoundError("Itinerary day not found");
    if (placeIds.length) {
      const matches = await tx.place.findMany({ where: { id: { in: placeIds }, destinationId: day.trip.destinationId }, select: { id: true } });
      if (matches.length !== placeIds.length) throw new ValidationError("Every visiting place must belong to the trip destination");
    }
    await tx.crmTripItineraryDayPlace.deleteMany({ where: { itineraryDayId: dayId } });
    if (placeIds.length) await tx.crmTripItineraryDayPlace.createMany({ data: placeIds.map((placeId, displayOrder) => ({ itineraryDayId: dayId, placeId, displayOrder })) });
    await regenerateInclusions(tx, day.tripId);
  });
  return repository.findDayById(dayId);
};

export const updateMeals = async (dayId, meals) => updateDay(dayId, meals);

export const updateDropOff = async (dayId, input) => {
  if (input.isDropOff && !input.dropOffLocationId) throw new ValidationError("A drop-off location is required when drop-off is enabled");
  return updateDay(dayId, { isDropOff: input.isDropOff, dropOffLocationId: input.isDropOff ? input.dropOffLocationId : null });
};

export const updateCommonInclusion = async (tripId, input) => {
  if (input.key === "BREAKFAST" || input.key === "DINNER") throw new ValidationError("Breakfast and dinner counts are controlled by day-level meal selections");
  if (input.key === "FIRST_AID_KIT" && input.isIncluded === false) throw new ValidationError("First aid kit is always included");
  await prisma.$transaction(async (tx) => {
    const trip = await tx.crmTrip.findUnique({ where: { id: tripId }, select: { id: true, numberOfNights: true } });
    if (!trip) throw new NotFoundError("CRM trip not found");
    await tx.crmTripCommonInclusion.createMany({ data: COMMON_INCLUSION_DEFAULTS(trip.numberOfNights).map((item) => ({ ...item, tripId })), skipDuplicates: true });
    const data = input.key === "TRAVEL" ? { numberOfDays: input.numberOfDays } : input.key === "VEHICLE_TYPE" ? { vehicleType: input.vehicleType } : { isIncluded: input.isIncluded };
    await tx.crmTripCommonInclusion.update({ where: { tripId_key: { tripId, key: input.key } }, data });
    await regenerateInclusions(tx, tripId);
  });
  return getTrip(tripId);
};

export const updateDayCommonInclusion = async (dayId, input) => {
  await prisma.$transaction(async (tx) => {
    const day = await repository.findDayById(dayId, tx);
    if (!day) throw new NotFoundError("Itinerary day not found");
    if (input.isIncluded) {
      await tx.crmTripItineraryDayCommonInclusion.upsert({ where: { itineraryDayId_key: { itineraryDayId: dayId, key: input.key } }, update: {}, create: { itineraryDayId: dayId, key: input.key } });
    } else {
      await tx.crmTripItineraryDayCommonInclusion.deleteMany({ where: { itineraryDayId: dayId, key: input.key } });
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
    activity = await tx.crmTripItineraryDayActivity.create({ data: { itineraryDayId: dayId, ...input, displayOrder: input.displayOrder ?? day.activities.length } });
    await regenerateInclusions(tx, day.tripId);
  });
  return activity;
};

export const updateActivity = async (dayId, activityId, input) => {
  await prisma.$transaction(async (tx) => {
    const activity = await tx.crmTripItineraryDayActivity.findFirst({ where: { id: activityId, itineraryDayId: dayId }, include: { itineraryDay: true } });
    if (!activity) throw new NotFoundError("Activity not found for this itinerary day");
    await tx.crmTripItineraryDayActivity.update({ where: { id: activityId }, data: input });
    await regenerateInclusions(tx, activity.itineraryDay.tripId);
  });
  return prisma.crmTripItineraryDayActivity.findUnique({ where: { id: activityId } });
};

export const deleteActivity = async (dayId, activityId) => {
  await prisma.$transaction(async (tx) => {
    const activity = await tx.crmTripItineraryDayActivity.findFirst({ where: { id: activityId, itineraryDayId: dayId }, include: { itineraryDay: true } });
    if (!activity) throw new NotFoundError("Activity not found for this itinerary day");
    await tx.crmTripItineraryDayActivity.delete({ where: { id: activityId } });
    await regenerateInclusions(tx, activity.itineraryDay.tripId);
  });
};

export const manuallyRegenerateInclusions = async (tripId) => {
  await prisma.$transaction(async (tx) => {
    const trip = await tx.crmTrip.findUnique({ where: { id: tripId }, select: { id: true } });
    if (!trip) throw new NotFoundError("CRM trip not found");
    await regenerateInclusions(tx, tripId);
  });
  return getTrip(tripId);
};
