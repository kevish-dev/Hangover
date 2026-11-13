import { httpRequestDurationSeconds, httpRequestsTotal } from "../metrics/metrics.js";

/**
 * Normalizes URL paths by replacing UUIDs, numeric IDs, or hashes with `:id`
 * to avoid high cardinality in Prometheus label sets.
 */
function normalizePath(originalUrl) {
  if (!originalUrl) return "unknown";

  // Strip query string
  const path = originalUrl.split("?")[0];

  return path
    // Replace UUIDs
    .replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, ":id")
    // Replace alphanumeric IDs of length 16+ (e.g. nanoid, CUID, mongo ObjectId)
    .replace(/\b[0-9a-zA-Z]{16,}\b/g, ":id")
    // Replace standalone numeric IDs
    .replace(/\/\d+(?=\/|$)/g, "/:id");
}

export const metricsMiddleware = (req, res, next) => {
  // Do not record the /metrics endpoint itself to prevent skewing stats
  if (req.path === "/metrics") {
    return next();
  }

  const start = process.hrtime();

  res.on("finish", () => {
    const diff = process.hrtime(start);
    const durationInSeconds = diff[0] + diff[1] / 1e9;

    // Use req.route.path if available, otherwise normalize the URL path
    const route = req.route && req.route.path
      ? (req.baseUrl ? `${req.baseUrl}${req.route.path}` : req.route.path)
      : normalizePath(req.originalUrl || req.url);

    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
    };

    httpRequestDurationSeconds.observe(labels, durationInSeconds);
    httpRequestsTotal.inc(labels);
  });

  next();
};
