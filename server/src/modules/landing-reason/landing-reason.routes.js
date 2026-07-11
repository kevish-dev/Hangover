import { Router } from "express";
import { optionalAuth, requireAdmin, requireAuth } from "../../core/middlewares/auth.middleware.js";
import { imageUploadMiddleware } from "../../core/services/upload.service.js";
import * as controller from "./landing-reason.controller.js";

const router = Router();

router.get("/", optionalAuth, controller.getReasons);
router.use(requireAuth, requireAdmin);
router.post("/image", imageUploadMiddleware.single("image"), controller.uploadReasonImage);
router.post("/", controller.createReason);
router.put("/:id", controller.updateReason);
router.delete("/:id", controller.deleteReason);

export default router;
