import { Outlet, useLocation } from "react-router";
import { Navbar } from "./components/navbar";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wrench } from "lucide-react";
import { siteSettingsQuery } from "../lib/siteSettingsQuery";

export default function Root() {
  const location = useLocation();
  const maintenance = useQuery({
    ...siteSettingsQuery,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    const timeout = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
    return () => clearTimeout(timeout);
  }, [location.pathname]);

  return (
    <>
      <Navbar />
      {maintenance.data?.maintenanceMode && (
        <div className="fixed inset-x-0 top-[72px] z-[90] mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-950 shadow-sm">
          <Wrench className="h-4 w-4 shrink-0" />
          Maintenance in progress — browsing is available, but bookings and other actions are temporarily unavailable.
        </div>
      )}
      <Outlet />
    </>
  );
}
