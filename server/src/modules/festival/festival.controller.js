import * as festivalService from "./festival.service.js";

export const getFestivals = async (req, res, next) => {
  try {
    const { page, limit, adminView } = req.query;
    const isAdmin = req.user?.role === "ADMIN" && adminView === "true";
    const result = await festivalService.getFestivals(page, limit, isAdmin);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getFestivalById = async (req, res, next) => {
  try {
    const { adminView } = req.query;
    const isAdmin = req.user?.role === "ADMIN" && adminView === "true";
    const festival = await festivalService.getFestivalById(req.params.id, isAdmin);
    res.status(200).json(festival);
  } catch (error) {
    if (error.message === "Festival not found") {
      return res.status(404).json({ message: "Festival not found" });
    }
    next(error);
  }
};

export const createFestival = async (req, res, next) => {
  try {
    const festival = await festivalService.createFestival(req.body);
    res.status(201).json({ message: "Festival created successfully", festival });
  } catch (error) {
    next(error);
  }
};

export const updateFestival = async (req, res, next) => {
  try {
    const festival = await festivalService.updateFestival(req.params.id, req.body);
    res.status(200).json({ message: "Festival updated successfully", festival });
  } catch (error) {
    next(error);
  }
};

export const deleteFestival = async (req, res, next) => {
  try {
    await festivalService.deleteFestival(req.params.id);
    res.status(200).json({ message: "Festival deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const uploadBanners = async (req, res, next) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No images provided" });
    }

    const buffers = files.map(file => file.buffer);
    const festival = await festivalService.uploadBannerImages(req.params.id, buffers);
    
    res.status(200).json({ message: "Banner images uploaded successfully", festival });
  } catch (error) {
    next(error);
  }
};

export const deleteBanner = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: "imageUrl is required" });
    }
    const festival = await festivalService.deleteBannerImage(req.params.id, imageUrl);
    res.status(200).json({ message: "Banner image deleted successfully", festival });
  } catch (error) {
    if (error.message === "Image not found in festival") {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

export const syncHighlights = async (req, res, next) => {
  try {
    const { payload } = req.body;
    if (!payload) {
      return res.status(400).json({ message: "Payload missing" });
    }
    
    const files = req.files || [];
    const festival = await festivalService.syncHighlights(req.params.id, payload, files);
    res.status(200).json({ message: "Highlights updated", festival });
  } catch (error) {
    next(error);
  }
};

export const syncStayTransport = async (req, res, next) => {
  try {
    const { payload } = req.body;
    if (!payload) {
      return res.status(400).json({ message: "Payload missing" });
    }
    
    const files = req.files || [];
    const festival = await festivalService.syncStayTransport(req.params.id, payload, files);
    res.status(200).json({ message: "Stay & Transport updated", festival });
  } catch (error) {
    next(error);
  }
};

// ============ V2 apis for User ====================

export const uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No video uploaded" });
    const festival = await festivalService.uploadVideo(req.params.id, req.file);
    res.status(200).json({ message: "Video uploaded successfully", festival });
  } catch (error) {
    next(error);
  }
};

export const deleteVideo = async (req, res, next) => {
  try {
    const festival = await festivalService.deleteVideo(req.params.id);
    res.status(200).json({ message: "Video deleted successfully", festival });
  } catch (error) {
    next(error);
  }
};

export const getFeaturedFestivals = async (req, res, next) => {
  try {
    const result = await festivalService.getFeaturedFestivals();
    res.status(200).json({ message: "Featured festivals", result });
  } catch (error) {
    next(error);
  }
}
