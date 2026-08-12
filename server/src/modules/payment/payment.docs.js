import { z } from "zod";
import { registry } from "../../core/openapi/openapi.js";

// ─── Initiate Payment ─────────────────────────────────────────────────────────
registry.registerPath({
  method: "post",
  path: "/payments/initiate",
  summary: "Initiate a payment",
  description: "Creates a Razorpay order for a TOKEN or FULL payment on a PENDING booking. Returns the Razorpay order details needed by the client-side checkout.",
  tags: ["Payment"],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            bookingId: z.string().uuid(),
            type: z.enum(["TOKEN", "FULL"]),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Razorpay order created" },
    400: { description: "Invalid booking state or payment type" },
    403: { description: "Forbidden" },
    404: { description: "Booking not found" },
  },
});

// ─── Initiate Balance Payment ─────────────────────────────────────────────────
registry.registerPath({
  method: "post",
  path: "/payments/balance/initiate",
  summary: "Initiate balance payment",
  description: "Creates a Razorpay order for the outstanding balance on a RESERVED/PARTIALLY_PAID booking.",
  tags: ["Payment"],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ bookingId: z.string().uuid(), amount: z.number().positive().optional() }),
        },
      },
    },
  },
  responses: {
    200: { description: "Razorpay order created for balance payment" },
    400: { description: "Booking is not eligible or has no outstanding balance" },
    404: { description: "Booking not found" },
  },
});

// ─── Verify Payment ───────────────────────────────────────────────────────────
registry.registerPath({
  method: "post",
  path: "/payments/verify",
  summary: "Verify payment",
  description: "Verifies the Razorpay payment signature after client-side checkout completion. Works for TOKEN, FULL, and BALANCE payment types. Updates booking status and sends confirmation email.",
  tags: ["Payment"],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            razorpayOrderId: z.string(),
            razorpayPaymentId: z.string(),
            razorpaySignature: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Payment verified and booking updated" },
    400: { description: "Invalid payment signature" },
    404: { description: "Payment intent not found" },
  },
});

// ─── Webhook ──────────────────────────────────────────────────────────────────
registry.registerPath({
  method: "post",
  path: "/payments/webhook",
  summary: "Razorpay webhook",
  description: "Handles server-side Razorpay events (payment.captured, payment.failed, refund.created, etc.). Fully idempotent — duplicate events are safely ignored. Requires X-Razorpay-Signature header.",
  tags: ["Payment"],
  responses: {
    200: { description: "Webhook processed" },
    400: { description: "Invalid webhook signature" },
  },
});

// ─── Payment History ──────────────────────────────────────────────────────────
registry.registerPath({
  method: "get",
  path: "/payments/booking/{bookingId}",
  summary: "Get payment history for a booking",
  description: "Returns full payment history, refunds, and reminders for a booking. Users can only see their own bookings; admins can see all.",
  tags: ["Payment"],
  security: [{ cookieAuth: [] }],
  request: { params: z.object({ bookingId: z.string().uuid() }) },
  responses: {
    200: { description: "Booking payment history" },
    403: { description: "Forbidden" },
    404: { description: "Booking not found" },
  },
});

// ─── Admin: All Payments ──────────────────────────────────────────────────────
registry.registerPath({
  method: "get",
  path: "/payments",
  summary: "Get all payments (Admin)",
  description: "Paginated list of all payments across all bookings. Optionally filter by status.",
  tags: ["Payment"],
  security: [{ cookieAuth: [] }],
  request: {
    query: z.object({
      page: z.string().optional().default("1"),
      limit: z.string().optional().default("10"),
      status: z.enum(["CREATED","PENDING","SUCCESS","FAILED","CANCELLED","REFUNDED"]).optional(),
    }),
  },
  responses: {
    200: { description: "Paginated payments list" },
    403: { description: "Admin only" },
  },
});

// ─── Admin: Issue Refund ──────────────────────────────────────────────────────
registry.registerPath({
  method: "post",
  path: "/payments/{paymentId}/refund",
  summary: "Issue a refund (Admin)",
  description: "Issues a full or partial refund against a successful payment via Razorpay. Adjusts booking amounts and sends a refund email.",
  tags: ["Payment"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ paymentId: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            amount: z.number().positive().optional(),
            reason: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Refund initiated" },
    400: { description: "Invalid refund amount or payment not refundable" },
    404: { description: "Payment not found" },
  },
});

// ─── Admin: Send Reminder ─────────────────────────────────────────────────────
registry.registerPath({
  method: "post",
  path: "/payments/reminders/send",
  summary: "Send balance payment reminder (Admin)",
  description: "Sends a balance payment reminder email to the user with a deep link to the payment page. Only for PARTIALLY_PAID bookings.",
  tags: ["Payment"],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ bookingId: z.string().uuid() }),
        },
      },
    },
  },
  responses: {
    200: { description: "Reminder sent" },
    400: { description: "Booking is not in PARTIALLY_PAID state" },
    500: { description: "Email delivery failed" },
  },
});

// ─── Admin: Manual Payment Adjustment ────────────────────────────────────────
registry.registerPath({
  method: "post",
  path: "/payments/manual",
  summary: "Manual payment adjustment (Admin)",
  description: "Records a manual payment against a booking (e.g. cash/bank transfer). Automatically updates booking paid/due amounts and confirms the booking if fully settled.",
  tags: ["Payment"],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            bookingId: z.string().uuid(),
            amount: z.number().positive(),
            notes: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: "Manual payment recorded" },
    400: { description: "Invalid amount" },
    404: { description: "Booking not found" },
  },
});
