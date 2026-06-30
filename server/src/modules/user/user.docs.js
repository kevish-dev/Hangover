import { z } from "zod";
import { registry } from "../../core/openapi/openapi.js";

registry.registerPath({
  method: "get",
  path: "/users/me/profile",
  summary: "Get My Profile",
  description: "Retrieves the profile of the currently authenticated user.",
  tags: ["User"],
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "User Profile",
    },
    401: {
      description: "Unauthorized",
    },
  },
});

registry.registerPath({
  method: "put",
  path: "/users/me/profile",
  summary: "Update My Profile",
  description: "Updates the profile of the currently authenticated user.",
  tags: ["User"],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            fullName: z.string().optional(),
            phone: z.string().optional(),
            city: z.string().optional(),
          }).passthrough(),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Profile updated",
    },
    401: {
      description: "Unauthorized",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/users/me/govt-id",
  summary: "Upload Govt ID",
  description: "Uploads front and back images of a government ID. Requires multipart/form-data.",
  tags: ["User"],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            govtIdType: z.string(),
            frontImage: z.any().optional(), // File
            backImage: z.any().optional(), // File
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Govt ID uploaded successfully",
    },
    400: {
      description: "Bad Request",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/users",
  summary: "Get All Users",
  description: "Retrieves a paginated list of all users. Requires ADMIN role.",
  tags: ["User"],
  security: [{ cookieAuth: [] }],
  request: {
    query: z.object({
      page: z.string().optional().default("1"),
      limit: z.string().optional().default("10"),
    }),
  },
  responses: {
    200: {
      description: "Paginated users list",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/users/{id}",
  summary: "Get User by ID",
  description: "Retrieves a single user by ID. Requires ADMIN role.",
  tags: ["User"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: "User details",
    },
  },
});

registry.registerPath({
  method: "put",
  path: "/users/{id}/profile",
  summary: "Update User Profile",
  description: "Updates a specific user's profile. Requires ADMIN role.",
  tags: ["User"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            fullName: z.string().optional(),
          }).passthrough(),
        },
      },
    },
  },
  responses: {
    200: {
      description: "User profile updated",
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/users/{id}/status",
  summary: "Toggle User Status",
  description: "Enables or disables a user account. Requires ADMIN role.",
  tags: ["User"],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            isActive: z.boolean(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "User status updated",
    },
  },
});
