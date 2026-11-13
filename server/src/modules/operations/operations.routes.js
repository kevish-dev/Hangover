import { Router } from "express";
import * as operationsController from "./operations.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";
import { recentHttpErrors } from "../../core/middlewares/errorTracker.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/recent-errors", requireAdmin, (req, res) => {
  const { limit, type } = req.query;
  let errors = recentHttpErrors;

  if (type === "4xx") {
    errors = errors.filter((e) => e.statusCode >= 400 && e.statusCode < 500);
  } else if (type === "5xx") {
    errors = errors.filter((e) => e.statusCode >= 500);
  }

  const parsedLimit = limit ? parseInt(limit, 10) : 50;
  res.json({
    success: true,
    count: errors.length,
    errors: errors.slice(0, parsedLimit),
  });
});

router.get("/", requireAdmin, operationsController.listOperationalTasks);
router.get("/bookings/:bookingId", requireAdmin, operationsController.getBookingOperations);
router.post("/bookings/:bookingId", requireAdmin, operationsController.createOperationalTask);
router.patch("/:taskId", requireAdmin, operationsController.updateOperationalTask);
router.delete("/:taskId", requireAdmin, operationsController.deleteOperationalTask);

export default router;
