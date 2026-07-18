import crypto from "crypto";
import { prisma } from "../../prisma/client.js";
import env from "../../core/env/env.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../core/errors/errors.js";
import { deleteFromCloudinary, uploadPublicImage } from "../../core/services/upload.service.js";
import {
  normalizeAdditionalTravelers,
  normalizeCustomTripInput,
  validateReadyToSend,
} from "./custom-trip.validation.js";

const ADMIN_INCLUDE = {
  customerUser: { select: { id: true, email: true, isActive: true, profile: { select: { fullName: true, phone: true } } } },
  createdBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
  booking: { select: { id: true, bookingReference: true, status: true, paymentStatus: true, userId: true, createdAt: true } },
};

const makeReference = () => {
  const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `CST-${day}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
};

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const newToken = () => crypto.randomBytes(32).toString("base64url");
const publicLink = (token) => `${env.ORIGIN.replace(/\/+$/, "")}/custom-trip/${encodeURIComponent(token)}`;
const isMutable = (trip) => !["CONVERTED", "CANCELLED"].includes(trip.status);
const ownsBanner = (tripId, imageUrl) => {
  try {
    return decodeURIComponent(new URL(imageUrl).pathname).includes(`/uploads/custom-trips/${tripId}/`);
  } catch {
    return false;
  }
};

const uploadBannerFiles = async (tripId, files = []) => {
  if (!files.length) return [];
  const results = await Promise.allSettled(files.map((file) => uploadPublicImage(file.buffer, {
    folder: `uploads/custom-trips/${tripId}`,
    publicId: `${Date.now()}-${crypto.randomUUID()}`,
  })));
  const uploadedUrls = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value.secure_url);
  const failed = results.find((result) => result.status === "rejected");
  if (failed) {
    await Promise.allSettled(uploadedUrls.map((url) => deleteFromCloudinary(url)));
    throw failed.reason;
  }
  return uploadedUrls;
};

const deleteUploadedBanners = (urls) =>
  Promise.allSettled(urls.map((url) => deleteFromCloudinary(url)));

const validateCustomer = async (data) => {
  if (!data.customerUserId) return data;
  const customer = await prisma.user.findUnique({
    where: { id: data.customerUserId },
    include: { profile: true },
  });
  if (!customer) throw new ValidationError("The selected customer account does not exist.");
  if (!customer.isActive) throw new ValidationError("The selected customer account is disabled.");
  if (customer.email.toLowerCase() !== data.customerEmail.toLowerCase()) {
    throw new ValidationError("Customer email must match the selected user account.");
  }
  return data;
};

const sanitizeOffer = (trip, viewer) => ({
  id: trip.id,
  reference: trip.reference,
  title: trip.title,
  description: trip.description,
  customerName: trip.customerName,
  bannerImages: trip.bannerImages,
  highlights: trip.highlights,
  itinerary: trip.itinerary,
  startDate: trip.startDate,
  endDate: trip.endDate,
  durationDays: trip.durationDays,
  travelerCount: trip.travelerCount,
  totalAmount: trip.totalAmount,
  tokenAmount: trip.tokenAmount,
  currency: trip.currency,
  balanceDueDate: trip.balanceDueDate,
  validUntil: trip.validUntil,
  pricingNotes: trip.pricingNotes,
  status: trip.status,
  booking: trip.booking ? {
    id: trip.booking.id,
    bookingReference: trip.booking.bookingReference,
    status: trip.booking.status,
    paymentStatus: trip.booking.paymentStatus,
    initialPaymentType: trip.booking.initialPaymentType,
  } : null,
  canBook: Boolean(viewer) && viewer.isActive !== false && (
    trip.customerUserId === viewer.id || trip.customerEmail.toLowerCase() === viewer.email?.toLowerCase()
  ),
});

export const listCustomTrips = async ({ page = 1, limit = 20, status, q } = {}) => {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
  const query = typeof q === "string" ? q.trim() : "";
  const where = {
    ...(status && status !== "ALL" ? { status } : {}),
    ...(query ? {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { reference: { contains: query, mode: "insensitive" } },
        { customerName: { contains: query, mode: "insensitive" } },
        { customerEmail: { contains: query, mode: "insensitive" } },
      ],
    } : {}),
  };
  const [data, total] = await Promise.all([
    prisma.customTrip.findMany({
      where,
      include: ADMIN_INCLUDE,
      orderBy: { updatedAt: "desc" },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    }),
    prisma.customTrip.count({ where }),
  ]);
  return { data, meta: { total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) } };
};

export const getCustomTrip = async (id) => {
  const trip = await prisma.customTrip.findUnique({ where: { id }, include: ADMIN_INCLUDE });
  if (!trip) throw new NotFoundError("Custom trip not found.");
  return trip;
};

export const createCustomTrip = async (adminId, input, files = []) => {
  const id = crypto.randomUUID();
  const normalized = await validateCustomer(normalizeCustomTripInput(input));
  if (normalized.bannerImages.length + files.length > 10) {
    throw new ValidationError("A custom trip can have at most 10 banner images.");
  }
  // Validate the complete intended record before uploading or inserting anything.
  validateReadyToSend({
    ...normalized,
    bannerImages: [...normalized.bannerImages, ...files.map(() => "pending-upload")],
  });

  const uploadedUrls = await uploadBannerFiles(id, files);
  const data = { ...normalized, bannerImages: [...normalized.bannerImages, ...uploadedUrls] };
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await prisma.customTrip.create({
          data: { ...data, id, reference: makeReference(), createdById: adminId },
          include: ADMIN_INCLUDE,
        });
      } catch (error) {
        if (error.code !== "P2002" || attempt === 2) throw error;
      }
    }
  } catch (error) {
    await deleteUploadedBanners(uploadedUrls);
    throw error;
  }
};

export const updateCustomTrip = async (id, input, files = []) => {
  const trip = await getCustomTrip(id);
  if (!isMutable(trip)) throw new ConflictError(`A ${trip.status.toLowerCase()} custom trip cannot be edited.`);
  const normalized = await validateCustomer(normalizeCustomTripInput(input));
  if (normalized.bannerImages.length + files.length > 10) {
    throw new ValidationError("A custom trip can have at most 10 banner images.");
  }
  validateReadyToSend({
    ...normalized,
    bannerImages: [...normalized.bannerImages, ...files.map(() => "pending-upload")],
  });
  const uploadedUrls = await uploadBannerFiles(id, files);
  const data = { ...normalized, bannerImages: [...normalized.bannerImages, ...uploadedUrls] };
  const wasShared = ["SENT", "VIEWED", "EXPIRED"].includes(trip.status);
  try {
    const updated = await prisma.customTrip.update({
      where: { id },
      data: {
        ...data,
        ...(wasShared && {
          status: "DRAFT",
          shareTokenHash: null,
          sentAt: null,
          viewedAt: null,
          version: { increment: 1 },
        }),
      },
      include: ADMIN_INCLUDE,
    });
    const removedOwnedImages = trip.bannerImages.filter((url) =>
      !data.bannerImages.includes(url) && ownsBanner(id, url));
    await deleteUploadedBanners(removedOwnedImages);
    return updated;
  } catch (error) {
    await deleteUploadedBanners(uploadedUrls);
    throw error;
  }
};

export const uploadBanners = async (id, files, adminId) => {
  const trip = await getCustomTrip(id);
  if (!isMutable(trip)) throw new ConflictError(`A ${trip.status.toLowerCase()} custom trip cannot be edited.`);
  if (!files?.length) throw new ValidationError("Select at least one banner image.");
  if (trip.bannerImages.length + files.length > 10) throw new ValidationError("A custom trip can have at most 10 banner images.");
  const uploaded = await Promise.all(files.map((file) => uploadPublicImage(file.buffer, {
    folder: `uploads/custom-trips/${id}`,
    publicId: `${Date.now()}-${crypto.randomUUID()}`,
  })));
  const urls = uploaded.map((asset) => asset.secure_url);
  try {
    return await prisma.customTrip.update({
      where: { id },
      data: {
        bannerImages: { push: urls },
        ...(["SENT", "VIEWED", "EXPIRED"].includes(trip.status) ? {
          status: "DRAFT",
          shareTokenHash: null,
          sentAt: null,
          viewedAt: null,
          version: { increment: 1 },
        } : {}),
      },
      include: ADMIN_INCLUDE,
    });
  } catch (error) {
    await Promise.allSettled(urls.map((url) => deleteFromCloudinary(url)));
    throw error;
  }
};

export const removeBanner = async (id, imageUrl) => {
  const trip = await getCustomTrip(id);
  if (!isMutable(trip)) throw new ConflictError(`A ${trip.status.toLowerCase()} custom trip cannot be edited.`);
  if (!trip.bannerImages.includes(imageUrl)) throw new NotFoundError("Banner image not found on this custom trip.");
  const bannerImages = trip.bannerImages.filter((url) => url !== imageUrl);
  validateReadyToSend({ ...trip, bannerImages });
  const updated = await prisma.customTrip.update({
    where: { id },
    data: {
      bannerImages,
      ...(["SENT", "VIEWED", "EXPIRED"].includes(trip.status) ? {
        status: "DRAFT", shareTokenHash: null, sentAt: null, viewedAt: null, version: { increment: 1 },
      } : {}),
    },
    include: ADMIN_INCLUDE,
  });
  if (ownsBanner(id, imageUrl)) {
    await deleteFromCloudinary(imageUrl).catch((error) => console.error("Failed to remove custom trip banner:", error));
  }
  return updated;
};

export const sendCustomTrip = async (id) => {
  const trip = await getCustomTrip(id);
  if (["CONVERTED", "CANCELLED"].includes(trip.status)) {
    throw new ConflictError(`A ${trip.status.toLowerCase()} custom trip cannot be sent.`);
  }
  const token = newToken();
  const sentAt = new Date();
  const updated = await prisma.customTrip.update({
    where: { id },
    data: { status: "SENT", shareTokenHash: hashToken(token), sentAt, viewedAt: null },
    include: ADMIN_INCLUDE,
  });
  const offerLink = publicLink(token);
  let emailSent = true;
  let emailError = null;
  try {
    const { sendCustomTripOfferEmail } = await import("../../core/services/email.service.js");
    await sendCustomTripOfferEmail({
      to: updated.customerEmail,
      name: updated.customerName,
      tripTitle: updated.title,
      customTripRef: updated.reference,
      tripStartDate: updated.startDate,
      tripEndDate: updated.endDate,
      travelersCount: updated.travelerCount,
      totalAmount: updated.totalAmount,
      tokenAmount: updated.tokenAmount,
      validUntil: updated.validUntil,
      offerLink,
    });
  } catch (error) {
    emailSent = false;
    emailError = "The offer was activated, but the email could not be delivered. Copy and share the secure link manually.";
    console.error("[CustomTrip] Offer email failed:", error);
  }
  return { customTrip: updated, offerLink, emailSent, emailError };
};

export const duplicateCustomTrip = async (id, adminId) => {
  const trip = await getCustomTrip(id);
  const input = {
    title: `${trip.title} (Copy)`, description: trip.description,
    customerName: trip.customerName, customerEmail: trip.customerEmail, customerPhone: trip.customerPhone,
    customerUserId: trip.customerUserId, bannerImages: trip.bannerImages, highlights: trip.highlights,
    itinerary: trip.itinerary, startDate: trip.startDate, endDate: trip.endDate,
    travelerCount: trip.travelerCount, totalAmount: trip.totalAmount, tokenAmount: trip.tokenAmount,
    balanceDueDate: trip.balanceDueDate, validUntil: trip.validUntil,
    pricingNotes: trip.pricingNotes, internalNotes: trip.internalNotes,
  };
  return createCustomTrip(adminId, input);
};

export const cancelCustomTrip = async (id, reason) => {
  const trip = await getCustomTrip(id);
  if (trip.status === "CONVERTED") throw new ConflictError("A converted custom trip must be managed through its booking.");
  if (trip.status === "CANCELLED") return trip;
  return prisma.customTrip.update({
    where: { id },
    data: {
      status: "CANCELLED", cancellationReason: String(reason || "Cancelled by admin").trim().slice(0, 1000),
      cancelledAt: new Date(), shareTokenHash: null,
    },
    include: ADMIN_INCLUDE,
  });
};

export const deleteCustomTrip = async (id) => {
  const trip = await getCustomTrip(id);
  if (trip.status !== "DRAFT") throw new ConflictError("Only draft custom trips can be permanently deleted.");
  await prisma.customTrip.delete({ where: { id } });
  await Promise.allSettled(trip.bannerImages.filter((url) => ownsBanner(id, url)).map((url) => deleteFromCloudinary(url)));
  return { success: true };
};

const findOffer = async (token) => {
  if (typeof token !== "string" || token.length < 20) throw new NotFoundError("Custom trip offer not found.");
  const trip = await prisma.customTrip.findUnique({
    where: { shareTokenHash: hashToken(token) },
    include: { booking: true },
  });
  if (!trip || ["DRAFT", "CANCELLED"].includes(trip.status)) throw new NotFoundError("Custom trip offer not found.");
  if (["SENT", "VIEWED"].includes(trip.status) && trip.validUntil <= new Date()) {
    const expired = await prisma.customTrip.update({ where: { id: trip.id }, data: { status: "EXPIRED" }, include: { booking: true } });
    return expired;
  }
  return trip;
};

export const getOffer = async (token, viewer) => {
  let trip = await findOffer(token);
  if (trip.status === "SENT") {
    trip = await prisma.customTrip.update({
      where: { id: trip.id }, data: { status: "VIEWED", viewedAt: new Date() }, include: { booking: true },
    });
  }
  return sanitizeOffer(trip, viewer);
};

const assertOfferOwner = (trip, user) => {
  const ownsOffer = trip.customerUserId === user.id || trip.customerEmail.toLowerCase() === user.email.toLowerCase();
  if (!ownsOffer) throw new ForbiddenError("This custom trip offer was prepared for a different customer account.");
};

export const bookOffer = async (token, userId, input = {}) => {
  const trip = await findOffer(token);
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  if (!user?.isActive) throw new ForbiddenError("Your account is not active.");
  assertOfferOwner(trip, user);
  if (trip.status === "EXPIRED") throw new ConflictError("This custom trip offer has expired. Please ask the team for a refreshed offer.");
  if (trip.status === "CANCELLED") throw new ConflictError("This custom trip offer has been cancelled.");
  if (new Date(Date.UTC(trip.startDate.getUTCFullYear(), trip.startDate.getUTCMonth(), trip.startDate.getUTCDate())) < new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()))) {
    throw new ConflictError("This custom trip has already started and can no longer be booked online.");
  }
  if (trip.booking) {
    if (trip.booking.userId !== userId) throw new ConflictError("This custom trip has already been booked.");
    return trip.booking;
  }
  if (!user.profile) throw new ValidationError("Please complete your traveler profile before booking.");
  if (!user.profile.govtIdNumber && !user.profile.govtIdImageUrl && !user.profile.govtIdAssetId) {
    throw new ForbiddenError("A government ID is required in your profile before booking.");
  }

  const travelers = normalizeAdditionalTravelers(input.additionalTravelers, trip.travelerCount - 1);
  for (const traveler of travelers) {
    if (!traveler.aadhaarAssetId) continue;
    const asset = await prisma.mediaAsset.findFirst({
      where: { id: traveler.aadhaarAssetId, uploadedById: userId, deliveryType: "AUTHENTICATED", travelerGovtId: null },
    });
    if (!asset) throw new ValidationError("One or more traveler government ID uploads are invalid or already used.");
  }

  let initialPaymentType = input.initialPaymentType || "TOKEN";
  if (!["TOKEN", "FULL"].includes(initialPaymentType)) throw new ValidationError("Initial payment type must be TOKEN or FULL.");
  if (Number(trip.tokenAmount) === 0 || Number(trip.tokenAmount) >= Number(trip.totalAmount)) initialPaymentType = "FULL";
  const totalAmount = Number(trip.totalAmount);
  const tokenAmount = Number(trip.tokenAmount);
  const amountDue = initialPaymentType === "FULL" ? 0 : Math.round((totalAmount - tokenAmount) * 100) / 100;
  const snapshot = {
    reference: trip.reference, title: trip.title, description: trip.description,
    bannerImages: trip.bannerImages, highlights: trip.highlights, itinerary: trip.itinerary,
    startDate: trip.startDate.toISOString(), endDate: trip.endDate.toISOString(), durationDays: trip.durationDays,
    travelerCount: trip.travelerCount, totalAmount, tokenAmount, currency: trip.currency,
    balanceDueDate: trip.balanceDueDate?.toISOString() || null, pricingNotes: trip.pricingNotes,
    version: trip.version,
  };

  try {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.customTrip.findUnique({ where: { id: trip.id }, include: { booking: true } });
      if (current.booking) {
        if (current.booking.userId !== userId) throw new ConflictError("This custom trip has already been booked.");
        return current.booking;
      }
      if (!["SENT", "VIEWED"].includes(current.status) || current.validUntil <= new Date()) {
        throw new ConflictError("This custom trip offer is no longer available for booking.");
      }
      const booking = await tx.booking.create({
        data: {
          bookingReference: `HNG-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
          userId, source: "CUSTOM", customTripId: current.id, customTripSnapshot: snapshot,
          numberOfTravelers: current.travelerCount, totalAmount, tokenAmount, amountDue,
          initialPaymentType, balanceDueDate: current.balanceDueDate,
          specialRequests: typeof input.specialRequests === "string" ? input.specialRequests.trim().slice(0, 3000) || null : null,
          status: "PENDING", paymentStatus: "PENDING",
          ...(travelers.length ? { travelers: { create: travelers } } : {}),
        },
        include: { customTrip: true, travelers: true, payments: true },
      });
      await tx.customTrip.update({
        where: { id: current.id },
        data: { status: "CONVERTED", convertedAt: new Date(), customerUserId: userId },
      });
      return booking;
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error.code === "P2002") {
      const existing = await prisma.booking.findUnique({ where: { customTripId: trip.id }, include: { customTrip: true, travelers: true, payments: true } });
      if (existing?.userId === userId) return existing;
      throw new ConflictError("This custom trip has already been booked.");
    }
    throw error;
  }
};
