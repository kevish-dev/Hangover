import * as ledgerService from "./ledger.service.js";

export const getUnifiedLedger = async (req, res, next) => {
  try {
    res.status(200).json(await ledgerService.getUnifiedLedger(req.query));
  } catch (error) {
    next(error);
  }
};

export const addManualEntry = async (req, res, next) => {
  try {
    res.status(201).json(await ledgerService.addManualLedgerEntry(req.body, req.user.id));
  } catch (error) {
    next(error);
  }
};

export const deleteManualEntry = async (req, res, next) => {
  try {
    await ledgerService.removeManualLedgerEntry(req.params.entryId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const getBalanceSheet = async (req, res, next) => {
  try {
    const result = await ledgerService.getBookingBalanceSheet(req.params.bookingId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const addLedgerEntry = async (req, res, next) => {
  try {
    const entry = await ledgerService.addCustomLedgerEntry(
      req.params.bookingId,
      req.body,
      req.user.id
    );
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
};

export const deleteLedgerEntry = async (req, res, next) => {
  try {
    await ledgerService.removeLedgerEntry(req.params.entryId, req.params.bookingId);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
