import { Router } from "express";
import * as tripController from "./trip.controller.js";
import { optionalAuth } from "../../core/middlewares/auth.middleware.js";

const router = Router();

// Only GET routes for trips
router.get("/", optionalAuth, tripController.getFeaturedTrips);
router.get("/:id", optionalAuth, tripController.getTripById);

export default router;
