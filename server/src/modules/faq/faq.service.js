import * as faqRepo from "./faq.repository.js";

export const getFaqsByParent = async (whereCondition) => {
  return faqRepo.findAllByParent(whereCondition);
};

export const getFaqById = async (id) => {
  const faq = await faqRepo.findById(id);
  if (!faq) throw new Error("FAQ not found");
  return faq;
};

export const createFaq = async (parentRelation, data) => {
  // Can add logic here to automatically calculate the next 'order' if not provided
  return faqRepo.create(parentRelation, data);
};

export const updateFaq = async (id, data) => {
  return faqRepo.update(id, data);
};

export const deleteFaq = async (id) => {
  return faqRepo.remove(id);
};
