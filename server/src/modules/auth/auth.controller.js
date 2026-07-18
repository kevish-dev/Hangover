import * as authService from "./auth.service.js";
import { setTokenCookies } from "../../utils/cookie.util.js";
import env from "../../core/env/env.js";

export const googleAuthRedirect = (req, res) => {
  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const options = {
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    client_id: env.GOOGLE_CLIENT_ID,
    access_type: "offline",
    response_type: "code",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
  };

  const qs = new URLSearchParams(options);
  res.redirect(`${rootUrl}?${qs.toString()}`);
};

export const googleAuthCallback = async (req, res, next) => {
  try {
    const code = req.query.code || req.body.code;

    if (!code) {
      return res
        .status(400)
        .json({ message: "Authorization code is required." });
    }

    const { user, tokens } = await authService.googleLogin(code);

    setTokenCookies(res, tokens);

    res.redirect(`${env.ORIGIN}`);
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.cookies;

    if (!token) {
      return res.status(401).json({ message: "Refresh token is missing." });
    }

    const { user, tokens } = await authService.refreshToken(token);

    setTokenCookies(res, tokens);

    res.status(200).json({ message: "Tokens refreshed successfully", user });
  } catch (error) {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({ user: req.user });
  } catch (error) {
    next(error);
  }
};
