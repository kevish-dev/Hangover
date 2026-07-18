import * as faqService from "./faq.service.js";

export const getFaqs = async (req, res, next) => {
  try {
    const { tripId, festivalId } = req.params;
    const parent = tripId ? { tripId } : festivalId ? { festivalId } : {};
    const faqs = await faqService.getFaqsByParent(parent);
    res.status(200).json(faqs);
  } catch (error) {
    next(error);
  }
};

export const getFaqById = async (req, res, next) => {
  try {
    const faq = await faqService.getFaqById(req.params.id);
    res.status(200).json(faq);
  } catch (error) {
    if (error.message === "FAQ not found") {
      return res.status(404).json({ message: "FAQ not found" });
    }
    next(error);
  }
};

export const createFaq = async (req, res, next) => {
  try {
    const { tripId, festivalId } = req.params;
    const parent = tripId ? { tripId } : festivalId ? { festivalId } : {};
    const faq = await faqService.createFaq(parent, req.body);
    res.status(201).json({ message: "FAQ created successfully", faq });
  } catch (error) {
    next(error);
  }
};

export const updateFaq = async (req, res, next) => {
  try {
    const faq = await faqService.updateFaq(req.params.id, req.body);
    res.status(200).json({ message: "FAQ updated successfully", faq });
  } catch (error) {
    next(error);
  }
};

export const deleteFaq = async (req, res, next) => {
  try {
    await faqService.deleteFaq(req.params.id);
    res.status(200).json({ message: "FAQ deleted successfully" });
  } catch (error) {
    next(error);
  }
};
