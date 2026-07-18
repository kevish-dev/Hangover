import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { useRouteError } from "react-router";
import { toast } from "sonner";
import { getErrorMessage } from "../../lib/errors";

export function RouteErrorBoundary() {
  const error = useRouteError();
  const message = getErrorMessage(error, "This page could not be loaded.");

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
          <button type="button" onClick={() => window.location.assign("/")} className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700">
            Go home
          </button>
        </div>
      </div>
    </main>
  );
}

