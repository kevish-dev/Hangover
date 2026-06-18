import jwt from "jsonwebtoken";
import env from "../core/env/env.js";

const signAccessToken = (sub) => {
  return jwt.sign(sub, env.ACCESS_SECRET, { expiresIn: env.ACCESS_EXPIRY });
};

const signRefreshToken = (sub) => {
  return jwt.sign(sub, env.REFRESH_SECRET, { expiresIn: env.REFRESH_EXPIRY });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, env.ACCESS_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.REFRESH_SECRET);
};

export {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
