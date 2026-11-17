import { prisma } from "../../prisma/client.js";

export async function getTrackRecord() {
  const [completedBookings, reviews] = await Promise.all([
    prisma.booking.groupBy({
      by: ["crmTripSlotId", "crmFestivalSlotId", "slotId"],
      where: { status: "COMPLETED" },
      _sum: { numberOfTravelers: true },
    }),
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
  return {
    departures: departures.size,
    travelerPlaces,
    averageRating: reviews._avg.rating,
    reviewCount: reviews._count.rating,
  };
}
