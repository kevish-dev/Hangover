import env from "../core/env/env.js";

const isProd = process.env.NODE_ENV === "production";

export const parseExpToMs = (expStr) => {
  const match = expStr.match(/^(\d+)([mhd])$/);
  if (!match) return parseInt(expStr, 10);

  const val = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "m":
      return val * 60 * 1000;
    case "h":
      return val * 60 * 60 * 1000;
    case "d":
      return val * 24 * 60 * 60 * 1000;
    default:
      return val;
  }
};

export const setTokenCookies = (res, tokens) => {
  res.cookie("accessToken", tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: parseExpToMs(env.ACCESS_EXPIRY),
  });

  res.cookie("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: parseExpToMs(env.REFRESH_EXPIRY),
  });
};
