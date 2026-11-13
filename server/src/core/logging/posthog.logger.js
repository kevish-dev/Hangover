import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { LoggerProvider, BatchLogRecordProcessor, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { SeverityNumber } from "@opentelemetry/api-logs";

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY || "phc_AfKzXHKWFmkPUakcLhYFcpJiNCRTDHtrC7aQ3ju8Gz89";
const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://us.i.posthog.com";

let _logger = null;
let _provider = null;

export function initPostHogLogger() {
  if (_logger) return _logger;

  try {
    const exporter = new OTLPLogExporter({
      url: `${POSTHOG_HOST}/i/v1/logs`,
      headers: {
        Authorization: `Bearer ${POSTHOG_API_KEY}`,
      },
    });

    _provider = new LoggerProvider({
      resource: resourceFromAttributes({
        "service.name": "hangover-backend",
        "service.version": "1.0.0",
        "deployment.environment": process.env.NODE_ENV || "production",
      }),
      processors: [
        // Use Batch processor in production or Simple processor in development
        process.env.NODE_ENV === "production"
          ? new BatchLogRecordProcessor(exporter, {
              maxExportBatchSize: 50,
              scheduledDelayMillis: 2000,
            })
          : new SimpleLogRecordProcessor(exporter),
      ],
    });

    _logger = _provider.getLogger("hangover-backend");
    return _logger;
  } catch (error) {
    console.error("Failed to initialize PostHog OpenTelemetry Logger:", error);
    return null;
  }
}

/**
 * Emits a structured log to PostHog with full user and session tagging.
 *
 * @param {Object} options
 * @param {number} options.severity - SeverityNumber (e.g. SeverityNumber.ERROR, SeverityNumber.WARN, SeverityNumber.INFO)
 * @param {string} options.severityText - "ERROR" | "WARN" | "INFO"
 * @param {string} options.body - Descriptive log message
 * @param {Object} options.attributes - Structured contextual attributes/tags
 */
export function emitPostHogLog({ severity, severityText, body, attributes = {} }) {
  try {
    const logger = _logger || initPostHogLogger();
    if (!logger) return;

    // Filter out undefined/null values from attributes to ensure clean OTel transmission
    const sanitizedAttributes = {};
    for (const [k, v] of Object.entries(attributes)) {
      if (v !== undefined && v !== null) {
        // OTel attributes support string, number, boolean
        sanitizedAttributes[k] = typeof v === "object" ? JSON.stringify(v) : v;
      }
    }

    logger.emit({
      severityNumber: severity || SeverityNumber.INFO,
      severityText: severityText || "INFO",
      body: String(body),
      attributes: sanitizedAttributes,
    });
  } catch (err) {
    // Non-blocking catch to ensure logging never interrupts application flow
    console.error("Failed to emit log to PostHog:", err);
  }
}

// Auto-initialize on module load
initPostHogLogger();

export { SeverityNumber };
