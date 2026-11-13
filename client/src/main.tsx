
import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import App from "./app/App.tsx";
import "./styles/index.css";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || "phc_AfKzXHKWFmkPUakcLhYFcpJiNCRTDHtrC7aQ3ju8Gz89";
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

if (typeof window !== "undefined" && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: {
        password: true,
      },
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);
  