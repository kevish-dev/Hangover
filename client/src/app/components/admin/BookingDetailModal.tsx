import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/axios";
import { finalizeBooking } from "../../../lib/bookingApi";
import { format } from "date-fns";
import {
  X,
  User,
  MapPin,
  IndianRupee,
  CreditCard,
  Image as ImageIcon,
  ClipboardList,
  BookOpen,
  AlertCircle,
  Loader2,
  Bell,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
  RefreshCw,
  ChevronRight,
  Activity,
  Shield,
  Phone,
  Mail,
  Calendar,
  Hash,
  FileText,
  PackagePlus,
} from "lucide-react";
import { toast } from "sonner";
import { showErrorToast } from "../../../lib/errors";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { SyncIndicator } from "../ui/sync-indicator";
import { BookingAddOnsTab } from "./BookingAddOnsTab";

// ─── Shared helpers ───────────────────────────────────────────────
const money = (v: unknown) =>
  `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const LEDGER_CATEGORIES = ["HOTEL", "TRANSPORT", "PERMIT", "VENDOR", "ACTIVITY", "DOCUMENTATION", "PAYMENT_COLLECTION", "SALARY", "MARKETING", "BOOKING_PAYMENT", "REFUND", "OTHER_INCOME", "OTHER_EXPENSE"];

function BookingStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
    RESERVED: "bg-blue-50 text-blue-700 border border-blue-200",
    CONFIRMED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    CANCELLED: "bg-red-50 text-red-700 border border-red-200",
    COMPLETED: "bg-purple-50 text-purple-700 border border-purple-200",
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${map[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    PARTIALLY_PAID: "bg-blue-50 text-blue-700 border border-blue-200",
    PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
    REFUNDED: "bg-purple-50 text-purple-700 border border-purple-200",
    FAILED: "bg-red-50 text-red-700 border border-red-200",
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${map[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status?.replace("_", " ")}
    </span>
  );
}

function TaskHealthBadge({ task }: { task: any }) {
  if (["DONE", "CANCELLED"].includes(task.status)) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
        {task.status}
      </span>
    );
  }
  if (task.status === "BLOCKED") {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
        BLOCKED
      </span>
    );
  }
  const due = task.dueAt ? new Date(task.dueAt).getTime() : null;
  const daysLeft = due ? (due - Date.now()) / 86400000 : null;
  if (daysLeft !== null && daysLeft < 0) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
        OVERDUE
      </span>
    );
  }
  if (
    (daysLeft !== null && daysLeft <= 3) ||
    (Number(task.estimatedAmount) > 0 &&
      Number(task.amountArranged) < Number(task.estimatedAmount))
  ) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        DUE SOON
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
      ON TRACK
    </span>
  );
}

// ─── Tab: Details ─────────────────────────────────────────────────
function DetailsTab({
  booking,
  onCancelRequest,
  onFinalize,
  onRemind,
}: {
  booking: any;
  onCancelRequest: () => void;
  onFinalize: () => void;
  onRemind: () => void;
}) {
  const isCancellable = !["CANCELLED", "COMPLETED"].includes(booking.status);
  const isFinalizable = booking.status === "CONFIRMED";
  const isPartiallyPaid = booking.paymentStatus === "PARTIALLY_PAID";
  const totalPaid = Number(booking.amountPaid || 0);

  const tripItem = booking.customTrip || booking.trip || booking.festival;
  const itemName = tripItem?.title || booking.customTrip?.reference || "N/A";

  return (
    <div className="space-y-6">
      {/* Quick action bar */}
      <div className="flex flex-wrap gap-2">
        {isPartiallyPaid && (
          <button
            onClick={onRemind}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
          >
            <Bell className="w-4 h-4" /> Send Balance Reminder
          </button>
        )}
        {isFinalizable && (
          <button
            onClick={onFinalize}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
          >
            <CalendarCheck className="w-4 h-4" /> Finalize Trip
          </button>
        )}
        {isCancellable && (
          <button
            onClick={onCancelRequest}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
          >
            <XCircle className="w-4 h-4" />
            {totalPaid > 0 ? "Cancel & Refund" : "Cancel Booking"}
          </button>
        )}
      </div>

      {/* Financial cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Total Amount",
            value: money(booking.totalAmount),
            icon: IndianRupee,
            color: "text-gray-700",
            bg: "bg-gray-50",
          },
          {
            label: "Amount Paid",
            value: money(booking.amountPaid),
            icon: ArrowUpRight,
            color: "text-emerald-700",
            bg: "bg-emerald-50",
          },
          {
            label: "Balance Due",
            value: money(booking.amountDue),
            icon: ArrowDownRight,
            color: "text-red-700",
            bg: "bg-red-50",
          },
          {
            label: "Travelers",
            value: booking.numberOfTravelers,
            icon: User,
            color: "text-blue-700",
            bg: "bg-blue-50",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} rounded-2xl p-4 border border-gray-100`}
          >
            <div className={`flex items-center gap-1.5 ${stat.color} mb-1`}>
              <stat.icon className="w-4 h-4" />
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {stat.label}
              </p>
            </div>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Primary Traveler */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <User className="w-4 h-4 text-[#781216]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Primary Traveler
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {[
              {
                icon: User,
                label: "Name",
                value: booking.user?.profile?.fullName || "N/A",
              },
              {
                icon: Mail,
                label: "Email",
                value: booking.user?.email || "N/A",
              },
              {
                icon: Phone,
                label: "Phone",
                value: booking.user?.profile?.phone || "N/A",
              },
              {
                icon: MapPin,
                label: "Address",
                value: booking.user?.profile?.addressLine1 || "N/A",
              },
              {
                icon: Shield,
                label: "Gender",
                value: booking.user?.profile?.gender || "N/A",
              },
              {
                icon: Calendar,
                label: "DOB",
                value: booking.user?.profile?.dateOfBirth
                  ? format(new Date(booking.user.profile.dateOfBirth), "PP")
                  : "N/A",
              },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-3">
                <div className="flex items-center gap-2 min-w-[100px]">
                  <row.icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-500 font-medium">
                    {row.label}
                  </span>
                </div>
                <span className="text-sm text-gray-900 font-medium break-all">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Booking Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#781216]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Trip Details
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {[
              {
                icon: Hash,
                label: "Reference",
                value: booking.bookingReference,
              },
              { icon: MapPin, label: "Item", value: itemName },
              {
                icon: FileText,
                label: "Package",
                value: booking.customTrip
                  ? "Private custom trip"
                  : booking.package?.title || "No Package",
              },
              {
                icon: Calendar,
                label: "Slot",
                value: booking.customTrip
                  ? `${format(new Date(booking.customTrip.startDate), "PP")} – ${format(new Date(booking.customTrip.endDate), "PP")}`
                  : booking.slot
                    ? `${format(new Date(booking.slot.startDate), "PP")} – ${format(new Date(booking.slot.endDate), "PP")}`
                    : "No Slot",
              },
              {
                icon: Calendar,
                label: "Booked On",
                value: format(new Date(booking.createdAt), "PPp"),
              },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-3">
                <div className="flex items-center gap-2 min-w-[100px]">
                  <row.icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-500 font-medium">
                    {row.label}
                  </span>
                </div>
                <span className="text-sm text-gray-900 font-medium break-words">
                  {row.value}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-gray-500 font-medium min-w-[100px]">
                Status
              </span>
              <div className="flex items-center gap-2">
                <BookingStatusBadge status={booking.status} />
                <PaymentStatusBadge status={booking.paymentStatus} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Govt ID */}
      {booking.user?.profile?.govtIdImageUrl && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#781216]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Government ID
            </h3>
          </div>
          <div className="p-4">
            {booking.user.profile.govtIdMimeType === "application/pdf" ? (
              <a
                href={booking.user.profile.govtIdImageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[#781216] underline hover:no-underline"
              >
                <FileText className="w-4 h-4" /> View Government ID PDF
              </a>
            ) : (
              <a
                href={booking.user.profile.govtIdImageUrl}
                target="_blank"
                rel="noreferrer"
                className="block border-2 border-dashed border-gray-200 rounded-xl overflow-hidden hover:border-[#781216] transition-colors max-w-sm"
              >
                <img
                  src={booking.user.profile.govtIdImageUrl}
                  alt="Govt ID"
                  className="w-full h-48 object-cover"
                />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Co-travelers */}
      {booking.travelers?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <User className="w-4 h-4 text-[#781216]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Co-Travelers ({booking.travelers.length})
            </h3>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {booking.travelers.map((t: any, i: number) => (
              <div
                key={t.id || i}
                className="bg-gray-50 rounded-xl p-3 text-sm"
              >
                <p className="font-semibold text-gray-900 mb-2">
                  Traveler {i + 1}: {t.fullName}
                </p>
                <div className="space-y-1 text-xs text-gray-600">
                  {t.gender && <p>Gender: {t.gender}</p>}
                  {t.dateOfBirth && (
                    <p>DOB: {format(new Date(t.dateOfBirth), "PP")}</p>
                  )}
                  {t.phone && <p>Phone: {t.phone}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payments history */}
      {booking.payments?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#781216]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Payment History
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {booking.payments.map((p: any) => (
              <div
                key={p.id}
                className="px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.status === "SUCCESS" ? "bg-emerald-50" : "bg-gray-100"}`}
                  >
                    {p.status === "SUCCESS" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {p.type?.replace("_", " ")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.status} · {format(new Date(p.createdAt), "PP · HH:mm")}
                    </p>
                  </div>
                </div>
                <p
                  className={`font-bold text-sm ${p.status === "SUCCESS" ? "text-emerald-700" : "text-gray-500"}`}
                >
                  {money(p.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Special requests */}
      {booking.specialRequests && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">
            Special Requests
          </p>
          <p className="text-sm text-amber-800 whitespace-pre-wrap">
            {booking.specialRequests}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Operations ──────────────────────────────────────────────
function OperationsTab({
  bookingId,
  queryKeySuffix,
}: {
  bookingId: string;
  queryKeySuffix: string;
}) {
  const queryClient = useQueryClient();
  const [editingTask, setEditingTask] = useState<any>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["admin", "booking-ops", bookingId, queryKeySuffix],
    queryFn: async () => {
      const res = await apiClient.get(`/operations/bookings/${bookingId}`);
      return res.data as any[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: any }) =>
      apiClient.patch(`/operations/${taskId}`, payload),
    onSuccess: async () => {
      toast.success("Task updated");
      await queryClient.invalidateQueries({
        queryKey: ["admin", "booking-ops", bookingId],
      });
      setEditingTask(null);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to update task"),
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => apiClient.delete(`/operations/${taskId}`),
    onSuccess: async () => {
      toast.success("Task deleted");
      await queryClient.invalidateQueries({
        queryKey: ["admin", "booking-ops", bookingId],
      });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to delete task"),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      apiClient.post(`/operations/bookings/${bookingId}`, payload),
    onSuccess: async () => {
      toast.success("Task created");
      await queryClient.invalidateQueries({
        queryKey: ["admin", "booking-ops", bookingId],
      });
      setShowCreateTask(false);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to create task"),
  });

  const [showCreateTask, setShowCreateTask] = useState(false);
  if (isLoading)
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading operations...
      </div>
    );

  const pendingTasks = tasks.filter(
    (t) => !["DONE", "CANCELLED"].includes(t.status),
  );
  const doneTasks = tasks.filter((t) =>
    ["DONE", "CANCELLED"].includes(t.status),
  );

  if (tasks.length === 0)
    return (
      <div className="text-center py-16">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
        <p className="font-semibold text-gray-700">No operational tasks</p>
        <p className="text-sm text-gray-400 mt-1">
          Tasks are generated from circuit templates when bookings are created.
        </p>
      </div>
    );

  const STATUSES = ["PENDING", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"];
  const CATEGORIES = [
    "GENERAL",
    "TRANSPORT",
    "ACCOMMODATION",
    "ACTIVITY",
    "GUIDE",
    "PERMIT",
  ];
  return (
    <div className="space-y-4">
      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {[
          {
            label: "Open",
            count: pendingTasks.length,
            color: "bg-blue-50 text-blue-700 border-blue-200",
          },
          {
            label: "Done",
            count: doneTasks.length,
            color: "bg-emerald-50 text-emerald-700 border-emerald-200",
          },
          {
            label: "Total spend",
            count: money(
              tasks.reduce(
                (s: number, t: any) => s + Number(t.amountPaid || 0),
                0,
              ),
            ),
            color: "bg-gray-100 text-gray-700 border-gray-200",
          },
        ].map((p) => (
          <span
            key={p.label}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border ${p.color}`}
          >
            {p.label}: {p.count}
          </span>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => setShowCreateTask(!showCreateTask)}
          className="bg-[#781216] hover:bg-[#5f0e11] text-white"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add Task
        </Button>
      </div>

      {showCreateTask && (
        <TaskEditorModal
          task={{
            status: "PENDING",
            title: "",
            description: "",
            category: "GENERAL",
            estimatedAmount: 0,
            amountArranged: 0,
            amountPaid: 0,
          }}
          saving={createMutation.isPending}
          onClose={() => setShowCreateTask(false)}
          onSave={(payload) => createMutation.mutate(payload)}
          statuses={STATUSES}
          categories={CATEGORIES}
          isNew={true}
        />
      )}

      {pendingTasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Pending Tasks
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingTasks.map((task: any) => {
              const est = Number(task.estimatedAmount || 0);
              const arr = Number(task.amountArranged || 0);
              const pct =
                est > 0
                  ? Math.min(100, Math.round((arr / est) * 100))
                  : task.status === "DONE"
                    ? 100
                    : 0;
              return (
                <div
                  key={task.id}
                  onClick={() => setEditingTask(task)}
                  className="w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors group cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">
                          {task.title}
                        </p>
                        <TaskHealthBadge task={task} />
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500">
                          {task.category?.replace(/_/g, " ")}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                      {task.dueAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Due: {format(new Date(task.dueAt), "PP")}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="font-bold text-sm text-gray-900">
                          {money(task.amountPaid)}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                          Paid
                        </p>
                      </div>
                      <div className="flex items-center gap-1 mt-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Delete this task?"))
                              deleteMutation.mutate(task.id);
                          }}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-600 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                  {est > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>
                          Arranged {money(arr)} / {money(est)}
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#c8a96e]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {doneTasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Completed / Cancelled Tasks
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {doneTasks.map((task: any) => (
              <div
                key={task.id}
                onClick={() => setEditingTask(task)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors opacity-60 group cursor-pointer"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p className="text-sm text-gray-700">{task.title}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-700">
                        {money(task.amountPaid)}
                      </span>
                    </div>
                    <TaskHealthBadge task={task} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Delete this task?"))
                          deleteMutation.mutate(task.id);
                      }}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task editor modal */}
      {editingTask && (
        <TaskEditorModal
          task={editingTask}
          saving={updateMutation.isPending}
          onClose={() => setEditingTask(null)}
          onSave={(payload) =>
            updateMutation.mutate({ taskId: editingTask.id, payload })
          }
          statuses={STATUSES}
        />
      )}
    </div>
  );
}

function TaskEditorModal({
  task,
  saving,
  onClose,
  onSave,
  statuses,
  categories,
  isNew,
}: {
  task: any;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: any) => void;
  statuses: string[];
  categories?: string[];
  isNew?: boolean;
}) {
  const [values, setValues] = useState({
    status: task.status || "PENDING",
    category: task.category || "GENERAL",
    title: task.title || "",
    description: task.description || "",
    estimatedAmount: String(task.estimatedAmount || 0),
    amountArranged: String(task.amountArranged || 0),
    amountPaid: String(task.amountPaid || 0),
    dueAt: task.dueAt ? format(new Date(task.dueAt), "yyyy-MM-dd'T'HH:mm") : "",
  });

  const handleSave = () => {
    const payload: any = {};
    if (values.status !== task.status) payload.status = values.status;
    if (values.title.trim() !== task.title.trim())
      payload.title = values.title.trim();
    if (values.description.trim() !== (task.description || "").trim())
      payload.description = values.description.trim() || null;
    const est = Number(values.estimatedAmount);
    const arr = Number(values.amountArranged);
    const paid = Number(values.amountPaid);
    if (est !== Number(task.estimatedAmount || 0))
      payload.estimatedAmount = est;
    if (arr !== Number(task.amountArranged || 0)) payload.amountArranged = arr;
    if (paid !== Number(task.amountPaid || 0)) payload.amountPaid = paid;
    if (
      values.dueAt !==
      (task.dueAt ? format(new Date(task.dueAt), "yyyy-MM-dd'T'HH:mm") : "")
    ) {
      payload.dueAt = values.dueAt
        ? new Date(values.dueAt).toISOString()
        : null;
    }

    if (isNew) {
      if (!payload.title && !values.title.trim())
        return toast.error("Title is required.");
      if (!payload.category && !values.category)
        return toast.error("Category is required.");
      return onSave({ ...values, ...payload });
    }

    if (Object.keys(payload).length === 0)
      return toast.info("No changes to save.");
    if (paid > arr)
      return toast.error("Paid amount cannot exceed arranged amount.");
    onSave(payload);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#781216]">
              {task.category?.replace(/_/g, " ") || "New Task"}
            </p>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">
              {isNew ? "Create Task" : task.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {isNew ? (
              <div>
                <Label>Category</Label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={values.category}
                  onChange={(e) =>
                    setValues({ ...values, category: e.target.value })
                  }
                >
                  {categories?.map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <Label>Status</Label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={values.status}
                  onChange={(e) =>
                    setValues({ ...values, status: e.target.value })
                  }
                >
                  {statuses.map((s) => (
                    <option key={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label>Due Date</Label>
              <Input
                type="datetime-local"
                className="mt-1"
                value={values.dueAt}
                onChange={(e) =>
                  setValues({ ...values, dueAt: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <Label>Title</Label>
            <Input
              className="mt-1"
              value={values.title}
              onChange={(e) => setValues({ ...values, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              className="mt-1"
              rows={2}
              value={values.description}
              onChange={(e) =>
                setValues({ ...values, description: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Needed", key: "estimatedAmount" },
              { label: "Arranged", key: "amountArranged" },
              { label: "Paid", key: "amountPaid" },
            ].map((f) => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="mt-1"
                  value={(values as any)[f.key]}
                  onChange={(e) =>
                    setValues({ ...values, [f.key]: e.target.value })
                  }
                />
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-[#fcf8ef] border border-[#eadcb9] px-4 py-3 text-sm text-[#6d541f]">
            Updating the paid amount automatically syncs with the balance sheet
            ledger.
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={saving}
            onClick={handleSave}
            className="bg-[#781216] hover:bg-[#5f0e11]"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{" "}
            {isNew ? "Create Task" : "Save Task"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Balance Sheet ───────────────────────────────────────────
export function BalanceSheetTab({
  bookingId,
  queryKeySuffix,
}: {
  bookingId: string;
  queryKeySuffix: string;
}) {
  const queryClient = useQueryClient();
  const [newEntry, setNewEntry] = useState({
    type: "EXPENSE",
    category: "HOTEL",
    amount: "",
    description: "",
    entryDate: format(new Date(), "yyyy-MM-dd"),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "booking-ledger", bookingId, queryKeySuffix],
    queryFn: async () => {
      const res = await apiClient.get(
        `/ledgers/bookings/${bookingId}/balance-sheet`,
      );
      return res.data as {
        bookingId: string;
        entries: any[];
        summary: {
          totalIncome: number;
          totalExpense: number;
          netBalance: number;
        };
      };
    },
  });

  const addMutation = useMutation({
    mutationFn: (payload: any) =>
      apiClient.post(
        `/ledgers/bookings/${bookingId}/balance-sheet/entries`,
        payload,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "booking-ledger", bookingId],
      });
      setNewEntry({
        type: "EXPENSE",
        category: "HOTEL",
        amount: "",
        description: "",
        entryDate: format(new Date(), "yyyy-MM-dd"),
      });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to add entry"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.patch(`/ledgers/entries/${id}`, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "booking-ledger", bookingId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to update entry"),
  });

  const deleteMutation = useMutation({
    mutationFn: (entryId: string) =>
      apiClient.delete(
        `/ledgers/bookings/${bookingId}/balance-sheet/entries/${entryId}`,
      ),
    onSuccess: async () => {
      toast.success("Entry deleted");
      await queryClient.invalidateQueries({
        queryKey: ["admin", "booking-ledger", bookingId],
      });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to delete entry"),
  });

  const handleCellChange = (entry: any, field: string, value: any) => {
    if (entry.isAutoGenerated) return;
    if (entry[field] == value) return;
    if (field === "entryDate") value = value ? new Date(value).toISOString() : null;
    updateMutation.mutate({ id: entry.id, data: { [field]: value } });
  };

  const handleAdd = () => {
    const amount = Number(newEntry.amount);
    if (!amount || amount <= 0) return toast.error("Amount must be positive");
    addMutation.mutate({
      type: newEntry.type,
      category: newEntry.category,
      amount,
      description: newEntry.description.trim() || undefined,
      entryDate: new Date(`${newEntry.entryDate}T12:00:00`).toISOString(),
    });
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading balance sheet...
      </div>
    );

  const summary = data?.summary;
  const entries = data?.entries || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-900">Ledger Entries</h3>
        <SyncIndicator isMutating={addMutation.isPending || updateMutation.isPending || deleteMutation.isPending} isError={addMutation.isError || updateMutation.isError || deleteMutation.isError} />
      </div>

      {/* Excel grid */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-100 border-b-2 border-gray-300 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 font-semibold text-gray-600 border-r border-gray-300 w-32">Date</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600 border-r border-gray-300 w-28">Type</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600 border-r border-gray-300 w-40">Category</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600 border-r border-gray-300">Description</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600 border-r border-gray-300 w-32 text-right">Amount ₹</th>
                <th className="px-2 py-2.5 text-gray-600 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry: any) => (
                <tr key={entry.id} className={`group transition-colors ${entry.isAutoGenerated ? "bg-gray-50/50" : "hover:bg-blue-50/20"}`}>
                  <td className="border-r border-gray-200 p-0">
                    <input type="date" defaultValue={format(new Date(entry.entryDate), "yyyy-MM-dd")}
                      disabled={entry.isAutoGenerated}
                      onBlur={(e) => handleCellChange(entry, "entryDate", e.target.value)}
                      className="w-full min-h-10 px-3 bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 text-xs disabled:opacity-50 disabled:cursor-not-allowed" />
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    {entry.isAutoGenerated ? (
                      <div className="min-h-10 px-3 flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${entry.type === "INCOME" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{entry.type}</span>
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">AUTO</span>
                      </div>
                    ) : (
                      <Select defaultValue={entry.type} onValueChange={(val) => handleCellChange(entry, "type", val)}>
                        <SelectTrigger className={`h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 font-bold text-[11px] ${entry.type === "INCOME" ? "text-emerald-700" : "text-red-700"}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INCOME">INCOME</SelectItem>
                          <SelectItem value="EXPENSE">EXPENSE</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    {entry.isAutoGenerated ? (
                      <div className="min-h-10 px-3 flex items-center text-gray-700 font-medium text-xs">{entry.category}</div>
                    ) : (
                      <Select defaultValue={entry.category} onValueChange={(val) => handleCellChange(entry, "category", val)}>
                        <SelectTrigger className="h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEDGER_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input type="text" defaultValue={entry.description || ""}
                      disabled={entry.isAutoGenerated}
                      onBlur={(e) => handleCellChange(entry, "description", e.target.value)}
                      placeholder={entry.isAutoGenerated ? entry.source || "" : "Description..."}
                      className="w-full min-h-10 px-3 bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed" />
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input type="number" step="0.01" defaultValue={entry.amount}
                      disabled={entry.isAutoGenerated}
                      onBlur={(e) => handleCellChange(entry, "amount", e.target.value)}
                      className={`w-full min-h-10 px-3 bg-transparent outline-none text-right font-mono font-semibold focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed ${entry.type === "INCOME" ? "text-emerald-700" : "text-red-700"}`} />
                  </td>
                  <td className="p-0 text-center">
                    {!entry.isAutoGenerated && (
                      <button onClick={() => window.confirm("Delete this entry?") && deleteMutation.mutate(entry.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1.5 opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {/* New row */}
              <tr className="bg-emerald-50/30 border-t-2 border-emerald-200">
                <td className="border-r border-gray-200 p-0">
                  <input type="date" value={newEntry.entryDate} onChange={(e) => setNewEntry({...newEntry, entryDate: e.target.value})}
                    className="w-full min-h-10 px-3 bg-transparent outline-none focus:bg-emerald-100 text-xs" />
                </td>
                <td className="border-r border-gray-200 p-0">
                  <Select value={newEntry.type} onValueChange={(val) => setNewEntry({...newEntry, type: val})}>
                    <SelectTrigger className={`h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-emerald-100 font-bold text-[11px] ${newEntry.type === "INCOME" ? "text-emerald-700" : "text-red-700"}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCOME">INCOME</SelectItem>
                      <SelectItem value="EXPENSE">EXPENSE</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="border-r border-gray-200 p-0">
                  <Select value={newEntry.category} onValueChange={(val) => setNewEntry({...newEntry, category: val})}>
                    <SelectTrigger className="h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-emerald-100 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEDGER_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border-r border-gray-200 p-0">
                  <input type="text" value={newEntry.description} placeholder="Description (optional)"
                    onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    className="w-full min-h-10 px-3 bg-transparent outline-none focus:bg-emerald-100 text-gray-600 placeholder:text-gray-300" />
                </td>
                <td className="border-r border-gray-200 p-0">
                  <input type="number" step="0.01" value={newEntry.amount} placeholder="Amount..."
                    onChange={(e) => setNewEntry({...newEntry, amount: e.target.value})}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    className={`w-full min-h-10 px-3 bg-transparent outline-none text-right font-mono font-semibold focus:bg-emerald-100 placeholder:text-gray-300 ${newEntry.type === "INCOME" ? "text-emerald-700" : "text-red-700"}`} />
                </td>
                <td className="p-0 text-center">
                  <button onClick={handleAdd} disabled={addMutation.isPending}
                    className="text-emerald-500 hover:text-emerald-700 transition-colors p-1.5">
                    {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Cancel modal ─────────────────────────────────────────────────
function CancelRefundModal({
  booking,
  onConfirm,
  onClose,
}: {
  booking: any;
  onConfirm: (refundAmount?: number) => void;
  onClose: () => void;
}) {
  const totalPaid = Number(booking?.amountPaid || 0);
  const [refundAmount, setRefundAmount] = useState(String(totalPaid));

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h2 className="font-bold text-red-900">Confirm Cancellation</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-red-100 text-red-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          {totalPaid > 0 ? (
            <>
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                This booking has received payments totaling{" "}
                <strong>{money(totalPaid)}</strong>. Specify the refund amount.
              </p>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Refund Amount (Max: {money(totalPaid)})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    max={totalPaid}
                    min={0}
                    className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 text-sm"
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setRefundAmount(String(totalPaid))}
                    className="text-xs text-[#781216] font-semibold hover:underline"
                  >
                    Full refund ({money(totalPaid)})
                  </button>
                  <span className="text-gray-300">·</span>
                  <button
                    onClick={() => setRefundAmount("0")}
                    className="text-xs text-gray-500 font-semibold hover:underline"
                  >
                    No refund
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-700 mb-6 leading-relaxed">
              Are you sure you want to cancel this booking? This action cannot
              be undone.
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Keep Booking
            </button>
            <button
              onClick={() => {
                if (totalPaid > 0) {
                  const amount = Number(refundAmount);
                  if (isNaN(amount) || amount < 0 || amount > totalPaid) {
                    return toast.error("Please enter a valid refund amount.");
                  }
                  onConfirm(amount);
                } else {
                  onConfirm();
                }
              }}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm"
            >
              {totalPaid > 0 ? "Cancel & Refund" : "Cancel Booking"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────
type Tab = "details" | "operations" | "addons" | "balance-sheet";

export function BookingDetailModal({
  booking,
  onClose,
  queryKeySuffix = "",
  onRefetch,
}: {
  booking: any;
  onClose: () => void;
  queryKeySuffix?: string;
  onRefetch?: () => void;
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [showCancelModal, setShowCancelModal] = useState(false);

  const finalizeMutation = useMutation({
    mutationFn: () => finalizeBooking(booking.id),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      onRefetch?.();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to finalize booking"),
  });

  const cancelMutation = useMutation({
    mutationFn: (refundAmount?: number) =>
      apiClient.post(`/bookings/${booking.id}/cancel-and-refund`, {
        reason: "Admin initiated cancellation",
        ...(refundAmount !== undefined && { refundAmount }),
      }),
    onSuccess: () => {
      toast.success("Booking cancelled successfully");
      setShowCancelModal(false);
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      onRefetch?.();
      onClose();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to cancel booking"),
  });

  const handleRemind = async () => {
    const id = toast.loading("Sending reminder email...");
    try {
      await apiClient.post("/payments/reminders/send", {
        bookingId: booking.id,
      });
      toast.success("Reminder email sent!", { id });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send reminder", {
        id,
      });
    }
  };

  const handleFinalize = () => {
    toast("Finalize this trip?", {
      description: "Mark this trip as COMPLETED and send a review email to the guest?",
      action: {
        label: "Confirm",
        onClick: () => finalizeMutation.mutate(),
      },
    });
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "details", label: "Details", icon: User },
    { key: "operations", label: "Operations", icon: Activity },
    { key: "addons", label: "Add-ons", icon: PackagePlus },
    { key: "balance-sheet", label: "Balance Sheet", icon: BookOpen },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-white w-full md:max-w-3xl max-h-[95dvh] md:max-h-[90vh] h-dvh md:h-auto overflow-hidden flex flex-col rounded-none md:rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="shrink-0 px-5 py-4 border-b border-gray-100 flex items-start md:items-center justify-between gap-3 bg-white">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#781216]">
                Booking Details
              </p>
              <h2 className="text-base md:text-lg font-bold text-gray-900 truncate">
                <span className="font-mono text-[#c8a96e]">
                  {booking.bookingReference}
                </span>
                {" · "}
                <span className="text-gray-700 text-base">
                  {booking.customTrip?.title ||
                    booking.trip?.title ||
                    booking.festival?.title}
                </span>
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="shrink-0 flex border-b border-gray-100 bg-gray-50/50 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-[#781216] text-[#781216]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === "details" && (
              <DetailsTab
                booking={booking}
                onCancelRequest={() => setShowCancelModal(true)}
                onFinalize={handleFinalize}
                onRemind={handleRemind}
              />
            )}
            {activeTab === "operations" && (
              <OperationsTab
                bookingId={booking.id}
                queryKeySuffix={queryKeySuffix}
              />
            )}
            {activeTab === "addons" && <BookingAddOnsTab booking={booking} />}
            {activeTab === "balance-sheet" && (
              <BalanceSheetTab
                bookingId={booking.id}
                queryKeySuffix={queryKeySuffix}
              />
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-gray-100 px-5 py-3 flex justify-end gap-2 bg-white">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {activeTab === "details" && (
              <div className="flex items-center gap-2">
                <BookingStatusBadge status={booking.status} />
                <PaymentStatusBadge status={booking.paymentStatus} />
              </div>
            )}
          </div>
        </div>
      </div>

      {showCancelModal && (
        <CancelRefundModal
          booking={booking}
          onConfirm={(refundAmount) => cancelMutation.mutate(refundAmount)}
          onClose={() => setShowCancelModal(false)}
        />
      )}
    </>
  );
}
