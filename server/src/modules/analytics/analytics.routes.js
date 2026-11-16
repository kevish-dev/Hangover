import { Router } from "express";
import { getAnalytics, getOverview } from "./analytics.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, requireAdmin, getAnalytics);

router.get("/overview", requireAuth, requireAdmin, getOverview);

export default router;
