import { randomUUID } from "node:crypto";
import { publicCatalogSlug } from "../../utils/public-catalog-slug.js";
import { prisma } from "../../prisma/client.js";

export const CRM_TRIP_INCLUDE = {
  destination: true,
  itineraryDays: {
    orderBy: { dayNumber: "asc" },
    include: {
      stayLocation: true,
      property: { include: { stayLocation: true } },
      dropOffLocation: true,
      visitingPlaces: { orderBy: { displayOrder: "asc" }, include: { place: true } },
      activities: { orderBy: { displayOrder: "asc" } },
      commonInclusions: { orderBy: { key: "asc" } },
    },
  },
  inclusions: { orderBy: { displayOrder: "asc" } },
  commonInclusions: { orderBy: { key: "asc" } },
  packages: { orderBy: { createdAt: "asc" } },
  addOns: { orderBy: { createdAt: "asc" } },
  slots: { orderBy: [{ priority: "desc" }, { startDate: "asc" }], include: { _count: { select: { bookings: true } } } },
  websiteTags: true,
};

export const findMany = async ({ skip, take, where }) => {
  const [data, total] = await Promise.all([
    prisma.crmTrip.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { destination: true, _count: { select: { itineraryDays: true, inclusions: true, bookings: true } } },
    }),
    prisma.crmTrip.count({ where }),
  ]);
  return { data, total };
};

const PUBLIC_CRM_TRIP_INCLUDE = {
  destination: true,
  websiteTags: true,
  packages: { orderBy: { createdAt: "asc" } },
  slots: { orderBy: [{ priority: "desc" }, { startDate: "asc" }] },
};

export const findPublicMany = () => prisma.crmTrip.findMany({
  where: { isActive: true, isPublished: true, isListed: true },
  orderBy: { createdAt: "desc" },
  include: PUBLIC_CRM_TRIP_INCLUDE,
});

export const findFeaturedPublic = () => prisma.crmTrip.findMany({
  where: { isActive: true, isPublished: true, isFeatured: true },
  orderBy: { createdAt: "desc" },
  include: PUBLIC_CRM_TRIP_INCLUDE,
});

export const signatureTripEligibility = {
  isActive: true,
  isPublished: true,
  websiteBannerImages: { isEmpty: false },
};

export const findSignatureTrips = () => prisma.crmTrip.findMany({
  where: { ...signatureTripEligibility, signatureOrder: { not: null } },
  orderBy: { signatureOrder: "asc" },
  include: PUBLIC_CRM_TRIP_INCLUDE,
});

export const findSignatureTripOptions = () => prisma.crmTrip.findMany({
  where: { OR: [signatureTripEligibility, { signatureOrder: { not: null } }] },
  orderBy: { name: "asc" },
  include: PUBLIC_CRM_TRIP_INCLUDE,
});

export const findPublicById = (identifier) => prisma.crmTrip.findFirst({
  where: { OR: [{ id: identifier }, { publicSlug: identifier }], isActive: true, isPublished: true },
  include: CRM_TRIP_INCLUDE,
});

export const findLegacyTripForWebsite = (where) => prisma.trip.findFirst({
  where,
  omit: { shareTokenHash: true, shareTokenExpiresAt: true },
  include: {
    destination: { select: { id: true, name: true, state: true, subheading: true } },
    tripTags: { select: { id: true, tag: true } },
    packages: { orderBy: { createdAt: "asc" } },
    addOns: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
    faqs: { orderBy: { order: "asc" } },
    itinerary: { orderBy: { dayNumber: "asc" } },
    slots: { orderBy: [{ priority: "desc" }, { startDate: "asc" }] },
  },
});

export const findById = (id, client = prisma) => client.crmTrip.findUnique({ where: { id }, include: CRM_TRIP_INCLUDE });
export const findDayById = (id, client = prisma) => client.crmTripItineraryDay.findUnique({
  where: { id },
  include: { trip: true, stayLocation: true, property: { include: { stayLocation: true } }, dropOffLocation: true, visitingPlaces: { include: { place: true } }, activities: true, commonInclusions: true },
});

export const create = (data, client = prisma) => {
  const id = randomUUID();
  return client.crmTrip.create({
    data: { ...data, id, publicSlug: publicCatalogSlug(data.name, id, "trip") },
  });
};
export const update = (id, data, client = prisma) => client.crmTrip.update({ where: { id }, data });
export const remove = (id, client = prisma) => client.crmTrip.delete({ where: { id } });
