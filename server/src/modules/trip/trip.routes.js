import { Router } from "express";
import * as tripController from "./trip.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";
import { uploadMiddleware } from "../../core/services/upload.service.js";
import faqRoutes from "../faq/faq.routes.js";
import tripFormRoutes from "../trip-form/trip-form.routes.js";
import "./trip.docs.js"; // Register OpenAPI specs

const router = Router();

// Mount nested FAQ routes
router.use("/:tripId/faqs", faqRoutes);

// Mount nested Trip Forms routes
router.use("/:tripId/forms", tripFormRoutes);

// Public routes
router.get("/", tripController.getTrips);
router.get("/:id", tripController.getTripById);

// Admin routes
router.use(requireAuth, requireAdmin);
router.post("/", tripController.createTrip);
router.put("/:id", tripController.updateTrip);
router.delete("/:id", tripController.deleteTrip);
router.post(
  "/:id/banner-images",
  uploadMiddleware.array("banners", 10), // Allow up to 10 banners at once
  tripController.uploadBanners
);
router.delete("/:id/banner-images", tripController.deleteBanner);

export default router;
