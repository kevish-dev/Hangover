import { prisma } from "../../prisma/client.js";

export const findAll = async (skip, take, where = {}) => {
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
        difficultyLevel: true,
        bestTimeToVisit: true,
        maxAltitude: true,
        price: true,
        tokenAmount: true,
        isActive: true,
        isPublished: true,
        isFeatured: true,
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

export const findById = async (whereObj) => {
  const filter = typeof whereObj === 'string' ? { id: whereObj } : whereObj;
  return prisma.festival.findFirst({
    where: filter,
    include: {
      faqs: true,
      itineraries: {
        include: {
          days: {
            orderBy: { dayNumber: 'asc' },
            include: {
              activities: {
                orderBy: { order: 'asc' },
              }
            }
          }
        }
      },
      tags: true,
      packages: true,
      slots: {
        orderBy: { startDate: 'asc' }
      },
      destination: true,
    }
  });
};

export const create = async (data) => {
  const { tags, faqs, packages, slots, ...rest } = data;
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
        capacity: parseInt(slot.capacity, 10),
        filledSpots: 0
      }))
    };
  }

  return prisma.festival.create({ data: payload });
};

export const update = async (id, data) => {
  const { tags, faqs, packages, slots, ...rest } = data;
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
    payload.packages = {
      deleteMany: {},
      create: packages.map(pkg => ({
        title: pkg.title,
        price: pkg.price,
        tokenAmount: pkg.tokenAmount
      }))
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
          capacity: parseInt(slot.capacity, 10)
        },
        create: {
          startDate: new Date(slot.startDate),
          endDate: new Date(slot.endDate),
          capacity: parseInt(slot.capacity, 10),
          filledSpots: 0
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
    where : { isFeatured : true, isActive: true, isPublished: true },
    select: {
      id: true,
      title: true,
      slug: true,
      overview: true,
      location: true,
      duration: true,
      difficultyLevel: true,
      price: true,
      isActive: true,
      isPublished: true,
      isFeatured: true,
      bannerImages: true,
      packages: true,
      slots: {
        orderBy: { startDate: 'asc' }
      }
    }
  })

  return featuredFestivals;
}
