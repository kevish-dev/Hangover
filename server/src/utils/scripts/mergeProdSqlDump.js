/**
 * Selectively merge the legacy production SQL dump into the current CRM schema.
 *
 * Policy:
 * - The target/local CRM trip catalog is authoritative. Legacy Trip/Circuit and
 *   trip-slot rows are never imported.
 * - Legacy Festival rows are transformed into CrmFestival rows, including
 *   packages, slots, itinerary activities, tags, bookings, and financial data.
 * - Existing target users are matched by email. Production authentication and
 *   non-null profile data are retained on the canonical target user.
 * - Production UUIDs are retained for new audit and transaction rows.
 * - The entire merge runs in one transaction. Without --apply it is rolled back
 *   after all writes and validations have executed.
 *
 * Usage (from server/):
 *   node src/utils/scripts/mergeProdSqlDump.js --dump=prod_dump.sql
 *   node src/utils/scripts/mergeProdSqlDump.js --dump=prod_dump.sql --apply
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../../prisma/client.js";

const apply = process.argv.includes("--apply");
const dumpArg = process.argv.find((arg) => arg.startsWith("--dump="));
const dumpPath = resolve(process.cwd(), dumpArg?.slice("--dump=".length) || "prod_dump.sql");
const ACTIVE_BOOKING_STATUSES = ["RESERVED", "CONFIRMED"];

class DryRunRollback extends Error {
  constructor(summary) {
    super("Dry-run rollback");
    this.summary = summary;
  }
}

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
      decoded += String.fromCharCode(Number.parseInt(octal, 8));
      index += octal.length - 1;
    } else {
      decoded += next;
    }
  }
  return decoded;
};

const parseDump = (sql) => {
  const lines = sql.split("\n");
  const data = {};
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(
      /^COPY public\.(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*)) \(([^)]*)\) FROM stdin;$/,
    );
    if (!match) continue;
    const table = match[1] ?? match[2];
    const columns = match[3].split(", ").map((column) => column.replaceAll('"', ""));
    const rows = [];
    for (index += 1; index < lines.length && lines[index] !== "\\."; index += 1) {
      if (!lines[index]) continue;
      const values = lines[index].split("\t").map(decodeCopyText);
      if (values.length !== columns.length) {
        throw new Error(`${table}: expected ${columns.length} COPY values, received ${values.length}`);
      }
      rows.push(Object.fromEntries(columns.map((column, valueIndex) => [column, values[valueIndex]])));
    }
    data[table] = rows;
  }
  return data;
};

const bool = (value) => value === true || value === "t";
const integer = (value, fallback = null) => value == null ? fallback : Number.parseInt(value, 10);
const number = (value, fallback = null) => value == null ? fallback : Number(value);
// pg_dump emits TIMESTAMP WITHOUT TIME ZONE values without an offset. Prisma
// serializes Date objects in UTC, so parsing those values in the host timezone
// would shift the stored wall clock (for example 19:38 -> 14:08 in IST).
// Treat offset-less dump timestamps as UTC solely to preserve their literal
// database value. Values that already contain an offset retain that offset.
const date = (value) => {
  if (value == null) return null;
  if (value instanceof Date) return new Date(value);
  const text = String(value).trim();
  const hasOffset = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(text);
  return new Date(hasOffset ? text : `${text.replace(" ", "T")}Z`);
};
const json = (value, fallback) => value == null ? fallback : JSON.parse(value);
const normalized = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const pgArray = (value) => {
  if (value == null || value === "{}") return [];
  if (!value.startsWith("{") || !value.endsWith("}")) {
    throw new Error(`Unexpected PostgreSQL array: ${value.slice(0, 80)}`);
  }
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

const deterministicUuid = (namespace, value) => {
  const hex = createHash("sha256").update(`${namespace}:${value}`).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const compact = hex.join("");
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
};

const laterDate = (left, right) => {
  const values = [left, right].filter(Boolean).map((value) => new Date(value));
  return values.length ? new Date(Math.max(...values.map(Number))) : null;
};

const earlierDate = (left, right) => {
  const values = [left, right].filter(Boolean).map((value) => new Date(value));
  return values.length ? new Date(Math.min(...values.map(Number))) : null;
};

const requiredTables = [
  "User", "UserProfile", "MediaAsset", "TripTag", "FestivalTag", "Festival",
  "ItineraryDay", "FAQ", "Package", "Slot", "Inquiry", "Booking", "Traveler",
  "PaymentIntent", "Payment", "PaymentReminder", "PaymentWebhook", "Refund",
  "LedgerEntry", "CustomInvoice", "LandingFootprint", "LandingJourneyMilestone",
  "LandingReason", "LandingTripType", "_FestivalToFestivalTag", "Trip",
];

const assertSourceShape = (source) => {
  for (const table of requiredTables) {
    if (!source[table]) throw new Error(`Production dump is missing required table ${table}`);
  }
  const unsupportedBookings = source.Booking.filter((booking) => !booking.festivalId);
  if (unsupportedBookings.length) {
    throw new Error(
      `Refusing to import ${unsupportedBookings.length} non-festival booking(s); local CRM trips are authoritative`,
    );
  }
  for (const booking of source.Booking) {
    if (!source.Festival.some((festival) => festival.id === booking.festivalId)) {
      throw new Error(`Booking ${booking.id} references a missing production festival`);
    }
  }
};

const makeStats = () => {
  const values = {};
  return {
    bump(key, amount = 1) {
      values[key] = (values[key] || 0) + amount;
    },
    values,
  };
};

const createIfMissing = async ({ find, create, stats, key }) => {
  const existing = await find();
  if (existing) {
    stats.bump(`${key}.existing`);
    return existing;
  }
  const created = await create();
  stats.bump(`${key}.created`);
  return created;
};

const merge = async (source) => prisma.$transaction(async (tx) => {
  const stats = makeStats();
  const userIds = new Map();
  const mediaIds = new Map();
  const tripTagIds = new Map();
  const festivalTagIds = new Map();
  const festivalIds = new Map();
  const festivalSlotIds = new Map();
  const packageIds = new Map();

  const existingUsers = await tx.user.findMany({ include: { profile: true } });
  for (const row of source.User) {
    const byEmail = existingUsers.find((user) => normalized(user.email) === normalized(row.email));
    const byGoogle = existingUsers.find((user) => user.googleId === row.googleId);
    if (byGoogle && byEmail && byGoogle.id !== byEmail.id) {
      throw new Error(`User identity conflict for production user ${row.id}`);
    }
    if (byGoogle && !byEmail) {
      throw new Error(`Production Google identity is owned by a different target email for user ${row.id}`);
    }

    if (byEmail) {
      const googleConflict = await tx.user.findFirst({
        where: { googleId: row.googleId, id: { not: byEmail.id } },
      });
      if (googleConflict) throw new Error(`Cannot retain production Google identity for ${row.id}`);
      const merged = await tx.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: row.googleId,
          role: byEmail.role === "ADMIN" || row.role === "ADMIN" ? "ADMIN" : "USER",
          isActive: byEmail.isActive || bool(row.isActive),
          lastLoginAt: laterDate(byEmail.lastLoginAt, row.lastLoginAt),
          createdAt: earlierDate(byEmail.createdAt, row.createdAt),
          updatedAt: laterDate(byEmail.updatedAt, row.updatedAt),
        },
      });
      userIds.set(row.id, merged.id);
      stats.bump("users.merged");
    } else {
      const created = await tx.user.create({ data: {
        id: row.id,
        email: row.email,
        googleId: row.googleId,
        role: row.role,
        isActive: bool(row.isActive),
        lastLoginAt: date(row.lastLoginAt),
        createdAt: date(row.createdAt),
        updatedAt: date(row.updatedAt),
      }});
      existingUsers.push({ ...created, profile: null });
      userIds.set(row.id, created.id);
      stats.bump("users.created");
    }
  }

  for (const row of source.MediaAsset) {
    const existing = await tx.mediaAsset.findFirst({
      where: { OR: [{ id: row.id }, { publicId: row.publicId }] },
    });
    if (existing) {
      mediaIds.set(row.id, existing.id);
      stats.bump("media.existing");
      continue;
    }
    const created = await tx.mediaAsset.create({ data: {
      id: row.id,
      publicId: row.publicId,
      resourceType: row.resourceType,
      deliveryType: row.deliveryType,
      format: row.format,
      version: row.version,
      bytes: integer(row.bytes),
      width: integer(row.width),
      height: integer(row.height),
      folder: row.folder,
      uploadedById: row.uploadedById ? userIds.get(row.uploadedById) : null,
      createdAt: date(row.createdAt),
      updatedAt: date(row.updatedAt),
    }});
    mediaIds.set(row.id, created.id);
    stats.bump("media.created");
  }

  const profileFields = [
    "fullName", "phone", "alternatePhone", "gender", "addressLine1", "addressLine2",
    "city", "state", "postalCode", "country", "emergencyContactName",
    "emergencyContactPhone", "emergencyContactRelation", "bloodGroup", "medicalNotes",
    "govtIdType", "govtIdNumber", "govtIdImageUrl",
  ];
  for (const row of source.UserProfile) {
    const userId = userIds.get(row.userId);
    if (!userId) throw new Error(`Profile ${row.id} has no mapped user`);
    const existing = await tx.userProfile.findUnique({ where: { userId } });
    const productionData = Object.fromEntries(
      profileFields.filter((field) => row[field] != null).map((field) => [field, row[field]]),
    );
    if (row.dateOfBirth != null) productionData.dateOfBirth = date(row.dateOfBirth);
    if (row.govtIdAssetId != null) productionData.govtIdAssetId = mediaIds.get(row.govtIdAssetId) ?? null;
    if (existing) {
      await tx.userProfile.update({
        where: { id: existing.id },
        data: {
          ...productionData,
          createdAt: earlierDate(existing.createdAt, row.createdAt),
          updatedAt: laterDate(existing.updatedAt, row.updatedAt),
        },
      });
      stats.bump("profiles.merged");
    } else {
      await tx.userProfile.create({ data: {
        id: row.id,
        userId,
        ...Object.fromEntries(profileFields.map((field) => [field, row[field]])),
        dateOfBirth: date(row.dateOfBirth),
        govtIdAssetId: row.govtIdAssetId ? mediaIds.get(row.govtIdAssetId) : null,
        createdAt: date(row.createdAt),
        updatedAt: date(row.updatedAt),
      }});
      stats.bump("profiles.created");
    }
  }

  for (const row of source.TripTag) {
    const existing = await tx.tripTag.findFirst({ where: { tag: { equals: row.tag, mode: "insensitive" } } });
    if (existing) {
      tripTagIds.set(row.id, existing.id);
      stats.bump("tripTags.existing");
    } else {
      const created = await tx.tripTag.create({ data: {
        id: row.id, tag: row.tag, createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
      }});
      tripTagIds.set(row.id, created.id);
      stats.bump("tripTags.created");
    }
  }

  for (const row of source.FestivalTag) {
    const existing = await tx.festivalTag.findFirst({ where: { tag: { equals: row.tag, mode: "insensitive" } } });
    if (existing) {
      festivalTagIds.set(row.id, existing.id);
      stats.bump("festivalTags.existing");
    } else {
      const created = await tx.festivalTag.create({ data: {
        id: row.id, tag: row.tag, createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
      }});
      festivalTagIds.set(row.id, created.id);
      stats.bump("festivalTags.created");
    }
  }

  const crmDestinations = await tx.crmDestination.findMany();
  for (const row of source.Festival) {
    const sourceDestination = source.Destination?.find((item) => item.id === row.destinationId);
    const targetDestination = crmDestinations.find(
      (item) => normalized(item.name) === normalized(sourceDestination?.name),
    );
    if (!targetDestination) {
      throw new Error(`Festival ${row.title} has no matching local CRM destination`);
    }
    const sourcePackages = source.Package.filter((item) => item.festivalId === row.id);
    const sourceSlots = source.Slot.filter((item) => item.festivalId === row.id);
    if (!sourcePackages.length || !sourceSlots.length) {
      throw new Error(`Festival ${row.title} requires at least one package and one slot`);
    }
    const sourceFaqs = source.FAQ
      .filter((item) => item.festivalId === row.id)
      .sort((left, right) => integer(left.order, 0) - integer(right.order, 0));
    const basePackage = [...sourcePackages].sort((left, right) => number(left.price, 0) - number(right.price, 0))[0];
    const existing = await tx.crmFestival.findFirst({
      where: { OR: [{ id: row.id }, { name: { equals: row.title, mode: "insensitive" } }] },
    });
    const festivalData = {
      name: row.title,
      numberOfNights: integer(row.duration, 0),
      totalAmount: number(basePackage.price, 0),
      tokenAmount: number(basePackage.tokenAmount, 0),
      destinationId: targetDestination.id,
      tripType: null,
      bestTimeToVisit: row.bestTimeToVisit,
      isActive: bool(row.isActive),
      isFeatured: bool(row.isFeatured),
      isPublished: bool(row.isPublished),
      isListed: bool(row.isListed),
      operationsReminderDays: 3,
      exclusions: pgArray(row.exclusions),
      websiteOverview: row.overview,
      websiteFaqs: sourceFaqs.map((faq) => ({ question: faq.question, answer: faq.answer })),
      websiteBannerImages: pgArray(row.bannerImages),
      websiteStayTransportImages: json(row.stayTransportImages, []),
      websiteHighlights: json(row.highlights, []),
      websiteVideoUrl: row.videoUrl,
      createdAt: date(row.createdAt),
      updatedAt: date(row.updatedAt),
    };
    const targetFestival = existing
      ? await tx.crmFestival.update({ where: { id: existing.id }, data: festivalData })
      : await tx.crmFestival.create({ data: { id: row.id, ...festivalData } });
    festivalIds.set(row.id, targetFestival.id);
    stats.bump(existing ? "festivals.merged" : "festivals.created");

    const tagIds = source._FestivalToFestivalTag
      .filter((link) => link.A === row.id)
      .map((link) => festivalTagIds.get(link.B))
      .filter(Boolean);
    if (tagIds.length) {
      await tx.crmFestival.update({
        where: { id: targetFestival.id },
        data: { websiteTags: { set: tagIds.map((id) => ({ id })) } },
      });
    }

    for (const sourcePackage of sourcePackages) {
      const existingPackage = await tx.package.findUnique({ where: { id: sourcePackage.id } });
      if (existingPackage && existingPackage.crmFestivalId !== targetFestival.id) {
        throw new Error(`Package ID collision for ${sourcePackage.id}`);
      }
      const targetPackage = existingPackage
        ? await tx.package.update({
            where: { id: existingPackage.id },
            data: {
              crmFestivalId: targetFestival.id,
              tripId: null,
              festivalId: null,
              crmTripId: null,
              title: sourcePackage.title,
              price: number(sourcePackage.price, 0),
              tokenAmount: number(sourcePackage.tokenAmount, 0),
            },
          })
        : await tx.package.create({ data: {
            id: sourcePackage.id,
            crmFestivalId: targetFestival.id,
            title: sourcePackage.title,
            price: number(sourcePackage.price, 0),
            tokenAmount: number(sourcePackage.tokenAmount, 0),
            createdAt: date(sourcePackage.createdAt),
            updatedAt: date(sourcePackage.updatedAt),
          }});
      packageIds.set(sourcePackage.id, targetPackage.id);
      stats.bump(existingPackage ? "festivalPackages.existing" : "festivalPackages.created");
    }

    for (const sourceSlot of sourceSlots) {
      const existingSlot = await tx.crmFestivalSlot.findUnique({ where: { id: sourceSlot.id } });
      if (existingSlot && existingSlot.crmFestivalId !== targetFestival.id) {
        throw new Error(`Festival slot ID collision for ${sourceSlot.id}`);
      }
      const targetSlot = existingSlot
        ? await tx.crmFestivalSlot.update({
            where: { id: existingSlot.id },
            data: {
              crmFestivalId: targetFestival.id,
              startDate: date(sourceSlot.startDate),
              endDate: date(sourceSlot.endDate),
              title: sourceSlot.title,
              priority: integer(sourceSlot.priority, 0),
              capacity: integer(sourceSlot.capacity, 1),
            },
          })
        : await tx.crmFestivalSlot.create({ data: {
            id: sourceSlot.id,
            crmFestivalId: targetFestival.id,
            startDate: date(sourceSlot.startDate),
            endDate: date(sourceSlot.endDate),
            title: sourceSlot.title,
            priority: integer(sourceSlot.priority, 0),
            capacity: integer(sourceSlot.capacity, 1),
            filledSpots: 0,
            createdAt: date(sourceSlot.createdAt),
            updatedAt: date(sourceSlot.updatedAt),
          }});
      festivalSlotIds.set(sourceSlot.id, targetSlot.id);
      stats.bump(existingSlot ? "festivalSlots.existing" : "festivalSlots.created");
    }

    const sourceDays = source.ItineraryDay
      .filter((item) => item.festivalId === row.id)
      .sort((left, right) => integer(left.dayNumber, 0) - integer(right.dayNumber, 0));
    for (const sourceDay of sourceDays) {
      const notes = [sourceDay.title, sourceDay.description].filter(Boolean).join("\n\n") || null;
      const existingDay = await tx.crmFestivalItineraryDay.findUnique({
        where: { festivalId_dayNumber: { festivalId: targetFestival.id, dayNumber: integer(sourceDay.dayNumber, 1) } },
      });
      const targetDay = existingDay
        ? await tx.crmFestivalItineraryDay.update({
            where: { id: existingDay.id },
            data: { notes },
          })
        : await tx.crmFestivalItineraryDay.create({ data: {
            id: sourceDay.id,
            festivalId: targetFestival.id,
            dayNumber: integer(sourceDay.dayNumber, 1),
            notes,
            createdAt: date(sourceDay.createdAt),
            updatedAt: date(sourceDay.updatedAt),
          }});
      stats.bump(existingDay ? "festivalDays.existing" : "festivalDays.created");

      const todos = pgArray(sourceDay.todos);
      for (let todoIndex = 0; todoIndex < todos.length; todoIndex += 1) {
        const id = deterministicUuid("legacy-festival-activity", `${sourceDay.id}:${todoIndex}`);
        const existingActivity = await tx.crmFestivalItineraryDayActivity.findUnique({ where: { id } });
        if (!existingActivity) {
          await tx.crmFestivalItineraryDayActivity.create({ data: {
            id,
            itineraryDayId: targetDay.id,
            name: todos[todoIndex],
            displayOrder: todoIndex,
            createdAt: date(sourceDay.createdAt),
            updatedAt: date(sourceDay.updatedAt),
          }});
          stats.bump("festivalActivities.created");
        } else {
          stats.bump("festivalActivities.existing");
        }
      }
    }

    const inclusions = pgArray(row.inclusions);
    for (let inclusionIndex = 0; inclusionIndex < inclusions.length; inclusionIndex += 1) {
      const sourceKey = `legacy:festival:inclusion:${inclusionIndex}`;
      const existingInclusion = await tx.crmFestivalInclusion.findUnique({
        where: { festivalId_sourceKey: { festivalId: targetFestival.id, sourceKey } },
      });
      if (!existingInclusion) {
        await tx.crmFestivalInclusion.create({ data: {
          id: deterministicUuid("legacy-festival-inclusion", `${row.id}:${inclusionIndex}`),
          festivalId: targetFestival.id,
          type: "COMMON",
          sourceKey,
          title: inclusions[inclusionIndex],
          displayOrder: inclusionIndex,
          isManual: true,
          createdAt: date(row.createdAt),
          updatedAt: date(row.updatedAt),
        }});
        stats.bump("festivalInclusions.created");
      } else {
        stats.bump("festivalInclusions.existing");
      }
    }
  }

  for (const row of source.Inquiry) {
    await createIfMissing({
      find: () => tx.inquiry.findUnique({ where: { id: row.id } }),
      create: () => tx.inquiry.create({ data: {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        tripType: row.tripType,
        userId: row.userId ? userIds.get(row.userId) ?? null : null,
        subject: row.subject,
        message: row.message,
        isResolved: bool(row.isResolved),
        resolvedAt: date(row.resolvedAt),
        resolvedById: row.resolvedById ? userIds.get(row.resolvedById) ?? null : null,
        adminNotes: row.adminNotes,
        createdAt: date(row.createdAt),
        updatedAt: date(row.updatedAt),
      }}),
      stats,
      key: "inquiries",
    });
  }

  for (const row of source.Booking) {
    const crmFestivalId = festivalIds.get(row.festivalId);
    const crmFestivalSlotId = festivalSlotIds.get(row.slotId);
    const packageId = row.packageId ? packageIds.get(row.packageId) : null;
    if (!crmFestivalId || !crmFestivalSlotId) {
      throw new Error(`Booking ${row.id} has an unmapped festival or slot`);
    }
    if (row.packageId && !packageId) throw new Error(`Booking ${row.id} has an unmapped package`);
    const existing = await tx.booking.findUnique({ where: { id: row.id } });
    if (existing && existing.bookingReference !== row.bookingReference) {
      throw new Error(`Booking ID collision for ${row.id}`);
    }
    if (!existing) {
      await tx.booking.create({ data: {
        id: row.id,
        bookingReference: row.bookingReference,
        userId: userIds.get(row.userId),
        status: row.status,
        paymentStatus: row.paymentStatus,
        numberOfTravelers: integer(row.numberOfTravelers, 1),
        totalAmount: number(row.totalAmount, 0),
        tokenAmount: number(row.tokenAmount, 0),
        amountPaid: number(row.amountPaid, 0),
        amountDue: number(row.amountDue, 0),
        initialPaymentType: row.initialPaymentType,
        balanceDueDate: date(row.balanceDueDate),
        reservedAt: date(row.reservedAt),
        confirmedAt: date(row.confirmedAt),
        cancelledAt: date(row.cancelledAt),
        completedAt: date(row.completedAt),
        reviewRequestedAt: date(row.reviewRequestedAt),
        cancellationReason: row.cancellationReason,
        cancelledBy: row.cancelledBy,
        specialRequests: row.specialRequests,
        source: "CRM",
        packageId,
        crmFestivalId,
        crmFestivalSlotId,
        createdAt: date(row.createdAt),
        updatedAt: date(row.updatedAt),
      }});
      stats.bump("bookings.created");
    } else {
      stats.bump("bookings.existing");
    }
  }

  for (const row of source.Traveler) {
    await createIfMissing({
      find: () => tx.traveler.findUnique({ where: { id: row.id } }),
      create: () => tx.traveler.create({ data: {
        id: row.id,
        bookingId: row.bookingId,
        fullName: row.fullName,
        email: row.email,
        gender: row.gender,
        dateOfBirth: date(row.dateOfBirth),
        phone: row.phone,
        aadhaar: row.aadhaar,
        aadhaarAssetId: row.aadhaarAssetId ? mediaIds.get(row.aadhaarAssetId) ?? null : null,
        createdAt: date(row.createdAt),
        updatedAt: date(row.updatedAt),
      }}),
      stats,
      key: "travelers",
    });
  }

  for (const row of source.PaymentIntent) {
    await createIfMissing({
      find: () => tx.paymentIntent.findUnique({ where: { id: row.id } }),
      create: () => tx.paymentIntent.create({ data: {
        id: row.id,
        bookingId: row.bookingId,
        razorpayOrderId: row.razorpayOrderId,
        type: row.type,
        amount: number(row.amount, 0),
        currency: row.currency,
        status: row.status,
        expiresAt: date(row.expiresAt),
        createdAt: date(row.createdAt),
        updatedAt: date(row.updatedAt),
      }}),
      stats,
      key: "paymentIntents",
    });
  }

  for (const row of source.Payment) {
    await createIfMissing({
      find: () => tx.payment.findUnique({ where: { id: row.id } }),
      create: () => tx.payment.create({ data: {
        id: row.id,
        bookingId: row.bookingId,
        paymentIntentId: row.paymentIntentId,
        type: row.type,
        status: row.status,
        amount: number(row.amount, 0),
        currency: row.currency,
        razorpayOrderId: row.razorpayOrderId,
        razorpayPaymentId: row.razorpayPaymentId,
        razorpaySignature: row.razorpaySignature,
        paymentMethod: row.paymentMethod,
        idempotencyKey: row.idempotencyKey,
        failureCode: row.failureCode,
        failureReason: row.failureReason,
        receiptNumber: row.receiptNumber,
        notes: json(row.notes, null),
        paidAt: date(row.paidAt),
        createdAt: date(row.createdAt),
        updatedAt: date(row.updatedAt),
        receiptNumberInt: integer(row.receiptNumberInt, undefined),
      }}),
      stats,
      key: "payments",
    });
  }

  for (const row of source.PaymentReminder) {
    await createIfMissing({
      find: () => tx.paymentReminder.findUnique({ where: { id: row.id } }),
      create: () => tx.paymentReminder.create({ data: {
        id: row.id,
        bookingId: row.bookingId,
        type: row.type,
        status: row.status,
        sentBy: row.sentBy,
        email: row.email,
        subject: row.subject,
        sentAt: date(row.sentAt),
        providerMessageId: row.providerMessageId,
        failureReason: row.failureReason,
        createdAt: date(row.createdAt),
      }}),
      stats,
      key: "paymentReminders",
    });
  }

  for (const row of source.PaymentWebhook) {
    const existing = await tx.paymentWebhook.findFirst({
      where: { OR: [{ id: row.id }, { eventId: row.eventId }] },
    });
    if (!existing) {
      await tx.paymentWebhook.create({ data: {
        id: row.id,
        eventId: row.eventId,
        eventType: row.eventType,
        payload: json(row.payload, {}),
        signature: row.signature,
        processed: bool(row.processed),
        processedAt: date(row.processedAt),
        processingError: row.processingError,
        retryCount: integer(row.retryCount, 0),
        createdAt: date(row.createdAt),
      }});
      stats.bump("paymentWebhooks.created");
    } else {
      stats.bump("paymentWebhooks.existing");
    }
  }

  for (const row of source.Refund) {
    await createIfMissing({
      find: () => tx.refund.findUnique({ where: { id: row.id } }),
      create: () => tx.refund.create({ data: {
        id: row.id,
        paymentId: row.paymentId,
        amount: number(row.amount, 0),
        status: row.status,
        reason: row.reason,
        razorpayRefundId: row.razorpayRefundId,
        initiatedBy: row.initiatedBy,
        processedAt: date(row.processedAt),
        failureReason: row.failureReason,
        metadata: json(row.metadata, null),
        createdAt: date(row.createdAt),
        updatedAt: date(row.updatedAt),
      }}),
      stats,
      key: "refunds",
    });
  }

  const localCrmTrips = await tx.crmTrip.findMany();
  for (const row of source.LedgerEntry) {
    const sourceTrip = source.Trip.find((trip) => trip.id === row.tripId);
    const targetTrip = sourceTrip
      ? localCrmTrips.find((trip) => normalized(trip.name) === normalized(sourceTrip.title))
      : null;
    const crmFestivalId = row.festivalId ? festivalIds.get(row.festivalId) ?? null : null;
    await createIfMissing({
      find: () => tx.ledgerEntry.findUnique({ where: { id: row.id } }),
      create: () => tx.ledgerEntry.create({ data: {
        id: row.id,
        type: row.type,
        scope: row.scope,
        crmTripId: targetTrip?.id ?? null,
        crmFestivalId,
        bookingId: row.bookingId,
        paymentId: row.paymentId,
        source: row.source,
        category: row.category,
        amount: number(row.amount, 0),
        currency: row.currency,
        description: row.description,
        isAutoGenerated: bool(row.isAutoGenerated),
        entryDate: date(row.entryDate),
        createdById: row.createdById ? userIds.get(row.createdById) ?? null : null,
        createdAt: date(row.createdAt),
        updatedAt: date(row.updatedAt),
      }}),
      stats,
      key: "ledgerEntries",
    });
  }

  for (const row of source.CustomInvoice) {
    await createIfMissing({
      find: () => tx.customInvoice.findUnique({ where: { id: row.id } }),
      create: () => tx.customInvoice.create({ data: {
        id: row.id,
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        customerPhone: row.customerPhone,
        title: row.title,
        description: row.description,
        items: json(row.items, []),
        amount: number(row.amount, 0),
        currency: row.currency,
        dueDate: date(row.dueDate),
        status: row.status,
        source: "CUSTOM",
        createdAt: date(row.createdAt),
        updatedAt: date(row.updatedAt),
      }}),
      stats,
      key: "customInvoices",
    });
  }

  const landingConfigs = [
    ["LandingFootprint", "landingFootprint", (row) => ({
      id: row.id, value: number(row.value, 0), suffix: row.suffix, label: row.label,
      sublabel: row.sublabel, sortOrder: integer(row.sortOrder, 0), isActive: bool(row.isActive),
      createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
    })],
    ["LandingJourneyMilestone", "landingJourneyMilestone", (row) => ({
      id: row.id, period: row.period, title: row.title, tagline: row.tagline,
      description: row.description, iconName: row.iconName, sortOrder: integer(row.sortOrder, 0),
      isActive: bool(row.isActive), createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
    })],
    ["LandingReason", "landingReason", (row) => ({
      id: row.id, title: row.title, description: row.description, detail: row.detail,
      imageUrl: row.imageUrl, sortOrder: integer(row.sortOrder, 0), isActive: bool(row.isActive),
      createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
    })],
    ["LandingTripType", "landingTripType", (row) => ({
      id: row.id, label: row.label, description: row.description, tag: row.tag,
      imageUrl: row.imageUrl, iconName: row.iconName, sortOrder: integer(row.sortOrder, 0),
      isActive: bool(row.isActive), createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
    })],
  ];
  for (const [sourceTable, model, transform] of landingConfigs) {
    for (const row of source[sourceTable]) {
      await createIfMissing({
        find: () => tx[model].findUnique({ where: { id: row.id } }),
        create: () => tx[model].create({ data: transform(row) }),
        stats,
        key: model,
      });
    }
  }

  const allBookings = await tx.booking.findMany({
    select: { id: true, totalAmount: true, amountPaid: true, amountDue: true, paymentStatus: true, status: true },
  });
  for (const booking of allBookings) {
    const expectedDue = Math.max(0, Number(booking.totalAmount) - Number(booking.amountPaid));
    if (Math.abs(Number(booking.amountDue) - expectedDue) > 0.001) {
      await tx.booking.update({ where: { id: booking.id }, data: { amountDue: expectedDue } });
      stats.bump("derived.bookingAmountDueRepaired");
    }
  }

  const capacityTargets = [
    ["slot", "slotId"],
    ["crmTripSlot", "crmTripSlotId"],
    ["crmFestivalSlot", "crmFestivalSlotId"],
  ];
  for (const [model, field] of capacityTargets) {
    const grouped = await tx.booking.groupBy({
      by: [field],
      where: { [field]: { not: null }, status: { in: ACTIVE_BOOKING_STATUSES } },
      _sum: { numberOfTravelers: true },
    });
    const expected = new Map(grouped.map((row) => [row[field], Number(row._sum.numberOfTravelers || 0)]));
    const slots = await tx[model].findMany({ select: { id: true, filledSpots: true, capacity: true } });
    for (const slot of slots) {
      const filledSpots = expected.get(slot.id) || 0;
      if (filledSpots > slot.capacity) throw new Error(`${model} ${slot.id} exceeds capacity after merge`);
      if (slot.filledSpots !== filledSpots) {
        await tx[model].update({ where: { id: slot.id }, data: { filledSpots } });
        stats.bump(`derived.${model}CapacityRepaired`);
      }
    }
  }

  const importedBookings = await tx.booking.findMany({
    where: { id: { in: source.Booking.map((booking) => booking.id) } },
    include: { user: { include: { profile: true } }, crmFestivalSlot: true, crmFestival: true },
  });
  for (const booking of importedBookings) {
    const days = await tx.crmFestivalItineraryDay.findMany({
      where: { festivalId: booking.crmFestivalId },
      include: { activities: { orderBy: { displayOrder: "asc" } } },
      orderBy: { dayNumber: "asc" },
    });
    for (const dayRow of days) {
      for (const activity of dayRow.activities) {
        const crmSourceKey = `activity:${activity.id}`;
        const existingTask = await tx.operationalTask.findFirst({
          where: { bookingId: booking.id, crmSourceKey },
        });
        if (existingTask) {
          stats.bump("operationalTasks.existing");
          continue;
        }
        const customer = booking.user.profile?.fullName || booking.user.email || "Customer";
        const dueAt = booking.crmFestivalSlot.startDate
          ? new Date(booking.crmFestivalSlot.startDate.getTime() + (dayRow.dayNumber - 1) * 86400000)
          : null;
        await tx.operationalTask.create({ data: {
          id: deterministicUuid("legacy-festival-operation", `${booking.id}:${activity.id}`),
          bookingId: booking.id,
          crmFestivalItineraryDayId: dayRow.id,
          crmSourceKey,
          category: "ACTIVITY",
          title: `Arrange activity: ${activity.name} · ${booking.bookingReference} · ${customer}`,
          description: activity.description,
          config: { crmGenerated: true, sourceKey: crmSourceKey, importedFromProduction: true },
          quantityNeeded: 1,
          dueAt,
          createdAt: date(booking.createdAt),
          updatedAt: date(booking.updatedAt),
        }});
        stats.bump("operationalTasks.created");
      }
    }
  }

  const productionBookingIds = source.Booking.map((booking) => booking.id);
  const productionPaymentIds = source.Payment.map((payment) => payment.id);
  const bookingCount = await tx.booking.count({ where: { id: { in: productionBookingIds } } });
  const paymentCount = await tx.payment.count({ where: { id: { in: productionPaymentIds } } });
  const paymentSum = await tx.payment.aggregate({
    where: { id: { in: productionPaymentIds } },
    _sum: { amount: true },
  });
  const targetUserCount = await tx.user.count({
    where: { email: { in: source.User.map((user) => user.email), mode: "insensitive" } },
  });
  const festivalCount = await tx.crmFestival.count({
    where: { id: { in: [...festivalIds.values()] } },
  });
  const expectedPaymentSum = source.Payment.reduce((sum, payment) => sum + number(payment.amount, 0), 0);
  if (bookingCount !== source.Booking.length) throw new Error("Imported booking count validation failed");
  if (paymentCount !== source.Payment.length) throw new Error("Imported payment count validation failed");
  if (Math.abs(Number(paymentSum._sum.amount || 0) - expectedPaymentSum) > 0.001) {
    throw new Error("Imported payment total validation failed");
  }
  if (targetUserCount !== source.User.length) throw new Error("Imported user count validation failed");
  if (festivalCount !== source.Festival.length) throw new Error("CRM festival count validation failed");
  if (importedBookings.some((booking) => !booking.crmFestivalId || !booking.crmFestivalSlotId)) {
    throw new Error("One or more production bookings were not converted to CRM festival bookings");
  }

  const finalCountQueries = [
    ["users", () => tx.user.count()],
    ["crmTrips", () => tx.crmTrip.count()],
    ["crmFestivals", () => tx.crmFestival.count()],
    ["bookings", () => tx.booking.count()],
    ["payments", () => tx.payment.count()],
    ["paymentIntents", () => tx.paymentIntent.count()],
    ["paymentWebhooks", () => tx.paymentWebhook.count()],
    ["ledgerEntries", () => tx.ledgerEntry.count()],
    ["operationalTasks", () => tx.operationalTask.count()],
    ["inquiries", () => tx.inquiry.count()],
    ["mediaAssets", () => tx.mediaAsset.count()],
  ];
  const finalCountEntries = [];
  for (const [key, count] of finalCountQueries) finalCountEntries.push([key, await count()]);
  const finalCounts = Object.fromEntries(finalCountEntries);

  const summary = {
    mode: apply ? "apply" : "dry-run",
    source: {
      users: source.User.length,
      festivals: source.Festival.length,
      bookings: source.Booking.length,
      payments: source.Payment.length,
      paymentTotal: expectedPaymentSum,
    },
    changes: stats.values,
    finalCounts,
    validation: "passed",
  };
  if (!apply) throw new DryRunRollback(summary);
  return summary;
}, { timeout: 120_000, maxWait: 20_000 });

const reseedPaymentReceiptSequence = async () => {
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"Payment"', 'receiptNumberInt'),
      GREATEST(COALESCE((SELECT MAX("receiptNumberInt") FROM "Payment"), 1), 1),
      EXISTS (SELECT 1 FROM "Payment")
    )
  `);
};

try {
  if (!existsSync(dumpPath)) throw new Error(`Production SQL dump not found: ${dumpPath}`);
  const source = parseDump(readFileSync(dumpPath, "utf8"));
  assertSourceShape(source);
  const summary = await merge(source);
  await reseedPaymentReceiptSequence();
  console.log(JSON.stringify(summary, null, 2));
  console.log("Production SQL merge committed successfully.");
} catch (error) {
  if (error instanceof DryRunRollback) {
    console.log(JSON.stringify(error.summary, null, 2));
    console.log("Dry run completed successfully. The transaction was rolled back.");
  } else {
    console.error("Production SQL merge failed:", error);
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}
