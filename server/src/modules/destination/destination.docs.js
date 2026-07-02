import { z } from "zod";
import { registry } from "../../core/openapi/openapi.js";

registry.registerPath({
  method: "get",
  path: "/destinations",
  summary: "Get all destinations",
  description: "Retrieves a paginated list of all destinations. Publicly accessible.",
  tags: ["Destination"],
  request: {
    query: z.object({
      page: z.string().optional().default("1"),
      limit: z.string().optional().default("10"),
    }),
  },
  responses: {
    200: {
      description: "Paginated destinations list",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/destinations/{id}",
  summary: "Get destination by ID",
  description: "Retrieves a single destination by ID. Publicly accessible.",
  tags: ["Destination"],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Destination details",
    },
    404: {
      description: "Destination not found",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/destinations",
  summary: "Create a destination",
  description: "Creates a new destination. Requires ADMIN role.",
  tags: ["Destination"],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string(),
            state: z.string(),
            subheading: z.string().optional(),
            tripIds: z.array(z.string()).optional(),
            isPublished: z.boolean().optional(),
          }).passthrough(),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Destination created",
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
  path: "/destinations/{id}",
  summary: "Update a destination",
  description: "Updates an existing destination. Requires ADMIN role.",
  tags: ["Destination"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().optional(),
            state: z.string().optional(),
            subheading: z.string().optional(),
            tripIds: z.array(z.string()).optional(),
            isPublished: z.boolean().optional(),
          }).passthrough(),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Destination updated",
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
  path: "/destinations/{id}",
  summary: "Delete a destination",
  description: "Deletes an existing destination. Requires ADMIN role.",
  tags: ["Destination"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Destination deleted",
    },
    401: {
      description: "Unauthorized",
    },
    403: {
      description: "Forbidden",
    },
  },
});
