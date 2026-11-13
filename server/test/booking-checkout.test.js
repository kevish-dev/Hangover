import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SourceTextModule, SyntheticModule } from "node:vm";
import crypto from "node:crypto";
import * as errors from "../src/core/errors/errors.js";
import { addGst } from "../src/utils/gst.js";

const source = await readFile(new URL("../src/modules/booking/booking.service.js", import.meta.url), "utf8");

// Run the real service with isolated database/media boundaries. These tests
// never load .env, connect to a database, or call Razorpay/Cloudinary/SMTP.
async function checkoutFixture(kind, initialBookings = []) {
  const rows = structuredClone(initialBookings);
  const stats = { creates: 0, operations: 0, transactions: 0, locks: [] };
  const item = {
    id: "item-1", isActive: true, isPublished: true, isListed: true,
    packages: [{ id: "package-1", price: 1000, tokenAmount: 200 }], addOns: [],
  };
  const slot = { id: "slot-1", capacity: 10, filledSpots: 0, startDate: new Date("2099-01-01"), endDate: new Date("2099-01-03") };
  const itemField = { trip: "tripId", festival: "festivalId", crmTrip: "crmTripId", crmFestival: "crmFestivalId" }[kind];
  const matches = (row, where) => row.userId === where.userId
    && where.status.in.includes(row.status)
    && where.OR.some((filter) => Object.entries(filter).some(([key, value]) => typeof value === "string" && row[key] === value));
  const bookingDb = {
    findMany: async ({ where }) => rows.filter((row) => matches(row, where)),
    findUnique: async ({ where }) => rows.find((row) => row.id === where.id),
    create: async ({ data }) => {
      // Yield while the INSERT is in progress to expose a missing lock.
      await new Promise(setImmediate);
      stats.creates++;
      const row = structuredClone(data);
      rows.push(row);
      return row;
    },
  };
  let sequence = 0;
  const lockTails = new Map();
  const db = {
    user: { findUnique: async () => ({ profile: { govtIdAssetId: "id-1", fullName: "Test Traveler", phone: "9876543210", gender: "OTHER", dateOfBirth: new Date("1990-01-01") } }) },
    slot: { findUnique: async () => ["trip", "festival"].includes(kind) ? { ...slot, [itemField]: item.id, [kind]: item } : null },
    crmTripSlot: { findUnique: async () => kind === "crmTrip" ? { ...slot, crmTripId: item.id, crmTrip: item } : null },
    crmFestivalSlot: { findUnique: async () => kind === "crmFestival" ? { ...slot, crmFestivalId: item.id, crmFestival: item } : null },
    booking: bookingDb,
    $queryRaw: async () => [{ sequence: ++sequence }],
    $transaction: async (callback) => {
      stats.transactions++;
      let release;
      const tx = {
        booking: bookingDb,
        $queryRaw: async (_sql, key) => {
          stats.locks.push(key);
          const previous = lockTails.get(key) || Promise.resolve();
          const current = new Promise((resolve) => { release = resolve; });
          lockTails.set(key, current);
          await previous;
          return [{ lock: "" }];
        },
      };
      try { return await callback(tx); }
      finally { release?.(); }
    },
  };
  const generateOperations = async () => { stats.operations++; };
  const modules = {
    "./booking.repository.js": {
      createBooking: (data, tx) => {
        assert.ok(tx && tx !== db, "INSERT must use the locked transaction");
        return tx.booking.create({ data });
      },
      getCheckoutBookingById: (id, client = db) => client.booking.findUnique({ where: { id } }),
    },
    "../../prisma/client.js": { prisma: db },
    "../../utils/gst.js": { addGst },
    "../../core/errors/errors.js": { ...errors },
    "crypto": { default: crypto },
    "../../core/services/upload.service.js": Object.fromEntries(["uploadSensitiveDocument", "createAuthenticatedDeliveryUrl", "deleteMediaAsset"].map((name) => [name, () => { throw new Error(`Unexpected media call: ${name}`); }])),
    "./booking-journey.js": { getBookingJourney: () => ({}) },
    "../operations/operations.service.js": {
      generateBookingOperations: generateOperations,
      generateCrmBookingOperations: generateOperations,
      generateCrmFestivalBookingOperations: generateOperations,
    },
    "./slot-capacity.service.js": Object.fromEntries(["bookingHoldsSlotCapacity", "cancelBookingOperations", "releaseBookingSlotCapacity", "reserveBookingSlotCapacity"].map((name) => [name, () => {}])),
  };
  const service = new SourceTextModule(source);
  await service.link((specifier) => {
    const values = modules[specifier];
    assert.ok(values, `Unexpected dependency: ${specifier}`);
    return new SyntheticModule(Object.keys(values), function () {
      for (const [name, value] of Object.entries(values)) this.setExport(name, value);
    });
  });
  await service.evaluate();
  const request = { slotId: slot.id, packageId: "package-1", numberOfTravelers: 1, initialPaymentType: "FULL" };
  return { create: (data = request, userId = "user-1") => service.namespace.createBooking(userId, data), request, rows, stats, itemField };
}

for (const kind of ["trip", "festival", "crmTrip", "crmFestival"]) {
  test(`${kind}: simultaneous submissions create one booking and one set of operations`, async () => {
    const fixture = await checkoutFixture(kind);
    const [first, second] = await Promise.all([fixture.create(), fixture.create()]);
    assert.equal(first.id, second.id);
    assert.equal(fixture.rows.length, 1);
    assert.equal(fixture.stats.creates, 1);
    assert.equal(fixture.stats.operations, 1);
    assert.equal(fixture.stats.transactions, 2, "both requests must reach the concurrent creation path");
    assert.deepEqual(fixture.stats.locks, ["booking:user-1", "booking:user-1"]);
  });

  test(`${kind}: retry after checkout dismissal resumes the unchanged pending booking`, async () => {
    const fixture = await checkoutFixture(kind);
    const first = await fixture.create();
    const snapshot = structuredClone(first);
    const resumed = await fixture.create({ ...fixture.request, numberOfTravelers: 2, specialRequests: "Changed form" });
    assert.deepEqual(resumed, snapshot);
    assert.equal(fixture.stats.creates, 1);
    assert.equal(fixture.stats.transactions, 1);
    assert.equal(fixture.stats.operations, 1);
  });
}

for (const status of ["RESERVED", "CONFIRMED"]) {
  test(`${status} bookings still prevent another booking for the same item`, async () => {
    const fixture = await checkoutFixture("festival", [{ id: "existing", userId: "user-1", festivalId: "item-1", status }]);
    await assert.rejects(fixture.create(), /already have an active booking for this festival/);
    assert.equal(fixture.stats.creates, 0);
  });
}

test("a pending booking under UTR review is returned without resetting its status", async () => {
  const existing = { id: "review", userId: "user-1", crmFestivalId: "item-1", status: "PENDING", paymentStatus: "PENDING_VERIFICATION" };
  const fixture = await checkoutFixture("crmFestival", [existing]);
  assert.deepEqual(await fixture.create(), existing);
  assert.equal(fixture.stats.creates, 0);
});

test("a pending booking belonging to another user is never resumed", async () => {
  const fixture = await checkoutFixture("trip", [{ id: "other", userId: "user-2", tripId: "item-1", status: "PENDING" }]);
  const booking = await fixture.create();
  assert.notEqual(booking.id, "other");
  assert.equal(booking.userId, "user-1");
  assert.equal(fixture.stats.creates, 1);
});
