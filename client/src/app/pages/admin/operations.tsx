import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BedDouble,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Loader2,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { BookingOperation, DepartureOperation, operationsApi, OperationsTask } from "../../../lib/operationsApi";
import BookingOperationsDrawer from "../../components/admin/operations/BookingOperationsDrawer";
import DepartureOperationsDrawer from "../../components/admin/operations/DepartureOperationsDrawer";
import { EmptyState, formatDate, formatMoney, inputClass, Panel, secondaryButton, StatusBadge } from "../../components/admin/operations/OperationsShared";

type View = "overview" | "departures" | "bookings" | "tasks";

function MetricCard({ label, value, detail, icon: Icon, tone = "default", onClick }: { label: string; value: string | number; detail: string; icon: any; tone?: "default" | "danger" | "success"; onClick?: () => void }) {
  const colors = tone === "danger" ? "bg-red-50 text-red-700" : tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-[#f3e8e9] text-[#781216]";
  const content = <><div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${colors}`}><Icon className="h-5 w-5" /></div><p className="text-2xl font-bold tracking-tight text-gray-950">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-gray-600">{label}</p><p className="mt-2 text-xs leading-5 text-gray-500">{detail}</p></>;
  return onClick ? <button type="button" onClick={onClick} className="rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md">{content}</button> : <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">{content}</div>;
}

function BookingRow({ booking, onOpen }: { booking: BookingOperation; onOpen: () => void }) {
  const item = booking.trip || booking.festival || booking.slot.trip || booking.slot.festival;
  const name = booking.user.profile?.fullName || booking.user.email;
  return (
    <button type="button" onClick={onOpen} className="flex w-full flex-col gap-3 px-4 py-4 text-left transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0">
        <div className="mb-1.5 flex flex-wrap items-center gap-2"><p className="font-bold text-gray-950">{booking.bookingReference}</p><StatusBadge status={booking.readiness.status} compact /><StatusBadge status={booking.paymentStatus} compact /></div>
        <p className="truncate text-sm font-medium text-gray-700">{name} · {item?.title || "Journey unavailable"}</p>
        <p className="mt-1 text-xs text-gray-500">{formatDate(booking.slot.startDate)} · {booking.numberOfTravelers} traveler(s){booking.readiness.attentionReasons.length ? ` · ${booking.readiness.attentionReasons.slice(0, 2).join(" / ")}` : ""}</p>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end"><div className="sm:text-right"><p className={`font-bold ${Number(booking.amountDue) > 0 ? "text-red-700" : "text-emerald-700"}`}>{formatMoney(booking.amountDue)}</p><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Balance due</p></div><ChevronRight className="h-4 w-4 text-gray-400" /></div>
    </button>
  );
}

function DepartureCard({ departure, onOpen }: { departure: DepartureOperation; onOpen: () => void }) {
  const item = departure.trip || departure.festival;
  return (
    <button type="button" onClick={onOpen} className="rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold text-gray-950">{departure.title}</p><p className="mt-1 truncate text-xs text-gray-500">{item?.title} · {item?.location}</p></div><StatusBadge status={departure.readinessStatus} compact /></div>
      <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-gray-700"><CalendarDays className="h-4 w-4 text-[#781216]" />{formatDate(departure.startDate)} – {formatDate(departure.endDate)}</div>
      <div className="mt-4 grid grid-cols-3 divide-x divide-gray-100 rounded-xl bg-gray-50 py-3 text-center"><div><p className="font-bold text-gray-950">{departure.metrics.bookings}</p><p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Bookings</p></div><div><p className="font-bold text-gray-950">{departure.metrics.travelers}</p><p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Travelers</p></div><div><p className={departure.metrics.blockedBookings ? "font-bold text-red-700" : "font-bold text-gray-950"}>{departure.metrics.blockedBookings}</p><p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Blocked</p></div></div>
    </button>
  );
}

function TaskRow({ task, onDone, busy }: { task: OperationsTask; onDone: () => void; busy: boolean }) {
  const context = task.booking?.bookingReference || task.hotelReservation?.hotelName || task.slot?.title || task.trip?.title || task.festival?.title || task.contact?.displayName || "General operations";
  const overdue = task.status === "OPEN" && task.dueAt && new Date(task.dueAt) < new Date();
  return <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className={task.status === "DONE" ? "font-semibold text-gray-400 line-through" : "font-semibold text-gray-900"}>{task.title}</p><StatusBadge status={task.priority} compact /><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{task.category.replaceAll("_", " ")}</span></div><p className={`mt-1 text-xs ${overdue ? "font-semibold text-red-600" : "text-gray-500"}`}>{context} · Due {formatDate(task.dueAt, "dd MMM yyyy, h:mm a")}{overdue ? " · Overdue" : ""}</p></div>{task.status === "OPEN" && <button type="button" onClick={onDone} disabled={busy} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"><Check className="h-3.5 w-3.5" />Done</button>}</div>;
}

export default function AdminOperationsPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("overview");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedDepartureId, setSelectedDepartureId] = useState<string | null>(null);
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingReadiness, setBookingReadiness] = useState("");
  const [bookingPayment, setBookingPayment] = useState("");
  const [departureSearch, setDepartureSearch] = useState("");
  const [taskStatus, setTaskStatus] = useState("OPEN");
  const deferredBookingSearch = useDeferredValue(bookingSearch);
  const deferredDepartureSearch = useDeferredValue(departureSearch);

  const dashboardQuery = useQuery({ queryKey: ["admin", "operations", "dashboard"], queryFn: operationsApi.dashboard });
  const departuresQuery = useQuery({
    queryKey: ["admin", "operations", "departures", deferredDepartureSearch],
    queryFn: () => operationsApi.listDepartures({ limit: 100, q: deferredDepartureSearch || undefined }),
    enabled: view === "departures",
  });
  const bookingsQuery = useQuery({
    queryKey: ["admin", "operations", "bookings", deferredBookingSearch, bookingReadiness, bookingPayment],
    queryFn: () => operationsApi.listBookings({ limit: 100, q: deferredBookingSearch || undefined, readiness: bookingReadiness || undefined, paymentStatus: bookingPayment || undefined }),
    enabled: view === "bookings",
  });
  const tasksQuery = useQuery({
    queryKey: ["admin", "operations", "tasks", taskStatus],
    queryFn: () => operationsApi.listTasks({ limit: 100, status: taskStatus || undefined }),
    enabled: view === "tasks",
  });
  const taskMutation = useMutation({
    mutationFn: (taskId: string) => operationsApi.updateTask(taskId, { status: "DONE" }),
    onSuccess: () => { toast.success("Task completed"); refreshAll(); },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Could not update task"),
  });

  const refreshAll = () => queryClient.invalidateQueries({ queryKey: ["admin", "operations"] });
  const dashboard = dashboardQuery.data;
  const admins = dashboard?.admins || [];
  const isFetching = dashboardQuery.isFetching || departuresQuery.isFetching || bookingsQuery.isFetching || tasksQuery.isFetching;

  const views: Array<{ key: View; label: string }> = [{ key: "overview", label: "Overview" }, { key: "departures", label: "Departures" }, { key: "bookings", label: "Booking operations" }, { key: "tasks", label: "Tasks" }];

  if (dashboardQuery.isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#781216]" /></div>;
  if (dashboardQuery.isError || !dashboard) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6"><p className="font-bold text-red-800">Operations dashboard unavailable</p><p className="mt-1 text-sm text-red-700">Check the server connection and try again.</p><button type="button" className={`${secondaryButton} mt-4`} onClick={() => dashboardQuery.refetch()}>Try again</button></div>;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#781216]">CRM · Operational phase</p><h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">Trip operations control</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Control every departure, booking payment, traveler document, hotel reservation, blocker, and execution task from one workspace.</p></div>
        <button type="button" className={secondaryButton} onClick={() => refreshAll()} disabled={isFetching}><RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />Refresh</button>
      </header>

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 shadow-sm">{views.map((item) => <button key={item.key} type="button" onClick={() => setView(item.key)} className={`min-h-10 shrink-0 rounded-lg px-4 text-sm font-semibold transition ${view === item.key ? "bg-[#781216] text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}>{item.label}</button>)}</nav>

      {view === "overview" && <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Upcoming departures" value={dashboard.summary.upcomingDepartures} detail="Dated slots available for operational planning" icon={CalendarDays} onClick={() => setView("departures")} />
          <MetricCard label="Bookings need attention" value={dashboard.summary.bookingsNeedingAttention} detail={`${dashboard.summary.bookingsReady} active booking(s) currently ready`} icon={AlertTriangle} tone={dashboard.summary.bookingsNeedingAttention ? "danger" : "success"} onClick={() => { setBookingReadiness("IN_PROGRESS"); setView("bookings"); }} />
          <MetricCard label="Customer balance due" value={formatMoney(dashboard.summary.outstandingCustomerBalance)} detail="Outstanding across active customer bookings" icon={CircleDollarSign} tone={dashboard.summary.outstandingCustomerBalance > 0 ? "danger" : "success"} onClick={() => setView("bookings")} />
          <MetricCard label="Open exceptions" value={dashboard.summary.overdueTasks + dashboard.summary.unconfirmedHotels} detail={`${dashboard.summary.overdueTasks} overdue task(s) · ${dashboard.summary.unconfirmedHotels} hotel(s) awaiting confirmation`} icon={ClipboardCheck} tone={dashboard.summary.overdueTasks + dashboard.summary.unconfirmedHotels ? "danger" : "success"} onClick={() => setView("tasks")} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
          <Panel title="Bookings needing attention" eyebrow="Priority queue" action={<button type="button" className="text-xs font-bold text-[#781216] hover:underline" onClick={() => setView("bookings")}>View all</button>}>
            {dashboard.attentionBookings.length ? <div className="divide-y divide-gray-100">{dashboard.attentionBookings.slice(0, 8).map((booking) => <BookingRow key={booking.id} booking={booking} onOpen={() => setSelectedBookingId(booking.id)} />)}</div> : <EmptyState title="All active bookings are ready" detail="There are no payment, document, hotel, or blocker exceptions." />}
          </Panel>
          <Panel title="Open operational tasks" eyebrow="Execution queue" action={<button type="button" className="text-xs font-bold text-[#781216] hover:underline" onClick={() => setView("tasks")}>View all</button>}>
            {dashboard.tasks.length ? <div className="divide-y divide-gray-100">{dashboard.tasks.slice(0, 8).map((task) => <TaskRow key={task.id} task={task} busy={taskMutation.isPending} onDone={() => taskMutation.mutate(task.id)} />)}</div> : <EmptyState title="No open tasks" detail="Departure and booking tasks will appear here." />}
          </Panel>
        </div>

        <Panel title="Upcoming departures" eyebrow="Operational calendar" action={<button type="button" className="text-xs font-bold text-[#781216] hover:underline" onClick={() => setView("departures")}>View calendar</button>}>
          {dashboard.departures.length ? <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 sm:p-5">{dashboard.departures.slice(0, 6).map((departure) => <DepartureCard key={departure.id} departure={departure} onOpen={() => setSelectedDepartureId(departure.id)} />)}</div> : <EmptyState title="No upcoming departures" detail="Future trip and festival slots will appear here." />}
        </Panel>
      </>}

      {view === "departures" && <>
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input className={`${inputClass} pl-10`} value={departureSearch} onChange={(e) => setDepartureSearch(e.target.value)} placeholder="Search departure, trip, or festival" /></div><p className="text-xs font-semibold text-gray-500">{departuresQuery.data?.meta.total || 0} departure(s)</p></div>
        {departuresQuery.isLoading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#781216]" /></div> : departuresQuery.data?.data.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{departuresQuery.data.data.map((departure) => <DepartureCard key={departure.id} departure={departure} onOpen={() => setSelectedDepartureId(departure.id)} />)}</div> : <div className="rounded-2xl border border-gray-200 bg-white"><EmptyState title="No matching departures" detail="Try a different search." /></div>}
      </>}

      {view === "bookings" && <>
        <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_190px_190px]"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input className={`${inputClass} pl-10`} value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)} placeholder="Booking reference, customer, or journey" /></div><select className={inputClass} value={bookingReadiness} onChange={(e) => setBookingReadiness(e.target.value)}><option value="">All readiness</option>{["READY", "IN_PROGRESS", "BLOCKED", "CANCELLED", "COMPLETED"].map((value) => <option key={value}>{value.replaceAll("_", " ")}</option>)}</select><select className={inputClass} value={bookingPayment} onChange={(e) => setBookingPayment(e.target.value)}><option value="">All payments</option>{["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"].map((value) => <option key={value}>{value.replaceAll("_", " ")}</option>)}</select></div>
        <Panel title={`Booking operations · ${bookingsQuery.data?.meta.total || 0}`} eyebrow="Readiness register">
          {bookingsQuery.isLoading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#781216]" /></div> : bookingsQuery.data?.data.length ? <div className="divide-y divide-gray-100">{bookingsQuery.data.data.map((booking) => <BookingRow key={booking.id} booking={booking} onOpen={() => setSelectedBookingId(booking.id)} />)}</div> : <EmptyState title="No matching bookings" detail="Adjust the readiness, payment, or search filters." />}
        </Panel>
      </>}

      {view === "tasks" && <>
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold text-gray-950">Operational task register</h2><p className="mt-1 text-xs text-gray-500">Tasks are created from a booking or departure workspace so their context is always preserved.</p></div><select className={`${inputClass} sm:w-44`} value={taskStatus} onChange={(e) => setTaskStatus(e.target.value)}><option value="">All statuses</option><option value="OPEN">Open</option><option value="DONE">Done</option><option value="CANCELLED">Cancelled</option></select></div>
        <Panel title={`${tasksQuery.data?.meta.total || 0} task(s)`} eyebrow="Operational execution">
          {tasksQuery.isLoading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#781216]" /></div> : tasksQuery.data?.data.length ? <div className="divide-y divide-gray-100">{tasksQuery.data.data.map((task) => <TaskRow key={task.id} task={task} busy={taskMutation.isPending} onDone={() => taskMutation.mutate(task.id)} />)}</div> : <EmptyState title="No matching tasks" detail="Create tasks from a booking or departure workspace." />}
        </Panel>
      </>}

      {selectedDepartureId && <DepartureOperationsDrawer slotId={selectedDepartureId} admins={admins} onClose={() => setSelectedDepartureId(null)} onOpenBooking={(bookingId) => { setSelectedDepartureId(null); setSelectedBookingId(bookingId); }} onChanged={refreshAll} />}
      {selectedBookingId && <BookingOperationsDrawer bookingId={selectedBookingId} admins={admins} onClose={() => setSelectedBookingId(null)} onChanged={refreshAll} />}
    </div>
  );
}
