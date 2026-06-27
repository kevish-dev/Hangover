import { sendSuccess } from "../../core/responses/responseFormat.js";
import authService from "./auth.service.js";
import { SignupSchema, LoginSchema, VerifyEmailSchema, ResendVerificationSchema, SendResetPasswordSchema, ResetPasswordSchema } from "./auth.schemas.js";
import env from "../../core/env/env.js";

const getMeta = (req) => ({
  ipAddress: req.ip,
  userAgent: req.headers["user-agent"],
});

const setCookies = (res, accessToken, refreshToken) => {
  res.cookie("access", accessToken, {
    httpOnly: true,
    secure: env.PORT ? false : true, // false for local, ideally use process.env.NODE_ENV
    sameSite: "lax",
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refresh", refreshToken, {
    httpOnly: true,
    secure: env.PORT ? false : true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

const clearCookies = (res) => {
  res.clearCookie("access");
  res.clearCookie("refresh");
};

export const signup = async (req, res) => {
  const data = SignupSchema.parse(req.body);
  const result = await authService.signup(data);
  return sendSuccess(res, null, result.message, 201);
};

export const login = async (req, res) => {
  const data = LoginSchema.parse(req.body);
  const { accessTokenJWT, refreshToken, user } = await authService.login(data, getMeta(req));

  setCookies(res, accessTokenJWT, refreshToken);

  return sendSuccess(res, user, "Login successful");
};

export const logout = async (req, res) => {
  const refreshToken = req.cookies.refresh;
  const result = await authService.logout(refreshToken, getMeta(req));
  clearCookies(res);
  return sendSuccess(res, null, result.message);
};

export const me = async (req, res) => {
  const user = await authService.me(req.user.id);
  return sendSuccess(res, user);
};

export const refresh = async (req, res) => {
  const existingRefreshToken = req.cookies.refresh || req.body.refreshToken;
  
  const { accessToken, refreshToken } = await authService.refresh(
    existingRefreshToken,
    getMeta(req)
  );

  setCookies(res, accessToken, refreshToken);

  return sendSuccess(res, null, "Refresh successful");
};

export const verifyEmail = async (req, res) => {
  const data = VerifyEmailSchema.parse(req.body);
  const result = await authService.verifyEmail(data, getMeta(req));
  return sendSuccess(res, null, result.message);
};

export const resendVerificationEmail = async (req, res) => {
  const data = ResendVerificationSchema.parse(req.body);
  const result = await authService.resendVerificationEmail(data, getMeta(req));
  return sendSuccess(res, null, result.message);
};

export const sendResetPassword = async (req, res) => {
  const data = SendResetPasswordSchema.parse(req.body);
  const result = await authService.sendResetPassword(data, getMeta(req));
  return sendSuccess(res, null, result.message);
};

export const resetPassword = async (req, res) => {
  const data = ResetPasswordSchema.parse(req.body);
  const result = await authService.resetPassword(data, getMeta(req));
  return sendSuccess(res, null, result.message);
};
