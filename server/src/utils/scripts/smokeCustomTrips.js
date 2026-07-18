import crypto from "crypto";
import { prisma } from "../../prisma/client.js";
import {
  bookOffer,
  createCustomTrip,
  duplicateCustomTrip,
  getOffer,
  updateCustomTrip,
} from "../../modules/custom-trip/custom-trip.service.js";

const suffix = crypto.randomBytes(5).toString("hex");
const token = crypto.randomBytes(32).toString("base64url");
const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
let admin;
let customer;
let customTrip;
let duplicate;
let booking;

const day = (offset) => new Date(Date.now() + offset * 86_400_000);
const input = {
  title: "Custom Trip Smoke Test",
  description: "Temporary integration record.",
  customerName: "Custom Trip Test Customer",
  customerEmail: `custom-trip-customer-${suffix}@example.com`,
  startDate: day(5),
  endDate: day(6),
  travelerCount: 1,
  totalAmount: 12000,
  tokenAmount: 3000,
  balanceDueDate: day(3),
  validUntil: new Date(Date.now() + 3_600_000),
  bannerImages: ["https://example.com/custom-trip-smoke.jpg"],
  highlights: [{ title: "Flexible private plan", description: "Smoke-test highlight" }],
  itinerary: [
    { day: 1, title: "Arrival", description: "First day", activities: ["Check in"] },
    { day: 2, title: "Departure", description: "Second day", activities: ["Check out"] },
  ],
};

try {
  admin = await prisma.user.create({
    data: { email: `custom-trip-admin-${suffix}@example.com`, googleId: `custom-trip-admin-${suffix}`, role: "ADMIN" },
  });
  customer = await prisma.user.create({
    data: {
      email: input.customerEmail,
      googleId: `custom-trip-customer-${suffix}`,
      profile: { create: { fullName: input.customerName, phone: "9999999999", govtIdNumber: "TEST-ID" } },
    },
  });

  let incompleteCreationRejected = false;
  try {
    await createCustomTrip(admin.id, {
      ...input,
      title: `Incomplete Custom Trip ${suffix}`,
      customerUserId: customer.id,
      highlights: [],
    });
  } catch (error) {
    incompleteCreationRejected = error?.code === "VALIDATION_ERROR";
  }
  const incompleteRecords = await prisma.customTrip.count({ where: { title: `Incomplete Custom Trip ${suffix}` } });
  if (!incompleteCreationRejected || incompleteRecords !== 0) {
    throw new Error("Complete-at-creation validation smoke check failed.");
  }

  customTrip = await createCustomTrip(admin.id, { ...input, customerUserId: customer.id });
  customTrip = await updateCustomTrip(customTrip.id, { ...input, title: "Updated Custom Trip Smoke Test", customerUserId: customer.id });
  duplicate = await duplicateCustomTrip(customTrip.id, admin.id);

  await prisma.customTrip.update({
    where: { id: customTrip.id },
    data: { status: "SENT", shareTokenHash: tokenHash, sentAt: new Date() },
  });
  const offer = await getOffer(token, customer);
  if (!offer.canBook || offer.status !== "VIEWED") throw new Error("Offer visibility/ownership smoke check failed.");
  let wrongCustomerRejected = false;
  try {
    await bookOffer(token, admin.id, { initialPaymentType: "TOKEN", additionalTravelers: [] });
  } catch (error) {
    wrongCustomerRejected = error?.code === "FORBIDDEN";
  }
  if (!wrongCustomerRejected) throw new Error("Intended-customer protection smoke check failed.");

  booking = await bookOffer(token, customer.id, { initialPaymentType: "TOKEN", additionalTravelers: [] });
  if (booking.source !== "CUSTOM" || booking.slotId !== null || booking.customTripId !== customTrip.id) {
    throw new Error("Slotless custom booking invariant failed.");
  }
  const converted = await prisma.customTrip.findUnique({ where: { id: customTrip.id } });
  if (converted?.status !== "CONVERTED") throw new Error("Custom trip conversion smoke check failed.");
  const idempotentBooking = await bookOffer(token, customer.id, { initialPaymentType: "TOKEN", additionalTravelers: [] });
  if (idempotentBooking.id !== booking.id) throw new Error("Idempotent conversion smoke check failed.");

  console.log(`Custom Trip smoke test passed: ${customTrip.reference} -> ${booking.bookingReference}`);
} finally {
  if (booking?.id) await prisma.booking.delete({ where: { id: booking.id } }).catch(() => undefined);
  if (duplicate?.id) await prisma.customTrip.delete({ where: { id: duplicate.id } }).catch(() => undefined);
  if (customTrip?.id) await prisma.customTrip.delete({ where: { id: customTrip.id } }).catch(() => undefined);
  if (customer?.id) await prisma.user.delete({ where: { id: customer.id } }).catch(() => undefined);
  if (admin?.id) await prisma.user.delete({ where: { id: admin.id } }).catch(() => undefined);
  await prisma.$disconnect();
}
