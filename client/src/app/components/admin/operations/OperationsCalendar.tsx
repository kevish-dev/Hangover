import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { apiClient } from "../../../../lib/axios";
import { toast } from "sonner";

export type CalendarOperation = {
  id: string;
  title: string;
  dueAt?: string | null;
  status: string;
  category?: string | null;
  unitPrice?: number | null;
  quantityNeeded?: number | null;
  quantityAcquired?: number | null;
  booking?: { bookingReference?: string; user?: { profile?: { fullName?: string | null } | null } | null } | null;
};

const iso = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const statusClass = (status: string) => status === "DONE" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : status === "BLOCKED" ? "border-red-200 bg-red-50 text-red-800" : status === "CANCELLED" ? "border-gray-200 bg-gray-50 text-gray-400" : "border-amber-200 bg-amber-50 text-gray-800";

export function OperationsCalendar({ tasks, onTaskClick, emptyMessage = "No dated operations in this month." }: { tasks: CalendarOperation[]; onTaskClick?: (task: CalendarOperation) => void; emptyMessage?: string }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedTask, setSelectedTask] = useState<CalendarOperation | null>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(() => new Set());
  const [completing, setCompleting] = useState(false);

  const [unitPrice, setUnitPrice] = useState("");
  const [quantityNeeded, setQuantityNeeded] = useState("");
  const [quantityAcquired, setQuantityAcquired] = useState("");

  useEffect(() => {
    if (selectedTask) {
      setUnitPrice(selectedTask.unitPrice !== undefined && selectedTask.unitPrice !== null ? String(selectedTask.unitPrice) : "");
      setQuantityNeeded(selectedTask.quantityNeeded !== undefined && selectedTask.quantityNeeded !== null ? String(selectedTask.quantityNeeded) : "");
      setQuantityAcquired(selectedTask.quantityAcquired !== undefined && selectedTask.quantityAcquired !== null ? String(selectedTask.quantityAcquired) : "");
    }
  }, [selectedTask]);

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; });
  }, [month]);
  const byDay = useMemo(() => {
    const grouped = new Map<string, CalendarOperation[]>();
    tasks.forEach((task) => { if (!task.dueAt) return; const visibleTask = completedTaskIds.has(task.id) ? { ...task, status: "DONE" } : task; const key = iso(new Date(visibleTask.dueAt!)); grouped.set(key, [...(grouped.get(key) || []), visibleTask]); });
    return grouped;
  }, [tasks, completedTaskIds]);
  const unscheduled = tasks.filter((task) => !task.dueAt).map((task) => completedTaskIds.has(task.id) ? { ...task, status: "DONE" } : task);
  const thisMonth = month.getMonth();
  const openTask = (task: CalendarOperation) => onTaskClick ? onTaskClick(task) : setSelectedTask(task);
  const markComplete = async () => {
    if (!selectedTask || selectedTask.status === "DONE") return;
    setCompleting(true);
    try {
      const payload: any = { status: "DONE" };
      payload.unitPrice = unitPrice !== "" ? Number(unitPrice) : null;
      payload.quantityNeeded = quantityNeeded !== "" ? parseInt(quantityNeeded, 10) : null;
      payload.quantityAcquired = quantityAcquired !== "" ? parseInt(quantityAcquired, 10) : null;

      await apiClient.patch(`/operations/${selectedTask.id}`, payload);
      setCompletedTaskIds((current) => new Set(current).add(selectedTask.id));
      setSelectedTask((current) => current ? { 
        ...current, 
        status: "DONE",
        unitPrice: payload.unitPrice,
        quantityNeeded: payload.quantityNeeded,
        quantityAcquired: payload.quantityAcquired,
      } : null);
      toast.success("Task marked complete");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not complete task");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <CalendarDays className="h-4 w-4 text-[#781216]" />
            Operations calendar
          </p>
          <p className="mt-1 text-xs text-gray-500">Tasks are grouped by their due date.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous month" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="rounded-md border p-2 text-gray-600 hover:bg-gray-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="min-w-32 text-center text-sm font-semibold text-gray-900">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
          <button type="button" aria-label="Next month" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="rounded-md border p-2 text-gray-600 hover:bg-gray-50">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px] overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="grid grid-cols-7 border-b bg-gray-50">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => <p key={label} className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = iso(day);
              const dayTasks = byDay.get(key) || [];
              const muted = day.getMonth() !== thisMonth;
              const today = key === iso(new Date());
              return (
                <div key={key} className={`flex h-52 min-h-0 flex-col border-b border-r border-gray-100 p-2 ${muted ? "bg-gray-50/70" : "bg-white"}`}>
                  <p className={`mb-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${today ? "bg-[#781216] text-white" : muted ? "text-gray-400" : "text-gray-700"}`}>{day.getDate()}</p>
                  <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                    {dayTasks.map((task) => (
                      <button key={task.id} type="button" onClick={() => openTask(task)} className={`w-full rounded border px-2 py-1.5 text-left text-[11px] transition-shadow hover:shadow-sm ${statusClass(task.status)} cursor-pointer`}>
                        <p className={task.status === "DONE" ? "truncate font-semibold line-through" : "truncate font-semibold"}>{task.title}</p>
                        <p className="mt-0.5 truncate opacity-75">{task.booking?.bookingReference}{task.booking?.user?.profile?.fullName ? ` · ${task.booking.user.profile.fullName}` : ""}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!tasks.some((task) => task.dueAt) && <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">{emptyMessage}</p>}

      {unscheduled.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">Unscheduled tasks</p>
          </div>
          <div className="divide-y divide-gray-100">
            {unscheduled.map((task) => (
              <button key={task.id} type="button" onClick={() => openTask(task)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50">
                <span>
                  <span className="block text-sm font-medium text-gray-900">{task.title}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">{task.category || "General"}</span>
                </span>
                <span className="text-xs font-semibold text-gray-500">{task.status}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Dialog open={Boolean(selectedTask)} onOpenChange={(open) => { if (!open) setSelectedTask(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Operation task</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold text-gray-900">{selectedTask.title}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {selectedTask.booking?.bookingReference || "No booking reference"}
                  {selectedTask.booking?.user?.profile?.fullName ? ` · ${selectedTask.booking.user.profile.fullName}` : ""}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3">
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="mt-1 font-semibold text-gray-800">{selectedTask.status.replaceAll("_", " ")}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Category</p>
                  <p className="mt-1 font-semibold text-gray-800">{selectedTask.category?.replaceAll("_", " ") || "General"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Due date</p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {selectedTask.dueAt ? new Date(selectedTask.dueAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "Not scheduled"}
                  </p>
                </div>
              </div>

              {selectedTask.status !== "DONE" ? (
                <div className="grid grid-cols-3 gap-3 border-t pt-3">
                  <div>
                    <label className="text-[11px] text-gray-500 font-semibold block mb-1">Unit Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-9 w-full rounded-md border border-input bg-white px-3 text-xs"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      placeholder="₹"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 font-semibold block mb-1">Qty Needed</label>
                    <input
                      type="number"
                      min="0"
                      className="h-9 w-full rounded-md border border-input bg-white px-3 text-xs"
                      value={quantityNeeded}
                      onChange={(e) => setQuantityNeeded(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 font-semibold block mb-1">Qty Acquired</label>
                    <input
                      type="number"
                      min="0"
                      className="h-9 w-full rounded-md border border-input bg-white px-3 text-xs"
                      value={quantityAcquired}
                      onChange={(e) => setQuantityAcquired(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              ) : (
                (selectedTask.unitPrice || selectedTask.quantityNeeded || selectedTask.quantityAcquired) && (
                  <div className="grid grid-cols-3 gap-2 border-t pt-3 text-xs">
                    <div>
                      <p className="text-gray-500">Unit Price</p>
                      <p className="mt-1 font-semibold text-gray-800">₹{Number(selectedTask.unitPrice || 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Qty Needed</p>
                      <p className="mt-1 font-semibold text-gray-800">{selectedTask.quantityNeeded || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Qty Acquired</p>
                      <p className="mt-1 font-semibold text-gray-800">{selectedTask.quantityAcquired || 0}</p>
                    </div>
                  </div>
                )
              )}

              {selectedTask.status !== "DONE" && (
                <div className="flex justify-end gap-2 border-t pt-3">
                  <Button disabled={completing} onClick={markComplete} className="bg-[#781216] text-white hover:bg-[#5f0e11]">
                    {completing ? "Saving…" : "Mark complete"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
