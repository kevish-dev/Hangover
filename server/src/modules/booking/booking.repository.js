import { prisma } from "../../prisma/client.js";

export const createBooking = async (data) => {
  return prisma.booking.create({
    data,
    include: {
      formResponses: true,
      trip: true
    }
  });
};

export const getBookingById = async (id) => {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      trip: true,
      formResponses: {
        include: {
          field: true
        }
      }
    }
  });
};

export const getUserBookings = async (userId, skip, take) => {
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: { userId },
      include: { trip: true },
      orderBy: { createdAt: "desc" },
      skip,
      take
    }),
    prisma.booking.count({ where: { userId } })
  ]);
  return { bookings, total };
};

export const getAllBookings = async (skip, take) => {
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      include: { trip: true, user: true },
      orderBy: { createdAt: "desc" },
      skip,
      take
    }),
    prisma.booking.count()
  ]);
  return { bookings, total };
};
