import * as inquiryService from "./inquiry.service.js";

export const createInquiry = async (req, res, next) => {
  try {
    const data = req.body;
    // If the user is authenticated, associate the inquiry with them
    if (req.user) {
      data.userId = req.user.id;
    }
    const inquiry = await inquiryService.createInquiry(data);
    res.status(201).json(inquiry);
  } catch (error) {
    next(error);
  }
};

export const getInquiries = async (req, res, next) => {
  try {
    const { page, limit, isResolved } = req.query;
    
    const filter = {};
    if (isResolved !== undefined) {
      filter.isResolved = isResolved === 'true';
    }
    
    const inquiries = await inquiryService.getInquiries(page, limit, filter);
    res.status(200).json(inquiries);
  } catch (error) {
    next(error);
  }
};

export const getInquiryById = async (req, res, next) => {
  try {
    const inquiry = await inquiryService.getInquiryById(req.params.id);
    res.status(200).json(inquiry);
  } catch (error) {
    next(error);
  }
};

export const resolveInquiry = async (req, res, next) => {
  try {
    const { adminNotes } = req.body;
    const inquiry = await inquiryService.resolveInquiry(req.params.id, req.user.id, adminNotes);
    res.status(200).json(inquiry);
  } catch (error) {
    next(error);
  }
};

export const deleteInquiry = async (req, res, next) => {
  try {
    await inquiryService.deleteInquiry(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
