import { Router } from "express";
import * as controller from "./custom-trip.controller.js";
import { optionalAuth, requireAdmin, requireAuth } from "../../core/middlewares/auth.middleware.js";
import { imageUploadMiddleware } from "../../core/services/upload.service.js";

const router = Router();

// The customer offer uses only its opaque token. Inquiry routes and records are never consulted.
router.get("/offers/:token", optionalAuth, controller.getOffer);
router.post("/offers/:token/book", requireAuth, controller.bookOffer);

router.use(requireAuth, requireAdmin);
router.get("/", controller.list);
router.post("/", imageUploadMiddleware.array("images", 10), controller.create);
router.get("/:id", controller.getById);
router.patch("/:id", imageUploadMiddleware.array("images", 10), controller.update);
router.delete("/:id", controller.remove);
router.post("/:id/banners", imageUploadMiddleware.array("images", 10), controller.uploadBanners);
router.delete("/:id/banners", controller.removeBanner);
router.post("/:id/send", controller.send);
router.post("/:id/duplicate", controller.duplicate);
router.post("/:id/cancel", controller.cancel);

export default router;
