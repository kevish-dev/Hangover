import { Router } from "express";
import * as tripTagController from "./trip-tag.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";
import "./trip-tag.docs.js";

const router = Router();

// Public routes
router.get("/", tripTagController.getAllTripTags);
router.get("/:id", tripTagController.getTripTagById);

// Admin routes
router.use(requireAuth, requireAdmin);
router.post("/", tripTagController.createTripTag);
router.put("/:id", tripTagController.updateTripTag);
router.delete("/:id", tripTagController.deleteTripTag);

export default router;
