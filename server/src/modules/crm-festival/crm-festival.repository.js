import { prisma } from "../../prisma/client.js";

export const CRM_FESTIVAL_INCLUDE = {
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
  slots: { orderBy: { startDate: "asc" }, include: { _count: { select: { bookings: true } } } },
  websiteTags: true,
};

export const findMany = async ({ skip, take, where }) => {
  const [data, total] = await Promise.all([
    prisma.crmFestival.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { destination: true, _count: { select: { itineraryDays: true, inclusions: true, bookings: true } } },
    }),
    prisma.crmFestival.count({ where }),
  ]);
  return { data, total };
};

const PUBLIC_CRM_FESTIVAL_INCLUDE = {
  destination: true,
  websiteTags: true,
  packages: { orderBy: { createdAt: "asc" } },
  slots: { orderBy: { startDate: "asc" } },
};

export const findPublicMany = () => prisma.crmFestival.findMany({
  where: { isActive: true, isPublished: true, isListed: true },
  orderBy: { createdAt: "desc" },
  include: PUBLIC_CRM_FESTIVAL_INCLUDE,
});

export const findFeaturedPublic = () => prisma.crmFestival.findMany({
  where: { isActive: true, isPublished: true, isFeatured: true },
  orderBy: { createdAt: "desc" },
  include: PUBLIC_CRM_FESTIVAL_INCLUDE,
});

export const findPublicById = (id) => prisma.crmFestival.findFirst({
  where: { id, isActive: true, isPublished: true },
  include: CRM_FESTIVAL_INCLUDE,
});

export const findById = (id, client = prisma) => client.crmFestival.findUnique({ where: { id }, include: CRM_FESTIVAL_INCLUDE });
export const findDayById = (id, client = prisma) => client.crmFestivalItineraryDay.findUnique({
  where: { id },
  include: { festival: true, stayLocation: true, property: { include: { stayLocation: true } }, dropOffLocation: true, visitingPlaces: { include: { place: true } }, activities: true, commonInclusions: true },
});

export const create = (data, client = prisma) => client.crmFestival.create({ data });
export const update = (id, data, client = prisma) => client.crmFestival.update({ where: { id }, data });
export const remove = (id, client = prisma) => client.crmFestival.delete({ where: { id } });
