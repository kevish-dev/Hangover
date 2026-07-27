import { apiClient } from "./axios";

export type ReadinessStatus = "READY" | "IN_PROGRESS" | "BLOCKED" | "CANCELLED" | "COMPLETED";
export type VerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
export type DepartureStatus = "PLANNING" | "IN_PROGRESS" | "READY" | "COMPLETED" | "CANCELLED";
export type HotelStatus = "PLANNED" | "REQUESTED" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
export type VendorPaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "REFUNDED";
export type TaskStatus = "OPEN" | "DONE" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskCategory = "FOLLOW_UP" | "PAYMENT" | "TRAVELER_DOCUMENT" | "HOTEL" | "TRANSPORT" | "PERMIT" | "VENDOR" | "GENERAL";

export interface AdminOption {
  id: string;
  email: string;
  profile?: { fullName?: string | null; phone?: string | null } | null;
}

export interface Readiness {
  status: ReadinessStatus;
  checks: Array<{ key: string; label: string; complete: boolean }>;
  attentionReasons: string[];
  completedChecks: number;
  totalChecks: number;
  paymentOverdue: boolean;
  hotelRequired: boolean;
}

export interface OperationsTask {
  id: string;
  title: string;
  description?: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt?: string | null;
  assigneeId?: string | null;
  bookingId?: string | null;
  slotId?: string | null;
  hotelReservationId?: string | null;
  completedAt?: string | null;
  booking?: { id: string; bookingReference: string; status: string; paymentStatus: string } | null;
  slot?: { id: string; title?: string | null; startDate?: string | null; endDate?: string | null } | null;
  hotelReservation?: { id: string; hotelName: string; status: HotelStatus; paymentStatus: VendorPaymentStatus } | null;
  trip?: { id: string; title: string; slug: string } | null;
  festival?: { id: string; title: string; slug: string } | null;
  contact?: { id: string; displayName: string; email?: string | null; phone?: string | null } | null;
}

export interface HotelReservation {
  id: string;
  bookingId: string;
  hotelName: string;
  address?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  confirmationNumber?: string | null;
  roomType?: string | null;
  roomCount: number;
  guestCount: number;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status: HotelStatus;
  estimatedAmount: string | number;
  amountPaid: string | number;
  paymentStatus: VendorPaymentStatus;
  paymentDueAt?: string | null;
  currency: string;
  notes?: string | null;
}

export interface TravelerOperation {
  id: string;
  fullName: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  aadhaar?: string | null;
  aadhaarMimeType?: string | null;
  verificationStatus: VerificationStatus;
  verificationNotes?: string | null;
  verifiedAt?: string | null;
}

export interface BookingOperation {
  id: string;
  bookingReference: string;
  status: string;
  paymentStatus: string;
  numberOfTravelers: number;
  totalAmount: string | number;
  tokenAmount: string | number;
  amountPaid: string | number;
  amountDue: string | number;
  balanceDueDate?: string | null;
  specialRequests?: string | null;
  createdAt: string;
  confirmedAt?: string | null;
  completedAt?: string | null;
  slotId: string;
  slot: {
    id: string;
    title?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    trip?: { id: string; title: string; slug: string; location: string } | null;
    festival?: { id: string; title: string; slug: string; location: string } | null;
  };
  trip?: { id: string; title: string; slug: string; location: string } | null;
  festival?: { id: string; title: string; slug: string; location: string } | null;
  package?: { id: string; title: string } | null;
  user: {
    id: string;
    email: string;
    crmContact?: { id: string; displayName: string; email?: string | null; phone?: string | null } | null;
    profile?: {
      id: string;
      fullName?: string | null;
      phone?: string | null;
      alternatePhone?: string | null;
      emergencyContactName?: string | null;
      emergencyContactPhone?: string | null;
      bloodGroup?: string | null;
      medicalNotes?: string | null;
      govtIdType?: string | null;
      govtIdNumber?: string | null;
      govtIdImageUrl?: string | null;
      govtIdMimeType?: string | null;
      govtIdVerificationStatus: VerificationStatus;
      govtIdVerificationNotes?: string | null;
      govtIdVerifiedAt?: string | null;
    } | null;
  };
  travelers: TravelerOperation[];
  opsCase?: {
    id: string;
    coordinatorId?: string | null;
    documentsVerifiedAt?: string | null;
    specialRequestsReviewedAt?: string | null;
    blockerReason?: string | null;
    blockerResolvedAt?: string | null;
    nextActionAt?: string | null;
    hotelRequired: boolean;
    internalNotes?: string | null;
  } | null;
  hotelReservations: HotelReservation[];
  payments: Array<{
    id: string;
    type: string;
    status: string;
    amount: string | number;
    currency: string;
    paymentMethod?: string | null;
    receiptNumber?: string | null;
    razorpayPaymentId?: string | null;
    paidAt?: string | null;
    createdAt: string;
    refunds?: Array<{ id: string; amount: string | number; status: string; reason?: string | null }>;
  }>;
  paymentIntents: Array<{ id: string; type: string; status: string; amount: string | number; createdAt: string }>;
  reminders: Array<{ id: string; status: string; sentAt?: string | null; createdAt: string; failureReason?: string | null }>;
  crmTasks: OperationsTask[];
  readiness: Readiness;
}

export interface DepartureOperation {
  id: string;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  capacity: number;
  filledSpots: number;
  trip?: { id: string; title: string; slug: string; location: string } | null;
  festival?: { id: string; title: string; slug: string; location: string } | null;
  operation?: {
    id: string;
    status: DepartureStatus;
    coordinatorId?: string | null;
    notes?: string | null;
    blockerReason?: string | null;
    blockerResolvedAt?: string | null;
    nextActionAt?: string | null;
  } | null;
  readinessStatus: "READY" | "IN_PROGRESS" | "BLOCKED";
  metrics: {
    bookings: number;
    travelers: number;
    readyBookings: number;
    blockedBookings: number;
    outstandingAmount: number;
    hotelReservations: number;
  };
  tasks?: OperationsTask[];
  bookings?: BookingOperation[];
}

export interface OperationsDashboard {
  summary: {
    upcomingDepartures: number;
    activeBookings: number;
    bookingsReady: number;
    bookingsNeedingAttention: number;
    outstandingCustomerBalance: number;
    overdueTasks: number;
    unconfirmedHotels: number;
  };
  departures: DepartureOperation[];
  attentionBookings: BookingOperation[];
  tasks: OperationsTask[];
  admins: AdminOption[];
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface HotelInput {
  hotelName: string;
  address?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  confirmationNumber?: string | null;
  roomType?: string | null;
  roomCount?: number;
  guestCount?: number;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status?: HotelStatus;
  estimatedAmount?: number;
  amountPaid?: number;
  paymentStatus?: VendorPaymentStatus;
  paymentDueAt?: string | null;
  currency?: string;
  notes?: string | null;
  archived?: boolean;
}

const data = <T>(response: { data: T }) => response.data;

export const operationsApi = {
  dashboard: () => apiClient.get<OperationsDashboard>("/crm/operations/dashboard").then(data),
  listDepartures: (params: Record<string, string | number | undefined> = {}) => apiClient.get<Paginated<DepartureOperation>>("/crm/operations/departures", { params }).then(data),
  getDeparture: (slotId: string) => apiClient.get<DepartureOperation>(`/crm/operations/departures/${slotId}`).then(data),
  updateDeparture: (slotId: string, payload: Record<string, unknown>) => apiClient.patch<DepartureOperation>(`/crm/operations/departures/${slotId}`, payload).then(data),
  listBookings: (params: Record<string, string | number | undefined> = {}) => apiClient.get<Paginated<BookingOperation>>("/crm/operations/bookings", { params }).then(data),
  getBooking: (bookingId: string) => apiClient.get<BookingOperation>(`/crm/operations/bookings/${bookingId}`).then(data),
  updateBooking: (bookingId: string, payload: Record<string, unknown>) => apiClient.patch<BookingOperation>(`/crm/operations/bookings/${bookingId}`, payload).then(data),
  updatePrimaryDocument: (bookingId: string, payload: { status: VerificationStatus; notes?: string | null }) => apiClient.patch<BookingOperation>(`/crm/operations/bookings/${bookingId}/primary-document`, payload).then(data),
  updateTraveler: (bookingId: string, travelerId: string, payload: Record<string, unknown>) => apiClient.patch<BookingOperation>(`/crm/operations/bookings/${bookingId}/travelers/${travelerId}`, payload).then(data),
  createHotel: (bookingId: string, payload: HotelInput) => apiClient.post<BookingOperation>(`/crm/operations/bookings/${bookingId}/hotels`, payload).then(data),
  updateHotel: (bookingId: string, hotelId: string, payload: HotelInput) => apiClient.patch<BookingOperation>(`/crm/operations/bookings/${bookingId}/hotels/${hotelId}`, payload).then(data),
  createTask: (payload: Record<string, unknown>) => apiClient.post<OperationsTask>("/crm/tasks", payload).then(data),
  updateTask: (taskId: string, payload: Record<string, unknown>) => apiClient.patch<OperationsTask>(`/crm/tasks/${taskId}`, payload).then(data),
  listTasks: (params: Record<string, string | number | undefined> = {}) => apiClient.get<Paginated<OperationsTask>>("/crm/tasks", { params }).then(data),
  sendPaymentReminder: (bookingId: string) => apiClient.post("/payments/reminders/send", { bookingId }).then(data),
  finalizeBooking: (bookingId: string) => apiClient.post(`/bookings/${bookingId}/finalize`).then(data),
};
