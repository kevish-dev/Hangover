import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/axios";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { SyncIndicator } from "../../components/ui/sync-indicator";
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
import CreateBookingModal from "../../components/admin/CreateBookingModal";

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
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);

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
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b09561] text-white rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Create Booking
          </button>
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
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white h-auto w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="RESERVED">Reserved</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
            </SelectContent>
          </Select>
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
                  onClick={() => navigate(`/dashboard/bookings/${b.id}`)}
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

      {showCreateModal && (
        <CreateBookingModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            refetch();
          }}
          prefillType="TRIP"
          prefillItemId={tripId}
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

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-amber-700",
  IN_PROGRESS: "text-blue-700",
  BLOCKED: "text-red-700",
  DONE: "text-emerald-700",
  CANCELLED: "text-gray-400",
};

function OperationsTab({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [newRow, setNewRow] = useState<any>({
    bookingId: "", title: "", category: "GENERAL", status: "PENDING",
    unitPrice: "", quantityNeeded: "", quantityAcquired: "",
    dueAt: format(new Date(), "yyyy-MM-dd"),
  });

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
      const res = await apiClient.get(`/operations`, { params: { tripId, limit: 500 } });
      return res.data as any[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: any }) =>
      apiClient.patch(`/operations/${taskId}`, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "trip-ops", tripId] });
    },
    onError: (err: any) => showErrorToast(err, "Failed to update task"),
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => apiClient.delete(`/operations/${taskId}`),
    onSuccess: async () => {
      toast.success("Task deleted");
      await queryClient.invalidateQueries({ queryKey: ["admin", "trip-ops", tripId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to delete task"),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => {
      const { bookingId, ...rest } = payload;
      return apiClient.post(`/operations/bookings/${bookingId}`, rest);
    },
    onSuccess: async () => {
      toast.success("Task created");
      await queryClient.invalidateQueries({ queryKey: ["admin", "trip-ops", tripId] });
      setNewRow({ bookingId: "", title: "", category: "GENERAL", status: "PENDING", unitPrice: "", quantityNeeded: "", quantityAcquired: "", dueAt: format(new Date(), "yyyy-MM-dd") });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to create task"),
  });

  const handleCellChange = (task: any, field: string, value: any) => {
    if (task[field] == value) return;
    if (field === "dueAt") value = value ? new Date(value).toISOString() : null;
    updateMutation.mutate({ taskId: task.id, payload: { [field]: value } });
  };

  const handleNewRowSubmit = () => {
    if (!newRow.bookingId) return toast.error("Select a booking first");
    if (!newRow.title.trim()) return toast.error("Title is required");
    const payload: any = {
      bookingId: newRow.bookingId,
      title: newRow.title,
      category: newRow.category,
      status: newRow.status,
      dueAt: newRow.dueAt ? new Date(newRow.dueAt).toISOString() : null,
    };
    if (newRow.unitPrice !== "") payload.unitPrice = Number(newRow.unitPrice);
    if (newRow.quantityNeeded !== "") payload.quantityNeeded = Number(newRow.quantityNeeded);
    if (newRow.quantityAcquired !== "") payload.quantityAcquired = Number(newRow.quantityAcquired);
    createMutation.mutate(payload);
  };

  const filtered = tasks.filter((t: any) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (categoryFilter && t.category !== categoryFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [t.title, t.description, t.booking?.bookingReference, t.booking?.user?.profile?.fullName, t.booking?.user?.email]
      .filter(Boolean).join(" ").toLowerCase().includes(q);
  });

  const openTasks = tasks.filter((t: any) => !["DONE", "CANCELLED"].includes(t.status));
  const overdue = tasks.filter((t: any) => {
    if (["DONE", "CANCELLED"].includes(t.status)) return false;
    const due = t.dueAt ? new Date(t.dueAt).getTime() : null;
    return due !== null && due < Date.now();
  });
  const totalSpend = tasks.reduce((s: number, t: any) => s + Number(t.amountPaid || 0), 0);

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
          { label: "Open Tasks", value: openTasks.length, icon: SlidersHorizontal, color: "text-blue-700 bg-blue-50" },
          { label: "Overdue", value: overdue.length, icon: AlertTriangle, color: overdue.length > 0 ? "text-red-700 bg-red-50" : "text-gray-500 bg-gray-100" },
          { label: "Total Tasks", value: tasks.length, icon: CheckCircle2, color: "text-gray-700 bg-gray-100" },
          { label: "Spent", value: money(totalSpend), icon: IndianRupee, color: "text-[#781216] bg-red-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${s.color.split(" ").slice(1).join(" ")}`}>
              <s.icon className={`w-4 h-4 ${s.color.split(" ")[0]}`} />
            </div>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm items-center">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Task, booking, traveler..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40" />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white h-auto">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES_OPS.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter || "all"} onValueChange={(val) => setCategoryFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white h-auto">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end items-center mb-3">
        <SyncIndicator isMutating={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending} isError={createMutation.isError || updateMutation.isError || deleteMutation.isError} />
      </div>

      {/* Excel Grid */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-100 border-b-2 border-gray-300 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 font-semibold text-gray-600 border-r border-gray-300 w-40">Booking</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600 border-r border-gray-300 w-32">Status</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600 border-r border-gray-300 w-36">Category</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600 border-r border-gray-300">Title</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600 border-r border-gray-300 w-32">Due Date</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600 border-r border-gray-300 w-24 text-right">Unit Price</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600 border-r border-gray-300 w-24 text-right">Qty Need</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600 border-r border-gray-300 w-24 text-right">Qty Acq</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600 border-r border-gray-300 w-28 text-right">Total ₹</th>
                <th className="px-2 py-2.5 text-gray-600 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((task: any) => (
                <tr key={task.id} className="group hover:bg-blue-50/20 transition-colors">
                  <td className="border-r border-gray-200 p-0">
                    <div className="w-full min-h-10 px-3 flex items-center text-xs font-mono font-bold text-[#781216]">
                      {task.booking?.bookingReference}
                      <span className="text-gray-400 font-normal ml-1 truncate block max-w-[80px]">
                        {task.booking?.user?.profile?.fullName?.split(" ")[0] || ""}
                      </span>
                    </div>
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <Select defaultValue={task.status}
                      onValueChange={(val) => handleCellChange(task, "status", val)}
                    >
                      <SelectTrigger className={`h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 font-bold text-[11px] tracking-wide ${STATUS_COLORS[task.status] || "text-gray-600"}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES_OPS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <Select defaultValue={task.category}
                      onValueChange={(val) => handleCellChange(task, "category", val)}
                    >
                      <SelectTrigger className="h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 text-xs text-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input type="text" defaultValue={task.title}
                      onBlur={(e) => handleCellChange(task, "title", e.target.value)}
                      className="w-full min-h-10 px-3 bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 font-medium text-gray-900" />
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input type="date" defaultValue={task.dueAt ? format(new Date(task.dueAt), "yyyy-MM-dd") : ""}
                      onBlur={(e) => handleCellChange(task, "dueAt", e.target.value)}
                      className="w-full min-h-10 px-3 bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 text-xs text-gray-600" />
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input type="number" step="0.01" defaultValue={task.unitPrice ?? ""}
                      onBlur={(e) => handleCellChange(task, "unitPrice", e.target.value)}
                      className="w-full min-h-10 px-3 bg-transparent outline-none text-right font-mono text-gray-700 focus:bg-blue-50 focus:ring-1 focus:ring-blue-400" />
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input type="number" defaultValue={task.quantityNeeded ?? ""}
                      onBlur={(e) => handleCellChange(task, "quantityNeeded", e.target.value)}
                      className="w-full min-h-10 px-3 bg-transparent outline-none text-right font-mono text-gray-700 focus:bg-blue-50 focus:ring-1 focus:ring-blue-400" />
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input type="number" defaultValue={task.quantityAcquired ?? ""}
                      onBlur={(e) => handleCellChange(task, "quantityAcquired", e.target.value)}
                      className="w-full min-h-10 px-3 bg-transparent outline-none text-right font-mono text-blue-600 focus:bg-blue-50 focus:ring-1 focus:ring-blue-400" />
                  </td>
                  <td className="border-r border-gray-200 p-0 bg-gray-50/50">
                    <div className="w-full min-h-10 px-3 flex items-center justify-end text-gray-600 font-mono text-sm">
                      {task.unitPrice && task.quantityNeeded
                        ? (Number(task.unitPrice) * Number(task.quantityNeeded)).toFixed(2)
                        : "—"}
                    </div>
                  </td>
                  <td className="p-0 text-center">
                    <button onClick={() => { if (window.confirm("Delete this task?")) deleteMutation.mutate(task.id); }}
                      disabled={deleteMutation.isPending}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1.5 opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {/* New row */}
              <tr className="bg-indigo-50/40 border-t-2 border-indigo-200">
                <td className="border-r border-gray-200 p-0">
                  <Select value={newRow.bookingId} onValueChange={(val) => setNewRow({...newRow, bookingId: val})}>
                    <SelectTrigger className="h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-indigo-100 text-xs font-mono font-bold text-[#781216]">
                      <SelectValue placeholder="Select booking..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bookings.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.bookingReference} {b.user?.profile?.fullName ? `(${b.user.profile.fullName})` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border-r border-gray-200 p-0">
                  <Select value={newRow.status} onValueChange={(val) => setNewRow({...newRow, status: val})}>
                    <SelectTrigger className="h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-indigo-100 text-[11px] font-bold text-gray-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES_OPS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border-r border-gray-200 p-0">
                  <Select value={newRow.category} onValueChange={(val) => setNewRow({...newRow, category: val})}>
                    <SelectTrigger className="h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-indigo-100 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border-r border-gray-200 p-0">
                  <input type="text" value={newRow.title} placeholder="New task title..."
                    onChange={(e) => setNewRow({...newRow, title: e.target.value})}
                    onKeyDown={(e) => e.key === "Enter" && handleNewRowSubmit()}
                    className="w-full min-h-10 px-3 bg-transparent outline-none focus:bg-indigo-100 font-medium text-gray-900 placeholder:text-gray-300" />
                </td>
                <td className="border-r border-gray-200 p-0">
                  <input type="date" value={newRow.dueAt} onChange={(e) => setNewRow({...newRow, dueAt: e.target.value})}
                    className="w-full min-h-10 px-3 bg-transparent outline-none focus:bg-indigo-100 text-xs" />
                </td>
                <td className="border-r border-gray-200 p-0">
                  <input type="number" step="0.01" value={newRow.unitPrice}
                    onChange={(e) => setNewRow({...newRow, unitPrice: e.target.value})}
                    placeholder="₹"
                    className="w-full min-h-10 px-3 bg-transparent outline-none text-right font-mono focus:bg-indigo-100" />
                </td>
                <td className="border-r border-gray-200 p-0">
                  <input type="number" value={newRow.quantityNeeded}
                    onChange={(e) => setNewRow({...newRow, quantityNeeded: e.target.value})}
                    placeholder="0"
                    className="w-full min-h-10 px-3 bg-transparent outline-none text-right font-mono focus:bg-indigo-100" />
                </td>
                <td className="border-r border-gray-200 p-0">
                  <input type="number" value={newRow.quantityAcquired}
                    onChange={(e) => setNewRow({...newRow, quantityAcquired: e.target.value})}
                    placeholder="0"
                    className="w-full min-h-10 px-3 bg-transparent outline-none text-right font-mono text-blue-600 focus:bg-indigo-100" />
                </td>
                <td className="border-r border-gray-200 p-0 bg-gray-50/50">
                  <div className="w-full min-h-10 px-3 flex items-center justify-end text-gray-500 font-mono text-sm">
                    {newRow.unitPrice && newRow.quantityNeeded
                      ? (Number(newRow.unitPrice) * Number(newRow.quantityNeeded)).toFixed(2)
                      : "—"}
                  </div>
                </td>
                <td className="p-0 text-center">
                  <button onClick={handleNewRowSubmit} disabled={createMutation.isPending}
                    className="text-indigo-500 hover:text-indigo-700 transition-colors p-1.5">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
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


// ─── Tab 3: Ledger ────────────────────────────────────────────────
const LEDGER_CATEGORIES = ["HOTEL", "TRANSPORT", "PERMIT", "VENDOR", "ACTIVITY", "DOCUMENTATION", "PAYMENT_COLLECTION", "SALARY", "MARKETING", "BOOKING_PAYMENT", "REFUND", "OTHER_INCOME", "OTHER_EXPENSE"];

function LedgerTab({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [newEntry, setNewEntry] = useState({
    type: "EXPENSE",
    category: "HOTEL",
    amount: "",
    description: "",
    entryDate: format(new Date(), "yyyy-MM-dd"),
    bookingId: "TRIP",
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["admin", "trip-bookings", tripId],
    queryFn: async () => {
      const res = await apiClient.get(`/bookings/trip/${tripId}`);
      return res.data as any[];
    }
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
      await queryClient.invalidateQueries({ queryKey: ["admin", "trip-ledger", tripId] });
      setNewEntry({ type: "EXPENSE", category: "HOTEL", amount: "", description: "", entryDate: format(new Date(), "yyyy-MM-dd"), bookingId: "TRIP" });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to add entry"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.patch(`/ledgers/entries/${id}`, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "trip-ledger", tripId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to update entry"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/ledgers/entries/${id}`),
    onSuccess: async () => {
      toast.success("Entry deleted");
      await queryClient.invalidateQueries({ queryKey: ["admin", "trip-ledger", tripId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to delete"),
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
      scope: newEntry.bookingId === "TRIP" ? "TRIP" : "BOOKING",
      tripId,
      bookingId: newEntry.bookingId === "TRIP" ? undefined : newEntry.bookingId,
      category: newEntry.category,
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
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Category, description, booking ref..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40" />
        </div>
        <Select value={typeFilter || "all"} onValueChange={(val) => setTypeFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white h-auto w-[150px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="INCOME">INCOME</SelectItem>
            <SelectItem value="EXPENSE">EXPENSE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end items-center mb-3">
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
                <th className="px-3 py-2.5 font-semibold text-gray-600 border-r border-gray-300 w-24 text-center">Context</th>
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
                    {entry.isAutoGenerated ? (
                      <div className="min-h-10 px-2 flex items-center justify-center">
                        <span className="text-[10px] font-mono text-gray-400">{entry.booking?.bookingReference || "Trip"}</span>
                      </div>
                    ) : (
                      <Select 
                        value={entry.bookingId || "TRIP"} 
                        onValueChange={(val) => {
                          if (val === "TRIP") {
                            updateMutation.mutate({ id: entry.id, data: { scope: "TRIP", bookingId: null } });
                          } else {
                            updateMutation.mutate({ id: entry.id, data: { scope: "BOOKING", bookingId: val } });
                          }
                        }}
                      >
                        <SelectTrigger className="h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 text-[10px] font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TRIP">Trip</SelectItem>
                          {bookings.map((b: any) => (
                            <SelectItem key={b.id} value={b.id}>{b.bookingReference}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
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
                <td className="border-r border-gray-200 p-0 bg-gray-50/50">
                  <Select value={newEntry.bookingId} onValueChange={(val) => setNewEntry({...newEntry, bookingId: val})}>
                    <SelectTrigger className="h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-emerald-100 text-[10px] font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRIP">Trip</SelectItem>
                      {bookings.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>{b.bookingReference}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
      const url = `${window.location.origin}/trips/${trip.id}?share=${encodeURIComponent(data.token)}`;
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
