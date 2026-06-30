import { z } from "zod";
import { registry } from "../../core/openapi/openapi.js";

registry.registerPath({
  method: "get",
  path: "/itineraries",
  summary: "Get all itineraries",
  description: "Retrieves a paginated list of all standalone itineraries. Publicly accessible.",
  tags: ["Itinerary"],
  request: {
    query: z.object({
      page: z.string().optional().default("1"),
      limit: z.string().optional().default("10"),
    }),
  },
  responses: {
    200: {
      description: "Paginated itineraries list",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/itineraries/{id}",
  summary: "Get itinerary by ID",
  description: "Retrieves a single itinerary by ID, including its days and activities. Publicly accessible.",
  tags: ["Itinerary"],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Itinerary details",
    },
    404: {
      description: "Itinerary not found",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/itineraries",
  summary: "Create an itinerary",
  description: "Creates a new standalone itinerary. Supports deeply nested payload for days and activities. Requires ADMIN role.",
  tags: ["Itinerary"],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            title: z.string(),
            description: z.string().optional(),
            tripId: z.string().optional(),
            days: z.object({
              create: z.array(z.object({
                dayNumber: z.number(),
                title: z.string(),
                description: z.string().optional(),
                activities: z.object({
                  create: z.array(z.object({
                    title: z.string(),
                    description: z.string().optional(),
                    time: z.string().optional(),
                    order: z.number()
                  }))
                }).optional()
              }))
            }).optional()
          }).passthrough(),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Itinerary created",
    },
  },
});

registry.registerPath({
  method: "put",
  path: "/itineraries/{id}",
  summary: "Update an itinerary",
  description: "Updates an existing itinerary root details. Requires ADMIN role.",
  tags: ["Itinerary"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            title: z.string().optional(),
            description: z.string().optional(),
            tripId: z.string().optional(),
          }).passthrough(),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Itinerary updated",
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/itineraries/{id}",
  summary: "Delete an itinerary",
  description: "Deletes an existing itinerary. Requires ADMIN role.",
  tags: ["Itinerary"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Itinerary deleted",
    },
  },
});
