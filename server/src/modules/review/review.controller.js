import * as reviewService from "./review.service.js";

export const createReview = async (req, res, next) => {
  try {
    const review = await reviewService.createReview(req.user.id, req.body);
    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
};

export const getReviewsForTrip = async (req, res, next) => {
  try {
    const reviews = await reviewService.getReviewsForTrip(req.params.tripId);
    res.status(200).json(reviews);
  } catch (error) {
    next(error);
  }
};

export const getReviewsForFestival = async (req, res, next) => {
  try {
    const reviews = await reviewService.getReviewsForFestival(req.params.festivalId);
    res.status(200).json(reviews);
  } catch (error) {
    next(error);
  }
};

export const getAllReviews = async (req, res, next) => {
  try {
    const reviews = await reviewService.getAllReviews();
    res.status(200).json(reviews);
  } catch (error) {
    next(error);
  }
};

export const toggleReviewVisibility = async (req, res, next) => {
  try {
    const review = await reviewService.toggleReviewVisibility(req.params.id);
    res.status(200).json(review);
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    await reviewService.deleteReview(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
