import { prisma } from "../../prisma/client.js";

const bookingInclude = {
  trip: true,
  travelers: true,
  payments: { include: { refunds: true } },
};

export const createBooking = async (data) => {
  return prisma.booking.create({
    data,
    include: bookingInclude,
  });
};

export const getBookingById = async (id) => {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      ...bookingInclude,
      user: { include: { profile: true } },
    },
  });
};

export const updateBooking = async (id, data) => {
  return prisma.booking.update({
    where: { id },
    data,
    include: bookingInclude,
  });
};

export const getUserBookings = async (userId, skip, take) => {
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: { userId },
      include: { trip: true, travelers: true, payments: { include: { refunds: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.booking.count({ where: { userId } }),
  ]);
  return { bookings, total };
};

export const getAllBookings = async (skip, take) => {
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      include: { trip: true, travelers: true, user: { include: { profile: true } }, payments: { include: { refunds: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.booking.count(),
  ]);
  return { bookings, total };
};

export const getBookingsByTripId = async (tripId) => {
  return prisma.booking.findMany({
    where: { tripId },
    include: {
      user: { include: { profile: true } },
      travelers: true,
      payments: { include: { refunds: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

