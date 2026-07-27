import { prisma } from "../../prisma/client.js";

export const findAll = async (skip, take, where = {}, isAdmin = false) => {
  const [festivals, total] = await Promise.all([
    prisma.festival.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        overview: true,
        location: true,
        bannerImages: true,
        duration: true,
        bestTimeToVisit: true,
        isActive: true,
        isPublished: true,
        isFeatured: true,
        videoUrl: true,
        createdAt: true,
        destination: true,
        tags: true,
        packages: true,
        slots: {
          orderBy: { startDate: 'asc' }
        },
      }
    }),
    prisma.festival.count({ where }),
  ]);
  return { festivals, total };
};

export const findById = async (whereObj, isAdmin = false) => {
  const filter = typeof whereObj === 'string' ? { id: whereObj } : whereObj;
  return prisma.festival.findFirst({
    where: filter,
    include: {
      faqs: true,
      tags: true,
      packages: true,
      slots: {
        orderBy: { startDate: 'asc' }
      },
      itinerary: {
        orderBy: { dayNumber: "asc" },
        include: { tasks: { orderBy: { createdAt: "asc" } } },
      },
      addOns: true,
      circuit: {
        select: {
          id: true,
          title: true,
          slug: true,
          addOns: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
        },
      },
      destination: true,
    }
  });
};

export const create = async (data) => {
  const { tags, faqs, packages, slots, itinerary, addOns, ...rest } = data;
  const payload = { ...rest };
  
  if (tags && Array.isArray(tags)) {
    payload.tags = {
      connectOrCreate: tags.map(tag => ({
        where: { tag },
        create: { tag }
      }))
    };
  }

  if (faqs && Array.isArray(faqs)) {
    payload.faqs = {
      create: faqs.map((faq, index) => ({
        question: faq.question,
        answer: faq.answer,
        order: faq.order !== undefined ? faq.order : index
      }))
    };
  }

  if (packages && Array.isArray(packages)) {
    payload.packages = {
      create: packages.map(pkg => ({
        title: pkg.title,
        price: pkg.price,
        tokenAmount: pkg.tokenAmount
      }))
    };
  }
  
  if (slots && Array.isArray(slots)) {
    payload.slots = {
      create: slots.map(slot => ({
        startDate: new Date(slot.startDate),
        endDate: new Date(slot.endDate),
        title: slot.title || null,
        priority: slot.priority ? parseInt(slot.priority, 10) : 0,
        capacity: parseInt(slot.capacity, 10),
        filledSpots: 0
      }))
    };
  }

  if (itinerary && Array.isArray(itinerary)) {
    payload.itinerary = {
      create: itinerary.map((day, index) => ({
        dayNumber: Number(day.dayNumber ?? String(day.day || "").match(/\d+/)?.[0] ?? index + 1),
        title: day.title,
        description: day.description ?? (typeof day.activities === "string" ? day.activities : null),
        todos: Array.isArray(day.todos)
          ? day.todos
          : Array.isArray(day.activities)
            ? day.activities
            : typeof day.activities === "string"
              ? day.activities.split("\n").map((item) => item.trim()).filter(Boolean)
              : [],
        tasks: {
          create: Array.isArray(day.tasks) ? day.tasks.map(task => ({
            category: task.category,
            title: task.title,
            description: task.description || null,
            config: task.config || {},
            unitPrice: task.unitPrice ?? null,
            quantityNeeded: task.quantityNeeded ?? null,
            dueOffsetDays: task.dueOffsetDays ?? null,
          })) : []
        },
      })),
    };
  }

  if (addOns && Array.isArray(addOns)) {
    payload.addOns = {
      create: addOns.map((addOn) => ({
        title: addOn.title,
        description: addOn.description || null,
        imageUrl: addOn.imageUrl || null,
        price: Number(addOn.price),
        maxQuantityPerBooking: addOn.maxQuantityPerBooking || null,
        maxQuantityPerSlot: addOn.maxQuantityPerSlot || null,
        purchaseCutoffOffsetDays: addOn.purchaseCutoffOffsetDays ?? null,
        isActive: addOn.isActive ?? true,
      })),
    };
  }

  return prisma.festival.create({ data: payload });
};

export const update = async (id, data) => {
  const { tags, faqs, packages, slots, itinerary, addOns, ...rest } = data;
  const payload = { ...rest };
  
  if (tags && Array.isArray(tags)) {
    // 1. Clear existing tags
    await prisma.festival.update({
      where: { id },
      data: { tags: { set: [] } }
    });
    
    // 2. Add new tags
    payload.tags = {
      connectOrCreate: tags.map(tag => ({
        where: { tag },
        create: { tag }
      }))
    };
  }

  if (faqs && Array.isArray(faqs)) {
    payload.faqs = {
      deleteMany: {},
      create: faqs.map((faq, index) => ({
        question: faq.question,
        answer: faq.answer,
        order: faq.order !== undefined ? faq.order : index
      }))
    };
  }

  if (packages && Array.isArray(packages)) {
    const existingPackages = await prisma.package.findMany({
      where: { festivalId: id },
      select: { id: true },
    });
    const incomingPackageIds = packages.map(pkg => pkg.id).filter(Boolean);
    const existingPackageIds = new Set(existingPackages.map(pkg => pkg.id));

    if (new Set(incomingPackageIds).size !== incomingPackageIds.length) {
      throw new Error("Duplicate package IDs are not allowed");
    }

    if (incomingPackageIds.some(packageId => !existingPackageIds.has(packageId))) {
      throw new Error("One or more packages do not belong to this festival");
    }

    const packagesToDelete = existingPackages.filter(pkg => !incomingPackageIds.includes(pkg.id));
    if (packagesToDelete.length > 0) {
      const packageWithBookings = await prisma.booking.findFirst({
        where: { packageId: { in: packagesToDelete.map(pkg => pkg.id) } },
        select: { id: true },
      });
      if (packageWithBookings) {
        throw new Error("Cannot delete packages that have existing bookings");
      }
    }

    payload.packages = {
      deleteMany: { id: { in: packagesToDelete.map(pkg => pkg.id) } },
      upsert: packages.map(pkg => ({
        where: { id: pkg.id || "00000000-0000-0000-0000-000000000000" },
        update: {
          title: pkg.title,
          price: pkg.price,
          tokenAmount: pkg.tokenAmount,
        },
        create: {
          title: pkg.title,
          price: pkg.price,
          tokenAmount: pkg.tokenAmount,
        },
      })),
    };
  }
  
  if (slots && Array.isArray(slots)) {
    const existingSlots = await prisma.slot.findMany({ where: { festivalId: id } });
    const incomingSlotIds = slots.map(s => s.id).filter(Boolean);
    const slotsToDelete = existingSlots.filter(s => !incomingSlotIds.includes(s.id));
    
    if (slotsToDelete.length > 0) {
      const slotsWithBookings = await prisma.booking.findFirst({
        where: { slotId: { in: slotsToDelete.map(s => s.id) } }
      });
      if (slotsWithBookings) {
        throw new Error("Cannot delete slots that have existing bookings");
      }
    }

    payload.slots = {
      deleteMany: { id: { in: slotsToDelete.map(s => s.id) } },
      upsert: slots.map(slot => ({
        where: { id: slot.id || "00000000-0000-0000-0000-000000000000" },
        update: {
          startDate: new Date(slot.startDate),
          endDate: new Date(slot.endDate),
          title: slot.title || null,
          priority: slot.priority ? parseInt(slot.priority, 10) : 0,
          capacity: parseInt(slot.capacity, 10)
        },
        create: {
          startDate: new Date(slot.startDate),
          endDate: new Date(slot.endDate),
          title: slot.title || null,
          priority: slot.priority ? parseInt(slot.priority, 10) : 0,
          capacity: parseInt(slot.capacity, 10),
          filledSpots: 0
        }
      }))
    };
  }

  if (itinerary && Array.isArray(itinerary)) {
    payload.itinerary = {
      deleteMany: {},
      create: itinerary.map((day, index) => ({
        dayNumber: Number(day.dayNumber ?? String(day.day || "").match(/\d+/)?.[0] ?? index + 1),
        title: day.title,
        description: day.description ?? (typeof day.activities === "string" ? day.activities : null),
        todos: Array.isArray(day.todos)
          ? day.todos
          : Array.isArray(day.activities)
            ? day.activities
            : typeof day.activities === "string"
              ? day.activities.split("\n").map((item) => item.trim()).filter(Boolean)
              : [],
        tasks: {
          create: Array.isArray(day.tasks) ? day.tasks.map(task => ({
            category: task.category,
            title: task.title,
            description: task.description || null,
            config: task.config || {},
            unitPrice: task.unitPrice ?? null,
            quantityNeeded: task.quantityNeeded ?? null,
            dueOffsetDays: task.dueOffsetDays ?? null,
          })) : []
        },
      })),
    };
  }

  if (addOns && Array.isArray(addOns)) {
    const existingAddOns = await prisma.addOn.findMany({ where: { festivalId: id } });
    const incomingAddOnIds = addOns.map(a => a.id).filter(Boolean);
    const addOnsToDelete = existingAddOns.filter(a => !incomingAddOnIds.includes(a.id));

    if (addOnsToDelete.length > 0) {
      const addOnsWithBookings = await prisma.bookingAddOn.findFirst({
        where: { addOnId: { in: addOnsToDelete.map(a => a.id) } }
      });
      if (addOnsWithBookings) {
        throw new Error("Cannot delete add-ons that are used in existing bookings");
      }
    }

    payload.addOns = {
      deleteMany: { id: { in: addOnsToDelete.map(a => a.id) } },
      upsert: addOns.map(addOn => ({
        where: { id: addOn.id || "00000000-0000-0000-0000-000000000000" },
        update: {
          title: addOn.title,
          description: addOn.description || null,
          imageUrl: addOn.imageUrl || null,
          price: Number(addOn.price),
          maxQuantityPerBooking: addOn.maxQuantityPerBooking || null,
          maxQuantityPerSlot: addOn.maxQuantityPerSlot || null,
          purchaseCutoffOffsetDays: addOn.purchaseCutoffOffsetDays ?? null,
          isActive: addOn.isActive ?? true,
        },
        create: {
          title: addOn.title,
          description: addOn.description || null,
          imageUrl: addOn.imageUrl || null,
          price: Number(addOn.price),
          maxQuantityPerBooking: addOn.maxQuantityPerBooking || null,
          maxQuantityPerSlot: addOn.maxQuantityPerSlot || null,
          purchaseCutoffOffsetDays: addOn.purchaseCutoffOffsetDays ?? null,
          isActive: addOn.isActive ?? true,
        }
      }))
    };
  }

  return prisma.festival.update({
    where: { id },
    data: payload,
  });
};

export const remove = async (id) => {
  return prisma.festival.delete({
    where: { id },
  });
};

// ============ V2 apis for User ====================

export const getFeaturedFestivals = async () => {
  let featuredFestivals = await prisma.festival.findMany({
    where: {
      isFeatured: true,
      isActive: true,
      isPublished: true,
      OR: [{ videoUrl: { not: null } }, { bannerImages: { isEmpty: false } }],
    },
    select: {
      id: true,
      title: true,
      overview: true,
      location: true,
      duration: true,
      isActive: true,
      isPublished: true,
      isFeatured: true,
      videoUrl: true,
      bannerImages: true,
      packages: true,
      slots: {
        orderBy: { startDate: 'asc' }
      }
    }
  })

  return featuredFestivals;
}
