import { prisma } from "../../prisma/client.js";

export const findAllByParent = async (whereCondition) => {
  return prisma.fAQ.findMany({
    where: whereCondition,
    orderBy: { order: "asc" },
  });
};

export const findById = async (id) => {
  return prisma.fAQ.findUnique({
    where: { id },
  });
};

export const create = async (parentRelation, data) => {
  return prisma.fAQ.create({
    data: {
      ...data,
      ...parentRelation,
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
