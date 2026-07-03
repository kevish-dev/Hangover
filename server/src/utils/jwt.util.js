import jwt from "jsonwebtoken";
import env from "../core/env/env.js";

export const generateTokens = (user) => {
  const payload = {
    userId: user.id,
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    googleId: user.googleId
  };

  const accessToken = jwt.sign(
    payload,
    env.ACCESS_SECRET,
    { expiresIn: env.ACCESS_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
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
