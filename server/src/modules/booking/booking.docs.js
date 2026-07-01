import { z } from "zod";
import { registry } from "../../core/openapi/openapi.js";

registry.registerPath({
  method: "post",
  path: "/bookings",
  summary: "Create a booking",
  description: "Creates a new booking for a trip. Requires a valid Government ID in the user profile.",
  tags: ["Booking"],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            tripId: z.string(),
            numberOfTravelers: z.number().optional().default(1),
            initialPaymentType: z.string().optional().default("TOKEN"),
            formResponses: z.array(z.object({
              fieldId: z.string(),
              value: z.string()
            })).optional()
          }),
        },
      },
    },
  },
  responses: {
    201: { description: "Booking created successfully" },
    400: { description: "Bad Request - Profile incomplete" },
    403: { description: "Forbidden - Government ID missing" },
    404: { description: "Trip not found" }
  },
});

registry.registerPath({
  method: "get",
  path: "/bookings/me",
  summary: "Get my bookings",
  description: "Retrieves a paginated list of bookings for the authenticated user.",
  tags: ["Booking"],
  security: [{ cookieAuth: [] }],
  request: {
    query: z.object({
      page: z.string().optional().default("1"),
      limit: z.string().optional().default("10"),
    }),
  },
  responses: {
    200: { description: "Paginated user bookings list" },
  },
});

registry.registerPath({
  method: "get",
  path: "/bookings",
  summary: "Get all bookings (Admin)",
  description: "Retrieves a paginated list of all bookings in the system. Requires ADMIN role.",
  tags: ["Booking"],
  security: [{ cookieAuth: [] }],
  request: {
    query: z.object({
      page: z.string().optional().default("1"),
      limit: z.string().optional().default("10"),
    }),
  },
  responses: {
    200: { description: "Paginated bookings list" },
    403: { description: "Forbidden - Admins only" }
  },
});

registry.registerPath({
  method: "get",
  path: "/bookings/{id}",
  summary: "Get a single booking",
  description: "Retrieves details of a specific booking by ID. Users can only fetch their own bookings.",
  tags: ["Booking"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string()
    }),
  },
  responses: {
    200: { description: "Booking details" },
    403: { description: "Forbidden - Not the owner" },
    404: { description: "Booking not found" }
  },
});
