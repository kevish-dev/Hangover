import { Router } from "express";
import * as authController from "./auth.controller.js";
import { requireAuth } from "../../core/middlewares/auth.middleware.js";
import "./auth.docs.js";

const router = Router();

// Initiation endpoint (redirects to Google)
router.get("/google", authController.googleAuthRedirect);

// Callback / Token exchange endpoint (Google redirects here)
router.get("/google/callback", authController.googleAuthCallback);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

// Protected routes
router.get("/me", requireAuth, authController.getMe);

export default router;
