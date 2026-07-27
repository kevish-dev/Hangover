import { Router } from "express";
import { requireAdmin, requireAuth } from "../../core/middlewares/auth.middleware.js";
import * as siteSettingsController from "./site-settings.controller.js";

const router = Router();

// Customers need this status to understand why actions are unavailable.
router.get("/", siteSettingsController.getSettings);
router.put("/maintenance", requireAuth, requireAdmin, siteSettingsController.setMaintenanceMode);

export default router;
