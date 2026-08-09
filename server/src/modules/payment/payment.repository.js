import { prisma } from "../../prisma/client.js";

const bookingEmailInclude = {
  user: { include: { profile: true } },
  trip: true,
  festival: true,
  crmTrip: { include: { destination: true } },
  crmFestival: { include: { destination: true } },
  slot: { include: { trip: true, festival: true } },
  crmTripSlot: true,
  crmFestivalSlot: true,
  package: true,
  travelers: true,
};

// ─── Payment Intent ────────────────────────────────────────────────────────────

export const createPaymentIntent = async (data) => {
  return prisma.paymentIntent.create({ data });
};

export const getPaymentIntentByOrderId = async (razorpayOrderId) => {
  return prisma.paymentIntent.findUnique({
    where: { razorpayOrderId },
    include: { booking: { include: bookingEmailInclude } },
  });
};

export const updatePaymentIntent = async (id, data) => {
  return prisma.paymentIntent.update({ where: { id }, data });
};

// ─── Payment ──────────────────────────────────────────────────────────────────

export const createPayment = async (data) => {
  return prisma.payment.create({ data, include: { refunds: true } });
};

export const getPaymentById = async (id) => {
  return prisma.payment.findUnique({
    where: { id },
    include: {
      booking: { include: bookingEmailInclude },
      refunds: true,
    },
  });
};

export const getBookingForPaymentEmail = async (id) => {
  return prisma.booking.findUnique({
    where: { id },
    include: bookingEmailInclude,
  });
};

export const getPaymentByRazorpayOrderId = async (razorpayOrderId) => {
  return prisma.payment.findUnique({
    where: { razorpayOrderId },
    include: { refunds: true, booking: true },
  });
};

export const getPaymentByIdempotencyKey = async (idempotencyKey) => {
  return prisma.payment.findUnique({
    where: { idempotencyKey },
    include: { refunds: true, booking: true },
  });
};

export const updatePayment = async (id, data) => {
  return prisma.payment.update({ where: { id }, data });
};

export const getPaymentsByBookingId = async (bookingId) => {
  return prisma.payment.findMany({
    where: { bookingId },
    include: { refunds: true, paymentIntent: true },
    orderBy: { createdAt: "asc" },
  });
};

export const getAllPayments = async (skip, take, filter = {}) => {
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: filter,
      include: {
        booking: { include: bookingEmailInclude },
        refunds: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.payment.count({ where: filter }),
  ]);
  return { payments, total };
};

// ─── Webhook ──────────────────────────────────────────────────────────────────

export const createWebhookLog = async (data) => {
  return prisma.paymentWebhook.create({ data });
};

export const getWebhookByEventId = async (eventId) => {
  return prisma.paymentWebhook.findUnique({ where: { eventId } });
};

export const markWebhookProcessed = async (id, processingError = null) => {
  return prisma.paymentWebhook.update({
    where: { id },
    data: {
      processed: true,
      processedAt: new Date(),
      ...(processingError && { processingError }),
    },
  });
};

export const incrementWebhookRetry = async (id) => {
  return prisma.paymentWebhook.update({
    where: { id },
    data: { retryCount: { increment: 1 } },
  });
};

// ─── Refund ───────────────────────────────────────────────────────────────────

export const createRefundRecord = async (data) => {
  return prisma.refund.create({ data });
};

export const updateRefundRecord = async (id, data) => {
  return prisma.refund.update({ where: { id }, data });
};

export const getRefundByRazorpayId = async (razorpayRefundId) => {
  return prisma.refund.findUnique({ where: { razorpayRefundId } });
};

// ─── Reminder ─────────────────────────────────────────────────────────────────

export const createReminder = async (data) => {
  return prisma.paymentReminder.create({ data });
};

export const updateReminder = async (id, data) => {
  return prisma.paymentReminder.update({ where: { id }, data });
};

export const getRemindersByBookingId = async (bookingId) => {
  return prisma.paymentReminder.findMany({
    where: { bookingId },
    orderBy: { createdAt: "desc" },
  });
};
