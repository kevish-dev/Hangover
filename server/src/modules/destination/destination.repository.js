import { prisma } from "../../prisma/client.js";

export const findAll = async (skip, take, where = {}, isAdmin = false) => {
  const tripInclude = isAdmin ? true : { where: { isPublished: true } };
  const festInclude = isAdmin ? true : { where: { isPublished: true } };
  
  const [destinations, total] = await Promise.all([
    prisma.destination.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        trips: tripInclude,
        festivals: festInclude
      }
    }),
    prisma.destination.count({ where }),
  ]);
  return { destinations, total };
};

export const findById = async (whereObj, isAdmin = false) => {
  const filter = typeof whereObj === 'string' ? { id: whereObj } : whereObj;
  const tripInclude = isAdmin ? true : { where: { isPublished: true } };
  const festInclude = isAdmin ? true : { where: { isPublished: true } };
  
  return prisma.destination.findFirst({
    where: filter,
    include: {
      trips: tripInclude,
      festivals: festInclude,
    }
  });
};

export const create = async (data) => {
  const { tripIds, ...rest } = data;
  const payload = { ...rest };
  if (tripIds && tripIds.length > 0) {
    payload.trips = { connect: tripIds.map(id => ({ id })) };
  }
  return prisma.destination.create({ data: payload });
};

export const update = async (id, data) => {
  const { tripIds, ...rest } = data;
  const payload = { ...rest };
  if (tripIds) {
    payload.trips = { set: tripIds.map(id => ({ id })) };
  }
  return prisma.destination.update({
    where: { id },
    data: payload,
  });
};

export const remove = async (id) => {
  return prisma.destination.delete({
    where: { id },
  });
};
