import crypto from "crypto";
import { prisma } from "../../prisma/client.js";
import env from "../../core/env/env.js";
import { NotFoundError, ValidationError } from "../../core/errors/errors.js";
import { generateCrmBookingOperations } from "../operations/operations.service.js";
import { reserveBookingSlotCapacity } from "../booking/slot-capacity.service.js";

const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const paymentPageUrl = (bookingId) => `${env.ORIGIN.replace(/\/$/, "")}/bookings/${bookingId}/pay-balance`;
const getReference = async () => {
  try {
    const rows = await prisma.$queryRaw`SELECT nextval('"BookingReferenceSequence"') AS "sequence"`;
    return `H${String(Number(rows[0].sequence)).padStart(4, "0")}`;
  } catch (error) {
    if (error?.code !== "P2010") throw error;
    return `H${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  }
};
const paymentTypeFor = (amount, dueBefore) => amount === dueBefore ? "FULL" : "TOKEN";
const profileFields = (data) => ({
  fullName: data.fullName?.trim() || null,
  phone: data.phone?.trim() || null,
  gender: ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"].includes(data.gender) ? data.gender : undefined,
  dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
  govtIdAssetId: data.govtIdAssetId || undefined,
  govtIdType: data.govtIdAssetId ? "AADHAAR" : undefined,
});

const ensureUser = async (data) => {
  const email = data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
  if (existing) {
    await prisma.userProfile.upsert({
      where: { userId: existing.id },
      update: profileFields(data),
      create: { userId: existing.id, ...profileFields(data) },
    });
    return existing;
  }
  return prisma.user.create({
    data: {
      email,
      googleId: `crm_${crypto.randomUUID()}`,
      profile: { create: profileFields(data) },
    },
  });
};

const travelerData = (travelers = []) => travelers
  .filter((traveler) => traveler?.fullName?.trim())
  .map((traveler) => ({
    fullName: traveler.fullName.trim(),
    email: traveler.email?.trim() || null,
    phone: traveler.phone?.trim() || null,
    gender: traveler.gender || null,
    dateOfBirth: traveler.dateOfBirth ? new Date(traveler.dateOfBirth) : null,
    aadhaar: traveler.aadhaar?.trim() || null,
    aadhaarAssetId: traveler.aadhaarAssetId || null,
  }));

const getFestivalWithPricing = async (crmFestivalId) => {
  const festival = await prisma.crmFestival.findUnique({ where: { id: crmFestivalId } });
  if (!festival) throw new NotFoundError("CRM festival not found");
  if (!festival.isActive) throw new ValidationError("This CRM festival is not accepting bookings");
  if (festival.totalAmount == null || festival.tokenAmount == null) {
    throw new ValidationError("Set the CRM festival total and token amounts before creating bookings");
  }
  return festival;
};

const emailReceipt = async ({ booking, payment, festival }) => {
  const { sendBookingConfirmedEmail } = await import("../../core/services/email.service.js");
  const total = Number(booking.totalAmount);
  const amountDue = Number(booking.amountDue);
  await sendBookingConfirmedEmail({
    to: booking.user.email,
    name: booking.user.profile?.fullName || "Traveler",
    bookingRef: booking.bookingReference,
    bookingId: booking.id,
    tripTitle: festival.name,
    totalAmount: total,
    transactionAmount: Number(payment.amount),
    cumulativeAmountPaid: Number(booking.amountPaid),
    previousAmountPaid: round(Number(booking.amountPaid) - Number(payment.amount)),
    amountDue,
    paymentType: payment.type,
    paymentMethod: payment.paymentMethod,
    paymentId: payment.razorpayPaymentId || payment.razorpayOrderId,
    invoicePaymentId: payment.id,
    receiptNumber: payment.receiptNumber || payment.receiptNumberInt,
    paidAt: payment.paidAt,
    travelersCount: booking.numberOfTravelers,
    itemLocation: festival.destinationId,
  });
};

const emailPaymentRequest = async ({ booking, festival, payment, paymentLink }) => {
  const { sendPaymentReminderEmail } = await import("../../core/services/email.service.js");
  await sendPaymentReminderEmail({
    to: booking.user.email,
    name: booking.user.profile?.fullName || "Traveler",
    bookingRef: booking.bookingReference,
    tripTitle: festival.name,
    totalAmount: booking.totalAmount,
    amountPaid: booking.amountPaid,
    balanceAmount: booking.amountDue,
    paymentRequestAmount: payment.amount,
    isInstallmentRequest: true,
    isWebsitePaymentLink: true,
    paymentLink,
    travelersCount: booking.numberOfTravelers,
    itemLocation: festival.destinationId,
  });
};

const createInstallment = async ({ booking, festival, data, adminId, isInitial = false }) => {
  const amount = round(data.paymentAmount);
  const dueBefore = Number(booking.amountDue);
  if (!Number.isFinite(amount) || amount <= 0 || amount > dueBefore) {
    throw new ValidationError(`Installment amount must be between ₹0.01 and ₹${dueBefore.toFixed(2)}`);
  }
  if (!["MANUAL", "SEND_LINK"].includes(data.paymentAction)) {
    throw new ValidationError("Choose manual collection or send the website payment link");
  }
  if (!isInitial && data.paymentAction === "SEND_LINK" && amount !== dueBefore) {
    throw new ValidationError(`The website payment page collects the full outstanding balance of ₹${dueBefore.toFixed(2)}. Use manual collection for a partial installment.`);
  }

  const type = isInitial ? paymentTypeFor(amount, dueBefore) : "BALANCE";
  if (data.paymentAction === "MANUAL") {
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          type,
          status: "SUCCESS",
          amount,
          razorpayOrderId: `CRM_MANUAL_${crypto.randomUUID()}`,
          idempotencyKey: `crm_manual_${crypto.randomUUID()}`,
          paymentMethod: "OFFLINE",
          paidAt: new Date(),
          notes: { adminId, crm: true },
        },
      });
      const newPaid = round(Number(booking.amountPaid) + amount);
      const newDue = round(Math.max(0, Number(booking.totalAmount) - newPaid));
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          amountPaid: newPaid,
          amountDue: newDue,
          paymentStatus: newDue === 0 ? "PAID" : "PARTIALLY_PAID",
          status: newDue === 0 ? "CONFIRMED" : "RESERVED",
          confirmedAt: newDue === 0 ? new Date() : undefined,
        },
        include: { user: { include: { profile: true } } },
      });
      if (isInitial && booking.status === "PENDING") {
        await reserveBookingSlotCapacity(tx, booking);
      }
      await tx.ledgerEntry.create({
        data: {
          type: "INCOME", scope: "BOOKING", bookingId: booking.id, paymentId: payment.id,
          source: "BOOKING_PAYMENT", category: "CRM installment", amount,
          description: `CRM ${type.toLowerCase()} payment received`, isAutoGenerated: true, createdById: adminId,
        },
      });
      return { booking: updatedBooking, payment };
    });
    await emailReceipt({ ...result, festival }).catch(console.error);
    return { ...result, paymentLink: null };
  }

  const paymentLink = paymentPageUrl(booking.id);
  await emailPaymentRequest({ booking, festival, payment: { amount }, paymentLink }).catch(console.error);
  return { booking, payment: null, paymentLink };
};

export const createCrmFestivalBooking = async (crmFestivalId, data, adminId) => {
  if (!data.email?.trim() || !data.fullName?.trim()) throw new ValidationError("Customer name and email are required");
  if (!data.phone?.trim() || !data.gender || !data.dateOfBirth || !data.govtIdAssetId) {
    throw new ValidationError("Lead traveler phone, gender, date of birth, and Aadhaar card are required");
  }
  if (!data.crmFestivalSlotId) throw new ValidationError("Choose a departure slot for this booking");
  const festival = await getFestivalWithPricing(crmFestivalId);
  const initialPaymentAmount = round(data.paymentAmount);
  if (!Number.isFinite(initialPaymentAmount) || initialPaymentAmount <= 0 || initialPaymentAmount > Number(festival.totalAmount)) {
    throw new ValidationError(`Initial payment must be between ₹0.01 and ₹${Number(festival.totalAmount).toFixed(2)}`);
  }
  if (!["MANUAL", "SEND_LINK"].includes(data.paymentAction)) {
    throw new ValidationError("Choose manual collection or send the website payment link");
  }
  const initialPaymentType = paymentTypeFor(initialPaymentAmount, Number(festival.totalAmount));
  const crmFestivalSlot = await prisma.crmFestivalSlot.findFirst({
    where: { id: data.crmFestivalSlotId, crmFestivalId, startDate: { not: null }, endDate: { not: null } },
  });
  if (!crmFestivalSlot) throw new ValidationError("Choose a valid dated departure slot for this CRM festival");
  const travelers = Number(data.numberOfTravelers) || 1;
  const additionalTravelers = travelerData(data.additionalTravelers);
  if (additionalTravelers.length !== travelers - 1) {
    throw new ValidationError("Enter details for every additional traveler");
  }
  if (additionalTravelers.some((traveler) => !traveler.email || !traveler.phone || !traveler.gender || !traveler.dateOfBirth || (!traveler.aadhaar && !traveler.aadhaarAssetId))) {
    throw new ValidationError("Each additional traveler needs email, phone, gender, date of birth, and Aadhaar card");
  }
  if (crmFestivalSlot.filledSpots + travelers > crmFestivalSlot.capacity) {
    throw new ValidationError("This departure does not have enough remaining capacity");
  }
  const user = await ensureUser(data);
  const bookingReference = await getReference();
  const booking = await prisma.$transaction(async (tx) => {
    const currentSlot = await tx.crmFestivalSlot.findUnique({ where: { id: crmFestivalSlot.id } });
    if (!currentSlot || currentSlot.filledSpots + travelers > currentSlot.capacity) {
      throw new ValidationError("This departure no longer has enough remaining capacity");
    }
    const created = await tx.booking.create({
      data: {
        id: bookingReference, bookingReference, userId: user.id, crmFestivalId, crmFestivalSlotId: crmFestivalSlot.id, source: "CRM",
        numberOfTravelers: travelers,
        totalAmount: festival.totalAmount, tokenAmount: initialPaymentType === "FULL" ? festival.totalAmount : initialPaymentAmount, amountPaid: 0, amountDue: festival.totalAmount,
        initialPaymentType, status: "PENDING", paymentStatus: "PENDING",
        specialRequests: data.specialRequests?.trim() || null,
        travelers: { create: additionalTravelers },
      },
      include: { user: { include: { profile: true } } },
    });
    return created;
  });
  await generateCrmBookingOperations(booking, crmFestivalSlot);
  return createInstallment({ booking, festival, data, adminId, isInitial: true });
};

export const createPublicCrmFestivalBooking = async (crmFestivalId, data, userId) => {
  if (!data.crmFestivalSlotId) throw new ValidationError("Choose a departure slot for this booking");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  const profile = user?.profile;
  if (!user || !profile?.fullName || !profile.phone || !profile.gender || !profile.dateOfBirth || (!profile.govtIdAssetId && !profile.govtIdImageUrl)) {
    throw new ValidationError("Complete your traveler profile and upload an Aadhaar card before booking");
  }

  const festival = await prisma.crmFestival.findFirst({
    where: { id: crmFestivalId, isActive: true, isPublished: true, isListed: true },
    include: { packages: true, addOns: true },
  });
  if (!festival) throw new NotFoundError("CRM festival not found or not available for booking");

  const travelers = Number(data.numberOfTravelers) || 1;
  if (!Number.isInteger(travelers) || travelers < 1) {
    throw new ValidationError("Traveler count must be a positive whole number");
  }

  const crmFestivalSlot = await prisma.crmFestivalSlot.findFirst({
    where: {
      id: data.crmFestivalSlotId,
      crmFestivalId,
      startDate: { not: null },
      endDate: { not: null },
    },
  });
  if (!crmFestivalSlot) throw new ValidationError("Choose a valid dated departure slot for this CRM festival");

  const existingBooking = await prisma.booking.findFirst({
    where: {
      userId,
      crmFestivalId,
      status: { in: ["PENDING", "RESERVED", "CONFIRMED"] },
    },
  });
  if (existingBooking) {
    throw new ValidationError("You already have an active booking for this festival");
  }

  const selectedPackage = data.packageId
    ? festival.packages.find((item) => item.id === data.packageId)
    : festival.packages[0];
  if (!selectedPackage) throw new ValidationError("Choose a valid package for this CRM festival");

  const additionalTravelers = travelerData(data.additionalTravelers);
  if (additionalTravelers.length !== travelers - 1) {
    throw new ValidationError("Enter details for every additional traveler");
  }
  if (additionalTravelers.some((traveler) => !traveler.email || !traveler.phone || !traveler.gender || !traveler.dateOfBirth || !traveler.aadhaarAssetId)) {
    throw new ValidationError("Each additional traveler needs email, phone, gender, date of birth, and Aadhaar card");
  }

  for (const traveler of additionalTravelers) {
    const asset = await prisma.mediaAsset.findFirst({
      where: {
        id: traveler.aadhaarAssetId,
        uploadedById: userId,
        deliveryType: "AUTHENTICATED",
        travelerGovtId: null,
      },
    });
    if (!asset) throw new ValidationError("One or more traveler Aadhaar uploads are invalid");
  }

  const quantitiesByAddOn = new Map();
  for (const item of Array.isArray(data.addOns) ? data.addOns : []) {
    if (!item?.addOnId) continue;
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new ValidationError("Add-on quantity must be a positive whole number");
    }
    quantitiesByAddOn.set(item.addOnId, (quantitiesByAddOn.get(item.addOnId) || 0) + quantity);
  }

  let addOnsTotal = 0;
  const bookingAddOns = [];
  for (const [addOnId, quantity] of quantitiesByAddOn) {
    const addOn = festival.addOns.find((item) => item.id === addOnId);
    if (!addOn?.isActive) throw new ValidationError("One or more selected add-ons are unavailable");
    if (addOn.maxQuantityPerBooking && quantity > addOn.maxQuantityPerBooking) {
      throw new ValidationError(`${addOn.title} is limited to ${addOn.maxQuantityPerBooking} per booking`);
    }
    if (addOn.purchaseCutoffOffsetDays != null) {
      const cutoff = new Date(crmFestivalSlot.startDate).getTime() - addOn.purchaseCutoffOffsetDays * 86400000;
      if (Date.now() > cutoff) throw new ValidationError(`${addOn.title} is no longer available for this departure`);
    }
    if (addOn.maxQuantityPerSlot) {
      const used = await prisma.bookingAddOn.aggregate({
        _sum: { quantity: true },
        where: {
          addOnId,
          status: { notIn: ["CANCELLED", "REFUNDED"] },
          booking: { crmFestivalSlotId: crmFestivalSlot.id, status: { in: ["RESERVED", "CONFIRMED"] } },
        },
      });
      const remaining = addOn.maxQuantityPerSlot - Number(used._sum.quantity || 0);
      if (quantity > remaining) throw new ValidationError(`${addOn.title} only has ${Math.max(0, remaining)} left for this departure`);
    }
    const unitPrice = Number(addOn.price);
    const totalPrice = round(unitPrice * quantity);
    addOnsTotal += totalPrice;
    bookingAddOns.push({ addOnId, quantity, unitPrice, totalPrice, status: "PENDING" });
  }

  const totalAmount = round(Number(selectedPackage.price) * travelers + addOnsTotal);
  const tokenAmount = round(Number(selectedPackage.tokenAmount) * travelers);
  const initialPaymentType = tokenAmount > 0 && data.initialPaymentType === "TOKEN" ? "TOKEN" : "FULL";
  const amountDue = initialPaymentType === "FULL" ? 0 : round(totalAmount - tokenAmount);
  const balanceDueDate = new Date(crmFestivalSlot.startDate);
  balanceDueDate.setDate(balanceDueDate.getDate() - 10);
  const bookingReference = await getReference();

  const booking = await prisma.$transaction(async (tx) => {
    const currentSlot = await tx.crmFestivalSlot.findUnique({ where: { id: crmFestivalSlot.id } });
    if (!currentSlot || currentSlot.filledSpots + travelers > currentSlot.capacity) {
      throw new ValidationError("This departure no longer has enough remaining capacity");
    }
    const created = await tx.booking.create({
      data: {
        id: bookingReference,
        bookingReference,
        userId,
        crmFestivalId,
        crmFestivalSlotId: crmFestivalSlot.id,
        packageId: selectedPackage.id,
        source: "CRM",
        numberOfTravelers: travelers,
        totalAmount,
        tokenAmount,
        amountPaid: 0,
        amountDue,
        initialPaymentType,
        balanceDueDate,
        status: "PENDING",
        paymentStatus: "PENDING",
        specialRequests: data.specialRequests?.trim() || null,
        travelers: additionalTravelers.length ? { create: additionalTravelers } : undefined,
        addOns: bookingAddOns.length ? { create: bookingAddOns } : undefined,
      },
      include: { user: { include: { profile: true } } },
    });
    return created;
  });

  await generateCrmBookingOperations(booking, crmFestivalSlot);
  return booking;
};

export const createCrmFestivalInstallment = async (crmFestivalId, bookingId, data, adminId) => {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, crmFestivalId, source: "CRM" },
    include: { user: { include: { profile: true } } },
  });
  if (!booking) throw new NotFoundError("CRM booking not found");
  if (Number(booking.amountDue) <= 0) throw new ValidationError("This booking is already fully paid");
  const festival = await getFestivalWithPricing(crmFestivalId);
  return createInstallment({ booking, festival, data, adminId });
};

export const listCrmFestivalBookings = (crmFestivalId) => prisma.booking.findMany({
  where: { crmFestivalId, source: "CRM" },
  include: { crmFestivalSlot: true, user: { include: { profile: true } }, payments: { orderBy: { createdAt: "desc" } }, travelers: true },
  orderBy: { createdAt: "desc" },
});
