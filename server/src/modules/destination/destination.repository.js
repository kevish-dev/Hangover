import { prisma } from "../../prisma/client.js";

export const findAll = async (skip, take, where = {}) => {
  const [destinations, total] = await Promise.all([
    prisma.destination.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.destination.count({ where }),
  ]);
  return { destinations, total };
};

export const findById = async (whereObj) => {
  const filter = typeof whereObj === 'string' ? { id: whereObj } : whereObj;
  
  return prisma.destination.findFirst({
    where: filter,
  });
};

export const create = async (data) => {
  return prisma.destination.create({ data });
};

export const update = async (id, data) => {
  return prisma.destination.update({
    where: { id },
    data,
  });
};

export const remove = async (id) => {
  return prisma.destination.delete({
    where: { id },
  });
};
