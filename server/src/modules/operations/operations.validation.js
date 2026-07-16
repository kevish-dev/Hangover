import { z } from "zod";

export const departureStatuses = ["PLANNING", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"];
export const hotelStatuses = ["PLANNED", "REQUESTED", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"];
export const vendorPaymentStatuses = ["UNPAID", "PARTIALLY_PAID", "PAID", "REFUNDED"];
export const verificationStatuses = ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"];
export const bookingPaymentStatuses = ["PENDING", "PARTIALLY_PAID", "PAID", "FAILED", "OVERDUE", "REFUNDED", "PARTIALLY_REFUNDED"];
export const readinessStatuses = ["READY", "IN_PROGRESS", "BLOCKED", "CANCELLED", "COMPLETED"];

const id = z.string().uuid();
const optionalId = id.nullable().optional();
const optionalDate = z.union([z.coerce.date(), z.null()]).optional();
const optionalText = (max) => z.string().trim().max(max).nullable().optional();
const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
};

export const departureListQuerySchema = z.object({
  ...pagination,
  q: z.string().trim().max(160).optional(),
  status: z.enum(departureStatuses).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const bookingListQuerySchema = z.object({
  ...pagination,
  q: z.string().trim().max(160).optional(),
  readiness: z.enum(readinessStatuses).optional(),
  paymentStatus: z.enum(bookingPaymentStatuses).optional(),
  slotId: id.optional(),
});

export const updateDepartureSchema = z.object({
  status: z.enum(departureStatuses).optional(),
  coordinatorId: optionalId,
  notes: optionalText(5000),
  blockerReason: optionalText(2000),
  blockerResolved: z.boolean().optional(),
  nextActionAt: optionalDate,
}).refine((data) => Object.keys(data).length > 0, { message: "No departure changes supplied." });

export const updateBookingOpsSchema = z.object({
  coordinatorId: optionalId,
  specialRequestsReviewed: z.boolean().optional(),
  hotelRequired: z.boolean().optional(),
  internalNotes: optionalText(5000),
  blockerReason: optionalText(2000),
  blockerResolved: z.boolean().optional(),
  nextActionAt: optionalDate,
}).refine((data) => Object.keys(data).length > 0, { message: "No booking operation changes supplied." });

export const updatePrimaryDocumentSchema = z.object({
  status: z.enum(verificationStatuses),
  notes: optionalText(2000),
});

export const updateTravelerSchema = z.object({
  fullName: z.string().trim().min(1).max(160).optional(),
  gender: optionalText(40),
  dateOfBirth: optionalDate,
  phone: optionalText(32),
  verificationStatus: z.enum(verificationStatuses).optional(),
  verificationNotes: optionalText(2000),
}).refine((data) => Object.keys(data).length > 0, { message: "No traveler changes supplied." });

const hotelFields = {
  hotelName: z.string().trim().min(1).max(200),
  address: optionalText(1000),
  contactName: optionalText(160),
  contactPhone: optionalText(32),
  contactEmail: z.string().trim().email().max(254).nullable().optional(),
  confirmationNumber: optionalText(120),
  roomType: optionalText(160),
  roomCount: z.coerce.number().int().min(1).max(500).default(1),
  guestCount: z.coerce.number().int().min(1).max(5000).default(1),
  checkInAt: optionalDate,
  checkOutAt: optionalDate,
  status: z.enum(hotelStatuses).default("PLANNED"),
  estimatedAmount: z.coerce.number().min(0).max(100000000).default(0),
  amountPaid: z.coerce.number().min(0).max(100000000).default(0),
  paymentStatus: z.enum(vendorPaymentStatuses).optional(),
  paymentDueAt: optionalDate,
  currency: z.string().trim().length(3).toUpperCase().default("INR"),
  notes: optionalText(5000),
};

const validHotelDates = (data) => !data.checkInAt || !data.checkOutAt || data.checkOutAt > data.checkInAt;

export const createHotelSchema = z.object(hotelFields).refine(validHotelDates, {
  message: "Hotel check-out must be after check-in.",
  path: ["checkOutAt"],
});

export const updateHotelSchema = z.object({
  ...Object.fromEntries(Object.entries(hotelFields).map(([key, value]) => [key, value.optional()])),
  archived: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "No hotel changes supplied." })
  .refine(validHotelDates, { message: "Hotel check-out must be after check-in.", path: ["checkOutAt"] });

export const idSchema = id;
