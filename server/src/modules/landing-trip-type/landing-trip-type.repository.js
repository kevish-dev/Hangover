import { prisma } from "../../prisma/client.js";

export const findAll = (isAdmin = false) =>
  prisma.landingTripType.findMany({
    where: isAdmin ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
export const create = (data) => prisma.landingTripType.create({ data });
export const update = (id, data) =>
  prisma.landingTripType.update({ where: { id }, data });
export const remove = (id) => prisma.landingTripType.delete({ where: { id } });
