import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/axios";
import {
  CalendarCheck,
  IndianRupee,
  Loader2,
  ArrowLeft,
  User,
  MapPin,
  Mail,
  Phone,
  Image as ImageIcon,
  AlertCircle,
  Plus,
  Trash2,
  ClipboardCheck,
  BookOpen,
  PackagePlus,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router";
import { BalanceSheetTab } from "../../components/admin/BookingDetailModal";
import { SyncIndicator } from "../../components/ui/sync-indicator";
import { BookingPaymentsTab } from "../../components/admin/BookingPaymentsTab";
import { BookingAddOnsTab } from "../../components/admin/BookingAddOnsTab";
import { OperationsCalendar } from "../../components/admin/operations/OperationsCalendar";

function BookingStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-50 text-yellow-700 border border-yellow-200/60",
    RESERVED: "bg-blue-50 text-blue-700 border border-blue-200/60",
    CONFIRMED: "bg-green-50 text-green-700 border border-green-200/60",
    CANCELLED: "bg-red-50 text-red-700 border border-red-200/60",
    COMPLETED: "bg-purple-50 text-purple-700 border border-purple-200/60",
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${map[status] ?? "bg-gray-50 text-gray-600 border border-gray-200/60"}`}
    >
      {status}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: "bg-green-50 text-green-700 border border-green-200/60",
    PARTIALLY_PAID: "bg-blue-50 text-blue-700 border border-blue-200/60",
    PENDING: "bg-yellow-50 text-yellow-700 border border-yellow-200/60",
    REFUNDED: "bg-purple-50 text-purple-700 border border-purple-200/60",
    FAILED: "bg-red-50 text-red-700 border border-red-200/60",
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${map[status] ?? "bg-gray-50 text-gray-600 border border-gray-200/60"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

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
const STATUSES = ["PENDING", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"];

export function BookingOperationsGrid({ bookingId }: { bookingId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin", "operations", "booking", bookingId],
    queryFn: async () =>
      (await apiClient.get<any[]>(`/operations/bookings/${bookingId}`)).data,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiClient.patch(`/operations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "operations", "booking", bookingId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "booking-ledger", bookingId],
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiClient.post(`/operations/bookings/${bookingId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "operations", "booking", bookingId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "booking-ledger", bookingId],
      });
      setNewRow({
        title: "",
        category: "GENERAL",
        status: "PENDING",
        dueAt: format(new Date(), "yyyy-MM-dd"),
        unitPrice: "",
        quantityNeeded: "",
        quantityAcquired: "",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/operations/${id}`);
    },
    onSuccess: () => {
      toast.success("Task deleted");
      queryClient.invalidateQueries({
        queryKey: ["admin", "operations", "booking", bookingId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "booking-ledger", bookingId],
      });
    },
  });

  const [newRow, setNewRow] = useState<any>({
    title: "",
    category: "GENERAL",
    status: "PENDING",
    dueAt: format(new Date(), "yyyy-MM-dd"),
    unitPrice: "",
    quantityNeeded: "",
    quantityAcquired: "",
  });

  const handleCellChange = (task: any, field: string, value: any) => {
    if (task[field] == value) return;
    if (field === "dueAt") value = value ? new Date(value).toISOString() : null;
    updateMutation.mutate({ id: task.id, data: { [field]: value } });
  };

  const handleNewRowSubmit = () => {
    if (!newRow.title.trim()) return toast.error("Title is required");
    const payload: any = {
      title: newRow.title,
      category: newRow.category,
      status: newRow.status,
      dueAt: newRow.dueAt ? new Date(newRow.dueAt).toISOString() : null,
    };
    if (newRow.unitPrice !== "") payload.unitPrice = Number(newRow.unitPrice);
    if (newRow.quantityNeeded !== "")
      payload.quantityNeeded = Number(newRow.quantityNeeded);
    if (newRow.quantityAcquired !== "")
      payload.quantityAcquired = Number(newRow.quantityAcquired);
    createMutation.mutate(payload);
  };

  const tasks = query.data || [];

  if (query.isLoading)
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-900"><ClipboardCheck className="h-4 w-4 text-[#781216]" />Ground operations</h3>
        <SyncIndicator isMutating={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending} isError={createMutation.isError || updateMutation.isError || deleteMutation.isError} />
      </div>
      <OperationsCalendar tasks={tasks} emptyMessage="No operational tasks have been scheduled for this booking." />
    </div>
  );

  return (
    <div className="mt-8 border-t border-[#e8d9b7]/40">
      <div className="p-4 md:p-6 bg-[#fbf7ed]/10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-[#781216]" /> Ground
            Operations
          </h3>
          <SyncIndicator
            isMutating={
              createMutation.isPending ||
              updateMutation.isPending ||
              deleteMutation.isPending
            }
            isError={
              createMutation.isError ||
              updateMutation.isError ||
              deleteMutation.isError
            }
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-3 py-2 font-semibold text-gray-600 border-r border-gray-300 w-32">
                    Status
                  </th>
                  <th className="px-3 py-2 font-semibold text-gray-600 border-r border-gray-300 w-40">
                    Category
                  </th>
                  <th className="px-3 py-2 font-semibold text-gray-600 border-r border-gray-300">
                    Title
                  </th>
                  <th className="px-3 py-2 font-semibold text-gray-600 border-r border-gray-300 w-32">
                    Due Date
                  </th>
                  <th className="px-3 py-2 font-semibold text-gray-600 border-r border-gray-300 w-24 text-right">
                    Unit Price
                  </th>
                  <th className="px-3 py-2 font-semibold text-gray-600 border-r border-gray-300 w-24 text-right">
                    Qty Need
                  </th>
                  <th className="px-3 py-2 font-semibold text-gray-600 border-r border-gray-300 w-24 text-right">
                    Qty Acq
                  </th>

                  <th className="px-2 py-2 font-semibold text-gray-600 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr key={task.id} className={`group transition-colors ${task.status === "DONE" ? "bg-gray-50/80 text-gray-400 hover:bg-gray-100" : "hover:bg-blue-50/30"}`}>
                    <td className="border-r border-gray-200 p-0">
                      <Select
                        defaultValue={task.status}
                        onValueChange={(val) =>
                          handleCellChange(task, "status", val)
                        }
                      >
                        <SelectTrigger
                          className={`h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 font-semibold text-[10px] tracking-wide ${task.status === "DONE" ? "text-emerald-700" : task.status === "CANCELLED" ? "text-red-700" : "text-blue-700"}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="border-r border-gray-200 p-0">
                      <Select
                        defaultValue={task.category}
                        onValueChange={(val) =>
                          handleCellChange(task, "category", val)
                        }
                      >
                        <SelectTrigger className="h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="border-r border-gray-200 p-0">
                      <input
                        type="text"
                        defaultValue={task.title}
                        onBlur={(e) =>
                          handleCellChange(task, "title", e.target.value)
                        }
                        className={`w-full h-full min-h-10 px-3 bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 font-medium ${task.status === "DONE" ? "text-gray-400 line-through" : "text-gray-900"}`}
                      />
                    </td>
                    <td className="border-r border-gray-200 p-0">
                      <input
                        type="date"
                        defaultValue={
                          task.dueAt
                            ? format(new Date(task.dueAt), "yyyy-MM-dd")
                            : ""
                        }
                        onBlur={(e) =>
                          handleCellChange(task, "dueAt", e.target.value)
                        }
                        className="w-full h-full min-h-10 px-3 bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 text-xs"
                      />
                    </td>
                    <td className="border-r border-gray-200 p-0">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={task.unitPrice ?? ""}
                        onBlur={(e) =>
                          handleCellChange(task, "unitPrice", e.target.value)
                        }
                        className="w-full h-full min-h-10 px-3 bg-transparent outline-none text-right font-mono text-gray-700 focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="border-r border-gray-200 p-0">
                      <input
                        type="number"
                        defaultValue={task.quantityNeeded ?? ""}
                        onBlur={(e) =>
                          handleCellChange(
                            task,
                            "quantityNeeded",
                            e.target.value,
                          )
                        }
                        className="w-full h-full min-h-10 px-3 bg-transparent outline-none text-right font-mono text-gray-700 focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="border-r border-gray-200 p-0">
                      <input
                        type="number"
                        defaultValue={task.quantityAcquired ?? ""}
                        onBlur={(e) =>
                          handleCellChange(
                            task,
                            "quantityAcquired",
                            e.target.value,
                          )
                        }
                        className="w-full h-full min-h-10 px-3 bg-transparent outline-none text-right font-mono text-blue-600 focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    <td className="p-0 text-center align-middle">
                      <button
                        onClick={() => deleteMutation.mutate(task.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors mx-auto p-1.5 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                <tr className="bg-indigo-50/30 border-t-2 border-indigo-200">
                  <td className="border-r border-gray-200 p-0">
                    <Select
                      value={newRow.status}
                      onValueChange={(val) =>
                        setNewRow({ ...newRow, status: val })
                      }
                    >
                      <SelectTrigger className="h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-indigo-100 focus:ring-1 focus:ring-indigo-500 font-semibold text-[10px] tracking-wide text-gray-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <Select
                      value={newRow.category}
                      onValueChange={(val) =>
                        setNewRow({ ...newRow, category: val })
                      }
                    >
                      <SelectTrigger className="h-full min-h-10 border-0 rounded-none bg-transparent shadow-none px-2 focus:bg-indigo-100 focus:ring-1 focus:ring-indigo-500 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input
                      type="text"
                      value={newRow.title}
                      onChange={(e) =>
                        setNewRow({ ...newRow, title: e.target.value })
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleNewRowSubmit()
                      }
                      placeholder="New Task Title..."
                      className="w-full h-full min-h-10 px-3 bg-transparent outline-none focus:bg-indigo-100 focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input
                      type="date"
                      value={newRow.dueAt}
                      onChange={(e) =>
                        setNewRow({ ...newRow, dueAt: e.target.value })
                      }
                      className="w-full h-full min-h-10 px-3 bg-transparent outline-none focus:bg-indigo-100 focus:ring-1 focus:ring-indigo-500 text-xs"
                    />
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input
                      type="number"
                      step="0.01"
                      value={newRow.unitPrice}
                      onChange={(e) =>
                        setNewRow({ ...newRow, unitPrice: e.target.value })
                      }
                      placeholder="₹"
                      className="w-full h-full min-h-10 px-3 bg-transparent outline-none text-right font-mono focus:bg-indigo-100 focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input
                      type="number"
                      value={newRow.quantityNeeded}
                      onChange={(e) =>
                        setNewRow({ ...newRow, quantityNeeded: e.target.value })
                      }
                      placeholder="0"
                      className="w-full h-full min-h-10 px-3 bg-transparent outline-none text-right font-mono focus:bg-indigo-100 focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="border-r border-gray-200 p-0">
                    <input
                      type="number"
                      value={newRow.quantityAcquired}
                      onChange={(e) =>
                        setNewRow({
                          ...newRow,
                          quantityAcquired: e.target.value,
                        })
                      }
                      placeholder="0"
                      className="w-full h-full min-h-10 px-3 bg-transparent outline-none text-right font-mono text-blue-600 focus:bg-indigo-100 focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="border-r border-gray-200 p-0 bg-gray-50/50">
                    <div className="w-full h-full min-h-10 px-3 flex items-center justify-end text-gray-500 font-mono text-sm">
                      {newRow.unitPrice && newRow.quantityNeeded
                        ? (
                            Number(newRow.unitPrice) *
                            Number(newRow.quantityNeeded)
                          ).toFixed(2)
                        : "—"}
                    </div>
                  </td>
                  <td className="p-0 text-center align-middle">
                    <button
                      onClick={handleNewRowSubmit}
                      disabled={createMutation.isPending}
                      className="text-indigo-600 hover:text-indigo-800 transition-colors mx-auto p-1.5"
                    >
                      {createMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminBookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "operations" | "addons" | "ledger" | "payments"
  >("operations");

  const query = useQuery({
    queryKey: ["admin", "booking", id],
    queryFn: async () => {
      const res = await apiClient.get(`/bookings/${id}`);
      return res.data;
    },
  });

  const booking = query.data;

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#c8a96e]" />
      </div>
    );
  }

  if (query.isError || !booking) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"
      >
        <p className="font-bold">Booking could not be loaded.</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="mt-3 text-sm font-semibold underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Catalog and CRM bookings use different relation names. Normalize them here
  // so the admin detail page always describes the journey that was booked.
  const journey =
    booking.crmTrip ||
    booking.crmFestival ||
    booking.trip ||
    booking.festival ||
    booking.slot?.trip ||
    booking.slot?.festival ||
    null;
  const journeySlot =
    booking.crmTripSlot || booking.crmFestivalSlot || booking.slot || null;
  const journeyName = journey?.name || journey?.title || "N/A";
  const journeyType = booking.crmFestival || booking.festival || booking.slot?.festival
    ? "Festival"
    : "Trip";
  const journeyDates = journeySlot?.startDate
    ? [
        format(new Date(journeySlot.startDate), "MMM d, yyyy"),
        journeySlot.endDate
          ? format(new Date(journeySlot.endDate), "MMM d, yyyy")
          : null,
      ]
        .filter(Boolean)
        .join(" - ")
    : "N/A";

  return (
    <div className="max-w-[1500px] mx-auto space-y-6 pb-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-[#e8d9b7]/40 overflow-hidden">
        <div className="bg-white/90 backdrop-blur-md border-b border-[#e8d9b7]/40 px-4 md:px-6 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            Booking Details -{" "}
            <span className="font-mono text-[#c8a96e]">
              {booking.bookingReference}
            </span>
          </h1>
          <div className="flex gap-2">
            <BookingStatusBadge status={booking.status} />
            <PaymentStatusBadge status={booking.paymentStatus} />
          </div>
        </div>

        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-5 md:space-y-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-[#781216]" /> Primary Traveler
              </h3>
              <div className="bg-[#fbf7ed]/30 border border-[#e8d9b7]/40 p-5 rounded-2xl space-y-4">
                <div className="admin-booking-detail-grid grid grid-cols-3 gap-2 text-sm">
                  <span className="text-gray-500">Name:</span>
                  <span className="col-span-2 font-medium text-gray-900">
                    {booking.user?.profile?.fullName || "N/A"}
                  </span>

                  <span className="text-gray-500">Email:</span>
                  <span className="col-span-2 text-gray-900">
                    {booking.user?.email || "N/A"}
                  </span>

                  <span className="text-gray-500">Phone:</span>
                  <span className="col-span-2 text-gray-900">
                    {booking.user?.profile?.phone || "N/A"}
                  </span>

                  <span className="text-gray-500">Address:</span>
                  <span className="col-span-2 text-gray-900">
                    {booking.user?.profile?.addressLine1 || "N/A"}
                  </span>

                  <span className="text-gray-500">Govt ID:</span>
                  <span className="col-span-2 flex items-center">
                    {booking.user?.profile?.govtIdImageUrl ? (
                      <a
                        href={booking.user.profile.govtIdImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#781216] hover:bg-[#5f0e11] rounded-lg transition-colors shadow-sm"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> View ID
                      </a>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                        NO ID
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-[#781216]" /> Trip
                Details
              </h3>
              <div className="bg-[#fbf7ed]/30 border border-[#e8d9b7]/40 p-5 rounded-2xl space-y-4">
                <div className="admin-booking-detail-grid grid grid-cols-3 gap-2 text-sm">
                  <span className="text-gray-500">{journeyType} Name:</span>
                  <span className="col-span-2 font-medium text-gray-900">
                    {journeyName}
                  </span>

                  <span className="text-gray-500">Dates:</span>
                  <span className="col-span-2 text-gray-900">
                    {journeyDates}
                  </span>

                  {journey?.destination?.name && (
                    <>
                      <span className="text-gray-500">Destination:</span>
                      <span className="col-span-2 text-gray-900">
                        {journey.destination.name}
                      </span>
                    </>
                  )}

                  <span className="text-gray-500">Package:</span>
                  <span className="col-span-2 text-gray-900">
                    {booking.package?.title || "N/A"}
                  </span>

                  <span className="text-gray-500">Booked On:</span>
                  <span className="col-span-2 text-gray-900">
                    {format(new Date(booking.createdAt), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 md:space-y-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-[#781216]" /> Payment
                Summary
              </h3>
              <div className="bg-[#fbf7ed]/30 border border-[#e8d9b7]/40 p-5 rounded-2xl space-y-4">
                <div className="admin-booking-detail-grid grid grid-cols-2 gap-y-3 text-sm">
                  <span className="text-gray-500">Total Amount:</span>
                  <span className="font-semibold text-gray-900 text-right">
                    ₹{Number(booking.totalAmount).toLocaleString()}
                  </span>

                  <span className="text-gray-500">Amount Paid:</span>
                  <span className="font-medium text-green-700 text-right">
                    ₹{Number(booking.amountPaid).toLocaleString()}
                  </span>

                  <div className="col-span-2 border-t border-[#e8d9b7]/40 my-1"></div>

                  <span className="text-gray-500 font-medium">
                    Balance Due:
                  </span>
                  <span className="font-bold text-red-600 text-right">
                    ₹
                    {Number(booking.amountDue).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-[#781216]" /> Co-Travelers (
                {booking.travelers?.length || 0})
              </h3>
              <div className="bg-[#fbf7ed]/30 border border-[#e8d9b7]/40 p-5 rounded-2xl">
                {booking.travelers?.length > 0 ? (
                  <div className="space-y-3">
                    {booking.travelers.map((t: any, idx: number) => (
                      <div
                        key={t.id}
                        className={`flex items-center justify-between ${idx !== 0 ? "pt-3 border-t border-[#e8d9b7]/40" : ""}`}
                      >
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {t.fullName}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {t.email || "No email"}
                          </p>
                        </div>
                        {t.aadhaar ? (
                          <a
                            href={t.aadhaar}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#781216] hover:bg-[#5f0e11] rounded-lg transition-colors shadow-sm"
                          >
                            <ImageIcon className="w-3.5 h-3.5" /> View ID
                          </a>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                            NO ID
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center italic py-2">
                    No additional travelers added
                  </p>
                )}
              </div>
            </div>

            {booking.cancellationReason && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" /> Cancellation
                  Details
                </h3>
                <div className="bg-red-50 border border-red-200 p-5 rounded-2xl">
                  <p className="text-sm text-red-800">
                    <span className="font-semibold">Reason:</span>{" "}
                    {booking.cancellationReason}
                  </p>
                  {booking.refundAmount > 0 && (
                    <p className="text-sm text-red-800 mt-2">
                      <span className="font-semibold">Refund Processed:</span> ₹
                      {Number(booking.refundAmount).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabbed View Navigation */}
        <div className="mt-8 border-t border-[#e8d9b7]/40">
          <div className="flex border-b border-[#e8d9b7]/40 bg-[#fbf7ed]/10 px-4 pt-4 gap-4">
            <button
              className={`px-4 py-2 text-sm font-bold tracking-wide uppercase border-b-2 transition-colors ${activeTab === "operations" ? "border-[#781216] text-[#781216]" : "border-transparent text-gray-500 hover:text-gray-800"}`}
              onClick={() => setActiveTab("operations")}
            >
              Operations
            </button>
            <button
              className={`px-4 py-2 text-sm font-bold tracking-wide uppercase border-b-2 transition-colors ${activeTab === "ledger" ? "border-[#781216] text-[#781216]" : "border-transparent text-gray-500 hover:text-gray-800"}`}
              onClick={() => setActiveTab("ledger")}
            >
              Ledger
            </button>
            <button
              className={`px-4 py-2 text-sm font-bold tracking-wide uppercase border-b-2 transition-colors ${activeTab === "addons" ? "border-[#781216] text-[#781216]" : "border-transparent text-gray-500 hover:text-gray-800"}`}
              onClick={() => setActiveTab("addons")}
            >
              <span className="inline-flex items-center gap-1.5">
                <PackagePlus className="w-3.5 h-3.5" /> Add-ons
              </span>
            </button>
            <button
              className={`px-4 py-2 text-sm font-bold tracking-wide uppercase border-b-2 transition-colors ${activeTab === "payments" ? "border-[#781216] text-[#781216]" : "border-transparent text-gray-500 hover:text-gray-800"}`}
              onClick={() => setActiveTab("payments")}
            >
              Payments & Refunds
            </button>
          </div>

          {activeTab === "operations" ? (
            <div className="bg-white rounded-b-xl border border-t-0 border-[#e8d9b7]/40 shadow-sm overflow-hidden">
              {id && <BookingOperationsGrid bookingId={id} />}
            </div>
          ) : activeTab === "addons" ? (
            <BookingAddOnsTab booking={booking} />
          ) : activeTab === "ledger" ? (
            <div className="bg-white rounded-b-xl border border-t-0 border-[#e8d9b7]/40 shadow-sm overflow-hidden">
              {id && (
                <div className="p-4 md:p-6 bg-[#fbf7ed]/10">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#781216]" /> Booking
                    Ledger
                  </h3>
                  <BalanceSheetTab bookingId={id} queryKeySuffix="page" />
                </div>
              )}
            </div>
          ) : (
            id &&
            booking && <BookingPaymentsTab bookingId={id} booking={booking} />
          )}
        </div>
      </div>
    </div>
  );
}
