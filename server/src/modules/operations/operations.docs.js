import { z } from "zod";
import { registry } from "../../core/openapi/openapi.js";
import {
  bookingPaymentStatuses,
  departureStatuses,
  hotelStatuses,
  readinessStatuses,
  vendorPaymentStatuses,
  verificationStatuses,
} from "./operations.validation.js";

const security = [{ cookieAuth: [] }];
const uuid = z.string().uuid();
const bookingParams = z.object({ bookingId: uuid });
const slotParams = z.object({ slotId: uuid });
const pagination = { page: z.coerce.number().int().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).optional() };
const nullableDate = z.string().datetime().nullable().optional();

registry.registerPath({
  method: "get", path: "/crm/operations/dashboard", summary: "Get the CRM operations control dashboard", tags: ["CRM Operations"], security,
  responses: { 200: { description: "Operational KPIs, departures, attention bookings, tasks, and active admins" } },
});
registry.registerPath({
  method: "get", path: "/crm/operations/departures", summary: "List operational departures", tags: ["CRM Operations"], security,
  request: { query: z.object({ ...pagination, q: z.string().optional(), status: z.enum(departureStatuses).optional(), dateFrom: z.string().datetime().optional(), dateTo: z.string().datetime().optional() }) },
  responses: { 200: { description: "Paginated departure operations with readiness totals" } },
});
registry.registerPath({
  method: "get", path: "/crm/operations/departures/{slotId}", summary: "Get a departure operation", tags: ["CRM Operations"], security,
  request: { params: slotParams }, responses: { 200: { description: "Departure, operational state, and booking readiness" }, 404: { description: "Departure not found" } },
});
registry.registerPath({
  method: "patch", path: "/crm/operations/departures/{slotId}", summary: "Update a departure operation", tags: ["CRM Operations"], security,
  request: { params: slotParams, body: { content: { "application/json": { schema: z.object({ status: z.enum(departureStatuses).optional(), coordinatorId: uuid.nullable().optional(), notes: z.string().nullable().optional(), blockerReason: z.string().nullable().optional(), blockerResolved: z.boolean().optional(), nextActionAt: nullableDate }) } } } },
  responses: { 200: { description: "Updated departure operation" } },
});
registry.registerPath({
  method: "get", path: "/crm/operations/bookings", summary: "List booking operations", tags: ["CRM Operations"], security,
  request: { query: z.object({ ...pagination, q: z.string().optional(), readiness: z.enum(readinessStatuses).optional(), paymentStatus: z.enum(bookingPaymentStatuses).optional(), slotId: uuid.optional() }) },
  responses: { 200: { description: "Paginated bookings with calculated readiness" } },
});
registry.registerPath({
  method: "get", path: "/crm/operations/bookings/{bookingId}", summary: "Get the full booking operations workspace", tags: ["CRM Operations"], security,
  request: { params: bookingParams }, responses: { 200: { description: "Booking, payment, travelers, hotels, tasks, and readiness" }, 404: { description: "Booking not found" } },
});
registry.registerPath({
  method: "patch", path: "/crm/operations/bookings/{bookingId}", summary: "Update booking operational controls", tags: ["CRM Operations"], security,
  request: { params: bookingParams, body: { content: { "application/json": { schema: z.object({ coordinatorId: uuid.nullable().optional(), specialRequestsReviewed: z.boolean().optional(), hotelRequired: z.boolean().optional(), internalNotes: z.string().nullable().optional(), blockerReason: z.string().nullable().optional(), blockerResolved: z.boolean().optional(), nextActionAt: nullableDate }) } } } },
  responses: { 200: { description: "Updated booking operations workspace" } },
});
registry.registerPath({
  method: "patch", path: "/crm/operations/bookings/{bookingId}/primary-document", summary: "Review the primary traveler government ID", tags: ["CRM Operations"], security,
  request: { params: bookingParams, body: { content: { "application/json": { schema: z.object({ status: z.enum(verificationStatuses), notes: z.string().nullable().optional() }) } } } },
  responses: { 200: { description: "Booking with updated document readiness" } },
});
registry.registerPath({
  method: "patch", path: "/crm/operations/bookings/{bookingId}/travelers/{travelerId}", summary: "Update or review an additional traveler", tags: ["CRM Operations"], security,
  request: { params: bookingParams.extend({ travelerId: uuid }), body: { content: { "application/json": { schema: z.object({ fullName: z.string().optional(), gender: z.string().nullable().optional(), dateOfBirth: nullableDate, phone: z.string().nullable().optional(), verificationStatus: z.enum(verificationStatuses).optional(), verificationNotes: z.string().nullable().optional() }) } } } },
  responses: { 200: { description: "Booking with updated traveler readiness" } },
});

const hotelBody = z.object({
  hotelName: z.string(), address: z.string().nullable().optional(), contactName: z.string().nullable().optional(), contactPhone: z.string().nullable().optional(), contactEmail: z.string().email().nullable().optional(), confirmationNumber: z.string().nullable().optional(), roomType: z.string().nullable().optional(), roomCount: z.number().int().min(1).optional(), guestCount: z.number().int().min(1).optional(), checkInAt: nullableDate, checkOutAt: nullableDate, status: z.enum(hotelStatuses).optional(), estimatedAmount: z.number().min(0).optional(), amountPaid: z.number().min(0).optional(), paymentStatus: z.enum(vendorPaymentStatuses).optional(), paymentDueAt: nullableDate, currency: z.string().length(3).optional(), notes: z.string().nullable().optional(),
});
registry.registerPath({
  method: "post", path: "/crm/operations/bookings/{bookingId}/hotels", summary: "Add a booking hotel reservation", tags: ["CRM Operations"], security,
  request: { params: bookingParams, body: { content: { "application/json": { schema: hotelBody } } } }, responses: { 201: { description: "Booking with the new hotel reservation" } },
});
registry.registerPath({
  method: "patch", path: "/crm/operations/bookings/{bookingId}/hotels/{hotelId}", summary: "Update or archive a hotel reservation", tags: ["CRM Operations"], security,
  request: { params: bookingParams.extend({ hotelId: uuid }), body: { content: { "application/json": { schema: hotelBody.partial().extend({ archived: z.boolean().optional() }) } } } }, responses: { 200: { description: "Booking with the updated hotel reservation" } },
});
