import { Router } from "express";
import * as tripFormController from "./trip-form.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";
import "./trip-form.docs.js";

const router = Router({ mergeParams: true });

// Public/User routes
router.get("/", tripFormController.getFormFields);

// Admin routes
router.use(requireAuth, requireAdmin);
router.post("/", tripFormController.createFormField);
router.put("/reorder", tripFormController.updateFieldOrder);
router.put("/:fieldId", tripFormController.updateFormField);
router.delete("/:fieldId", tripFormController.deleteFormField);
router.get("/submissions", tripFormController.getTripSubmissions);

export default router;
