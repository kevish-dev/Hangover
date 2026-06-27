import { prisma } from "../../prisma/client.js";

const authRepository = {
  findUserByIdentifier: async (identifier, value) => {
    return await prisma.user.findFirst({
      where: {
        [identifier]: value,
      },
    });
  },

  findUserByIdentifierAndUpdate: async (
    identifier,
    value,
    updateData
  ) => {
    return await prisma.user.update({
      where: {
        [identifier]: value,
      },
      data: updateData,
    });
  },

  fetchUserFromToken: async (tokenHash, type) => {
    return await prisma.token.findFirst({
      where: {
        tokenHash: tokenHash,
        type: type
      },
      include: {
        user: true,
      },
    });
  },

  createUser: async (email, name, hash, phone) => {
    return await prisma.user.create({
      data: {
        email,
        name,
        password: hash,
        phone,
      },
    });
  },

  createToken: async (userId, hash, type, expiresAt) => {
    return await prisma.token.create({
      data: {
        userId: userId,
        tokenHash: hash,
        type: type,
        expiresAt: expiresAt,
      },
    });
  },

  deleteToken: async (id) => {
    return prisma.token.delete({
      where: {
        id,
      },
    });
  },

  deleteAllTokensForUser: async (userId, type) => {
    return prisma.token.deleteMany({
      where: {
        userId,
        type
      }
    });
  }
};

export default authRepository;
