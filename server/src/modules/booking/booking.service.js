import * as repo from "./booking.repository.js";
import { prisma } from "../../prisma/client.js";
import {
  AppError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../core/errors/errors.js";
import crypto from "crypto";
import { uploadSensitiveDocument, createAuthenticatedDeliveryUrl, deleteMediaAsset } from "../../core/services/upload.service.js";

const withSecureDocumentUrls = (booking) => {
  if (!booking) return booking;
  const profile = booking.user?.profile;
  const safeProfile = profile && {
    ...profile,
    govtIdImageUrl: profile.govtIdAsset
      ? createAuthenticatedDeliveryUrl(profile.govtIdAsset)
      : profile.govtIdImageUrl || null,
    govtIdMimeType: profile.govtIdAsset
      ? (profile.govtIdAsset.resourceType === "RAW" ? "application/pdf" : `image/${profile.govtIdAsset.format || "webp"}`)
      : null,
  };
  return {
    ...booking,
    ...(booking.user && { user: { ...booking.user, profile: safeProfile } }),
    travelers: booking.travelers?.map((traveler) => ({
      ...traveler,
      aadhaar: traveler.aadhaarAsset
        ? createAuthenticatedDeliveryUrl(traveler.aadhaarAsset)
        : traveler.aadhaar || null,
      aadhaarMimeType: traveler.aadhaarAsset
        ? (traveler.aadhaarAsset.resourceType === "RAW" ? "application/pdf" : `image/${traveler.aadhaarAsset.format || "webp"}`)
        : null,
    })),
  };
};

export const uploadTravelerGovtId = async (userId, file) => {
  const folder = `uploads/travelers/${userId}/govtid`;
  const uploaded = await uploadSensitiveDocument(file, { folder, publicId: crypto.randomUUID() });
  return prisma.mediaAsset.create({
    data: {
      publicId: uploaded.public_id,
      resourceType: uploaded.resource_type.toUpperCase(),
      deliveryType: "AUTHENTICATED",
      format: uploaded.format || null,
      version: uploaded.version ? String(uploaded.version) : null,
      bytes: uploaded.bytes || null,
      width: uploaded.width || null,
      height: uploaded.height || null,
      folder,
      uploadedById: userId,
    },
  });
};

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
    user.profile.govtIdNumber || user.profile.govtIdImageUrl || user.profile.govtIdAssetId;

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

  // Check if user already has an active booking for this item
  const existingActive = await prisma.booking.findFirst({
    where: {
      userId,
      slotId: data.slotId,
      status: { in: ["RESERVED", "CONFIRMED", "COMPLETED"] },
    },
  });
  if (existingActive) {
    throw new ValidationError("You have already booked this item.");
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
    ? await Promise.all(data.additionalTravelers.map(async (t) => {
        if (t.aadhaarAssetId) {
          const asset = await prisma.mediaAsset.findFirst({
            where: {
              id: t.aadhaarAssetId,
              uploadedById: userId,
              deliveryType: "AUTHENTICATED",
              travelerGovtId: null,
            },
          });
          if (!asset) throw new ValidationError("Invalid traveler government ID upload.");
        }
        return {
        fullName: t.fullName,
        gender: t.gender,
        dateOfBirth: t.dateOfBirth ? new Date(t.dateOfBirth) : null,
        phone: t.phone,
        aadhaar: t.aadhaarAssetId ? null : t.aadhaar || null,
        aadhaarAssetId: t.aadhaarAssetId || null,
      };
      }))
    : [];

  // Check if there is an existing PENDING booking to reuse
  const existingPending = await prisma.booking.findFirst({
    where: {
      userId,
      slotId: data.slotId,
      status: "PENDING",
    },
    include: { travelers: { select: { aadhaarAssetId: true } } },
  });

  if (existingPending) {
    const replacedAssetIds = existingPending.travelers?.map((traveler) => traveler.aadhaarAssetId).filter(Boolean) || [];
    bookingData.travelers = {
      deleteMany: {}, // Clear any previous travelers if updating an existing pending booking
      ...(travelersCreateData.length > 0 && { create: travelersCreateData })
    };
    const booking = await repo.updateBooking(existingPending.id, bookingData);
    if (replacedAssetIds.length > 0) {
      const replacedAssets = await prisma.mediaAsset.findMany({ where: { id: { in: replacedAssetIds } } });
      await Promise.allSettled(replacedAssets.flatMap((asset) => [
        deleteMediaAsset(asset),
        prisma.mediaAsset.delete({ where: { id: asset.id } }),
      ]));
    }
    return booking;
  }

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
  
  return withSecureDocumentUrls({
    ...booking,
    trip: booking.slot?.trip || null,
    festival: booking.slot?.festival || null,
  });
};

export const getUserBookings = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit, 10);
  const { bookings, total } = await repo.getUserBookings(userId, skip, take);
  const mappedBookings = bookings.map(b => withSecureDocumentUrls({
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
  const mappedBookings = bookings.map(b => withSecureDocumentUrls({
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
  return bookings.map(b => withSecureDocumentUrls({ ...b, trip: b.slot?.trip || null, festival: b.slot?.festival || null }));
};

export const getBookingsByFestivalId = async (festivalId) => {
  const bookings = await repo.getBookingsByFestivalId(festivalId);
  return bookings.map(b => withSecureDocumentUrls({ ...b, trip: b.slot?.trip || null, festival: b.slot?.festival || null }));
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
