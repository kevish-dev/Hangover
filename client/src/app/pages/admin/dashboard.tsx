import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { AlertTriangle, ArrowRight, BookOpen, CalendarCheck, CalendarRange, CheckCircle2, ClipboardCheck, Loader2, Map, RefreshCcw } from "lucide-react";
import { apiClient } from "../../../lib/axios";
import { toast } from "sonner";
import { getErrorMessage } from "../../../lib/errors";

const steps = [
  { number: "01", title: "Build a circuit", detail: "Create custom itineraries from scratch for bespoke client requests.", href: "/dashboard/circuits", icon: Map },
  { number: "02", title: "Fork a trip", detail: "Duplicate and modify existing templates for rapid route planning.", href: "/dashboard/trips", icon: CalendarRange },
  { number: "03", title: "Take bookings", detail: "Manage customer reservations, group allocations, and payments.", href: "/dashboard/bookings", icon: CalendarCheck },
  { number: "04", title: "Run operations", detail: "Coordinate logistics, ground services, and real-time support.", href: "/dashboard/operations", icon: ClipboardCheck },
  { number: "05", title: "Reconcile the ledger", detail: "Finalize financial records, agency commissions, and vendor payouts.", href: "/dashboard/ledger", icon: BookOpen },
];

export default function AdminDashboard() {
  const circuits = useQuery({ queryKey: ["admin", "circuits", "overview"], queryFn: async () => (await apiClient.get("/circuits", { params: { limit: 1 } })).data.meta.total });
  const trips = useQuery({ queryKey: ["admin", "trips", "overview"], queryFn: async () => (await apiClient.get("/trips", { params: { adminView: true, limit: 200 } })).data.data });
  const bookings = useQuery({ queryKey: ["admin", "bookings", "overview"], queryFn: async () => (await apiClient.get("/bookings", { params: { limit: 1000 } })).data.data });
  const tasks = useQuery({ queryKey: ["admin", "operational-tasks", "overview"], queryFn: async () => (await apiClient.get("/operations", { params: { limit: 500 } })).data });
  
  const loading = circuits.isLoading || trips.isLoading || bookings.isLoading || tasks.isLoading;
  const failedQueries = [circuits, trips, bookings, tasks].filter((query) => query.isError);
  
  useEffect(() => {
    if (failedQueries.length > 0) {
      toast.error("Dashboard data could not be loaded", {
        id: "admin-dashboard-load-error",
        description: getErrorMessage(failedQueries[0].error, "Check the server connection and try again."),
      });
    }
  }, [failedQueries.length]);

  const tripData = trips.data || [];
  const bookingData = bookings.data || [];
  const taskData = tasks.data || [];

  const stats = [
    { label: "Circuit templates", value: circuits.data || 0, icon: Map },
    { label: "Upcoming departures", value: tripData.reduce((sum: number, trip: any) => sum + (trip.slots || []).filter((slot: any) => slot.startDate && new Date(slot.startDate) > new Date()).length, 0), icon: CalendarRange },
    { label: "Active bookings", value: bookingData.filter((booking: any) => ["PENDING", "RESERVED", "CONFIRMED"].includes(booking.status)).length, icon: CheckCircle2 },
    { label: "Open operations", value: taskData.filter((task: any) => !["DONE", "CANCELLED"].includes(task.status)).length, icon: ClipboardCheck },
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
          <div className="text-sm text-gray-500">
            Last updated: Just now
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[#b59410]" />
        </div>
      ) : failedQueries.length > 0 ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h2 className="font-bold">Dashboard data is unavailable</h2>
              <p className="mt-1 text-sm text-red-700">Totals are hidden so failed requests are never mistaken for real zero values.</p>
              <button 
                type="button" 
                onClick={() => Promise.all([circuits.refetch(), trips.refetch(), bookings.refetch(), tasks.refetch()])} 
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
