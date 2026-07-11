import { apiClient } from "./axios";
import type { ApiTrip } from "./tripApi";

// ── Booking types matching the backend Prisma schema ──────────────

export type BookingStatus = "PENDING" | "RESERVED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
export type PaymentStatus = "PENDING" | "PARTIALLY_PAID" | "PAID" | "FAILED" | "OVERDUE" | "REFUNDED" | "PARTIALLY_REFUNDED";

export interface ApiRefund {
  id: string;
  amount: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  reason: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface ApiPayment {
  id: string;
  amount: string;
  status: string;
  type: string;
  createdAt: string;
  refunds: ApiRefund[];
}

export interface ApiBooking {
  id: string;
  bookingReference: string;
  userId: string;
  tripId: string | null;
  festivalId: string | null;
  packageId: string | null;
  slotId: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  numberOfTravelers: number;
  totalAmount: string;
  tokenAmount: string;
  amountPaid: string;
  amountDue: string;
  initialPaymentType: string;
  balanceDueDate: string | null;
  reservedAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  cancellationReason: string | null;
  specialRequests: string | null;
  createdAt: string;
  updatedAt: string;
  trip?: ApiTrip;
  festival?: any; // Add festival type when available
  package?: any; // Add package type
  slot?: any; // Add slot type
  payments: ApiPayment[];
}

export interface ApiBookingsResponse {
  data: ApiBooking[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── Fetch current user's bookings ─────────────────────────────────

export async function fetchMyBookings(): Promise<ApiBooking[]> {
  const res = await apiClient.get<ApiBookingsResponse>("/bookings/me", {
    params: { page: 1, limit: 100 },
  });
  return res.data.data;
}

// ── Helpers ───────────────────────────────────────────────────────

export function isUpcomingBooking(b: ApiBooking): boolean {
  if (b.status === "CANCELLED" || b.status === "COMPLETED") return false;
  const activeStatuses: BookingStatus[] = ["PENDING", "RESERVED", "CONFIRMED"];
  if (!activeStatuses.includes(b.status)) return false;
  
  if (!b.slot?.startDate) return true; // Show active bookings without slots as upcoming
  const tripStart = new Date(b.slot.startDate);
  const now = new Date();
  return tripStart > now;
}

export function isPastBooking(b: ApiBooking): boolean {
  if (b.status === "COMPLETED" || b.status === "CANCELLED") return true;
  if (!b.slot?.startDate) return false; // If no slot and not completed/cancelled, it's upcoming
  
  const tripStart = new Date(b.slot.startDate);
  const now = new Date();
  
  return tripStart <= now;
}

export function formatBookingDate(iso?: string): string {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTravelMonth(iso?: string): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

// ── User Profile types ────────────────────────────────────────────

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string | null;
  phone: string | null;
  alternatePhone: string | null;
  dateOfBirth: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY" | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  bloodGroup: string | null;
  medicalNotes: string | null;
  govtIdType: "AADHAAR" | "PASSPORT" | null;
  govtIdNumber: string | null;
  govtIdImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Profile API methods ───────────────────────────────────────────

export async function getMyProfile(): Promise<UserProfile> {
  const res = await apiClient.get<UserProfile>("/users/me/profile");
  return res.data;
}

export async function updateMyProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  const res = await apiClient.put<{ message: string; profile: UserProfile }>("/users/me/profile", data);
  return res.data.profile;
}

export async function uploadGovtId(govtIdType: string, image?: File | null): Promise<UserProfile> {
  const formData = new FormData();
  formData.append("govtIdType", govtIdType);
  if (image) formData.append("image", image);

  const res = await apiClient.post<{ message: string; profile: UserProfile }>("/users/me/govt-id", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data.profile;
}
