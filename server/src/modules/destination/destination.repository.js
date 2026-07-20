import { prisma } from "../../prisma/client.js";

export const findAll = async (skip, take, where = {}, isAdmin = false) => {
  const circuitInclude = isAdmin ? true : { where: { isActive: true } };
  
  const [destinations, total] = await Promise.all([
    prisma.destination.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        circuits: circuitInclude
      }
    }),
    prisma.destination.count({ where }),
  ]);
  return { destinations, total };
};

export const findById = async (whereObj, isAdmin = false) => {
  const filter = typeof whereObj === 'string' ? { id: whereObj } : whereObj;
  const circuitInclude = isAdmin ? true : { where: { isActive: true } };
  
  return prisma.destination.findFirst({
    where: filter,
    include: {
      circuits: circuitInclude
    }
  });
};

export const create = async (data) => {
  const { circuitIds, ...rest } = data;
  const payload = { ...rest };
  if (circuitIds && circuitIds.length > 0) {
    payload.circuits = { connect: circuitIds.map(id => ({ id })) };
  }
  return prisma.destination.create({ data: payload });
};

export const update = async (id, data) => {
  const { circuitIds, ...rest } = data;
  const payload = { ...rest };
  if (circuitIds) {
    payload.circuits = { set: circuitIds.map(id => ({ id })) };
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
