import { z } from "zod";
import { registry } from "../../core/openapi/openapi.js";
import { TRIP_TYPES, OPERATIONAL_TASK_CATEGORIES } from "./circuit.validation.js";

const TAG = ["Circuit"];
const secureTag = { security: [{ cookieAuth: [] }] };

// ── GET /circuits ─────────────────────────────────────────────────────────
registry.registerPath({
  method: "get",
  path: "/circuits",
  summary: "List all circuits",
  description: "Paginated list of circuits. Supports filtering by tripType, isActive, destinationId, and a free-text search.",
  tags: TAG,
  request: {
    query: z.object({
      page: z.string().optional().default("1"),
      limit: z.string().optional().default("10"),
      tripType: z.enum(TRIP_TYPES).optional(),
      isActive: z.string().optional(),
      destinationId: z.string().optional(),
      search: z.string().optional(),
    }),
  },
  responses: {
    200: { description: "Paginated circuits list with meta" },
  },
});

// ── GET /circuits/slug/:slug ──────────────────────────────────────────────
registry.registerPath({
  method: "get",
  path: "/circuits/slug/{slug}",
  summary: "Get circuit by slug",
  description: "Retrieve a full circuit by its URL-friendly slug.",
  tags: TAG,
  request: { params: z.object({ slug: z.string() }) },
  responses: {
    200: { description: "Circuit details" },
    404: { description: "Circuit not found" },
  },
});

// ── GET /circuits/:id ─────────────────────────────────────────────────────
registry.registerPath({
  method: "get",
  path: "/circuits/{id}",
  summary: "Get circuit by ID",
  description: "Retrieve a full circuit including days, tasks, packages, FAQs, tags, and add-ons.",
  tags: TAG,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Circuit details" },
    404: { description: "Circuit not found" },
  },
});

// ── POST /circuits ────────────────────────────────────────────────────────
registry.registerPath({
  method: "post",
  path: "/circuits",
  summary: "Create a circuit",
  description: "Creates a new circuit including all nested days, tasks, packages, and add-ons in one request. Requires ADMIN.",
  tags: TAG,
  ...secureTag,
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            title: z.string(),
            slug: z.string(),
            tripType: z.enum(TRIP_TYPES),
            location: z.string(),
            overview: z.string(),
            bestTimeToVisit: z.string(),
            duration: z.number().int(),
            basePrice: z.number(),
            baseTokenAmount: z.number(),
            inclusions: z.array(z.string()).optional(),
            exclusions: z.array(z.string()).optional(),
            highlights: z.array(z.record(z.unknown())).optional(),
            days: z.array(z.object({
              dayNumber: z.number(),
              title: z.string(),
              tasks: z.array(z.object({
                category: z.enum(OPERATIONAL_TASK_CATEGORIES),
                title: z.string(),
              })).optional(),
            })).optional(),
            packages: z.array(z.object({
              title: z.string(),
              price: z.number(),
              tokenAmount: z.number(),
            })).optional(),
            addOns: z.array(z.object({
              title: z.string(),
              price: z.number(),
            })).optional(),
            tagIds: z.array(z.string().uuid()).optional(),
          }).passthrough(),
        },
      },
    },
  },
  responses: {
    201: { description: "Circuit created" },
    400: { description: "Validation error" },
  },
});

// ── PUT /circuits/:id ─────────────────────────────────────────────────────
registry.registerPath({
  method: "put",
  path: "/circuits/{id}",
  summary: "Update a circuit",
  description: "Updates root-level circuit fields. For days/tasks, use the nested sub-routes. Requires ADMIN.",
  tags: TAG,
  ...secureTag,
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            title: z.string().optional(),
            overview: z.string().optional(),
            basePrice: z.number().optional(),
            isActive: z.boolean().optional(),
          }).passthrough(),
        },
      },
    },
  },
  responses: {
    200: { description: "Circuit updated" },
    404: { description: "Circuit not found" },
  },
});

// ── DELETE /circuits/:id ──────────────────────────────────────────────────
registry.registerPath({
  method: "delete",
  path: "/circuits/{id}",
  summary: "Delete a circuit",
  description: "Deletes a circuit and all its days, tasks, packages, and add-ons (cascade). Requires ADMIN.",
  tags: TAG,
  ...secureTag,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    204: { description: "Circuit deleted" },
    404: { description: "Circuit not found" },
  },
});

// ── POST /circuits/:id/days ───────────────────────────────────────────────
registry.registerPath({
  method: "post",
  path: "/circuits/{id}/days",
  summary: "Add a day to a circuit",
  description: "Appends a new day (with optional tasks) to an existing circuit. Requires ADMIN.",
  tags: TAG,
  ...secureTag,
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            dayNumber: z.number().int(),
            title: z.string(),
            description: z.string().optional(),
            todos: z.array(z.string()).optional(),
            tasks: z.array(z.object({
              category: z.enum(OPERATIONAL_TASK_CATEGORIES),
              title: z.string(),
            })).optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: "Day added" },
    404: { description: "Circuit not found" },
  },
});

// ── PUT /circuits/:id/days/:dayId ─────────────────────────────────────────
registry.registerPath({
  method: "put",
  path: "/circuits/{id}/days/{dayId}",
  summary: "Update a circuit day",
  description: "Updates a day's details (not its tasks). Requires ADMIN.",
  tags: TAG,
  ...secureTag,
  request: {
    params: z.object({ id: z.string().uuid(), dayId: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            title: z.string().optional(),
            description: z.string().optional(),
            todos: z.array(z.string()).optional(),
          }).passthrough(),
        },
      },
    },
  },
  responses: {
    200: { description: "Day updated" },
    404: { description: "Circuit or day not found" },
  },
});

// ── DELETE /circuits/:id/days/:dayId ──────────────────────────────────────
registry.registerPath({
  method: "delete",
  path: "/circuits/{id}/days/{dayId}",
  summary: "Delete a circuit day",
  description: "Removes a day and all its tasks from the circuit (cascade). Requires ADMIN.",
  tags: TAG,
  ...secureTag,
  request: {
    params: z.object({ id: z.string().uuid(), dayId: z.string().uuid() }),
  },
  responses: {
    204: { description: "Day deleted" },
    404: { description: "Circuit or day not found" },
  },
});

// ── POST /circuits/:id/days/:dayId/tasks ──────────────────────────────────
registry.registerPath({
  method: "post",
  path: "/circuits/{id}/days/{dayId}/tasks",
  summary: "Add a task to a circuit day",
  description: "Adds an operational task template to a circuit day. Requires ADMIN.",
  tags: TAG,
  ...secureTag,
  request: {
    params: z.object({ id: z.string().uuid(), dayId: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            category: z.enum(OPERATIONAL_TASK_CATEGORIES),
            title: z.string(),
            description: z.string().optional(),
            estimatedAmount: z.number().optional(),
            dueOffsetDays: z.number().int().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: "Task added" },
    404: { description: "Circuit or day not found" },
  },
});

// ── PUT /circuits/:id/days/:dayId/tasks/:taskId ───────────────────────────
registry.registerPath({
  method: "put",
  path: "/circuits/{id}/days/{dayId}/tasks/{taskId}",
  summary: "Update a circuit day task",
  description: "Updates an operational task template. Requires ADMIN.",
  tags: TAG,
  ...secureTag,
  request: {
    params: z.object({
      id: z.string().uuid(),
      dayId: z.string().uuid(),
      taskId: z.string().uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            title: z.string().optional(),
            description: z.string().optional(),
            estimatedAmount: z.number().optional(),
          }).passthrough(),
        },
      },
    },
  },
  responses: {
    200: { description: "Task updated" },
    404: { description: "Circuit, day, or task not found" },
  },
});

// ── DELETE /circuits/:id/days/:dayId/tasks/:taskId ────────────────────────
registry.registerPath({
  method: "delete",
  path: "/circuits/{id}/days/{dayId}/tasks/{taskId}",
  summary: "Delete a circuit day task",
  description: "Removes an operational task template from a circuit day. Requires ADMIN.",
  tags: TAG,
  ...secureTag,
  request: {
    params: z.object({
      id: z.string().uuid(),
      dayId: z.string().uuid(),
      taskId: z.string().uuid(),
    }),
  },
  responses: {
    204: { description: "Task deleted" },
    404: { description: "Circuit, day, or task not found" },
  },
});
