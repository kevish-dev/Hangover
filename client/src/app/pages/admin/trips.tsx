import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/axios";
import { TripFormModal } from "../../components/admin/TripFormModal";
import {
  Map,
  MapPin,
  Calendar,
  Users,
  IndianRupee,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  ChevronDown,
  ChevronUp,
  UserCircle,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";

// ── Booking status badge ──────────────────────────────────────────
function BookingStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    RESERVED: "bg-blue-100 text-blue-700",
    CONFIRMED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    COMPLETED: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold tracking-wide ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
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
    <span className={`px-2 py-0.5 rounded text-xs font-semibold tracking-wide ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

// ── Trip bookings drawer ──────────────────────────────────────────
function TripBookingsDrawer({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();
  const [processingRefundId, setProcessingRefundId] = useState<string | null>(null);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin", "bookings", "trip", tripId],
    queryFn: async () => {
      const res = await apiClient.get(`/bookings/trip/${tripId}`);
      return res.data as any[];
    },
  });

  const handleRefund = (paymentId: string) => {
    toast("Issue Refund", {
      description: "Are you sure you want to refund this payment? It will attempt a full refund.",
      position: "bottom-right",
      action: {
        label: "Refund",
        onClick: async () => {
          setProcessingRefundId(paymentId);
          try {
            await apiClient.post(`/payments/${paymentId}/refund`);
            toast.success("Refund initiated successfully");
            queryClient.invalidateQueries({ queryKey: ["admin", "bookings", "trip", tripId] });
          } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to initiate refund");
          } finally {
            setProcessingRefundId(null);
          }
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 gap-2 text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading bookings…
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="py-6 text-center text-gray-400 text-sm">
        No bookings yet for this trip.
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {bookings.map((b: any) => (
        <div key={b.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            {/* User info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <UserCircle className="w-8 h-8 text-gray-300 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {b.user?.profile?.fullName || "Unknown"}
                </p>
                <p className="text-xs text-gray-500 truncate">{b.user?.email}</p>
              </div>
            </div>

            {/* Booking ref + statuses */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="font-mono text-xs text-gray-500">{b.bookingReference}</span>
              <div className="flex items-center gap-1.5">
                <BookingStatusBadge status={b.status} />
                <PaymentStatusBadge status={b.paymentStatus} />
              </div>
            </div>
          </div>

          {/* Financial summary */}
          <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-gray-400 mb-0.5">Travelers</p>
              <p className="font-semibold text-gray-800">{b.numberOfTravelers}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-gray-400 mb-0.5">Total</p>
              <p className="font-semibold text-gray-800 flex items-center gap-0.5">
                <IndianRupee className="w-3 h-3" />
                {Number(b.totalAmount).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-gray-400 mb-0.5">Paid</p>
              <p className="font-semibold text-green-700 flex items-center gap-0.5">
                <IndianRupee className="w-3 h-3" />
                {Number(b.amountPaid ?? 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* Payments */}
          {b.payments && b.payments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {b.payments.map((p: any) => (
                <div key={p.id} className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1">
                  <CreditCard className="w-3 h-3 text-gray-400" />
                  <span className="font-medium text-gray-700">{p.type}</span>
                  <span className="text-gray-400">·</span>
                  <span className={p.status === "SUCCESS" ? "text-green-600 font-medium" : "text-gray-500"}>{p.status}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600 flex items-center gap-0.5">
                    <IndianRupee className="w-2.5 h-2.5" />{Number(p.amount).toLocaleString("en-IN")}
                  </span>
                  {p.status === "SUCCESS" && (
                    <button
                      onClick={() => handleRefund(p.id)}
                      disabled={processingRefundId === p.id}
                      className="ml-2 px-2 py-0.5 text-[0.65rem] font-semibold bg-red-50 text-red-600 border border-red-100 rounded hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      {processingRefundId === p.id ? "Refunding..." : "Refund"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="mt-2 text-xs text-gray-400">
            Booked {format(new Date(b.createdAt), "MMM d, yyyy · HH:mm")}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function AdminTripsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<any>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<"delete" | "publish" | null>(null);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "trips"],
    queryFn: async () => {
      const res = await apiClient.get("/trips");
      return res.data;
    },
  });

  const confirmAction = (title: string, description: string, actionLabel: string, actionFn: () => Promise<void>) => {
    toast(title, {
      description,
      position: "bottom-right",
      action: { label: actionLabel, onClick: actionFn },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  };

  const handleDelete = (tripId: string) => {
    confirmAction(
      "Are you sure you want to delete this trip?",
      "This action cannot be undone.",
      "Delete",
      async () => {
        setProcessingId(tripId);
        setProcessingAction("delete");
        try {
          await apiClient.delete(`/trips/${tripId}`);
          toast.success("Trip deleted successfully");
          queryClient.invalidateQueries({ queryKey: ["admin", "trips"] });
        } catch (error) {
          toast.error("Failed to delete trip");
        } finally {
          setProcessingId(null);
          setProcessingAction(null);
        }
      }
    );
  };

  const handleTogglePublish = (trip: any) => {
    const isPub = trip.isPublished;
    confirmAction(
      `Are you sure you want to ${isPub ? "unpublish" : "publish"} this trip?`,
      `This will make the trip ${isPub ? "hidden from" : "visible to"} the public.`,
      "Confirm",
      async () => {
        setProcessingId(trip.id);
        setProcessingAction("publish");
        try {
          await apiClient.put(`/trips/${trip.id}`, { isPublished: !isPub });
          toast.success(isPub ? "Trip unpublished" : "Trip published");
          queryClient.invalidateQueries({ queryKey: ["admin", "trips"] });
        } catch (error) {
          toast.error("Failed to update status");
        } finally {
          setProcessingId(null);
          setProcessingAction(null);
        }
      }
    );
  };

  const openCreateModal = () => {
    setEditingTrip(null);
    setIsModalOpen(true);
  };

  const openEditModal = (trip: any) => {
    setEditingTrip(trip);
    setIsModalOpen(true);
  };

  const toggleBookings = (tripId: string) => {
    setExpandedTripId((prev) => (prev === tripId ? null : tripId));
  };

  if (isLoading) {
    return <div className="p-8 text-gray-500">Loading trips...</div>;
  }

  const trips = data?.data || [];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Map className="w-6 h-6 text-[#c8a96e]" />
            Trip Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your trips, itineraries, and media all in one place.
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-[#c8a96e] hover:bg-[#b8943a] text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Trip
        </Button>
      </div>

      <TripFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        trip={editingTrip}
      />

      <div className="flex flex-col gap-4">
        {trips.length === 0 ? (
          <div className="py-12 text-center bg-white border border-gray-200 border-dashed rounded-xl">
            <p className="text-gray-500">No trips found. Create your first trip above!</p>
          </div>
        ) : (
          trips.map((trip: any) => (
            <div key={trip.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* ── Trip header row ── */}
              <div className="flex items-center gap-4 p-4">
                {/* Thumbnail */}
                <div className="w-20 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                  {trip.bannerImages?.length > 0 ? (
                    <img src={trip.bannerImages[0]} alt={trip.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No img</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900 leading-tight truncate">{trip.title}</h3>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600 uppercase tracking-wide shrink-0">
                      {trip.tripType.replace(/_/g, " ")}
                    </span>
                    {!trip.isPublished && (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 uppercase tracking-wide shrink-0">Draft</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{trip.location}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{trip.startDate ? format(new Date(trip.startDate), "MMM d, yyyy") : "TBD"}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{trip.filledSpots ?? 0}/{trip.capacity} booked</span>
                    <span className="flex items-center gap-1 font-semibold text-[#781216]"><IndianRupee className="w-3 h-3" />{parseInt(trip.price).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleBookings(trip.id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-[#781216] transition-colors px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-200"
                  >
                    {expandedTripId === trip.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    Bookings
                  </button>
                  <button
                    onClick={() => handleTogglePublish(trip)}
                    disabled={processingId === trip.id}
                    className={`text-xs font-medium transition-colors flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-200 ${trip.isPublished ? "text-gray-500 hover:text-orange-600" : "text-gray-500 hover:text-green-600"} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {processingId === trip.id && processingAction === "publish" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : trip.isPublished ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                    {trip.isPublished ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    onClick={() => openEditModal(trip)}
                    disabled={processingId === trip.id}
                    className="text-xs font-medium text-gray-500 hover:text-[#c8a96e] transition-colors flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(trip.id)}
                    disabled={processingId === trip.id}
                    className="text-xs font-medium text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingId === trip.id && processingAction === "delete" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete
                  </button>
                </div>
              </div>

              {/* ── Bookings drawer ── */}
              {expandedTripId === trip.id && (
                <div className="border-t border-gray-100">
                  <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bookings for this trip</p>
                  </div>
                  <TripBookingsDrawer tripId={trip.id} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
