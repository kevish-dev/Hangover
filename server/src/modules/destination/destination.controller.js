import * as destinationService from "./destination.service.js";
import { AppError } from "../../core/errors/errors.js";

export const getDestinations = async (req, res, next) => {
  try {
    const { page, limit, adminView } = req.query;
    const isAdmin = req.user?.role === "ADMIN" && adminView === "true";
    const destinations = await destinationService.getDestinations(page, limit, isAdmin);
    res.json(destinations);
  } catch (error) {
    next(error);
  }
};

export const getDestinationById = async (req, res, next) => {
  try {
    const { adminView } = req.query;
    const isAdmin = req.user?.role === "ADMIN" && adminView === "true";
    const destination = await destinationService.getDestinationById(
      req.params.id,
      isAdmin,
    );
    res.json(destination);
  } catch (error) {
    if (error.message === "Destination not found") {
      return next(new AppError("Destination not found", 404));
    }
    next(error);
  }
};

export const createDestination = async (req, res, next) => {
  try {
    const destination = await destinationService.createDestination(req.body);
    res.status(201).json(destination);
  } catch (error) {
    next(error);
  }
};

export const updateDestination = async (req, res, next) => {
  try {
    const destination = await destinationService.updateDestination(
      req.params.id,
      req.body,
    );
    res.json(destination);
  } catch (error) {
    next(error);
  }
};

export const deleteDestination = async (req, res, next) => {
  try {
    await destinationService.deleteDestination(req.params.id);
    res.json({ message: "Destination deleted successfully" });
  } catch (error) {
    next(error);
  }
};
