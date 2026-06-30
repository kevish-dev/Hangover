import { Router } from "express";
import * as faqController from "./faq.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";
import "./faq.docs.js"; // OpenAPI specs

// Set mergeParams to true to access tripId from the parent router
const router = Router({ mergeParams: true });

// Public routes
router.get("/", faqController.getFaqs);
router.get("/:id", faqController.getFaqById);

// Admin routes
router.use(requireAuth, requireAdmin);
router.post("/", faqController.createFaq);
router.put("/:id", faqController.updateFaq);
router.delete("/:id", faqController.deleteFaq);

export default router;
