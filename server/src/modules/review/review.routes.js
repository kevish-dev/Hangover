import { Router } from "express";
import * as reviewController from "./review.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.get("/trip/:tripId", reviewController.getReviewsForTrip);
router.get("/festival/:festivalId", reviewController.getReviewsForFestival);

// User routes
router.post("/", requireAuth, reviewController.createReview);

// Admin routes
router.get("/", requireAuth, requireAdmin, reviewController.getAllReviews);
router.patch("/:id/toggle", requireAuth, requireAdmin, reviewController.toggleReviewVisibility);
router.delete("/:id", requireAuth, requireAdmin, reviewController.deleteReview);

export default router;
