import { prisma } from "../../prisma/client.js";

// ── Full Circuit include shape (reused across queries) ────────────────────
const CIRCUIT_FULL_INCLUDE = {
  destination: true,
  createdBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
  days: {
    orderBy: { dayNumber: "asc" },
    include: {
      tasks: { orderBy: { createdAt: "asc" } },
    },
  },
  packages: true,
  faqs: { orderBy: { order: "asc" } },
  tags: true,
  addOns: { where: { isActive: true } },
};

// ── List ──────────────────────────────────────────────────────────────────
export const findAll = async (skip, take, filter = {}) => {
  const [circuits, total] = await Promise.all([
    prisma.circuit.findMany({
      where: filter,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        destination: true,
        tags: true,
        _count: { select: { days: true, trips: true } },
      },
    }),
    prisma.circuit.count({ where: filter }),
  ]);
  return { circuits, total };
};

// ── Single ────────────────────────────────────────────────────────────────
export const findById = async (id) => {
  return prisma.circuit.findUnique({
    where: { id },
    include: CIRCUIT_FULL_INCLUDE,
  });
};

export const findBySlug = async (slug) => {
  return prisma.circuit.findUnique({
    where: { slug },
    include: CIRCUIT_FULL_INCLUDE,
  });
};

// ── Create (full nested write) ────────────────────────────────────────────
export const create = async ({ days, packages, addOns, tagIds, ...rootData }) => {
  return prisma.circuit.create({
    data: {
      ...rootData,
      days: {
        create: days.map(({ tasks, ...dayData }) => ({
          ...dayData,
          tasks: { create: tasks },
        })),
      },
      packages: { create: packages },
      addOns: { create: addOns },
      tags: tagIds?.length ? { connect: tagIds.map((id) => ({ id })) } : undefined,
    },
    include: CIRCUIT_FULL_INCLUDE,
  });
};

// ── Update root fields only ───────────────────────────────────────────────
export const update = async (
  id,
  { tagIds, days, packages, addOns, ...data },
) => {
  return prisma.$transaction(async (tx) => {
    await tx.circuit.update({
      where: { id },
      data: {
        ...data,
        ...(tagIds !== undefined && {
          tags: { set: tagIds.map((tagId) => ({ id: tagId })) },
        }),
      },
    });

    if (packages !== undefined) {
      const existing = await tx.package.findMany({ where: { circuitId: id } });
      const existingIds = new Set(existing.map((item) => item.id));
      const incomingIds = packages.map((item) => item.id).filter(Boolean);
      if (incomingIds.some((packageId) => !existingIds.has(packageId))) {
        throw new Error("One or more packages do not belong to this circuit");
      }
      const removedIds = existing
        .filter((item) => !incomingIds.includes(item.id))
        .map((item) => item.id);
      if (removedIds.length) {
        const usedPackage = await tx.booking.findFirst({
          where: { packageId: { in: removedIds } },
          select: { id: true },
        });
        if (usedPackage) throw new Error("Cannot delete a package used by a booking");
        await tx.package.deleteMany({ where: { id: { in: removedIds } } });
      }
      for (const item of packages) {
        const values = {
          title: item.title,
          price: item.price,
          tokenAmount: item.tokenAmount,
        };
        if (item.id) {
          await tx.package.update({ where: { id: item.id }, data: values });
        } else {
          await tx.package.create({ data: { ...values, circuitId: id } });
        }
      }
    }

    if (addOns !== undefined) {
      const existing = await tx.addOn.findMany({ where: { circuitId: id } });
      const existingIds = new Set(existing.map((item) => item.id));
      const incomingIds = addOns.map((item) => item.id).filter(Boolean);
      if (incomingIds.some((addOnId) => !existingIds.has(addOnId))) {
        throw new Error("One or more add-ons do not belong to this circuit");
      }
      const removedIds = existing
        .filter((item) => !incomingIds.includes(item.id))
        .map((item) => item.id);
      if (removedIds.length) {
        const usedAddOn = await tx.bookingAddOn.findFirst({
          where: { addOnId: { in: removedIds } },
          select: { id: true },
        });
        if (usedAddOn) throw new Error("Cannot delete an add-on used by a booking");
        await tx.addOn.deleteMany({ where: { id: { in: removedIds } } });
      }
      for (const item of addOns) {
        const values = {
          title: item.title,
          description: item.description || null,
          imageUrl: item.imageUrl || null,
          price: item.price,
          maxQuantityPerBooking: item.maxQuantityPerBooking || null,
          purchaseCutoffOffsetDays: item.purchaseCutoffOffsetDays ?? null,
          isActive: item.isActive ?? true,
        };
        if (item.id) {
          await tx.addOn.update({ where: { id: item.id }, data: values });
        } else {
          await tx.addOn.create({ data: { ...values, circuitId: id } });
        }
      }
    }

    if (days !== undefined) {
      const existingDays = await tx.circuitDay.findMany({
        where: { circuitId: id },
        include: { tasks: true },
      });
      const existingDayIds = new Set(existingDays.map((item) => item.id));
      const incomingDayIds = days.map((item) => item.id).filter(Boolean);
      if (incomingDayIds.some((dayId) => !existingDayIds.has(dayId))) {
        throw new Error("One or more itinerary days do not belong to this circuit");
      }
      const removedDayIds = existingDays
        .filter((item) => !incomingDayIds.includes(item.id))
        .map((item) => item.id);
      if (removedDayIds.length) {
        await tx.circuitDay.deleteMany({ where: { id: { in: removedDayIds } } });
      }

      for (const day of days) {
        const dayValues = {
          dayNumber: day.dayNumber,
          title: day.title,
          description: day.description || null,
          todos: day.todos || [],
        };
        let dayId = day.id;
        if (dayId) {
          await tx.circuitDay.update({ where: { id: dayId }, data: dayValues });
        } else {
          const created = await tx.circuitDay.create({
            data: { ...dayValues, circuitId: id },
          });
          dayId = created.id;
        }

        const incomingTasks = day.tasks || [];
        const existingTasks = day.id
          ? existingDays.find((item) => item.id === day.id)?.tasks || []
          : [];
        const existingTaskIds = new Set(existingTasks.map((item) => item.id));
        const incomingTaskIds = incomingTasks.map((item) => item.id).filter(Boolean);
        if (incomingTaskIds.some((taskId) => !existingTaskIds.has(taskId))) {
          throw new Error("One or more tasks do not belong to this itinerary day");
        }
        const removedTaskIds = existingTasks
          .filter((item) => !incomingTaskIds.includes(item.id))
          .map((item) => item.id);
        if (removedTaskIds.length) {
          await tx.circuitDayTask.deleteMany({ where: { id: { in: removedTaskIds } } });
        }
        for (const task of incomingTasks) {
          const taskValues = {
            category: task.category,
            title: task.title,
            description: task.description || null,
            config: task.config || {},
            estimatedAmount: task.estimatedAmount ?? null,
            dueOffsetDays: task.dueOffsetDays ?? null,
          };
          if (task.id) {
            await tx.circuitDayTask.update({ where: { id: task.id }, data: taskValues });
          } else {
            await tx.circuitDayTask.create({
              data: { ...taskValues, circuitDayId: dayId },
            });
          }
        }
      }
    }

    return tx.circuit.findUnique({
      where: { id },
      include: CIRCUIT_FULL_INCLUDE,
    });
  });
};

// ── Delete ────────────────────────────────────────────────────────────────
export const remove = async (id) => {
  return prisma.circuit.delete({ where: { id } });
};

// ═══════════════════════════════════════════════════════════════════════════
// CircuitDay sub-resource
// ═══════════════════════════════════════════════════════════════════════════
export const createDay = async (circuitId, { tasks, ...dayData }) => {
  return prisma.circuitDay.create({
    data: {
      ...dayData,
      circuitId,
      tasks: { create: tasks ?? [] },
    },
    include: { tasks: true },
  });
};

export const updateDay = async (dayId, data) => {
  return prisma.circuitDay.update({
    where: { id: dayId },
    data,
    include: { tasks: true },
  });
};

export const removeDay = async (dayId) => {
  return prisma.circuitDay.delete({ where: { id: dayId } });
};

// ═══════════════════════════════════════════════════════════════════════════
// CircuitDayTask sub-resource
// ═══════════════════════════════════════════════════════════════════════════
export const createTask = async (circuitDayId, data) => {
  return prisma.circuitDayTask.create({ data: { ...data, circuitDayId } });
};

export const updateTask = async (taskId, data) => {
  return prisma.circuitDayTask.update({ where: { id: taskId }, data });
};

export const removeTask = async (taskId) => {
  return prisma.circuitDayTask.delete({ where: { id: taskId } });
};
