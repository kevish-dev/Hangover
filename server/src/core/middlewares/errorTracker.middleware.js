/**
 * Middleware to track, sanitize, and log all 4xx and 5xx client and server errors,
 * including request payloads, query params, headers, and response bodies.
 */

const SENSITIVE_KEYS = new Set([
  "password",
  "currentpassword",
  "newpassword",
  "confirmpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "authorization",
  "cookie",
  "razorpaysignature",
  "razorpay_signature",
  "cardnumber",
  "cvv",
]);

/**
 * Recursively sanitizes objects to redact sensitive credentials before logging.
 */
export function sanitizePayload(data, depth = 0) {
  if (depth > 6 || !data) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item, depth + 1));
  }

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      clean[key] = sanitizePayload(value, depth + 1);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

// In-memory circular buffer for the most recent 100 HTTP errors
const MAX_ERRORS_BUFFER = 100;
export const recentHttpErrors = [];

export function addRecentError(entry) {
  recentHttpErrors.unshift(entry);
  if (recentHttpErrors.length > MAX_ERRORS_BUFFER) {
    recentHttpErrors.pop();
  }
}

export const errorTrackerMiddleware = (req, res, next) => {
  // Do not track metrics or health endpoints
  if (req.path === "/metrics" || req.path === "/health") {
    return next();
  }

  const startTime = Date.now();

  // Intercept response payload
  const originalJson = res.json;
  const originalSend = res.send;
  let responsePayload = null;

  res.json = function (body) {
    responsePayload = body;
    return originalJson.apply(this, arguments);
  };

  res.send = function (body) {
    if (!responsePayload && body) {
      try {
        responsePayload = typeof body === "string" ? JSON.parse(body) : body;
      } catch {
        responsePayload = typeof body === "string" ? body.slice(0, 500) : "[Non-JSON Body]";
      }
    }
    return originalSend.apply(this, arguments);
  };

  res.on("finish", () => {
    const statusCode = res.statusCode;

    // Track all 4xx (Client Errors) and 5xx (Server Errors)
    if (statusCode >= 400) {
      const durationMs = Date.now() - startTime;
      const isServerError = statusCode >= 500;

      const errorRecord = {
        type: isServerError ? "HTTP_5XX_SERVER_ERROR" : "HTTP_4XX_CLIENT_ERROR",
        timestamp: new Date().toISOString(),
        statusCode,
        method: req.method,
        path: req.originalUrl || req.url,
        ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown",
        userId: req.user?.id || req.user?.userId || "anonymous",
        durationMs,
        request: {
          query: sanitizePayload(req.query),
          params: sanitizePayload(req.params),
          body: sanitizePayload(req.body),
        },
        response: sanitizePayload(responsePayload),
        ...(res.locals?.errorStack && { stack: res.locals.errorStack }),
      };

      // Add to in-memory history buffer
      addRecentError(errorRecord);

      // Emit structured JSON log to stdout for Docker and log aggregators
      const logHeader = isServerError
        ? `🔥 [5XX_SERVER_ERROR] ${req.method} ${errorRecord.path} - HTTP ${statusCode} (${durationMs}ms)`
        : `⚠️ [4XX_CLIENT_ERROR] ${req.method} ${errorRecord.path} - HTTP ${statusCode} (${durationMs}ms)`;

      console.error(
        `${logHeader}\n` +
        JSON.stringify(errorRecord, null, 2)
      );
    }
  });

  next();
};
