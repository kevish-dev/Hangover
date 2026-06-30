import { Router } from "express";
import * as tripController from "./trip.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";
import faqRoutes from "../faq/faq.routes.js";
import "./trip.docs.js"; // Register OpenAPI specs

const router = Router();

// Mount nested FAQ routes
router.use("/:tripId/faqs", faqRoutes);

// Public routes
router.get("/", tripController.getTrips);
router.get("/:id", tripController.getTripById);

// Admin routes
router.use(requireAuth, requireAdmin);
router.post("/", tripController.createTrip);
router.put("/:id", tripController.updateTrip);
router.delete("/:id", tripController.deleteTrip);

export default router;
