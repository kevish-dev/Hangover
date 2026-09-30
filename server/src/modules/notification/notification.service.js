import * as notificationRepo from "./notification.repository.js";
import { ValidationError } from "../../core/errors/errors.js";

export const CATEGORIES = [
  {
    key: "OPERATIONS_REMINDER",
    label: "Operations reminders",
    description: "Daily alerts for overdue or upcoming operational tasks tied to bookings.",
    defaultNote: "No one is selected, so these emails are not sent to anyone.",
  },
  {
    key: "NEW_INQUIRY",
    label: "New inquiries",
    description: "Sent as soon as a visitor submits a website inquiry form.",
    defaultNote: "No admin is selected, so these go to the support inbox only.",
  },
];

const CATEGORY_KEYS = new Set(CATEGORIES.map((category) => category.key));

const serializeAdmin = (admin) => ({
  id: admin.id,
  email: admin.email,
  fullName: admin.profile?.fullName || null,
  isActive: admin.isActive,
});

export const getSettings = async () => {
  const admins = await notificationRepo.findAdmins();
  const recipients = {};
  for (const category of CATEGORIES) {
    recipients[category.key] = await notificationRepo.findRecipientIds(category.key);
  }
  return {
    admins: admins.map(serializeAdmin),
    categories: CATEGORIES,
    recipients,
  };
};

export const updateRecipients = async (category, userIds) => {
  if (!CATEGORY_KEYS.has(category)) {
    throw new ValidationError("Unknown notification category.");
  }
  if (!Array.isArray(userIds)) {
    throw new ValidationError("userIds must be an array.");
  }
  const admins = await notificationRepo.findAdmins();
  const validAdminIds = new Set(admins.map((admin) => admin.id));
  const uniqueValidIds = [...new Set(userIds)].filter((id) => validAdminIds.has(id));
  await notificationRepo.replaceRecipients(category, uniqueValidIds);
  return uniqueValidIds;
};

/** Emails of active recipients explicitly selected for a category. */
export const getConfiguredRecipientEmails = (category) => notificationRepo.findRecipientEmails(category);
