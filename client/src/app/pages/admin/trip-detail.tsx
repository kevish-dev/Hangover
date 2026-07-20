import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/axios";
import { format } from "date-fns";
import {
  ArrowLeft,
  Map,
  MapPin,
  Calendar,
  Users,
  IndianRupee,
  Loader2,
  Edit2,
  Eye,
  EyeOff,
  Link2,
  CalendarCheck,
  Activity,
  BookOpen,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownRight,
  WalletCards,
  Search,
  Plus,
  Trash2,
  SlidersHorizontal,
  X,
  ChevronRight,
  Filter,
  Clock,
  BarChart2,
  Users2,
  Target,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { BookingDetailModal } from "../../components/admin/BookingDetailModal";
import { TripFormModal } from "../../components/admin/TripFormModal";
import { formatTripType } from "../../../lib/tripApi";
import { paymentApi } from "../../../lib/paymentApi";
import { showErrorToast } from "../../../lib/errors";

// ─── Shared helpers ───────────────────────────────────────────────
const money = (v: unknown) =>
  `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

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

function TransactionStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    SUCCESS: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
    FAILED: "bg-red-50 text-red-700 border border-red-200",
    REFUNDED: "bg-purple-50 text-purple-700 border border-purple-200",
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
  if (daysLeft !== null && daysLeft < 0)
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
        OVERDUE
      </span>
    );
  if (
    (daysLeft !== null && daysLeft <= 3) ||
    (Number(task.estimatedAmount) > 0 &&
      Number(task.amountArranged) < Number(task.estimatedAmount))
  )
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        DUE SOON
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
      ON TRACK
    </span>
  );
}

// ─── Tab 1: Bookings ──────────────────────────────────────────────
function BookingsTab({ tripId }: { tripId: string }) {
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [refetchKey, setRefetchKey] = useState(0);

  const {
    data: bookings = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin", "trip-bookings", tripId],
    queryFn: async () => {
      const res = await apiClient.get(`/bookings/trip/${tripId}`);
      return res.data as any[];
    },
  });

  const filtered = bookings.filter((b: any) => {
    if (
      statusFilter !== "ALL" &&
      b.status !== statusFilter &&
      b.paymentStatus !== statusFilter
    )
      return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.bookingReference?.toLowerCase().includes(q) ||
      b.user?.profile?.fullName?.toLowerCase().includes(q) ||
      b.user?.email?.toLowerCase().includes(q)
    );
  });

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading bookings...
      </div>
    );

  const totalRevenue = bookings.reduce(
    (s: number, b: any) => s + Number(b.totalAmount || 0),
    0,
  );
  const totalCollected = bookings.reduce(
    (s: number, b: any) => s + Number(b.amountPaid || 0),
    0,
  );
  const confirmedCount = bookings.filter(
    (b: any) => b.status === "CONFIRMED",
  ).length;

  return (
    <>
      <div className="space-y-4">
        {/* Mini stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Total Bookings",
              value: bookings.length,
              icon: Users2,
              color: "text-blue-700 bg-blue-50",
            },
            {
              label: "Confirmed",
              value: confirmedCount,
              icon: CheckCircle2,
              color: "text-emerald-700 bg-emerald-50",
            },
            {
              label: "Revenue",
              value: money(totalRevenue),
              icon: IndianRupee,
              color: "text-[#781216] bg-red-50",
            },
            {
              label: "Collected",
              value: money(totalCollected),
              icon: ArrowUpRight,
              color: "text-emerald-700 bg-emerald-50",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${s.color.split(" ").slice(1).join(" ")}`}
              >
                <s.icon className={`w-4 h-4 ${s.color.split(" ")[0]}`} />
              </div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40 bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="RESERVED">Reserved</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
          </select>
        </div>

        {/* Booking list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Users2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No bookings found</p>
            <p className="text-gray-400 text-sm mt-1">
              Try adjusting the filters
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {filtered.length} booking(s)
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {filtered.map((b: any) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBooking(b)}
                  className="w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#781216]">
                          {b.bookingReference}
                        </span>
                        <BookingStatusBadge status={b.status} />
                        <PaymentStatusBadge status={b.paymentStatus} />
                      </div>
                      <p className="font-semibold text-gray-900 mt-1">
                        {b.user?.profile?.fullName || "Unknown Guest"}
                      </p>
                      <p className="text-xs text-gray-500">{b.user?.email}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span>{b.numberOfTravelers} traveler(s)</span>
                        <span>·</span>
                        <span>
                          Booked {format(new Date(b.createdAt), "PP")}
                        </span>
                        {b.slot?.startDate && (
                          <>
                            <span>·</span>
                            <span>
                              Departs {format(new Date(b.slot.startDate), "PP")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-gray-900">
                        {money(b.totalAmount)}
                      </p>
                      <p className="text-xs text-emerald-600 font-semibold">
                        {money(b.amountPaid)} paid
                      </p>
                      {Number(b.amountDue) > 0 && (
                        <p className="text-xs text-red-500 font-semibold">
                          {money(b.amountDue)} due
                        </p>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 ml-auto mt-1 transition-colors" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          queryKeySuffix={`trip-${tripId}`}
          onRefetch={() => {
            refetch();
            setRefetchKey((k) => k + 1);
          }}
        />
      )}
    </>
  );
}

// ─── Tab 2: Operations ────────────────────────────────────────────
const STATUSES_OPS = ["PENDING", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"];
const CATEGORIES = [
  "HOTEL",
  "TRANSPORT",
  "PERMIT",
  "VENDOR",
  "ACTIVITY",
  "DOCUMENTATION",
  "PAYMENT_COLLECTION",
  "GENERAL",
];

function OperationsTab({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editingTask, setEditingTask] = useState<any>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);

  const { data: bookings = [] } = useQuery({
    queryKey: ["admin", "trip-bookings", tripId],
    queryFn: async () => {
      const res = await apiClient.get(`/bookings/trip/${tripId}`);
      return res.data as any[];
    },
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["admin", "trip-ops", tripId],
    queryFn: async () => {
      const res = await apiClient.get(`/operations`, {
        params: { tripId, limit: 500 },
      });
      return res.data as any[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: any }) =>
      apiClient.patch(`/operations/${taskId}`, payload),
    onSuccess: async () => {
      toast.success("Task updated");
      await queryClient.invalidateQueries({
        queryKey: ["admin", "trip-ops", tripId],
      });
      setEditingTask(null);
    },
    onError: (err: any) => showErrorToast(err, "Failed to update task"),
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => apiClient.delete(`/operations/${taskId}`),
    onSuccess: async () => {
      toast.success("Task deleted");
      await queryClient.invalidateQueries({
        queryKey: ["admin", "trip-ops", tripId],
      });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to delete task"),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => {
      const { bookingId, ...rest } = payload;
      return apiClient.post(`/operations/bookings/${bookingId}`, rest);
    },
    onSuccess: async () => {
      toast.success("Task created");
      await queryClient.invalidateQueries({
        queryKey: ["admin", "trip-ops", tripId],
      });
      setShowCreateTask(false);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to create task"),
  });

  const filtered = tasks.filter((t: any) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (categoryFilter && t.category !== categoryFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [
      t.title,
      t.description,
      t.booking?.bookingReference,
      t.booking?.user?.profile?.fullName,
      t.booking?.user?.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const openTasks = tasks.filter(
    (t: any) => !["DONE", "CANCELLED"].includes(t.status),
  );
  const overdue = tasks.filter((t: any) => {
    if (["DONE", "CANCELLED"].includes(t.status)) return false;
    const due = t.dueAt ? new Date(t.dueAt).getTime() : null;
    return due !== null && due < Date.now();
  });
  const totalSpend = tasks.reduce(
    (s: number, t: any) => s + Number(t.amountPaid || 0),
    0,
  );

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading operations...
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Open Tasks",
            value: openTasks.length,
            icon: SlidersHorizontal,
            color: "text-blue-700 bg-blue-50",
          },
          {
            label: "Overdue",
            value: overdue.length,
            icon: AlertTriangle,
            color:
              overdue.length > 0
                ? "text-red-700 bg-red-50"
                : "text-gray-500 bg-gray-100",
          },
          {
            label: "Total Tasks",
            value: tasks.length,
            icon: CheckCircle2,
            color: "text-gray-700 bg-gray-100",
          },
          {
            label: "Spent",
            value: money(totalSpend),
            icon: CircleDollarSign,
            color: "text-[#781216] bg-red-50",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${s.color.split(" ").slice(1).join(" ")}`}
            >
              <s.icon className={`w-4 h-4 ${s.color.split(" ")[0]}`} />
            </div>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm items-center">
        <div className="relative md:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Task, booking, traveler..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none bg-white"
        >
          <option value="">All Statuses</option>
          {STATUSES_OPS.map((s) => (
            <option key={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none bg-white"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c.replace(/_/g, " ")}</option>
          ))}
        </select>
        <Button
          onClick={() => setShowCreateTask(!showCreateTask)}
          className="bg-[#781216] hover:bg-[#5f0e11] shrink-0"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add Task
        </Button>
      </div>

      {showCreateTask && (
        <OpsTaskEditorModal
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
          isNew={true}
          bookings={bookings}
        />
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            No tasks match your filters
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              {filtered.length} task(s)
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {filtered.map((task: any) => {
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
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setEditingTask(task); }}
                  className="w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors group cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">
                          {task.title}
                        </p>
                        <TaskHealthBadge task={task} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          {task.category?.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {task.booking?.user?.profile?.fullName ||
                          task.booking?.user?.email}{" "}
                        · {task.booking?.bookingReference}
                      </p>
                      {task.dueAt && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Due: {format(new Date(task.dueAt), "PP")}
                        </p>
                      )}
                      {est > 0 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                            <span>Arranged {money(arr)}</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#c8a96e] transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Req. {money(est)}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="font-bold text-gray-900 text-sm">
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
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editingTask && (
        <OpsTaskEditorModal
          task={editingTask}
          saving={updateMutation.isPending}
          onClose={() => setEditingTask(null)}
          onSave={(payload: any) =>
            updateMutation.mutate({ taskId: editingTask.id, payload })
          }
        />
      )}
    </div>
  );
}

function OpsTaskEditorModal({
  task,
  saving,
  onClose,
  onSave,
  isNew,
  bookings,
}: {
  task: any;
  saving: boolean;
  onClose: () => void;
  onSave: (p: any) => void;
  isNew?: boolean;
  bookings?: any[];
}) {
  const [values, setValues] = useState({
    bookingId: task.bookingId || "",
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
    if (isNew) {
      if (!values.bookingId) return toast.error("Booking is required.");
      if (!values.title.trim()) return toast.error("Title is required.");
      return onSave({
        ...values,
        title: values.title.trim(),
        estimatedAmount: Number(values.estimatedAmount),
        amountArranged: Number(values.amountArranged),
        amountPaid: Number(values.amountPaid),
        dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : null,
      });
    }

    if (values.status !== task.status) payload.status = values.status;
    const trimTitle = values.title.trim();
    if (trimTitle !== task.title.trim()) payload.title = trimTitle;
    if (values.description.trim() !== (task.description || "").trim())
      payload.description = values.description.trim() || null;
    const est = Number(values.estimatedAmount);
    const arr = Number(values.amountArranged);
    const paid = Number(values.amountPaid);
    if (est !== Number(task.estimatedAmount || 0))
      payload.estimatedAmount = est;
    if (arr !== Number(task.amountArranged || 0)) payload.amountArranged = arr;
    if (paid !== Number(task.amountPaid || 0)) payload.amountPaid = paid;
    if (paid > arr) return toast.error("Paid cannot exceed arranged.");
    const origDue = task.dueAt
      ? format(new Date(task.dueAt), "yyyy-MM-dd'T'HH:mm")
      : "";
    if (values.dueAt !== origDue)
      payload.dueAt = values.dueAt
        ? new Date(values.dueAt).toISOString()
        : null;
    if (Object.keys(payload).length === 0) return toast.info("No changes.");
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
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#781216]">
              {task.category?.replace(/_/g, " ") || "New Task"}
            </p>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">
              {isNew ? "Create Task" : task.title}
            </h2>
            {!isNew && (
              <p className="text-xs text-gray-500 mt-0.5">
                {task.booking?.user?.profile?.fullName} ·{" "}
                {task.booking?.bookingReference}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {isNew && (
            <div>
              <Label>Booking</Label>
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={values.bookingId}
                onChange={(e) =>
                  setValues({ ...values, bookingId: e.target.value })
                }
              >
                <option value="">Select a booking</option>
                {bookings?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bookingReference} - {b.user?.profile?.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}
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
                  {CATEGORIES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
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
                  {STATUSES_OPS.map((s) => (
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
          <div className="bg-[#fcf8ef] border border-[#eadcb9] rounded-xl px-4 py-3 text-sm text-[#6d541f]">
            Updating paid amount syncs with the ledger.
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
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Save
            Task
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 3: Ledger ────────────────────────────────────────────────
function LedgerTab({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({
    type: "INCOME",
    category: "",
    amount: "",
    description: "",
    entryDate: format(new Date(), "yyyy-MM-dd"),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "trip-ledger", tripId],
    queryFn: async () => {
      const res = await apiClient.get(`/ledgers`, {
        params: { tripId, limit: 1000 },
      });
      return res.data as { entries: any[]; summary: any };
    },
  });

  const addMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post(`/ledgers/entries`, payload),
    onSuccess: async () => {
      toast.success("Entry added");
      await queryClient.invalidateQueries({
        queryKey: ["admin", "trip-ledger", tripId],
      });
      setShowAdd(false);
      setNewEntry({
        type: "INCOME",
        category: "",
        amount: "",
        description: "",
        entryDate: format(new Date(), "yyyy-MM-dd"),
      });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to add entry"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/ledgers/entries/${id}`),
    onSuccess: async () => {
      toast.success("Entry deleted");
      await queryClient.invalidateQueries({
        queryKey: ["admin", "trip-ledger", tripId],
      });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to delete"),
  });

  const handleAdd = () => {
    if (!newEntry.category.trim()) return toast.error("Category required");
    const amount = Number(newEntry.amount);
    if (!amount || amount <= 0) return toast.error("Amount must be positive");
    addMutation.mutate({
      type: newEntry.type,
      scope: "TRIP",
      tripId,
      category: newEntry.category.trim(),
      amount,
      description: newEntry.description.trim() || undefined,
      entryDate: new Date(`${newEntry.entryDate}T12:00:00`).toISOString(),
    });
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading ledger...
      </div>
    );

  const summary = data?.summary;
  const entries = (data?.entries || []).filter((e: any) => {
    if (typeFilter && e.type !== typeFilter) return false;
    if (!search.trim()) return true;
    return [e.category, e.description, e.booking?.bookingReference]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      {/* Filters + Add */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Category, description, booking ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none bg-white"
        >
          <option value="">All Types</option>
          <option>INCOME</option>
          <option>EXPENSE</option>
        </select>
        <Button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-[#781216] hover:bg-[#5f0e11] shrink-0"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add Entry
        </Button>
      </div>

      {showAdd && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">
            New Ledger Entry (Trip-scoped)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={newEntry.type}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, type: e.target.value })
                }
              >
                <option>INCOME</option>
                <option>EXPENSE</option>
              </select>
            </div>
            <div>
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                min={0}
                className="mt-1"
                value={newEntry.amount}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, amount: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Input
              className="mt-1"
              placeholder="Hotel, Transport, Commission..."
              value={newEntry.category}
              onChange={(e) =>
                setNewEntry({ ...newEntry, category: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea
              rows={2}
              className="mt-1"
              value={newEntry.description}
              onChange={(e) =>
                setNewEntry({ ...newEntry, description: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Entry Date</Label>
            <Input
              type="date"
              className="mt-1"
              value={newEntry.entryDate}
              onChange={(e) =>
                setNewEntry({ ...newEntry, entryDate: e.target.value })
              }
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button
              disabled={addMutation.isPending}
              onClick={handleAdd}
              className="bg-[#781216] hover:bg-[#5f0e11]"
            >
              {addMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Add Entry
            </Button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
          No ledger entries match your filters.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              {entries.length} entr(ies)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold border-r border-gray-200">
                    Date
                  </th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-200">
                    Category
                  </th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-200">
                    Description
                  </th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-200">
                    Context
                  </th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-200">
                    Type
                  </th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-200 text-right">
                    Amount
                  </th>
                  <th className="px-4 py-3 font-semibold text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.map((entry: any) => {
                  const context = entry.booking?.bookingReference || "Non-trip";
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-2 border-r border-gray-200 text-gray-700">
                        {format(new Date(entry.entryDate), "dd MMM yyyy")}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200 font-medium text-gray-900">
                        {entry.category}
                      </td>
                      <td
                        className="px-4 py-2 border-r border-gray-200 text-gray-600 max-w-[200px] truncate"
                        title={entry.description || ""}
                      >
                        {entry.description || "-"}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200">
                        <div className="text-gray-900">{context}</div>
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${entry.type === "INCOME" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                          >
                            {entry.type}
                          </span>
                          {entry.isAutoGenerated && (
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                              AUTO
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-2 border-r border-gray-200 text-right font-medium ${entry.type === "INCOME" ? "text-emerald-700" : "text-red-700"}`}
                      >
                        {entry.type === "INCOME" ? "+" : "−"}
                        {money(entry.amount)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {!entry.isAutoGenerated && (
                          <button
                            type="button"
                            aria-label="Delete manual entry"
                            onClick={() =>
                              window.confirm("Delete this entry?") &&
                              deleteMutation.mutate(entry.id)
                            }
                            className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: Revenue Dashboard ─────────────────────────────────────
function RevenueDashboardTab({ tripId }: { tripId: string }) {
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["admin", "trip-bookings", tripId],
    queryFn: async () => {
      const res = await apiClient.get(`/bookings/trip/${tripId}`);
      return res.data as any[];
    },
  });
  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ["admin", "trip-ledger", tripId],
    queryFn: async () => {
      const res = await apiClient.get(`/ledgers`, {
        params: { tripId, limit: 1000 },
      });
      return res.data as { entries: any[]; summary: any };
    },
  });
  const { data: opsData = [], isLoading: opsLoading } = useQuery({
    queryKey: ["admin", "trip-ops", tripId],
    queryFn: async () => {
      const res = await apiClient.get(`/operations`, {
        params: { tripId, limit: 500 },
      });
      return res.data as any[];
    },
  });

  if (bookingsLoading || ledgerLoading || opsLoading)
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading analytics...
      </div>
    );

  const totalRevenue = bookings.reduce(
    (s: number, b: any) => s + Number(b.totalAmount || 0),
    0,
  );
  const totalCollected = bookings.reduce(
    (s: number, b: any) => s + Number(b.amountPaid || 0),
    0,
  );
  const totalDue = bookings.reduce(
    (s: number, b: any) => s + Number(b.amountDue || 0),
    0,
  );
  const totalExpenses = Number(ledgerData?.summary?.tripExpense || 0);
  const grossProfit = totalCollected - totalExpenses;
  const collectionRate =
    totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0;
  const totalTravelers = bookings.reduce(
    (s: number, b: any) => s + Number(b.numberOfTravelers || 0),
    0,
  );
  const avgBookingValue =
    bookings.length > 0 ? totalRevenue / bookings.length : 0;

  const statusDist = bookings.reduce(
    (acc: any, b: any) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const paymentDist = bookings.reduce(
    (acc: any, b: any) => {
      acc[b.paymentStatus] = (acc[b.paymentStatus] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const openOps = opsData.filter(
    (t: any) => !["DONE", "CANCELLED"].includes(t.status),
  );
  const totalOpsCost = opsData.reduce(
    (s: number, t: any) => s + Number(t.estimatedAmount || 0),
    0,
  );
  const paidOpsCost = opsData.reduce(
    (s: number, t: any) => s + Number(t.amountPaid || 0),
    0,
  );

  const StatusDistRow = ({ status, count, total, color }: any) => (
    <div className="flex items-center gap-3">
      <div className="w-20 shrink-0">
        <BookingStatusBadge status={status} />
      </div>
      <div className="flex-1">
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${color}`}
            style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
          />
        </div>
      </div>
      <span className="text-sm font-bold text-gray-700 w-6 text-right">
        {count}
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Hero metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          {
            label: "Total Revenue",
            value: money(totalRevenue),
            sub: "Expected from all bookings",
            icon: Target,
            color: "bg-[#781216]/10 text-[#781216]",
          },
          {
            label: "Collected",
            value: money(totalCollected),
            sub: `${collectionRate}% collection rate`,
            icon: ArrowUpRight,
            color: "bg-emerald-50 text-emerald-700",
          },
          {
            label: "Outstanding",
            value: money(totalDue),
            sub: "Pending collection",
            icon: Clock,
            color: "bg-amber-50 text-amber-700",
          },
          {
            label: "Total Expenses",
            value: money(totalExpenses),
            sub: "Operational + ledger costs",
            icon: ArrowDownRight,
            color: "bg-red-50 text-red-700",
          },
          {
            label: "Gross Profit",
            value: money(grossProfit),
            sub: "Collected minus expenses",
            icon: TrendingUp,
            color:
              grossProfit >= 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700",
          },
          {
            label: "Total Travelers",
            value: totalTravelers,
            sub: `Across ${bookings.length} bookings`,
            icon: Users2,
            color: "bg-blue-50 text-blue-700",
          },
        ].map((m) => (
          <div
            key={m.label}
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${m.color}`}
            >
              <m.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-950">{m.value}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mt-1">
              {m.label}
            </p>
            <p className="text-xs text-gray-400 mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Booking status distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#781216]" /> Booking Status
          </h3>
          <div className="space-y-3">
            {Object.entries(statusDist).map(([status, count]: any) => (
              <StatusDistRow
                key={status}
                status={status}
                count={count}
                total={bookings.length}
                color={
                  status === "CONFIRMED"
                    ? "bg-emerald-500"
                    : status === "PENDING"
                      ? "bg-amber-500"
                      : status === "CANCELLED"
                        ? "bg-red-500"
                        : status === "COMPLETED"
                          ? "bg-purple-500"
                          : "bg-blue-500"
                }
              />
            ))}
          </div>
        </div>

        {/* Payment health */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <WalletCards className="w-4 h-4 text-[#781216]" /> Payment Health
          </h3>
          <div className="space-y-3">
            {Object.entries(paymentDist).map(([status, count]: any) => (
              <div key={status} className="flex items-center gap-3">
                <div className="w-28 shrink-0">
                  <PaymentStatusBadge status={status} />
                </div>
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        status === "PAID"
                          ? "bg-emerald-500"
                          : status === "PARTIALLY_PAID"
                            ? "bg-blue-500"
                            : status === "REFUNDED"
                              ? "bg-purple-500"
                              : status === "PENDING"
                                ? "bg-amber-500"
                                : "bg-gray-400"
                      }`}
                      style={{
                        width: `${bookings.length > 0 ? (count / bookings.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-700 w-6 text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Operations overview */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#781216]" /> Operations Overview
          </h3>
          <div className="space-y-4">
            {[
              { label: "Total Tasks", value: opsData.length },
              { label: "Open Tasks", value: openOps.length },
              {
                label: "Completed",
                value: opsData.filter((t: any) => t.status === "DONE").length,
              },
              { label: "Estimated Cost", value: money(totalOpsCost) },
              { label: "Actual Spend", value: money(paidOpsCost) },
            ].map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0"
              >
                <span className="text-sm text-gray-600">{r.label}</span>
                <span className="font-bold text-gray-900 text-sm">
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Key metrics */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#781216]" /> Key Metrics
          </h3>
          <div className="space-y-4">
            {[
              { label: "Avg. Booking Value", value: money(avgBookingValue) },
              { label: "Collection Rate", value: `${collectionRate}%` },
              { label: "Total Bookings", value: bookings.length },
              {
                label: "Confirmed Bookings",
                value: bookings.filter((b: any) => b.status === "CONFIRMED")
                  .length,
              },
              {
                label: "Cancelled Bookings",
                value: bookings.filter((b: any) => b.status === "CANCELLED")
                  .length,
              },
            ].map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0"
              >
                <span className="text-sm text-gray-600">{r.label}</span>
                <span className="font-bold text-gray-900 text-sm">
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent bookings summary table */}
      {bookings.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Users2 className="w-4 h-4 text-[#781216]" /> Bookings Snapshot
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Guest</th>
                  <th className="px-4 py-3 text-center">Pax</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.slice(0, 10).map((b: any) => (
                  <tr
                    key={b.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#781216]">
                      {b.bookingReference}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-[140px]">
                        {b.user?.profile?.fullName || "N/A"}
                      </p>
                      <p className="text-xs text-gray-400 truncate max-w-[140px]">
                        {b.user?.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      {b.numberOfTravelers}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <BookingStatusBadge status={b.status} />
                        <PaymentStatusBadge status={b.paymentStatus} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {money(b.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                      {money(b.amountPaid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bookings.length > 10 && (
              <div className="px-4 py-3 text-center text-xs text-gray-400 border-t border-gray-50">
                Showing 10 of {bookings.length} bookings. View all in the
                Bookings tab.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 5: Payments ──────────────────────────────────────────────
function PaymentsTab({ tripId }: { tripId: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: () => paymentApi.getAllPayments({ limit: 2000 }),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading payments...
    </div>
  );

  const allPayments = data?.data || [];
  const payments = allPayments.filter((p: any) => p.booking?.trip?.id === tripId || p.booking?.slot?.trip?.id === tripId);
  const totalReceived = payments.filter((p: any) => p.status === "SUCCESS").reduce((sum: number, p: any) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 bg-emerald-50 text-emerald-700">
            <IndianRupee className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-gray-900">{money(totalReceived)}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">Total Received</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 bg-blue-50 text-blue-700">
            <CreditCard className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-gray-900">{payments.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">Total Transactions</p>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No payments found for this trip</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{payments.length} payment(s)</p>
          </div>
          <div className="divide-y divide-gray-50">
            {payments.map((p: any) => (
              <div key={p.id} className="w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[#781216]">{p.booking?.bookingReference}</span>
                    <TransactionStatusBadge status={p.status} />
                  </div>
                  <p className="font-semibold text-gray-900 mt-1">{p.booking?.user?.profile?.fullName || p.booking?.user?.email}</p>
                  <p className="text-xs text-gray-500">{format(new Date(p.createdAt), "PPp")}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold text-gray-900">{money(p.amount)}</p>
                  <p className="text-xs text-gray-500">{p.type}</p>
                  <button onClick={() => navigate(`/dashboard/payments`)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#781216] mt-1 hover:underline">
                    View in Payments <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
type Tab = "bookings" | "operations" | "ledger" | "revenue" | "payments";

export default function AdminTripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("bookings");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [fullTripData, setFullTripData] = useState<any>(null);
  const [processingPublish, setProcessingPublish] = useState(false);
  const [generatedShareLink, setGeneratedShareLink] = useState<{
    title: string;
    url: string;
  } | null>(null);

  const {
    data: trip,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin", "trip", id],
    queryFn: async () => {
      const res = await apiClient.get(`/trips/${id}?adminView=true`);
      return res.data as any;
    },
    enabled: !!id,
  });

  const handleTogglePublish = async () => {
    if (!trip) return;
    setProcessingPublish(true);
    try {
      await apiClient.put(`/trips/${trip.id}`, {
        isPublished: !trip.isPublished,
      });
      toast.success(trip.isPublished ? "Trip unpublished" : "Trip published");
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["admin", "trips"] });
    } catch (err) {
      showErrorToast(err, "Failed to update trip status");
    } finally {
      setProcessingPublish(false);
    }
  };

  const handleOpenEdit = async () => {
    try {
      const res = await apiClient.get(`/trips/${id}?adminView=true`);
      setFullTripData(res.data);
      setEditModalOpen(true);
    } catch (err) {
      showErrorToast(err, "Failed to load trip for editing");
    }
  };

  const handleCreateShareLink = async () => {
    if (!trip) return;
    try {
      const expiresAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const { data } = await apiClient.post(`/trips/${trip.id}/share-link`, {
        expiresAt,
      });
      const url = `${window.location.origin}/trips/${trip.slug}?share=${encodeURIComponent(data.token)}`;
      setGeneratedShareLink({ title: trip.title, url });
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Private link copied to clipboard");
      } catch {
        toast.info("Link created — copy it below");
      }
    } catch (err) {
      showErrorToast(err, "Could not create share link");
    }
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#c8a96e]" />
      </div>
    );

  if (isError || !trip)
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="font-bold text-red-800 text-lg">Trip not found</p>
        <button
          onClick={() => navigate("/dashboard/trips")}
          className="mt-4 text-sm font-semibold text-[#781216] underline"
        >
          Back to Trips
        </button>
      </div>
    );

  const totalSlotCapacity = (trip.slots || []).reduce(
    (s: number, sl: any) => s + Number(sl.capacity || 0),
    0,
  );
  const totalSlotFilled = (trip.slots || []).reduce(
    (s: number, sl: any) => s + Number(sl.filledSpots || 0),
    0,
  );
  const fillRate =
    totalSlotCapacity > 0
      ? Math.round((totalSlotFilled / totalSlotCapacity) * 100)
      : 0;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "bookings", label: "Bookings", icon: Users },
    { key: "operations", label: "Operations", icon: Activity },
    { key: "ledger", label: "Ledger", icon: BookOpen },
    { key: "revenue", label: "Revenue", icon: TrendingUp },
    { key: "payments", label: "Payments", icon: CreditCard },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      {/* Back + header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/dashboard/trips")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Trips
        </button>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Banner */}
          {trip.bannerImages?.length > 0 && (
            <div className="w-full h-40 md:h-52 overflow-hidden relative">
              <img
                src={trip.bannerImages[0]}
                alt={trip.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </div>
          )}

          <div className="p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 uppercase tracking-wider">
                    {trip.tripType ? formatTripType(trip.tripType) : "UNKNOWN"}
                  </span>
                  {!trip.isPublished && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700 uppercase tracking-wider">
                      Draft
                    </span>
                  )}
                  {trip.circuit && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#fcf0d6] text-[#8a6414] uppercase tracking-wider">
                      {trip.circuit.title}
                    </span>
                  )}
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                  {trip.title}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                  {trip.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {trip.location}
                    </span>
                  )}
                  {trip.slots?.[0]?.startDate && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(trip.slots[0].startDate), "MMM d, yyyy")}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {totalSlotFilled}/{totalSlotCapacity} booked ({fillRate}%)
                  </span>
                  {trip.packages?.[0]?.price && (
                    <span className="flex items-center gap-1.5 font-semibold text-[#781216]">
                      <IndianRupee className="w-3.5 h-3.5" />
                      {parseInt(trip.packages[0].price).toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  onClick={handleCreateShareLink}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  <Link2 className="w-4 h-4" /> Share
                </button>
                <button
                  onClick={handleTogglePublish}
                  disabled={processingPublish}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl transition-colors ${
                    trip.isPublished
                      ? "text-amber-700 bg-amber-50 hover:bg-amber-100"
                      : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  }`}
                >
                  {processingPublish ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : trip.isPublished ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  {trip.isPublished ? "Unpublish" : "Publish"}
                </button>
                <button
                  onClick={handleOpenEdit}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-[#c8a96e] hover:bg-[#b8943a] rounded-xl transition-colors"
                >
                  <Edit2 className="w-4 h-4" /> Edit Trip
                </button>
              </div>
            </div>

            {/* Fill rate bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Capacity fill rate</span>
                <span className="font-semibold">
                  {totalSlotFilled} / {totalSlotCapacity} seats
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${fillRate >= 80 ? "bg-emerald-500" : fillRate >= 50 ? "bg-[#c8a96e]" : "bg-red-400"}`}
                  style={{ width: `${fillRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-[#781216] text-[#781216] bg-red-50/30"
                  : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "bookings" && <BookingsTab tripId={id!} />}
        {activeTab === "operations" && <OperationsTab tripId={id!} />}
        {activeTab === "ledger" && <LedgerTab tripId={id!} />}
        {activeTab === "revenue" && <RevenueDashboardTab tripId={id!} />}
        {activeTab === "payments" && <PaymentsTab tripId={id!} />}
      </div>

      {/* Edit modal */}
      <TripFormModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        trip={fullTripData}
      />

      {/* Share link dialog */}
      {generatedShareLink && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setGeneratedShareLink(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-900">
                  Private Booking Link
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {generatedShareLink.title} · Expires in 30 days
                </p>
              </div>
              <button
                onClick={() => setGeneratedShareLink(null)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              readOnly
              value={generatedShareLink.url}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-700 mb-4 focus:outline-none"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setGeneratedShareLink(null)}
              >
                Close
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(generatedShareLink.url);
                    toast.success("Copied!");
                  } catch {
                    toast.error("Could not copy automatically");
                  }
                }}
                className="bg-[#781216] hover:bg-[#5f0e11]"
              >
                Copy Link
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
