import { prisma } from "../../prisma/client.js";

export const findAllUsers = async (skip, take) => {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take,
      include: { profile: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
  ]);
  return { users, total };
};

export const findUserById = async (id) => {
  return prisma.user.findUnique({
    where: { id },
    include: { profile: true },
  });
};

export const updateUserProfile = async (userId, data) => {
  // Use upsert to handle cases where profile doesn't exist yet
  return prisma.userProfile.upsert({
    where: { userId },
    update: data,
    create: { ...data, userId },
  });
};

export const updateUserStatus = async (id, isActive) => {
  return prisma.user.update({
    where: { id },
    data: { isActive },
  });
};
