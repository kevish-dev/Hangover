import { prisma } from "../../prisma/client.js";

export const taskInclude = {
  contact: { select: { id: true, displayName: true, email: true, phone: true } },
  lead: { select: { id: true, stage: true, title: true } },
  booking: { select: { id: true, bookingReference: true, status: true, paymentStatus: true } },
  trip: { select: { id: true, title: true, slug: true } },
  festival: { select: { id: true, title: true, slug: true } },
  slot: { select: { id: true, title: true, startDate: true, endDate: true } },
  hotelReservation: { select: { id: true, hotelName: true, status: true, paymentStatus: true } },
};

export const bookingInclude = {
  slot: { include: { trip: true, festival: true, operation: true } },
  trip: true,
  festival: true,
  package: true,
  user: {
    include: {
      profile: { include: { govtIdAsset: true } },
      crmContact: { select: { id: true, displayName: true, email: true, phone: true } },
    },
  },
  travelers: { include: { aadhaarAsset: true }, orderBy: { createdAt: "asc" } },
  opsCase: true,
  hotelReservations: {
    where: { archivedAt: null },
    orderBy: [{ checkInAt: "asc" }, { createdAt: "asc" }],
  },
  payments: { include: { refunds: true }, orderBy: { createdAt: "desc" } },
  paymentIntents: { orderBy: { createdAt: "desc" } },
  reminders: { orderBy: { createdAt: "desc" } },
  crmTasks: {
    where: { archivedAt: null },
    include: taskInclude,
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
  },
};

export const findAdminById = (id) => id
  ? prisma.user.findFirst({ where: { id, role: "ADMIN", isActive: true }, select: { id: true } })
  : null;

export const listAdmins = () => prisma.user.findMany({
  where: { role: "ADMIN", isActive: true },
  select: { id: true, email: true, profile: { select: { fullName: true, phone: true } } },
  orderBy: { email: "asc" },
});

export const listSlots = (where) => prisma.slot.findMany({
  where,
  include: {
    trip: { select: { id: true, title: true, slug: true, location: true } },
    festival: { select: { id: true, title: true, slug: true, location: true } },
    operation: true,
    crmTasks: { where: { archivedAt: null }, include: taskInclude, orderBy: [{ status: "asc" }, { dueAt: "asc" }] },
    bookings: { include: bookingInclude },
  },
  orderBy: [{ startDate: "asc" }, { priority: "desc" }],
});

export const getSlot = (id) => prisma.slot.findUnique({
  where: { id },
  include: {
    trip: { select: { id: true, title: true, slug: true, location: true } },
    festival: { select: { id: true, title: true, slug: true, location: true } },
    operation: true,
    crmTasks: { where: { archivedAt: null }, include: taskInclude, orderBy: [{ status: "asc" }, { dueAt: "asc" }] },
    bookings: { include: bookingInclude, orderBy: { createdAt: "desc" } },
  },
});

export const upsertDepartureOperation = (slotId, data) => prisma.departureOperation.upsert({
  where: { slotId },
  create: { slotId, ...data },
  update: data,
});

export const listBookings = (where) => prisma.booking.findMany({
  where,
  include: bookingInclude,
  orderBy: { createdAt: "desc" },
});

export const getBooking = (id) => prisma.booking.findUnique({ where: { id }, include: bookingInclude });

export const upsertBookingOps = (bookingId, data) => prisma.bookingOpsCase.upsert({
  where: { bookingId },
  create: { bookingId, ...data },
  update: data,
});

export const updatePrimaryDocument = (profileId, data) => prisma.userProfile.update({ where: { id: profileId }, data });

export const findTraveler = (id) => prisma.traveler.findUnique({ where: { id }, include: { aadhaarAsset: true } });

export const updateTraveler = (id, data) => prisma.traveler.update({ where: { id }, data, include: { aadhaarAsset: true } });

export const getBookingDocumentState = (bookingId) => prisma.booking.findUnique({
  where: { id: bookingId },
  select: {
    id: true,
    numberOfTravelers: true,
    user: { select: { profile: { select: { govtIdAssetId: true, govtIdImageUrl: true, govtIdNumber: true, govtIdVerificationStatus: true } } } },
    travelers: { select: { aadhaarAssetId: true, aadhaar: true, verificationStatus: true } },
  },
});

export const createHotel = (data) => prisma.hotelReservation.create({ data });
export const findHotel = (id) => prisma.hotelReservation.findUnique({ where: { id } });
export const updateHotel = (id, data) => prisma.hotelReservation.update({ where: { id }, data });

export const listOpenTasks = () => prisma.crmTask.findMany({
  where: { status: "OPEN", archivedAt: null },
  include: taskInclude,
  orderBy: [{ dueAt: "asc" }, { priority: "desc" }, { createdAt: "asc" }],
  take: 50,
});
