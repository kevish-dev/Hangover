import { Router } from "express";
import * as userController from "./user.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";
import { documentUploadMiddleware } from "../../core/services/upload.service.js";
import "./user.docs.js";

const router = Router();

// All user routes require authentication
router.use(requireAuth);

// "Me" routes - Any authenticated user
router.get("/me/profile", userController.getMyProfile);
router.put("/me/profile", userController.updateMyProfile);
router.post(
  "/me/govt-id",
  documentUploadMiddleware.single("image"),
  userController.uploadGovtId
);

// Admin routes - Only ADMIN role
router.use(requireAdmin);
router.get("/", userController.getUsers);
router.get("/:id", userController.getUserById);
router.put("/:id/profile", userController.updateUserProfile);
router.patch("/:id/status", userController.toggleUserStatus);
router.patch("/:id/role", userController.updateUserRole);
router.delete("/:id", userController.deleteUser);

export default router;
