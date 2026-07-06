import axios from "axios";
import env from "../../core/env/env.js";
import * as authRepo from "./auth.repository.js";
import { generateTokens, verifyRefreshToken } from "../../utils/jwt.util.js";
import sendMail from "../../utils/sendMail.js";

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

      const subject = "Welcome to Hangover!";
      const text = `Hi ${fullName},\n\nWelcome to Hangover Trails! Your next great story starts here.\n\nWe are thrilled to have you join our community of explorers, wanderers, and adventure-seekers.\n\nSee you out there,\nThe Hangover Trails Team`;
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 0; background-color: #0f0d0b;">
  <div style="background-color: #0f0d0b; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #15120f; border: 1px solid rgba(184,148,58,0.2); border-radius: 12px; overflow: hidden;">
      
      <!-- Header -->
      <div style="background: #110e0c; padding: 40px 20px; text-align: center; border-bottom: 1px solid rgba(184,148,58,0.1);">
        <h2 style="margin: 0; color: #b8943a; font-size: 22px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase;">Hangover Trails</h2>
      </div>
      
      <!-- Content -->
      <div style="padding: 40px 30px;">
        <h1 style="color: #f2ede4; font-size: 24px; font-weight: 300; margin-top: 0; margin-bottom: 24px;">Welcome, <span style="color: #b8943a; font-style: italic;">${fullName}</span>.</h1>
        
        <p style="color: rgba(242,237,228,0.8); font-size: 16px; line-height: 1.8; margin-bottom: 24px; margin-top: 0;">
          Your next great story starts here. We are thrilled to have you join our community of explorers, wanderers, and adventure-seekers.
        </p>
        
        <p style="color: rgba(242,237,228,0.8); font-size: 16px; line-height: 1.8; margin-bottom: 32px; margin-top: 0;">
          Whether you're looking for a peaceful escape into the mountains or an adrenaline-filled journey, Hangover Trails is here to craft unforgettable experiences for you.
        </p>
        
        <div style="text-align: center; margin-bottom: 40px;">
          <a href="https://hangovertrails.com" style="background-color: #b8943a; color: #111; padding: 14px 32px; text-decoration: none; font-weight: 600; font-size: 14px; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 4px; display: inline-block;">Start Exploring</a>
        </div>
        
        <p style="color: rgba(242,237,228,0.6); font-size: 15px; line-height: 1.6; margin-bottom: 0;">
          See you out there,<br>
          <strong style="color: #b8943a; font-weight: 500;">The Hangover Trails Team</strong>
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #0b0908; padding: 30px; text-align: center; border-top: 1px solid rgba(184,148,58,0.1);">
        <p style="color: rgba(242,237,228,0.3); font-size: 12px; margin: 0 0 8px 0; letter-spacing: 0.05em;">
          © ${new Date().getFullYear()} Hangover Trails. All rights reserved.
        </p>
        <p style="color: rgba(242,237,228,0.3); font-size: 12px; margin: 0;">
          Dawn Tours and Travels, Papu-1, Naharlagun, Arunachal Pradesh
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;
      console.log("=====sending");
      sendMail(email, subject, text, html).catch(console.error);
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
