import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3000"),
  ORIGIN: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().url(),

  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform(Number),
  SMTP_SECURE: z.string().transform((val) => val === "true"),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  SMTP_FROM: z.string(),

  ACCESS_SECRET: z.string().min(10),
  ACCESS_EXPIRY: z.string().default("15m"),
  REFRESH_SECRET: z.string().min(10),
  REFRESH_EXPIRY: z.string().default("30d"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

const env = parsed.data;

export default env;
