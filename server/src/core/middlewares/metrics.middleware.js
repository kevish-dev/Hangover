import { httpRequestDurationSeconds, httpRequestsInFlight, httpRequestsTotal } from "../metrics/metrics.js";

export const markMetricsRoutePrefix = (prefix) => (_req, res, next) => {
  res.locals.metricsRoutePrefix = prefix;
  next();
};

export const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();
  const isApiRequest = /^\/api\/v1(?:\/|$)/i.test(req.path);

  httpRequestsInFlight.inc();
  res.once("close", () => httpRequestsInFlight.dec());
  res.once("finish", () => {
    const prefix = res.locals.metricsRoutePrefix ?? "";
    const routePath = req.route?.path;
    let route;
    if (typeof routePath === "string" && (!isApiRequest || prefix)) {
      route = prefix && routePath === "/" ? prefix : `${prefix}${routePath}`;
    } else {
      route = `${prefix || (isApiRequest ? "/api/v1" : "")}/<unmatched>`;
    }

    const labels = { method: req.method, route, status_code: String(res.statusCode) };
    httpRequestDurationSeconds.observe(labels, Number(process.hrtime.bigint() - start) / 1e9);
    httpRequestsTotal.inc(labels);
  });

  next();
};
