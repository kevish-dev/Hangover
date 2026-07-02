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

export const getTripById = async (id, isAdmin = false) => {
  const where = isAdmin ? { id } : { id, isPublished: true };
  const trip = await tripRepo.findById(where);
  if (!trip) throw new Error("Trip not found");
  return trip;
};

export const createTrip = async (data) => {
  if (!data.slug) {
    data.slug = generateSlug(data.title) + "-" + Date.now();
  }
  return tripRepo.create(data);
};

export const updateTrip = async (id, data) => {
  if (data.title && !data.slug) {
    data.slug = generateSlug(data.title) + "-" + Date.now();
  }
  return tripRepo.update(id, data);
};

export const deleteTrip = async (id) => {
  await deleteTripAssets(id);
  return tripRepo.remove(id);
};

export const deleteBannerImage = async (tripId, imageUrl) => {
  const trip = await getTripById(tripId);
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
  await getTripById(tripId); // Ensure trip exists

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
  const trip = await getTripById(tripId);
  const existingBanners = trip.bannerImages || [];
  
  return tripRepo.update(tripId, {
    bannerImages: [...existingBanners, ...imageUrls]
  });
};
