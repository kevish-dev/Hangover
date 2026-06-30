import { prisma } from "../../prisma/client.js";

export const findAllByTripId = async (tripId) => {
  return prisma.fAQ.findMany({
    where: { tripId },
    orderBy: { order: "asc" },
  });
};

export const findById = async (id) => {
  return prisma.fAQ.findUnique({
    where: { id },
  });
};

export const create = async (tripId, data) => {
  return prisma.fAQ.create({
    data: {
      ...data,
      tripId,
    },
  });
};

export const update = async (id, data) => {
  return prisma.fAQ.update({
    where: { id },
    data,
  });
};

export const remove = async (id) => {
  return prisma.fAQ.delete({
    where: { id },
  });
};
