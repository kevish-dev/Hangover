import { prisma } from "../../prisma/client.js";

export const findAll = async (skip, take, where = {}) => {
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
        location: true,
        bannerImages: true,
        duration: true,
        difficultyLevel: true,
        bestTimeToVisit: true,
        maxAltitude: true,
        price: true,
        tokenAmount: true,
        capacity: true,
        filledSpots: true,
        startDate: true,
        endDate: true,
        tripType: true,
        isActive: true,
        isPublished: true,
        isFeatured: true,
        createdAt: true,
        destination: true,
        tripTags: true,
      }
    }),
    prisma.trip.count({ where }),
  ]);
  return { trips, total };
};

export const findById = async (whereObj) => {
  const filter = typeof whereObj === 'string' ? { id: whereObj } : whereObj;
  return prisma.trip.findFirst({
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
      tripTags: true,
      destination: true,
    }
  });
};

export const create = async (data) => {
  const { tripTags, faqs, ...rest } = data;
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
  
  return prisma.trip.create({ data: payload });
};

export const update = async (id, data) => {
  const { tripTags, faqs, ...rest } = data;
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
