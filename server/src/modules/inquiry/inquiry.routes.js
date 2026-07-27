import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as inquiryController from "./inquiry.controller.js";
import { requireAuth, requireAdmin, optionalAuth } from "../../core/middlewares/auth.middleware.js";
import "./inquiry.docs.js";

const router = Router();

// Rate limiter for creating inquiries (e.g., max 5 per hour per IP)
const createInquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { message: "Too many inquiries submitted from this IP, please try again after an hour" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public route to create inquiry (with optional auth)
router.post("/", optionalAuth, createInquiryLimiter, inquiryController.createInquiry);

// Admin routes
router.use(requireAuth, requireAdmin);
router.get("/", inquiryController.getInquiries);
router.get("/:id", inquiryController.getInquiryById);
router.patch("/:id/resolve", inquiryController.resolveInquiry);
router.delete("/:id", inquiryController.deleteInquiry);

export default router;
