import { Router } from "express";
import * as festivalController from "./festival.controller.js";
import { requireAuth, requireAdmin, optionalAuth } from "../../core/middlewares/auth.middleware.js";
import { imageUploadMiddleware, videoUploadMiddleware } from "../../core/services/upload.service.js";
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

router.post("/:id/share-link", festivalController.createShareLink);
router.delete("/:id/share-link", festivalController.revokeShareLink);

router.post(
  "/:id/banner-images",
  imageUploadMiddleware.array("banners", 10),
  festivalController.uploadBanners
);
router.post("/:id/banner-upload-signature", festivalController.createBannerUploadSignature);
router.post("/:id/banner-images/attach", festivalController.attachBannerImages);
router.delete("/:id/banner-images", festivalController.deleteBanner);

router.post(
  "/:id/video",
  videoUploadMiddleware.single("video"),
  festivalController.uploadVideo
);
router.delete("/:id/video", festivalController.deleteVideo);

router.post(
  "/:id/highlights",
  imageUploadMiddleware.array("images", 15),
  festivalController.syncHighlights
);

router.post(
  "/:id/stay-transport",
  imageUploadMiddleware.array("images", 15),
  festivalController.syncStayTransport
);

export default router;
