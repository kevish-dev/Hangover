import * as festivalRepo from "./festival.repository.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../../core/services/upload.service.js";
import { randomUUID } from "crypto";

const generateSlug = (title) => {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
};

export const getFestivals = async (page = 1, limit = 10, isAdmin = false) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit, 10);
  
  const where = isAdmin ? {} : { isPublished: true };

  const { festivals, total } = await festivalRepo.findAll(skip, take, where, isAdmin);

  return {
    data: festivals,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take),
    }
  };
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getFestivalById = async (id, isAdmin = false) => {
  const idField = UUID_RE.test(id) ? 'id' : 'slug';
  const where = isAdmin ? { [idField]: id } : { [idField]: id, isPublished: true };
  const festival = await festivalRepo.findById(where, isAdmin);
  if (!festival) throw new Error("Festival not found");
  return festival;
};

export const createFestival = async (data) => {
  if (!data.slug) {
    data.slug = generateSlug(data.title) + "-" + Date.now();
  }
  if (!data.stayTransportImages) data.stayTransportImages = [];

  if (data.slots && data.slots.length > 0 && data.slots[0].startDate && data.slots[0].endDate) {
    const start = new Date(data.slots[0].startDate);
    const end = new Date(data.slots[0].endDate);
    if (end <= start) {
      throw new Error("End date must be strictly after start date");
    }
    const diffTime = Math.abs(end - start);
    data.duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  if (!data.duration) data.duration = 1;

  // price and tokenAmount are required Decimal columns — ensure they're set
  if (data.price === undefined || data.price === null) data.price = 0;
  if (data.tokenAmount === undefined || data.tokenAmount === null) data.tokenAmount = 0;

  return festivalRepo.create(data);
};

export const updateFestival = async (id, data) => {
  if (data.slots && data.slots.length > 0 && data.slots[0].startDate && data.slots[0].endDate) {
    const start = new Date(data.slots[0].startDate);
    const end = new Date(data.slots[0].endDate);
    if (end > start) {
      const diffTime = Math.abs(end - start);
      data.duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }
  return festivalRepo.update(id, data);
};

export const deleteFestival = async (id) => {
  // Ideally, also delete assets from Cloudinary here.
  return festivalRepo.remove(id);
};

export const deleteBannerImage = async (festivalId, imageUrl) => {
  const festival = await getFestivalById(festivalId, true);
  const existingBanners = festival.bannerImages || [];
  
  if (!existingBanners.includes(imageUrl)) {
    throw new Error("Image not found in festival");
  }

  // Delete from Cloudinary
  await deleteFromCloudinary(imageUrl);

  // Update Database
  const newBanners = existingBanners.filter(url => url !== imageUrl);
  return festivalRepo.update(festivalId, { bannerImages: newBanners });
};

export const uploadBannerImages = async (festivalId, imageBuffers) => {
  await getFestivalById(festivalId, true); // Ensure festival exists

  const folder = `uploads/festivals/${festivalId}/bannerimages`;
  const uploadPromises = imageBuffers.map(buffer => 
    uploadToCloudinary(buffer, {
      folder,
      publicId: randomUUID(), // Generate a unique ID for each banner
      optimize: true, // Resize and compress banner images
    })
  );

  const imageUrls = await Promise.all(uploadPromises);

  // We need to fetch the existing festival to append the banners
  const festival = await getFestivalById(festivalId, true);
  const existingBanners = festival.bannerImages || [];
  
  return festivalRepo.update(festivalId, {
    bannerImages: [...existingBanners, ...imageUrls]
  });
};

export const syncHighlights = async (festivalId, payloadStr, files) => {
  const festival = await festivalRepo.findById(festivalId);
  if (!festival) throw new Error("Festival not found");

  const payload = JSON.parse(payloadStr); 
  const folder = `uploads/festivals/${festivalId}/highlights`;
  
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

  return festivalRepo.update(festivalId, { highlights: finalArray });
};

export const syncStayTransport = async (festivalId, payloadStr, files) => {
  const festival = await festivalRepo.findById(festivalId);
  if (!festival) throw new Error("Festival not found");

  const payload = JSON.parse(payloadStr); 
  const folder = `uploads/festivals/${festivalId}/staytransport`;
  
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

  return festivalRepo.update(festivalId, { stayTransportImages: finalArray });
};

// ============ Video Upload ====================

export const uploadVideo = async (festivalId, file) => {
  const festival = await festivalRepo.findById(festivalId);
  if (!festival) throw new Error("Festival not found");

  const folder = `uploads/festivals/${festivalId}/video`;
  
  if (festival.videoUrl) {
    await deleteFromCloudinary(festival.videoUrl);
  }

  const url = await uploadToCloudinary(file.buffer, {
    folder,
    publicId: "hero-video",
    optimize: false
  });

  return festivalRepo.update(festivalId, { videoUrl: url });
};

export const deleteVideo = async (festivalId) => {
  const festival = await festivalRepo.findById(festivalId);
  if (!festival) throw new Error("Festival not found");

  if (festival.videoUrl) {
    await deleteFromCloudinary(festival.videoUrl);
    return festivalRepo.update(festivalId, { videoUrl: null });
  }

  return festival;
};

// ============ V2 apis for User ====================

export const getFeaturedFestivals = async () => {
  const data = await festivalRepo.getFeaturedFestivals();
  return { data };
}
