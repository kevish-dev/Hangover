import { prisma } from "../../prisma/client.js";

const addUtcDays = (date, days) => {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
};

const crmTaskTitle = (title, booking) => {
  const customer = booking.user?.profile?.fullName || booking.user?.email || "Customer";
  return `${title} · ${booking.bookingReference} · ${customer}`;
};

/** Fork CRM itinerary services into independently completable booking operations. */
export const generateCrmBookingOperations = async (booking, crmSlot) => {
  const isFestival = !!booking.crmFestivalId;
  const entity = isFestival
    ? await prisma.crmFestival.findUnique({
        where: { id: booking.crmFestivalId },
        include: {
          itineraryDays: {
            orderBy: { dayNumber: "asc" },
            include: {
              stayLocation: true,
              property: true,
              dropOffLocation: true,
              activities: true,
              commonInclusions: true,
            },
          },
        },
      })
    : await prisma.crmTrip.findUnique({
        where: { id: booking.crmTripId },
        include: {
          itineraryDays: {
            orderBy: { dayNumber: "asc" },
            include: {
              stayLocation: true,
              property: true,
              dropOffLocation: true,
              activities: true,
              commonInclusions: true,
            },
          },
        },
      });
  if (!entity || !crmSlot.startDate) return;

  const tasks = [];
  const addTask = (day, sourceKey, category, title, description = null, quantityNeeded = 1) => {
    const taskObj = {
      bookingId: booking.id,
      crmSourceKey: sourceKey,
      category,
      title: crmTaskTitle(title, booking),
      description,
      config: { crmGenerated: true, sourceKey },
      quantityNeeded,
      dueAt: addUtcDays(crmSlot.startDate, (day?.dayNumber || 1) - 1),
    };
    if (isFestival) {
      taskObj.crmFestivalItineraryDayId = day?.id || null;
    } else {
      taskObj.crmItineraryDayId = day?.id || null;
    }
    tasks.push(taskObj);
  };

  if (entity.airportPickupEnabled) addTask(entity.itineraryDays[0], "airport-pickup", "TRANSPORT", "Arrange airport pickup");
  for (const day of entity.itineraryDays) {
    if (day.property || day.stayLocation) {
      const accommodation = day.property?.name || day.stayLocation?.name;
      addTask(day, "stay", "HOTEL", `Book stay${accommodation ? `: ${accommodation}` : ""}`, accommodation || null);
    }
    for (const meal of ["breakfast", "lunch", "dinner"]) {
      if (day[meal]) addTask(day, `meal:${meal}`, "VENDOR", `Arrange ${meal}`);
    }
    if (day.transportEnabled) addTask(day, "transport", "TRANSPORT", "Arrange transport", day.transportText || null);
    if (day.isDropOff) addTask(day, "drop-off", "TRANSPORT", `Arrange drop-off${day.dropOffLocation?.name ? `: ${day.dropOffLocation.name}` : ""}`, day.dropOffLocation?.name || null);
    for (const activity of day.activities) addTask(day, `activity:${activity.id}`, "ACTIVITY", `Arrange activity: ${activity.name}`, activity.description || null);
    for (const inclusion of day.commonInclusions) {
      const isPermit = inclusion.key === "ILP_AND_PERMITS";
      const label = { ILP_AND_PERMITS: "Arrange ILP and permits", BBQ: "Arrange BBQ", BONFIRE: "Arrange bonfire", TRIP_GUIDE: "Arrange trip guide" }[inclusion.key];
      addTask(day, `inclusion:${inclusion.key}`, isPermit ? "PERMIT" : "VENDOR", label);
    }
  }
  if (entity.airportDropEnabled) addTask(entity.itineraryDays.at(-1), "airport-drop", "TRANSPORT", "Arrange airport drop");
  if (tasks.length) await prisma.operationalTask.createMany({ data: tasks });
};

export const generateBookingOperations = async (booking, slot, chosenAddOns = []) => {
  const isTrip = !!slot.tripId;
  const opsToCreate = [];

  // Also check for tasks directly on the Trip or Festival's Itinerary Days
  const itineraryDays = await prisma.itineraryDay.findMany({
    where: {
      OR: [
        isTrip && slot.trip ? { tripId: slot.trip.id } : null,
        !isTrip && slot.festival ? { festivalId: slot.festival.id } : null
      ].filter(Boolean)
    },
    include: { tasks: true }
  });

  for (const day of itineraryDays) {
    for (const task of day.tasks) {
      const dueAt = task.dueOffsetDays != null && slot.startDate
        ? new Date(new Date(slot.startDate).getTime() - task.dueOffsetDays * 86400000)
        : null;

      opsToCreate.push({
        bookingId: booking.id,
        itineraryDayId: day.id,
        sourceTemplateId: task.id,
        category: task.category,
        title: task.title,
        description: task.description,
        config: task.config ?? {},
        unitPrice: task.unitPrice ?? null,
        quantityNeeded: task.quantityNeeded ?? null,
        dueAt,
      });
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
      crmTripId: true,
      crmTripSlotId: true,
      crmFestivalId: true,
      crmFestivalSlotId: true,
      festivalId: true,
      user: { select: { email: true, profile: { select: { fullName: true } } } },
      slot: { select: { id: true, title: true, startDate: true, endDate: true } },
      crmTripSlot: { select: { id: true, title: true, startDate: true, endDate: true } },
      crmFestivalSlot: { select: { id: true, title: true, startDate: true, endDate: true } },
      trip: { select: { id: true, title: true } },
      crmTrip: { select: { id: true, name: true } },
      crmFestival: { select: { id: true, name: true } },
      festival: { select: { id: true, title: true } },
    },
  },
  itineraryDay: { select: { id: true, dayNumber: true, title: true } },
  crmItineraryDay: { select: { id: true, dayNumber: true } },
  crmFestivalItineraryDay: { select: { id: true, dayNumber: true } },
};

export const listOperationalTasks = async (query = {}) => {
  const where = {};
  if (query.status) where.status = query.status;
  if (query.category) where.category = query.category;
  if (query.bookingId) where.bookingId = query.bookingId;
  if (query.tripId) where.booking = { tripId: query.tripId };
  if (query.crmTripId) where.booking = { ...(where.booking || {}), crmTripId: query.crmTripId };
  if (query.crmTripSlotId) where.booking = { ...(where.booking || {}), crmTripSlotId: query.crmTripSlotId };
  if (query.crmFestivalId) where.booking = { ...(where.booking || {}), crmFestivalId: query.crmFestivalId };
  if (query.crmFestivalSlotId) where.booking = { ...(where.booking || {}), crmFestivalSlotId: query.crmFestivalSlotId };
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { booking: { bookingReference: { contains: query.search, mode: "insensitive" } } },
      { booking: { trip: { title: { contains: query.search, mode: "insensitive" } } } },
      { booking: { crmTrip: { name: { contains: query.search, mode: "insensitive" } } } },
      { booking: { crmFestival: { name: { contains: query.search, mode: "insensitive" } } } },
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
    "dueAt",
    "assigneeId",
    "unitPrice",
    "quantityNeeded",
    "quantityAcquired",
  ];
  const data = Object.fromEntries(
    allowed.filter((key) => input[key] !== undefined).map((key) => [key, input[key]]),
  );
  if (data.status && !["PENDING", "IN_PROGRESS", "DONE", "CANCELLED", "BLOCKED"].includes(data.status)) {
    const error = new Error("Invalid operational task status");
    error.statusCode = 400;
    throw error;
  }
  for (const field of ["unitPrice"]) {
    if (data[field] !== undefined && data[field] !== null) {
      data[field] = Number(data[field]);
      if (!Number.isFinite(data[field]) || data[field] < 0) {
        const error = new Error(`${field} must be zero or greater`);
        error.statusCode = 400;
        throw error;
      }
    }
  }
  for (const field of ["quantityNeeded", "quantityAcquired"]) {
    if (data[field] !== undefined && data[field] !== null) {
      data[field] = parseInt(data[field], 10);
      if (!Number.isFinite(data[field]) || data[field] < 0) {
        const error = new Error(`${field} must be a positive integer`);
        error.statusCode = 400;
        throw error;
      }
    }
  }
  if (data.dueAt !== undefined) data.dueAt = data.dueAt ? new Date(data.dueAt) : null;


  return prisma.$transaction(async (tx) => {
    const current = await tx.operationalTask.findUnique({
      where: { id: taskId },
      include: { booking: { select: { id: true, tripId: true, festivalId: true, crmTripId: true, crmFestivalId: true } } },
    });
    if (!current) {
      const error = new Error("Operational task not found");
      error.statusCode = 404;
      throw error;
    }

    // CRM operators commonly enter a cost for one booking task without
    // separately entering a quantity. Treat that as one acquired unit so the
    // cost is not silently omitted from the booking/trip ledger. A later
    // quantity update recalculates the same auto-generated ledger row.
    if (
      data.quantityAcquired === undefined
      && current.quantityAcquired == null
      && (data.unitPrice !== undefined || (data.status === "DONE" && current.unitPrice != null))
    ) {
      data.quantityAcquired = current.quantityNeeded || 1;
    }

    const unitPrice = data.unitPrice !== undefined ? data.unitPrice : (current.unitPrice != null ? Number(current.unitPrice) : null);
    const quantityNeeded = data.quantityNeeded !== undefined ? data.quantityNeeded : current.quantityNeeded;
    const quantityAcquired = data.quantityAcquired !== undefined ? data.quantityAcquired : current.quantityAcquired;

    // Auto-complete if acquired reaches needed
    if (unitPrice != null && quantityNeeded != null && quantityAcquired != null && quantityNeeded > 0 && quantityAcquired >= quantityNeeded) {
      data.status = "DONE";
    }

    // Resolve completedAt based on final status
    const finalStatus = data.status || current.status;
    if (finalStatus === "DONE") data.completedAt = new Date();
    else if (data.status && data.status !== "DONE") data.completedAt = null;

    const updated = await tx.operationalTask.update({ where: { id: taskId }, data });

    // Auto-generate ledger entry: unitPrice × quantityAcquired = cost incurred so far
    if (data.quantityAcquired !== undefined || data.unitPrice !== undefined || data.status === "DONE") {
      const finalUnitPrice = data.unitPrice !== undefined ? data.unitPrice : (current.unitPrice != null ? Number(current.unitPrice) : null);
      const finalQtyAcquired = data.quantityAcquired !== undefined ? data.quantityAcquired : current.quantityAcquired;
      const ledgerAmount = finalUnitPrice != null && finalQtyAcquired != null
        ? Number(finalUnitPrice) * Number(finalQtyAcquired)
        : null;

      const existingEntry = await tx.ledgerEntry.findFirst({
        where: { operationalTaskId: taskId, source: "OPERATIONAL_TASK" },
      });

      if (ledgerAmount != null && ledgerAmount > 0) {
        const isFestivalScope = current.booking.festivalId || current.booking.crmFestivalId;
        const ledgerData = {
          type: "EXPENSE",
          scope: (current.booking.tripId || current.booking.crmTripId) ? "TRIP" : isFestivalScope ? "FESTIVAL" : "BOOKING",
          tripId: current.booking.tripId,
          crmTripId: current.booking.crmTripId,
          festivalId: current.booking.festivalId,
          crmFestivalId: current.booking.crmFestivalId,
          bookingId: current.booking.id,
          operationalTaskId: taskId,
          source: "OPERATIONAL_TASK",
          category: updated.category,
          amount: ledgerAmount,
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

export const createOperationalTask = async (bookingId, data) => {
  const allowed = [
    "title",
    "description",
    "category",
    "dueAt",
    "unitPrice",
    "quantityNeeded",
    "quantityAcquired",
  ];
  const payload = Object.fromEntries(
    allowed.filter((key) => data[key] !== undefined).map((key) => [key, data[key]]),
  );

  if (!payload.title || !payload.category) {
    const error = new Error("Title and category are required");
    error.statusCode = 400;
    throw error;
  }

  if (payload.unitPrice !== undefined && payload.unitPrice !== null) {
    payload.unitPrice = Number(payload.unitPrice);
  }
  if (payload.quantityNeeded !== undefined && payload.quantityNeeded !== null) {
    payload.quantityNeeded = parseInt(payload.quantityNeeded, 10);
  }
  if (payload.quantityAcquired !== undefined && payload.quantityAcquired !== null) {
    payload.quantityAcquired = parseInt(payload.quantityAcquired, 10);
  }

  if (payload.dueAt) {
    payload.dueAt = new Date(payload.dueAt);
  }

  return prisma.operationalTask.create({
    data: {
      ...payload,
      booking: { connect: { id: bookingId } },
    },
    include: TASK_INCLUDE,
  });
};

export const deleteOperationalTask = async (taskId) => {
  return prisma.$transaction(async (tx) => {
    const task = await tx.operationalTask.findUnique({ where: { id: taskId } });
    if (!task) {
      const error = new Error("Operational task not found");
      error.statusCode = 404;
      throw error;
    }

    // Delete auto-generated ledger entries
    await tx.ledgerEntry.deleteMany({
      where: { operationalTaskId: taskId, source: "OPERATIONAL_TASK" },
    });

    return tx.operationalTask.delete({ where: { id: taskId } });
  });
};
