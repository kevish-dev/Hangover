import { Router } from "express";
import * as festivalController from "./festival.controller.js";
import { requireAuth, requireAdmin, optionalAuth } from "../../core/middlewares/auth.middleware.js";
import { uploadMiddleware } from "../../core/services/upload.service.js";
import faqRoutes from "../faq/faq.routes.js";

import "./festival.docs.js"; // Register OpenAPI specs

const router = Router();

// Mount nested FAQ routes (assuming FAQ routes support festivalId via mergeParams or similar if modified, else handled gracefully)
router.use("/:festivalId/faqs", faqRoutes);

// Public routes (with optional auth for admin view)
router.get("/featured", optionalAuth, festivalController.getFeaturedFestivals);
router.get("/", optionalAuth, festivalController.getFestivals);
router.get("/:id", optionalAuth, festivalController.getFestivalById);

// Admin routes
router.use(requireAuth, requireAdmin);
router.post("/", festivalController.createFestival);
router.put("/:id", festivalController.updateFestival);
router.delete("/:id", festivalController.deleteFestival);

router.post(
  "/:id/banner-images",
  uploadMiddleware.array("banners", 10), // Allow up to 10 banners at once
  festivalController.uploadBanners
);
router.delete("/:id/banner-images", festivalController.deleteBanner);

router.post(
  "/:id/video",
  uploadMiddleware.single("video"),
  festivalController.uploadVideo
);
router.delete("/:id/video", festivalController.deleteVideo);

router.post(
  "/:id/highlights",
  uploadMiddleware.array("images", 15),
  festivalController.syncHighlights
);

router.post(
  "/:id/stay-transport",
  uploadMiddleware.array("images", 15),
  festivalController.syncStayTransport
);

export default router;
