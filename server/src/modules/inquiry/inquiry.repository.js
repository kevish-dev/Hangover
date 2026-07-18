import { prisma } from "../../prisma/client.js";

export const createInquiry = async (data) => {
  return prisma.inquiry.create({ data });
};

export const getInquiries = async (skip, take, filter = {}) => {
  const [inquiries, total] = await Promise.all([
    prisma.inquiry.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { trip: true, festival: true, user: true, resolvedBy: true }
    }),
    prisma.inquiry.count({ where: filter })
  ]);
  return { inquiries, total };
};

export const getInquiryById = async (id) => {
  return prisma.inquiry.findUnique({
    where: { id },
    include: { trip: true, festival: true, user: true, resolvedBy: true }
  });
};

export const updateInquiry = async (id, data) => {
  return prisma.inquiry.update({
    where: { id },
    data
  });
};

export const deleteInquiry = async (id) => {
  return prisma.inquiry.delete({
    where: { id }
  });
};
