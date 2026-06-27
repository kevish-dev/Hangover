import { emailQueue } from "../emailQueue.js";
import sendMail from "../../../utils/sendMail.js";
import env from "../../env/env.js";

// Ensure this file is imported somewhere so the worker starts processing
export const startEmailWorker = () => {
  emailQueue.process(async (job) => {
    const { name, data } = job;

    switch (name) {
      case "SEND_VERIFICATION_EMAIL": {
        const { email, token } = data;
        const verificationUrl = `${env.ORIGIN}/verify-email?token=${token}`;
        
        await sendMail(
          email,
          "Verify your email",
          `Please verify your email by clicking the following link: ${verificationUrl}\nOr use token: ${token}`
        );
        console.log(`[Worker] Sent verification email to ${email}`);
        break;
      }
      case "SEND_PASSWORD_RESET": {
        const { email, token } = data;
        const resetUrl = `${env.ORIGIN}/reset-password?token=${token}`;
        
        await sendMail(
          email,
          "Reset your password",
          `Please reset your password by clicking the following link: ${resetUrl}\nOr use token: ${token}`
        );
        console.log(`[Worker] Sent password reset email to ${email}`);
        break;
      }
      case "SEND_WELCOME_EMAIL": {
        const { email, name } = data;
        await sendMail(
          email,
          "Welcome to our platform!",
          `Hi ${name},\n\nWelcome aboard! We are thrilled to have you.`
        );
        console.log(`[Worker] Sent welcome email to ${email}`);
        break;
      }
      case "SEND_SECURITY_ALERT": {
        const { email, event } = data;
        await sendMail(
          email,
          "Security Alert on your account",
          `We detected a security event on your account: ${event}`
        );
        console.log(`[Worker] Sent security alert email to ${email}`);
        break;
      }
      default:
        console.warn(`[Worker] Unknown job type: ${name}`);
    }
  });
};
