/**
 * One-time importer for the legacy production dump.
 *
 * It deliberately creates new IDs for every imported row and remaps every
 * foreign key. Do not use pg_restore against the application database: the
 * dump has an older Prisma schema and migration history.
 *
 * Usage (from server/):
 *   node src/utils/scripts/importProductionDump.js --dry-run
 *   node src/utils/scripts/importProductionDump.js
 */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../../prisma/client.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultDumpPath = resolve(scriptDir, "../../../../hangover.dump");
const dumpArg = process.argv.find((arg) => arg.startsWith("--dump="));
const dumpPath = dumpArg ? resolve(process.cwd(), dumpArg.slice("--dump=".length)) : defaultDumpPath;
const dryRun = process.argv.includes("--dry-run");

const columns = {
  User: ["id", "email", "googleId", "role", "isActive", "lastLoginAt", "createdAt", "updatedAt"],
  UserProfile: ["id", "userId", "fullName", "phone", "alternatePhone", "dateOfBirth", "gender", "addressLine1", "addressLine2", "city", "state", "postalCode", "country", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", "bloodGroup", "medicalNotes", "govtIdType", "govtIdNumber", "createdAt", "updatedAt", "govtIdImageUrl", "govtIdAssetId"],
  Destination: ["id", "name", "state", "subheading", "isPublished", "createdAt", "updatedAt"],
  MediaAsset: ["id", "publicId", "resourceType", "deliveryType", "format", "version", "bytes", "width", "height", "folder", "uploadedById", "createdAt", "updatedAt"],
  TripTag: ["id", "tag", "createdAt", "updatedAt"],
  FestivalTag: ["id", "tag", "createdAt", "updatedAt"],
  Trip: ["id", "title", "slug", "location", "bannerImages", "duration", "bestTimeToVisit", "overview", "galleryImages", "inclusions", "exclusions", "price", "tokenAmount", "tripType", "isActive", "isFeatured", "createdAt", "updatedAt", "destinationId", "isPublished", "highlights", "stayTransportImages", "itinerary", "isSignature", "signatureOrder"],
  Festival: ["id", "title", "slug", "location", "bannerImages", "duration", "bestTimeToVisit", "overview", "highlights", "galleryImages", "inclusions", "exclusions", "stayTransportImages", "price", "tokenAmount", "isActive", "isFeatured", "isPublished", "createdAt", "updatedAt", "destinationId", "videoUrl", "itinerary"],
  Package: ["id", "tripId", "festivalId", "title", "price", "tokenAmount", "createdAt", "updatedAt"],
  Slot: ["id", "tripId", "festivalId", "startDate", "endDate", "title", "priority", "capacity", "filledSpots", "createdAt", "updatedAt"],
  FAQ: ["id", "tripId", "question", "answer", "order", "createdAt", "updatedAt", "festivalId"],
  Inquiry: ["id", "name", "email", "phone", "tripType", "tripId", "userId", "subject", "message", "isResolved", "resolvedAt", "resolvedById", "adminNotes", "createdAt", "updatedAt", "festivalId"],
  Booking: ["id", "bookingReference", "userId", "tripId", "status", "paymentStatus", "numberOfTravelers", "totalAmount", "tokenAmount", "amountPaid", "amountDue", "initialPaymentType", "balanceDueDate", "reservedAt", "confirmedAt", "cancelledAt", "completedAt", "cancellationReason", "cancelledBy", "specialRequests", "createdAt", "updatedAt", "festivalId", "packageId", "slotId"],
  Traveler: ["id", "bookingId", "fullName", "gender", "dateOfBirth", "phone", "aadhaar", "createdAt", "updatedAt", "aadhaarAssetId"],
  PaymentIntent: ["id", "bookingId", "razorpayOrderId", "type", "amount", "currency", "status", "expiresAt", "createdAt", "updatedAt"],
  Payment: ["id", "bookingId", "paymentIntentId", "type", "status", "amount", "currency", "razorpayOrderId", "razorpayPaymentId", "razorpaySignature", "paymentMethod", "idempotencyKey", "failureCode", "failureReason", "receiptNumber", "notes", "paidAt", "createdAt", "updatedAt", "receiptNumberInt"],
  PaymentReminder: ["id", "bookingId", "type", "status", "sentBy", "email", "subject", "sentAt", "providerMessageId", "failureReason", "createdAt"],
  PaymentWebhook: ["id", "eventId", "eventType", "payload", "signature", "processed", "processedAt", "processingError", "retryCount", "createdAt"],
  Refund: ["id", "paymentId", "amount", "status", "reason", "razorpayRefundId", "initiatedBy", "processedAt", "failureReason", "metadata", "createdAt", "updatedAt"],
  LandingFootprint: ["id", "value", "suffix", "label", "sublabel", "sortOrder", "isActive", "createdAt", "updatedAt"],
  LandingJourneyMilestone: ["id", "period", "title", "tagline", "description", "iconName", "sortOrder", "isActive", "createdAt", "updatedAt"],
  LandingReason: ["id", "title", "description", "detail", "imageUrl", "sortOrder", "isActive", "createdAt", "updatedAt"],
  LandingTripType: ["id", "label", "description", "tag", "imageUrl", "iconName", "sortOrder", "isActive", "createdAt", "updatedAt"],
  _TripToTripTag: ["A", "B"],
  _FestivalToFestivalTag: ["A", "B"],
};

const decodeCopyText = (value) => {
  if (value === "\\N") return null;
  let decoded = "";
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "\\") {
      decoded += value[index];
      continue;
    }
    const next = value[++index];
    if (next === undefined) break;
    const escapes = { b: "\b", f: "\f", n: "\n", r: "\r", t: "\t", v: "\v" };
    if (escapes[next] !== undefined) {
      decoded += escapes[next];
    } else if (/[0-7]/.test(next)) {
      const octal = value.slice(index, index + 3).match(/^[0-7]{1,3}/)?.[0] ?? next;
      decoded += String.fromCharCode(parseInt(octal, 8));
      index += octal.length - 1;
    } else {
      decoded += next;
    }
  }
  return decoded;
};

const parseCopyRows = (sql, table) => {
  const escapedTable = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`COPY public\\."${escapedTable}" \\([^)]*\\) FROM stdin;\\n([\\s\\S]*?)\\\\\\.\\n`, "m").exec(sql);
  if (!match || !match[1]) return [];
  return match[1].split("\n").filter(Boolean).map((line) => {
    const values = line.split("\t").map(decodeCopyText);
    return Object.fromEntries(columns[table].map((column, index) => [column, values[index]]));
  });
};

const bool = (value) => value === "t";
const integer = (value) => value === null ? null : Number.parseInt(value, 10);
const date = (value) => value === null ? null : new Date(value);
const json = (value, fallback = []) => value === null ? fallback : JSON.parse(value);

const pgArray = (value) => {
  if (value === null || value === "{}") return [];
  if (!value.startsWith("{") || !value.endsWith("}")) throw new Error(`Unexpected PostgreSQL array: ${value}`);
  const result = [];
  let item = "";
  let quoted = false;
  for (let index = 1; index < value.length - 1; index += 1) {
    const char = value[index];
    if (char === "\\") {
      item += value[++index] ?? "";
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      result.push(item);
      item = "";
    } else {
      item += char;
    }
  }
  if (item || value !== "{}") result.push(item);
  return result;
};

const ids = new Map();
const newId = (table, oldId) => {
  if (oldId === null) return null;
  const key = `${table}:${oldId}`;
  if (!ids.has(key)) ids.set(key, randomUUID());
  return ids.get(key);
};
const mapped = (table, oldId) => oldId === null ? null : newId(table, oldId);

const makeItinerary = (rows, parentField, parentId) => rows.flatMap((row) => {
  const itinerary = json(row.itinerary, []);
  if (!Array.isArray(itinerary)) throw new Error(`${parentField} itinerary must be an array`);
  return itinerary.map((day, index) => ({
    [parentField]: parentId,
    dayNumber: Number(day.dayNumber ?? String(day.day ?? "").match(/\d+/)?.[0] ?? index + 1),
    title: day.title ?? `Day ${index + 1}`,
    description: day.description ?? (typeof day.activities === "string" ? day.activities : null),
    todos: Array.isArray(day.todos) ? day.todos : Array.isArray(day.activities) ? day.activities : [],
    createdAt: date(row.createdAt),
    updatedAt: date(row.updatedAt),
  }));
});

const source = () => {
  if (!existsSync(dumpPath)) throw new Error(`Dump not found: ${dumpPath}`);
  const sql = execFileSync("pg_restore", ["--data-only", "--no-owner", "--no-privileges", "--file=-", dumpPath], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return Object.fromEntries(Object.keys(columns).map((table) => [table, parseCopyRows(sql, table)]));
};

const assertNoGalleryData = (data) => {
  const galleryCount = [...data.Trip, ...data.Festival]
    .reduce((count, row) => count + pgArray(row.galleryImages).length, 0);
  if (galleryCount > 0) {
    throw new Error(`Refusing to drop ${galleryCount} legacy gallery images. Add a gallery destination before importing.`);
  }
};

const targetIsEmpty = async (tx) => {
  const counts = await Promise.all([
    tx.user.count(), tx.destination.count(), tx.trip.count(), tx.festival.count(),
    tx.booking.count(), tx.payment.count(), tx.paymentIntent.count(), tx.traveler.count(),
    tx.mediaAsset.count(), tx.inquiry.count(), tx.tripTag.count(), tx.festivalTag.count(),
  ]);
  return counts.every((count) => count === 0);
};

const importRows = async (data) => prisma.$transaction(async (tx) => {
  if (!await targetIsEmpty(tx)) {
    throw new Error("Target database is not empty. Refusing to merge a test import into existing data.");
  }

  for (const row of data.Destination) await tx.destination.create({ data: {
    id: newId("Destination", row.id), name: row.name, state: row.state, subheading: row.subheading,
    isPublished: bool(row.isPublished), createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
  for (const row of data.User) await tx.user.create({ data: {
    id: newId("User", row.id), email: row.email, googleId: row.googleId, role: row.role,
    isActive: bool(row.isActive), lastLoginAt: date(row.lastLoginAt), createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
  for (const row of data.MediaAsset) await tx.mediaAsset.create({ data: {
    id: newId("MediaAsset", row.id), publicId: row.publicId, resourceType: row.resourceType, deliveryType: row.deliveryType,
    format: row.format, version: row.version, bytes: integer(row.bytes), width: integer(row.width), height: integer(row.height), folder: row.folder,
    uploadedById: mapped("User", row.uploadedById), createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
  for (const row of data.UserProfile) await tx.userProfile.create({ data: {
    id: newId("UserProfile", row.id), userId: mapped("User", row.userId), fullName: row.fullName, phone: row.phone,
    alternatePhone: row.alternatePhone, dateOfBirth: date(row.dateOfBirth), gender: row.gender, addressLine1: row.addressLine1,
    addressLine2: row.addressLine2, city: row.city, state: row.state, postalCode: row.postalCode, country: row.country,
    emergencyContactName: row.emergencyContactName, emergencyContactPhone: row.emergencyContactPhone,
    emergencyContactRelation: row.emergencyContactRelation, bloodGroup: row.bloodGroup, medicalNotes: row.medicalNotes,
    govtIdType: row.govtIdType, govtIdNumber: row.govtIdNumber, govtIdImageUrl: row.govtIdImageUrl,
    govtIdAssetId: mapped("MediaAsset", row.govtIdAssetId), createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
  for (const row of data.TripTag) await tx.tripTag.create({ data: {
    id: newId("TripTag", row.id), tag: row.tag, createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
  for (const row of data.FestivalTag) await tx.festivalTag.create({ data: {
    id: newId("FestivalTag", row.id), tag: row.tag, createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
  for (const row of data.Trip) await tx.trip.create({ data: {
    id: newId("Trip", row.id), title: row.title, slug: row.slug, location: row.location, bannerImages: pgArray(row.bannerImages),
    duration: integer(row.duration), bestTimeToVisit: row.bestTimeToVisit, overview: row.overview, inclusions: pgArray(row.inclusions),
    exclusions: pgArray(row.exclusions), tripType: row.tripType, isActive: bool(row.isActive), isFeatured: bool(row.isFeatured),
    isSignature: bool(row.isSignature), signatureOrder: integer(row.signatureOrder), destinationId: mapped("Destination", row.destinationId),
    isPublished: bool(row.isPublished), isListed: true, highlights: json(row.highlights), stayTransportImages: json(row.stayTransportImages),
    createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
  for (const row of data.Festival) await tx.festival.create({ data: {
    id: newId("Festival", row.id), title: row.title, slug: row.slug, location: row.location, bannerImages: pgArray(row.bannerImages),
    videoUrl: row.videoUrl, duration: integer(row.duration), bestTimeToVisit: row.bestTimeToVisit, overview: row.overview,
    highlights: json(row.highlights), inclusions: pgArray(row.inclusions), exclusions: pgArray(row.exclusions),
    stayTransportImages: json(row.stayTransportImages), isActive: bool(row.isActive), isFeatured: bool(row.isFeatured),
    isPublished: bool(row.isPublished), isListed: true, destinationId: mapped("Destination", row.destinationId),
    createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
  for (const row of data.Package) await tx.package.create({ data: {
    id: newId("Package", row.id), tripId: mapped("Trip", row.tripId), festivalId: mapped("Festival", row.festivalId), title: row.title,
    price: row.price, tokenAmount: row.tokenAmount, createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
  for (const row of data.Slot) await tx.slot.create({ data: {
    id: newId("Slot", row.id), tripId: mapped("Trip", row.tripId), festivalId: mapped("Festival", row.festivalId),
    startDate: date(row.startDate), endDate: date(row.endDate), title: row.title, priority: integer(row.priority), capacity: integer(row.capacity),
    filledSpots: integer(row.filledSpots), createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
  const tripItinerary = data.Trip.flatMap((row) => makeItinerary([row], "tripId", mapped("Trip", row.id)));
  const festivalItinerary = data.Festival.flatMap((row) => makeItinerary([row], "festivalId", mapped("Festival", row.id)));
  if (tripItinerary.length) await tx.itineraryDay.createMany({ data: tripItinerary });
  if (festivalItinerary.length) await tx.itineraryDay.createMany({ data: festivalItinerary });
  for (const row of data.FAQ) await tx.fAQ.create({ data: {
    id: newId("FAQ", row.id), tripId: mapped("Trip", row.tripId), festivalId: mapped("Festival", row.festivalId),
    question: row.question, answer: row.answer, order: integer(row.order), createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
  for (const row of data._TripToTripTag) await tx.trip.update({ where: { id: mapped("Trip", row.A) }, data: { tripTags: { connect: { id: mapped("TripTag", row.B) } } } });
  for (const row of data._FestivalToFestivalTag) await tx.festival.update({ where: { id: mapped("Festival", row.A) }, data: { tags: { connect: { id: mapped("FestivalTag", row.B) } } } });
  for (const row of data.Inquiry) await tx.inquiry.create({ data: {
    id: newId("Inquiry", row.id), name: row.name, email: row.email, phone: row.phone, tripType: row.tripType,
    tripId: mapped("Trip", row.tripId), festivalId: mapped("Festival", row.festivalId), userId: mapped("User", row.userId), subject: row.subject,
    message: row.message, isResolved: bool(row.isResolved), resolvedAt: date(row.resolvedAt), resolvedById: mapped("User", row.resolvedById),
    adminNotes: row.adminNotes, createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
  for (const row of data.Booking) await tx.booking.create({ data: {
    id: newId("Booking", row.id), bookingReference: row.bookingReference, userId: mapped("User", row.userId), tripId: mapped("Trip", row.tripId),
    festivalId: mapped("Festival", row.festivalId), packageId: mapped("Package", row.packageId), slotId: mapped("Slot", row.slotId),
    status: row.status, paymentStatus: row.paymentStatus, numberOfTravelers: integer(row.numberOfTravelers), totalAmount: row.totalAmount,
    tokenAmount: row.tokenAmount, amountPaid: row.amountPaid, amountDue: row.amountDue, initialPaymentType: row.initialPaymentType,
    balanceDueDate: date(row.balanceDueDate), reservedAt: date(row.reservedAt), confirmedAt: date(row.confirmedAt), cancelledAt: date(row.cancelledAt),
    completedAt: date(row.completedAt), cancellationReason: row.cancellationReason, cancelledBy: row.cancelledBy, specialRequests: row.specialRequests,
    source: "CATALOG", createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
  for (const row of data.Traveler) await tx.traveler.create({ data: {
    id: newId("Traveler", row.id), bookingId: mapped("Booking", row.bookingId), fullName: row.fullName, gender: row.gender,
    dateOfBirth: date(row.dateOfBirth), phone: row.phone, aadhaar: row.aadhaar, aadhaarAssetId: mapped("MediaAsset", row.aadhaarAssetId),
    createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
  for (const row of data.PaymentIntent) await tx.paymentIntent.create({ data: {
    id: newId("PaymentIntent", row.id), bookingId: mapped("Booking", row.bookingId), razorpayOrderId: row.razorpayOrderId,
    type: row.type, amount: row.amount, currency: row.currency, status: row.status, expiresAt: date(row.expiresAt),
    createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
  for (const row of data.Payment) await tx.payment.create({ data: {
    id: newId("Payment", row.id), bookingId: mapped("Booking", row.bookingId), paymentIntentId: mapped("PaymentIntent", row.paymentIntentId),
    type: row.type, status: row.status, amount: row.amount, currency: row.currency, razorpayOrderId: row.razorpayOrderId,
    razorpayPaymentId: row.razorpayPaymentId, razorpaySignature: row.razorpaySignature, paymentMethod: row.paymentMethod,
    idempotencyKey: row.idempotencyKey, failureCode: row.failureCode, failureReason: row.failureReason, receiptNumber: row.receiptNumber,
    notes: json(row.notes, null), paidAt: date(row.paidAt), createdAt: date(row.createdAt), updatedAt: date(row.updatedAt), receiptNumberInt: integer(row.receiptNumberInt),
  }});
  for (const row of data.PaymentReminder) await tx.paymentReminder.create({ data: {
    id: newId("PaymentReminder", row.id), bookingId: mapped("Booking", row.bookingId), type: row.type, status: row.status,
    sentBy: row.sentBy, email: row.email, subject: row.subject, sentAt: date(row.sentAt), providerMessageId: row.providerMessageId,
    failureReason: row.failureReason, createdAt: date(row.createdAt),
  }});
  for (const row of data.PaymentWebhook) await tx.paymentWebhook.create({ data: {
    id: newId("PaymentWebhook", row.id), eventId: row.eventId, eventType: row.eventType, payload: json(row.payload, {}), signature: row.signature,
    processed: bool(row.processed), processedAt: date(row.processedAt), processingError: row.processingError, retryCount: integer(row.retryCount), createdAt: date(row.createdAt),
  }});
  for (const row of data.Refund) await tx.refund.create({ data: {
    id: newId("Refund", row.id), paymentId: mapped("Payment", row.paymentId), amount: row.amount, status: row.status, reason: row.reason,
    razorpayRefundId: row.razorpayRefundId, initiatedBy: row.initiatedBy, processedAt: date(row.processedAt), failureReason: row.failureReason,
    metadata: json(row.metadata, null), createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
  for (const row of data.LandingFootprint) await tx.landingFootprint.create({ data: {
    id: newId("LandingFootprint", row.id), value: Number(row.value), suffix: row.suffix, label: row.label, sublabel: row.sublabel,
    sortOrder: integer(row.sortOrder), isActive: bool(row.isActive), createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
  for (const row of data.LandingJourneyMilestone) await tx.landingJourneyMilestone.create({ data: {
    id: newId("LandingJourneyMilestone", row.id), period: row.period, title: row.title, tagline: row.tagline, description: row.description,
    iconName: row.iconName, sortOrder: integer(row.sortOrder), isActive: bool(row.isActive), createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
  for (const row of data.LandingReason) await tx.landingReason.create({ data: {
    id: newId("LandingReason", row.id), title: row.title, description: row.description, detail: row.detail, imageUrl: row.imageUrl,
    sortOrder: integer(row.sortOrder), isActive: bool(row.isActive), createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
  for (const row of data.LandingTripType) await tx.landingTripType.create({ data: {
    id: newId("LandingTripType", row.id), label: row.label, description: row.description, tag: row.tag, imageUrl: row.imageUrl,
    iconName: row.iconName, sortOrder: integer(row.sortOrder), isActive: bool(row.isActive), createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  }});
}, { timeout: 60_000 });

try {
  const data = source();
  assertNoGalleryData(data);
  const summary = Object.fromEntries(Object.entries(data).map(([table, rows]) => [table, rows.length]));
  console.log("Production dump parsed", summary);
  if (dryRun) {
    console.log("Dry run complete. No database changes were made.");
  } else {
    await importRows(data);
    console.log("Production content import complete. All imported IDs are new and relationships were remapped.");
  }
} catch (error) {
  console.error("Production content import failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
