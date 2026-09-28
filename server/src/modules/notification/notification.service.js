import * as notificationRepo from "./notification.repository.js";
import { ValidationError } from "../../core/errors/errors.js";

export const CATEGORIES = [
  {
    key: "OPERATIONS_REMINDER",
    label: "Operations reminders",
    description: "Hourly alerts for overdue or upcoming operational tasks tied to bookings.",
    defaultNote: "By default, sent to every admin.",
  },
  {
    key: "NEW_INQUIRY",
    label: "New inquiries",
    description: "Sent as soon as a visitor submits a website inquiry form.",
    defaultNote: "By default, sent to the support inbox only.",
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

/** The explicitly configured recipient emails for a category, or [] if none set. */
export const getConfiguredRecipientEmails = (category) => notificationRepo.findRecipientEmails(category);

/**
 * Resolves the recipient email list for a category. Falls back to the
 * pre-existing default behavior when nobody has explicitly configured
 * recipients yet, so unconfigured categories keep working exactly as
 * they did before this settings page existed.
 */
export const resolveRecipientEmails = async (category, { fallback } = {}) => {
  const configured = await getConfiguredRecipientEmails(category);
  if (configured.length) return configured;
  if (typeof fallback === "function") return fallback();
  return [];
};
