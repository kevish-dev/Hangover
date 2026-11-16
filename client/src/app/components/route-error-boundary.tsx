import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Link, useRouteError } from "react-router";
import { toast } from "sonner";
import { getErrorMessage } from "../../lib/errors";

async function reloadUpdatedApp(signal: AbortSignal) {
  try {
    const entry = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]')?.src;
    if (!entry || !navigator.onLine || sessionStorage.getItem("reload-for-build") === entry) return;

    const response = await fetch(window.location.href, { cache: "no-store", signal });
    if (!response.ok) return;
    const html = new DOMParser().parseFromString(await response.text(), "text/html");
    const nextEntry = html.querySelector('script[type="module"][src*="/assets/"]')?.getAttribute("src");
    if (signal.aborted || !nextEntry || new URL(nextEntry, response.url).href === entry) return;

    sessionStorage.setItem("reload-for-build", entry);
    window.location.reload();
  } catch {
    // The retry button remains available if the connection is unavailable.
  }
}

export function RouteErrorBoundary() {
  const error = useRouteError();
  const rawMessage = getErrorMessage(error, "This page could not be loaded.");
  const chunkFailed = /dynamically imported module|importing a module script|loading chunk|unable to preload css/i.test(rawMessage);
  const message = chunkFailed ? "Check your connection and retry this page." : rawMessage;
  useEffect(() => {
    if (!chunkFailed) return;
    const controller = new AbortController();
    void reloadUpdatedApp(controller.signal);
    return () => controller.abort();
  }, [chunkFailed]);

  useEffect(() => {
    toast.error("Page unavailable", { id: "route-error", description: message });
  }, [message]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f0e6] p-6">
      <div role="alert" className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-600" />
        <h1 className="mt-4 text-xl font-bold text-gray-950">This page could not be loaded</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-lg bg-[#781216] px-4 py-2.5 text-sm font-semibold text-white">
            <RefreshCcw className="h-4 w-4" /> Retry page
          </button>
          <Link to="/" className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700">
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}

