import * as tripRepo from "./trip.repository.js";
import { uploadToCloudinary, deleteFromCloudinary, deleteTripAssets } from "../../core/services/upload.service.js";
import { randomUUID } from "crypto";

const generateSlug = (title) => {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
};

export const getTrips = async (page = 1, limit = 10, isAdmin = false) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit, 10);
  
  const where = isAdmin ? {} : { isPublished: true };
  const { trips, total } = await tripRepo.findAll(skip, take, where);
  
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

export const getTripById = async (id, isAdmin = false) => {
  const idField = UUID_RE.test(id) ? 'id' : 'slug';
  const where = isAdmin ? { [idField]: id } : { [idField]: id, isPublished: true };
  const trip = await tripRepo.findById(where);
  if (!trip) throw new Error("Trip not found");
  return trip;
};

export const createTrip = async (data) => {
  if (!data.slug) {
    data.slug = generateSlug(data.title) + "-" + Date.now();
  }
  if (!data.stayTransportImages) {
    data.stayTransportImages = [];
  }
  return tripRepo.create(data);
};

export const updateTrip = async (id, data) => {
  return tripRepo.update(id, data);
};

export const deleteTrip = async (id) => {
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
      optimize: false, // Admin upload - no resize or optimization
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

export const uploadGalleryImages = async (tripId, buffers) => {
  const trip = await tripRepo.findById(tripId);
  if (!trip) {
    throw new Error("Trip not found");
  }

  const folder = `uploads/trips/${tripId}/galleryimages`;
  const uploadPromises = buffers.map(buffer => 
    uploadToCloudinary(buffer, {
      folder,
      publicId: randomUUID(),
    })
  );

  const imageUrls = await Promise.all(uploadPromises);
  const existingGallery = trip.galleryImages || [];

  return tripRepo.update(tripId, {
    galleryImages: [...existingGallery, ...imageUrls]
  });
};

export const deleteGalleryImage = async (tripId, imageUrl) => {
  const trip = await tripRepo.findById(tripId);
  if (!trip) {
    throw new Error("Trip not found");
  }

  const existingGallery = trip.galleryImages || [];
  if (!existingGallery.includes(imageUrl)) {
    throw new Error("Image not found in trip");
  }

  await deleteFromCloudinary(imageUrl);

  return tripRepo.update(tripId, {
    galleryImages: existingGallery.filter(url => url !== imageUrl)
  });
};

export const syncStayTransport = async (tripId, payloadStr, files) => {
  const trip = await tripRepo.findById(tripId);
  if (!trip) throw new Error("Trip not found");

  const payload = JSON.parse(payloadStr); 
  const folder = `uploads/trips/${tripId}/staytransport`;
  
  const finalArray = [];
  
  for (const item of payload) {
    if (item.type === "EXISTING") {
      finalArray.push({ text: item.text, imageUrl: item.url });
    } else if (item.type === "NEW") {
      const file = files[item.fileIndex];
      if (file) {
         const url = await uploadToCloudinary(file.buffer, {
           folder,
           publicId: randomUUID(),
         });
         finalArray.push({ text: item.text, imageUrl: url });
      }
    }
  }

  return tripRepo.update(tripId, { stayTransportImages: finalArray });
};
