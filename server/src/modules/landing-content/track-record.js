import { prisma } from "../../prisma/client.js";

export async function getTrackRecord() {
  const publicCatalog = { isActive: true, isPublished: true, isListed: true };
  const destinationSelection = { destination: { select: { name: true } } };
  const [completedBookings, bookedCustomers, trips, festivals, legacyFestivals, reviews] = await Promise.all([
    prisma.booking.groupBy({
      by: ["crmTripSlotId", "crmFestivalSlotId", "slotId"],
      where: { status: "COMPLETED" },
      _sum: { numberOfTravelers: true },
    }),
    prisma.booking.groupBy({
      by: ["userId"],
      where: { status: { in: ["RESERVED", "CONFIRMED", "COMPLETED"] } },
      _sum: { numberOfTravelers: true },
      _count: { _all: true },
    }),
    prisma.crmTrip.findMany({ where: publicCatalog, select: destinationSelection }),
    prisma.crmFestival.findMany({ where: publicCatalog, select: destinationSelection }),
    prisma.festival.findMany({ where: publicCatalog, select: destinationSelection }),
    prisma.review.aggregate({
      where: { isPublished: true, publicConsent: true, booking: { status: "COMPLETED" } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  const departures = new Set();
  let travelerPlaces = 0;
  for (const row of completedBookings) {
    travelerPlaces += row._sum.numberOfTravelers ?? 0;
    if (row.crmTripSlotId) departures.add(`trip:${row.crmTripSlotId}`);
    else if (row.crmFestivalSlotId) departures.add(`festival:${row.crmFestivalSlotId}`);
    else if (row.slotId) departures.add(`legacy:${row.slotId}`);
  }

  const destinations = new Set();
  for (const item of [...trips, ...festivals, ...legacyFestivals]) {
    const name = item.destination?.name?.trim().replace(/\s+/g, " ").toLowerCase();
    if (name) destinations.add(name);
  }

  return {
    departures: departures.size,
    travelerPlaces,
    travelerBookings: bookedCustomers.reduce((sum, customer) => sum + (customer._sum.numberOfTravelers ?? 0), 0),
    returningBookers: bookedCustomers.filter((customer) => customer._count._all > 1).length,
    destinations: destinations.size,
    festivalPackages: festivals.length + legacyFestivals.length,
    averageRating: reviews._avg.rating,
    reviewCount: reviews._count.rating,
  };
}
