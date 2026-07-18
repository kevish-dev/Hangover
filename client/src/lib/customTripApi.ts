import { apiClient } from "./axios";

export type CustomTripStatus = "DRAFT" | "SENT" | "VIEWED" | "CONVERTED" | "EXPIRED" | "CANCELLED";

export interface CustomTripHighlight { title: string | null; description: string | null }
export interface CustomTripDay { day: number; title: string | null; description: string | null; activities: string[] }

export interface CustomTrip {
  id: string;
  reference: string;
  title: string;
  description: string | null;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string | null;
  customerUserId?: string | null;
  bannerImages: string[];
  highlights: CustomTripHighlight[];
  itinerary: CustomTripDay[];
  startDate: string;
  endDate: string;
  durationDays: number;
  travelerCount: number;
  totalAmount: string | number;
  tokenAmount: string | number;
  currency: string;
  balanceDueDate: string | null;
  validUntil: string;
  pricingNotes: string | null;
  internalNotes?: string | null;
  status: CustomTripStatus;
  version?: number;
  canBook?: boolean;
  booking?: { id: string; bookingReference: string; status: string; paymentStatus: string; initialPaymentType?: "TOKEN" | "FULL"; userId?: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

export type CustomTripInput = Omit<CustomTrip, "id" | "reference" | "durationDays" | "currency" | "status" | "booking" | "canBook" | "createdAt" | "updatedAt" | "version">;

export const customTripApi = {
  list: async (params?: { page?: number; limit?: number; status?: string; q?: string }) =>
    (await apiClient.get<{ data: CustomTrip[]; meta: any }>("/custom-trips", { params })).data,
  get: async (id: string) => (await apiClient.get<CustomTrip>(`/custom-trips/${id}`)).data,
  create: async (data: CustomTripInput, files: File[] = []) => {
    const body = new FormData();
    body.append("data", JSON.stringify(data));
    files.forEach((file) => body.append("images", file));
    return (await apiClient.post<CustomTrip>("/custom-trips", body, { headers: { "Content-Type": "multipart/form-data" } })).data;
  },
  update: async (id: string, data: CustomTripInput, files: File[] = []) => {
    const body = new FormData();
    body.append("data", JSON.stringify(data));
    files.forEach((file) => body.append("images", file));
    return (await apiClient.patch<CustomTrip>(`/custom-trips/${id}`, body, { headers: { "Content-Type": "multipart/form-data" } })).data;
  },
  uploadBanners: async (id: string, files: File[]) => {
    const body = new FormData();
    files.forEach((file) => body.append("images", file));
    return (await apiClient.post<CustomTrip>(`/custom-trips/${id}/banners`, body, { headers: { "Content-Type": "multipart/form-data" } })).data;
  },
  removeBanner: async (id: string, imageUrl: string) =>
    (await apiClient.delete<CustomTrip>(`/custom-trips/${id}/banners`, { data: { imageUrl } })).data,
  send: async (id: string) => (await apiClient.post<{ customTrip: CustomTrip; offerLink: string; emailSent: boolean; emailError: string | null }>(`/custom-trips/${id}/send`)).data,
  duplicate: async (id: string) => (await apiClient.post<CustomTrip>(`/custom-trips/${id}/duplicate`)).data,
  cancel: async (id: string, reason?: string) => (await apiClient.post<CustomTrip>(`/custom-trips/${id}/cancel`, { reason })).data,
  remove: async (id: string) => (await apiClient.delete(`/custom-trips/${id}`)).data,
  offer: async (token: string) => (await apiClient.get<CustomTrip>(`/custom-trips/offers/${encodeURIComponent(token)}`)).data,
  book: async (token: string, data: any) => (await apiClient.post(`/custom-trips/offers/${encodeURIComponent(token)}/book`, data)).data,
};
