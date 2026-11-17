import { apiClient } from "./axios";

export interface Review {
  customTrip?: { title: string } | null;
  publicConsent: boolean;
  booking?: {
    crmTrip?: { name: string } | null;
    crmFestival?: { name: string } | null;
    crmTripSlot?: { crmTrip: { name: string } } | null;
    crmFestivalSlot?: { crmFestival: { name: string } } | null;
  };
  id: string;
  rating: number;
  comment: string | null;
  userId: string;
  tripId: string | null;
  festivalId: string | null;
  bookingId: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    profile?: {
      fullName: string | null;
    } | null;
  };
  trip?: {
    title: string;
  } | null;
  festival?: {
    title: string;
  } | null;
}

export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  displayName: string;
}

export const submitReview = async (data: { bookingId: string; rating: number; comment?: string; publicConsent: boolean }): Promise<Review> => {
  const response = await apiClient.post<Review>("/reviews", data);
  return response.data;
};

export const getReviewsForTrip = async (tripId: string): Promise<PublicReview[]> => {
  const response = await apiClient.get<PublicReview[]>(`/reviews/trip/${tripId}`);
  return response.data;
};

export const getReviewsForFestival = async (festivalId: string): Promise<PublicReview[]> => {
  const response = await apiClient.get<PublicReview[]>(`/reviews/festival/${festivalId}`);
  return response.data;
};

export const getAllReviews = async (): Promise<Review[]> => {
  const response = await apiClient.get<Review[]>("/reviews");
  return response.data;
};

export const toggleReviewVisibility = async (reviewId: string): Promise<Review> => {
  const response = await apiClient.patch<Review>(`/reviews/${reviewId}/toggle`);
  return response.data;
};

export const deleteReview = async (reviewId: string): Promise<void> => {
  await apiClient.delete(`/reviews/${reviewId}`);
};
