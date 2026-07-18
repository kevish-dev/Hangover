import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { AlertTriangle, ArrowRight, BookOpen, CalendarCheck, CalendarRange, CheckCircle2, ClipboardCheck, Loader2, Map, RefreshCcw } from "lucide-react";
import { apiClient } from "../../../lib/axios";
import { toast } from "sonner";
import { getErrorMessage } from "../../../lib/errors";

const steps = [
  { number: "01", title: "Build a circuit", detail: "Create the reusable itinerary, packages, add-ons, and operational task templates.", href: "/dashboard/circuits", icon: Map },
  { number: "02", title: "Fork a trip", detail: "Create a trip from that circuit, add departure slots, then publish or share privately.", href: "/dashboard/trips", icon: CalendarRange },
  { number: "03", title: "Take bookings", detail: "Traveler, package, add-on, payment, and slot capacity all stay connected.", href: "/dashboard/bookings", icon: CalendarCheck },
  { number: "04", title: "Run operations", detail: "Circuit tasks become booking work with live due-date and arrangement readiness.", href: "/dashboard/operations", icon: ClipboardCheck },
  { number: "05", title: "Reconcile the ledger", detail: "Income, refunds, operational costs, and manual entries share one balance sheet.", href: "/dashboard/ledger", icon: BookOpen },
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
    { label: "Circuit templates", value: circuits.data || 0 },
    { label: "Upcoming departures", value: tripData.reduce((sum: number, trip: any) => sum + (trip.slots || []).filter((slot: any) => slot.startDate && new Date(slot.startDate) > new Date()).length, 0) },
    { label: "Active bookings", value: bookingData.filter((booking: any) => ["PENDING", "RESERVED", "CONFIRMED"].includes(booking.status)).length },
    { label: "Open operations", value: taskData.filter((task: any) => !["DONE", "CANCELLED"].includes(task.status)).length },
  ];
  return <div className="mx-auto max-w-[1500px] space-y-6 pb-12"><header><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#781216]">New operating model</p><h1 className="mt-1 text-2xl font-bold text-gray-950 sm:text-3xl">Circuit-to-completion control</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">The admin portal now follows the Prisma architecture directly. Start with a reusable circuit, fork dated trips, then manage bookings, execution, finance, and reviews from the same chain.</p></header>{loading ? <div className="flex min-h-32 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#781216]" /></div> : failedQueries.length > 0 ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><h2 className="font-bold">Dashboard data is unavailable</h2><p className="mt-1 text-sm text-red-700">Totals are hidden so failed requests are never mistaken for real zero values.</p><button type="button" onClick={() => Promise.all([circuits.refetch(), trips.refetch(), bookings.refetch(), tasks.refetch()])} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold"><RefreshCcw className="h-4 w-4" />Retry dashboard</button></div></div></div> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"><p className="text-3xl font-bold text-gray-950">{stat.value}</p><p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">{stat.label}</p></div>)}</div>}<section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"><div className="mb-5 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#781216]" /><h2 className="font-bold text-gray-950">Working flow</h2></div><div className="grid gap-3 xl:grid-cols-5">{steps.map((step) => <Link key={step.number} to={step.href} className="group flex min-h-52 flex-col rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:-translate-y-0.5 hover:border-[#c8a96e] hover:bg-[#fcf8ef] hover:shadow-md"><div className="flex items-center justify-between"><span className="text-xs font-bold tracking-[0.16em] text-[#a27d2e]">{step.number}</span><step.icon className="h-5 w-5 text-[#781216]" /></div><h3 className="mt-6 font-bold text-gray-950">{step.title}</h3><p className="mt-2 text-sm leading-6 text-gray-600">{step.detail}</p><span className="mt-auto flex items-center gap-1 pt-5 text-xs font-bold text-[#781216]">Open workspace <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></span></Link>)}</div></section></div>;
}
