import jwt from "jsonwebtoken";
import env from "../core/env/env.js";

export const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    env.ACCESS_SECRET,
    { expiresIn: env.ACCESS_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { userId },
    env.REFRESH_SECRET,
    { expiresIn: env.REFRESH_EXPIRY }
  );

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, env.ACCESS_SECRET);
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, env.REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};
