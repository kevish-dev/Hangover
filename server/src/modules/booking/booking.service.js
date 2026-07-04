import * as repo from "./booking.repository.js";
import { prisma } from "../../prisma/client.js";
import {
  AppError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../core/errors/errors.js";
import crypto from "crypto";

export const createBooking = async (userId, data) => {
  // 1. Verify user has a Government ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user || !user.profile) {
    throw new ValidationError(
      "User profile not found. Please complete your profile.",
    );
  }

  const hasGovtId =
    user.profile.govtIdNumber || user.profile.govtIdImageUrl;

  if (!hasGovtId) {
    throw new ForbiddenError(
      "A valid Government ID is required in your profile to proceed with the booking.",
    );
  }

  // 2. Fetch trip
  const trip = await prisma.trip.findUnique({ where: { id: data.tripId } });
  if (!trip) throw new NotFoundError("Trip not found");
  if (!trip.isActive)
    throw new ValidationError("This trip is no longer available for booking.");

  // Check if user already has an active booking for this trip
  const existingActive = await prisma.booking.findFirst({
    where: {
      userId,
      tripId: data.tripId,
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
  });
  if (existingActive) {
    throw new ValidationError("You have already booked this trip.");
  }

  // 3. Pricing calculation (per-person)
  const numberOfTravelers = data.numberOfTravelers || 1;

  // Validate traveler count against group size limits

  // Check capacity
  const spotsLeft = trip.capacity - trip.filledSpots;
  if (numberOfTravelers > spotsLeft) {
    throw new ValidationError(
      `Only ${spotsLeft} spot(s) remaining on this trip.`,
    );
  }

  const totalAmount = Number(trip.price) * numberOfTravelers;
  const tokenAmount = Number(trip.tokenAmount) * numberOfTravelers;

  let initialPaymentType = data.initialPaymentType || "TOKEN";
  if (tokenAmount === 0) {
    initialPaymentType = "FULL";
  }
  const amountDue =
    initialPaymentType === "FULL" ? 0 : totalAmount - tokenAmount;

  // 4. Calculate balance due date: 10 days before trip start
  const balanceDueDate = new Date(trip.startDate);
  balanceDueDate.setDate(balanceDueDate.getDate() - 10);

  // Generate booking reference
  const bookingReference = `HNG-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

  // 5. Build booking payload
  const bookingData = {
    bookingReference,
    userId,
    tripId: data.tripId,
    numberOfTravelers,
    initialPaymentType,
    totalAmount,
    tokenAmount,
    amountDue,
    balanceDueDate,
    status: "PENDING",
    paymentStatus: "PENDING",
    specialRequests: data.specialRequests || null,
  };

  return repo.createBooking(bookingData);
};

export const cancelBooking = async (bookingId, userId, reason) => {
  const booking = await repo.getBookingById(bookingId);
  if (!booking) throw new NotFoundError("Booking not found");
  if (booking.userId !== userId)
    throw new ForbiddenError("You can only cancel your own bookings.");

  const cancellableStatuses = ["PENDING", "RESERVED"];
  if (!cancellableStatuses.includes(booking.status)) {
    throw new ValidationError(
      `Booking cannot be cancelled in its current status: ${booking.status}.`,
    );
  }

  return repo.updateBooking(bookingId, {
    status: "CANCELLED",
    cancelledAt: new Date(),
    cancelledBy: userId,
    cancellationReason: reason || null,
  });
};

export const getBookingById = async (id, userId, isAdmin = false) => {
  const booking = await repo.getBookingById(id);
  if (!booking) throw new NotFoundError("Booking not found");
  if (!isAdmin && booking.userId !== userId)
    throw new ForbiddenError("Forbidden");
  return booking;
};

export const getUserBookings = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit, 10);
  const { bookings, total } = await repo.getUserBookings(userId, skip, take);
  return {
    data: bookings,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take),
    },
  };
};

export const getAllBookings = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit, 10);
  const { bookings, total } = await repo.getAllBookings(skip, take);
  return {
    data: bookings,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take),
    },
  };
};

export const getBookingsByTripId = async (tripId) => {
  return repo.getBookingsByTripId(tripId);
};
