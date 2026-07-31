import crypto from "crypto";
import { prisma } from "../../prisma/client.js";
import { createHostedPaymentLink } from "../../core/services/razorpay.service.js";
import { NotFoundError, ValidationError } from "../../core/errors/errors.js";

const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const getReference = async () => {
  const rows = await prisma.$queryRaw`SELECT nextval('"BookingReferenceSequence"') AS "sequence"`;
  return `H${String(Number(rows[0].sequence)).padStart(4, "0")}`;
};
const paymentTypeFor = (amount, dueBefore) => amount === dueBefore ? "FULL" : "TOKEN";
const profileFields = (data) => ({
  fullName: data.fullName?.trim() || null,
  phone: data.phone?.trim() || null,
  gender: ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"].includes(data.gender) ? data.gender : undefined,
  dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
  govtIdAssetId: data.govtIdAssetId || undefined,
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

const getTripWithPricing = async (crmTripId) => {
  const trip = await prisma.crmTrip.findUnique({ where: { id: crmTripId } });
  if (!trip) throw new NotFoundError("CRM trip not found");
  if (trip.totalAmount == null || trip.tokenAmount == null) {
    throw new ValidationError("Set the CRM trip total and token amounts before creating bookings");
  }
  return trip;
};

const emailReceipt = async ({ booking, payment, trip }) => {
  const { sendBookingConfirmedEmail } = await import("../../core/services/email.service.js");
  const total = Number(booking.totalAmount);
  const amountDue = Number(booking.amountDue);
  await sendBookingConfirmedEmail({
    to: booking.user.email,
    name: booking.user.profile?.fullName || "Traveler",
    bookingRef: booking.bookingReference,
    bookingId: booking.id,
    tripTitle: trip.name,
    totalAmount: total,
    transactionAmount: Number(payment.amount),
    cumulativeAmountPaid: Number(booking.amountPaid),
    previousAmountPaid: round(Number(booking.amountPaid) - Number(payment.amount)),
    amountDue,
    paymentType: payment.type,
    paymentMethod: payment.paymentMethod,
    paymentId: payment.razorpayPaymentId || payment.razorpayOrderId,
    receiptNumber: payment.receiptNumber || payment.receiptNumberInt,
    paidAt: payment.paidAt,
    travelersCount: booking.numberOfTravelers,
    itemLocation: trip.destinationId,
  });
};

const emailPaymentRequest = async ({ booking, trip, payment, paymentLink }) => {
  const { sendPaymentReminderEmail } = await import("../../core/services/email.service.js");
  await sendPaymentReminderEmail({
    to: booking.user.email,
    name: booking.user.profile?.fullName || "Traveler",
    bookingRef: booking.bookingReference,
    tripTitle: trip.name,
    totalAmount: booking.totalAmount,
    amountPaid: booking.amountPaid,
    balanceAmount: booking.amountDue,
    paymentRequestAmount: payment.amount,
    isInstallmentRequest: true,
    paymentLink,
    travelersCount: booking.numberOfTravelers,
    itemLocation: trip.destinationId,
  });
};

const createInstallment = async ({ booking, trip, data, adminId, isInitial = false }) => {
  const amount = round(data.paymentAmount);
  const dueBefore = Number(booking.amountDue);
  if (!Number.isFinite(amount) || amount <= 0 || amount > dueBefore) {
    throw new ValidationError(`Installment amount must be between ₹0.01 and ₹${dueBefore.toFixed(2)}`);
  }
  if (!["MANUAL", "SEND_LINK"].includes(data.paymentAction)) {
    throw new ValidationError("Choose manual collection or Send Razorpay link");
  }
  const activeHostedLink = await prisma.payment.findFirst({
    where: { bookingId: booking.id, status: { in: ["CREATED", "PENDING"] } },
    select: { amount: true },
  });
  if (activeHostedLink) {
    throw new ValidationError(`A Razorpay payment link for ₹${Number(activeHostedLink.amount).toFixed(2)} is still awaiting payment. Wait for it to be paid before recording another installment.`);
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
          status: newDue === 0 ? "CONFIRMED" : "PENDING",
          confirmedAt: newDue === 0 ? new Date() : undefined,
        },
        include: { user: { include: { profile: true } } },
      });
      await tx.ledgerEntry.create({
        data: {
          type: "INCOME", scope: "BOOKING", bookingId: booking.id, paymentId: payment.id,
          source: "BOOKING_PAYMENT", category: "CRM installment", amount,
          description: `CRM ${type.toLowerCase()} payment received`, isAutoGenerated: true, createdById: adminId,
        },
      });
      return { booking: updatedBooking, payment };
    });
    await emailReceipt({ ...result, trip }).catch(console.error);
    return { ...result, paymentLink: null };
  }

  const link = await createHostedPaymentLink({
    amountPaise: Math.round(amount * 100),
    referenceId: `${booking.bookingReference}-${crypto.randomUUID().slice(0, 8)}`,
    customer: { name: booking.user.profile?.fullName || data.fullName, email: booking.user.email, phone: booking.user.profile?.phone || data.phone },
    notes: { bookingId: booking.id, crmTripId: trip.id },
  });
  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id, type, status: "CREATED", amount, razorpayOrderId: link.id,
      idempotencyKey: `crm_link_${link.id}`, notes: { paymentLink: link.short_url, crm: true, adminId },
    },
  });
  await emailPaymentRequest({ booking, trip, payment, paymentLink: link.short_url }).catch(console.error);
  return { booking, payment, paymentLink: link.short_url };
};

export const createCrmBooking = async (crmTripId, data, adminId) => {
  if (!data.email?.trim() || !data.fullName?.trim()) throw new ValidationError("Customer name and email are required");
  const trip = await getTripWithPricing(crmTripId);
  const user = await ensureUser(data);
  const bookingReference = await getReference();
  const booking = await prisma.booking.create({
    data: {
      id: bookingReference, bookingReference, userId: user.id, crmTripId, source: "CRM",
      numberOfTravelers: Number(data.numberOfTravelers) || 1,
      totalAmount: trip.totalAmount, tokenAmount: trip.tokenAmount, amountPaid: 0, amountDue: trip.totalAmount,
      initialPaymentType: "TOKEN", status: "PENDING", paymentStatus: "PENDING",
      specialRequests: data.specialRequests?.trim() || null,
      travelers: { create: travelerData(data.additionalTravelers) },
    },
    include: { user: { include: { profile: true } } },
  });
  return createInstallment({ booking, trip, data, adminId, isInitial: true });
};

export const createCrmInstallment = async (crmTripId, bookingId, data, adminId) => {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, crmTripId, source: "CRM" },
    include: { user: { include: { profile: true } } },
  });
  if (!booking) throw new NotFoundError("CRM booking not found");
  if (Number(booking.amountDue) <= 0) throw new ValidationError("This booking is already fully paid");
  const trip = await getTripWithPricing(crmTripId);
  return createInstallment({ booking, trip, data, adminId });
};

export const captureHostedCrmPayment = async ({ paymentLinkId, razorpayPayment }) => {
  const queued = await prisma.payment.findUnique({
    where: { razorpayOrderId: paymentLinkId },
    include: { booking: { include: { user: { include: { profile: true } }, crmTrip: true } } },
  });
  if (!queued || queued.status === "SUCCESS" || queued.booking.source !== "CRM" || !queued.booking.crmTrip) return null;
  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({ where: { id: queued.id, status: { in: ["CREATED", "PENDING"] } }, data: { status: "SUCCESS", razorpayPaymentId: razorpayPayment?.id || null, paymentMethod: razorpayPayment?.method || null, paidAt: new Date() } });
    if (!claimed.count) return null;
    const current = await tx.booking.findUnique({ where: { id: queued.bookingId }, include: { user: { include: { profile: true } } } });
    const amount = Number(queued.amount);
    const newPaid = round(Number(current.amountPaid) + amount);
    const newDue = round(Math.max(0, Number(current.totalAmount) - newPaid));
    const booking = await tx.booking.update({ where: { id: current.id }, data: { amountPaid: newPaid, amountDue: newDue, paymentStatus: newDue === 0 ? "PAID" : "PARTIALLY_PAID", status: newDue === 0 ? "CONFIRMED" : "PENDING", confirmedAt: newDue === 0 ? new Date() : undefined }, include: { user: { include: { profile: true } } } });
    const payment = await tx.payment.findUnique({ where: { id: queued.id } });
    await tx.ledgerEntry.create({ data: { type: "INCOME", scope: "BOOKING", bookingId: booking.id, paymentId: queued.id, source: "BOOKING_PAYMENT", category: "CRM installment", amount, description: "CRM hosted payment received", isAutoGenerated: true } });
    return { booking, payment };
  });
  if (result) await emailReceipt({ ...result, trip: queued.booking.crmTrip }).catch(console.error);
  return result;
};

export const listCrmBookings = (crmTripId) => prisma.booking.findMany({
  where: { crmTripId, source: "CRM" },
  include: { user: { include: { profile: true } }, payments: { orderBy: { createdAt: "desc" } }, travelers: true },
  orderBy: { createdAt: "desc" },
});
