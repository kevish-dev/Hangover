import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, Check, ClipboardList, Loader2, MapPin, Plus, UsersRound, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { AdminOption, DepartureStatus, operationsApi } from "../../../../lib/operationsApi";
import { DrawerShell, EmptyState, formatDate, formatMoney, fromDateTimeLocal, inputClass, labelClass, Panel, primaryButton, secondaryButton, StatusBadge, toDateTimeLocal } from "./OperationsShared";
import { TaskDialog } from "./OperationsDialogs";

const adminName = (admins: AdminOption[], id?: string | null) => admins.find((admin) => admin.id === id)?.profile?.fullName || admins.find((admin) => admin.id === id)?.email || "Unassigned";

export default function DepartureOperationsDrawer({ slotId, admins, onClose, onOpenBooking, onChanged }: { slotId: string; admins: AdminOption[]; onClose: () => void; onOpenBooking: (bookingId: string) => void; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const [taskOpen, setTaskOpen] = useState(false);
  const [status, setStatus] = useState<DepartureStatus>("PLANNING");
  const [coordinatorId, setCoordinatorId] = useState("");
  const [nextActionAt, setNextActionAt] = useState("");
  const [notes, setNotes] = useState("");
  const [blockerReason, setBlockerReason] = useState("");
  const { data: departure, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "operations", "departure", slotId],
    queryFn: () => operationsApi.getDeparture(slotId),
  });
  useEffect(() => {
    if (!departure) return;
    setStatus(departure.operation?.status || "PLANNING");
    setCoordinatorId(departure.operation?.coordinatorId || "");
    setNextActionAt(toDateTimeLocal(departure.operation?.nextActionAt));
    setNotes(departure.operation?.notes || "");
    setBlockerReason(departure.operation?.blockerResolvedAt ? "" : departure.operation?.blockerReason || "");
  }, [departure]);
  const refresh = async () => {
    await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ["admin", "operations"] })]);
    onChanged();
  };
  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => operationsApi.updateDeparture(slotId, payload),
    onSuccess: () => { toast.success("Departure operations updated"); refresh(); },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Could not update departure"),
  });
  const taskMutation = useMutation({
    mutationFn: (taskId: string) => operationsApi.updateTask(taskId, { status: "DONE" }),
    onSuccess: () => { toast.success("Task completed"); refresh(); },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Could not complete task"),
  });

  if (isLoading) return <DrawerShell title="Loading departure…" onClose={onClose}><div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#781216]" /></div></DrawerShell>;
  if (isError || !departure) return <DrawerShell title="Departure unavailable" onClose={onClose}><div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">This departure operation could not be loaded.</div></DrawerShell>;
  const item = departure.trip || departure.festival;
  const activeBlocker = departure.operation?.blockerReason && !departure.operation?.blockerResolvedAt;
  const save = () => mutation.mutate({ status, coordinatorId: coordinatorId || null, nextActionAt: fromDateTimeLocal(nextActionAt), notes: notes || null, blockerReason: blockerReason || null });

  return (
    <>
      <DrawerShell title={departure.title} subtitle={<div className="flex flex-wrap items-center gap-2"><span>{formatDate(departure.startDate)} – {formatDate(departure.endDate)}</span><StatusBadge status={departure.readinessStatus} compact /></div>} onClose={onClose} width="max-w-5xl">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.75fr)]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[{ label: "Bookings", value: departure.metrics.bookings, icon: ClipboardList }, { label: "Travelers", value: departure.metrics.travelers, icon: UsersRound }, { label: "Ready", value: departure.metrics.readyBookings, icon: Check }, { label: "Balance due", value: formatMoney(departure.metrics.outstandingAmount), icon: WalletCards }].map((metric) => <div key={metric.label} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"><metric.icon className="mb-3 h-4 w-4 text-[#781216]" /><p className="text-lg font-bold text-gray-950">{metric.value}</p><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{metric.label}</p></div>)}
            </div>

            <Panel title="Departure bookings" eyebrow="Execution roster">
              {departure.bookings?.length ? <div className="divide-y divide-gray-100">{departure.bookings.map((booking) => <button type="button" key={booking.id} onClick={() => onOpenBooking(booking.id)} className="flex w-full flex-col gap-3 px-4 py-4 text-left transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="min-w-0"><div className="mb-1 flex flex-wrap items-center gap-2"><p className="font-bold text-gray-950">{booking.bookingReference}</p><StatusBadge status={booking.readiness.status} compact /></div><p className="truncate text-sm text-gray-600">{booking.user.profile?.fullName || booking.user.email} · {booking.numberOfTravelers} traveler(s)</p><p className="mt-1 text-xs text-gray-500">{booking.readiness.attentionReasons.slice(0, 2).join(" · ") || "All controls complete"}</p></div><div className="shrink-0 text-left sm:text-right"><p className={`font-bold ${Number(booking.amountDue) > 0 ? "text-red-700" : "text-emerald-700"}`}>{formatMoney(booking.amountDue)} due</p><p className="mt-1 text-xs text-gray-500">Open workspace →</p></div></button>)}</div> : <EmptyState title="No active bookings" detail="Bookings assigned to this slot will appear here." />}
            </Panel>

            <Panel title="Departure tasks" eyebrow="Shared trip checklist" action={<button type="button" className={secondaryButton} onClick={() => setTaskOpen(true)}><Plus className="h-4 w-4" />New task</button>}>
              {departure.tasks?.length ? <div className="divide-y divide-gray-100">{departure.tasks.map((task) => <div key={task.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><div className="flex flex-wrap items-center gap-2"><p className={task.status === "DONE" ? "font-semibold text-gray-400 line-through" : "font-semibold text-gray-900"}>{task.title}</p><StatusBadge status={task.priority} compact /><span className="text-[10px] font-bold uppercase text-gray-400">{task.category.replaceAll("_", " ")}</span></div><p className="mt-1 text-xs text-gray-500">Due {formatDate(task.dueAt, "dd MMM yyyy, h:mm a")} · {adminName(admins, task.assigneeId)}</p></div>{task.status === "OPEN" && <button type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-xs font-bold text-emerald-700" onClick={() => taskMutation.mutate(task.id)}><Check className="h-3.5 w-3.5" />Done</button>}</div>)}</div> : <EmptyState title="No departure tasks" detail="Add transport, vendor, permits, or departure-wide actions." />}
            </Panel>
          </div>

          <aside className="space-y-4">
            <Panel title="Departure control" eyebrow="Owner & status">
              <div className="space-y-4 p-4 sm:p-5">
                <div><label className={labelClass}>Operational status</label><select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as DepartureStatus)}>{["PLANNING", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"].map((value) => <option key={value}>{value}</option>)}</select></div>
                <div><label className={labelClass}>Coordinator</label><select className={inputClass} value={coordinatorId} onChange={(e) => setCoordinatorId(e.target.value)}><option value="">Unassigned</option>{admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.profile?.fullName || admin.email}</option>)}</select></div>
                <div><label className={labelClass}>Next action</label><input type="datetime-local" className={inputClass} value={nextActionAt} onChange={(e) => setNextActionAt(e.target.value)} /></div>
                <div><label className={labelClass}>Departure notes</label><textarea rows={5} className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Assembly, transport, guide, permit, and vendor context" /></div>
                <button type="button" className={`${primaryButton} w-full`} onClick={save} disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save departure</button>
              </div>
            </Panel>

            <Panel title="Departure blocker" eyebrow="Exception management" action={activeBlocker ? <StatusBadge status="BLOCKED" compact /> : undefined}>
              <div className="space-y-3 p-4 sm:p-5">
                {activeBlocker && <div className="rounded-xl border border-red-200 bg-red-50 p-3"><p className="text-sm font-bold text-red-800">{departure.operation?.blockerReason}</p><button type="button" className="mt-2 text-xs font-bold text-red-800 underline" onClick={() => mutation.mutate({ blockerResolved: true })}>Mark resolved</button></div>}
                <div><label className={labelClass}>{activeBlocker ? "Replace blocker" : "Add a blocker"}</label><textarea rows={3} className={inputClass} value={blockerReason} onChange={(e) => setBlockerReason(e.target.value)} /></div>
                <button type="button" className={secondaryButton} disabled={!blockerReason.trim() || mutation.isPending} onClick={() => mutation.mutate({ blockerReason })}><AlertTriangle className="h-4 w-4" />Save blocker</button>
              </div>
            </Panel>

            <Panel title="Journey context" eyebrow="Departure details">
              <div className="space-y-3 p-4 text-sm sm:p-5"><p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#781216]" /><span><strong>{item?.title}</strong><br /><span className="text-gray-500">{item?.location || "Location not recorded"}</span></span></p><p className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#781216]" /><span>{formatDate(departure.startDate, "dd MMM yyyy, h:mm a")}<br /><span className="text-gray-500">to {formatDate(departure.endDate, "dd MMM yyyy, h:mm a")}</span></span></p><p className="flex justify-between border-t border-gray-100 pt-3"><span className="text-gray-500">Capacity</span><strong>{departure.filledSpots}/{departure.capacity}</strong></p><p className="flex justify-between"><span className="text-gray-500">Coordinator</span><strong className="text-right">{adminName(admins, departure.operation?.coordinatorId)}</strong></p></div>
            </Panel>
          </aside>
        </div>
      </DrawerShell>
      {taskOpen && <TaskDialog admins={admins} slotId={departure.id} onClose={() => setTaskOpen(false)} onSaved={refresh} />}
    </>
  );
}
