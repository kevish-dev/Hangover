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
    const booking = await bookingService.getBookingById(req.params.id, req.user.id);
    res.status(200).json(booking);
  } catch (error) {
    next(error);
  }
};
