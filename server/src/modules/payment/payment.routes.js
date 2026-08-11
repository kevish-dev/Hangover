import { Router } from "express";
import express from "express";
import * as paymentController from "./payment.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";
import "./payment.docs.js";

const router = Router();

// ─── Webhook (raw body, no auth — must be before express.json()) ──────────────
// We apply express.raw() at the route level so only this route gets raw body.
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleWebhook
);

// ─── All other routes require auth ────────────────────────────────────────────
router.use(requireAuth);

// User routes
router.post("/initiate", paymentController.initiatePayment);
router.post("/balance/initiate", paymentController.initiateBalancePayment);
router.post("/verify", paymentController.verifyPayment);
router.post("/submit-upi-utr", paymentController.submitUpiUtrPayment);
router.post("/failed", paymentController.recordFailedPayment);
router.get("/booking/:bookingId", paymentController.getPaymentHistory);

// Admin routes
router.get("/", requireAdmin, paymentController.getAllPayments);
router.post("/reminders/send", requireAdmin, paymentController.sendReminder);
router.post("/manual", requireAdmin, paymentController.manualAdjustment);
router.post("/:paymentId/refund", requireAdmin, paymentController.issueRefund);
router.post("/:paymentId/verify-upi", requireAdmin, paymentController.verifyUpiPayment);

export default router;
