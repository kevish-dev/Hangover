import client from "prom-client";

// Create custom Prometheus registry
const register = new client.Registry();

// Enable collection of default Node.js runtime metrics (event loop lag, memory/heap, GC, CPU)
client.collectDefaultMetrics({
  register,
  prefix: "nodejs_",
});

// ---------------------------------------------------------------------------
// HTTP Performance Metrics
// ---------------------------------------------------------------------------

export const httpRequestDurationSeconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests processed",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

// ---------------------------------------------------------------------------
// Business & Domain Metrics
// ---------------------------------------------------------------------------

export const bookingsTotal = new client.Counter({
  name: "hangover_bookings_total",
  help: "Total number of bookings created or updated by status",
  labelNames: ["status"],
  registers: [register],
});

export const paymentsTotal = new client.Counter({
  name: "hangover_payments_total",
  help: "Total payments recorded by status",
  labelNames: ["status"],
  registers: [register],
});

export const razorpayWebhooksTotal = new client.Counter({
  name: "hangover_razorpay_webhooks_total",
  help: "Total Razorpay webhooks processed by event and status",
  labelNames: ["event", "status"],
  registers: [register],
});

export const maintenanceModeGauge = new client.Gauge({
  name: "hangover_maintenance_mode_active",
  help: "Indicates whether customer write maintenance mode is currently active (1 = active, 0 = inactive)",
  registers: [register],
});

export const operationsTasksTotal = new client.Counter({
  name: "hangover_operations_tasks_total",
  help: "Total operational tasks scanned or notified",
  labelNames: ["category", "status"],
  registers: [register],
});

export { register };
