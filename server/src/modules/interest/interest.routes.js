import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as controller from "./interest.controller.js";
import {
  validate,
  createInterestSubmissionSchema,
} from "./interest.validation.js";
import {
  requireAuth,
  requireAdmin,
  optionalAuth,
} from "../../core/middlewares/auth.middleware.js";

const router = Router();

const createInterestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: {
    message:
      "Too many interest submissions from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public route to submit interest (with optional auth session check)
router.post(
  "/",
  optionalAuth,
  createInterestLimiter,
  validate(createInterestSubmissionSchema),
  controller.handlePublicSubmitInterest,
);

// Admin routes
router.use(requireAuth, requireAdmin);
router.get("/", controller.handleGetInterestOverview);
router.delete("/:id", controller.handleDeleteInterestSubmission);

export default router;
