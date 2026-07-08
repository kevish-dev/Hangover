import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "../../../lib/axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
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
  Tent,
  Trash,
  ImageIcon
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { FestivalFormModal } from "../../components/admin/FestivalFormModal";

// ── Booking status badges ──────────────────────────────────────────
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

// ── Festival Bookings drawer ──────────────────────────────────────────
function FestivalBookingsDrawer({ festivalId }: { festivalId: string }) {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin", "bookings", "festival", festivalId],
    queryFn: async () => {
      const res = await apiClient.get(`/bookings/festival/${festivalId}`);
      return res.data as any[];
    },
  });

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
        No bookings yet for this festival.
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {bookings.map((b: any) => (
        <div key={b.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <UserCircle className="w-8 h-8 text-gray-300 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {b.user?.profile?.fullName || "Unknown"}
                </p>
                <p className="text-xs text-gray-500 truncate">{b.user?.email}</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="font-mono text-xs text-gray-500">{b.bookingReference}</span>
              <div className="flex items-center gap-1.5">
                <BookingStatusBadge status={b.status} />
                <PaymentStatusBadge status={b.paymentStatus} />
              </div>
            </div>
          </div>

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



// ── Main Admin Page ─────────────────────────────────────────────────────
export default function AdminFestivalsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFestival, setEditingFestival] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "festivals"],
    queryFn: async () => {
      const res = await apiClient.get("/festivals?adminView=true");
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

  const handleDelete = (id: string) => {
    confirmAction(
      "Delete Festival?",
      "Are you sure you want to delete this festival?",
      "Delete",
      async () => {
        try {
          await apiClient.delete(`/festivals/${id}`);
          toast.success("Festival deleted");
          queryClient.invalidateQueries({ queryKey: ["admin", "festivals"] });
        } catch (error) {
          toast.error("Failed to delete festival");
        }
      }
    );
  };

  const handleTogglePublish = (fest: any) => {
    confirmAction(
      fest.isPublished ? "Unpublish Festival?" : "Publish Festival?",
      `Are you sure you want to ${fest.isPublished ? "unpublish" : "publish"} this festival?`,
      "Confirm",
      async () => {
        try {
          await apiClient.put(`/festivals/${fest.id}`, { isPublished: !fest.isPublished });
          toast.success(fest.isPublished ? "Unpublished" : "Published");
          queryClient.invalidateQueries({ queryKey: ["admin", "festivals"] });
        } catch (error) {
          toast.error("Failed to update status");
        }
      }
    );
  };

  const openEditModal = async (fest: any) => {
    try {
      const res = await apiClient.get(`/festivals/${fest.id}?adminView=true`);
      setEditingFestival(res.data);
      setIsModalOpen(true);
    } catch {
      toast.error("Failed to fetch details");
    }
  };

  if (isLoading) return <div className="p-8 text-gray-500">Loading festivals...</div>;

  const festivals = data?.data || [];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tent className="w-6 h-6 text-[#c8a96e]" />
            Festival Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage your festivals, tickets, and details.</p>
        </div>
        <Button onClick={() => { setEditingFestival(null); setIsModalOpen(true); }} className="bg-[#c8a96e] hover:bg-[#b8943a] text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Festival
        </Button>
      </div>

      <FestivalFormModal open={isModalOpen} onOpenChange={setIsModalOpen} festival={editingFestival} />

      <div className="flex flex-col gap-4">
        {festivals.length === 0 ? (
          <div className="py-12 text-center bg-white border border-gray-200 border-dashed rounded-xl">
            <p className="text-gray-500">No festivals found. Create your first festival above!</p>
          </div>
        ) : (
          festivals.map((fest: any) => (
            <div key={fest.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="w-20 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                  {fest.bannerImages?.length > 0 ? (
                    <img src={fest.bannerImages[0]} alt={fest.title} className="w-full h-full object-cover" />
                  ) : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No img</div>}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900 leading-tight truncate">{fest.title}</h3>
                    {!fest.isPublished && <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 uppercase tracking-wide shrink-0">Draft</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{fest.location}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fest.startDate ? format(new Date(fest.startDate), "MMM d, yyyy") : "TBD"}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{fest.filledSpots ?? 0}/{fest.capacity} booked</span>
                    <span className="flex items-center gap-1 font-semibold text-[#781216]"><IndianRupee className="w-3 h-3" />{parseInt(fest.price).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setExpandedId(expandedId === fest.id ? null : fest.id)} className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-[#781216] transition-colors px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-200">
                    {expandedId === fest.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} Bookings
                  </button>
                  <button onClick={() => handleTogglePublish(fest)} className={`text-xs font-medium transition-colors flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-200 ${fest.isPublished ? "text-gray-500 hover:text-orange-600" : "text-gray-500 hover:text-green-600"}`}>
                    {fest.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {fest.isPublished ? "Unpublish" : "Publish"}
                  </button>
                  <button onClick={() => openEditModal(fest)} className="text-xs font-medium text-gray-500 hover:text-[#c8a96e] transition-colors flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-200">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleDelete(fest.id)} className="text-xs font-medium text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-200">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>

              {expandedId === fest.id && (
                <div className="border-t border-gray-100">
                  <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bookings for this festival</p>
                  </div>
                  <FestivalBookingsDrawer festivalId={fest.id} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
