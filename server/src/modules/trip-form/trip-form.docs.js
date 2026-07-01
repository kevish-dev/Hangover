import { z } from "zod";
import { registry } from "../../core/openapi/openapi.js";

registry.registerPath({
  method: "get",
  path: "/trips/{tripId}/forms",
  summary: "Get trip form fields",
  description: "Retrieves all active dynamic form fields configured for a specific trip.",
  tags: ["Trip Forms"],
  request: {
    params: z.object({
      tripId: z.string(),
    }),
  },
  responses: {
    200: { description: "List of trip form fields" },
  },
});

registry.registerPath({
  method: "post",
  path: "/trips/{tripId}/forms",
  summary: "Create a trip form field",
  description: "Creates a new dynamic form field for a trip. Requires ADMIN role.",
  tags: ["Trip Forms"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      tripId: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            label: z.string(),
            fieldKey: z.string(),
            fieldType: z.string(),
            placeholder: z.string().optional(),
            helpText: z.string().optional(),
            options: z.array(z.string()).optional(),
            isRequired: z.boolean().optional(),
            order: z.number().optional()
          }),
        },
      },
    },
  },
  responses: {
    201: { description: "Form field created successfully" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" }
  },
});

registry.registerPath({
  method: "put",
  path: "/trips/{tripId}/forms/{fieldId}",
  summary: "Update a trip form field",
  description: "Updates an existing dynamic form field for a trip. Requires ADMIN role.",
  tags: ["Trip Forms"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      tripId: z.string(),
      fieldId: z.string()
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            label: z.string().optional(),
            placeholder: z.string().optional(),
            helpText: z.string().optional(),
            isRequired: z.boolean().optional(),
            order: z.number().optional(),
            isActive: z.boolean().optional()
          }).passthrough(),
        },
      },
    },
  },
  responses: {
    200: { description: "Form field updated successfully" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" }
  },
});

registry.registerPath({
  method: "delete",
  path: "/trips/{tripId}/forms/{fieldId}",
  summary: "Delete a trip form field",
  description: "Soft deletes a form field by setting isActive to false. Requires ADMIN role.",
  tags: ["Trip Forms"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      tripId: z.string(),
      fieldId: z.string()
    }),
  },
  responses: {
    204: { description: "Form field deleted" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" }
  },
});
