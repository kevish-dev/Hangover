import { Router } from "express";
import * as tripController from "./trip.controller.js";
import { requireAuth, requireAdmin, optionalAuth } from "../../core/middlewares/auth.middleware.js";
import { imageUploadMiddleware } from "../../core/services/upload.service.js";
import faqRoutes from "../faq/faq.routes.js";

import "./trip.docs.js"; // Register OpenAPI specs

const router = Router();

// Mount nested FAQ routes
router.use("/:tripId/faqs", faqRoutes);



// Public routes (with optional auth for admin view)
router.get("/featured", optionalAuth, tripController.getFeaturedTrips);
router.get("/signature-collection", optionalAuth, tripController.getSignatureTrips);
router.get("/", optionalAuth, tripController.getTrips);
router.get("/:id", optionalAuth, tripController.getTripById);

// Admin routes
router.use(requireAuth, requireAdmin);
router.put("/signature-collection", tripController.updateSignatureTrips);
router.post("/", tripController.createTrip);
router.put("/:id", tripController.updateTrip);
router.delete("/:id", tripController.deleteTrip);
router.post("/:id/share-link", tripController.createShareLink);
router.delete("/:id/share-link", tripController.revokeShareLink);
router.post(
  "/:id/banner-images",
  imageUploadMiddleware.array("banners", 10),
  tripController.uploadBanners
);
router.post("/:id/banner-upload-signature", tripController.createBannerUploadSignature);
router.post("/:id/banner-images/attach", tripController.attachBannerImages);
router.delete("/:id/banner-images", tripController.deleteBanner);
router.delete("/:id/gallery-images", tripController.deleteGalleryImage);

router.post(
  "/:id/highlights",
  imageUploadMiddleware.array("images", 15),
  tripController.syncHighlights
);

router.post(
  "/:id/stay-transport",
  imageUploadMiddleware.array("images", 15),
  tripController.syncStayTransport
);

export default router;
