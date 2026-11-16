import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { AlertTriangle, ArrowRight, BookOpen, CalendarCheck, CheckCircle2, ClipboardCheck, Loader2, Map, MapPin, RefreshCcw, Wrench } from "lucide-react";
import { apiClient } from "../../../lib/axios";
import { toast } from "sonner";
import { siteSettingsQuery } from "../../../lib/siteSettingsQuery";
import { getErrorMessage } from "../../../lib/errors";

const steps = [
  { number: "01", title: "Manage itinerary trips", detail: "Create and update curated CRM itinerary trips.", href: "/dashboard/crm-trips", icon: MapPin },
  { number: "02", title: "Take bookings", detail: "Manage customer reservations, group allocations, and payments.", href: "/dashboard/bookings", icon: CalendarCheck },
  { number: "03", title: "Run operations", detail: "Coordinate logistics, ground services, and real-time support.", href: "/dashboard/operations", icon: ClipboardCheck },
  { number: "04", title: "Reconcile the ledger", detail: "Finalize financial records, agency commissions, and vendor payouts.", href: "/dashboard/ledger", icon: BookOpen },
];

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const overview = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async ({ signal }) => (await apiClient.get<{
      tripCount: number;
      activeBookingCount: number;
      openTaskCount: number;
    }>("/analytics/overview", { signal })).data,
  });
  const maintenance = useQuery(siteSettingsQuery);
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  const toggleMaintenance = async () => {
    if (!maintenance.data || savingMaintenance) return;
    const enabled = !maintenance.data.maintenanceMode;
    setSavingMaintenance(true);
    try {
      const { data } = await apiClient.put<{ data: { maintenanceMode: boolean } }>(
        "/site-settings/maintenance", { maintenanceMode: enabled },
      );
      queryClient.setQueryData(siteSettingsQuery.queryKey, data.data);
      toast.success(enabled ? "Maintenance mode is on" : "Maintenance mode is off", {
        description: enabled ? "Customer actions are paused; admins can continue working." : "Customer actions are available again.",
      });
    } catch (error) {
      toast.error("Could not update maintenance mode", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      setSavingMaintenance(false);
    }
  };
  
  const stats = [
    { label: "Itinerary trips", value: overview.data?.tripCount, icon: MapPin },
    { label: "Active bookings", value: overview.data?.activeBookingCount, icon: CheckCircle2 },
    { label: "Open operations", value: overview.data?.openTaskCount, icon: ClipboardCheck },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-12 pb-16 font-sans">
      <header className="pt-8">
        <span className="mb-2 block text-xs font-bold tracking-[0.1em] text-[#b59410] uppercase">
          Management Hub
        </span>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <h1 className="text-3xl font-medium tracking-tight text-gray-900">
            Overview
          </h1>
        </div>
      </header>

      <section className={`rounded-lg border p-5 ${maintenance.data?.maintenanceMode ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className={`rounded-md p-2 ${maintenance.data?.maintenanceMode ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"}`}>
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Maintenance mode</h2>
              <p className="mt-1 text-sm text-gray-600">
                {maintenance.data?.maintenanceMode
                  ? "Enabled — customers can browse, but cannot book, pay, submit forms, or change their details."
                  : "Disabled — customers can book and use the site normally."}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={maintenance.data?.maintenanceMode ?? false}
            aria-label="Toggle maintenance mode"
            disabled={!maintenance.data || maintenance.isFetching || savingMaintenance}
            onClick={toggleMaintenance}
            className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${maintenance.data?.maintenanceMode ? "bg-amber-600" : "bg-gray-300"}`}
          >
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${maintenance.data?.maintenanceMode ? "translate-x-7" : "translate-x-1"}`} />
          </button>
        </div>
      </section>

      {overview.isPending ? (
        <div className="flex min-h-32 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[#b59410]" />
        </div>
      ) : !overview.data ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h2 className="font-bold">Dashboard data is unavailable</h2>
              <p className="mt-1 text-sm text-red-700">{getErrorMessage(overview.error, "Check the connection and try again.")}</p>
              <button 
                type="button" 
                onClick={() => void overview.refetch()}
                className="mt-4 inline-flex items-center gap-2 rounded border border-red-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <RefreshCcw className="h-4 w-4" />
                Retry dashboard
              </button>
            </div>
          </div>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div 
              key={stat.label} 
              className="group flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#b59410] hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold tracking-[0.1em] text-gray-500 uppercase leading-relaxed w-2/3">
                  {stat.label}
                </span>
                <stat.icon className="h-5 w-5 text-[#b59410] opacity-60 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="text-4xl font-semibold tracking-tight text-gray-900">
                {stat.value}
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="pt-6">
        <div className="mb-8">
          <span className="mb-2 block text-xs font-bold tracking-[0.1em] text-[#b59410] uppercase">
            Administrative Engine
          </span>
          <h2 className="text-2xl font-medium tracking-tight text-gray-900">
            Working flow
          </h2>
        </div>
        
        <div className="flex flex-col gap-3">
          {steps.map((step) => (
            <Link 
              key={step.number} 
              to={step.href} 
              className="group flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#b59410] hover:bg-gray-50 md:flex-row md:items-center md:gap-8"
            >
              <div className="text-3xl font-light text-[#b59410] md:w-16 shrink-0">
                {step.number}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3">
                  <step.icon className="h-5 w-5 text-[#b59410]" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm text-gray-500">
                  {step.detail}
                </p>
              </div>
              <div className="flex items-center md:w-48 md:justify-end">
                <span className="flex items-center gap-1 text-sm font-medium text-[#b59410] transition-colors group-hover:text-[#8a710c]">
                  Open workspace 
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      
    </div>
  );
}
