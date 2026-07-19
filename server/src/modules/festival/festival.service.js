import { prisma } from "../../prisma/client.js";
import * as festivalRepo from "./festival.repository.js";
import { uploadToCloudinary, uploadPublicVideo, deleteFromCloudinary, deleteFestivalAssets, createDirectImageUploadSignature, isExpectedPublicImageUrl } from "../../core/services/upload.service.js";
import { ValidationError } from "../../core/errors/errors.js";
import { randomUUID } from "crypto";

const generateSlug = (title) => {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
};

export const getFestivals = async (page = 1, limit = 10, isAdmin = false) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit, 10);
  
  const where = isAdmin ? {} : { isPublished: true, isListed: true };

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



  const festival = await festivalRepo.create(data);

  if (data.circuitId) {
    const circuit = await prisma.circuit.findUnique({
      where: { id: data.circuitId },
      include: { days: true }
    });
    
    if (circuit && circuit.days.length > 0) {
      const itineraryDays = circuit.days.map(day => ({
        festivalId: festival.id,
        dayNumber: day.dayNumber,
        title: day.title,
        description: day.description,
        todos: day.todos,
      }));
      await prisma.itineraryDay.createMany({ data: itineraryDays });
    }
  }

  return festival;
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
  const festival = await getFestivalById(id, true);
  const imageUrls = [
    ...(festival.bannerImages || []),
    ...(Array.isArray(festival.highlights) ? festival.highlights.map((item) => item?.imageUrl) : []),
    ...(Array.isArray(festival.stayTransportImages) ? festival.stayTransportImages.map((item) => item?.imageUrl) : []),
  ].filter(Boolean);
  await Promise.allSettled([
    ...imageUrls.map((url) => deleteFromCloudinary(url)),
    ...(festival.videoUrl ? [deleteFromCloudinary(festival.videoUrl, { resourceType: "video" })] : []),
  ]);
  await deleteFestivalAssets(id);
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

export const createBannerUploadSignature = async (festivalId) => {
  await getFestivalById(festivalId, true);
  return createDirectImageUploadSignature(`uploads/festivals/${festivalId}/bannerimages`);
};

export const attachBannerImages = async (festivalId, imageUrls) => {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0 || imageUrls.length > 10) {
    throw new ValidationError("Provide between 1 and 10 banner image URLs.");
  }
  const folder = `uploads/festivals/${festivalId}/bannerimages`;
  if (!imageUrls.every((url) => typeof url === "string" && isExpectedPublicImageUrl(url, folder))) {
    throw new ValidationError("One or more banner URLs are invalid.");
  }
  const festival = await getFestivalById(festivalId, true);
  return festivalRepo.update(festivalId, { bannerImages: [...(festival.bannerImages || []), ...imageUrls] });
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

  const retainedUrls = new Set(finalArray.map((item) => item.imageUrl));
  const removedUrls = (Array.isArray(festival.highlights) ? festival.highlights : [])
    .map((item) => item?.imageUrl)
    .filter((url) => url && !retainedUrls.has(url));
  const updated = await festivalRepo.update(festivalId, { highlights: finalArray });
  await Promise.allSettled(removedUrls.map((url) => deleteFromCloudinary(url)));
  return updated;
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

  const retainedUrls = new Set(finalArray.map((item) => item.imageUrl));
  const removedUrls = (Array.isArray(festival.stayTransportImages) ? festival.stayTransportImages : [])
    .map((item) => item?.imageUrl)
    .filter((url) => url && !retainedUrls.has(url));
  const updated = await festivalRepo.update(festivalId, { stayTransportImages: finalArray });
  await Promise.allSettled(removedUrls.map((url) => deleteFromCloudinary(url)));
  return updated;
};

// ============ Video Upload ====================

export const uploadVideo = async (festivalId, file) => {
  const festival = await festivalRepo.findById(festivalId);
  if (!festival) throw new Error("Festival not found");

  const folder = `uploads/festivals/${festivalId}/video`;
  
  if (festival.videoUrl) {
    await deleteFromCloudinary(festival.videoUrl, { resourceType: "video" });
  }

  const uploaded = await uploadPublicVideo(file, {
    folder,
    publicId: "hero-video",
  });

  return festivalRepo.update(festivalId, { videoUrl: uploaded.secure_url });
};

export const deleteVideo = async (festivalId) => {
  const festival = await festivalRepo.findById(festivalId);
  if (!festival) throw new Error("Festival not found");

  if (festival.videoUrl) {
    await deleteFromCloudinary(festival.videoUrl, { resourceType: "video" });
    return festivalRepo.update(festivalId, { videoUrl: null });
  }

  return festival;
};

// ============ V2 apis for User ====================

export const getFeaturedFestivals = async () => {
  const data = await festivalRepo.getFeaturedFestivals();
  return { data };
}
