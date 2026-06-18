import express from "express";
import { login, me, signup, logout, refresh, verifyEmail, resendVerificationEmail, sendResetPassword, resetPassword } from "./auth.controller.js";
import { authMiddleware } from "./auth.middleware.js";
import asyncHandler from "../../utils/catchAsync.js";
import rateLimit from "express-rate-limit";
import { registry } from "../../core/docs/openApi.js";
import { SignupSchema, LoginSchema, VerifyEmailSchema, ResendVerificationSchema, SendResetPasswordSchema, ResetPasswordSchema } from "./auth.schemas.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many requests from this IP, please try again after 15 minutes" },
});

// OpenAPI definitions
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/signup',
  tags: ['Auth'],
  summary: 'Register a new user',
  request: {
    body: {
      content: {
        'application/json': { schema: SignupSchema }
      }
    }
  },
  responses: {
    201: { description: 'Account created successfully' },
    400: { description: 'Validation error' },
    409: { description: 'Email already in use' }
  }
});

router.post("/signup", authLimiter, asyncHandler(signup));

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/login',
  tags: ['Auth'],
  summary: 'Login a user',
  request: {
    body: {
      content: {
        'application/json': { schema: LoginSchema }
      }
    }
  },
  responses: {
    200: { description: 'Login successful' },
    400: { description: 'Validation error' },
    401: { description: 'Unauthorized' }
  }
});

router.post("/login", authLimiter, asyncHandler(login));

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/logout',
  tags: ['Auth'],
  summary: 'Logout a user',
  responses: {
    200: { description: 'Logout successful' }
  }
});

router.post("/logout", asyncHandler(logout));

registry.registerPath({
  method: 'get',
  path: '/api/v1/auth/me',
  tags: ['Auth'],
  summary: 'Get current user profile',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'User profile retrieved' },
    401: { description: 'Unauthorized' }
  }
});

router.get("/me", authMiddleware, asyncHandler(me));

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/refresh',
  tags: ['Auth'],
  summary: 'Refresh access token',
  responses: {
    200: { description: 'Refresh successful' },
    401: { description: 'Unauthorized' }
  }
});

router.post("/refresh", asyncHandler(refresh));

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/verify-email',
  tags: ['Auth'],
  summary: 'Verify user email',
  request: {
    body: {
      content: {
        'application/json': { schema: VerifyEmailSchema }
      }
    }
  },
  responses: {
    200: { description: 'Email verified successfully' },
    400: { description: 'Validation error' },
    401: { description: 'Token invalid or expired' }
  }
});

router.post("/verify-email", asyncHandler(verifyEmail));

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/resend-verification',
  tags: ['Auth'],
  summary: 'Resend verification email',
  request: {
    body: {
      content: {
        'application/json': { schema: ResendVerificationSchema }
      }
    }
  },
  responses: {
    200: { description: 'Verification email resent' },
    400: { description: 'Validation error' },
    409: { description: 'Email already verified' }
  }
});

router.post("/resend-verification", authLimiter, asyncHandler(resendVerificationEmail));

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/send-reset-password',
  tags: ['Auth'],
  summary: 'Send password reset email',
  request: {
    body: {
      content: {
        'application/json': { schema: SendResetPasswordSchema }
      }
    }
  },
  responses: {
    200: { description: 'Password reset email sent (if exists)' },
    400: { description: 'Validation error' }
  }
});

router.post("/send-reset-password", authLimiter, asyncHandler(sendResetPassword));

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/reset-password',
  tags: ['Auth'],
  summary: 'Reset password using token',
  request: {
    body: {
      content: {
        'application/json': { schema: ResetPasswordSchema }
      }
    }
  },
  responses: {
    200: { description: 'Password reset successful' },
    400: { description: 'Validation error' },
    401: { description: 'Token invalid or expired' }
  }
});

router.post("/reset-password", authLimiter, asyncHandler(resetPassword));

export { router };
