import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/axios";
import { TripFormModal } from "../../components/admin/TripFormModal";
import { formatTripType } from "../../../lib/tripApi";
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
  Link2,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { getErrorMessage, showErrorToast } from "../../../lib/errors";

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
      {status?.replace("_", " ") || "UNKNOWN"}
    </span>
  );
}

// ── Trip bookings drawer ──────────────────────────────────────────
function TripBookingsDrawer({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();

  const bookingsQuery = useQuery({
    queryKey: ["admin", "bookings", "trip", tripId],
    queryFn: async () => {
      const res = await apiClient.get(`/bookings/trip/${tripId}`);
      return res.data as any[];
    },
  });
  const { data: bookings, isLoading } = bookingsQuery;
  useEffect(() => {
    if (bookingsQuery.isError) toast.error(getErrorMessage(bookingsQuery.error, "Bookings could not be loaded"), { id: `trip-bookings-error-${tripId}` });
  }, [bookingsQuery.error, bookingsQuery.isError, tripId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 gap-2 text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading bookings…
      </div>
    );
  }

  if (bookingsQuery.isError) {
    return <div role="alert" className="px-5 py-6 text-center text-sm text-red-700">Bookings could not be loaded. <button type="button" onClick={() => bookingsQuery.refetch()} className="font-semibold underline">Try again</button></div>;
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
        <div key={b.id} className="px-3 py-4 md:px-5 hover:bg-gray-50 transition-colors">
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
            <div className="flex w-full md:w-auto flex-col items-start md:items-end gap-1.5 md:shrink-0">
              <span className="font-mono text-xs text-gray-500">{b.bookingReference}</span>
              <div className="flex items-center gap-1.5">
                <BookingStatusBadge status={b.status} />
                <PaymentStatusBadge status={b.paymentStatus} />
              </div>
            </div>
          </div>

          {/* Financial summary */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 text-xs">
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
                  <span className="text-gray-600 flex items-center gap-0.5">
                    <IndianRupee className="w-2.5 h-2.5" />{Number(p.amount).toLocaleString("en-IN")}
                  </span>
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
  const [processingAction, setProcessingAction] = useState<"delete" | "publish" | "edit" | null>(null);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [generatedShareLink, setGeneratedShareLink] = useState<{ title: string; url: string } | null>(null);

  const tripsQuery = useQuery({
    queryKey: ["admin", "trips"],
    queryFn: async () => {
      const res = await apiClient.get("/trips", { params: { adminView: true, limit: 200 } });
      return res.data;
    },
  });
  const { data, isLoading } = tripsQuery;
  useEffect(() => {
    if (tripsQuery.isError) toast.error(getErrorMessage(tripsQuery.error, "Trips could not be loaded"), { id: "admin-trips-load-error" });
  }, [tripsQuery.error, tripsQuery.isError]);

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
          showErrorToast(error, "Failed to delete trip");
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
          showErrorToast(error, "Failed to update trip status");
        } finally {
          setProcessingId(null);
          setProcessingAction(null);
        }
      }
    );
  };

  const handleCreateShareLink = async (trip: any) => {
    try {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await apiClient.post(`/trips/${trip.id}/share-link`, { expiresAt });
      const url = `${window.location.origin}/trips/${trip.slug}?share=${encodeURIComponent(data.token)}`;
      setGeneratedShareLink({ title: trip.title, url });
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Private booking link copied", { description: "The link expires in 30 days." });
      } catch {
        toast.warning("Private link created, but automatic copy was blocked", { description: "Copy it manually from the open dialog. The link expires in 30 days." });
      }
    } catch (error: unknown) {
      showErrorToast(error, "Could not create the private link");
    }
  };

  const copyGeneratedShareLink = async () => {
    if (!generatedShareLink) return;
    try {
      await navigator.clipboard.writeText(generatedShareLink.url);
      toast.success("Private booking link copied");
    } catch (error) {
      showErrorToast(error, "Automatic copy is unavailable", "Select the link and copy it manually.");
    }
  };

  const openCreateModal = () => {
    setEditingTrip(null);
    setIsModalOpen(true);
  };

  const openEditModal = async (trip: any) => {
    setProcessingId(trip.id);
    setProcessingAction("edit");
    try {
      const res = await apiClient.get(`/trips/${trip.id}?adminView=true`);
      setEditingTrip(res.data);
      setIsModalOpen(true);
    } catch (error) {
      showErrorToast(error, "Failed to fetch full trip details");
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  const toggleBookings = (tripId: string) => {
    setExpandedTripId((prev) => (prev === tripId ? null : tripId));
  };

  if (isLoading) {
    return <div className="p-8 text-gray-500">Loading trips...</div>;
  }
  if (tripsQuery.isError) {
    return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800"><p className="font-bold">Trips could not be loaded.</p><button type="button" onClick={() => tripsQuery.refetch()} className="mt-3 text-sm font-semibold underline">Try again</button></div>;
  }

  const trips = data?.data || [];

  return (
    <div className="w-full">
      <div className="flex flex-col items-stretch md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Map className="w-6 h-6 text-[#c8a96e]" />
            Trip Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your trips, itineraries, and media all in one place.
          </p>
        </div>
        <Button onClick={openCreateModal} className="w-full md:w-auto bg-[#c8a96e] hover:bg-[#b8943a] text-white flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Create Trip
        </Button>
      </div>

      <TripFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        trip={editingTrip}
      />
      <Dialog open={Boolean(generatedShareLink)} onOpenChange={(nextOpen) => !nextOpen && setGeneratedShareLink(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Private booking link</DialogTitle>
            <DialogDescription>{generatedShareLink?.title} · expires in 30 days. Creating another link will replace this one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input readOnly value={generatedShareLink?.url || ""} onFocus={(event) => event.currentTarget.select()} />
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setGeneratedShareLink(null)}>Close</Button><Button type="button" onClick={copyGeneratedShareLink} className="bg-[#781216] hover:bg-[#5f0e11]">Copy link</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-4">
        {trips.length === 0 ? (
          <div className="py-12 text-center bg-white border border-gray-200 border-dashed rounded-xl">
            <p className="text-gray-500">No trips found. Create your first trip above!</p>
          </div>
        ) : (
          trips.map((trip: any) => (
            <div key={trip.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* ── Trip header row ── */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 p-3 md:p-4">
                {/* Thumbnail */}
                <div className="w-full h-32 md:w-20 md:h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
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
                      {trip.tripType ? formatTripType(trip.tripType) : "UNKNOWN"}
                    </span>
                    {!trip.isPublished && (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 uppercase tracking-wide shrink-0">Draft</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{trip.location}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{trip.slots?.[0]?.startDate ? format(new Date(trip.slots[0].startDate), "MMM d, yyyy") : "No departure"}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{(trip.slots || []).reduce((sum: number, slot: any) => sum + Number(slot.filledSpots || 0), 0)}/{(trip.slots || []).reduce((sum: number, slot: any) => sum + Number(slot.capacity || 0), 0)} booked</span>
                    <span className="flex items-center gap-1 font-semibold text-[#781216]"><IndianRupee className="w-3 h-3" />{parseInt(trip.packages?.[0]?.price || 0).toLocaleString("en-IN")}</span>
                    {trip.circuit && <span className="text-[#8a6414]">From {trip.circuit.title}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 md:flex md:items-center gap-2 md:gap-1 w-full md:w-auto md:shrink-0">
                  <button
                    onClick={() => toggleBookings(trip.id)}
                    className="flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 hover:text-[#781216] transition-colors px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-200"
                  >
                    {expandedTripId === trip.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    Bookings
                  </button>
                  <button
                    onClick={() => handleCreateShareLink(trip)}
                    className="text-xs font-medium text-gray-500 hover:text-[#781216] transition-colors flex items-center justify-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-200"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Private link
                  </button>
                  <button
                    onClick={() => handleTogglePublish(trip)}
                    disabled={processingId === trip.id}
                    className={`text-xs font-medium transition-colors flex items-center justify-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-200 ${trip.isPublished ? "text-gray-500 hover:text-orange-600" : "text-gray-500 hover:text-green-600"} disabled:opacity-50 disabled:cursor-not-allowed`}
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
                    className="text-xs font-medium text-gray-500 hover:text-[#c8a96e] transition-colors flex items-center justify-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingId === trip.id && processingAction === "edit" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Edit2 className="w-3.5 h-3.5" />
                    )}
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(trip.id)}
                    disabled={processingId === trip.id}
                    className="text-xs font-medium text-gray-500 hover:text-red-600 transition-colors flex items-center justify-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className="px-3 md:px-5 py-3 bg-gray-50 flex items-center justify-between">
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
