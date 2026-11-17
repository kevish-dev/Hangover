import { Outlet, ScrollRestoration, useNavigation } from "react-router";
import { useSyncExternalStore } from "react";
import { RouteSeo } from "./route-seo";

function subscribeToConnection(notify: () => void) {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
}

function NavigationStatus({ initial = false }: { initial?: boolean }) {
  const navigation = useNavigation();
  const online = useSyncExternalStore(subscribeToConnection, () => navigator.onLine);
  const pending = initial || navigation.state !== "idle";

  if (!online) {
    return (
      <div role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-[120] mx-auto w-fit max-w-[calc(100%-2rem)] rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow">
        Connection lost. Reconnect to load new content.
      </div>
    );
  }
  if (!pending) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-1 overflow-hidden bg-[#781216]/20"
    >
      <span className="sr-only">Loading page…</span>
      <span aria-hidden="true" className="block h-full w-2/3 bg-[#781216] motion-safe:animate-pulse" />
    </div>
  );
}

export function InitialPageLoading() {
  return (
    <main className="grid min-h-svh place-items-center bg-[#f5f0e6] text-[#781216]">
      <NavigationStatus initial />
      <p>Loading page…</p>
    </main>
  );
}

export function NavigationLayout() {
  return (
    <>
      <RouteSeo />
      <NavigationStatus />
      <Outlet />
      <ScrollRestoration />
    </>
  );
}
