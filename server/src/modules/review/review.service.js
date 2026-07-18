import { prisma } from "../../prisma/client.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../../core/errors/errors.js";

export const createReview = async (userId, data) => {
  const { bookingId, rating, comment } = data;

  if (!bookingId || !rating) {
    throw new ValidationError("Booking ID and rating are required.");
  }
  
  if (rating < 1 || rating > 5) {
    throw new ValidationError("Rating must be between 1 and 5.");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { slot: true, customTrip: true, review: true }
  });

  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  if (booking.userId !== userId) {
    throw new ForbiddenError("You can only review your own bookings.");
  }

  if (booking.status !== "COMPLETED") {
    throw new ValidationError("You can only review completed trips.");
  }

  if (booking.review) {
    throw new ValidationError("You have already submitted a review for this booking.");
  }

  return prisma.review.create({
    data: {
      rating,
      comment,
      userId,
      bookingId,
      tripId: booking.tripId,
      festivalId: booking.festivalId,
      customTripId: booking.customTripId,
    }
  });
};

export const getReviewsForTrip = async (tripId) => {
  return prisma.review.findMany({
    where: { tripId, isPublished: true },
    include: {
      user: {
        include: { profile: { select: { fullName: true } } }
      }
    },
    orderBy: { createdAt: "desc" }
  });
};

export const getReviewsForFestival = async (festivalId) => {
  return prisma.review.findMany({
    where: { festivalId, isPublished: true },
    include: {
      user: {
        include: { profile: { select: { fullName: true } } }
      }
    },
    orderBy: { createdAt: "desc" }
  });
};

export const getAllReviews = async () => {
  return prisma.review.findMany({
    include: {
      user: { include: { profile: { select: { fullName: true } } } },
      trip: { select: { title: true } },
      festival: { select: { title: true } },
      customTrip: { select: { title: true, reference: true } }
    },
    orderBy: { createdAt: "desc" }
  });
};

export const toggleReviewVisibility = async (reviewId) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new NotFoundError("Review not found");

  return prisma.review.update({
    where: { id: reviewId },
    data: { isPublished: !review.isPublished }
  });
};

export const deleteReview = async (reviewId) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new NotFoundError("Review not found");

  return prisma.review.delete({
    where: { id: reviewId }
  });
};
