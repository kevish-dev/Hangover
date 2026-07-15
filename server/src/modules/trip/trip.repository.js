import { prisma } from "../../prisma/client.js";

export const findAll = async (skip, take, where = {}, isAdmin = false) => {
  const [trips, total] = await Promise.all([
    prisma.trip.findMany({
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
        price: true,
        tokenAmount: true,
        tripType: true,
        isActive: true,
        isPublished: true,
        isFeatured: true,
        isSignature: true,
        signatureOrder: true,
        createdAt: true,
        destination: true,
        tripTags: true,
        packages: true,
        slots: {
          orderBy: { startDate: 'asc' }
        },
      }
    }),
    prisma.trip.count({ where }),
  ]);
  return { trips, total };
};

export const findById = async (whereObj, isAdmin = false) => {
  const filter = typeof whereObj === 'string' ? { id: whereObj } : whereObj;
  return prisma.trip.findFirst({
    where: filter,
    include: {
      faqs: true,
      tripTags: true,
      packages: true,
      slots: {
        orderBy: { startDate: 'asc' }
      },
      destination: true,
    }
  });
};

export const create = async (data) => {
  const { tripTags, faqs, packages, slots, ...rest } = data;
  const payload = { ...rest };
  
  if (tripTags && Array.isArray(tripTags)) {
    payload.tripTags = {
      connectOrCreate: tripTags.map(tag => ({
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

  
  return prisma.trip.create({ data: payload });
};

export const update = async (id, data) => {
  const { tripTags, faqs, packages, slots, ...rest } = data;
  const payload = { ...rest };
  
  if (tripTags && Array.isArray(tripTags)) {
    // 1. Clear existing tags
    await prisma.trip.update({
      where: { id },
      data: { tripTags: { set: [] } }
    });
    
    // 2. Add new tags
    payload.tripTags = {
      connectOrCreate: tripTags.map(tag => ({
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
      where: { tripId: id },
      select: { id: true },
    });
    const incomingPackageIds = packages.map(pkg => pkg.id).filter(Boolean);
    const existingPackageIds = new Set(existingPackages.map(pkg => pkg.id));

    if (new Set(incomingPackageIds).size !== incomingPackageIds.length) {
      throw new Error("Duplicate package IDs are not allowed");
    }

    if (incomingPackageIds.some(packageId => !existingPackageIds.has(packageId))) {
      throw new Error("One or more packages do not belong to this trip");
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
    const existingSlots = await prisma.slot.findMany({ where: { tripId: id } });
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


  return prisma.trip.update({
    where: { id },
    data: payload,
  });
};

export const remove = async (id) => {
  return prisma.trip.delete({
    where: { id },
  });
};

// ============ V2 apis for User ====================

export const getFeaturedTrips = async () => {
  let featuredTrips = await prisma.trip.findMany({
    where : {
      isFeatured: true,
      isActive: true,
      isPublished: true,
      bannerImages: { isEmpty: false },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      overview: true,
      location: true,
      duration: true,
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

  return featuredTrips;
}

export const getSignatureTrips = async () => {
  return prisma.trip.findMany({
    where: {
      isSignature: true,
      isActive: true,
      isPublished: true,
      bannerImages: { isEmpty: false },
    },
    orderBy: [{ signatureOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      overview: true,
      location: true,
      duration: true,
      price: true,
      bannerImages: true,
    },
  });
};

export const setSignatureTrips = async (tripIds) => {
  return prisma.$transaction(async (tx) => {
    await tx.trip.updateMany({ data: { isSignature: false, signatureOrder: 0 } });

    await Promise.all(
      tripIds.map((id, index) =>
        tx.trip.update({
          where: { id },
          data: { isSignature: true, signatureOrder: index + 1 },
        })
      )
    );
  });
};
