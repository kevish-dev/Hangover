import * as ledgerService from "./ledger.service.js";

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
