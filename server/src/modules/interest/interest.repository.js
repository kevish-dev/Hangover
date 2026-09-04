import { prisma } from "../../prisma/client.js";

export const createSubmission = async (data) => {
  return prisma.interestSubmission.create({
    data: {
      name: data.name,
      email: data.email || null,
      whatsapp: data.whatsapp || null,
      instagram: data.instagram || null,
      userId: data.userId || null,
      visitorToken: data.visitorToken || null,
      crmTripId: data.crmTripId || null,
      crmFestivalId: data.crmFestivalId || null,
      tripId: data.tripId || null,
      festivalId: data.festivalId || null,
    },
  });
};

export const findRecentSubmission = async ({
  userId,
  visitorToken,
  crmTripId,
  crmFestivalId,
  tripId,
  festivalId,
  sinceDate,
}) => {
  const orConditions = [];
  if (userId) orConditions.push({ userId });
  if (visitorToken) orConditions.push({ visitorToken });

  if (orConditions.length === 0) return null;

  return prisma.interestSubmission.findFirst({
    where: {
      createdAt: { gte: sinceDate },
      OR: orConditions,
      crmTripId: crmTripId || null,
      crmFestivalId: crmFestivalId || null,
      tripId: tripId || null,
      festivalId: festivalId || null,
    },
  });
};

export const findEnabledTripsAndFestivalsWithSubmissions = async () => {
  const [crmTrips, crmFestivals, trips, festivals] = await Promise.all([
    prisma.crmTrip.findMany({
      where: { isInterestFormEnabled: true },
      select: {
        id: true,
        name: true,
        isActive: true,
        isPublished: true,
        destination: { select: { id: true, name: true } },
        interestSubmissions: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.crmFestival.findMany({
      where: { isInterestFormEnabled: true },
      select: {
        id: true,
        name: true,
        isActive: true,
        isPublished: true,
        destination: { select: { id: true, name: true } },
        interestSubmissions: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.trip.findMany({
      where: { isInterestFormEnabled: true },
      select: {
        id: true,
        title: true,
        isActive: true,
        isPublished: true,
        destination: { select: { id: true, name: true } },
        interestSubmissions: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.festival.findMany({
      where: { isInterestFormEnabled: true },
      select: {
        id: true,
        title: true,
        isActive: true,
        isPublished: true,
        destination: { select: { id: true, name: true } },
        interestSubmissions: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const formattedCrmTrips = crmTrips.map((item) => ({
    id: item.id,
    type: "CRM_TRIP",
    title: item.name,
    isActive: item.isActive,
    isPublished: item.isPublished,
    destinationName: item.destination?.name || "N/A",
    submissions: item.interestSubmissions,
  }));

  const formattedCrmFestivals = crmFestivals.map((item) => ({
    id: item.id,
    type: "CRM_FESTIVAL",
    title: item.name,
    isActive: item.isActive,
    isPublished: item.isPublished,
    destinationName: item.destination?.name || "N/A",
    submissions: item.interestSubmissions,
  }));

  const formattedTrips = trips.map((item) => ({
    id: item.id,
    type: "TRIP",
    title: item.title,
    isActive: item.isActive,
    isPublished: item.isPublished,
    destinationName: item.destination?.name || "N/A",
    submissions: item.interestSubmissions,
  }));

  const formattedFestivals = festivals.map((item) => ({
    id: item.id,
    type: "FESTIVAL",
    title: item.title,
    isActive: item.isActive,
    isPublished: item.isPublished,
    destinationName: item.destination?.name || "N/A",
    submissions: item.interestSubmissions,
  }));

  return [
    ...formattedCrmTrips,
    ...formattedCrmFestivals,
    ...formattedTrips,
    ...formattedFestivals,
  ];
};

export const deleteSubmission = async (id) => {
  return prisma.interestSubmission.delete({
    where: { id },
  });
};
