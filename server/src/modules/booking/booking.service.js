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
import { getBookingJourney } from "./booking-journey.js";
import * as operationsService from "../operations/operations.service.js";

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

const toDecimal2 = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const getBookableAddOns = (item) =>
  item?.addOns?.length ? item.addOns : item?.circuit?.addOns || [];

const normalizeAddOnSelections = (addOns) => {
  if (!Array.isArray(addOns)) return [];

  const quantitiesById = new Map();
  for (const addOn of addOns) {
    if (!addOn?.addOnId) continue;
    const quantity = Number(addOn.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new ValidationError("Add-on quantity must be a positive whole number.");
    }
    quantitiesById.set(addOn.addOnId, (quantitiesById.get(addOn.addOnId) || 0) + quantity);
  }

  return Array.from(quantitiesById, ([addOnId, quantity]) => ({ addOnId, quantity }));
};

const generateCustomBookingId = async (item, slot, user, prismaClient) => {
  const currentYear = new Date().getFullYear();
  const yearStr = currentYear.toString().slice(2);
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear + 1, 0, 1);
  
  const bookingsThisYear = await prismaClient.booking.count({
    where: {
      createdAt: {
        gte: yearStart,
        lt: yearEnd,
      }
    }
  });
  
  const countStr = (bookingsThisYear + 1).toString().padStart(2, '0');
  
  let location = item.location || "Unknown";
  location = location.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
  
  const duration = item.duration || 1;
  
  const startDate = new Date(slot.startDate);
  const startDay = startDate.getDate().toString().padStart(2, '0');
  const startMonth = (startDate.getMonth() + 1).toString().padStart(2, '0');
  
  const endDate = slot.endDate ? new Date(slot.endDate) : new Date(startDate.getTime() + (duration - 1) * 24 * 60 * 60 * 1000);
  const endDay = endDate.getDate().toString().padStart(2, '0');
  const endMonth = (endDate.getMonth() + 1).toString().padStart(2, '0');
  
  const fStart = `${startDay}${startMonth}`;
  const fEnd = `${endDay}${endMonth}`;
  
  const fullName = user.profile?.fullName || user.fullName || "User";
  const firstName = fullName.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
  
  // Format: H2601-Tawang-6-1605-2005-Satish
  return `H${yearStr}${countStr}-${location}-${duration}-${fStart}-${fEnd}-${firstName}`;
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
      trip: { include: { packages: true, addOns: true, circuit: { include: { addOns: true } } } },
      festival: { include: { packages: true, addOns: true, circuit: { include: { addOns: true } } } },
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
  if (!slot.startDate) {
    throw new ValidationError("The selected slot does not have a start date and cannot be booked yet.");
  }

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
  }
  
  if (!selectedPackage && item.packages && item.packages.length > 0) {
    selectedPackage = item.packages[0];
  }

  if (!selectedPackage) {
    throw new ValidationError("A package must be selected for this booking.");
  }

  const itemPrice = Number(selectedPackage.price);
  const itemToken = Number(selectedPackage.tokenAmount);

  let addOnsTotalCost = 0;
  const bookingAddOnsData = [];
  const bookableAddOns = getBookableAddOns(item);

  for (const addonReq of normalizeAddOnSelections(data.addOns)) {
      const addOnModel = bookableAddOns.find((addOn) => addOn.id === addonReq.addOnId);
      if (!addOnModel || !addOnModel.isActive) {
        throw new ValidationError("One or more selected add-ons are not available for this trip.");
      }

      const qty = addonReq.quantity;
      if (addOnModel.maxQuantityPerBooking && qty > addOnModel.maxQuantityPerBooking) {
        throw new ValidationError(`${addOnModel.title} is limited to ${addOnModel.maxQuantityPerBooking} per booking.`);
      }
      
      if (addOnModel.maxQuantityPerSlot && slot) {
        const bookedAddOns = await prisma.bookingAddOn.aggregate({
          _sum: { quantity: true },
          where: {
            addOnId: addOnModel.id,
            status: { notIn: ["CANCELLED", "REFUNDED"] },
            booking: {
              slotId: slot.id,
              status: { not: "CANCELLED" }
            }
          }
        });
        
        const alreadyBooked = bookedAddOns._sum.quantity || 0;
        if (alreadyBooked + qty > addOnModel.maxQuantityPerSlot) {
          throw new ValidationError(`${addOnModel.title} only has ${Math.max(0, addOnModel.maxQuantityPerSlot - alreadyBooked)} spots left for this departure.`);
        }
      }
      if (addOnModel.purchaseCutoffOffsetDays != null && slot.startDate) {
        const cutoff = new Date(slot.startDate).getTime() - addOnModel.purchaseCutoffOffsetDays * 86400000;
        if (Date.now() > cutoff) {
          throw new ValidationError(`${addOnModel.title} is no longer available for this departure.`);
        }
      }
      const price = Number(addOnModel.price);
      const totalAddOnPrice = price * qty;
      addOnsTotalCost += totalAddOnPrice;

      bookingAddOnsData.push({
        addOnId: addOnModel.id,
        quantity: qty,
        unitPrice: price,
        totalPrice: totalAddOnPrice,
        status: "PENDING",
      });
  }

  const baseTotalAmount = (itemPrice * numberOfTravelers) + addOnsTotalCost;
  const totalAmount = toDecimal2(baseTotalAmount + (baseTotalAmount * 0.05));

  const baseTokenAmount = itemToken * numberOfTravelers;
  const tokenAmount = toDecimal2(baseTokenAmount + (baseTokenAmount * 0.05));

  let initialPaymentType = data.initialPaymentType || "TOKEN";
  if (tokenAmount === 0) {
    initialPaymentType = "FULL";
  }
  const amountDue =
    initialPaymentType === "FULL" ? 0 : toDecimal2(totalAmount - tokenAmount);

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
        email: t.email || null,
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
  const customBookingId = await generateCustomBookingId(item, slot, user, prisma);
  bookingData.id = customBookingId;
  bookingData.bookingReference = customBookingId;
  bookingData.userId = userId;
  bookingData.slotId = data.slotId;
  if (isTrip) {
    bookingData.tripId = slot.tripId;
  } else {
    bookingData.festivalId = slot.festivalId;
  }
  if (selectedPackage) bookingData.packageId = selectedPackage.id;
  bookingData.status = "PENDING";
  bookingData.paymentStatus = "PENDING";

  if (travelersCreateData.length > 0) {
    bookingData.travelers = { create: travelersCreateData };
  }

  if (bookingAddOnsData.length > 0) {
    bookingData.addOns = { create: bookingAddOnsData };
  }

  const booking = await repo.createBooking(bookingData);

  // Auto-generate OperationalTasks from the circuit template (fire-and-forget in background)
  operationsService.generateBookingOperations(booking, slot, data.addOns || []).catch(
    (err) => console.error("[OpsGen] Failed to generate operations for booking", booking.id, err)
  );

  return booking;
};

export const adminCreateBooking = async (adminId, data) => {
  if (!data.email) {
    throw new ValidationError("Email is required for admin booking creation.");
  }
  
  const email = data.email.toLowerCase().trim();
  let user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (user) {
    const profileUpdate = {};
    if (data.fullName) profileUpdate.fullName = data.fullName;
    if (data.phone) profileUpdate.phone = data.phone;
    if (data.gender) profileUpdate.gender = data.gender.toUpperCase();
    if (data.dateOfBirth) profileUpdate.dateOfBirth = new Date(data.dateOfBirth);
    if (data.govtIdAssetId) profileUpdate.govtIdAssetId = data.govtIdAssetId;
    
    if (Object.keys(profileUpdate).length > 0) {
      if (user.profile) {
        await prisma.userProfile.update({
          where: { id: user.profile.id },
          data: profileUpdate,
        });
      } else {
        await prisma.userProfile.create({
          data: { ...profileUpdate, userId: user.id }
        });
      }
    }
  } else {
    user = await prisma.user.create({
      data: {
        email,
        googleId: `admin_created_${crypto.randomUUID()}`,
        role: "USER",
        profile: {
          create: {
            fullName: data.fullName || null,
            phone: data.phone || null,
            gender: data.gender ? data.gender.toUpperCase() : null,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
            govtIdAssetId: data.govtIdAssetId || null,
          }
        }
      },
      include: { profile: true }
    });
  }

  if (!data.slotId) {
    throw new ValidationError("Must provide a slotId to book.");
  }

  const slot = await prisma.slot.findUnique({ 
    where: { id: data.slotId },
    include: {
      trip: { include: { packages: true, addOns: true, circuit: { include: { addOns: true } } } },
      festival: { include: { packages: true, addOns: true, circuit: { include: { addOns: true } } } },
    }
  });
  if (!slot) {
    throw new NotFoundError("Booking slot not found");
  }

  const isTrip = !!slot.tripId;
  const item = isTrip ? slot.trip : slot.festival;
  if (!item) throw new NotFoundError("Booking item not found");
  if (!item.isActive) throw new ValidationError("This item is no longer available.");

  const numberOfTravelers = data.numberOfTravelers || 1;
  const spotsLeft = slot.capacity - slot.filledSpots;
  if (numberOfTravelers > spotsLeft) {
    throw new ValidationError(`Only ${spotsLeft} spot(s) remaining.`);
  }

  let selectedPackage = null;
  if (data.packageId) {
    selectedPackage = item.packages?.find(p => p.id === data.packageId);
  }
  if (!selectedPackage && item.packages && item.packages.length > 0) {
    selectedPackage = item.packages[0];
  }
  if (!selectedPackage) {
    throw new ValidationError("A package must be selected.");
  }

  const itemPrice = Number(selectedPackage.price);
  const itemToken = Number(selectedPackage.tokenAmount);

  let addOnsTotalCost = 0;
  const bookingAddOnsData = [];
  const bookableAddOns = getBookableAddOns(item);

  for (const addonReq of normalizeAddOnSelections(data.addOns)) {
      const addOnModel = bookableAddOns.find((addOn) => addOn.id === addonReq.addOnId);
      if (!addOnModel || !addOnModel.isActive) {
        throw new ValidationError("One or more selected add-ons are not available.");
      }
      const qty = addonReq.quantity;
      if (addOnModel.maxQuantityPerBooking && qty > addOnModel.maxQuantityPerBooking) {
        throw new ValidationError(`${addOnModel.title} is limited to ${addOnModel.maxQuantityPerBooking} per booking.`);
      }
      if (addOnModel.maxQuantityPerSlot) {
        const bookedAddOns = await prisma.bookingAddOn.aggregate({
          _sum: { quantity: true },
          where: {
            addOnId: addOnModel.id,
            status: { notIn: ["CANCELLED", "REFUNDED"] },
            booking: { slotId: slot.id, status: { not: "CANCELLED" } },
          },
        });
        const alreadyBooked = bookedAddOns._sum.quantity || 0;
        if (alreadyBooked + qty > addOnModel.maxQuantityPerSlot) {
          throw new ValidationError(`${addOnModel.title} only has ${Math.max(0, addOnModel.maxQuantityPerSlot - alreadyBooked)} spots left for this departure.`);
        }
      }
      if (addOnModel.purchaseCutoffOffsetDays != null && slot.startDate) {
        const cutoff = new Date(slot.startDate).getTime() - addOnModel.purchaseCutoffOffsetDays * 86400000;
        if (Date.now() > cutoff) {
          throw new ValidationError(`${addOnModel.title} is no longer available for this departure.`);
        }
      }
      const price = Number(addOnModel.price);
      const totalAddOnPrice = price * qty;
      addOnsTotalCost += totalAddOnPrice;
      bookingAddOnsData.push({
        addOnId: addOnModel.id,
        quantity: qty,
        unitPrice: price,
        totalPrice: totalAddOnPrice,
        status: data.paymentAction === "MARK_PAID" ? "PAID" : "PENDING",
      });
  }

  const baseTotalAmount = (itemPrice * numberOfTravelers) + addOnsTotalCost;
  const totalAmount = toDecimal2(baseTotalAmount + (baseTotalAmount * 0.05));

  const baseTokenAmount = itemToken * numberOfTravelers;
  const tokenAmount = toDecimal2(baseTokenAmount + (baseTokenAmount * 0.05));

  let initialPaymentType = data.initialPaymentType || "TOKEN";
  if (tokenAmount === 0) initialPaymentType = "FULL";
  const amountDue = initialPaymentType === "FULL" ? 0 : toDecimal2(totalAmount - tokenAmount);

  const balanceDueDate = new Date(slot.startDate);
  balanceDueDate.setDate(balanceDueDate.getDate() - 10);

  let status = "PENDING";
  let paymentStatus = "PENDING";
  let amountPaid = 0;
  let amountToPay = initialPaymentType === "FULL" ? totalAmount : tokenAmount;

  if (data.paymentAction === "MARK_PAID") {
    amountPaid = amountToPay;
    paymentStatus = initialPaymentType === "FULL" ? "PAID" : "PARTIALLY_PAID";
    status = "CONFIRMED";
  }

  const customBookingId = await generateCustomBookingId(item, slot, user, prisma);

  const bookingData = {
    id: customBookingId,
    bookingReference: customBookingId,
    userId: user.id,
    slotId: data.slotId,
    numberOfTravelers,
    initialPaymentType,
    totalAmount,
    tokenAmount,
    amountDue,
    amountPaid,
    balanceDueDate,
    specialRequests: data.specialRequests || null,
    status,
    paymentStatus,
    source: "CATALOG",
  };

  if (isTrip) bookingData.tripId = slot.tripId;
  else bookingData.festivalId = slot.festivalId;
  if (selectedPackage) bookingData.packageId = selectedPackage.id;

  if (bookingAddOnsData.length > 0) {
    bookingData.addOns = { create: bookingAddOnsData };
  }

  const travelersCreateData = (data.additionalTravelers && Array.isArray(data.additionalTravelers) && data.additionalTravelers.length > 0)
    ? await Promise.all(data.additionalTravelers.map(async (t) => {
        if (t.aadhaarAssetId) {
          const asset = await prisma.mediaAsset.findFirst({
            where: {
              id: t.aadhaarAssetId,
              deliveryType: "AUTHENTICATED",
              travelerGovtId: null,
            },
          });
          if (!asset) throw new ValidationError("Invalid traveler government ID upload.");
        }
        return {
          fullName: t.fullName,
          email: t.email || null,
          gender: t.gender,
          dateOfBirth: t.dateOfBirth ? new Date(t.dateOfBirth) : null,
          phone: t.phone,
          aadhaar: t.aadhaarAssetId ? null : (t.aadhaar || null),
          aadhaarAssetId: t.aadhaarAssetId || null,
        };
      }))
    : [];

  if (travelersCreateData.length > 0) {
    bookingData.travelers = { create: travelersCreateData };
  }

  const booking = await prisma.$transaction(async (tx) => {
    const newBooking = await tx.booking.create({ data: bookingData, include: { user: { include: { profile: true } }, package: true, trip: true, festival: true, slot: true } });

    await tx.slot.update({
      where: { id: slot.id },
      data: { filledSpots: { increment: numberOfTravelers } },
    });

    if (data.paymentAction === "MARK_PAID") {
      const payment = await tx.payment.create({
        data: {
          bookingId: newBooking.id,
          type: initialPaymentType,
          status: "SUCCESS",
          amount: amountPaid,
          currency: "INR",
          razorpayOrderId: `OFFLINE_${crypto.randomUUID()}`,
          idempotencyKey: `ADMIN_${newBooking.id}_${crypto.randomUUID()}`,
          paidAt: new Date(),
          paymentMethod: "OFFLINE",
          notes: { adminId },
        },
      });

      await tx.ledgerEntry.create({
        data: {
          type: "INCOME",
          scope: isTrip ? "TRIP" : "FESTIVAL",
          tripId: isTrip ? slot.tripId : null,
          festivalId: isTrip ? null : slot.festivalId,
          bookingId: newBooking.id,
          paymentId: payment.id,
          source: "MANUAL",
          category: initialPaymentType === "FULL" ? "Full Payment" : "Token Payment",
          amount: amountPaid,
          description: "Payment collected offline/manually by admin",
          isAutoGenerated: true,
          createdById: adminId,
        },
      });
    }

    return newBooking;
  });

  operationsService.generateBookingOperations(booking, slot, data.addOns || []).catch(
    (err) => console.error("[OpsGen] Failed to generate operations for admin booking", booking.id, err)
  );

  if (data.paymentAction === "MARK_PAID") {
    import("../../core/services/email.service.js").then(({ sendBookingConfirmedEmail }) => {
      sendBookingConfirmedEmail({
        to: email,
        name: data.fullName || email.split("@")[0],
        bookingRef: booking.bookingReference,
        tripTitle: item.title,
        tripStartDate: slot.startDate,
        tripEndDate: slot.endDate,
        packageName: selectedPackage?.title,
        travelersCount: numberOfTravelers,
        amountPaid: amountPaid,
        balanceAmount: booking.amountDue,
        totalAmount: booking.totalAmount,
        dueDate: booking.balanceDueDate,
      }).catch(err => console.error("Failed to send booking confirmed email", err));
    });
  } else if (data.paymentAction === "SEND_LINK") {
    import("../payment/payment.service.js").then(({ initiatePayment }) => {
      initiatePayment(user.id, booking.id, initialPaymentType).then(() => {
        import("../../core/services/email.service.js").then(({ sendPaymentReminderEmail }) => {
           import("../../core/env/env.js").then((envModule) => {
             const env = envModule.default;
             const paymentLink = `${env.ORIGIN}/bookings/${booking.id}/pay-balance`;
             sendPaymentReminderEmail({
               to: email,
               name: data.fullName || email.split("@")[0],
               bookingRef: booking.bookingReference,
               tripTitle: item.title,
               tripStartDate: slot.startDate,
               tripEndDate: slot.endDate,
               packageName: selectedPackage?.title,
               travelersCount: numberOfTravelers,
               amountPaid: 0,
               balanceAmount: amountToPay,
               totalAmount: booking.totalAmount,
               dueDate: booking.balanceDueDate,
               paymentLink,
             }).catch(err => console.error("Failed to send payment link email", err));
           });
        });
      }).catch(err => console.error("Failed to initiate payment for admin booking", err));
    });
  }

  return booking;
};

export const cancelBooking = async (bookingId, userId, reason) => {
  const booking = await repo.getBookingById(bookingId);
  if (!booking) throw new NotFoundError("Booking not found");
  if (booking.userId !== userId)
    throw new ForbiddenError("You can only cancel your own bookings.");

  const cancellableStatuses = ["PENDING", "RESERVED", "CONFIRMED"];
  if (!cancellableStatuses.includes(booking.status)) {
    throw new ValidationError(
      `Booking cannot be cancelled in its current status: ${booking.status}.`,
    );
  }

  const cancelledBooking = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason: reason || null,
      },
      include: {
        slot: { include: { trip: true, festival: true } },
        package: true,
        addOns: { include: { addOn: true } },
        travelers: { include: { aadhaarAsset: true } },
        payments: { include: { refunds: true } },
        user: { include: { profile: { include: { govtIdAsset: true } } } },
      }
    });

    if (booking.slotId && (booking.status === "RESERVED" || booking.status === "CONFIRMED")) {
      await tx.slot.update({
        where: { id: booking.slotId },
        data: {
          filledSpots: Math.max(0, (booking.slot.filledSpots || 0) - booking.numberOfTravelers),
        },
      });
    }
    
    return updated;
  });

  import("../../core/services/email.service.js")
    .then(({ sendBookingCancelledRefundedEmail }) => {
      const journey = getBookingJourney(booking);
      return sendBookingCancelledRefundedEmail(booking.user?.email, {
        name: booking.user?.profile?.fullName || "Traveler",
        bookingRef: booking.bookingReference,
        tripTitle: journey.title,
        packageName: booking.package?.title,
        tripStartDate: journey.startDate,
        tripEndDate: journey.endDate,
        travelersCount: booking.numberOfTravelers,
        refundAmount: 0,
        reason: reason || "Cancelled by traveler",
        cancelledAt: cancelledBooking.cancelledAt,
      });
    })
    .catch((error) => console.error("[Email] Failed to send cancellation email:", error));

  return cancelledBooking;
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
      package: true,
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
  const offlineRefundsData = [];
  let remainingRefundAmount = validRefundAmount;

  for (const payment of booking.payments) {
    if (remainingRefundAmount <= 0) break;

    const maxRefundForPayment = Number(payment.amount);
    const amountToRefund = Math.min(remainingRefundAmount, maxRefundForPayment);
    if (amountToRefund <= 0) continue;

    if (payment.razorpayPaymentId) {
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
    } else {
      offlineRefundsData.push({
        payment,
        amountRefunded: amountToRefund
      });
    }
    remainingRefundAmount -= amountToRefund;
  }

  // 2. Perform DB updates in a transaction
  await prisma.$transaction(async (tx) => {
    // Record Razorpay refunds
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

      await tx.ledgerEntry.create({
        data: {
          type: "EXPENSE",
          scope: booking.tripId ? "TRIP" : booking.festivalId ? "FESTIVAL" : "BOOKING",
          tripId: booking.tripId,
          festivalId: booking.festivalId,
          bookingId: booking.id,
          paymentId: payment.id,
          source: "REFUND",
          category: "Customer Refund",
          amount: amountRefunded,
          description: reason || `Refund for ${booking.bookingReference}`,
          isAutoGenerated: true,
        },
      });

      const isFullyRefunded = amountRefunded === Number(payment.amount);
      if (isFullyRefunded) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "REFUNDED" }
        });
      }
    }

    // Record Offline refunds
    for (const { payment, amountRefunded } of offlineRefundsData) {
      await tx.refund.create({
        data: {
          paymentId: payment.id,
          amount: amountRefunded,
          status: "SUCCESS",
          reason: reason || "Admin initiated cancellation and refund (Offline)",
          initiatedBy: adminId,
        }
      });

      await tx.ledgerEntry.create({
        data: {
          type: "EXPENSE",
          scope: booking.tripId ? "TRIP" : booking.festivalId ? "FESTIVAL" : "BOOKING",
          tripId: booking.tripId,
          festivalId: booking.festivalId,
          bookingId: booking.id,
          paymentId: payment.id,
          source: "REFUND",
          category: "Customer Refund",
          amount: amountRefunded,
          description: reason || `Refund for ${booking.bookingReference} (Offline)`,
          isAutoGenerated: true,
        },
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
    let newPaymentStatus = booking.paymentStatus;
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

    // Cancel / Refund Add-ons
    await tx.bookingAddOn.updateMany({
      where: { bookingId: booking.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    
    await tx.bookingAddOn.updateMany({
      where: { bookingId: booking.id, status: "PAID" },
      data: { status: newPaymentStatus === "REFUNDED" || newPaymentStatus === "PARTIALLY_REFUNDED" ? "REFUNDED" : "CANCELLED" },
    });
  });

  // Send Email (Fire and forget)
  import("../../core/services/email.service.js").then((emailService) => {
    if (emailService.sendBookingCancelledRefundedEmail) {
      const journey = getBookingJourney(booking);
      emailService.sendBookingCancelledRefundedEmail(booking.user.email, {
        name: booking.user.profile?.fullName || "Traveler",
        tripTitle: journey.title,
        bookingRef: booking.bookingReference,
        refundAmount: validRefundAmount,
        totalPaid,
        remainingPaidAmount: Math.max(0, totalPaid - validRefundAmount),
        isFullRefund: validRefundAmount > 0 && validRefundAmount === totalPaid,
        refundType: validRefundAmount === totalPaid && validRefundAmount > 0 ? "FULL" : validRefundAmount > 0 ? "PARTIAL" : "NONE",
        reason: reason || "Admin initiated cancellation",
        refundReference: refundsData.map(({ rzpRefund }) => rzpRefund.id).filter(Boolean).join(", "),
        cancelledAt: new Date(),
        tripStartDate: journey.startDate,
        tripEndDate: journey.endDate,
        packageName: booking.package?.title,
        travelersCount: booking.numberOfTravelers,
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
      slot: { include: { trip: true, festival: true } },
      package: true,
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
      completedAt: new Date(),
      reviewRequestedAt: new Date(),
    }
  });

  // 2. Send Review Email
  const journey = getBookingJourney(booking);
  const itemTitle = journey.title;
  if (itemTitle && booking.user?.email) {
    const reviewLink = `${frontendUrl}/bookings/${booking.id}/review`;
    try {
      await sendReviewRequestEmail({
        to: booking.user.email,
        name: booking.user.profile?.fullName || "Traveler",
        tripTitle: itemTitle,
        bookingRef: booking.bookingReference,
        itemLocation: journey.location,
        packageName: booking.package?.title,
        tripStartDate: journey.startDate,
        tripEndDate: journey.endDate,
        reviewLink,
      });
    } catch (err) {
      console.error("Failed to send review email to", booking.user.email, err);
    }
  }

  return { success: true, message: "Booking finalized successfully." };
};
