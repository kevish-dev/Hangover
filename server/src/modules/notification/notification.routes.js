import { Router } from "express";
import * as notificationController from "./notification.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/settings", notificationController.getSettings);
router.put("/settings/:category", notificationController.updateRecipients);

export default router;
