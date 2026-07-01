import { z } from "zod";
import { registry } from "../../core/openapi/openapi.js";

registry.registerPath({
  method: "get",
  path: "/trip-tags",
  summary: "Get all trip tags",
  description: "Retrieves a list of all available trip tags. Publicly accessible.",
  tags: ["Trip Tags"],
  responses: {
    200: {
      description: "List of trip tags",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/trip-tags/{id}",
  summary: "Get trip tag by ID",
  description: "Retrieves a specific trip tag by its ID, including related trips. Publicly accessible.",
  tags: ["Trip Tags"],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Trip tag details",
    },
    404: {
      description: "Trip tag not found",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/trip-tags",
  summary: "Create a trip tag",
  description: "Creates a new trip tag. Requires ADMIN role.",
  tags: ["Trip Tags"],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            tag: z.string()
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Trip tag created",
    },
    400: {
      description: "Bad Request (e.g., tag already exists)",
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
  path: "/trip-tags/{id}",
  summary: "Update a trip tag",
  description: "Updates an existing trip tag. Requires ADMIN role.",
  tags: ["Trip Tags"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            tag: z.string()
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Trip tag updated",
    },
    400: {
      description: "Bad Request (e.g., tag already exists)",
    },
    404: {
      description: "Trip tag not found",
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
  path: "/trip-tags/{id}",
  summary: "Delete a trip tag",
  description: "Deletes a trip tag permanently. Requires ADMIN role.",
  tags: ["Trip Tags"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    204: {
      description: "Trip tag deleted successfully",
    },
    404: {
      description: "Trip tag not found",
    },
    401: {
      description: "Unauthorized",
    },
    403: {
      description: "Forbidden",
    },
  },
});
