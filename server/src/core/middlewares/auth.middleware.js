import { verifyAccessToken } from "../../utils/jwt.util.js";
import { prisma } from "../../prisma/client.js";

export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({ message: "Authentication required. Access token missing." });
    }

    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({ message: "Invalid or expired access token." });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        googleId: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "User account is disabled." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    res.status(500).json({ message: "Internal server error during authentication." });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden. Admin access required." });
  }

  next();
};
