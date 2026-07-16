import * as repo from "./operations.repository.js";
import {
  bookingListQuerySchema,
  createHotelSchema,
  departureListQuerySchema,
  idSchema,
  updateBookingOpsSchema,
  updateDepartureSchema,
  updateHotelSchema,
  updatePrimaryDocumentSchema,
  updateTravelerSchema,
} from "./operations.validation.js";
import { NotFoundError, ValidationError } from "../../core/errors/errors.js";
import { createAuthenticatedDeliveryUrl } from "../../core/services/upload.service.js";

const nullableText = (value) => value === undefined ? undefined : (value?.trim() || null);
const isDocumentPresent = (record, kind) => kind === "primary"
  ? Boolean(record?.govtIdAssetId || record?.govtIdImageUrl || record?.govtIdNumber)
  : Boolean(record?.aadhaarAssetId || record?.aadhaar);

const secureBookingDocuments = (booking) => {
  if (!booking) return booking;
  const profile = booking.user?.profile;
  return {
    ...booking,
    user: booking.user ? {
      ...booking.user,
      profile: profile ? {
        ...profile,
        govtIdImageUrl: profile.govtIdAsset
          ? createAuthenticatedDeliveryUrl(profile.govtIdAsset)
          : profile.govtIdImageUrl || null,
        govtIdMimeType: profile.govtIdAsset
          ? (profile.govtIdAsset.resourceType === "RAW" ? "application/pdf" : `image/${profile.govtIdAsset.format || "webp"}`)
          : null,
      } : null,
    } : null,
    travelers: booking.travelers?.map((traveler) => ({
      ...traveler,
      aadhaar: traveler.aadhaarAsset
        ? createAuthenticatedDeliveryUrl(traveler.aadhaarAsset)
        : traveler.aadhaar || null,
      aadhaarMimeType: traveler.aadhaarAsset
        ? (traveler.aadhaarAsset.resourceType === "RAW" ? "application/pdf" : `image/${traveler.aadhaarAsset.format || "webp"}`)
        : null,
    })) || [],
  };
};

export const calculateBookingReadiness = (booking) => {
  const profile = booking.user?.profile;
  const travelers = booking.travelers || [];
  const ops = booking.opsCase;
  const hotels = (booking.hotelReservations || []).filter((hotel) => !hotel.archivedAt);
  const additionalExpected = Math.max(0, booking.numberOfTravelers - 1);
  const rosterComplete = Boolean(profile?.fullName) && travelers.length >= additionalExpected;
  const primaryDocumentPresent = isDocumentPresent(profile, "primary");
  const travelerDocumentsPresent = travelers.slice(0, additionalExpected).every((traveler) => isDocumentPresent(traveler, "traveler"));
  const allDocumentsPresent = primaryDocumentPresent && travelers.length >= additionalExpected && travelerDocumentsPresent;
  const allDocumentsVerified = profile?.govtIdVerificationStatus === "VERIFIED"
    && travelers.length >= additionalExpected
    && travelers.slice(0, additionalExpected).every((traveler) => traveler.verificationStatus === "VERIFIED");
  const paymentComplete = booking.paymentStatus === "PAID" || Number(booking.amountDue) <= 0;
  const paymentOverdue = booking.status !== "CANCELLED"
    && Number(booking.amountDue) > 0
    && Boolean(booking.balanceDueDate && new Date(booking.balanceDueDate) < new Date());
  const specialRequestsReviewed = !booking.specialRequests || Boolean(ops?.specialRequestsReviewedAt);
  const hotelConfirmed = hotels.some((hotel) => ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(hotel.status));
  const hotelReady = !ops?.hotelRequired || hotelConfirmed;
  const noActiveBlocker = !ops?.blockerReason || Boolean(ops.blockerResolvedAt);
  const bookingConfirmed = ["CONFIRMED", "COMPLETED"].includes(booking.status);

  const checks = [
    { key: "booking", label: "Booking confirmed", complete: bookingConfirmed },
    { key: "payment", label: "Customer payment complete", complete: paymentComplete },
    { key: "roster", label: `Traveler roster complete (${Math.min(booking.numberOfTravelers, travelers.length + (profile ? 1 : 0))}/${booking.numberOfTravelers})`, complete: rosterComplete },
    { key: "documents", label: "All traveler IDs present", complete: allDocumentsPresent },
    { key: "verification", label: "All traveler IDs verified", complete: allDocumentsVerified },
    { key: "requests", label: "Special requests reviewed", complete: specialRequestsReviewed },
    { key: "hotel", label: ops?.hotelRequired ? "Hotel confirmed" : "Hotel not required", complete: hotelReady },
    { key: "blocker", label: "No active blocker", complete: noActiveBlocker },
  ];

  let status = "IN_PROGRESS";
  if (booking.status === "CANCELLED") status = "CANCELLED";
  else if (booking.status === "COMPLETED") status = "COMPLETED";
  else if (!noActiveBlocker || paymentOverdue) status = "BLOCKED";
  else if (checks.every((check) => check.complete)) status = "READY";

  const attentionReasons = checks.filter((check) => !check.complete).map((check) => check.label);
  if (paymentOverdue && !attentionReasons.includes("Balance payment overdue")) attentionReasons.unshift("Balance payment overdue");
  if (!noActiveBlocker && ops?.blockerReason) attentionReasons.unshift(ops.blockerReason);

  return {
    status,
    checks,
    attentionReasons,
    completedChecks: checks.filter((check) => check.complete).length,
    totalChecks: checks.length,
    paymentOverdue,
    hotelRequired: Boolean(ops?.hotelRequired),
  };
};

const withReadiness = (booking) => {
  const secured = secureBookingDocuments(booking);
  return { ...secured, readiness: calculateBookingReadiness(secured) };
};

const buildDeparture = (slot, includeBookings = true) => {
  const bookings = (slot.bookings || []).map(withReadiness);
  const activeBookings = bookings.filter((booking) => !["CANCELLED"].includes(booking.status));
  const blockedBookings = activeBookings.filter((booking) => booking.readiness.status === "BLOCKED");
  const readyBookings = activeBookings.filter((booking) => ["READY", "COMPLETED"].includes(booking.readiness.status));
  const operationBlocked = Boolean(slot.operation?.blockerReason && !slot.operation?.blockerResolvedAt);
  const computedStatus = operationBlocked || blockedBookings.length > 0
    ? "BLOCKED"
    : activeBookings.length > 0 && readyBookings.length === activeBookings.length
      ? "READY"
      : "IN_PROGRESS";
  const item = slot.trip || slot.festival;
  return {
    id: slot.id,
    title: slot.title || item?.title || "Untitled departure",
    startDate: slot.startDate,
    endDate: slot.endDate,
    capacity: slot.capacity,
    filledSpots: slot.filledSpots,
    trip: slot.trip,
    festival: slot.festival,
    operation: slot.operation,
    tasks: slot.crmTasks || [],
    readinessStatus: computedStatus,
    metrics: {
      bookings: activeBookings.length,
      travelers: activeBookings.reduce((total, booking) => total + booking.numberOfTravelers, 0),
      readyBookings: readyBookings.length,
      blockedBookings: blockedBookings.length,
      outstandingAmount: activeBookings.reduce((total, booking) => total + Number(booking.amountDue || 0), 0),
      hotelReservations: activeBookings.reduce((total, booking) => total + (booking.hotelReservations?.length || 0), 0),
    },
    ...(includeBookings && { bookings }),
  };
};

const requireAdmin = async (id, label = "Coordinator") => {
  if (id && !(await repo.findAdminById(id))) throw new ValidationError(`${label} must reference an active admin.`);
};

const requireBooking = async (id) => {
  const booking = await repo.getBooking(idSchema.parse(id));
  if (!booking) throw new NotFoundError("Booking not found.");
  return booking;
};

const blockerData = (parsed, existing, adminId) => {
  const data = {};
  if (parsed.blockerReason !== undefined) {
    data.blockerReason = nullableText(parsed.blockerReason);
    data.blockerResolvedAt = null;
    data.blockerResolvedById = null;
  }
  if (parsed.blockerResolved === true) {
    if (!(data.blockerReason || existing?.blockerReason)) throw new ValidationError("There is no blocker to resolve.");
    data.blockerResolvedAt = new Date();
    data.blockerResolvedById = adminId;
  } else if (parsed.blockerResolved === false && existing?.blockerReason) {
    data.blockerResolvedAt = null;
    data.blockerResolvedById = null;
  }
  return data;
};

export const getDashboard = async () => {
  const [bookings, slots, tasks, admins] = await Promise.all([
    repo.listBookings({ status: { not: "CANCELLED" } }),
    repo.listSlots({ startDate: { gte: new Date() } }),
    repo.listOpenTasks(),
    repo.listAdmins(),
  ]);
  const preparedBookings = bookings.map(withReadiness);
  const preparedDepartures = slots.map((slot) => buildDeparture(slot, false));
  const now = new Date();
  const overdueTasks = tasks.filter((task) => task.dueAt && new Date(task.dueAt) < now);
  return {
    summary: {
      upcomingDepartures: preparedDepartures.length,
      activeBookings: preparedBookings.length,
      bookingsReady: preparedBookings.filter((booking) => booking.readiness.status === "READY").length,
      bookingsNeedingAttention: preparedBookings.filter((booking) => ["BLOCKED", "IN_PROGRESS"].includes(booking.readiness.status)).length,
      outstandingCustomerBalance: preparedBookings.reduce((total, booking) => total + Number(booking.amountDue || 0), 0),
      overdueTasks: overdueTasks.length,
      unconfirmedHotels: preparedBookings.reduce((total, booking) => total + (booking.hotelReservations || []).filter((hotel) => !["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"].includes(hotel.status)).length, 0),
    },
    departures: preparedDepartures.slice(0, 12),
    attentionBookings: preparedBookings.filter((booking) => ["BLOCKED", "IN_PROGRESS"].includes(booking.readiness.status)).slice(0, 20),
    tasks: tasks.slice(0, 20),
    admins,
  };
};

export const listDepartures = async (query) => {
  const parsed = departureListQuerySchema.parse(query);
  const where = {
    ...(parsed.status && { operation: { status: parsed.status } }),
    ...((parsed.dateFrom || parsed.dateTo) && { startDate: { ...(parsed.dateFrom && { gte: parsed.dateFrom }), ...(parsed.dateTo && { lte: parsed.dateTo }) } }),
    ...(parsed.q && { OR: [
      { title: { contains: parsed.q, mode: "insensitive" } },
      { trip: { title: { contains: parsed.q, mode: "insensitive" } } },
      { festival: { title: { contains: parsed.q, mode: "insensitive" } } },
    ] }),
  };
  const departures = (await repo.listSlots(where)).map((slot) => buildDeparture(slot, false));
  const start = (parsed.page - 1) * parsed.limit;
  return { data: departures.slice(start, start + parsed.limit), meta: { total: departures.length, page: parsed.page, limit: parsed.limit, totalPages: Math.ceil(departures.length / parsed.limit) } };
};

export const getDeparture = async (slotId) => {
  const slot = await repo.getSlot(idSchema.parse(slotId));
  if (!slot) throw new NotFoundError("Departure slot not found.");
  return buildDeparture(slot);
};

export const updateDeparture = async (slotId, input, adminId) => {
  const slot = await repo.getSlot(idSchema.parse(slotId));
  if (!slot) throw new NotFoundError("Departure slot not found.");
  const parsed = updateDepartureSchema.parse(input);
  await requireAdmin(parsed.coordinatorId);
  const data = { ...blockerData(parsed, slot.operation, adminId) };
  for (const key of ["status", "coordinatorId", "nextActionAt"]) if (parsed[key] !== undefined) data[key] = parsed[key];
  if (parsed.notes !== undefined) data.notes = nullableText(parsed.notes);
  await repo.upsertDepartureOperation(slot.id, data);
  return getDeparture(slot.id);
};

export const listBookings = async (query) => {
  const parsed = bookingListQuerySchema.parse(query);
  const where = {
    ...(parsed.paymentStatus && { paymentStatus: parsed.paymentStatus }),
    ...(parsed.slotId && { slotId: parsed.slotId }),
    ...(parsed.q && { OR: [
      { bookingReference: { contains: parsed.q, mode: "insensitive" } },
      { user: { email: { contains: parsed.q, mode: "insensitive" } } },
      { user: { profile: { fullName: { contains: parsed.q, mode: "insensitive" } } } },
      { slot: { trip: { title: { contains: parsed.q, mode: "insensitive" } } } },
      { slot: { festival: { title: { contains: parsed.q, mode: "insensitive" } } } },
    ] }),
  };
  let bookings = (await repo.listBookings(where)).map(withReadiness);
  if (parsed.readiness) bookings = bookings.filter((booking) => booking.readiness.status === parsed.readiness);
  const start = (parsed.page - 1) * parsed.limit;
  return { data: bookings.slice(start, start + parsed.limit), meta: { total: bookings.length, page: parsed.page, limit: parsed.limit, totalPages: Math.ceil(bookings.length / parsed.limit) } };
};

export const getBooking = async (bookingId) => withReadiness(await requireBooking(bookingId));

export const updateBookingOps = async (bookingId, input, adminId) => {
  const booking = await requireBooking(bookingId);
  const parsed = updateBookingOpsSchema.parse(input);
  await requireAdmin(parsed.coordinatorId);
  const data = { ...blockerData(parsed, booking.opsCase, adminId) };
  for (const key of ["coordinatorId", "hotelRequired", "nextActionAt"]) if (parsed[key] !== undefined) data[key] = parsed[key];
  if (parsed.internalNotes !== undefined) data.internalNotes = nullableText(parsed.internalNotes);
  if (parsed.specialRequestsReviewed !== undefined) {
    data.specialRequestsReviewedAt = parsed.specialRequestsReviewed ? new Date() : null;
    data.specialRequestsReviewedById = parsed.specialRequestsReviewed ? adminId : null;
  }
  await repo.upsertBookingOps(booking.id, data);
  return getBooking(booking.id);
};

const syncOverallDocumentVerification = async (bookingId, adminId) => {
  const state = await repo.getBookingDocumentState(bookingId);
  const profile = state?.user?.profile;
  const requiredTravelers = Math.max(0, (state?.numberOfTravelers || 1) - 1);
  const allVerified = isDocumentPresent(profile, "primary")
    && profile?.govtIdVerificationStatus === "VERIFIED"
    && state.travelers.length >= requiredTravelers
    && state.travelers.slice(0, requiredTravelers).every((traveler) => isDocumentPresent(traveler, "traveler") && traveler.verificationStatus === "VERIFIED");
  await repo.upsertBookingOps(bookingId, {
    documentsVerifiedAt: allVerified ? new Date() : null,
    documentsVerifiedById: allVerified ? adminId : null,
  });
};

export const updatePrimaryDocument = async (bookingId, input, adminId) => {
  const booking = await requireBooking(bookingId);
  const profile = booking.user?.profile;
  if (!profile) throw new ValidationError("The primary traveler has no profile to verify.");
  const parsed = updatePrimaryDocumentSchema.parse(input);
  if (parsed.status === "VERIFIED" && !isDocumentPresent(profile, "primary")) throw new ValidationError("Upload or record the primary traveler ID before verifying it.");
  await repo.updatePrimaryDocument(profile.id, {
    govtIdVerificationStatus: parsed.status,
    govtIdVerificationNotes: nullableText(parsed.notes),
    govtIdVerifiedAt: parsed.status === "VERIFIED" ? new Date() : null,
    govtIdVerifiedById: parsed.status === "UNVERIFIED" ? null : adminId,
  });
  await syncOverallDocumentVerification(booking.id, adminId);
  return getBooking(booking.id);
};

export const updateTraveler = async (bookingId, travelerId, input, adminId) => {
  const booking = await requireBooking(bookingId);
  const traveler = await repo.findTraveler(idSchema.parse(travelerId));
  if (!traveler || traveler.bookingId !== booking.id) throw new NotFoundError("Traveler not found for this booking.");
  const parsed = updateTravelerSchema.parse(input);
  if (parsed.verificationStatus === "VERIFIED" && !isDocumentPresent(traveler, "traveler")) throw new ValidationError("Upload or record this traveler ID before verifying it.");
  const data = {};
  for (const key of ["fullName", "gender", "dateOfBirth", "phone"]) if (parsed[key] !== undefined) data[key] = parsed[key];
  if (parsed.verificationStatus !== undefined) {
    data.verificationStatus = parsed.verificationStatus;
    data.verifiedAt = parsed.verificationStatus === "VERIFIED" ? new Date() : null;
    data.verifiedById = parsed.verificationStatus === "UNVERIFIED" ? null : adminId;
  }
  if (parsed.verificationNotes !== undefined) data.verificationNotes = nullableText(parsed.verificationNotes);
  await repo.updateTraveler(traveler.id, data);
  await syncOverallDocumentVerification(booking.id, adminId);
  return getBooking(booking.id);
};

const inferredVendorPaymentStatus = (estimatedAmount, amountPaid) => {
  if (amountPaid <= 0) return "UNPAID";
  if (estimatedAmount > 0 && amountPaid >= estimatedAmount) return "PAID";
  return "PARTIALLY_PAID";
};

const hotelData = (parsed, existing = {}) => {
  const data = {};
  for (const key of ["hotelName", "roomCount", "guestCount", "checkInAt", "checkOutAt", "status", "estimatedAmount", "amountPaid", "paymentDueAt", "currency"]) {
    if (parsed[key] !== undefined) data[key] = parsed[key];
  }
  for (const key of ["address", "contactName", "contactPhone", "contactEmail", "confirmationNumber", "roomType", "notes"]) {
    if (parsed[key] !== undefined) data[key] = nullableText(parsed[key]);
  }
  if (parsed.paymentStatus !== undefined) data.paymentStatus = parsed.paymentStatus;
  else if (parsed.estimatedAmount !== undefined || parsed.amountPaid !== undefined) {
    data.paymentStatus = inferredVendorPaymentStatus(Number(data.estimatedAmount ?? existing.estimatedAmount ?? 0), Number(data.amountPaid ?? existing.amountPaid ?? 0));
  }
  return data;
};

export const createHotel = async (bookingId, input) => {
  const booking = await requireBooking(bookingId);
  const parsed = createHotelSchema.parse(input);
  await repo.createHotel({ bookingId: booking.id, ...hotelData(parsed) });
  return getBooking(booking.id);
};

export const updateHotel = async (bookingId, hotelId, input) => {
  const booking = await requireBooking(bookingId);
  const hotel = await repo.findHotel(idSchema.parse(hotelId));
  if (!hotel || hotel.bookingId !== booking.id) throw new NotFoundError("Hotel reservation not found for this booking.");
  const parsed = updateHotelSchema.parse(input);
  const data = hotelData(parsed, hotel);
  if (parsed.archived !== undefined) data.archivedAt = parsed.archived ? new Date() : null;
  const nextCheckIn = data.checkInAt === undefined ? hotel.checkInAt : data.checkInAt;
  const nextCheckOut = data.checkOutAt === undefined ? hotel.checkOutAt : data.checkOutAt;
  if (nextCheckIn && nextCheckOut && nextCheckOut <= nextCheckIn) throw new ValidationError("Hotel check-out must be after check-in.");
  await repo.updateHotel(hotel.id, data);
  return getBooking(booking.id);
};
