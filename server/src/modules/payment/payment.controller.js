import * as paymentService from "./payment.service.js";

export const initiatePayment = async (req, res, next) => {
  try {
    const { bookingId, type } = req.body;
    const result = await paymentService.initiatePayment(req.user.id, bookingId, type);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const initiateBalancePayment = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const isAdmin = req.user.role === "ADMIN";
    const result = await paymentService.initiateBalancePayment(req.user.id, bookingId, isAdmin);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const payment = await paymentService.verifyPayment(req.user.id, {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });
    res.status(200).json(payment);
  } catch (error) {
    next(error);
  }
};

export const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    if (!signature) return res.status(400).json({ message: "Missing webhook signature" });

    const result = await paymentService.handleWebhook(req.body, signature);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getPaymentHistory = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === "ADMIN";
    const history = await paymentService.getPaymentHistory(req.params.bookingId, req.user.id, isAdmin);
    res.status(200).json(history);
  } catch (error) {
    next(error);
  }
};

export const getAllPayments = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query;
    const payments = await paymentService.getAllPayments(page, limit, status);
    res.status(200).json(payments);
  } catch (error) {
    next(error);
  }
};

export const issueRefund = async (req, res, next) => {
  try {
    const { amount, reason } = req.body || {};
    const refund = await paymentService.issueRefund(req.params.paymentId, amount, reason, req.user.id);
    res.status(200).json(refund);
  } catch (error) {
    next(error);
  }
};

export const sendReminder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const reminder = await paymentService.sendBalanceReminder(bookingId, req.user.id);
    res.status(200).json(reminder);
  } catch (error) {
    next(error);
  }
};

export const manualAdjustment = async (req, res, next) => {
  try {
    const { bookingId, amount, notes } = req.body;
    const payment = await paymentService.manualAdjustment(bookingId, amount, notes, req.user.id);
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
};
