import * as tripService from "./trip.service.js";

export const getTrips = async (req, res, next) => {
  try {
    const { page, limit, adminView } = req.query;
    const isAdmin = req.user?.role === "ADMIN" && adminView === "true";
    const result = await tripService.getTrips(page, limit, isAdmin);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getTripById = async (req, res, next) => {
  try {
    const { adminView } = req.query;
    const isAdmin = req.user?.role === "ADMIN" && adminView === "true";
    const trip = await tripService.getTripById(req.params.id, isAdmin);
    res.status(200).json(trip);
  } catch (error) {
    if (error.message === "Trip not found") {
      return res.status(404).json({ message: "Trip not found" });
    }
    next(error);
  }
};

export const createTrip = async (req, res, next) => {
  try {
    const trip = await tripService.createTrip(req.body);
    res.status(201).json({ message: "Trip created successfully", trip });
  } catch (error) {
    next(error);
  }
};

export const updateTrip = async (req, res, next) => {
  try {
    const trip = await tripService.updateTrip(req.params.id, req.body);
    res.status(200).json({ message: "Trip updated successfully", trip });
  } catch (error) {
    next(error);
  }
};

export const deleteTrip = async (req, res, next) => {
  try {
    await tripService.deleteTrip(req.params.id);
    res.status(200).json({ message: "Trip deleted successfully" });
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
    const trip = await tripService.uploadBannerImages(req.params.id, buffers);
    
    res.status(200).json({ message: "Banner images uploaded successfully", trip });
  } catch (error) {
    next(error);
  }
};

export const createBannerUploadSignature = async (req, res, next) => {
  try {
    const result = await tripService.createBannerUploadSignature(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const attachBannerImages = async (req, res, next) => {
  try {
    const trip = await tripService.attachBannerImages(req.params.id, req.body?.imageUrls);
    res.status(200).json({ message: "Banner images attached successfully", trip });
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
    const trip = await tripService.deleteBannerImage(req.params.id, imageUrl);
    res.status(200).json({ message: "Banner image deleted successfully", trip });
  } catch (error) {
    if (error.message === "Image not found in trip") {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

export const deleteGalleryImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ message: "imageUrl is required" });
    const trip = await tripService.deleteGalleryImage(req.params.id, imageUrl);
    res.status(200).json({ message: "Gallery image deleted successfully", trip });
  } catch (error) {
    if (error.message === "Image not found in trip") {
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
    const trip = await tripService.syncHighlights(req.params.id, payload, files);
    res.status(200).json({ message: "Highlights updated", trip });
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
    const trip = await tripService.syncStayTransport(req.params.id, payload, files);
    res.status(200).json({ message: "Stay & Transport updated", trip });
  } catch (error) {
    next(error);
  }
};

// ============ V2 apis for User ====================

export const getFeaturedTrips = async (req, res, next) => {
  try {
    const result = await tripService.getFeaturedTrips();
    res.status(200).json({ message: "Featured trips", result });
  } catch (error) {
    next(error);
  }
}
