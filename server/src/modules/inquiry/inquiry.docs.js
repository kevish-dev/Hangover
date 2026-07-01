import { z } from "zod";
import { registry } from "../../core/openapi/openapi.js";

registry.registerPath({
  method: "post",
  path: "/inquiries",
  summary: "Create an inquiry",
  description: "Creates a new inquiry. Accessible to non-authenticated users. Rate-limited to prevent spam.",
  tags: ["Inquiry"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string(),
            email: z.string().email(),
            phone: z.string(),
            tripType: z.string().optional(),
            tripId: z.string().optional(),
            subject: z.string().optional(),
            message: z.string()
          }),
        },
      },
    },
  },
  responses: {
    201: { description: "Inquiry created successfully" },
    429: { description: "Too many requests (rate limit exceeded)" }
  },
});

registry.registerPath({
  method: "get",
  path: "/inquiries",
  summary: "Get all inquiries",
  description: "Retrieves a paginated list of all inquiries. Requires ADMIN role.",
  tags: ["Inquiry"],
  security: [{ cookieAuth: [] }],
  request: {
    query: z.object({
      page: z.string().optional().default("1"),
      limit: z.string().optional().default("10"),
      isResolved: z.string().optional()
    }),
  },
  responses: {
    200: { description: "Paginated inquiries list" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" }
  },
});

registry.registerPath({
  method: "get",
  path: "/inquiries/{id}",
  summary: "Get inquiry by ID",
  description: "Retrieves details of a specific inquiry by ID. Requires ADMIN role.",
  tags: ["Inquiry"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string()
    }),
  },
  responses: {
    200: { description: "Inquiry details" },
    404: { description: "Inquiry not found" }
  },
});

registry.registerPath({
  method: "patch",
  path: "/inquiries/{id}/resolve",
  summary: "Resolve an inquiry",
  description: "Marks an inquiry as resolved and allows adding admin notes. Requires ADMIN role.",
  tags: ["Inquiry"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string()
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            adminNotes: z.string().optional()
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Inquiry resolved successfully" },
    404: { description: "Inquiry not found" }
  },
});

registry.registerPath({
  method: "delete",
  path: "/inquiries/{id}",
  summary: "Delete an inquiry",
  description: "Deletes an inquiry permanently. Requires ADMIN role.",
  tags: ["Inquiry"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string()
    }),
  },
  responses: {
    204: { description: "Inquiry deleted successfully" },
    404: { description: "Inquiry not found" }
  },
});
