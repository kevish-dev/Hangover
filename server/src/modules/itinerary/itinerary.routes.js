import { Router } from "express";
import * as itineraryController from "./itinerary.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";
import "./itinerary.docs.js"; // Register OpenAPI specs

const router = Router();

// Public routes
router.get("/", itineraryController.getItineraries);
router.get("/:id", itineraryController.getItineraryById);

// Admin routes
router.use(requireAuth, requireAdmin);
router.post("/", itineraryController.createItinerary);
router.put("/:id", itineraryController.updateItinerary);
router.delete("/:id", itineraryController.deleteItinerary);

export default router;
