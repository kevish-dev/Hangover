import { verifyAccessToken } from "../../utils/jwtHelper.js";
import { UnauthorizedError } from "../../core/errors/errors.js";
import authRepository from "./auth.repository.js";

export const authMiddleware = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.access) {
      token = req.cookies.access;
    }

    if (!token) {
      throw new UnauthorizedError("You are not logged in");
    }

    const decoded = verifyAccessToken(token);

    const user = await authRepository.findUserByIdentifier("id", decoded.id);

    if (!user) {
      throw new UnauthorizedError("The user belonging to this token no longer exists");
    }

    if (!user.emailVerified) {
      throw new UnauthorizedError("Please verify your email to access this resource");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
