import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SourceTextModule, SyntheticModule } from "node:vm";
import test from "node:test";

const source = await readFile(new URL("../src/modules/landing-content/track-record.js", import.meta.url), "utf8");

async function loadTrackRecord({ completed = [], customers = [], trips = [], festivals = [], legacy = [], rating = null, reviewCount = 0 } = {}) {
  const publicCatalog = { isActive: true, isPublished: true, isListed: true };
  const catalogQuery = (rows) => ({ findMany: async (query) => {
    assert.deepEqual(query, { where: publicCatalog, select: { destination: { select: { name: true } } } });
    return rows;
  } });
  const prisma = {
    booking: { groupBy: async (query) => {
      if (query.by.includes("userId")) {
        assert.deepEqual(query.where, { status: { in: ["RESERVED", "CONFIRMED", "COMPLETED"] } });
        return customers;
      }
      assert.deepEqual(query.where, { status: "COMPLETED" });
      return completed;
    } },
    crmTrip: catalogQuery(trips),
    crmFestival: catalogQuery(festivals),
    festival: catalogQuery(legacy),
    review: { aggregate: async (query) => {
      assert.deepEqual(query.where, { isPublished: true, publicConsent: true, booking: { status: "COMPLETED" } });
      return { _avg: { rating }, _count: { rating: reviewCount } };
    } },
  };
  const module = new SourceTextModule(source);
  await module.link((specifier) => {
    assert.equal(specifier, "../../prisma/client.js");
    return new SyntheticModule(["prisma"], function () { this.setExport("prisma", prisma); });
  });
  await module.evaluate();
  return module.namespace.getTrackRecord;
}

test("track record counts completed journeys, accepted bookings and distinct catalog destinations", async () => {
  const getTrackRecord = await loadTrackRecord({
    completed: [
      { crmTripSlotId: "slot-1", _sum: { numberOfTravelers: 4 } },
      { crmFestivalSlotId: "slot-1", _sum: { numberOfTravelers: 2 } },
      { slotId: "slot-1", _sum: { numberOfTravelers: 1 } },
      { _sum: { numberOfTravelers: 3 } },
    ],
    customers: [
      { _sum: { numberOfTravelers: 5 }, _count: { _all: 2 } },
      { _sum: { numberOfTravelers: 1 }, _count: { _all: 1 } },
      { _sum: { numberOfTravelers: null }, _count: { _all: 2 } },
    ],
    trips: [{ destination: { name: " Tawang " } }, { destination: { name: "Mechuka" } }, { destination: { name: "Ziro Valley" } }],
    festivals: [{ destination: { name: "tawang" } }, { destination: { name: "ZIRO   VALLEY" } }],
    legacy: [{ destination: { name: "Nagaland" } }, { destination: null }],
    rating: 4.5,
    reviewCount: 2,
  });
  assert.deepEqual(await getTrackRecord(), {
    departures: 3,
    travelerPlaces: 10,
    travelerBookings: 6,
    returningBookers: 2,
    destinations: 4,
    festivalPackages: 4,
    averageRating: 4.5,
    reviewCount: 2,
  });
});

test("an empty record returns zero counts and an absent rating", async () => {
  const getTrackRecord = await loadTrackRecord();
  assert.deepEqual(await getTrackRecord(), {
    departures: 0,
    travelerPlaces: 0,
    travelerBookings: 0,
    returningBookers: 0,
    destinations: 0,
    festivalPackages: 0,
    averageRating: null,
    reviewCount: 0,
  });
});
