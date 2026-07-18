import { prisma } from "../../prisma/client.js";

export const findAll = (isAdmin = false) =>
  prisma.landingReason.findMany({
    where: isAdmin ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

export const create = (data) => prisma.landingReason.create({ data });

export const update = (id, data) =>
  prisma.landingReason.update({ where: { id }, data });

export const remove = (id) => prisma.landingReason.delete({ where: { id } });
