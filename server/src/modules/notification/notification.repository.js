import { prisma } from "../../prisma/client.js";

export const findAdmins = () =>
  prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true, isActive: true, profile: { select: { fullName: true } } },
    orderBy: { createdAt: "asc" },
  });

export const findRecipientIds = (category) =>
  prisma.notificationRecipient
    .findMany({ where: { category }, select: { userId: true } })
    .then((rows) => rows.map((row) => row.userId));

export const findRecipientEmails = (category) =>
  prisma.notificationRecipient
    .findMany({
      where: { category, user: { isActive: true } },
      select: { user: { select: { email: true } } },
    })
    .then((rows) => rows.map((row) => row.user.email).filter(Boolean));

export const replaceRecipients = (category, userIds) =>
  prisma.$transaction([
    prisma.notificationRecipient.deleteMany({ where: { category } }),
    ...(userIds.length
      ? [prisma.notificationRecipient.createMany({ data: userIds.map((userId) => ({ category, userId })) })]
      : []),
  ]);
