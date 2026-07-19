import { Router } from "express";
import * as circuitController from "./circuit.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";
import "./circuit.docs.js";

const router = Router();

// ── Public read routes ────────────────────────────────────────────────────
router.get("/", circuitController.getCircuits);
router.get("/:id", circuitController.getCircuitById);

import { imageUploadMiddleware } from "../../core/services/upload.service.js";

// ── All routes below require admin ─────────────────────────────────────────
router.use(requireAuth, requireAdmin);

// ── Circuit Media ─────────────────────────────────────────────────────────
router.post("/upload-signature", circuitController.createUploadSignature);
router.post("/:id/banner-images", imageUploadMiddleware.array("banners", 10), circuitController.uploadBanners);
router.post("/:id/banner-upload-signature", circuitController.createBannerUploadSignature);
router.post("/:id/banner-images/attach", circuitController.attachBannerImages);
router.delete("/:id/banner-images", circuitController.deleteBanner);
router.post("/:id/highlights", imageUploadMiddleware.array("images", 15), circuitController.syncHighlights);

// ── Circuit CRUD ──────────────────────────────────────────────────────────
router.post("/", circuitController.createCircuit);
router.put("/:id", circuitController.updateCircuit);
router.delete("/:id", circuitController.deleteCircuit);

// ── CircuitDay sub-routes ─────────────────────────────────────────────────
router.post("/:id/days", circuitController.addDay);
router.put("/:id/days/:dayId", circuitController.editDay);
router.delete("/:id/days/:dayId", circuitController.removeDay);

// ── CircuitDayTask sub-routes ─────────────────────────────────────────────
router.post("/:id/days/:dayId/tasks", circuitController.addTask);
router.put("/:id/days/:dayId/tasks/:taskId", circuitController.editTask);
router.delete("/:id/days/:dayId/tasks/:taskId", circuitController.removeTask);

export default router;
