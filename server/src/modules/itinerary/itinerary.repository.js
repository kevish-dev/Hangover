import { prisma } from "../../prisma/client.js";

export const getByTripId = async (tripId) => {
  return prisma.itineraryDay.findMany({
    where: { tripId },
    orderBy: { dayNumber: 'asc' },
  });
};

export const getByFestivalId = async (festivalId) => {
  return prisma.itineraryDay.findMany({
    where: { festivalId },
    orderBy: { dayNumber: 'asc' },
  });
};

export const getById = async (id) => {
  return prisma.itineraryDay.findUnique({
    where: { id },
  });
};

export const createMany = async (data) => {
  return prisma.$transaction(
    data.map(day => prisma.itineraryDay.create({ data: day }))
  );
};

export const update = async (id, data) => {
  return prisma.itineraryDay.update({
    where: { id },
    data,
  });
};

export const remove = async (id) => {
  return prisma.itineraryDay.delete({
    where: { id },
  });
};

export const removeByTripId = async (tripId) => {
  return prisma.itineraryDay.deleteMany({
    where: { tripId },
  });
};

export const removeByFestivalId = async (festivalId) => {
  return prisma.itineraryDay.deleteMany({
    where: { festivalId },
  });
};
