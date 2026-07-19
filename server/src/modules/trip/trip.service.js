import * as tripRepo from "./trip.repository.js";
import { uploadToCloudinary, deleteFromCloudinary, deleteTripAssets, createDirectImageUploadSignature, isExpectedPublicImageUrl } from "../../core/services/upload.service.js";
import { ValidationError } from "../../core/errors/errors.js";
import { createHash, randomBytes, randomUUID } from "crypto";
import { prisma } from "../../prisma/client.js";

const generateSlug = (title) => {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
};

export const getTrips = async (page = 1, limit = 10, isAdmin = false) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit, 10);
  
  const where = isAdmin ? {} : { isPublished: true, isListed: true };

  const { trips, total } = await tripRepo.findAll(skip, take, where, isAdmin);

  return {
    data: trips,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take),
    }
  };
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const hashShareToken = (token) => createHash("sha256").update(token).digest("hex");

export const getTripById = async (id, isAdmin = false, shareToken = null) => {
  const idField = UUID_RE.test(id) ? 'id' : 'slug';
  const where = isAdmin
    ? { [idField]: id }
    : shareToken
      ? {
          [idField]: id,
          OR: [
            { isPublished: true },
            {
              shareTokenHash: hashShareToken(shareToken),
              OR: [
                { shareTokenExpiresAt: null },
                { shareTokenExpiresAt: { gt: new Date() } },
              ],
            },
          ],
        }
      : { [idField]: id, isPublished: true };
  const trip = await tripRepo.findById(where, isAdmin);
  if (!trip) throw new Error("Trip not found");
  return trip;
};

export const createTrip = async (data) => {
  let createData = { ...data };

  if (createData.circuitId) {
    const circuit = await prisma.circuit.findUnique({
      where: { id: createData.circuitId },
      include: {
        days: { orderBy: { dayNumber: "asc" } },
        packages: true,
        faqs: { orderBy: { order: "asc" } },
        tags: true,
        addOns: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!circuit) throw new ValidationError("Circuit not found.");

    createData = {
      title: circuit.title,
      location: circuit.location,
      bannerImages: circuit.bannerImages,
      duration: circuit.duration,
      bestTimeToVisit: circuit.bestTimeToVisit,
      overview: circuit.overview,
      inclusions: circuit.inclusions,
      exclusions: circuit.exclusions,
      tripType: circuit.tripType,
      destinationId: circuit.destinationId,
      highlights: circuit.highlights,
      stayTransportImages: circuit.stayTransportImages,
      packages: circuit.packages.map(({ title, price, tokenAmount }) => ({
        title,
        price: Number(price),
        tokenAmount: Number(tokenAmount),
      })),
      faqs: circuit.faqs.map(({ question, answer, order }) => ({ question, answer, order })),
      tripTags: circuit.tags.map(({ tag }) => tag),
      addOns: circuit.addOns.map((addOn) => ({
        title: addOn.title,
        description: addOn.description,
        imageUrl: addOn.imageUrl,
        price: Number(addOn.price),
        maxQuantityPerBooking: addOn.maxQuantityPerBooking,
        purchaseCutoffOffsetDays: addOn.purchaseCutoffOffsetDays,
        isActive: addOn.isActive,
      })),
      itinerary: circuit.days.map((day) => ({
        dayNumber: day.dayNumber,
        title: day.title,
        description: day.description,
        todos: day.todos,
      })),
      ...createData,
    };
  }

  if (!createData.title) throw new ValidationError("Trip title is required.");
  if (!createData.slug) {
    createData.slug = generateSlug(createData.title) + "-" + Date.now();
  }
  if (!createData.stayTransportImages) createData.stayTransportImages = [];
  if (!createData.bannerImages) createData.bannerImages = [];
  if (!createData.galleryImages) createData.galleryImages = [];

  if (createData.slots && createData.slots.length > 0) {
    for (const slot of createData.slots) {
      if (!slot.startDate || !slot.endDate) {
        throw new ValidationError("Every trip slot needs a start and end date.");
      }
      if (new Date(slot.endDate) <= new Date(slot.startDate)) {
        throw new ValidationError("Every slot end date must be after its start date.");
      }
    }
    const start = new Date(createData.slots[0].startDate);
    const end = new Date(createData.slots[0].endDate);
    const diffTime = Math.abs(end - start);
    createData.duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  if (!createData.duration) createData.duration = 1;

  return tripRepo.create(createData);
};

export const createShareLink = async (id, expiresAt) => {
  await getTripById(id, true);
  const token = randomBytes(32).toString("base64url");
  const parsedExpiry = expiresAt ? new Date(expiresAt) : null;
  if (parsedExpiry && Number.isNaN(parsedExpiry.getTime())) {
    throw new ValidationError("Invalid share link expiry.");
  }
  const trip = await tripRepo.update(id, {
    shareTokenHash: hashShareToken(token),
    shareTokenExpiresAt: parsedExpiry,
  });
  return { token, slug: trip.slug, expiresAt: trip.shareTokenExpiresAt };
};

export const revokeShareLink = async (id) => {
  await getTripById(id, true);
  await tripRepo.update(id, { shareTokenHash: null, shareTokenExpiresAt: null });
};

export const updateTrip = async (id, data) => {
  if (data.slots && data.slots.length > 0 && data.slots[0].startDate && data.slots[0].endDate) {
    const start = new Date(data.slots[0].startDate);
    const end = new Date(data.slots[0].endDate);
    if (end > start) {
      const diffTime = Math.abs(end - start);
      data.duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }
  return tripRepo.update(id, data);
};

export const deleteTrip = async (id) => {
  const trip = await getTripById(id, true);
  const contentUrls = [
    ...(trip.bannerImages || []),
    ...(Array.isArray(trip.highlights) ? trip.highlights.map((item) => item?.imageUrl) : []),
    ...(Array.isArray(trip.stayTransportImages) ? trip.stayTransportImages.map((item) => item?.imageUrl) : []),
  ].filter(Boolean);
  await Promise.allSettled(contentUrls.map((url) => deleteFromCloudinary(url)));
  await deleteTripAssets(id);
  return tripRepo.remove(id);
};

export const deleteBannerImage = async (tripId, imageUrl) => {
  const trip = await getTripById(tripId, true);
  const existingBanners = trip.bannerImages || [];
  
  if (!existingBanners.includes(imageUrl)) {
    throw new Error("Image not found in trip");
  }

  // Delete from Cloudinary
  await deleteFromCloudinary(imageUrl);

  // Update Database
  const newBanners = existingBanners.filter(url => url !== imageUrl);
  return tripRepo.update(tripId, { bannerImages: newBanners });
};

export const uploadBannerImages = async (tripId, imageBuffers) => {
  await getTripById(tripId, true); // Ensure trip exists

  const folder = `uploads/trips/${tripId}/bannerimages`;
  const uploadPromises = imageBuffers.map(buffer => 
    uploadToCloudinary(buffer, {
      folder,
      publicId: randomUUID(), // Generate a unique ID for each banner
      optimize: true, // Resize and compress banner images
    })
  );

  const imageUrls = await Promise.all(uploadPromises);

  // We need to fetch the existing trip to append the banners
  const trip = await getTripById(tripId, true);
  const existingBanners = trip.bannerImages || [];
  
  return tripRepo.update(tripId, {
    bannerImages: [...existingBanners, ...imageUrls]
  });
};

export const createBannerUploadSignature = async (tripId) => {
  await getTripById(tripId, true);
  return createDirectImageUploadSignature(`uploads/trips/${tripId}/bannerimages`);
};

export const attachBannerImages = async (tripId, imageUrls) => {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0 || imageUrls.length > 10) {
    throw new ValidationError("Provide between 1 and 10 banner image URLs.");
  }
  const folder = `uploads/trips/${tripId}/bannerimages`;
  if (!imageUrls.every((url) => typeof url === "string" && isExpectedPublicImageUrl(url, folder))) {
    throw new ValidationError("One or more banner URLs are invalid.");
  }
  const trip = await getTripById(tripId, true);
  return tripRepo.update(tripId, { bannerImages: [...(trip.bannerImages || []), ...imageUrls] });
};

export const syncHighlights = async (tripId, payloadStr, files) => {
  const trip = await tripRepo.findById(tripId);
  if (!trip) throw new Error("Trip not found");

  const payload = JSON.parse(payloadStr); 
  const folder = `uploads/trips/${tripId}/highlights`;
  
  const uploadPromises = payload.map(async (item) => {
    if (item.type === "EXISTING") {
      return { text: item.text, imageUrl: item.url };
    } else if (item.type === "NEW") {
      const file = files[item.fileIndex];
      if (file) {
         const url = await uploadToCloudinary(file.buffer, {
           folder,
           publicId: randomUUID(),
         });
         return { text: item.text, imageUrl: url };
      }
    }
    return null;
  });

  const results = await Promise.all(uploadPromises);
  const finalArray = results.filter(item => item !== null);

  const retainedUrls = new Set(finalArray.map((item) => item.imageUrl));
  const removedUrls = (Array.isArray(trip.highlights) ? trip.highlights : [])
    .map((item) => item?.imageUrl)
    .filter((url) => url && !retainedUrls.has(url));
  const updated = await tripRepo.update(tripId, { highlights: finalArray });
  await Promise.allSettled(removedUrls.map((url) => deleteFromCloudinary(url)));
  return updated;
};

export const syncStayTransport = async (tripId, payloadStr, files) => {
  const trip = await tripRepo.findById(tripId);
  if (!trip) throw new Error("Trip not found");

  const payload = JSON.parse(payloadStr); 
  const folder = `uploads/trips/${tripId}/staytransport`;
  
  const uploadPromises = payload.map(async (item) => {
    if (item.type === "EXISTING") {
      return { text: item.text, imageUrl: item.url };
    } else if (item.type === "NEW") {
      const file = files[item.fileIndex];
      if (file) {
         const url = await uploadToCloudinary(file.buffer, {
           folder,
           publicId: randomUUID(),
         });
         return { text: item.text, imageUrl: url };
      }
    }
    return null;
  });

  const results = await Promise.all(uploadPromises);
  const finalArray = results.filter(item => item !== null);

  const retainedUrls = new Set(finalArray.map((item) => item.imageUrl));
  const removedUrls = (Array.isArray(trip.stayTransportImages) ? trip.stayTransportImages : [])
    .map((item) => item?.imageUrl)
    .filter((url) => url && !retainedUrls.has(url));
  const updated = await tripRepo.update(tripId, { stayTransportImages: finalArray });
  await Promise.allSettled(removedUrls.map((url) => deleteFromCloudinary(url)));
  return updated;
};

// ============ V2 apis for User ====================

export const getFeaturedTrips = async () => {
  let data = await tripRepo.getFeaturedTrips();
  data = data.map(trip => {
    return {
      ...trip,
      bannerImages: trip.bannerImages[0]
    }
  })

  return {data}
}

export const getSignatureTrips = async () => {
  const data = await tripRepo.getSignatureTrips();
  return { data };
};

export const updateSignatureTrips = async (tripIds) => {
  if (!Array.isArray(tripIds) || tripIds.some((id) => typeof id !== "string")) {
    throw new ValidationError("tripIds must be an array of trip IDs.");
  }
  if (tripIds.length > 6) {
    throw new ValidationError("Select up to 6 trips for the Signature Collection.");
  }
  if (new Set(tripIds).size !== tripIds.length) {
    throw new ValidationError("Each trip can only be selected once.");
  }

  if (tripIds.length > 0) {
    const { trips } = await tripRepo.findAll(0, tripIds.length, { id: { in: tripIds } }, true);
    if (trips.length !== tripIds.length || trips.some((trip) => !trip.isActive || !trip.isPublished || trip.bannerImages.length === 0)) {
      throw new ValidationError("Only active, published trips with a banner image can be in the Signature Collection.");
    }
  }

  await tripRepo.setSignatureTrips(tripIds);
  return getSignatureTrips();
};
