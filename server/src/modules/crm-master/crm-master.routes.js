import { Router } from "express";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";
import { validateBody } from "./crm-master.validation.js";

export const createCrudRoutes = (controller, { createSchema, updateSchema } = {}) => {
  const router = Router();
  router.use(requireAuth, requireAdmin);
  router.get("/", controller.list);
  router.get("/:id", controller.get);
  router.post("/", ...(createSchema ? [validateBody(createSchema, controller.create)] : [controller.create]));
  router.patch("/:id", ...(updateSchema ? [validateBody(updateSchema, controller.update)] : [controller.update]));
  router.delete("/:id", controller.remove);
  return router;
};
