import { Router } from "express";
import * as invoiceController from "./invoice.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";

const router = Router();

// Only admins can manage invoices
router.use(requireAuth, requireAdmin);

router.get("/", invoiceController.getInvoices);
router.post("/", invoiceController.createInvoice);
router.patch("/:id/status", invoiceController.updateInvoiceStatus);

export default router;
