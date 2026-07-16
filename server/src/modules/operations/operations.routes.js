import { Router } from "express";
import { requireAdmin, requireAuth } from "../../core/middlewares/auth.middleware.js";
import * as operationsController from "./operations.controller.js";
import "./operations.docs.js";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/dashboard", operationsController.getDashboard);
router.get("/departures", operationsController.listDepartures);
router.get("/departures/:slotId", operationsController.getDeparture);
router.patch("/departures/:slotId", operationsController.updateDeparture);
router.get("/bookings", operationsController.listBookings);
router.get("/bookings/:bookingId", operationsController.getBooking);
router.patch("/bookings/:bookingId", operationsController.updateBookingOps);
router.patch("/bookings/:bookingId/primary-document", operationsController.updatePrimaryDocument);
router.patch("/bookings/:bookingId/travelers/:travelerId", operationsController.updateTraveler);
router.post("/bookings/:bookingId/hotels", operationsController.createHotel);
router.patch("/bookings/:bookingId/hotels/:hotelId", operationsController.updateHotel);

export default router;
