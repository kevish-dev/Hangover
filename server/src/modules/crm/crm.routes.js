import { Router } from "express";
import { requireAdmin, requireAuth } from "../../core/middlewares/auth.middleware.js";
import * as crmController from "./crm.controller.js";
import "./crm.docs.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/contacts", crmController.listContacts);
router.post("/contacts", crmController.createContact);
router.get("/contacts/:id", crmController.getContact);
router.patch("/contacts/:id", crmController.updateContact);

router.get("/leads", crmController.listLeads);
router.post("/leads", crmController.createLead);
router.get("/leads/:id", crmController.getLead);
router.patch("/leads/:id", crmController.updateLead);

router.post("/activities", crmController.createActivity);

router.get("/tasks", crmController.listTasks);
router.post("/tasks", crmController.createTask);
router.patch("/tasks/:id", crmController.updateTask);

export default router;

