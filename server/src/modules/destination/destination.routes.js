import { Router } from "express";
import * as controller from "./destination.controller.js";
import {
  requireAuth,
  requireAdmin,
  optionalAuth
} from "../../core/middlewares/auth.middleware.js";
import "./destination.docs.js";

const router = Router();

router.get("/", optionalAuth, controller.getDestinations);
router.get("/:id", optionalAuth, controller.getDestinationById);

// Protected routes (Admin only)
router.post("/", requireAuth, requireAdmin, controller.createDestination);
router.put("/:id", requireAuth, requireAdmin, controller.updateDestination);
router.delete("/:id", requireAuth, requireAdmin, controller.deleteDestination);

router.post("/:id/link-existing-entities", requireAuth, requireAdmin, controller.linkExistingEntities);

export default router;
