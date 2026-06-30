import { prisma } from "../../prisma/client.js";

export const findAll = async (skip, take) => {
  const [itineraries, total] = await Promise.all([
    prisma.itinerary.findMany({
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.itinerary.count(),
  ]);
  return { itineraries, total };
};

export const findById = async (id) => {
  return prisma.itinerary.findUnique({
    where: { id },
    include: {
      days: {
        include: {
          activities: {
            orderBy: { order: "asc" },
          }
        },
        orderBy: { dayNumber: "asc" },
      },
    },
  });
};

export const create = async (data) => {
  // Data can include nested creation syntax for Prisma:
  // { title: "...", days: { create: [ ... ] } }
  return prisma.itinerary.create({
    data,
    include: {
      days: {
        include: { activities: true },
      },
    },
  });
};

export const update = async (id, data) => {
  // Only updates root itinerary fields for simplicity.
  // Nested updates require separate endpoints or deep update logic.
  return prisma.itinerary.update({
    where: { id },
    data,
  });
};

export const remove = async (id) => {
  return prisma.itinerary.delete({
    where: { id },
  });
};
