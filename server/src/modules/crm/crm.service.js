import * as repo from "./crm.repository.js";
import {
  contactListQuerySchema,
  createActivitySchema,
  createContactSchema,
  createLeadSchema,
  createTaskSchema,
  leadListQuerySchema,
  taskListQuerySchema,
  updateContactSchema,
  updateLeadSchema,
  updateTaskSchema,
} from "./crm.validation.js";
import { compactTags, normalizeEmail, normalizePhone, nullableText } from "./crm.utils.js";
import { ConflictError, NotFoundError, ValidationError } from "../../core/errors/errors.js";

const requireAdminReference = async (id, label) => {
  if (!id) return;
  if (!(await repo.findAdminById(id))) {
    throw new ValidationError(`${label} must reference an active admin.`);
  }
};

const requireUserReference = async (id) => {
  if (!id) return;
  const user = await repo.findUserById(id);
  if (!user) throw new ValidationError("Registered user does not exist.");
};

const validateInterestReferences = async ({ tripId, festivalId }) => {
  if (tripId && festivalId) {
    throw new ValidationError("A CRM record can reference a trip or a festival, not both.");
  }
  if (tripId && !(await repo.findTripById(tripId))) {
    throw new ValidationError("Selected trip does not exist.");
  }
  if (festivalId && !(await repo.findFestivalById(festivalId))) {
    throw new ValidationError("Selected festival does not exist.");
  }
};

const requireContact = async (id) => {
  const contact = await repo.findContactById(id);
  if (!contact) throw new NotFoundError("CRM contact not found.");
  return contact;
};

const validateBookingForContact = async (contact, bookingId) => {
  if (!bookingId) return contact;
  const booking = await repo.findBookingIdentity(bookingId);
  if (!booking) throw new ValidationError("Selected booking does not exist.");
  if (contact.userId && contact.userId !== booking.userId) {
    throw new ValidationError("The booking belongs to a different CRM contact.");
  }
  if (!contact.userId) {
    const emailMatches = contact.normalizedEmail
      && contact.normalizedEmail === normalizeEmail(booking.user.email);
    const phoneMatches = contact.normalizedPhone
      && contact.normalizedPhone === normalizePhone(booking.user.profile?.phone);
    if (!emailMatches && !phoneMatches) {
      throw new ValidationError("The booking customer does not match this CRM contact.");
    }
    return repo.updateContact(contact.id, { userId: booking.userId });
  }
  return contact;
};

const contactData = (data) => ({
  displayName: data.displayName,
  email: data.email || null,
  normalizedEmail: normalizeEmail(data.email),
  phone: data.phone || null,
  normalizedPhone: normalizePhone(data.phone),
  source: data.source,
  tags: compactTags(data.tags),
  userId: data.userId || null,
});

const assertUniqueContactLinks = async ({ normalizedEmail, userId }, currentId) => {
  const [byEmail, byUser] = await Promise.all([
    repo.findContactByNormalizedEmail(normalizedEmail),
    repo.findContactByUserId(userId),
  ]);
  if (byEmail && byEmail.id !== currentId) {
    throw new ConflictError("A CRM contact already exists for this email address.");
  }
  if (byUser && byUser.id !== currentId) {
    throw new ConflictError("This registered user is already linked to another CRM contact.");
  }
};

export const listContacts = (query) => repo.listContacts(contactListQuerySchema.parse(query));

export const getContact = async (id) => {
  const contact = await repo.getContact(id);
  if (!contact) throw new NotFoundError("CRM contact not found.");
  return contact;
};

export const createContact = async (input) => {
  const parsed = createContactSchema.parse(input);
  const data = contactData(parsed);
  await requireUserReference(data.userId);
  await assertUniqueContactLinks(data);
  return repo.createContact(data);
};

export const updateContact = async (id, input) => {
  const existing = await requireContact(id);
  const parsed = updateContactSchema.parse(input);
  await requireUserReference(parsed.userId);
  const data = {};
  if (parsed.displayName !== undefined) data.displayName = parsed.displayName;
  if (parsed.email !== undefined) {
    data.email = parsed.email;
    data.normalizedEmail = normalizeEmail(parsed.email);
  }
  if (parsed.phone !== undefined) {
    data.phone = parsed.phone;
    data.normalizedPhone = normalizePhone(parsed.phone);
  }
  if (parsed.source !== undefined) data.source = parsed.source;
  if (parsed.tags !== undefined) data.tags = compactTags(parsed.tags);
  if (parsed.userId !== undefined) data.userId = parsed.userId;
  if (parsed.archived !== undefined) data.archivedAt = parsed.archived ? new Date() : null;

  await assertUniqueContactLinks({
    normalizedEmail: data.normalizedEmail !== undefined ? data.normalizedEmail : existing.normalizedEmail,
    userId: data.userId !== undefined ? data.userId : existing.userId,
  }, id);
  return repo.updateContact(id, data);
};

export const listLeads = (query) => repo.listLeads(leadListQuerySchema.parse(query));

export const getLead = async (id) => {
  const lead = await repo.getLead(id);
  if (!lead) throw new NotFoundError("CRM lead not found.");
  return lead;
};

export const createLead = async (input, adminId) => {
  const parsed = createLeadSchema.parse(input);
  await requireAdminReference(parsed.ownerId, "Lead owner");
  await validateInterestReferences(parsed);

  let contactId = parsed.contactId;
  let contact;
  if (contactId) {
    contact = await requireContact(contactId);
  } else {
    const normalizedEmail = normalizeEmail(parsed.email);
    const existing = await repo.findContactByNormalizedEmail(normalizedEmail);
    if (existing) {
      contact = existing;
      contactId = existing.id;
    } else {
      contact = await repo.createContact({
        displayName: parsed.displayName,
        email: parsed.email || null,
        normalizedEmail,
        phone: parsed.phone || null,
        normalizedPhone: normalizePhone(parsed.phone),
        source: parsed.source,
        tags: compactTags(parsed.tags),
      });
      contactId = contact.id;
    }
  }
  contact = await validateBookingForContact(contact, parsed.bookingId);

  return repo.createLead({
    contactId,
    source: parsed.source,
    stage: parsed.stage,
    tripId: parsed.tripId,
    festivalId: parsed.festivalId,
    tripType: parsed.tripType,
    bookingId: parsed.bookingId,
    title: nullableText(parsed.title),
    details: nullableText(parsed.details),
    ownerId: parsed.ownerId,
    nextFollowUpAt: parsed.nextFollowUpAt,
    lostReason: nullableText(parsed.lostReason),
    convertedAt: parsed.stage === "CONVERTED" ? new Date() : null,
    createdById: adminId,
  });
};

export const updateLead = async (id, input, adminId) => {
  const existing = await getLead(id);
  const parsed = updateLeadSchema.parse(input);
  await requireAdminReference(parsed.ownerId, "Lead owner");
  await validateInterestReferences({
    tripId: parsed.tripId === undefined ? existing.tripId : parsed.tripId,
    festivalId: parsed.festivalId === undefined ? existing.festivalId : parsed.festivalId,
  });

  const nextStage = parsed.stage || existing.stage;
  const nextBookingId = parsed.bookingId === undefined ? existing.bookingId : parsed.bookingId;
  const nextLostReason = parsed.lostReason === undefined ? existing.lostReason : parsed.lostReason;
  if (nextStage === "CONVERTED" && !nextBookingId) {
    throw new ValidationError("A booking is required for converted leads.");
  }
  if (nextStage === "LOST" && !nextLostReason) {
    throw new ValidationError("A lost reason is required for lost leads.");
  }
  await validateBookingForContact(existing.contact, nextBookingId);

  const data = {};
  for (const key of ["stage", "tripId", "festivalId", "tripType", "bookingId", "ownerId", "nextFollowUpAt"]) {
    if (parsed[key] !== undefined) data[key] = parsed[key];
  }
  for (const key of ["title", "details", "lostReason"]) {
    if (parsed[key] !== undefined) data[key] = nullableText(parsed[key]);
  }
  if (parsed.archived !== undefined) data.archivedAt = parsed.archived ? new Date() : null;
  if (parsed.stage === "CONVERTED" && existing.stage !== "CONVERTED") data.convertedAt = new Date();
  if (parsed.stage && parsed.stage !== "CONVERTED") data.convertedAt = null;
  if (parsed.stage && parsed.stage !== "LOST" && parsed.lostReason === undefined) data.lostReason = null;

  const stageChanged = parsed.stage && parsed.stage !== existing.stage;
  return repo.updateLead(id, data, stageChanged ? {
    type: "STATUS_CHANGE",
    summary: `Lead moved from ${existing.stage} to ${parsed.stage}`,
    createdById: adminId,
  } : null);
};

export const createActivity = async (input, adminId) => {
  const parsed = createActivitySchema.parse(input);
  const contact = await requireContact(parsed.contactId);
  if (parsed.leadId) {
    const lead = await getLead(parsed.leadId);
    if (lead.contactId !== parsed.contactId) {
      throw new ValidationError("The lead does not belong to the selected contact.");
    }
  }
  await validateBookingForContact(contact, parsed.bookingId);
  return repo.createActivity({
    ...parsed,
    details: nullableText(parsed.details),
    createdById: adminId,
  });
};

export const listTasks = (query) => repo.listTasks(taskListQuerySchema.parse(query));

export const createTask = async (input, adminId) => {
  const parsed = createTaskSchema.parse(input);
  let contact = parsed.contactId ? await requireContact(parsed.contactId) : null;
  await requireAdminReference(parsed.assigneeId, "Task assignee");
  if (parsed.leadId) {
    const lead = await getLead(parsed.leadId);
    if (contact && lead.contactId !== contact.id) {
      throw new ValidationError("The lead does not belong to the selected contact.");
    }
    contact ||= lead.contact;
  }
  let booking = null;
  if (parsed.bookingId) {
    booking = await repo.findBookingIdentity(parsed.bookingId);
    if (!booking) throw new ValidationError("Selected booking does not exist.");
    if (contact) contact = await validateBookingForContact(contact, parsed.bookingId);
  }
  const hotel = parsed.hotelReservationId ? await repo.findHotelById(parsed.hotelReservationId) : null;
  if (parsed.hotelReservationId && !hotel) throw new ValidationError("Selected hotel reservation does not exist.");
  if (hotel && booking && hotel.bookingId !== booking.id) throw new ValidationError("The hotel reservation belongs to a different booking.");
  if (!booking && hotel) booking = { id: hotel.bookingId, ...hotel.booking };

  const slot = parsed.slotId ? await repo.findSlotById(parsed.slotId) : null;
  if (parsed.slotId && !slot) throw new ValidationError("Selected departure does not exist.");
  if (slot && booking && slot.id !== booking.slotId) throw new ValidationError("The departure belongs to a different booking.");
  await validateInterestReferences({ tripId: parsed.tripId, festivalId: parsed.festivalId });

  const resolvedSlotId = parsed.slotId || booking?.slotId || null;
  const resolvedTripId = parsed.tripId || booking?.tripId || booking?.slot?.tripId || slot?.tripId || null;
  const resolvedFestivalId = parsed.festivalId || booking?.festivalId || booking?.slot?.festivalId || slot?.festivalId || null;
  if (resolvedTripId && resolvedFestivalId) throw new ValidationError("An operational task cannot reference both a trip and a festival.");
  if (parsed.tripId && slot?.tripId && parsed.tripId !== slot.tripId) throw new ValidationError("The task trip does not match the selected departure.");
  if (parsed.festivalId && slot?.festivalId && parsed.festivalId !== slot.festivalId) throw new ValidationError("The task festival does not match the selected departure.");
  const resolvedContactId = contact?.id || booking?.user?.crmContact?.id || hotel?.booking?.user?.crmContact?.id || null;
  return repo.createTask({
    ...parsed,
    contactId: resolvedContactId,
    bookingId: booking?.id || parsed.bookingId || null,
    slotId: resolvedSlotId,
    tripId: resolvedTripId,
    festivalId: resolvedFestivalId,
    description: nullableText(parsed.description),
    createdById: adminId,
  });
};

export const updateTask = async (id, input, adminId) => {
  const existing = await repo.getTask(id);
  if (!existing) throw new NotFoundError("CRM task not found.");
  const parsed = updateTaskSchema.parse(input);
  await requireAdminReference(parsed.assigneeId, "Task assignee");
  const data = { ...parsed };
  delete data.archived;
  if (parsed.description !== undefined) data.description = nullableText(parsed.description);
  if (parsed.archived !== undefined) data.archivedAt = parsed.archived ? new Date() : null;
  if (parsed.status === "DONE" && existing.status !== "DONE") {
    data.completedAt = new Date();
    data.completedById = adminId;
  } else if (parsed.status && parsed.status !== "DONE") {
    data.completedAt = null;
    data.completedById = null;
  }
  return repo.updateTask(id, data);
};

export const captureWebsiteInquiry = async (data) => {
  await validateInterestReferences(data);
  return repo.createInquiryWithCrm(data);
};
export const syncRegisteredUserContact = (user) => repo.syncRegisteredUserContact(user);
export const backfillCrm = (options) => repo.backfillCrm(options);
