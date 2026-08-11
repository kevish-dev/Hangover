import { prisma } from "../../prisma/client.js";

export const createCrudRepository = (delegateName, { include } = {}) => {
  const delegate = () => prisma[delegateName];

  return {
    findMany: ({ skip, take, where }) => delegate().findMany({
      where,
      skip,
      take,
      orderBy: { name: "asc" },
      include,
    }),
    count: (where) => delegate().count({ where }),
    findById: (id) => delegate().findUnique({ where: { id }, include }),
    create: (data) => delegate().create({ data, include }),
    update: (id, data) => delegate().update({ where: { id }, data, include }),
    remove: (id) => delegate().delete({ where: { id } }),
  };
};
