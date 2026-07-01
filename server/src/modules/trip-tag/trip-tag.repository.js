import { prisma } from "../../prisma/client.js";

export const createTripTag = async (data) => {
  return prisma.tripTag.create({ data });
};

export const getAllTripTags = async () => {
  return prisma.tripTag.findMany({
    orderBy: { tag: "asc" }
  });
};

export const getTripTagById = async (id) => {
  return prisma.tripTag.findUnique({
    where: { id },
    include: { trips: true }
  });
};

export const updateTripTag = async (id, data) => {
  return prisma.tripTag.update({
    where: { id },
    data
  });
};

export const deleteTripTag = async (id) => {
  return prisma.tripTag.delete({
    where: { id }
  });
};
