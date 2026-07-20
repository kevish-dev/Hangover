import { z } from "zod";
import { registry } from "../../core/openapi/openapi.js";

const TAG = ["Itinerary"];
const secureTag = { security: [{ cookieAuth: [] }] };

// ── GET /itineraries/trip/:tripId ─────────────────────────────────────────
registry.registerPath({
  method: "get",
  path: "/itineraries/trip/{tripId}",
  summary: "Get itinerary for a trip",
  description: "Retrieve all itinerary days for a specific trip.",
  tags: TAG,
  request: { params: z.object({ tripId: z.string().uuid() }) },
  responses: {
    200: { description: "List of itinerary days" },
  },
});

// ── GET /itineraries/festival/:festivalId ─────────────────────────────────
registry.registerPath({
  method: "get",
  path: "/itineraries/festival/{festivalId}",
  summary: "Get itinerary for a festival",
  description: "Retrieve all itinerary days for a specific festival.",
  tags: TAG,
  request: { params: z.object({ festivalId: z.string().uuid() }) },
  responses: {
    200: { description: "List of itinerary days" },
  },
});

// ── POST /itineraries ─────────────────────────────────────────────────────
registry.registerPath({
  method: "post",
  path: "/itineraries",
  summary: "Create itinerary days",
  description: "Creates multiple itinerary days for a trip or festival. Replaces existing.",
  tags: TAG,
  ...secureTag,
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            tripId: z.string().uuid().optional(),
            festivalId: z.string().uuid().optional(),
            days: z.array(z.object({
              dayNumber: z.number().int(),
              title: z.string(),
              description: z.string().optional(),
              todos: z.array(z.string()).optional(),
              tasks: z.array(z.object({
                category: z.string(), // e.g. "HOTEL", "TRANSPORT"
                title: z.string(),
                description: z.string().optional(),
                unitPrice: z.number().optional(),
                quantityNeeded: z.number().int().optional(),
                dueOffsetDays: z.number().int().optional(),
              })).optional(),
            })),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: "Itinerary created" },
  },
});

// ── PUT /itineraries/:id ──────────────────────────────────────────────────
registry.registerPath({
  method: "put",
  path: "/itineraries/{id}",
  summary: "Update an itinerary day",
  description: "Updates a single itinerary day.",
  tags: TAG,
  ...secureTag,
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            dayNumber: z.number().int().optional(),
            title: z.string().optional(),
            description: z.string().optional(),
            todos: z.array(z.string()).optional(),
            tasks: z.array(z.object({
              category: z.string(),
              title: z.string(),
              description: z.string().optional(),
              unitPrice: z.number().optional(),
              quantityNeeded: z.number().int().optional(),
              dueOffsetDays: z.number().int().optional(),
            })).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Itinerary day updated" },
  },
});

// ── DELETE /itineraries/:id ───────────────────────────────────────────────
registry.registerPath({
  method: "delete",
  path: "/itineraries/{id}",
  summary: "Delete an itinerary day",
  description: "Deletes a single itinerary day.",
  tags: TAG,
  ...secureTag,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    204: { description: "Itinerary day deleted" },
  },
});
