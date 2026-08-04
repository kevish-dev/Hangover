import { prisma } from "../../prisma/client.js";

export const findUserByGoogleId = async (googleId) => {
  return prisma.user.findUnique({
    where: { googleId },
  });
};

export const findUserByEmail = async (email) => {
  return prisma.user.findUnique({
    where: { email },
  });
};

export const createUser = async (userData) => {
  return prisma.user.create({
    data: {
      email: userData.email,
      googleId: userData.googleId,
      profile: {
        create: {
          fullName: userData.fullName || null,
        },
      },
    },
  });
};

export const linkGoogleAccount = async (userId, googleId, fullName) => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      googleId,
      profile: {
        upsert: {
          update: {},
          create: { fullName: fullName || null },
        },
      },
    },
  });
};

export const updateLastLogin = async (userId) => {
  return prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
};
