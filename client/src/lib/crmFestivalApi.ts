import { apiClient } from "./axios";

export interface CrmFestivalPackage {
  id?: string;
  title: string;
  price: number;
  tokenAmount: number;
}

export interface CrmFestivalAddOn {
  id?: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  price: number;
  maxQuantityPerBooking?: number | null;
  maxQuantityPerSlot?: number | null;
  purchaseCutoffOffsetDays?: number | null;
  isActive?: boolean;
}

export interface CrmFestivalSlot {
  id?: string;
  startDate: string;
  endDate: string;
  title?: string | null;
  priority?: number;
  capacity: number;
  filledSpots?: number;
}

export interface CrmFestivalDay {
  id?: string;
  dayNumber?: number;
  stayLocationId?: string | null;
  propertyId?: string | null;
  placeIds?: string[];
  breakfast?: boolean;
  lunch?: boolean;
  dinner?: boolean;
  transportEnabled?: boolean;
  transportText?: string | null;
  notes?: string | null;
  isDropOff?: boolean;
  dropOffLocationId?: string | null;
  activities?: Array<{ id?: string; name: string; description?: string | null }>;
  commonInclusions?: Array<"ILP_AND_PERMITS" | "BBQ" | "BONFIRE" | "TRIP_GUIDE">;
}

export interface CrmFestivalHighlight {
  text: string;
  imageUrl?: string;
}

export interface CrmFestivalFaq {
  question: string;
  answer: string;
}

export interface CrmFestival {
  id: string;
  name: string;
  numberOfNights: number;
  totalAmount: number | null;
  tokenAmount: number | null;
  destinationId: string;
  destination?: { id: string; name: string };
  airportPickupEnabled: boolean;
  airportDropEnabled: boolean;
  tripType?: string | null;
  bestTimeToVisit?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  isListed: boolean;
  operationsReminderDays: number;
  exclusions: string[];
  websiteOverview?: string | null;
  websiteFaqs: CrmFestivalFaq[];
  websiteTags: Array<{ id: string; tag: string }>;
  websiteBannerImages: string[];
  websiteStayTransportImages: string[];
  websiteHighlights: CrmFestivalHighlight[];
  websiteVideoUrl?: string | null;
  packages: CrmFestivalPackage[];
  addOns: CrmFestivalAddOn[];
  slots: CrmFestivalSlot[];
  itineraryDays?: any[];
  inclusions?: any[];
  commonInclusions?: any[];
  _count?: { itineraryDays: number; inclusions: number; bookings: number };
  createdAt?: string;
  updatedAt?: string;
}

export const crmFestivalApi = {
  list: async (params?: { page?: number; limit?: number; search?: string; destinationId?: string; isPublished?: boolean; isFeatured?: boolean }) =>
    (await apiClient.get<{ data: CrmFestival[]; total: number }>("/crm-festivals", { params })).data,
  get: async (id: string) => (await apiClient.get<CrmFestival>(`/crm-festivals/${id}`)).data,
  create: async (payload: any) => (await apiClient.post<CrmFestival>("/crm-festivals", payload)).data,
  update: async (id: string, payload: any) => (await apiClient.patch<CrmFestival>(`/crm-festivals/${id}`, payload)).data,
  delete: async (id: string) => (await apiClient.delete(`/crm-festivals/${id}`)).data,
  getItinerary: async (id: string) => (await apiClient.get(`/crm-festivals/${id}/itinerary`)).data,
  getInclusions: async (id: string) => (await apiClient.get(`/crm-festivals/${id}/inclusions`)).data,
  getOperations: async (id: string, slotId?: string) => (await apiClient.get(`/crm-festivals/${id}/operations`, { params: { slotId } })).data,
  regenerateInclusions: async (id: string) => (await apiClient.post(`/crm-festivals/${id}/regenerate-inclusions`)).data,
  getBookings: async (id: string) => (await apiClient.get(`/crm-festivals/${id}/bookings`)).data,
  createBooking: async (id: string, payload: any) => (await apiClient.post(`/crm-festivals/${id}/bookings`, payload)).data,
  createInstallment: async (id: string, bookingId: string, payload: any) =>
    (await apiClient.post(`/crm-festivals/${id}/bookings/${bookingId}/installments`, payload)).data,
  updateCommonInclusions: async (id: string, payload: any) =>
    (await apiClient.patch(`/crm-festivals/${id}/common-inclusions`, payload)).data,
  createDay: async (id: string, payload: any) => (await apiClient.post(`/crm-festivals/${id}/itinerary-days`, payload)).data,
  getDay: async (dayId: string) => (await apiClient.get(`/crm-festivals/itinerary-days/${dayId}`)).data,
  updateDay: async (dayId: string, payload: any) => (await apiClient.patch(`/crm-festivals/itinerary-days/${dayId}`, payload)).data,
  deleteDay: async (dayId: string) => (await apiClient.delete(`/crm-festivals/itinerary-days/${dayId}`)).data,
  replacePlaces: async (dayId: string, placeIds: string[]) => (await apiClient.put(`/crm-festivals/itinerary-days/${dayId}/places`, { placeIds })).data,
  updateMeals: async (dayId: string, payload: any) => (await apiClient.patch(`/crm-festivals/itinerary-days/${dayId}/meals`, payload)).data,
  updateDayCommonInclusions: async (dayId: string, payload: any) => (await apiClient.patch(`/crm-festivals/itinerary-days/${dayId}/common-inclusions`, payload)).data,
  updateDropOff: async (dayId: string, payload: any) => (await apiClient.patch(`/crm-festivals/itinerary-days/${dayId}/drop-off`, payload)).data,
  createActivity: async (dayId: string, payload: any) => (await apiClient.post(`/crm-festivals/itinerary-days/${dayId}/activities`, payload)).data,
  updateActivity: async (dayId: string, activityId: string, payload: any) => (await apiClient.patch(`/crm-festivals/itinerary-days/${dayId}/activities/${activityId}`, payload)).data,
  deleteActivity: async (dayId: string, activityId: string) => (await apiClient.delete(`/crm-festivals/itinerary-days/${dayId}/activities/${activityId}`)).data,
};
