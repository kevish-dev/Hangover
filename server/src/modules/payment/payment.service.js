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

// ─── Core: Process Successful Payment ────────────────────────────────────────

/**
 * Atomic, idempotent function that finalises a successful payment.
 * Called by BOTH verifyPayment (frontend path) AND handleWebhook (backend path).
 * Whichever fires first wins; the second call is a guaranteed no-op.
 *
 * Availability rule:
 *   - TOKEN payment  -> filledSpots++ on slot (spot is immediately reserved)
 *   - FULL  payment  -> filledSpots++ on slot (spot is immediately confirmed)
 *   - BALANCE payment -> NO increment (spot was already counted at TOKEN time)
 */
const _processSuccessfulPayment = async (intent, rzpPaymentId, rzpSignature, rzpMethod) => {
  const { booking } = intent;
  const idempotencyKey = `${booking.id}-${intent.type}-${intent.razorpayOrderId}`;

  // Idempotency — if already processed, return existing record
  const existing = await repo.getPaymentByIdempotencyKey(idempotencyKey);
  if (existing) return existing;

  const payment = await prisma.$transaction(async (tx) => {
    // 1. Create Payment record
    const pmt = await tx.payment.create({
      data: {
        bookingId: booking.id,
        paymentIntentId: intent.id,
        type: intent.type,
        status: "SUCCESS",
        amount: intent.amount,
        currency: intent.currency,
        razorpayOrderId: intent.razorpayOrderId,
        razorpayPaymentId: rzpPaymentId || null,
        razorpaySignature: rzpSignature || null,
        paymentMethod: rzpMethod || null,
        idempotencyKey,
        notes: { paymentType: intent.type },
        paidAt: new Date(),
      },
    });

    // 2. Mark PaymentIntent as COMPLETED
    await tx.paymentIntent.update({
      where: { id: intent.id },
      data: { status: "COMPLETED" },
    });

    // 3. Update Booking status, payment status, and amounts
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

    // 4. Decrement availability:
    //    TOKEN -> spot reserved now; FULL -> spot confirmed now; BALANCE -> already counted at TOKEN time.
    if (intent.type === "TOKEN" || intent.type === "FULL") {
      if (booking.slotId) {
        await tx.slot.update({
          where: { id: booking.slotId },
          data: { filledSpots: { increment: booking.numberOfTravelers } },
        });
      }
    }

    return pmt;
  });

  return payment;
};

// ─── Initiate Payment ─────────────────────────────────────────────────────────

/**
 * Initiate a TOKEN or FULL payment for a PENDING booking.
 * Creates a Razorpay order + PaymentIntent record.
 * Expires any stale CREATED intents before creating a new one.
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

  // Expire any stale CREATED intents for this booking (e.g. from a previously abandoned attempt)
  await prisma.paymentIntent.updateMany({
    where: { bookingId, status: "CREATED" },
    data: { status: "EXPIRED" },
  });

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
 * Initiate a BALANCE payment for a RESERVED / PARTIALLY_PAID booking.
 * Expires any stale CREATED intents before creating a new one.
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

  // Expire any stale CREATED intents before creating a fresh one
  await prisma.paymentIntent.updateMany({
    where: { bookingId, status: "CREATED" },
    data: { status: "EXPIRED" },
  });

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
 * Frontend path: verify Razorpay payment signature after client-side checkout.
 * Delegates all DB work to _processSuccessfulPayment (idempotent).
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

  // 3. Fetch Razorpay payment details (method info etc.)
  const rzpPayment = await razorpay.fetchPayment(razorpayPaymentId);

  // 4. Delegate to shared core logic (fully idempotent)
  const payment = await _processSuccessfulPayment(
    intent,
    razorpayPaymentId,
    razorpaySignature,
    rzpPayment.method || null
  );

  // 5. Send confirmation email (non-fatal)
  try {
    const userEmail = booking.user?.email;
    const userName = booking.user?.profile?.fullName || "Traveler";
    const tripTitle = booking.trip?.title || booking.festival?.title || "your trip";
    
    if (userEmail) {
      const travelersDetails = booking.travelers && booking.travelers.length > 0 
        ? booking.travelers.map(t => t.fullName).join(", ") 
        : "";
      const packageName = booking.package?.title || null;
      let slotName = null;
      if (booking.slot) {
        const start = new Date(booking.slot.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        const end = new Date(booking.slot.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        slotName = `${start} - ${end}`;
      }

      await email.sendBookingConfirmedEmail({
        to: userEmail,
        name: userName,
        bookingRef: booking.bookingReference,
        tripTitle,
        tripStartDate: booking.slot?.startDate,
        tripEndDate: booking.slot?.endDate,
        amountPaid: intent.amount,
        totalAmount: booking.totalAmount,
        amountDue: intent.type === "FULL" || intent.type === "BALANCE" ? 0 : Number(booking.totalAmount) - Number(booking.tokenAmount),
        paymentType: intent.type,
        receiptNumber: payment.receiptNumberInt,
        invoiceDate: payment.paidAt,
        travelersCount: booking.numberOfTravelers,
        packageName,
        slotName,
        travelersDetails,
      });
    }
  } catch (_) {
    // Non-fatal — don't block the response if email fails
  }

  return payment;
};

// ─── Record Failed Payment ────────────────────────────────────────────────────

/**
 * Record a payment failure.
 * Called from the frontend on payment.failed event, OR from the webhook handler.
 * Booking is left in PENDING status so the user can retry.
 */
export const recordFailedPayment = async (userId, { razorpayOrderId, razorpayPaymentId, reason, code }) => {
  const intent = await repo.getPaymentIntentByOrderId(razorpayOrderId);
  if (!intent) throw new NotFoundError("Payment intent not found");

  const { booking } = intent;
  if (userId) assertBookingOwner(booking, userId);

  // Idempotency — skip if this exact failure was already recorded
  const idempotencyKey = `fail-${booking.id}-${intent.type}-${razorpayOrderId}-${razorpayPaymentId || "no_pmt"}`;
  const existing = await prisma.payment.findUnique({ where: { idempotencyKey } });
  if (existing) return existing;

  const payment = await prisma.$transaction(async (tx) => {
    // 1. Create FAILED payment record
    const pmt = await tx.payment.create({
      data: {
        bookingId: booking.id,
        paymentIntentId: intent.id,
        type: intent.type,
        status: "FAILED",
        amount: intent.amount,
        currency: intent.currency,
        razorpayOrderId,
        razorpayPaymentId: razorpayPaymentId || null,
        idempotencyKey,
        failureReason: reason || "Payment failed",
        failureCode: code || null,
        notes: { paymentType: intent.type, failed: true },
      },
    });

    // 2. Mark PaymentIntent as FAILED (valid after schema migration)
    await tx.paymentIntent.update({
      where: { id: intent.id },
      data: { status: "FAILED" },
    });

    // 3. Ensure booking paymentStatus reflects the failure — stays PENDING for retry
    //    Only update if not already in a terminal success state
    if (booking.paymentStatus === "PENDING") {
      await tx.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: "FAILED" },
      });
    }

    return pmt;
  });

  // Fire failure email — non-blocking so SMTP issues don't affect the response
  const userEmail = booking.user?.email;
  const userName = booking.user?.profile?.fullName || booking.user?.email?.split("@")[0] || "Traveller";
  const tripTitle = booking.trip?.title || booking.festival?.title || "your trip";
  if (userEmail) {
    email.sendPaymentFailedEmail({
      to: userEmail,
      name: userName,
      bookingRef: booking.bookingReference,
      tripTitle,
      amount: Number(intent.amount).toLocaleString("en-IN"),
    }).catch((err) => console.error("[Email] Failed to send payment failure email:", err));
  }

  return payment;
};


// ─── Webhook Handler ──────────────────────────────────────────────────────────

/**
 * Process Razorpay server-side webhook events. Fully idempotent.
 *
 * CRITICAL: This is the source of truth for payment confirmation.
 * The payment.captured handler is self-sufficient — it will fully confirm
 * a booking even if the frontend /verify call never arrived (e.g. browser closed).
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
        /**
         * This is the critical safety net.
         * If the frontend called /verify before this webhook, _processSuccessfulPayment
         * is idempotent and will return the existing payment record instantly.
         * If the frontend never called /verify (browser crash, network drop, etc.),
         * this handler will fully confirm the booking on its own.
         */
        const rzpPayment = payload.payload?.payment?.entity;
        if (!rzpPayment?.order_id) break;

        const intent = await repo.getPaymentIntentByOrderId(rzpPayment.order_id);
        if (!intent) break; // Not our order — skip

        const payment = await _processSuccessfulPayment(
          intent,
          rzpPayment.id,
          null, // No client signature in webhook context
          rzpPayment.method || null
        );

        // Send confirmation email (non-fatal) — only if payment was just now created
        // (avoid duplicate emails if frontend /verify already sent one)
        if (payment && payment.createdAt && (Date.now() - new Date(payment.createdAt).getTime()) < 30000) {
          try {
            const { booking } = intent;
            const userEmail = booking.user?.email;
            if (userEmail) {
              await email.sendBookingConfirmedEmail({
                to: userEmail,
                name: booking.user?.profile?.fullName || "Traveler",
                bookingRef: booking.bookingReference,
                tripTitle: booking.trip?.title || booking.festival?.title || "your trip",
                tripStartDate: booking.slot?.startDate,
                tripEndDate: booking.slot?.endDate,
                amountPaid: intent.amount,
                totalAmount: booking.totalAmount,
                amountDue: intent.type === "FULL" || intent.type === "BALANCE" ? 0 : Number(booking.totalAmount) - Number(booking.tokenAmount),
                paymentType: intent.type,
                receiptNumber: payment.receiptNumberInt,
                invoiceDate: payment.paidAt,
                travelersCount: booking.numberOfTravelers,
              });
            }
          } catch (_) {}
        }
        break;
      }

      case "payment.failed": {
        /**
         * Bank-side failure. Record it and leave the booking PENDING for retry.
         */
        const rzpPayment = payload.payload?.payment?.entity;
        if (!rzpPayment?.order_id) break;

        try {
          await recordFailedPayment(null, {
            razorpayOrderId: rzpPayment.order_id,
            razorpayPaymentId: rzpPayment.id,
            reason: rzpPayment.error_description || "Webhook payment.failed",
            code: rzpPayment.error_code,
          });
        } catch (e) {
          // Swallow — recordFailedPayment handles its own idempotency
        }
        break;
      }

      case "refund.created": {
        // Razorpay confirmed the refund request — status stays PENDING on our side
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
    throw new ValidationError(`Refund amount Rs.${refundAmount} exceeds refundable balance Rs.${maxRefundable}.`);
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

    // 5. Free up trip capacity on full refund.
    //    filledSpots is decremented for CONFIRMED (FULL/BALANCE paid) AND RESERVED (TOKEN paid)
    //    bookings, because both states hold a spot per the availability rule.
    if (isBookingFullyRefunded && (booking.status === "CONFIRMED" || booking.status === "RESERVED")) {
      if (booking.slotId) {
        const currentSlot = await tx.slot.findUnique({ where: { id: booking.slotId }, select: { filledSpots: true } });
        const safeDecrement = Math.min(booking.numberOfTravelers, currentSlot?.filledSpots ?? 0);
        if (safeDecrement > 0) {
          await tx.slot.update({
            where: { id: booking.slotId },
            data: { filledSpots: { decrement: safeDecrement } },
          });
        }
      }
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
    subject: `Balance Payment Due - ${tripTitle} (${booking.bookingReference})`,
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
