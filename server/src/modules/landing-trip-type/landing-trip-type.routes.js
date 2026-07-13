import { Router } from "express";
import { optionalAuth, requireAdmin, requireAuth } from "../../core/middlewares/auth.middleware.js";
import { imageUploadMiddleware } from "../../core/services/upload.service.js";
import * as controller from "./landing-trip-type.controller.js";

const router = Router();
router.get("/", optionalAuth, controller.getTripTypes);
router.use(requireAuth, requireAdmin);
router.post("/image", imageUploadMiddleware.single("image"), controller.uploadTripTypeImage);
router.post("/", controller.createTripType);
router.put("/:id", controller.updateTripType);
router.delete("/:id", controller.deleteTripType);
export default router;
