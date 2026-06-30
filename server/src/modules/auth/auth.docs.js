import { z } from "zod";
import { registry } from "../../core/openapi/openapi.js";

registry.registerPath({
  method: "get",
  path: "/auth/google",
  summary: "Initiate Google OAuth",
  description: "Redirects the user to the Google OAuth consent screen.",
  tags: ["Auth"],
  responses: {
    302: {
      description: "Redirect to Google",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/google/callback",
  summary: "Google OAuth Callback",
  description: "Handles the callback from Google OAuth and logs the user in.",
  tags: ["Auth"],
  request: {
    query: z.object({
      code: z.string().openapi({ description: "Authorization code from Google" }),
    }),
  },
  responses: {
    302: {
      description: "Redirects to the frontend application",
    },
    400: {
      description: "Missing authorization code",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  summary: "Refresh Tokens",
  description: "Refreshes the access token using the refresh token stored in cookies.",
  tags: ["Auth"],
  responses: {
    200: {
      description: "Tokens refreshed successfully",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
            user: z.object({
              id: z.string(),
              email: z.string(),
              role: z.string(),
            }),
          }),
        },
      },
    },
    401: {
      description: "Refresh token is missing or invalid",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  summary: "Logout User",
  description: "Clears the authentication cookies.",
  tags: ["Auth"],
  responses: {
    200: {
      description: "Logged out successfully",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  summary: "Get Current User",
  description: "Retrieves the currently authenticated user's information.",
  tags: ["Auth"],
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "Returns the current user",
      content: {
        "application/json": {
          schema: z.object({
            user: z.object({
              id: z.string(),
              email: z.string(),
              role: z.string(),
            }),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
    },
  },
});
