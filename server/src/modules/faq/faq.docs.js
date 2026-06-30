import { z } from "zod";
import { registry } from "../../core/openapi/openapi.js";

registry.registerPath({
  method: "get",
  path: "/trips/{tripId}/faqs",
  summary: "Get FAQs for a trip",
  description: "Retrieves all FAQs associated with a specific trip. Publicly accessible.",
  tags: ["FAQ"],
  request: {
    params: z.object({
      tripId: z.string(),
    }),
  },
  responses: {
    200: {
      description: "List of FAQs",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/trips/{tripId}/faqs",
  summary: "Create a FAQ",
  description: "Creates a new FAQ for a trip. Requires ADMIN role.",
  tags: ["FAQ"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      tripId: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            question: z.string(),
            answer: z.string(),
            order: z.number(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "FAQ created",
    },
  },
});

registry.registerPath({
  method: "put",
  path: "/trips/{tripId}/faqs/{id}",
  summary: "Update a FAQ",
  description: "Updates an existing FAQ. Requires ADMIN role.",
  tags: ["FAQ"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      tripId: z.string(),
      id: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            question: z.string().optional(),
            answer: z.string().optional(),
            order: z.number().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "FAQ updated",
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/trips/{tripId}/faqs/{id}",
  summary: "Delete a FAQ",
  description: "Deletes an existing FAQ. Requires ADMIN role.",
  tags: ["FAQ"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      tripId: z.string(),
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: "FAQ deleted",
    },
  },
});
