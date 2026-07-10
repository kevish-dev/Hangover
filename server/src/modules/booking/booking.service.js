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

  if (!data.slotId) {
    throw new ValidationError("Must provide a slotId to book.");
  }

  const slot = await prisma.slot.findUnique({ 
    where: { id: data.slotId },
    include: { 
      trip: { include: { packages: true } }, 
      festival: { include: { packages: true } } 
    } 
  });
  if (!slot) {
    throw new NotFoundError("Booking slot not found");
  }

  const isTrip = !!slot.tripId;
  const item = isTrip ? slot.trip : slot.festival;

  if (!item) throw new NotFoundError("Booking item not found");
  if (!item.isActive)
    throw new ValidationError("This item is no longer available for booking.");

  const siblingSlots = await prisma.slot.findMany({
    where: isTrip ? { tripId: slot.tripId } : { festivalId: slot.festivalId },
    select: { id: true }
  });
  const siblingSlotIds = siblingSlots.map(s => s.id);

  const existingBooking = await prisma.booking.findFirst({
    where: {
      userId,
      slotId: { in: siblingSlotIds },
      status: { in: ["PENDING", "RESERVED", "CONFIRMED"] }
    }
  });

  if (existingBooking) {
    if (existingBooking.status === "PENDING") {
      throw new ValidationError("You already have a pending booking for this trip. Please complete the payment or ask support to cancel it.");
    } else {
      throw new ValidationError("You already have an active booking for this trip. You cannot book another slot or package until your trip is completed.");
    }
  }

  // 3. Pricing calculation (per-person)
  const numberOfTravelers = data.numberOfTravelers || 1;

  // Validate traveler count against group size limits

  // Check capacity on the slot
  const spotsLeft = slot.capacity - slot.filledSpots;
  if (numberOfTravelers > spotsLeft) {
    throw new ValidationError(
      `Only ${spotsLeft} spot(s) remaining for the selected dates.`,
    );
  }

  let selectedPackage = null;
  if (data.packageId) {
    selectedPackage = item.packages?.find(p => p.id === data.packageId);
    if (!selectedPackage) {
      throw new ValidationError("Selected package not found for this item.");
    }
  }

  const itemPrice = selectedPackage ? Number(selectedPackage.price) : Number(item.price);
  const itemToken = selectedPackage ? Number(selectedPackage.tokenAmount) : Number(item.tokenAmount);

  const baseTotalAmount = itemPrice * numberOfTravelers;
  const totalAmount = baseTotalAmount + (baseTotalAmount * 0.05);

  const baseTokenAmount = itemToken * numberOfTravelers;
  const tokenAmount = baseTokenAmount + (baseTokenAmount * 0.05);

  let initialPaymentType = data.initialPaymentType || "TOKEN";
  if (tokenAmount === 0) {
    initialPaymentType = "FULL";
  }
  const amountDue =
    initialPaymentType === "FULL" ? 0 : totalAmount - tokenAmount;

  // 4. Calculate balance due date: 10 days before start
  const balanceDueDate = new Date(slot.startDate);
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


  // Generate booking reference and complete payload for a new booking
  bookingData.bookingReference = `HNG-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  bookingData.userId = userId;
  bookingData.slotId = data.slotId;
  if (selectedPackage) bookingData.packageId = selectedPackage.id;
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
  
  return {
    ...booking,
    trip: booking.slot?.trip || null,
    festival: booking.slot?.festival || null,
  };
};

export const getUserBookings = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit, 10);
  const { bookings, total } = await repo.getUserBookings(userId, skip, take);
  const mappedBookings = bookings.map(b => ({
    ...b,
    trip: b.slot?.trip || null,
    festival: b.slot?.festival || null,
  }));
  return {
    data: mappedBookings,
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
  const mappedBookings = bookings.map(b => ({
    ...b,
    trip: b.slot?.trip || null,
    festival: b.slot?.festival || null,
  }));
  return {
    data: mappedBookings,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take),
    },
  };
};

export const getBookingsByTripId = async (tripId) => {
  const bookings = await repo.getBookingsByTripId(tripId);
  return bookings.map(b => ({ ...b, trip: b.slot?.trip || null, festival: b.slot?.festival || null }));
};

export const getBookingsByFestivalId = async (festivalId) => {
  const bookings = await repo.getBookingsByFestivalId(festivalId);
  return bookings.map(b => ({ ...b, trip: b.slot?.trip || null, festival: b.slot?.festival || null }));
};

export const cancelAndRefundBooking = async (bookingId, adminId, reason, refundAmount) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      slot: { include: { trip: true, festival: true } },
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

  const totalPaid = Number(booking.amountPaid) || 0;
  
  let validRefundAmount = 0;
  if (refundAmount !== undefined && refundAmount !== null && refundAmount !== "") {
    validRefundAmount = Number(refundAmount);
    if (isNaN(validRefundAmount) || validRefundAmount < 0) {
      throw new ValidationError("Invalid refund amount.");
    }
    if (validRefundAmount > totalPaid) {
      throw new ValidationError(`Refund amount cannot exceed the total amount paid (₹${totalPaid}).`);
    }
  } else if (totalPaid > 0) {
    throw new ValidationError("Refund amount is required.");
  }

  // Import razorpay dynamically to avoid circular dependencies if any
  const razorpay = await import("../../core/services/razorpay.service.js");

  // 1. Process refunds via Razorpay first (outside DB transaction)
  const refundsData = [];
  let remainingRefundAmount = validRefundAmount;

  for (const payment of booking.payments) {
    if (remainingRefundAmount <= 0) break;

    if (payment.razorpayPaymentId) {
      const maxRefundForPayment = Number(payment.amount);
      const amountToRefund = Math.min(remainingRefundAmount, maxRefundForPayment);
      
      const amountPaise = Math.round(amountToRefund * 100);
      const rzpRefund = await razorpay.createRefund(
        payment.razorpayPaymentId,
        amountPaise,
        { reason: reason || "Admin initiated cancellation and refund", admin_id: adminId }
      );
      refundsData.push({
        payment,
        rzpRefund,
        amountRefunded: amountToRefund
      });
      remainingRefundAmount -= amountToRefund;
    }
  }

  // 2. Perform DB updates in a transaction
  await prisma.$transaction(async (tx) => {
    // Record refunds
    for (const { payment, rzpRefund, amountRefunded } of refundsData) {
      await tx.refund.create({
        data: {
          paymentId: payment.id,
          amount: amountRefunded,
          status: "SUCCESS",
          reason: reason || "Admin initiated cancellation and refund",
          razorpayRefundId: rzpRefund.id,
          initiatedBy: adminId,
          metadata: { razorpayRefund: rzpRefund },
        }
      });

      const isFullyRefunded = amountRefunded === Number(payment.amount);
      if (isFullyRefunded) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "REFUNDED" }
        });
      }
    }


    // Determine new paymentStatus for booking
    let newPaymentStatus = "CANCELLED";
    if (totalPaid > 0) {
      if (validRefundAmount === totalPaid) {
        newPaymentStatus = "REFUNDED";
      } else if (validRefundAmount > 0) {
        newPaymentStatus = "PARTIALLY_REFUNDED";
      } else {
        newPaymentStatus = booking.paymentStatus;
      }
    }

    // Cancel booking
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        paymentStatus: newPaymentStatus,
        cancelledAt: new Date(),
        cancelledBy: adminId,
        cancellationReason: reason || "Admin initiated cancellation",
      }
    });

    // Free up spots
    if (booking.slotId) {
      await tx.slot.update({
        where: { id: booking.slotId },
        data: {
          filledSpots: Math.max(0, (booking.slot.filledSpots || 0) - booking.numberOfTravelers)
        }
      });
    }
  });

  // Send Email (Fire and forget)
  import("../../core/services/email.service.js").then((emailService) => {
    if (emailService.sendBookingCancelledRefundedEmail) {
      const itemTitle = booking.trip ? booking.trip.title : booking.festival.title;
      emailService.sendBookingCancelledRefundedEmail(booking.user.email, {
        name: booking.user.profile?.fullName || "Traveler",
        tripTitle: itemTitle,
        bookingRef: booking.bookingReference,
        refundAmount: validRefundAmount
      }).catch(err => console.error("Failed to send cancellation email:", err));
    }
  }).catch(err => console.error("Failed to import email service:", err));

  return { success: true, message: `Booking cancelled${validRefundAmount > 0 ? ` and ₹${validRefundAmount} refunded` : ""} successfully.` };
};

export const finalizeBooking = async (bookingId) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { include: { profile: true } },
      slot: { include: { trip: true, festival: true } }
    }
  });

  if (!booking) throw new NotFoundError("Booking not found");
  if (booking.status !== "CONFIRMED") {
    throw new ValidationError("Only CONFIRMED bookings can be finalized.");
  }

  const { sendReviewRequestEmail } = await import("../../core/services/email.service.js");
  const env = (await import("../../core/env/env.js")).default;
  const frontendUrl = env.ORIGIN;

  // 1. Mark as completed
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date()
    }
  });

  // 2. Send Review Email
  const itemTitle = booking.slot.trip ? booking.slot.trip.title : booking.slot.festival?.title;
  if (itemTitle && booking.user?.email) {
    const reviewLink = `${frontendUrl}/bookings/${booking.id}/review`;
    try {
      await sendReviewRequestEmail({
        to: booking.user.email,
        name: booking.user.profile?.fullName || "Traveler",
        tripTitle: itemTitle,
        reviewLink
      });
    } catch (err) {
      console.error("Failed to send review email to", booking.user.email, err);
    }
  }

  return { success: true, message: "Booking finalized successfully." };
};
