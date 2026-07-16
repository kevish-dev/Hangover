import * as operationsService from "./operations.service.js";

export const getDashboard = async (req, res, next) => {
  try { res.json(await operationsService.getDashboard()); } catch (error) { next(error); }
};
export const listDepartures = async (req, res, next) => {
  try { res.json(await operationsService.listDepartures(req.query)); } catch (error) { next(error); }
};
export const getDeparture = async (req, res, next) => {
  try { res.json(await operationsService.getDeparture(req.params.slotId)); } catch (error) { next(error); }
};
export const updateDeparture = async (req, res, next) => {
  try { res.json(await operationsService.updateDeparture(req.params.slotId, req.body, req.user.id)); } catch (error) { next(error); }
};
export const listBookings = async (req, res, next) => {
  try { res.json(await operationsService.listBookings(req.query)); } catch (error) { next(error); }
};
export const getBooking = async (req, res, next) => {
  try { res.json(await operationsService.getBooking(req.params.bookingId)); } catch (error) { next(error); }
};
export const updateBookingOps = async (req, res, next) => {
  try { res.json(await operationsService.updateBookingOps(req.params.bookingId, req.body, req.user.id)); } catch (error) { next(error); }
};
export const updatePrimaryDocument = async (req, res, next) => {
  try { res.json(await operationsService.updatePrimaryDocument(req.params.bookingId, req.body, req.user.id)); } catch (error) { next(error); }
};
export const updateTraveler = async (req, res, next) => {
  try { res.json(await operationsService.updateTraveler(req.params.bookingId, req.params.travelerId, req.body, req.user.id)); } catch (error) { next(error); }
};
export const createHotel = async (req, res, next) => {
  try { res.status(201).json(await operationsService.createHotel(req.params.bookingId, req.body)); } catch (error) { next(error); }
};
export const updateHotel = async (req, res, next) => {
  try { res.json(await operationsService.updateHotel(req.params.bookingId, req.params.hotelId, req.body)); } catch (error) { next(error); }
};
