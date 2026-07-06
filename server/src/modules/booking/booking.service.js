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
      status: { in: ["RESERVED", "CONFIRMED", "COMPLETED"] },
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

  const baseTotalAmount = Number(trip.price) * numberOfTravelers;
  const totalAmount = baseTotalAmount + (baseTotalAmount * 0.05);

  const baseTokenAmount = Number(trip.tokenAmount) * numberOfTravelers;
  const tokenAmount = baseTokenAmount + (baseTokenAmount * 0.05);

  let initialPaymentType = data.initialPaymentType || "TOKEN";
  if (tokenAmount === 0) {
    initialPaymentType = "FULL";
  }
  const amountDue =
    initialPaymentType === "FULL" ? 0 : totalAmount - tokenAmount;

  // 4. Calculate balance due date: 10 days before trip start
  const balanceDueDate = new Date(trip.startDate);
  balanceDueDate.setDate(balanceDueDate.getDate() - 10);

  // 5. Build booking payload
  const bookingData = {
    numberOfTravelers,
    initialPaymentType,
    totalAmount,
    tokenAmount,
    amountDue,
    balanceDueDate,
    specialRequests: data.specialRequests || null,
  };

  const travelersCreateData = (data.additionalTravelers && Array.isArray(data.additionalTravelers) && data.additionalTravelers.length > 0)
    ? data.additionalTravelers.map(t => ({
        fullName: t.fullName,
        gender: t.gender,
        dateOfBirth: t.dateOfBirth ? new Date(t.dateOfBirth) : null,
        phone: t.phone,
        aadhaar: t.aadhaar,
      }))
    : [];

  // Check if there is an existing PENDING booking to reuse
  const existingPending = await prisma.booking.findFirst({
    where: {
      userId,
      tripId: data.tripId,
      status: "PENDING",
    },
  });

  if (existingPending) {
    bookingData.travelers = {
      deleteMany: {}, // Clear any previous travelers if updating an existing pending booking
      ...(travelersCreateData.length > 0 && { create: travelersCreateData })
    };
    return repo.updateBooking(existingPending.id, bookingData);
  }

  // Generate booking reference and complete payload for a new booking
  bookingData.bookingReference = `HNG-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  bookingData.userId = userId;
  bookingData.tripId = data.tripId;
  bookingData.status = "PENDING";
  bookingData.paymentStatus = "PENDING";

  if (travelersCreateData.length > 0) {
    bookingData.travelers = { create: travelersCreateData };
  }

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

export const cancelAndRefundBooking = async (bookingId, adminId, reason) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      trip: true,
      user: { include: { profile: true } },
      payments: {
        where: { status: "SUCCESS" }
      }
    }
  });

  if (!booking) throw new NotFoundError("Booking not found");
  if (booking.status === "CANCELLED") {
    throw new ValidationError("Booking is already cancelled.");
  }

  // Import razorpay dynamically to avoid circular dependencies if any
  const razorpay = await import("../../core/services/razorpay.service.js");

  // 1. Process refunds via Razorpay first (outside DB transaction)
  const refundsData = [];
  for (const payment of booking.payments) {
    if (payment.razorpayPaymentId) {
      const amountPaise = Math.round(Number(payment.amount) * 100);
      const rzpRefund = await razorpay.createRefund(
        payment.razorpayPaymentId,
        amountPaise,
        { reason: reason || "Admin initiated cancellation and refund", admin_id: adminId }
      );
      refundsData.push({
        payment,
        rzpRefund
      });
    }
  }

  // 2. Perform DB updates in a transaction
  await prisma.$transaction(async (tx) => {
    // Record refunds
    for (const { payment, rzpRefund } of refundsData) {
      await tx.refund.create({
        data: {
          paymentId: payment.id,
          amount: payment.amount,
          status: "SUCCESS",
          reason: reason || "Admin initiated cancellation and refund",
          razorpayRefundId: rzpRefund.id,
          initiatedBy: adminId,
          metadata: { razorpayRefund: rzpRefund },
        }
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "REFUNDED" }
      });
    }

    // Cancel booking
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        paymentStatus: booking.payments.length > 0 ? "REFUNDED" : "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: adminId,
        cancellationReason: reason || "Admin initiated full refund and cancellation",
      }
    });

    // Free up trip spots
    await tx.trip.update({
      where: { id: booking.tripId },
      data: {
        filledSpots: Math.max(0, booking.trip.filledSpots - booking.numberOfTravelers)
      }
    });
  });

  // Send Email (Fire and forget)
  import("../../core/services/email.service.js").then((emailService) => {
    if (emailService.sendBookingCancelledRefundedEmail) {
      emailService.sendBookingCancelledRefundedEmail(booking.user.email, {
        name: booking.user.profile?.fullName || "Traveler",
        tripTitle: booking.trip.title,
        bookingRef: booking.bookingReference,
        refundAmount: booking.amountPaid
      }).catch(err => console.error("Failed to send cancellation email:", err));
    }
  }).catch(err => console.error("Failed to import email service:", err));

  return { success: true, message: "Booking cancelled and refunded successfully." };
};
