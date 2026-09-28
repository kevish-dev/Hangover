import { prisma } from "../../prisma/client.js";

export const findAllUsers = async (skip, take) => {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take,
      include: { profile: { include: { govtIdAsset: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
  ]);
  return { users, total };
};

export const findUserById = async (id) => {
  return prisma.user.findUnique({
    where: { id },
    include: { profile: { include: { govtIdAsset: true } } },
  });
};

export const updateUserProfile = async (userId, data) => {
  // Use upsert to handle cases where profile doesn't exist yet
  return prisma.userProfile.upsert({
    where: { userId },
    update: data,
    create: { ...data, userId },
    include: { govtIdAsset: true },
  });
};

export const updateUserStatus = async (id, isActive) => {
  return prisma.user.update({
    where: { id },
    data: { isActive },
  });
};

export const updateUserRole = async (id, role) => {
  return prisma.user.update({
    where: { id },
    data: { role },
  });
};

export const deleteUser = async (id) => {
  return prisma.user.delete({ where: { id } });
};
