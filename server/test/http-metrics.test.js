import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import { markMetricsRoutePrefix, metricsMiddleware } from "../src/core/middlewares/metrics.middleware.js";
import { register } from "../src/core/metrics/metrics.js";

test("HTTP metrics use full templates for nested routes and errors and group unmatched URLs", async () => {
  const app = express();
  const festivals = express.Router();
  const faqs = express.Router();
  app.use(metricsMiddleware);
  festivals.get("/", (_req, res) => res.sendStatus(200));
  faqs.get("/:id", async (req, res) => {
    if (req.params.id === "error") throw new Error("test failure");
    res.sendStatus(200);
  });
  festivals.use("/:festivalId/faqs", markMetricsRoutePrefix("/api/v1/festivals/:festivalId/faqs"), faqs);
  app.use("/api/v1/festivals", markMetricsRoutePrefix("/api/v1/festivals"), festivals);
  app.use((_error, _req, res, _next) => res.sendStatus(500));

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const requests = [
      ["/api/v1/festivals", 200],
      ["/api/v1/festivals/private-slug/faqs/first?share=private-token", 200],
      ["/api/v1/festivals/other-slug/faqs/second", 200],
      ["/api/v1/festivals/other-slug/faqs/error", 500],
      ["/api/v1/unknown-path", 404],
      ["/api/v1/another-path", 404],
    ];
    for (const [path, status] of requests) {
      const response = await fetch(base + path);
      assert.equal(response.status, status);
      await response.arrayBuffer();
    }

    const metrics = await register.metrics();
    assert.match(metrics, /http_requests_total\{method="GET",route="\/api\/v1\/festivals",status_code="200"\} 1/);
    assert.match(metrics, /http_requests_total\{method="GET",route="\/api\/v1\/festivals\/:festivalId\/faqs\/:id",status_code="200"\} 2/);
    assert.match(metrics, /http_requests_total\{method="GET",route="\/api\/v1\/festivals\/:festivalId\/faqs\/:id",status_code="500"\} 1/);
    assert.match(metrics, /http_requests_total\{method="GET",route="\/api\/v1\/<unmatched>",status_code="404"\} 2/);
    assert.match(metrics, /^http_requests_in_flight 0$/m);
    assert.doesNotMatch(metrics, /private-slug|other-slug|private-token|unknown-path|another-path/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
