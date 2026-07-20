import * as invoiceService from "./invoice.service.js";

export const createInvoice = async (req, res, next) => {
  try {
    const invoice = await invoiceService.createInvoice(req.body);
    res.status(201).json({ status: "success", data: invoice });
  } catch (error) {
    next(error);
  }
};

export const getInvoices = async (req, res, next) => {
  try {
    const invoices = await invoiceService.getInvoices();
    res.status(200).json({ status: "success", data: invoices });
  } catch (error) {
    next(error);
  }
};

export const updateInvoiceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const invoice = await invoiceService.updateInvoiceStatus(id, status);
    res.status(200).json({ status: "success", data: invoice });
  } catch (error) {
    next(error);
  }
};
