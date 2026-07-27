import { Router } from "express";
import * as itineraryController from "./itinerary.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";

import "./itinerary.docs.js";

const router = Router();

router.get("/trip/:tripId", itineraryController.getTripItinerary);
router.get("/festival/:festivalId", itineraryController.getFestivalItinerary);
router.post("/", requireAuth, requireAdmin, itineraryController.createItinerary);
router.put("/:id", requireAuth, requireAdmin, itineraryController.updateItineraryDay);
router.delete("/:id", requireAuth, requireAdmin, itineraryController.deleteItineraryDay);

export default router;
