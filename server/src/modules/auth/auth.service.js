import axios from "axios";
import env from "../../core/env/env.js";
import * as authRepo from "./auth.repository.js";
import { generateTokens, verifyRefreshToken } from "../../utils/jwt.util.js";
import { sendWelcomeEmail } from "../../core/services/email.service.js";

export const googleLogin = async (code) => {
  // Exchange code for Google tokens
  const tokenResponse = await axios.post(
    "https://oauth2.googleapis.com/token",
    null,
    {
      params: {
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      },
    },
  );

  const googleAccessToken = tokenResponse.data.access_token;

  // Fetch user profile from Google
  const userInfoResponse = await axios.get(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    },
  );

  const { id: googleId, email, name: fullName } = userInfoResponse.data;

  if (!email || !googleId) {
    throw new Error("Failed to retrieve user email or Google ID from Google.");
  }

  // Find or create user
  let user = await authRepo.findUserByGoogleId(googleId);

  if (!user) {
    user = await authRepo.findUserByEmail(email);

    if (user) {
      // If user exists with email but no googleId (unlikely unless another login method was used), we would link them.
      // But for this project, let's just throw or link. Linking is safer.
      throw new Error("Email already registered with a different provider.");
    } else {
      // Create new user
      user = await authRepo.createUser({ email, googleId, fullName });
      sendWelcomeEmail({ to: email, name: fullName }).catch((error) => {
        console.error("[Email] Failed to send welcome email:", error);
      });
    }
  }

  if (!user.isActive) {
    throw new Error("User account is disabled.");
  }

  await authRepo.updateLastLogin(user.id);

  // Generate JWTs
  const tokens = generateTokens(user);

  return { user, tokens };
};

export const refreshToken = async (token) => {
  if (!token) {
    throw new Error("Refresh token required.");
  }

  const decoded = verifyRefreshToken(token);
  if (!decoded) {
    throw new Error("Invalid or expired refresh token.");
  }

  // Optionally verify user still exists and is active
  const user = await authRepo.updateLastLogin(decoded.userId);
  if (!user || !user.isActive) {
    throw new Error("User account is invalid or disabled.");
  }

  // Generate new tokens
  const tokens = generateTokens(user);

  return { user, tokens };
};
