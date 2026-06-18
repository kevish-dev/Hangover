import { z } from "zod";
import { registry } from "../../core/docs/openApi.js";

// -- Schemas --

export const SignupSchema = registry.register("SignupSchema", z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
}));

export const LoginSchema = registry.register("LoginSchema", z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
}));

export const VerifyEmailSchema = registry.register("VerifyEmailSchema", z.object({
  token: z.string().min(1, "Token is required"),
}));

export const ResendVerificationSchema = registry.register("ResendVerificationSchema", z.object({
  email: z.string().email(),
}));

// -- Types --

/** @typedef {z.infer<typeof SignupSchema>} SignupReq */
/** @typedef {z.infer<typeof LoginSchema>} LoginReq */
/** @typedef {z.infer<typeof VerifyEmailSchema>} VerifyEmailReq */
/** @typedef {z.infer<typeof ResendVerificationSchema>} ResendVerificationReq */
