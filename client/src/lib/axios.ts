import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { getTelemetryIds } from "./telemetry";

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

type SessionRequest = InternalAxiosRequestConfig & {
  sessionVersion?: number;
  retriedAfterRefresh?: boolean;
};

let sessionVersion = 0;
let refreshRequest: Promise<void> | undefined;

apiClient.interceptors.request.use((config: SessionRequest) => {
  config.sessionVersion = sessionVersion;
  const isRead = config.method === "get" || config.method === "head";
  if (isRead) {
    config.timeout ||= 15_000;
    return config;
  }

  // Keep correlation for writes. Adding custom headers to reads makes the
  // browser wait for a CORS preflight before it can fetch page data.
  try {
    const { sessionId, distinctId } = getTelemetryIds();
    if (sessionId) config.headers.set("X-PostHog-Session-Id", sessionId);
    if (distinctId) config.headers.set("X-PostHog-Distinct-Id", distinctId);
  } catch {
    // The request can proceed without telemetry.
  }
  return config;
});

apiClient.interceptors.response.use(undefined, async (error) => {
  const request: SessionRequest | undefined = error.config;
  if (
    error.response?.status !== 401 || !request || request.signal?.aborted ||
    request.retriedAfterRefresh || error.response.data?.code === "NO_SESSION"
  ) {
    throw error;
  }

  request.retriedAfterRefresh = true;
  if (request.sessionVersion === sessionVersion) {
    refreshRequest ??= axios.post(
      `${API_URL}/auth/refresh`, {},
      { withCredentials: true, timeout: 12_000 },
    ).then(() => {
      sessionVersion += 1;
    }).finally(() => {
      refreshRequest = undefined;
    });
    await refreshRequest;
  }

  return apiClient(request);
});
