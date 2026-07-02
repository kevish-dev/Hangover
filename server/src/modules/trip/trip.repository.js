import { prisma } from "../../prisma/client.js";

export const findAll = async (skip, take, where = {}) => {
  const [trips, total] = await Promise.all([
    prisma.trip.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.trip.count({ where }),
  ]);
  return { trips, total };
};

export const findById = async (whereObj) => {
  const filter = typeof whereObj === 'string' ? { id: whereObj } : whereObj;
  return prisma.trip.findFirst({
    where: filter,
    include: {
      faqs: true,
      itineraries: {
        include: {
          days: {
            include: {
              activities: true
            }
          }
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
