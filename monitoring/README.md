# Production monitoring

Grafana provisions [Hangover Production Observability & Availability](grafana/dashboards/hangover-overview.json) from this directory. Backend Deploy uploads the monitoring configuration and reconciles the Compose stack. Changes to the scrape, probe, or Grafana provisioning settings change the configuration revision so the affected services reread their settings.

## Reading the dashboard

- **Availability** shows internal and public health separately. The catalog checks also exercise the public CRM list and featured endpoints. An exporter scrape marked Up means Prometheus reached the exporter. The individual probe results show whether the endpoints passed.
- **API performance** shows application request counts, 4xx and 5xx responses, and latency for successful responses. Compare the slowest routes with the busiest routes to prioritize improvements. Widen the dashboard range when a route has fewer than 20 successful responses.
- **Database and runtime** show Prisma query latency, connection pool usage and waiters, HTTP concurrency, event-loop delay, and process CPU and memory. Compare these panels for the same time window when API latency rises.
- **Resources** shows host CPU, RAM, and root disk use plus backend and Postgres container metrics. The container-label panel should show **2**. If cAdvisor is Up but coverage is lower, inspect the cAdvisor logs for Docker discovery errors and check the container names and Compose project labels.
- **Checkout** shows booking, payment verification, and webhook response counts. Use these for errors and traffic trends. Retries and duplicate webhook deliveries can appear in these counts.

The dashboard measures backend and probe timing. Browser rendering and responsiveness are measured by the frontend's existing Speed Insights integration.
