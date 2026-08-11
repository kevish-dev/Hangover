import { prisma } from "../../prisma/client.js";
import { sendCustomInvoiceEmail } from "../../core/services/email.service.js";
import { AppError } from "../../core/errors/errors.js";
import { getBookingJourney } from "../booking/booking-journey.js";

const receiptBookingInclude = {
  user: { include: { profile: true } },
  trip: true,
  festival: true,
  crmTrip: { include: { destination: true } },
  crmFestival: { include: { destination: true } },
  slot: { include: { trip: true, festival: true } },
  crmTripSlot: true,
  crmFestivalSlot: true,
  package: true,
};

const number = (value) => Number(value || 0);

const bookingContext = (booking) => {
  if (!booking) return null;
  const journey = getBookingJourney(booking);

  return {
    id: booking.id,
    bookingReference: booking.bookingReference,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    numberOfTravelers: booking.numberOfTravelers,
    totalAmount: booking.totalAmount,
    amountPaid: booking.amountPaid,
    amountDue: booking.amountDue,
    balanceDueDate: booking.balanceDueDate,
    customer: {
      name: booking.user?.profile?.fullName || null,
      email: booking.user?.email || null,
      phone: booking.user?.profile?.phone || null,
    },
    journey,
  };
};

const paymentContext = (payment) => {
  if (!payment) return null;
  const successfulRefunded = payment.refunds
    .filter((refund) => refund.status === "SUCCESS")
    .reduce((total, refund) => total + number(refund.amount), 0);
  const pendingRefunded = payment.refunds
    .filter((refund) => refund.status === "PENDING")
    .reduce((total, refund) => total + number(refund.amount), 0);

  return {
    id: payment.id,
    bookingId: payment.bookingId,
    type: payment.type,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    paymentMethod: payment.paymentMethod,
    utr: payment.utr,
    receiptNumber: payment.receiptNumber || payment.receiptNumberInt || null,
    razorpayOrderId: payment.razorpayOrderId,
    razorpayPaymentId: payment.razorpayPaymentId,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    successfulRefunded,
    pendingRefunded,
    netAmount: Math.max(0, number(payment.amount) - successfulRefunded),
    refunds: payment.refunds.map((refund) => ({
      id: refund.id,
      amount: refund.amount,
      status: refund.status,
      reason: refund.reason,
      razorpayRefundId: refund.razorpayRefundId,
      createdAt: refund.createdAt,
      processedAt: refund.processedAt,
    })),
  };
};

const receiptSync = (invoice, booking, payment) => {
  if (invoice.source !== "BOOKING_RECEIPT") return null;

  const issues = [];
  if (!invoice.bookingId) issues.push("This legacy receipt is not linked to a booking.");
  else if (!booking) issues.push("The linked booking is no longer available.");

  if (!invoice.paymentId) issues.push("This legacy receipt is not linked to a payment transaction.");
  else if (!payment) issues.push("The linked payment transaction is no longer available.");
  else {
    if (invoice.bookingId && payment.bookingId !== invoice.bookingId) {
      issues.push("The linked payment belongs to a different booking.");
    }
    if (Math.abs(number(invoice.amount) - number(payment.amount)) > 0.01) {
      issues.push("The receipt amount differs from the linked payment amount.");
    }
  }

  const currentPayment = paymentContext(payment);
  let state = "CURRENT";
  if (!invoice.bookingId || !invoice.paymentId) state = "UNLINKED";
  else if (!booking) state = "BOOKING_MISSING";
  else if (!payment) state = "PAYMENT_MISSING";
  else if (payment.bookingId !== invoice.bookingId) state = "PAYMENT_BOOKING_MISMATCH";
  else if (Math.abs(number(invoice.amount) - number(payment.amount)) > 0.01) state = "PAYMENT_AMOUNT_MISMATCH";
  else if (payment.status === "REFUNDED" || currentPayment.successfulRefunded >= number(payment.amount)) state = "REFUNDED";
  else if (currentPayment.pendingRefunded > 0) state = "REFUND_PENDING";
  else if (currentPayment.successfulRefunded > 0) state = "PARTIALLY_REFUNDED";
  else if (payment.status !== "SUCCESS") state = "PAYMENT_NOT_SUCCESSFUL";
  else if (booking.status === "CANCELLED") state = "BOOKING_CANCELLED";

  return {
    state,
    issues,
    booking: bookingContext(booking),
    payment: currentPayment,
  };
};

export const createInvoice = async (data) => {
  const { customerName, customerEmail, customerPhone, title, description, items, amount, currency, dueDate } = data;

  const invoice = await prisma.customInvoice.create({
    data: {
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      title,
      description: description || null,
      items: items || [],
      amount,
      currency: currency || "INR",
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "DRAFT",
      source: "CUSTOM",
    },
  });

  // Send the invoice email
  try {
    await sendCustomInvoiceEmail({
      to: customerEmail,
      customerName,
      title,
      description,
      items,
      amount,
      currency: currency || "INR",
      dueDate: dueDate ? new Date(dueDate) : null,
    });
    return await prisma.customInvoice.update({
      where: { id: invoice.id },
      data: { status: "PAID", sentAt: new Date() },
    });
  } catch (error) {
    console.error("Failed to send custom invoice email:", error);
    throw new AppError(
      "Receipt was saved as a draft because its email could not be delivered",
      502,
      "INVOICE_EMAIL_FAILED",
    );
  }
};

export const getInvoices = async () => {
  const invoices = await prisma.customInvoice.findMany({
    orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
  });

  const bookingIds = [...new Set(invoices.map((invoice) => invoice.bookingId).filter(Boolean))];
  const paymentIds = [...new Set(invoices.map((invoice) => invoice.paymentId).filter(Boolean))];
  const [bookings, payments] = await Promise.all([
    bookingIds.length
      ? prisma.booking.findMany({
          where: { id: { in: bookingIds } },
          include: receiptBookingInclude,
        })
      : [],
    paymentIds.length
      ? prisma.payment.findMany({
          where: { id: { in: paymentIds } },
          include: { refunds: true },
        })
      : [],
  ]);
  const bookingsById = new Map(bookings.map((booking) => [booking.id, booking]));
  const paymentsById = new Map(payments.map((payment) => [payment.id, payment]));

  return invoices.map((invoice) => {
    const booking = invoice.bookingId ? bookingsById.get(invoice.bookingId) : null;
    const payment = invoice.paymentId ? paymentsById.get(invoice.paymentId) : null;
    return { ...invoice, sync: receiptSync(invoice, booking, payment) };
  });
};

export const updateInvoiceStatus = async (id, status) => {
  return await prisma.customInvoice.update({
    where: { id },
    data: { status },
  });
};
