import { prisma } from "../../prisma/client.js";
import { normalizeEmail, normalizePhone } from "./crm.utils.js";

const contactUserSelect = {
  id: true,
  email: true,
  isActive: true,
  profile: {
    select: {
      fullName: true,
      phone: true,
      city: true,
      state: true,
      country: true,
    },
  },
};

const leadInclude = {
  contact: { include: { user: { select: contactUserSelect } } },
  inquiry: true,
  trip: { select: { id: true, title: true, slug: true, location: true } },
  festival: { select: { id: true, title: true, slug: true, location: true } },
  booking: {
    select: {
      id: true,
      bookingReference: true,
      status: true,
      paymentStatus: true,
      totalAmount: true,
      amountPaid: true,
      amountDue: true,
    },
  },
};

const archiveFilter = (archived) => {
  if (archived === "all") return {};
  return { archivedAt: archived === "true" ? { not: null } : null };
};

const paginated = (data, total, page, limit) => ({
  data,
  meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
});

export const findAdminById = (id) =>
  prisma.user.findFirst({ where: { id, role: "ADMIN", isActive: true }, select: { id: true } });

export const findUserById = (id) =>
  id ? prisma.user.findUnique({ where: { id }, select: { id: true, isActive: true } }) : null;

export const findTripById = (id) =>
  id ? prisma.trip.findUnique({ where: { id }, select: { id: true } }) : null;

export const findFestivalById = (id) =>
  id ? prisma.festival.findUnique({ where: { id }, select: { id: true } }) : null;

export const findSlotById = (id) =>
  id ? prisma.slot.findUnique({ where: { id }, select: { id: true, tripId: true, festivalId: true } }) : null;

export const findHotelById = (id) =>
  id ? prisma.hotelReservation.findUnique({
    where: { id },
    select: {
      id: true,
      bookingId: true,
      booking: {
        select: {
          slotId: true,
          tripId: true,
          festivalId: true,
          slot: { select: { tripId: true, festivalId: true } },
          user: { select: { crmContact: { select: { id: true } } } },
        },
      },
    },
  }) : null;

export const findBookingIdentity = (id) =>
  id ? prisma.booking.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      slotId: true,
      tripId: true,
      festivalId: true,
      slot: { select: { tripId: true, festivalId: true } },
      user: { select: { email: true, profile: { select: { phone: true } }, crmContact: { select: { id: true } } } },
    },
  }) : null;

export const findContactById = (id) =>
  prisma.crmContact.findUnique({ where: { id } });

export const findContactByNormalizedEmail = (normalizedEmail) =>
  normalizedEmail
    ? prisma.crmContact.findUnique({ where: { normalizedEmail } })
    : null;

export const findContactByUserId = (userId) =>
  userId ? prisma.crmContact.findUnique({ where: { userId } }) : null;

export const listContacts = async ({ page, limit, q, source, archived }) => {
  const where = {
    ...archiveFilter(archived),
    ...(source && { source }),
    ...(q && {
      OR: [
        { displayName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { normalizedPhone: { contains: normalizePhone(q) || q } },
      ],
    }),
  };
  const [contacts, total] = await Promise.all([
    prisma.crmContact.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: contactUserSelect },
        _count: { select: { leads: true, activities: true, tasks: true } },
      },
    }),
    prisma.crmContact.count({ where }),
  ]);
  return paginated(contacts, total, page, limit);
};

export const getContact = (id) =>
  prisma.crmContact.findUnique({
    where: { id },
    include: {
      user: { select: contactUserSelect },
      leads: { orderBy: { createdAt: "desc" }, include: leadInclude },
      activities: { orderBy: { createdAt: "desc" }, take: 100 },
      tasks: { orderBy: [{ status: "asc" }, { dueAt: "asc" }], take: 100 },
    },
  });

export const createContact = (data) => prisma.crmContact.create({ data });

export const updateContact = (id, data) =>
  prisma.crmContact.update({ where: { id }, data });

export const syncRegisteredUserContact = async ({ id, email, fullName, phone }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  return prisma.$transaction(async (tx) => {
    let contact = await tx.crmContact.findUnique({ where: { userId: id } });
    if (!contact && normalizedEmail) {
      contact = await tx.crmContact.findUnique({ where: { normalizedEmail } });
    }
    if (contact?.userId && contact.userId !== id) {
      return { contact: null, conflict: true };
    }
    if (contact) {
      const updated = await tx.crmContact.update({
        where: { id: contact.id },
        data: {
          userId: id,
          email: contact.email || email,
          normalizedEmail: contact.normalizedEmail || normalizedEmail,
          phone: contact.phone || phone || null,
          normalizedPhone: contact.normalizedPhone || normalizedPhone,
          displayName: contact.displayName || fullName || email,
        },
      });
      return { contact: updated, conflict: false };
    }
    const created = await tx.crmContact.create({
      data: {
        userId: id,
        displayName: fullName || email,
        email,
        normalizedEmail,
        phone: phone || null,
        normalizedPhone,
        source: "WEBSITE",
      },
    });
    return { contact: created, conflict: false };
  });
};

export const listLeads = async ({ page, limit, q, stage, source, ownerId, tripId, festivalId, archived }) => {
  const where = {
    ...archiveFilter(archived),
    ...(stage && { stage }),
    ...(source && { source }),
    ...(ownerId && { ownerId }),
    ...(tripId && { tripId }),
    ...(festivalId && { festivalId }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { details: { contains: q, mode: "insensitive" } },
        { contact: { displayName: { contains: q, mode: "insensitive" } } },
        { contact: { email: { contains: q, mode: "insensitive" } } },
        { contact: { phone: { contains: q } } },
        { trip: { title: { contains: q, mode: "insensitive" } } },
        { festival: { title: { contains: q, mode: "insensitive" } } },
      ],
    }),
  };
  const [leads, total] = await Promise.all([
    prisma.crmLead.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: leadInclude,
    }),
    prisma.crmLead.count({ where }),
  ]);
  return paginated(leads, total, page, limit);
};

export const getLead = (id) =>
  prisma.crmLead.findUnique({
    where: { id },
    include: {
      ...leadInclude,
      activities: { orderBy: { createdAt: "desc" }, take: 100 },
      tasks: { orderBy: [{ status: "asc" }, { dueAt: "asc" }], take: 100 },
    },
  });

export const createLead = (data) =>
  prisma.$transaction(async (tx) => {
    const lead = await tx.crmLead.create({ data });
    await tx.crmActivity.create({
      data: {
        contactId: lead.contactId,
        leadId: lead.id,
        bookingId: lead.bookingId,
        type: "SYSTEM",
        summary: "Lead created",
        createdById: lead.createdById,
      },
    });
    return tx.crmLead.findUnique({ where: { id: lead.id }, include: leadInclude });
  });

export const updateLead = (id, data, activity) =>
  prisma.$transaction(async (tx) => {
    const lead = await tx.crmLead.update({ where: { id }, data });
    if (activity) {
      await tx.crmActivity.create({
        data: {
          contactId: lead.contactId,
          leadId: lead.id,
          bookingId: lead.bookingId,
          ...activity,
        },
      });
    }
    return tx.crmLead.findUnique({ where: { id }, include: leadInclude });
  });

export const createActivity = (data) => prisma.crmActivity.create({ data });

export const listTasks = async ({ page, limit, q, status, priority, category, assigneeId, contactId, leadId, bookingId, tripId, festivalId, slotId, hotelReservationId, dueFrom, dueTo, archived }) => {
  const where = {
    ...archiveFilter(archived),
    ...(status && { status }),
    ...(priority && { priority }),
    ...(category && { category }),
    ...(assigneeId && { assigneeId }),
    ...(contactId && { contactId }),
    ...(leadId && { leadId }),
    ...(bookingId && { bookingId }),
    ...(tripId && { tripId }),
    ...(festivalId && { festivalId }),
    ...(slotId && { slotId }),
    ...(hotelReservationId && { hotelReservationId }),
    ...((dueFrom || dueTo) && { dueAt: { ...(dueFrom && { gte: dueFrom }), ...(dueTo && { lte: dueTo }) } }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { contact: { displayName: { contains: q, mode: "insensitive" } } },
      ],
    }),
  };
  const include = {
    contact: { select: { id: true, displayName: true, email: true, phone: true } },
    lead: { select: { id: true, stage: true, title: true } },
    booking: { select: { id: true, bookingReference: true, status: true, paymentStatus: true } },
    trip: { select: { id: true, title: true, slug: true } },
    festival: { select: { id: true, title: true, slug: true } },
    slot: { select: { id: true, title: true, startDate: true, endDate: true } },
    hotelReservation: { select: { id: true, hotelName: true, status: true, paymentStatus: true } },
  };
  const [tasks, total] = await Promise.all([
    prisma.crmTask.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      include,
    }),
    prisma.crmTask.count({ where }),
  ]);
  return paginated(tasks, total, page, limit);
};

export const getTask = (id) => prisma.crmTask.findUnique({ where: { id } });
export const createTask = (data) => prisma.crmTask.create({ data });
export const updateTask = (id, data) => prisma.crmTask.update({ where: { id }, data });

const updateContactFromInquiry = async (tx, contact, inquiry) => {
  const normalizedEmail = normalizeEmail(inquiry.email);
  const normalizedPhone = normalizePhone(inquiry.phone);
  const update = {};
  if (!contact.userId && inquiry.userId) update.userId = inquiry.userId;
  if (!contact.email) update.email = inquiry.email;
  if (!contact.normalizedEmail && normalizedEmail) update.normalizedEmail = normalizedEmail;
  if (!contact.phone) update.phone = inquiry.phone;
  if (!contact.normalizedPhone && normalizedPhone) update.normalizedPhone = normalizedPhone;
  return Object.keys(update).length
    ? tx.crmContact.update({ where: { id: contact.id }, data: update })
    : contact;
};

const ensureContactForInquiry = async (tx, inquiry) => {
  const normalizedEmail = normalizeEmail(inquiry.email);
  const normalizedPhone = normalizePhone(inquiry.phone);
  let contact = inquiry.userId
    ? await tx.crmContact.findUnique({ where: { userId: inquiry.userId } })
    : null;
  if (!contact && normalizedEmail) {
    contact = await tx.crmContact.upsert({
      where: { normalizedEmail },
      update: {},
      create: {
        userId: inquiry.userId || null,
        displayName: inquiry.name,
        email: inquiry.email,
        normalizedEmail,
        phone: inquiry.phone,
        normalizedPhone,
        source: "WEBSITE",
      },
    });
  }
  if (contact) return updateContactFromInquiry(tx, contact, inquiry);
  return tx.crmContact.create({
    data: {
      userId: inquiry.userId || null,
      displayName: inquiry.name,
      email: inquiry.email,
      normalizedEmail,
      phone: inquiry.phone,
      normalizedPhone,
      source: "WEBSITE",
    },
  });
};

const ensureLeadForInquiry = async (tx, inquiry) => {
  const existing = await tx.crmLead.findUnique({ where: { inquiryId: inquiry.id } });
  if (existing) return existing;
  const contact = await ensureContactForInquiry(tx, inquiry);
  const lead = await tx.crmLead.create({
    data: {
      contactId: contact.id,
      inquiryId: inquiry.id,
      tripId: inquiry.tripId,
      festivalId: inquiry.festivalId,
      tripType: inquiry.tripType,
      source: "WEBSITE",
      stage: "NEW",
      title: inquiry.subject || "Website inquiry",
      details: inquiry.message,
    },
  });
  await tx.crmActivity.create({
    data: {
      contactId: contact.id,
      leadId: lead.id,
      type: "SYSTEM",
      summary: "Website inquiry captured",
      details: `Inquiry ${inquiry.id}`,
    },
  });
  return lead;
};

export const createInquiryWithCrm = (data) =>
  prisma.$transaction(async (tx) => {
    const inquiry = await tx.inquiry.create({ data });
    const lead = await ensureLeadForInquiry(tx, inquiry);
    return { inquiry, leadId: lead.id };
  });

export const backfillCrm = async ({ batchSize = 100 } = {}) => {
  let usersCreated = 0;
  let usersLinked = 0;
  let userConflicts = 0;
  let inquiriesLinked = 0;

  const users = await prisma.user.findMany({
    where: { crmContact: null },
    include: { profile: true },
    orderBy: { createdAt: "asc" },
  });
  for (const user of users) {
    const normalizedEmail = normalizeEmail(user.email);
    const existing = await findContactByNormalizedEmail(normalizedEmail);
    if (existing?.userId && existing.userId !== user.id) {
      userConflicts += 1;
      continue;
    }
    if (existing) {
      await prisma.crmContact.update({
        where: { id: existing.id },
        data: {
          userId: user.id,
          displayName: existing.displayName || user.profile?.fullName || user.email,
          phone: existing.phone || user.profile?.phone,
          normalizedPhone: existing.normalizedPhone || normalizePhone(user.profile?.phone),
        },
      });
      usersLinked += 1;
    } else {
      await prisma.crmContact.create({
        data: {
          userId: user.id,
          displayName: user.profile?.fullName || user.email,
          email: user.email,
          normalizedEmail,
          phone: user.profile?.phone,
          normalizedPhone: normalizePhone(user.profile?.phone),
          source: "WEBSITE",
        },
      });
      usersCreated += 1;
    }
  }

  while (true) {
    const inquiries = await prisma.inquiry.findMany({
      where: { crmLead: null },
      orderBy: { createdAt: "asc" },
      take: batchSize,
    });
    if (inquiries.length === 0) break;
    for (const inquiry of inquiries) {
      await prisma.$transaction((tx) => ensureLeadForInquiry(tx, inquiry));
      inquiriesLinked += 1;
    }
  }

  return { usersCreated, usersLinked, userConflicts, inquiriesLinked };
};
