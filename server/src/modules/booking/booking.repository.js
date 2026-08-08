import { prisma } from "../../prisma/client.js";
const bookingInclude = {
  slot: {
    include: {
      trip: true,
      festival: true,
    }
  },
  package: true,
  addOns: { include: { addOn: true } },
  
  travelers: { include: { aadhaarAsset: true } },
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
      crmTrip: true,
      crmTripSlot: true,
      crmFestival: true,
      crmFestivalSlot: true,
      user: { include: { profile: { include: { govtIdAsset: true } } } },
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
      include: { slot: { include: { trip: true, festival: true } }, crmTrip: { include: { destination: true } }, crmTripSlot: true, crmFestival: { include: { destination: true } }, crmFestivalSlot: true, package: true, addOns: { include: { addOn: true } }, review: true, travelers: { include: { aadhaarAsset: true } }, payments: { include: { refunds: true } } },
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
      include: { slot: { include: { trip: true, festival: true } }, package: true, addOns: { include: { addOn: true } }, travelers: { include: { aadhaarAsset: true } }, user: { include: { profile: { include: { govtIdAsset: true } } } }, payments: { include: { refunds: true } } },
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
    where: { slot: { tripId } },
    include: {
      user: { include: { profile: { include: { govtIdAsset: true } } } },
      travelers: { include: { aadhaarAsset: true } },
      slot: true,
      package: true,
      payments: { include: { refunds: true } },
      addOns: { include: { addOn: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getBookingsByFestivalId = async (festivalId) => {
  return prisma.booking.findMany({
    where: { slot: { festivalId } },
    include: {
      user: { include: { profile: { include: { govtIdAsset: true } } } },
      travelers: { include: { aadhaarAsset: true } },
      slot: true,
      package: true,
      payments: { include: { refunds: true } },
      addOns: { include: { addOn: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};
