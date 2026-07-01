import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string(),
  ORIGIN: z.string().url(),
  DATABASE_URL: z.string().url(),

  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform(Number),
  SMTP_SECURE: z.string().transform((val) => val === "true"),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  SMTP_FROM: z.string(),

  ACCESS_SECRET: z.string().min(10),
  ACCESS_EXPIRY: z.string(),
  REFRESH_SECRET: z.string().min(10),
  REFRESH_EXPIRY: z.string(),

  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URI: z.string().url(),

  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_URL: z.string().url().optional(),

  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

const env = parsed.data;

export default env;
