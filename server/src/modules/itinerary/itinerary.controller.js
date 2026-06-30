import * as itineraryService from "./itinerary.service.js";

export const getItineraries = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await itineraryService.getItineraries(page, limit);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getItineraryById = async (req, res, next) => {
  try {
    const itinerary = await itineraryService.getItineraryById(req.params.id);
    res.status(200).json(itinerary);
  } catch (error) {
    if (error.message === "Itinerary not found") {
      return res.status(404).json({ message: "Itinerary not found" });
    }
    next(error);
  }
};

export const createItinerary = async (req, res, next) => {
  try {
    const itinerary = await itineraryService.createItinerary(req.body);
    res.status(201).json({ message: "Itinerary created successfully", itinerary });
  } catch (error) {
    next(error);
  }
};

export const updateItinerary = async (req, res, next) => {
  try {
    const itinerary = await itineraryService.updateItinerary(req.params.id, req.body);
    res.status(200).json({ message: "Itinerary updated successfully", itinerary });
  } catch (error) {
    next(error);
  }
};

export const deleteItinerary = async (req, res, next) => {
  try {
    await itineraryService.deleteItinerary(req.params.id);
    res.status(200).json({ message: "Itinerary deleted successfully" });
  } catch (error) {
    next(error);
  }
};
