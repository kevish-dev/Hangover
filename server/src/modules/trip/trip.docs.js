import { z } from "zod";
import { registry } from "../../core/openapi/openapi.js";

registry.registerPath({
  method: "get",
  path: "/trips",
  summary: "Get all trips",
  description: "Retrieves a paginated list of all trips. Publicly accessible.",
  tags: ["Trip"],
  request: {
    query: z.object({
      page: z.string().optional().default("1"),
      limit: z.string().optional().default("10"),
    }),
  },
  responses: {
    200: {
      description: "Paginated trips list",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/trips/{id}",
  summary: "Get trip by ID",
  description: "Retrieves a single trip by ID, including its FAQs and Itinerary. Publicly accessible.",
  tags: ["Trip"],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Trip details",
    },
    404: {
      description: "Trip not found",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/trips",
  summary: "Create a trip",
  description: "Creates a new trip. Requires ADMIN role.",
  tags: ["Trip"],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            title: z.string(),
            location: z.string(),
            duration: z.number(),
            groupSizeMin: z.number(),
            groupSizeMax: z.number(),
            difficultyLevel: z.string(),
            bestTimeToVisit: z.string(),
            maxAltitude: z.number(),
            overview: z.string(),
            price: z.number(),
            tokenAmount: z.number(),
            capacity: z.number(),
            startDate: z.string().datetime(),
            endDate: z.string().datetime(),
            tripType: z.string(),
          }).passthrough(),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Trip created",
    },
    401: {
      description: "Unauthorized",
    },
    403: {
      description: "Forbidden",
    },
  },
});

registry.registerPath({
  method: "put",
  path: "/trips/{id}",
  summary: "Update a trip",
  description: "Updates an existing trip. Requires ADMIN role.",
  tags: ["Trip"],
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
          }).passthrough(),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Trip updated",
    },
    401: {
      description: "Unauthorized",
    },
    403: {
      description: "Forbidden",
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/trips/{id}",
  summary: "Delete a trip",
  description: "Deletes an existing trip. Requires ADMIN role.",
  tags: ["Trip"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Trip deleted",
    },
    401: {
      description: "Unauthorized",
    },
    403: {
      description: "Forbidden",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/trips/{id}/banner-images",
  summary: "Upload Trip Banners",
  description: "Uploads multiple banner images for a trip. Requires ADMIN role. Requires multipart/form-data.",
  tags: ["Trip"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            banners: z.array(z.any()), // Array of Files
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Banners uploaded successfully",
    },
    400: {
      description: "Bad Request",
    },
    401: {
      description: "Unauthorized",
    },
    403: {
      description: "Forbidden",
    },
  },
});
