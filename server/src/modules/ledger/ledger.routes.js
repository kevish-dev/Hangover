import { Router } from "express";
import * as ledgerController from "./ledger.controller.js";
import { requireAuth, requireAdmin } from "../../core/middlewares/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", requireAdmin, ledgerController.getUnifiedLedger);
router.get("/trip-options", requireAdmin, ledgerController.getTripOptions);
router.post("/entries", requireAdmin, ledgerController.addManualEntry);
router.patch("/entries/:entryId", requireAdmin, ledgerController.updateManualEntry);
router.delete("/entries/:entryId", requireAdmin, ledgerController.deleteManualEntry);
router.get("/bookings/:bookingId/balance-sheet", requireAdmin, ledgerController.getBalanceSheet);
router.post("/bookings/:bookingId/balance-sheet/entries", requireAdmin, ledgerController.addLedgerEntry);
router.delete("/bookings/:bookingId/balance-sheet/entries/:entryId", requireAdmin, ledgerController.deleteLedgerEntry);

export default router;
