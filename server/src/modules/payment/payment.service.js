import { prisma } from "../../prisma/client.js";
import * as repo from "./payment.repository.js";
import * as bookingRepo from "../booking/booking.repository.js";
import * as razorpay from "../../core/services/razorpay.service.js";
import * as email from "../../core/services/email.service.js";
import { AppError, NotFoundError, ForbiddenError, ValidationError } from "../../core/errors/errors.js";
import env from "../../core/env/env.js";
import crypto from "crypto";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDecimal2 = (n) => Math.round(Number(n) * 100) / 100;
const toPaise = (rupees) => Math.round(Number(rupees) * 100);

const assertBookingOwner = (booking, userId, isAdmin = false) => {
  if (!booking) throw new NotFoundError("Booking not found");
  if (!isAdmin && booking.userId !== userId) throw new ForbiddenError("Forbidden");
};

// ─── Initiate Payment ─────────────────────────────────────────────────────────

/**
 * Initiate a TOKEN or FULL payment for a booking.
 * Creates a Razorpay order + PaymentIntent record.
 */
export const initiatePayment = async (userId, bookingId, type) => {
  const booking = await bookingRepo.getBookingById(bookingId);
  assertBookingOwner(booking, userId);

  if (!["TOKEN", "FULL"].includes(type)) {
    throw new ValidationError("Payment type must be TOKEN or FULL");
  }

  if (booking.status !== "PENDING") {
    throw new ValidationError(
      `Cannot initiate payment on a booking with status: ${booking.status}. Only PENDING bookings can be paid.`
    );
  }

  const amount = type === "FULL" ? booking.totalAmount : booking.tokenAmount;

  // Create Razorpay order
  const order = await razorpay.createOrder(
    toPaise(amount),
    "INR",
    booking.bookingReference,
    {
      booking_id: bookingId,
      user_id: userId,
      payment_type: type,
    }
  );

  // Save PaymentIntent
  const intent = await repo.createPaymentIntent({
    bookingId,
    razorpayOrderId: order.id,
    type,
    amount,
    currency: "INR",
    status: "CREATED",
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min expiry
  });

  return {
    razorpayOrderId: order.id,
    razorpayKeyId: env.RAZORPAY_KEY_ID,
    amount: toPaise(amount),
    currency: "INR",
    bookingReference: booking.bookingReference,
    paymentIntentId: intent.id,
  };
};

// ─── Initiate Balance Payment ─────────────────────────────────────────────────

/**
 * Initiate a BALANCE payment for a partially-paid booking.
 */
export const initiateBalancePayment = async (userId, bookingId, isAdmin = false) => {
  const booking = await bookingRepo.getBookingById(bookingId);
  assertBookingOwner(booking, userId, isAdmin);

  if (booking.status !== "RESERVED" || booking.paymentStatus !== "PARTIALLY_PAID") {
    throw new ValidationError("Balance payment can only be initiated for RESERVED / PARTIALLY_PAID bookings.");
  }

  // Check cutoff — only block for non-admins
  if (!isAdmin && booking.balanceDueDate && new Date() > new Date(booking.balanceDueDate)) {
    throw new ValidationError(
      "The balance payment deadline has passed. Please contact support."
    );
  }

  const amount = booking.amountDue;
  if (Number(amount) <= 0) {
    throw new ValidationError("No outstanding balance for this booking.");
  }

  const order = await razorpay.createOrder(
    toPaise(amount),
    "INR",
    `${booking.bookingReference}-BAL`,
    {
      booking_id: bookingId,
      user_id: userId,
      payment_type: "BALANCE",
    }
  );

  const intent = await repo.createPaymentIntent({
    bookingId,
    razorpayOrderId: order.id,
    type: "BALANCE",
    amount,
    currency: "INR",
    status: "CREATED",
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });

  return {
    razorpayOrderId: order.id,
    razorpayKeyId: env.RAZORPAY_KEY_ID,
    amount: toPaise(amount),
    currency: "INR",
    bookingReference: booking.bookingReference,
    paymentIntentId: intent.id,
  };
};

// ─── Verify Payment ───────────────────────────────────────────────────────────

/**
 * Verify Razorpay payment signature after client-side checkout.
 * Works for TOKEN, FULL, and BALANCE payment types.
 */
export const verifyPayment = async (userId, { razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  // 1. Verify signature
  const isValid = razorpay.verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!isValid) throw new AppError("Invalid payment signature", 400, "INVALID_SIGNATURE");

  // 2. Load intent
  const intent = await repo.getPaymentIntentByOrderId(razorpayOrderId);
  if (!intent) throw new NotFoundError("Payment intent not found");

  const { booking } = intent;
  assertBookingOwner(booking, userId);

  // 3. Idempotency — if already processed return existing payment
  const existing = await repo.getPaymentByRazorpayOrderId(razorpayOrderId);
  if (existing) return existing;

  // 4. Fetch Razorpay payment details
  const rzpPayment = await razorpay.fetchPayment(razorpayPaymentId);
  const idempotencyKey = `${booking.id}-${intent.type}-${razorpayOrderId}`;
  const receiptNumber = `RCPT-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;

  // 5. Create Payment record
  const payment = await prisma.$transaction(async (tx) => {
    const pmt = await tx.payment.create({
      data: {
        bookingId: booking.id,
        paymentIntentId: intent.id,
        type: intent.type,
        status: "SUCCESS",
        amount: intent.amount,
        currency: intent.currency,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        paymentMethod: rzpPayment.method || null,
        idempotencyKey,
        receiptNumber,
        notes: { paymentType: intent.type },
        paidAt: new Date(),
      },
    });

    // 6. Update PaymentIntent status
    await tx.paymentIntent.update({ where: { id: intent.id }, data: { status: "COMPLETED" } });

    // 7. Update Booking status/amounts
    let bookingUpdate = {};
    if (intent.type === "FULL") {
      bookingUpdate = {
        status: "CONFIRMED",
        paymentStatus: "PAID",
        amountPaid: { increment: Number(intent.amount) },
        amountDue: 0,
        confirmedAt: new Date(),
      };
    } else if (intent.type === "TOKEN") {
      bookingUpdate = {
        status: "RESERVED",
        paymentStatus: "PARTIALLY_PAID",
        amountPaid: { increment: Number(intent.amount) },
        reservedAt: new Date(),
      };
    } else if (intent.type === "BALANCE") {
      bookingUpdate = {
        status: "CONFIRMED",
        paymentStatus: "PAID",
        amountPaid: { increment: Number(intent.amount) },
        amountDue: 0,
        confirmedAt: new Date(),
      };
    }

    await tx.booking.update({ where: { id: booking.id }, data: bookingUpdate });

    // 8. Increment filledSpots on trip for non-token first-time (only on FULL or BALANCE final payment)
    if (intent.type === "FULL" || intent.type === "BALANCE") {
      await tx.trip.update({
        where: { id: booking.tripId },
        data: { filledSpots: { increment: booking.numberOfTravelers } },
      });
    }

    return pmt;
  });

  // 9. Send confirmation email
  try {
    const userEmail = booking.user?.email;
    const userName = booking.user?.profile?.fullName || "Traveler";
    const tripTitle = booking.trip?.title || "your trip";
    if (userEmail) {
      await email.sendBookingConfirmedEmail({
        to: userEmail,
        name: userName,
        bookingRef: booking.bookingReference,
        tripTitle,
        amountPaid: intent.amount,
        totalAmount: booking.totalAmount,
        amountDue: intent.type === "FULL" || intent.type === "BALANCE" ? 0 : Number(booking.totalAmount) - Number(booking.tokenAmount),
        paymentType: intent.type,
        receiptNumber: payment.receiptNumber,
        invoiceDate: payment.paidAt,
        travelersCount: booking.numberOfTravelers,
      });
    }
  } catch (_) {
    // Non-fatal — don't block the response if email fails
  }

  return payment;
};

// ─── Webhook Handler ──────────────────────────────────────────────────────────

/**
 * Process Razorpay server-side webhook events. Fully idempotent.
 */
export const handleWebhook = async (rawBody, signature) => {
  // 1. Verify webhook signature
  const isValid = razorpay.verifyWebhookSignature(rawBody, signature);
  if (!isValid) throw new AppError("Invalid webhook signature", 400, "INVALID_WEBHOOK_SIGNATURE");

  const payload = JSON.parse(rawBody);
  const eventId = payload.id || payload.event;
  const eventType = payload.event;

  // 2. Idempotency — skip if already processed
  const existing = await repo.getWebhookByEventId(eventId);
  if (existing && existing.processed) return { status: "already_processed" };

  // 3. Log webhook
  let webhookRecord;
  if (!existing) {
    webhookRecord = await repo.createWebhookLog({
      eventId,
      eventType,
      payload,
      signature,
    });
  } else {
    webhookRecord = existing;
    await repo.incrementWebhookRetry(existing.id);
  }

  try {
    // 4. Route by event type
    switch (eventType) {
      case "payment.captured": {
        const rzpPayment = payload.payload?.payment?.entity;
        if (rzpPayment?.order_id) {
          const existingPmt = await repo.getPaymentByRazorpayOrderId(rzpPayment.order_id);
          if (existingPmt && existingPmt.status !== "SUCCESS") {
            await repo.updatePayment(existingPmt.id, {
              status: "SUCCESS",
              razorpayPaymentId: rzpPayment.id,
              paidAt: new Date(),
            });
          }
        }
        break;
      }
      case "payment.failed": {
        const rzpPayment = payload.payload?.payment?.entity;
        if (rzpPayment?.order_id) {
          const intent = await repo.getPaymentIntentByOrderId(rzpPayment.order_id);
          if (intent) {
            await repo.updatePaymentIntent(intent.id, { status: "CANCELLED" });
          }
        }
        break;
      }
      case "refund.created": {
        // refund.created just confirms Razorpay registered the refund — keep status PENDING
        const rzpRefundCreated = payload.payload?.refund?.entity;
        if (rzpRefundCreated?.id) {
          const refund = await repo.getRefundByRazorpayId(rzpRefundCreated.id);
          if (refund && refund.status === "PENDING") {
            // No status change needed — it's already PENDING
          }
        }
        break;
      }
      case "refund.processed": {
        const rzpRefundProcessed = payload.payload?.refund?.entity;
        if (rzpRefundProcessed?.id) {
          const refund = await repo.getRefundByRazorpayId(rzpRefundProcessed.id);
          if (refund && refund.status !== "SUCCESS") {
            // Mark refund as completed
            await repo.updateRefundRecord(refund.id, {
              status: "SUCCESS",
              processedAt: new Date(),
            });

            // Sync payment and booking statuses based on total refunded amount
            const payment = await repo.getPaymentById(refund.paymentId);
            if (payment) {
              const totalRefunded = payment.refunds
                .filter((r) => r.status === "SUCCESS" || r.id === refund.id)
                .reduce((sum, r) => sum + Number(r.amount), 0);
              const isFullRefund = totalRefunded >= Number(payment.amount);

              await repo.updatePayment(payment.id, {
                status: isFullRefund ? "REFUNDED" : "SUCCESS",
              });

              const booking = await bookingRepo.getBookingById(payment.bookingId);
              if (booking) {
                const newAmountPaid = toDecimal2(Math.max(0, Number(booking.amountPaid) - Number(refund.amount)));
                const isBookingFullyRefunded = newAmountPaid === 0;
                await bookingRepo.updateBooking(payment.bookingId, {
                  paymentStatus: isBookingFullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
                });
              }
            }
          }
        }
        break;
      }
      case "refund.failed": {
        const rzpRefund = payload.payload?.refund?.entity;
        if (rzpRefund?.id) {
          const refund = await repo.getRefundByRazorpayId(rzpRefund.id);
          if (refund) {
            await repo.updateRefundRecord(refund.id, {
              status: "FAILED",
              failureReason: rzpRefund.description || "Refund failed",
            });
          }
        }
        break;
      }
      default:
        // Unhandled event — log but don't error
        break;
    }

    await repo.markWebhookProcessed(webhookRecord.id);
    return { status: "processed" };
  } catch (err) {
    await repo.markWebhookProcessed(webhookRecord.id, err.message);
    throw err;
  }
};

// ─── Payment History ──────────────────────────────────────────────────────────

/**
 * Get full payment history for a booking.
 */
export const getPaymentHistory = async (bookingId, userId, isAdmin = false) => {
  const booking = await bookingRepo.getBookingById(bookingId);
  assertBookingOwner(booking, userId, isAdmin);

  const [payments, reminders] = await Promise.all([
    repo.getPaymentsByBookingId(bookingId),
    repo.getRemindersByBookingId(bookingId),
  ]);

  return { booking, payments, reminders };
};

// ─── Admin: All Payments ──────────────────────────────────────────────────────

export const getAllPayments = async (page = 1, limit = 10, status) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit, 10);
  const filter = status ? { status } : {};
  const { payments, total } = await repo.getAllPayments(skip, take, filter);
  return {
    data: payments,
    meta: { total, page: parseInt(page, 10), limit: take, totalPages: Math.ceil(total / take) },
  };
};

// ─── Admin: Issue Refund ──────────────────────────────────────────────────────

export const issueRefund = async (paymentId, amount, reason, adminId) => {
  const payment = await repo.getPaymentById(paymentId);
  if (!payment) throw new NotFoundError("Payment not found");
  if (payment.status !== "SUCCESS") {
    throw new ValidationError("Refunds can only be issued for successful payments.");
  }

  // Calculate total already refunded
  const alreadyRefunded = payment.refunds
    .filter((r) => ["PENDING", "SUCCESS"].includes(r.status))
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const maxRefundable = toDecimal2(Number(payment.amount) - alreadyRefunded);
  const refundAmount = amount ? toDecimal2(Number(amount)) : maxRefundable;

  if (refundAmount <= 0) throw new ValidationError("No refundable amount remaining.");
  if (refundAmount > maxRefundable) {
    throw new ValidationError(`Refund amount ₹${refundAmount} exceeds refundable balance ₹${maxRefundable}.`);
  }

  const isFullRefund = refundAmount >= Number(payment.amount);

  // Issue refund via Razorpay
  const rzpRefund = await razorpay.createRefund(
    payment.razorpayPaymentId,
    toPaise(refundAmount),
    { reason, admin_id: adminId }
  );

  // Atomically record refund, update payment status, and update booking
  const refundRecord = await prisma.$transaction(async (tx) => {
    // 1. Create refund record
    const record = await tx.refund.create({
      data: {
        paymentId: payment.id,
        amount: refundAmount,
        status: "PENDING",
        reason,
        razorpayRefundId: rzpRefund.id,
        initiatedBy: adminId,
        metadata: { razorpayRefund: rzpRefund },
      },
    });

    // 2. Update payment status — REFUNDED for full, stays SUCCESS for partial
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: isFullRefund ? "REFUNDED" : "SUCCESS" },
    });

    // 3. Fetch the booking's current amountPaid to calculate new values
    const booking = await tx.booking.findUnique({ where: { id: payment.bookingId } });
    const newAmountPaid = toDecimal2(Math.max(0, Number(booking.amountPaid) - refundAmount));
    const newAmountDue = toDecimal2(Number(booking.totalAmount) - newAmountPaid);
    const isBookingFullyRefunded = newAmountPaid === 0;

    // 4. Update booking payment status and booking status
    await tx.booking.update({
      where: { id: payment.bookingId },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        paymentStatus: isBookingFullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
        // Cancel the booking if fully refunded
        ...(isBookingFullyRefunded && {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason: reason || "Refunded by admin",
        }),
      },
    });

    // 5. Decrement filledSpots if the booking is fully refunded (capacity freed)
    if (isBookingFullyRefunded && ["CONFIRMED", "RESERVED"].includes(booking.status)) {
      await tx.trip.update({
        where: { id: booking.tripId },
        data: { filledSpots: { decrement: booking.numberOfTravelers } },
      });
    }

    return record;
  });

  // Send refund email
  try {
    const { booking } = payment;
    if (booking?.user?.email) {
      await email.sendRefundInitiatedEmail({
        to: booking.user.email,
        name: booking.user.profile?.fullName || "Traveler",
        bookingRef: booking.bookingReference,
        tripTitle: booking.trip?.title || "your trip",
        refundAmount,
      });
    }
  } catch (_) {}

  return refundRecord;
};

// ─── Admin: Send Balance Reminder ─────────────────────────────────────────────

export const sendBalanceReminder = async (bookingId, adminId) => {
  const booking = await bookingRepo.getBookingById(bookingId);
  if (!booking) throw new NotFoundError("Booking not found");

  if (booking.paymentStatus !== "PARTIALLY_PAID") {
    throw new ValidationError("Reminders can only be sent for partially paid bookings.");
  }

  const userEmail = booking.user?.email;
  const userName = booking.user?.profile?.fullName || "Traveler";
  const tripTitle = booking.trip?.title || "your trip";
  const paymentLink = `${env.ORIGIN}/bookings/${bookingId}/pay-balance`;

  // Create reminder record
  const reminder = await repo.createReminder({
    bookingId,
    type: "MANUAL",
    status: "PENDING",
    sentBy: adminId,
    email: userEmail,
    subject: `Balance Payment Due – ${tripTitle} (${booking.bookingReference})`,
  });

  try {
    await email.sendPaymentReminderEmail({
      to: userEmail,
      name: userName,
      bookingRef: booking.bookingReference,
      tripTitle,
      balanceAmount: booking.amountDue,
      dueDate: booking.balanceDueDate,
      paymentLink,
    });
    await repo.updateReminder(reminder.id, {
      status: "SENT",
      sentAt: new Date(),
    });
  } catch (err) {
    await repo.updateReminder(reminder.id, {
      status: "FAILED",
      failureReason: err.message,
    });
    throw new AppError("Failed to send reminder email", 500, "EMAIL_ERROR");
  }

  return reminder;
};

// ─── Admin: Manual Payment Adjustment ────────────────────────────────────────

export const manualAdjustment = async (bookingId, amount, notes, adminId) => {
  const booking = await bookingRepo.getBookingById(bookingId);
  if (!booking) throw new NotFoundError("Booking not found");

  const adjustAmount = toDecimal2(Number(amount));
  if (adjustAmount <= 0) throw new ValidationError("Adjustment amount must be positive.");

  const idempotencyKey = `manual-${bookingId}-${Date.now()}-${adminId}`;
  const receiptNumber = `MANUAL-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

  // Create a manual payment record (no Razorpay IDs)
  const payment = await prisma.$transaction(async (tx) => {
    const pmt = await tx.payment.create({
      data: {
        bookingId,
        type: "FULL",
        status: "SUCCESS",
        amount: adjustAmount,
        currency: "INR",
        razorpayOrderId: `MANUAL-${crypto.randomBytes(8).toString("hex")}`,
        idempotencyKey,
        receiptNumber,
        notes: { adminNotes: notes, recordedBy: adminId, isManual: true },
        paidAt: new Date(),
      },
    });

    const newAmountPaid = toDecimal2(Number(booking.amountPaid) + adjustAmount);
    const newAmountDue = Math.max(0, toDecimal2(Number(booking.totalAmount) - newAmountPaid));

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        paymentStatus: newAmountDue === 0 ? "PAID" : "PARTIALLY_PAID",
        status: newAmountDue === 0 ? "CONFIRMED" : booking.status,
        ...(newAmountDue === 0 && { confirmedAt: new Date() }),
      },
    });

    return pmt;
  });

  return payment;
};
