import { Router } from "express";
import * as operationsController from "./operations.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", requireAdmin, operationsController.listOperationalTasks);
router.get("/bookings/:bookingId", requireAdmin, operationsController.getBookingOperations);
router.patch("/:taskId", requireAdmin, operationsController.updateOperationalTask);

export default router;
