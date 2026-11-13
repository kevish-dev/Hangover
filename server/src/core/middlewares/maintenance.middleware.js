import { prisma } from "../../prisma/client.js";
import { maintenanceModeGauge } from "../metrics/metrics.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const EXEMPT_PATHS = new Set([
  "/auth/refresh",
  "/auth/logout",
  "/payments/webhook",
]);

/**
 * Leaves the public catalogue readable while maintenance mode is on, but blocks
 * every customer write. This is intentionally enforced before feature routes so
 * new user-facing mutations are protected automatically. Admin requests bypass
 * the restriction and continue to use the normal admin flow.
 */
export const blockCustomerWritesDuringMaintenance = async (req, res, next) => {
  if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path) || req.path.startsWith("/auth/")) {
    return next();
  }

  if (req.user?.role === "ADMIN") {
    return next();
  }

  try {
    const settings = await prisma.siteSetting.findUnique({
      where: { id: "default" },
      select: { maintenanceMode: true },
    });

    const isMaintenance = Boolean(settings?.maintenanceMode);
    maintenanceModeGauge.set(isMaintenance ? 1 : 0);

    if (isMaintenance) {
      return res.status(503).json({
        success: false,
        code: "MAINTENANCE_MODE",
        message: "Maintenance is in progress. You can browse available information, but bookings and other actions are temporarily unavailable.",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
