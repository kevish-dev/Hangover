import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/axios";
import { CalendarCheck, IndianRupee, Loader2, Bell, X, User, MapPin, Mail, Phone, Image as ImageIcon, MoreVertical, Search, ArrowUpDown, Filter, AlertCircle, Plus } from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import { finalizeBooking } from "../../../lib/bookingApi";
import { useMutation } from "@tanstack/react-query";
import CreateBookingModal from "../../components/admin/CreateBookingModal";

function BookingStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-50 text-yellow-700 border border-yellow-200/60",
    RESERVED: "bg-blue-50 text-blue-700 border border-blue-200/60",
    CONFIRMED: "bg-green-50 text-green-700 border border-green-200/60",
    CANCELLED: "bg-red-50 text-red-700 border border-red-200/60",
    COMPLETED: "bg-purple-50 text-purple-700 border border-purple-200/60",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${map[status] ?? "bg-gray-50 text-gray-600 border border-gray-200/60"}`}>
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
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${map[status] ?? "bg-gray-50 text-gray-600 border border-gray-200/60"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function ActionMenu({ booking, onRemind, onCancelAndRefund, onFinalize }: { booking: any, onRemind: () => void, onCancelAndRefund: () => void, onFinalize: () => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const hasSuccessfulPayments = booking.payments?.some((p: any) => p.status === "SUCCESS");
  const isCancellable = booking.status !== "CANCELLED" && booking.status !== "COMPLETED";
  const totalPaid = Number(booking.amountPaid) || 0;

  const isFinalizable = booking.status === "CONFIRMED";

  if (booking.status === "PENDING" || (booking.paymentStatus !== "PARTIALLY_PAID" && !hasSuccessfulPayments && !isCancellable && !isFinalizable)) {
    return <div className="text-gray-400 text-xs italic">No actions</div>;
  }

  return (
    <div className="relative inline-block text-right" ref={menuRef}>
      <button 
        aria-label={`Open actions for booking ${booking.bookingReference}`}
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors focus:outline-none"
      >
        <MoreVertical className="w-5 h-5" />
      </button>
      
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 shadow-xl rounded-md overflow-hidden z-20 text-left">
          {booking.paymentStatus === "PARTIALLY_PAID" && (
            <button 
              onClick={(e) => { e.stopPropagation(); setOpen(false); onRemind(); }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors border-b border-gray-50"
            >
              <Bell className="w-4 h-4 text-blue-600" />
              Remind Balance
            </button>
          )}

          {isFinalizable && (
            <button 
              onClick={(e) => { e.stopPropagation(); setOpen(false); onFinalize(); }}
              className="w-full text-left px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2 transition-colors border-b border-gray-50"
            >
              <CalendarCheck className="w-4 h-4 text-green-600" />
              Finalize Trip
            </button>
          )}

          {isCancellable && (
            <button 
              onClick={(e) => { e.stopPropagation(); setOpen(false); onCancelAndRefund(); }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
            >
              <X className="w-4 h-4" />
              {totalPaid > 0 ? "Cancel & Refund" : "Cancel Booking"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ConfirmCancelModal({ booking, onConfirm, onClose }: { booking: any, onConfirm: (refundAmount?: number) => void, onClose: () => void }) {
  const totalPaid = Number(booking?.amountPaid) || 0;
  const [refundAmount, setRefundAmount] = useState<string>("");

  return (
    <div role="dialog" aria-modal="true" aria-label="Confirm booking cancellation" className="fixed inset-0 z-[60] flex items-center justify-center p-2 md:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm max-h-[calc(100dvh-1rem)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 md:px-6 py-4 bg-red-50 border-b border-red-100 flex justify-between items-center gap-3">
          <h2 className="text-base md:text-lg font-bold text-red-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Confirm Cancellation
          </h2>
          <button aria-label="Close cancellation dialog" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center hover:bg-red-100 rounded-full text-red-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 md:p-6">
          {totalPaid > 0 ? (
            <>
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                This booking has received payments totaling <strong>₹{totalPaid.toLocaleString("en-IN")}</strong>. Please specify the amount to refund.
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Refund Amount (Max: ₹{totalPaid.toLocaleString("en-IN")})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="Enter amount"
                    max={totalPaid}
                    min={0}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-base md:text-sm"
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-700 mb-6 leading-relaxed">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
          )}

          <div className="flex flex-col-reverse md:flex-row gap-3 md:justify-end">
            <button 
              onClick={onClose}
              className="min-h-10 w-full md:w-auto px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              No, keep booking
            </button>
            <button 
              onClick={() => {
                if (totalPaid > 0) {
                  if (refundAmount === "") {
                    toast.error("Please enter a refund amount.");
                    return;
                  }
                  const amount = Number(refundAmount);
                  if (isNaN(amount) || amount < 0 || amount > totalPaid) {
                    toast.error("Please enter a valid refund amount.");
                    return;
                  }
                  onConfirm(amount);
                } else {
                  onConfirm();
                }
              }}
              className="min-h-10 w-full md:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
            >
              {totalPaid > 0 ? "Cancel & Refund" : "Yes, Cancel Booking"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminBookingsPage() {
  const queryClient = useQueryClient();

  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");



  const finalizeMutation = useMutation({
    mutationFn: finalizeBooking,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to finalize booking");
    }
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: async () => {
      const res = await apiClient.get("/bookings?limit=1000");
      return res.data;
    },
  });

  const handleRemind = async (bookingId: string) => {
    const toastId = toast.loading("Sending reminder email...");
    try {
      await apiClient.post("/payments/reminders/send", { bookingId });
      toast.success("Reminder email sent successfully!", { id: toastId });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send reminder.", { id: toastId });
    }
  };

  const handleCancelAndRefund = async (bookingId: string, refundAmount?: number) => {
    const toastId = toast.loading("Processing cancellation...");
    try {
      await apiClient.post(`/bookings/${bookingId}/cancel-and-refund`, { 
        reason: "Admin initiated cancellation",
        ...(refundAmount !== undefined && { refundAmount })
      });
      toast.success("Booking cancelled successfully!", { id: toastId });
      setConfirmCancelId(null);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to cancel booking.", { id: toastId });
    }
  };

  const handleFinalize = (bookingId: string) => {
    if (window.confirm("Are you sure you want to mark this trip as COMPLETED and send a review email to the user?")) {
      finalizeMutation.mutate(bookingId);
    }
  };

  const allBookings = data?.data || [];

  // Filter and Sort Logic
  const processedBookings = useMemo(() => {
    let filtered = [...allBookings];

    // Status Filter
    if (statusFilter !== "ALL") {
      filtered = filtered.filter(b => b.status === statusFilter || b.paymentStatus === statusFilter);
    }

    // Search Filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(b => 
        b.bookingReference?.toLowerCase().includes(q) ||
        b.user?.profile?.fullName?.toLowerCase().includes(q) ||
        b.user?.email?.toLowerCase().includes(q) ||
        b.trip?.title?.toLowerCase().includes(q) ||
        b.festival?.title?.toLowerCase().includes(q) ||
        b.customTrip?.title?.toLowerCase().includes(q) ||
        b.customTrip?.reference?.toLowerCase().includes(q)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === "date_desc") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "date_asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "amount_desc") return Number(b.totalAmount) - Number(a.totalAmount);
      if (sortBy === "amount_asc") return Number(a.totalAmount) - Number(b.totalAmount);
      return 0;
    });

    return filtered;
  }, [allBookings, searchQuery, statusFilter, sortBy]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#c8a96e]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-[#c8a96e]" />
            Bookings Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Overview of all bookings across all trips.
          </p>
        </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b09561] text-white rounded-full text-base md:text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Booking
            </button>
          <div className="relative w-full md:w-auto">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Search by name, ref, trip/festival..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-200/60 rounded-full text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50 focus:border-[#c8a96e] w-full md:w-64 transition-all shadow-sm"
            />
          </div>


          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2 w-full md:flex md:items-center md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200/60 rounded-full text-base md:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50 focus:border-[#c8a96e] w-full md:w-auto transition-all shadow-sm"
            >
              <option value="ALL">All Status</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200/60 rounded-full text-base md:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50 focus:border-[#c8a96e] w-full md:w-auto transition-all shadow-sm"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Amount (High to Low)</option>
              <option value="amount_asc">Amount (Low to High)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {processedBookings.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
            No bookings found matching your criteria.
          </div>
        ) : (
          processedBookings.map((b: any) => (
            <article
              key={b.id}
              onClick={() => navigate(`/dashboard/bookings/${b.id}`)}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold text-[#781216]">{b.bookingReference}</p>
                  <h2 className="mt-1 break-words text-sm font-semibold text-gray-900">{b.customTrip?.title || b.trip?.title || b.festival?.title}</h2>
                </div>
                <div onClick={(event) => event.stopPropagation()} className="shrink-0">
                  <ActionMenu
                    booking={b}
                    onRemind={() => handleRemind(b.id)}
                    onCancelAndRefund={() => setConfirmCancelId(b.id)}
                    onFinalize={() => handleFinalize(b.id)}
                  />
                </div>
              </div>

              <div className="mt-3 rounded-lg bg-gray-50 p-3">
                <p className="break-words text-sm font-medium text-gray-900">{b.user?.profile?.fullName || "N/A"}</p>
                <p className="break-all text-xs text-gray-500">{b.user?.email}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <BookingStatusBadge status={b.status} />
                <PaymentStatusBadge status={b.paymentStatus} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-xs">
                <div>
                  <p className="text-gray-400">Travelers</p>
                  <p className="mt-0.5 font-semibold text-gray-900">{b.numberOfTravelers}</p>
                </div>
                <div>
                  <p className="text-gray-400">Booked</p>
                  <p className="mt-0.5 font-medium text-gray-700">{format(new Date(b.createdAt), "MMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-gray-400">Total</p>
                  <p className="mt-0.5 font-semibold text-gray-900">₹{Number(b.totalAmount).toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-gray-400">Received</p>
                  <p className="mt-0.5 font-semibold text-green-600">₹{Number(b.amountPaid || 0).toLocaleString("en-IN")}</p>
                </div>
              </div>
              <p className="mt-3 text-right text-xs font-medium text-[#781216]">Tap to view details</p>
            </article>
          ))
        )}
      </div>

      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="w-full min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-gray-100 text-gray-500 font-medium text-xs tracking-wider uppercase">
              <tr>
                <th className="px-4 py-4">Ref</th>
                <th className="px-4 py-4">Item</th>
                <th className="px-4 py-4">User</th>
                <th className="px-4 py-4 text-center">Pax</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Financials</th>
                <th className="px-4 py-4">Date</th>
                <th className="px-4 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processedBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No bookings found matching your criteria.
                  </td>
                </tr>
              ) : (
                processedBookings.map((b: any) => (
                  <tr 
                    key={b.id} 
                    className="hover:bg-[#fbf7ed]/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/dashboard/bookings/${b.id}`)}
                  >
                    <td className="px-4 py-4 font-mono font-medium text-gray-900 text-xs">
                      {b.bookingReference}
                    </td>
                    <td className="px-4 py-4 text-gray-700 max-w-[150px] truncate text-sm">
                      {b.customTrip?.title || b.trip?.title || b.festival?.title}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-gray-900 font-medium truncate max-w-[140px] text-sm">{b.user?.profile?.fullName || "N/A"}</div>
                      <div className="text-gray-500 text-xs truncate max-w-[140px]">{b.user?.email}</div>
                    </td>
                    <td className="px-4 py-4 text-center text-gray-900 text-sm">
                      {b.numberOfTravelers}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        <BookingStatusBadge status={b.status} />
                        <PaymentStatusBadge status={b.paymentStatus} />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="font-medium text-gray-900 flex items-center gap-1 text-sm">
                          <IndianRupee className="w-3.5 h-3.5 text-gray-500" />
                          {Number(b.totalAmount).toLocaleString("en-IN")}
                        </div>
                        <div className="font-medium text-green-600 flex items-center gap-0.5 text-xs">
                          Paid: <IndianRupee className="w-3 h-3 text-green-500" />
                          {Number(b.amountPaid || 0).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-500 text-xs whitespace-nowrap">
                      {format(new Date(b.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu 
                        booking={b} 
                        onRemind={() => handleRemind(b.id)} 
                        onCancelAndRefund={() => setConfirmCancelId(b.id)}
                        onFinalize={() => handleFinalize(b.id)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmCancelId && (
        <ConfirmCancelModal 
          booking={allBookings.find((b: any) => b.id === confirmCancelId)}
          onConfirm={(refundAmount) => handleCancelAndRefund(confirmCancelId, refundAmount)} 
          onClose={() => setConfirmCancelId(null)} 
        />
      )}



      {showCreateModal && (
        <CreateBookingModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
          }}
        />
      )}
      <style>{`
        @media (max-width: 767px) {
          .admin-booking-detail-grid {
            grid-template-columns: minmax(82px, 0.8fr) minmax(0, 2fr) !important;
          }
          .admin-booking-detail-grid > * {
            min-width: 0;
            overflow-wrap: anywhere;
          }
          .admin-booking-detail-grid > .col-span-2 {
            grid-column: span 1 / span 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
