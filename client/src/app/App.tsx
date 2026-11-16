import { RouterProvider } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { prefetchRoute, router } from "./routes";
import { AuthProvider } from "../contexts/AuthContext";
import { Toaster } from "./components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { useEffect, useState } from "react";
import { queryClient } from "../lib/queryClient";
import { startTelemetry } from "../lib/telemetry";

function useRoutePrefetch() {
  useEffect(() => {
    let timer: number;
    const cancel = () => window.clearTimeout(timer);
    const leaveLink = (event: PointerEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (link && event.relatedTarget instanceof Node && link.contains(event.relatedTarget)) return;
      cancel();
    };
    const onIntent = (event: Event) => {
      if (event instanceof PointerEvent && event.pointerType === "touch") return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute("download") || link.target === "_blank") return;
      if (
        event instanceof PointerEvent && event.relatedTarget instanceof Node &&
        link.contains(event.relatedTarget)
      ) return;
      cancel();
      timer = window.setTimeout(() => prefetchRoute(link.href), 120);
    };

    document.addEventListener("pointerover", onIntent);
    document.addEventListener("focusin", onIntent);
    document.addEventListener("pointerout", leaveLink);
    document.addEventListener("focusout", cancel);
    return () => {
      cancel();
      document.removeEventListener("pointerover", onIntent);
      document.removeEventListener("focusin", onIntent);
      document.removeEventListener("pointerout", leaveLink);
      document.removeEventListener("focusout", cancel);
    };
  }, []);
}

export default function App() {
  // Opening a legacy share link puts a credential in the page URL.
  const [isShareLinkVisit] = useState(() => new URLSearchParams(window.location.search).has("share"));
  useRoutePrefetch();
  useEffect(() => {
    if (!isShareLinkVisit) startTelemetry();
  }, [isShareLinkVisit]);

  return (
    <QueryClientProvider client={queryClient}>
      {!isShareLinkVisit && <Analytics />}
      {!isShareLinkVisit && <SpeedInsights />}
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
