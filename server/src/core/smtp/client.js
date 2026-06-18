import { createTransport } from "nodemailer";
import env from "../env/env.js";

const transport = createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

try {
  await transport.verify();
  console.log("SMTP server is ready to take our messages");
} catch (err) {
  console.error("Verification failed:", err);
}

export default transport;
