import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/axios";
import { CalendarCheck, IndianRupee, Loader2, Bell, X, User, MapPin, Mail, Phone, Image as ImageIcon, MoreVertical, Search, ArrowUpDown, Filter, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";

function BookingStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    RESERVED: "bg-blue-100 text-blue-700",
    CONFIRMED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    COMPLETED: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded text-xs font-semibold tracking-wider ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: "bg-green-100 text-green-700",
    PARTIALLY_PAID: "bg-blue-100 text-blue-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    REFUNDED: "bg-purple-100 text-purple-700",
    FAILED: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded text-xs font-semibold tracking-wider ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function ActionMenu({ booking, onRemind, onCancelAndRefund }: { booking: any, onRemind: () => void, onCancelAndRefund: () => void }) {
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

  if (booking.status === "PENDING" || (booking.paymentStatus !== "PARTIALLY_PAID" && !hasSuccessfulPayments && !isCancellable)) {
    return <div className="text-gray-400 text-xs italic">No actions</div>;
  }

  return (
    <div className="relative inline-block text-right" ref={menuRef}>
      <button 
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-red-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Confirm Cancellation
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-red-100 rounded-full text-red-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
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
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-700 mb-6 leading-relaxed">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
          )}

          <div className="flex gap-3 justify-end">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
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
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");

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
        b.festival?.title?.toLowerCase().includes(q)
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-[#c8a96e]" />
            Bookings Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Overview of all bookings across all trips.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Search by name, ref, trip/festival..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e] focus:border-transparent w-full sm:w-64"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#c8a96e] w-full sm:w-auto"
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
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#c8a96e] w-full sm:w-auto"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Amount (High to Low)</option>
              <option value="amount_asc">Amount (Low to High)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
              <tr>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4 text-center">Travelers</th>
                <th className="px-6 py-4">Booking Status</th>
                <th className="px-6 py-4">Payment Status</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Amount Received</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processedBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No bookings found matching your criteria.
                  </td>
                </tr>
              ) : (
                processedBookings.map((b: any) => (
                  <tr 
                    key={b.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedBooking(b)}
                  >
                    <td className="px-6 py-4 font-mono font-medium text-gray-900">
                      {b.bookingReference}
                    </td>
                    <td className="px-6 py-4 text-gray-700 max-w-[200px] truncate">
                      {b.trip?.title || b.festival?.title}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 font-medium">{b.user?.profile?.fullName || "N/A"}</div>
                      <div className="text-gray-500 text-xs">{b.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-900">
                      {b.numberOfTravelers}
                    </td>
                    <td className="px-6 py-4">
                      <BookingStatusBadge status={b.status} />
                    </td>
                    <td className="px-6 py-4">
                      <PaymentStatusBadge status={b.paymentStatus} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5 text-gray-500" />
                        {Number(b.totalAmount).toLocaleString("en-IN")}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-green-600 flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5 text-green-500" />
                        {Number(b.amountPaid || 0).toLocaleString("en-IN")}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                      {format(new Date(b.createdAt), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu 
                        booking={b} 
                        onRemind={() => handleRemind(b.id)} 
                        onCancelAndRefund={() => setConfirmCancelId(b.id)}
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

      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedBooking(null)}>
          <div 
            className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">
                Booking Details - <span className="font-mono text-[#c8a96e]">{selectedBooking.bookingReference}</span>
              </h2>
              <button 
                onClick={() => setSelectedBooking(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-8">
                {/* User Profile */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#781216]" /> Primary Traveler
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-gray-500">Name:</span>
                      <span className="col-span-2 font-medium text-gray-900">{selectedBooking.user?.profile?.fullName || "N/A"}</span>
                      
                      <span className="text-gray-500">Email:</span>
                      <span className="col-span-2 text-gray-900">{selectedBooking.user?.email || "N/A"}</span>
                      
                      <span className="text-gray-500">Phone:</span>
                      <span className="col-span-2 text-gray-900">{selectedBooking.user?.profile?.phone || "N/A"}</span>
                      
                      <span className="text-gray-500">Address:</span>
                      <span className="col-span-2 text-gray-900">{selectedBooking.user?.profile?.addressLine1 || "N/A"}</span>

                      <span className="text-gray-500">Gender:</span>
                      <span className="col-span-2 text-gray-900">{selectedBooking.user?.profile?.gender || "N/A"}</span>

                      <span className="text-gray-500">DOB:</span>
                      <span className="col-span-2 text-gray-900">
                        {selectedBooking.user?.profile?.dateOfBirth ? format(new Date(selectedBooking.user.profile.dateOfBirth), "PP") : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Govt ID */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#781216]" /> Government ID
                  </h3>
                  {selectedBooking.user?.profile?.govtIdImageUrl ? (
                    <a 
                      href={selectedBooking.user.profile.govtIdImageUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="block border-2 border-dashed border-gray-300 rounded-lg overflow-hidden hover:border-[#781216] transition-colors"
                    >
                      <img 
                        src={selectedBooking.user.profile.govtIdImageUrl} 
                        alt="Govt ID" 
                        className="w-full h-48 object-cover"
                      />
                    </a>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-500 text-center">
                      No Government ID provided.
                    </div>
                  )}
                </div>

                {/* Other Travelers */}
                {selectedBooking.travelers && selectedBooking.travelers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#781216]" /> Other Travelers
                    </h3>
                    <div className="space-y-3">
                      {selectedBooking.travelers.map((traveler: any, idx: number) => (
                        <div key={traveler.id || idx} className="bg-gray-50 p-4 rounded-lg text-sm">
                          <div className="font-medium text-gray-900 mb-2">Traveler {idx + 1}: {traveler.fullName}</div>
                          <div className="grid grid-cols-3 gap-2">
                            <span className="text-gray-500">Gender:</span>
                            <span className="col-span-2 text-gray-900">{traveler.gender || "N/A"}</span>
                            
                            <span className="text-gray-500">DOB:</span>
                            <span className="col-span-2 text-gray-900">
                              {traveler.dateOfBirth ? format(new Date(traveler.dateOfBirth), "PP") : "N/A"}
                            </span>
                            
                            <span className="text-gray-500">Phone:</span>
                            <span className="col-span-2 text-gray-900">{traveler.phone || "N/A"}</span>
                            
                            <span className="text-gray-500">Aadhaar:</span>
                            <span className="col-span-2 text-gray-900">
                              {traveler.aadhaar ? (
                                <a href={traveler.aadhaar} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                  View Document
                                </a>
                              ) : "N/A"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                {/* Item Details */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#781216]" /> Item Details
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-gray-500">Item:</span>
                      <span className="col-span-2 font-medium text-gray-900">{selectedBooking.trip?.title || selectedBooking.festival?.title || "N/A"}</span>
                      
                      <span className="text-gray-500">Package:</span>
                      <span className="col-span-2 text-gray-900">{selectedBooking.package?.title || "No Package"}</span>
                      
                      <span className="text-gray-500">Slot:</span>
                      <span className="col-span-2 text-gray-900">
                        {selectedBooking.slot 
                          ? `${format(new Date(selectedBooking.slot.startDate), "PP")} - ${format(new Date(selectedBooking.slot.endDate), "PP")}`
                          : "No Slot Selected"}
                      </span>

                      <span className="text-gray-500">Travelers:</span>
                      <span className="col-span-2 text-gray-900">{selectedBooking.numberOfTravelers} Person(s)</span>
                      
                      <span className="text-gray-500">Booked On:</span>
                      <span className="col-span-2 text-gray-900">{format(new Date(selectedBooking.createdAt), "PPp")}</span>

                      <span className="text-gray-500">Status:</span>
                      <span className="col-span-2"><BookingStatusBadge status={selectedBooking.status} /></span>
                    </div>
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-[#781216]" /> Payment Breakdown
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-gray-500">Total Amount:</span>
                      <span className="col-span-2 font-medium text-gray-900">₹{Number(selectedBooking.totalAmount).toLocaleString("en-IN")}</span>
                      
                      <span className="text-gray-500">Amount Paid:</span>
                      <span className="col-span-2 text-green-600 font-medium">₹{Number(selectedBooking.amountPaid).toLocaleString("en-IN")}</span>
                      
                      <span className="text-gray-500">Balance Due:</span>
                      <span className="col-span-2 text-red-600 font-medium">₹{Number(selectedBooking.amountDue).toLocaleString("en-IN")}</span>

                      <span className="text-gray-500">Status:</span>
                      <span className="col-span-2"><PaymentStatusBadge status={selectedBooking.paymentStatus} /></span>
                    </div>
                  </div>
                </div>

                {/* Special Requests */}
                {selectedBooking.specialRequests && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                      Special Requests
                    </h3>
                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm whitespace-pre-wrap">
                      {selectedBooking.specialRequests}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 border-t border-gray-100 p-4 text-right sticky bottom-0 z-10">
              <button 
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
