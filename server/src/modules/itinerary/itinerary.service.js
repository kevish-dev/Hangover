import * as itineraryRepo from "./itinerary.repository.js";
import { prisma } from "../../prisma/client.js";

export const getTripItinerary = async (tripId) => {
  return itineraryRepo.getByTripId(tripId);
};

export const getFestivalItinerary = async (festivalId) => {
  return itineraryRepo.getByFestivalId(festivalId);
};

export const createItinerary = async (data) => {
  const { days, tripId, festivalId } = data;

  if (tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new Error("Trip not found");
    await itineraryRepo.removeByTripId(tripId);
  } else if (festivalId) {
    const festival = await prisma.festival.findUnique({ where: { id: festivalId } });
    if (!festival) throw new Error("Festival not found");
    await itineraryRepo.removeByFestivalId(festivalId);
  }

  const payload = days.map(day => {
    const { tasks, ...restDay } = day;
    return {
      ...restDay,
      tripId: tripId || null,
      festivalId: festivalId || null,
      tasks: tasks && Array.isArray(tasks) ? {
        create: tasks.map(task => ({
          category: task.category,
          title: task.title,
          description: task.description || null,
          config: task.config || {},
          unitPrice: task.unitPrice ?? null,
          quantityNeeded: task.quantityNeeded ?? null,
          dueOffsetDays: task.dueOffsetDays ?? null,
        }))
      } : undefined,
    };
  });

  return itineraryRepo.createMany(payload);
};

export const updateItineraryDay = async (id, data) => {
  const day = await itineraryRepo.getById(id);
  if (!day) throw new Error("Itinerary day not found");
  return itineraryRepo.update(id, data);
};

export const deleteItineraryDay = async (id) => {
  const day = await itineraryRepo.getById(id);
  if (!day) throw new Error("Itinerary day not found");
  return itineraryRepo.remove(id);
};
