import { registry } from "../../core/openapi/openapi.js";

registry.registerPath({
  method: "get",
  path: "/api/v1/festivals/featured",
  summary: "Get Featured Festivals",
  tags: ["Festivals"],
  responses: {
    200: {
      description: "List of featured festivals",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              result: { type: "object" } // Customize as needed
            }
          }
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/v1/festivals",
  summary: "Get all festivals (paginated)",
  tags: ["Festivals"],
  parameters: [
    { name: "page", in: "query", schema: { type: "integer", default: 1 } },
    { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
  ],
  responses: {
    200: {
      description: "List of festivals",
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/v1/festivals/{id}",
  summary: "Get festival by ID or slug",
  tags: ["Festivals"],
  parameters: [
    { name: "id", in: "path", required: true, schema: { type: "string" } }
  ],
  responses: {
    200: { description: "Festival details" },
    404: { description: "Festival not found" }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/v1/festivals",
  summary: "Create a new festival",
  tags: ["Festivals"],
  security: [{ bearerAuth: [] }],
  requestBody: {
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            circuitId: { type: "string", description: "Optional circuit ID to fork itinerary days from" },
            isListed: { type: "boolean", default: true, description: "Whether the festival appears in public listings" },
            isPublished: { type: "boolean", default: false },
          }
        }
      }
    }
  },
  responses: {
    201: { description: "Festival created successfully" }
  }
});

registry.registerPath({
  method: "put",
  path: "/api/v1/festivals/{id}",
  summary: "Update an existing festival",
  tags: ["Festivals"],
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "id", in: "path", required: true, schema: { type: "string" } }
  ],
  requestBody: {
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            isListed: { type: "boolean", description: "Whether the festival appears in public listings" },
            isPublished: { type: "boolean" },
          }
        }
      }
    }
  },
  responses: {
    200: { description: "Festival updated successfully" }
  }
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/festivals/{id}",
  summary: "Delete a festival",
  tags: ["Festivals"],
  security: [{ bearerAuth: [] }],
  parameters: [
    { name: "id", in: "path", required: true, schema: { type: "string" } }
  ],
  responses: {
    200: { description: "Festival deleted successfully" }
  }
});
