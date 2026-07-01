import Razorpay from "razorpay";
import crypto from "crypto";
import env from "../env/env.js";

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay order
 * @param {number} amountPaise - Amount in smallest currency unit (paise for INR)
 * @param {string} currency
 * @param {string} receipt - Unique receipt identifier (bookingRef)
 * @param {object} notes - Metadata to attach to order
 */
export const createOrder = async (amountPaise, currency = "INR", receipt, notes = {}) => {
  return razorpay.orders.create({
    amount: amountPaise,
    currency,
    receipt,
    notes,
  });
};

/**
 * Verify Razorpay webhook signature
 * @param {string|Buffer} rawBody - Raw request body (must not be parsed)
 * @param {string} signature - X-Razorpay-Signature header value
 */
export const verifyWebhookSignature = (rawBody, signature) => {
  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return expectedSignature === signature;
};

/**
 * Verify payment signature after client-side checkout
 * @param {string} razorpayOrderId
 * @param {string} razorpayPaymentId
 * @param {string} razorpaySignature
 */
export const verifyPaymentSignature = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest("hex");
  return expectedSignature === razorpaySignature;
};

/**
 * Fetch a payment from Razorpay
 * @param {string} razorpayPaymentId
 */
export const fetchPayment = async (razorpayPaymentId) => {
  return razorpay.payments.fetch(razorpayPaymentId);
};

/**
 * Issue a refund via Razorpay
 * @param {string} razorpayPaymentId
 * @param {number} amountPaise - Amount to refund in paise (omit for full refund)
 * @param {object} notes
 */
export const createRefund = async (razorpayPaymentId, amountPaise, notes = {}) => {
  return razorpay.payments.refund(razorpayPaymentId, {
    amount: amountPaise,
    notes,
  });
};

export default razorpay;
