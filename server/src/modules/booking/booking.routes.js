import { Router } from "express";
import * as bookingController from "./booking.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";
import { documentUploadMiddleware } from "../../core/services/upload.service.js";
import "./booking.docs.js";

const router = Router();

router.use(requireAuth);

// Admin must come before /:id to avoid route shadowing
router.get("/", requireAdmin, bookingController.getAllBookings);
router.post("/admin-create", requireAdmin, bookingController.adminCreateBooking);
router.post("/:id/finalize", requireAdmin, bookingController.finalizeBooking);
router.get("/trip/:tripId", requireAdmin, bookingController.getBookingsByTrip);
router.get("/festival/:festivalId", requireAdmin, bookingController.getBookingsByFestival);
router.post("/:id/cancel-and-refund", requireAdmin, bookingController.cancelAndRefundBooking);

// User routes
router.post("/traveler/govt-id", documentUploadMiddleware.single("image"), bookingController.uploadTravelerGovtId);
router.post("/", bookingController.createBooking);
router.get("/me", bookingController.getMyBookings);
router.get("/:id", bookingController.getBookingById);
router.patch("/:id/cancel", bookingController.cancelBooking);

export default router;
