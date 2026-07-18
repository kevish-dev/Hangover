import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../../lib/axios";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { getErrorMessage, showErrorToast } from "../../../lib/errors";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  status: string;
  estimatedAmount: string | number;
  amountArranged: string | number;
  amountPaid: string | number;
  dueAt?: string | null;
  completedAt?: string | null;
  booking: {
    id: string;
    bookingReference: string;
    status: string;
    paymentStatus: string;
    user: { email: string; profile?: { fullName?: string | null } | null };
    slot?: { id: string; title?: string | null; startDate?: string | null; endDate?: string | null } | null;
    trip?: { id: string; title: string; slug: string } | null;
    festival?: { id: string; title: string; slug: string } | null;
  };
  itineraryDay?: { dayNumber: number; title: string } | null;
};

const CATEGORIES = ["HOTEL", "TRANSPORT", "PERMIT", "VENDOR", "ACTIVITY", "DOCUMENTATION", "PAYMENT_COLLECTION", "GENERAL"];
const STATUSES = ["PENDING", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"];
const money = (value: unknown) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const date = (value?: string | null, pattern = "dd MMM yyyy") => value ? format(new Date(value), pattern) : "No due date";

function health(task: Task) {
  if (["DONE", "CANCELLED"].includes(task.status)) return { key: "complete", label: task.status === "DONE" ? "Complete" : "Cancelled", className: "bg-gray-100 text-gray-600 border-gray-200" };
  if (task.status === "BLOCKED") return { key: "red", label: "Blocked", className: "bg-red-50 text-red-700 border-red-200" };
  const estimated = Number(task.estimatedAmount || 0);
  const arranged = Number(task.amountArranged || 0);
  const due = task.dueAt ? new Date(task.dueAt).getTime() : null;
  const daysLeft = due == null ? null : (due - Date.now()) / 86400000;
  if (daysLeft != null && daysLeft < 0) return { key: "red", label: "Overdue", className: "bg-red-50 text-red-700 border-red-200" };
  if ((daysLeft != null && daysLeft <= 3) || (estimated > 0 && arranged < estimated)) return { key: "yellow", label: daysLeft != null && daysLeft <= 3 ? "Due soon" : "Partly arranged", className: "bg-amber-50 text-amber-700 border-amber-200" };
  return { key: "green", label: "On track", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

function Stat({ label, value, detail, icon: Icon, tone }: { label: string; value: string | number; detail: string; icon: any; tone: string }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"><div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></div><p className="text-2xl font-bold text-gray-950">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-gray-600">{label}</p><p className="mt-2 text-xs leading-5 text-gray-500">{detail}</p></div>;
}

function TaskEditor({ task, onClose }: { task: Task; onClose: () => void }) {
  const queryClient = useQueryClient();
  const initialValues = {
    status: task.status,
    title: task.title,
    description: task.description || "",
    estimatedAmount: String(task.estimatedAmount || 0),
    amountArranged: String(task.amountArranged || 0),
    amountPaid: String(task.amountPaid || 0),
    dueAt: task.dueAt ? format(new Date(task.dueAt), "yyyy-MM-dd'T'HH:mm") : "",
  };
  const [values, setValues] = useState(initialValues);
  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.patch(`/operations/${task.id}`, payload),
    onSuccess: async () => {
      toast.success("Operational task updated");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "operational-tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "ledger"] }),
      ]);
      onClose();
    },
    onError: (error: unknown) => showErrorToast(error, "Could not update the task"),
  });
  const saveTask = () => {
    const title = values.title.trim();
    const estimatedAmount = Number(values.estimatedAmount);
    const amountArranged = Number(values.amountArranged);
    const amountPaid = Number(values.amountPaid);
    if (!title) return toast.error("Task title is required.");
    if (![estimatedAmount, amountArranged, amountPaid].every(Number.isFinite)) {
      return toast.error("Estimated, arranged, and paid amounts must be valid numbers.");
    }
    if ([estimatedAmount, amountArranged, amountPaid].some((amount) => amount < 0)) {
      return toast.error("Operational amounts cannot be negative.");
    }
    if (amountPaid > amountArranged) {
      return toast.error("Paid amount cannot exceed the amount arranged.");
    }
    if (values.dueAt && Number.isNaN(new Date(values.dueAt).getTime())) {
      return toast.error("Choose a valid due date and time.");
    }

    const payload: Record<string, unknown> = {};
    if (values.status !== initialValues.status) payload.status = values.status;
    if (title !== initialValues.title.trim()) payload.title = title;
    if (values.description.trim() !== initialValues.description.trim()) payload.description = values.description.trim() || null;
    if (estimatedAmount !== Number(task.estimatedAmount || 0)) payload.estimatedAmount = estimatedAmount;
    if (amountArranged !== Number(task.amountArranged || 0)) payload.amountArranged = amountArranged;
    if (amountPaid !== Number(task.amountPaid || 0)) payload.amountPaid = amountPaid;
    if (values.dueAt !== initialValues.dueAt) payload.dueAt = values.dueAt ? new Date(values.dueAt).toISOString() : null;

    if (Object.keys(payload).length === 0) return toast.info("No task changes to save.");
    mutation.mutate(payload);
  };
  const item = task.booking.trip || task.booking.festival;
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}><div role="dialog" aria-modal="true" className="max-h-[95dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl" onClick={(event) => event.stopPropagation()}><div className="sticky top-0 z-10 flex items-start justify-between border-b bg-white px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#781216]">{task.category.replaceAll("_", " ")}</p><h2 className="mt-1 text-xl font-bold text-gray-950">{task.title}</h2><p className="mt-1 text-xs text-gray-500">{item?.title} · {task.booking.bookingReference}</p></div><button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"><X className="h-5 w-5" /></button></div><div className="space-y-5 p-5"><div className="grid gap-4 sm:grid-cols-2"><div><Label>Status</Label><select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={values.status} onChange={(event) => setValues({ ...values, status: event.target.value })}>{STATUSES.map((status) => <option key={status}>{status.replaceAll("_", " ")}</option>)}</select></div><div><Label>Due at</Label><Input className="mt-1" type="datetime-local" value={values.dueAt} onChange={(event) => setValues({ ...values, dueAt: event.target.value })} /></div></div><div><Label>Task title</Label><Input className="mt-1" value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} /></div><div><Label>Description</Label><Textarea className="mt-1" rows={3} value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} /></div><div className="grid gap-4 sm:grid-cols-3"><div><Label>Estimated</Label><Input className="mt-1" type="number" min={0} step="0.01" value={values.estimatedAmount} onChange={(event) => setValues({ ...values, estimatedAmount: event.target.value })} /></div><div><Label>Arranged</Label><Input className="mt-1" type="number" min={0} step="0.01" value={values.amountArranged} onChange={(event) => setValues({ ...values, amountArranged: event.target.value })} /></div><div><Label>Paid</Label><Input className="mt-1" type="number" min={0} step="0.01" value={values.amountPaid} onChange={(event) => setValues({ ...values, amountPaid: event.target.value })} /></div></div><div className="rounded-xl border border-[#eadcb9] bg-[#fcf8ef] p-4 text-sm text-[#6d541f]">Recording a paid amount automatically updates the unified ledger for this trip.</div></div><div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white px-5 py-3"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="button" disabled={mutation.isPending} onClick={saveTask} className="bg-[#781216] hover:bg-[#5f0e11]">{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save task</Button></div></div></div>;
}

export default function AdminOperationsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<Task | null>(null);
  const query = useQuery({
    queryKey: ["admin", "operational-tasks"],
    queryFn: async () => (await apiClient.get<Task[]>("/operations", { params: { limit: 500 } })).data,
  });
  useEffect(() => {
    if (query.isError) toast.error(getErrorMessage(query.error, "Operations could not be loaded"), { id: "operations-load-error" });
  }, [query.error, query.isError]);
  const tasks = query.data || [];
  const filtered = useMemo(() => tasks.filter((task) => {
    if (status && task.status !== status) return false;
    if (category && task.category !== category) return false;
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return [task.title, task.description, task.category, task.booking.bookingReference, task.booking.trip?.title, task.booking.festival?.title, task.booking.user.profile?.fullName, task.booking.user.email].filter(Boolean).join(" ").toLowerCase().includes(needle);
  }), [category, search, status, tasks]);
  const summary = useMemo(() => ({
    open: tasks.filter((task) => !["DONE", "CANCELLED"].includes(task.status)).length,
    overdue: tasks.filter((task) => health(task).key === "red").length,
    dueSoon: tasks.filter((task) => health(task).key === "yellow").length,
    paid: tasks.reduce((total, task) => total + Number(task.amountPaid || 0), 0),
  }), [tasks]);

  if (query.isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#781216]" /></div>;
  if (query.isError) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"><h1 className="font-bold">Operations could not be loaded</h1><button type="button" onClick={() => query.refetch()} className="mt-3 text-sm font-semibold underline">Try again</button></div>;

  return <div className="mx-auto max-w-[1500px] space-y-5 pb-12"><header><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#781216]">Departure execution</p><h1 className="mt-1 text-2xl font-bold text-gray-950 sm:text-3xl">Operational task control</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Tasks are generated from circuit templates when a traveler books a real departure. Readiness is calculated live from the due date and arranged amount.</p></header><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Open tasks" value={summary.open} detail="Across active trip and festival bookings" icon={ClipboardCheck} tone="bg-[#f3e8e9] text-[#781216]" /><Stat label="Overdue or blocked" value={summary.overdue} detail="Requires immediate operational attention" icon={AlertTriangle} tone="bg-red-50 text-red-700" /><Stat label="Due soon / partial" value={summary.dueSoon} detail="Within three days or not fully arranged" icon={CalendarClock} tone="bg-amber-50 text-amber-700" /><Stat label="Operational spend" value={money(summary.paid)} detail="Paid costs written to the unified ledger" icon={CircleDollarSign} tone="bg-emerald-50 text-emerald-700" /></div><div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_190px_190px]"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Task, booking, traveler, or trip" className="pl-10" /></div><select value={status} onChange={(event) => setStatus(event.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">All statuses</option>{STATUSES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select><select value={category} onChange={(event) => setCategory(event.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">All categories</option>{CATEGORIES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></div><section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b px-4 py-3 sm:px-5"><div><h2 className="font-bold text-gray-950">Task register</h2><p className="text-xs text-gray-500">{filtered.length} of {tasks.length} task(s)</p></div><SlidersHorizontal className="h-4 w-4 text-gray-400" /></div>{filtered.length === 0 ? <div className="p-12 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" /><p className="mt-3 font-semibold text-gray-900">No matching tasks</p><p className="mt-1 text-sm text-gray-500">New tasks appear after bookings are created from circuit-based trips.</p></div> : <div className="divide-y divide-gray-100">{filtered.map((task) => { const state = health(task); const item = task.booking.trip || task.booking.festival; const arranged = Number(task.amountArranged || 0); const estimated = Number(task.estimatedAmount || 0); const percent = estimated > 0 ? Math.min(100, Math.round(arranged / estimated * 100)) : task.status === "DONE" ? 100 : 0; return <button type="button" key={task.id} onClick={() => setSelected(task)} className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-gray-50 lg:grid-cols-[minmax(0,1.4fr)_220px_180px_130px] lg:items-center sm:px-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-gray-950">{task.title}</p><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${state.className}`}>{state.label}</span><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{task.category.replaceAll("_", " ")}</span></div><p className="mt-1 truncate text-xs text-gray-500">{item?.title || "Journey"} · {task.booking.bookingReference} · {task.booking.user.profile?.fullName || task.booking.user.email}</p></div><div><div className="flex justify-between text-[10px] font-semibold text-gray-500"><span>Arranged {money(arranged)}</span><span>{percent}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${state.key === "red" ? "bg-red-500" : state.key === "yellow" ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${percent}%` }} /></div><p className="mt-1 text-[10px] text-gray-400">Estimated {money(estimated)}</p></div><div className="text-xs text-gray-600"><p className="font-semibold text-gray-800">Due {date(task.dueAt)}</p><p className="mt-1">Departure {date(task.booking.slot?.startDate)}</p></div><div className="lg:text-right"><p className="font-bold text-gray-900">{money(task.amountPaid)}</p><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Paid</p></div></button>; })}</div>}</section>{selected && <TaskEditor task={selected} onClose={() => setSelected(null)} />}</div>;
}
