import { prisma } from "../../prisma/client.js";

export const findAll = async (skip, take) => {
  const [trips, total] = await Promise.all([
    prisma.trip.findMany({
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.trip.count(),
  ]);
  return { trips, total };
};

export const findById = async (id) => {
  return prisma.trip.findUnique({
    where: { id },
    include: {
      faqs: true,
      itinerary: {
        include: {
          items: true
        }
      },
      tripTags: true,
    }
  });
};

export const create = async (data) => {
  return prisma.trip.create({ data });
};

export const update = async (id, data) => {
  return prisma.trip.update({
    where: { id },
    data,
  });
};

export const remove = async (id) => {
  return prisma.trip.delete({
    where: { id },
  });
};
