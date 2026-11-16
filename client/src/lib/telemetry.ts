import type { PostHog } from "posthog-js";
import { isConnectionConstrained } from "./connection";

let analytics: PostHog | undefined;

export function startTelemetry() {
  const load = async () => {
    try {
      const { default: posthog } = await import("posthog-js");
      posthog.init(
        import.meta.env.VITE_POSTHOG_KEY || "phc_AfKzXHKWFmkPUakcLhYFcpJiNCRTDHtrC7aQ3ju8Gz89",
        {
          api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
          person_profiles: "identified_only",
          capture_pageview: "history_change",
          capture_pageleave: true,
          autocapture: true,
          disable_session_recording: isConnectionConstrained(),
          session_recording: {
            maskAllInputs: false,
            maskInputOptions: { password: true },
          },
        },
      );
      analytics = posthog;
    } catch {
      // Analytics must never interrupt page rendering or navigation.
    }
  };

  if (isConnectionConstrained()) {
    window.setTimeout(load, 5_000);
  } else if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => void load(), { timeout: 3_000 });
  } else {
    setTimeout(load, 1_500);
  }
}

export function getTelemetryIds() {
  return {
    sessionId: analytics?.get_session_id(),
    distinctId: analytics?.get_distinct_id(),
  };
}
