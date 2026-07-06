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
        stageDays: true,
        numberOfArtists: true,
        difficultyLevel: true,
        bestTimeToVisit: true,
        maxAltitude: true,
        price: true,
        tokenAmount: true,
        capacity: true,
        filledSpots: true,
        startDate: true,
        endDate: true,
        isActive: true,
        isPublished: true,
        isFeatured: true,
        createdAt: true,
        destination: true,
        tags: true,
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
      destination: true,
    }
  });
};

export const create = async (data) => {
  const { tags, faqs, ...rest } = data;
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
  
  return prisma.festival.create({ data: payload });
};

export const update = async (id, data) => {
  const { tags, faqs, ...rest } = data;
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
      stageDays: true,
      numberOfArtists: true,
      price: true,
      isActive: true,
      isPublished: true,
      isFeatured: true,
      bannerImages: true
    }
  })

  return featuredFestivals;
}
