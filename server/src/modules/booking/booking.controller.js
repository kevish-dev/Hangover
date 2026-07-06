import * as bookingService from "./booking.service.js";

export const createBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.createBooking(req.user.id, req.body);
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};

export const getMyBookings = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const bookings = await bookingService.getUserBookings(req.user.id, page, limit);
    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
};

export const getAllBookings = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const bookings = await bookingService.getAllBookings(page, limit);
    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === "ADMIN";
    const booking = await bookingService.getBookingById(req.params.id, req.user.id, isAdmin);
    res.status(200).json(booking);
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const booking = await bookingService.cancelBooking(req.params.id, req.user.id, reason);
    res.status(200).json(booking);
  } catch (error) {
    next(error);
  }
};

export const getBookingsByTrip = async (req, res, next) => {
  try {
    const bookings = await bookingService.getBookingsByTripId(req.params.tripId);
    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
};

export const getBookingsByFestival = async (req, res, next) => {
  try {
    const bookings = await bookingService.getBookingsByFestivalId(req.params.festivalId);
    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
};

export const cancelAndRefundBooking = async (req, res, next) => {
  try {
    const { reason, refundAmount } = req.body;
    const result = await bookingService.cancelAndRefundBooking(req.params.id, req.user.id, reason, refundAmount);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
