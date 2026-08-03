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
};

export const findMany = async ({ skip, take, where }) => {
  const [data, total] = await Promise.all([
    prisma.crmTrip.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { destination: true, _count: { select: { itineraryDays: true, inclusions: true } } },
    }),
    prisma.crmTrip.count({ where }),
  ]);
  return { data, total };
};

export const findById = (id, client = prisma) => client.crmTrip.findUnique({ where: { id }, include: CRM_TRIP_INCLUDE });
export const findDayById = (id, client = prisma) => client.crmTripItineraryDay.findUnique({
  where: { id },
  include: { trip: true, stayLocation: true, property: { include: { stayLocation: true } }, dropOffLocation: true, visitingPlaces: { include: { place: true } }, activities: true, commonInclusions: true },
});

export const create = (data, client = prisma) => client.crmTrip.create({ data });
export const update = (id, data, client = prisma) => client.crmTrip.update({ where: { id }, data });
export const remove = (id, client = prisma) => client.crmTrip.delete({ where: { id } });
