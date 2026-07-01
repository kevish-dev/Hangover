import { Router } from "express";
import * as bookingController from "./booking.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";
import "./booking.docs.js";

const router = Router();

router.use(requireAuth);

// Admin must come before /:id to avoid route shadowing
router.get("/", requireAdmin, bookingController.getAllBookings);

// User routes
router.post("/", bookingController.createBooking);
router.get("/me", bookingController.getMyBookings);
router.get("/:id", bookingController.getBookingById);
router.patch("/:id/cancel", bookingController.cancelBooking);

export default router;
