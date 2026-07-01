import * as repo from "./booking.repository.js";
import { prisma } from "../../prisma/client.js";
import crypto from "crypto";

export const createBooking = async (userId, data) => {
  // 1. Verify User Govt ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true }
  });

  if (!user || !user.profile) {
    const error = new Error("User profile not found. Please complete your profile.");
    error.statusCode = 400;
    throw error;
  }

  const hasGovtId = user.profile.govtIdNumber || (user.profile.govtIdFrontImageUrl && user.profile.govtIdBackImageUrl);
  if (!hasGovtId) {
    const error = new Error("A valid Government ID is required in your profile to proceed with the booking.");
    error.statusCode = 403;
    throw error;
  }

  // 2. Fetch Trip Details
  const trip = await prisma.trip.findUnique({
    where: { id: data.tripId }
  });

  if (!trip) {
    const error = new Error("Trip not found");
    error.statusCode = 404;
    throw error;
  }

  // 3. Pricing Calculation (simplified for now)
  const numberOfTravelers = data.numberOfTravelers || 1;
  const totalAmount = Number(trip.price) * numberOfTravelers;
  const tokenAmount = Number(trip.tokenAmount) * numberOfTravelers;
  
  let amountDue = totalAmount;
  if (data.initialPaymentType === 'TOKEN') {
    amountDue = totalAmount - tokenAmount;
  } else if (data.initialPaymentType === 'FULL') {
    amountDue = 0;
  }

  // Generate Booking Reference
  const bookingReference = `BKG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  // 4. Create Booking Payload
  const bookingData = {
    bookingReference,
    userId,
    tripId: data.tripId,
    numberOfTravelers,
    initialPaymentType: data.initialPaymentType || 'TOKEN',
    totalAmount,
    tokenAmount,
    amountDue,
    status: 'PENDING',
    paymentStatus: 'PENDING'
  };

  if (data.formResponses && data.formResponses.length > 0) {
    bookingData.formResponses = {
      create: data.formResponses.map(fr => ({
        fieldId: fr.fieldId,
        value: fr.value
      }))
    };
  }

  return repo.createBooking(bookingData);
};

export const getBookingById = async (id, userId) => {
  const booking = await repo.getBookingById(id);
  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }
  // Ensure the user owns this booking
  if (booking.userId !== userId) {
    const error = new Error("Forbidden");
    error.statusCode = 403;
    throw error;
  }
  return booking;
};

export const getUserBookings = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit, 10);
  
  const { bookings, total } = await repo.getUserBookings(userId, skip, take);
  
  return {
    data: bookings,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take)
    }
  };
};

export const getAllBookings = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const take = parseInt(limit, 10);
  
  const { bookings, total } = await repo.getAllBookings(skip, take);
  
  return {
    data: bookings,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take)
    }
  };
};
