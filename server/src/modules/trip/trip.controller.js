import * as tripService from "./trip.service.js";

export const getTrips = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await tripService.getTrips(page, limit);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getTripById = async (req, res, next) => {
  try {
    const trip = await tripService.getTripById(req.params.id);
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
