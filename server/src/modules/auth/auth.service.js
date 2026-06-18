import authRepository from "./auth.repository.js";
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from "../../core/errors/errors.js";
import { comparePassword, hashPassword } from "../../utils/passwordHelper.js";
import { generateToken, hashToken } from "../../utils/tokenHelper.js";
import { signAccessToken, signRefreshToken } from "../../utils/jwtHelper.js";
import { daysFromNow } from "../../utils/date.js";
import { emailQueue } from "../../core/queue/emailQueue.js";
import auditService from "../audit/audit.service.js";

const authService = {
  /**
   * @param {import("./auth.schemas.js").SignupReq} data
   */
  signup: async (data) => {
    const { email, password, name, phone } = data;

    const user = await authRepository.findUserByIdentifier("email", email);

    if (user) {
      throw new ConflictError("Email already in use");
    }

    const hash = await hashPassword(password);
    const newUser = await authRepository.createUser(email, name, hash, phone);

    const emailVerificationToken = generateToken(32);
    const emailVerificationTokenHash = hashToken(emailVerificationToken);

    await authRepository.createToken(
      newUser.id,
      emailVerificationTokenHash,
      "EMAIL_VERIFICATION",
      daysFromNow(1)
    );

    emailQueue.add("SEND_VERIFICATION_EMAIL", {
      email,
      token: emailVerificationToken,
    });

    await auditService.logEvent({
      userId: newUser.id,
      event: "SIGNUP_SUCCESS",
    });

    return { message: "Account created successfully. Check your email for verification." };
  },

  /**
   * @param {import("./auth.schemas.js").LoginReq} data
   * @param {object} meta - { ipAddress, userAgent }
   */
  login: async (data, meta) => {
    const { email, password } = data;

    const user = await authRepository.findUserByIdentifier("email", email);

    if (!user) {
      await auditService.logEvent({ event: "LOGIN_FAILED", details: { email, reason: "User not found" }, ...meta });
      throw new UnauthorizedError("Invalid email or password");
    }

    const comparison = await comparePassword(user.password, password);

    if (!comparison) {
      await auditService.logEvent({ userId: user.id, event: "LOGIN_FAILED", details: { reason: "Invalid password" }, ...meta });
      throw new UnauthorizedError("Invalid email or password");
    }

    if (!user.emailVerified) {
      await auditService.logEvent({ userId: user.id, event: "LOGIN_FAILED", details: { reason: "Email not verified" }, ...meta });
      throw new UnauthorizedError("Please verify your email first");
    }

    const accessTokenJWT = signAccessToken({ id: user.id, email: user.email });
    
    // Invalidate old refresh tokens for this user on new login? Optional, we'll keep it simple and just create a new one.
    const refreshToken = generateToken(64);
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = daysFromNow(30);

    await authRepository.createToken(
      user.id,
      refreshTokenHash,
      "REFRESH",
      expiresAt
    );

    await auditService.logEvent({ userId: user.id, event: "LOGIN_SUCCESS", ...meta });

    const userObj = { id: user.id, email: user.email, name: user.name, role: user.role };

    return { accessTokenJWT, refreshToken, user: userObj };
  },

  me: async (userId) => {
    const user = await authRepository.findUserByIdentifier("id", userId);
    if (!user) throw new NotFoundError("User not found");

    const userObj = { id: user.id, email: user.email, name: user.name, role: user.role };
    return userObj;
  },

  /**
   * @param {string} refreshToken 
   * @param {object} meta 
   */
  refresh: async (refreshToken, meta) => {
    if (!refreshToken) {
      throw new UnauthorizedError("Missing refresh token");
    }

    const refreshHash = hashToken(refreshToken);

    const tokenRecord = await authRepository.fetchUserFromToken(refreshHash, "REFRESH");

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token invalid or expired");
    }

    const user = tokenRecord.user;

    // Refresh token rotation: delete the old one
    await authRepository.deleteToken(tokenRecord.id);

    const newRefreshToken = generateToken(64);
    const newRefreshHash = hashToken(newRefreshToken);

    await authRepository.createToken(
      user.id,
      newRefreshHash,
      "REFRESH",
      daysFromNow(30)
    );

    await auditService.logEvent({ userId: user.id, event: "TOKEN_REFRESHED", ...meta });

    return {
      accessToken: signAccessToken({
        id: user.id,
        email: user.email,
      }),
      refreshToken: newRefreshToken,
    };
  },

  /**
   * @param {import("./auth.schemas.js").VerifyEmailReq} data 
   * @param {object} meta 
   */
  verifyEmail: async (data, meta) => {
    const { token } = data;
    const tokenHash = hashToken(token);

    const tokenRecord = await authRepository.fetchUserFromToken(tokenHash, "EMAIL_VERIFICATION");

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError("Token invalid or expired");
    }

    await authRepository.findUserByIdentifierAndUpdate("id", tokenRecord.userId, {
      emailVerified: true,
    });

    await authRepository.deleteToken(tokenRecord.id);

    await auditService.logEvent({ userId: tokenRecord.userId, event: "EMAIL_VERIFIED", ...meta });

    const user = tokenRecord.user;
    emailQueue.add("SEND_WELCOME_EMAIL", {
      email: user.email,
      name: user.name,
    });

    return { message: "Email verified successfully" };
  },

  /**
   * @param {import("./auth.schemas.js").ResendVerificationReq} data 
   * @param {object} meta 
   */
  resendVerificationEmail: async (data, meta) => {
    const { email } = data;
    const user = await authRepository.findUserByIdentifier("email", email);

    if (!user) {
      // Don't throw to prevent user enumeration
      return { message: "If an account exists, a verification email has been sent." };
    }

    if (user.emailVerified) {
      throw new ConflictError("Email is already verified");
    }

    // Delete existing verification tokens
    await authRepository.deleteAllTokensForUser(user.id, "EMAIL_VERIFICATION");

    const emailVerificationToken = generateToken(32);
    const emailVerificationTokenHash = hashToken(emailVerificationToken);

    await authRepository.createToken(
      user.id,
      emailVerificationTokenHash,
      "EMAIL_VERIFICATION",
      daysFromNow(1)
    );

    emailQueue.add("SEND_VERIFICATION_EMAIL", {
      email,
      token: emailVerificationToken,
    });

    await auditService.logEvent({ userId: user.id, event: "VERIFICATION_EMAIL_RESENT", ...meta });

    return { message: "If an account exists, a verification email has been sent." };
  },

  logout: async (refreshToken, meta) => {
    if (refreshToken) {
      const refreshHash = hashToken(refreshToken);
      const tokenRecord = await authRepository.fetchUserFromToken(refreshHash, "REFRESH");
      if (tokenRecord) {
        await authRepository.deleteToken(tokenRecord.id);
        await auditService.logEvent({ userId: tokenRecord.userId, event: "LOGOUT_SUCCESS", ...meta });
      }
    }
    return { message: "Logged out successfully" };
  },

  /**
   * @param {import("./auth.schemas.js").SendResetPasswordReq} data 
   * @param {object} meta 
   */
  sendResetPassword: async (data, meta) => {
    const { email } = data;
    const user = await authRepository.findUserByIdentifier("email", email);

    if (!user) {
      // Return success to avoid email enumeration
      return { message: "If that email address is in our database, we will send you an email to reset your password." };
    }

    // Delete existing password reset tokens
    await authRepository.deleteAllTokensForUser(user.id, "PASSWORD_RESET");

    const resetToken = generateToken(32);
    const resetTokenHash = hashToken(resetToken);

    await authRepository.createToken(
      user.id,
      resetTokenHash,
      "PASSWORD_RESET",
      daysFromNow(1) // Token valid for 1 day
    );

    emailQueue.add("SEND_PASSWORD_RESET", {
      email,
      token: resetToken,
    });

    await auditService.logEvent({ userId: user.id, event: "PASSWORD_RESET_REQUESTED", ...meta });

    return { message: "If that email address is in our database, we will send you an email to reset your password." };
  },

  /**
   * @param {import("./auth.schemas.js").ResetPasswordReq} data 
   * @param {object} meta 
   */
  resetPassword: async (data, meta) => {
    const { token, newPassword } = data;
    const tokenHash = hashToken(token);

    const tokenRecord = await authRepository.fetchUserFromToken(tokenHash, "PASSWORD_RESET");

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError("Token is invalid or has expired");
    }

    const hash = await hashPassword(newPassword);

    await authRepository.findUserByIdentifierAndUpdate("id", tokenRecord.userId, {
      password: hash,
    });

    await authRepository.deleteToken(tokenRecord.id);

    // Also invalidate all active refresh tokens for security
    await authRepository.deleteAllTokensForUser(tokenRecord.userId, "REFRESH");

    await auditService.logEvent({ userId: tokenRecord.userId, event: "PASSWORD_RESET_SUCCESS", ...meta });
    
    // Optional: send security alert email that password was changed
    emailQueue.add("SEND_SECURITY_ALERT", {
      email: tokenRecord.user.email,
      event: "Password changed successfully",
    });

    return { message: "Password reset successful" };
  }
};

export default authService;
