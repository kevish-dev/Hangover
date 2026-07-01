import { Router } from "express";
import * as bookingController from "./booking.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";
import "./booking.docs.js";

const router = Router();

router.use(requireAuth);

router.post("/", bookingController.createBooking);
router.get("/me", bookingController.getMyBookings);
router.get("/:id", bookingController.getBookingById);

// Admin routes
router.get("/", requireAdmin, bookingController.getAllBookings);

export default router;
