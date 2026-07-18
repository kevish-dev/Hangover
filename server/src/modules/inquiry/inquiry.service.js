import * as repo from "./inquiry.repository.js";
import { createInquirySchema } from "./inquiry.validation.js";
import { sendNewInquiryNotificationEmail } from "../../core/services/email.service.js";

export const createInquiry = async (data) => {
  const parsed = createInquirySchema.parse(data);
  const inquiry = await repo.createInquiry(parsed);
  sendNewInquiryNotificationEmail({ ...parsed, inquiryId: inquiry.id })
    .catch((error) => console.error("[Email] Failed to send inquiry notification:", error));
  return inquiry;
};

export const getInquiries = async (page = 1, limit = 10, filter = {}) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit, 10);
  
  const { inquiries, total } = await repo.getInquiries(skip, take, filter);
  
  return {
    data: inquiries,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take)
    }
  };
};

export const getInquiryById = async (id) => {
  const inquiry = await repo.getInquiryById(id);
  if (!inquiry) {
    const error = new Error("Inquiry not found");
    error.statusCode = 404;
    throw error;
  }
  return inquiry;
};

export const resolveInquiry = async (id, adminId, adminNotes) => {
  await getInquiryById(id);
  
  const updateData = {
    isResolved: true,
    resolvedAt: new Date(),
    resolvedById: adminId,
  };
  
  if (adminNotes !== undefined) {
    updateData.adminNotes = adminNotes;
  }
  
  return repo.updateInquiry(id, updateData);
};

export const deleteInquiry = async (id) => {
  await getInquiryById(id);
  return repo.deleteInquiry(id);
};
