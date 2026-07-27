import { Router } from "express";
import { getAnalytics } from "./analytics.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, requireAdmin, getAnalytics);

export default router;
