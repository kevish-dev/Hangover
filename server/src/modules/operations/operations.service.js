import { prisma } from "../../prisma/client.js";

/** Generate OperationalTasks for a new booking. Expenses enter the ledger when paid. */
export const generateBookingOperations = async (booking, slot, chosenAddOns = []) => {
  // Determine the circuit this booking belongs to (via trip or festival)
  const isTrip = !!slot.tripId;
  let circuitId = null;
  let circuitReminderDays = 3;

  if (isTrip && slot.trip) {
    circuitId = slot.trip.circuitId;
  } else if (!isTrip && slot.festival) {
    circuitId = slot.festival.circuitId;
  }

  const opsToCreate = [];

  if (circuitId) {
    const circuit = await prisma.circuit.findUnique({
      where: { id: circuitId },
      include: { days: { include: { tasks: true } } }
    });

    if (circuit) {
      circuitReminderDays = circuit.operationsReminderDays ?? 3;

      for (const day of circuit.days) {
        for (const task of day.tasks) {
          // Calculate dueAt: slot start - dueOffsetDays
          const dueAt = task.dueOffsetDays != null && slot.startDate
            ? new Date(new Date(slot.startDate).getTime() - task.dueOffsetDays * 86400000)
            : null;

          opsToCreate.push({
            bookingId: booking.id,
            sourceTemplateId: task.id,
            category: task.category,
            title: task.title,
            description: task.description,
            config: task.config ?? {},
            estimatedAmount: task.estimatedAmount ?? 0,
            dueAt,
          });
        }
      }
    }
  }

  // Generate an ops task for each add-on chosen by the user
  for (const chosenAddon of chosenAddOns) {
    if (!chosenAddon.addOnId) continue;
    const addOn = await prisma.addOn.findUnique({ where: { id: chosenAddon.addOnId } });
    if (!addOn) continue;

    opsToCreate.push({
      bookingId: booking.id,
      addOnId: addOn.id,
      category: "GENERAL",
      title: `Fulfill Add-on: ${addOn.title}`,
      description: addOn.description || null,
      config: {},
      estimatedAmount: Number(addOn.price) * (chosenAddon.quantity || 1),
      dueAt: slot.startDate ?? null,
    });
  }

  if (opsToCreate.length === 0) return;

  // Create all ops tasks
  await prisma.operationalTask.createMany({ data: opsToCreate });

};

const TASK_INCLUDE = {
  booking: {
    select: {
      id: true,
      bookingReference: true,
      status: true,
      paymentStatus: true,
      tripId: true,
      festivalId: true,
      user: { select: { email: true, profile: { select: { fullName: true } } } },
      slot: { select: { id: true, title: true, startDate: true, endDate: true } },
      trip: { select: { id: true, title: true, slug: true } },
      festival: { select: { id: true, title: true, slug: true } },
    },
  },
  itineraryDay: { select: { id: true, dayNumber: true, title: true } },
};

export const listOperationalTasks = async (query = {}) => {
  const where = {};
  if (query.status) where.status = query.status;
  if (query.category) where.category = query.category;
  if (query.bookingId) where.bookingId = query.bookingId;
  if (query.tripId) where.booking = { tripId: query.tripId };
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { booking: { bookingReference: { contains: query.search, mode: "insensitive" } } },
      { booking: { trip: { title: { contains: query.search, mode: "insensitive" } } } },
      { booking: { festival: { title: { contains: query.search, mode: "insensitive" } } } },
    ];
  }
  const limit = Math.min(Math.max(Number(query.limit) || 200, 1), 500);
  return prisma.operationalTask.findMany({
    where,
    include: TASK_INCLUDE,
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });
};

export const updateOperationalTask = async (taskId, input) => {
  const allowed = [
    "status",
    "title",
    "description",
    "estimatedAmount",
    "amountArranged",
    "amountPaid",
    "dueAt",
    "assigneeId",
  ];
  const data = Object.fromEntries(
    allowed.filter((key) => input[key] !== undefined).map((key) => [key, input[key]]),
  );
  if (data.status && !["PENDING", "IN_PROGRESS", "DONE", "CANCELLED", "BLOCKED"].includes(data.status)) {
    const error = new Error("Invalid operational task status");
    error.statusCode = 400;
    throw error;
  }
  for (const field of ["estimatedAmount", "amountArranged", "amountPaid"]) {
    if (data[field] !== undefined) {
      data[field] = Number(data[field]);
      if (!Number.isFinite(data[field]) || data[field] < 0) {
        const error = new Error(`${field} must be zero or greater`);
        error.statusCode = 400;
        throw error;
      }
    }
  }
  if (data.dueAt !== undefined) data.dueAt = data.dueAt ? new Date(data.dueAt) : null;
  if (data.status === "DONE") data.completedAt = new Date();
  if (data.status && data.status !== "DONE") data.completedAt = null;

  return prisma.$transaction(async (tx) => {
    const current = await tx.operationalTask.findUnique({
      where: { id: taskId },
      include: { booking: { select: { id: true, tripId: true, festivalId: true } } },
    });
    if (!current) {
      const error = new Error("Operational task not found");
      error.statusCode = 404;
      throw error;
    }
    const updated = await tx.operationalTask.update({ where: { id: taskId }, data });

    if (data.amountPaid !== undefined) {
      const existingEntry = await tx.ledgerEntry.findFirst({
        where: { operationalTaskId: taskId, source: "OPERATIONAL_TASK" },
      });
      if (Number(data.amountPaid) > 0) {
        const ledgerData = {
          type: "EXPENSE",
          scope: current.booking.tripId ? "TRIP" : current.booking.festivalId ? "FESTIVAL" : "BOOKING",
          tripId: current.booking.tripId,
          festivalId: current.booking.festivalId,
          bookingId: current.booking.id,
          operationalTaskId: taskId,
          source: "OPERATIONAL_TASK",
          category: updated.category,
          amount: Number(data.amountPaid),
          description: updated.title,
          isAutoGenerated: true,
          entryDate: new Date(),
        };
        if (existingEntry) await tx.ledgerEntry.update({ where: { id: existingEntry.id }, data: ledgerData });
        else await tx.ledgerEntry.create({ data: ledgerData });
      } else if (existingEntry) {
        await tx.ledgerEntry.delete({ where: { id: existingEntry.id } });
      }
    }

    return tx.operationalTask.findUnique({ where: { id: taskId }, include: TASK_INCLUDE });
  });
};
