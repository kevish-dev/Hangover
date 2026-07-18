import * as itineraryService from "./itinerary.service.js";
import { createItinerarySchema, updateItineraryDaySchema } from "./itinerary.validation.js";

export const getTripItinerary = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const data = await itineraryService.getTripItinerary(tripId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getFestivalItinerary = async (req, res, next) => {
  try {
    const { festivalId } = req.params;
    const data = await itineraryService.getFestivalItinerary(festivalId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const createItinerary = async (req, res, next) => {
  try {
    const validatedData = createItinerarySchema.parse(req.body);
    const data = await itineraryService.createItinerary(validatedData);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const updateItineraryDay = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = updateItineraryDaySchema.parse(req.body);
    const data = await itineraryService.updateItineraryDay(id, validatedData);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const deleteItineraryDay = async (req, res, next) => {
  try {
    const { id } = req.params;
    await itineraryService.deleteItineraryDay(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
