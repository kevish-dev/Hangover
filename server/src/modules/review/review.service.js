import { prisma } from "../../prisma/client.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../../core/errors/errors.js";

export const createReview = async (userId, data) => {
  const { bookingId, rating, comment, publicConsent } = data;

  if (typeof bookingId !== "string" || !bookingId || !Number.isInteger(rating)) {
    throw new ValidationError("Booking ID and an integer rating are required.");
  }
  if (rating < 1 || rating > 5) throw new ValidationError("Rating must be between 1 and 5.");
  if (comment != null && (typeof comment !== "string" || comment.length > 3000)) {
    throw new ValidationError("Comments must be 3,000 characters or fewer.");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { userId: true, tripId: true, festivalId: true, status: true, review: { select: { id: true } } },
  });
  if (!booking) throw new NotFoundError("Booking not found");
  if (booking.userId !== userId) throw new ForbiddenError("You can only review your own bookings.");
  if (booking.status !== "COMPLETED") throw new ValidationError("You can only review completed trips.");
  if (booking.review) throw new ValidationError("You have already submitted a review for this booking.");

  try {
    return await prisma.review.create({
      data: {
        rating,
        comment: comment?.trim() || null,
        publicConsent: publicConsent === true,
        isPublished: false,
        userId,
        bookingId,
        tripId: booking.tripId,
        festivalId: booking.festivalId,
      },
    });
  } catch (error) {
    if (error.code === "P2002") throw new ValidationError("You have already submitted a review for this booking.");
    throw error;
  }
};

const publicCatalog = { isActive: true, isPublished: true, isListed: true };
const publicReview = { isPublished: true, publicConsent: true };
const matchingBooking = (id, relation, crmRelation) => {
  const item = { ...publicCatalog, id };
  return [
    { [relation]: item },
    { slot: { [relation]: item } },
    { [crmRelation]: item },
    { [`${crmRelation}Slot`]: { [crmRelation]: item } },
  ];
};

async function listPublicReviews(bookingFilters) {
  const reviews = await prisma.review.findMany({
    where: { ...publicReview, booking: { status: "COMPLETED", OR: bookingFilters } },
    select: { id: true, rating: true, comment: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 20,
  });
  return reviews.map((review) => ({ ...review, displayName: "Verified traveler" }));
}

export const getReviewsForTrip = (id) => listPublicReviews(matchingBooking(id, "trip", "crmTrip"));
export const getReviewsForFestival = (id) => listPublicReviews(matchingBooking(id, "festival", "crmFestival"));

export const getAllReviews = () => prisma.review.findMany({
  include: {
    user: { select: { profile: { select: { fullName: true } } } },
    trip: { select: { title: true } },
    festival: { select: { title: true } },
    booking: {
      select: {
        crmTrip: { select: { name: true } },
        crmFestival: { select: { name: true } },
        crmTripSlot: { select: { crmTrip: { select: { name: true } } } },
        crmFestivalSlot: { select: { crmFestival: { select: { name: true } } } },
      },
    },
  },
  orderBy: { createdAt: "desc" },
});

export const toggleReviewVisibility = async (reviewId) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new NotFoundError("Review not found");
  if (!review.publicConsent) throw new ValidationError("The traveler did not opt into public sharing.");
  return prisma.review.update({ where: { id: reviewId }, data: { isPublished: !review.isPublished } });
};

export const deleteReview = async (reviewId) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new NotFoundError("Review not found");
  return prisma.review.delete({ where: { id: reviewId } });
};
