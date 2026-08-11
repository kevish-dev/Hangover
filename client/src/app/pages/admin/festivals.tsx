import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { apiClient } from "../../../lib/axios";
import { FestivalFormModal } from "../../components/admin/FestivalFormModal";
import {
  Tent,
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
  Link2,
  MoreVertical,
  ChevronRight,
  Search,
  BarChart2,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { getErrorMessage, showErrorToast } from "../../../lib/errors";

function FestivalActionMenu({ festival, processingId, processingAction, onShare, onTogglePublish, onEdit, onDelete }: any) {
  const [open, setOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block text-right" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors focus:outline-none"
        aria-label="Festival actions"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-100 shadow-2xl rounded-2xl overflow-hidden z-20 text-left">
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onShare(festival); }}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-50"
          >
            <Link2 className="w-4 h-4 text-gray-400" /> Private link
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onTogglePublish(festival); }}
            disabled={processingId === festival.id}
            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-50 text-gray-700"
          >
            {processingId === festival.id && processingAction === "publish" ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : festival.isPublished ? (
              <EyeOff className="w-4 h-4 text-amber-500" />
            ) : (
              <Eye className="w-4 h-4 text-emerald-500" />
            )}
            {festival.isPublished ? "Unpublish" : "Publish"}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(festival); }}
            disabled={processingId === festival.id}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-50"
          >
            {processingId === festival.id && processingAction === "edit" ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              <Edit2 className="w-4 h-4 text-[#c8a96e]" />
            )}
            Edit Festival
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(festival); }}
            disabled={processingId === festival.id}
            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
          >
            {processingId === festival.id && processingAction === "delete" ? (
              <Loader2 className="w-4 h-4 animate-spin text-red-400" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function AdminFestivalsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFestival, setEditingFestival] = useState<any>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<"delete" | "publish" | "edit" | null>(null);
  const [festivalToDelete, setFestivalToDelete] = useState<any>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [generatedShareLink, setGeneratedShareLink] = useState<{ title: string; url: string } | null>(null);
  const [search, setSearch] = useState("");

  const festivalsQuery = useQuery({
    queryKey: ["admin", "festivals"],
    queryFn: async () => {
      const res = await apiClient.get("/festivals", { params: { adminView: true, limit: 200 } });
      return res.data;
    },
  });
  const { data, isLoading } = festivalsQuery;
  useEffect(() => {
    if (festivalsQuery.isError) toast.error(getErrorMessage(festivalsQuery.error, "Festivals could not be loaded"), { id: "admin-festivals-load-error" });
  }, [festivalsQuery.error, festivalsQuery.isError]);

  const confirmAction = (title: string, description: string, actionLabel: string, actionFn: () => Promise<void>) => {
    toast(title, {
      description,
      position: "bottom-right",
      action: { label: actionLabel, onClick: actionFn },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  };

  const executeDelete = async (festivalId: string) => {
    setProcessingId(festivalId);
    setProcessingAction("delete");
    try {
      await apiClient.delete(`/festivals/${festivalId}`);
      toast.success("Festival deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "festivals"] });
      setFestivalToDelete(null);
      setDeleteConfirmText("");
    } catch (error) {
      showErrorToast(error, "Failed to delete festival");
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  const handleDelete = (festival: any) => {
    const festivalBookings = (festival.slots || []).reduce((ss: number, sl: any) => ss + Number(sl.filledSpots || 0), 0);
    if (festivalBookings > 0) {
      setFestivalToDelete(festival);
      setDeleteConfirmText("");
    } else {
      confirmAction(
        "Are you sure you want to delete this festival?",
        "This action cannot be undone.",
        "Delete",
        () => executeDelete(festival.id)
      );
    }
  };

  const handleTogglePublish = (festival: any) => {
    const isPub = festival.isPublished;
    confirmAction(
      `Are you sure you want to ${isPub ? "unpublish" : "publish"} this festival?`,
      `This will make the festival ${isPub ? "hidden from" : "visible to"} the public.`,
      "Confirm",
      async () => {
        setProcessingId(festival.id);
        setProcessingAction("publish");
        try {
          await apiClient.put(`/festivals/${festival.id}`, { isPublished: !isPub });
          toast.success(isPub ? "Festival unpublished" : "Festival published");
          queryClient.invalidateQueries({ queryKey: ["admin", "festivals"] });
        } catch (error) {
          showErrorToast(error, "Failed to update festival status");
        } finally {
          setProcessingId(null);
          setProcessingAction(null);
        }
      }
    );
  };

  const handleCreateShareLink = async (festival: any) => {
    try {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await apiClient.post(`/festivals/${festival.id}/share-link`, { expiresAt });
      const url = `${window.location.origin}/festivals/${festival.id}?share=${encodeURIComponent(data.token)}`;
      setGeneratedShareLink({ title: festival.title, url });
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
    setEditingFestival(null);
    setIsModalOpen(true);
  };

  const openEditModal = async (festival: any) => {
    setProcessingId(festival.id);
    setProcessingAction("edit");
    try {
      const res = await apiClient.get(`/festivals/${festival.id}?adminView=true`);
      setEditingFestival(res.data);
      setIsModalOpen(true);
    } catch (error) {
      showErrorToast(error, "Failed to fetch full festival details");
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#c8a96e]" />
      </div>
    );
  }
  if (festivalsQuery.isError) {
    return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"><p className="font-bold">Festivals could not be loaded.</p><button type="button" onClick={() => festivalsQuery.refetch()} className="mt-3 text-sm font-semibold underline">Try again</button></div>;
  }

  const allFestivals = data?.data || [];

  // Filter festivals
  const festivals = allFestivals.filter((t: any) => {
    if (!search.trim()) return true;
    return t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.location?.toLowerCase().includes(search.toLowerCase());
  });

  // Summary stats
  const totalBookings = allFestivals.reduce((s: number, t: any) =>
    s + (t.slots || []).reduce((ss: number, sl: any) => ss + Number(sl.filledSpots || 0), 0), 0);
  const publishedCount = allFestivals.filter((t: any) => t.isPublished).length;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tent className="w-6 h-6 text-[#c8a96e]" />
            Festival Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {allFestivals.length} festivals · {publishedCount} published · {totalBookings} total bookings
          </p>
        </div>
        <Button onClick={openCreateModal} className="w-full md:w-auto bg-[#c8a96e] hover:bg-[#b8943a] text-white flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Create Festival
        </Button>
      </div>

      <FestivalFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        festival={editingFestival}
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

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search festivals by name, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40"
          />
        </div>
      </div>

      {/* Festival list */}
      <div className="flex flex-col gap-3">
        {festivals.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-gray-100">
            <Tent className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No festivals found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search, or create a new festival.</p>
          </div>
        ) : (
          festivals.map((festival: any) => {
            const totalCapacity = (festival.slots || []).reduce((s: number, sl: any) => s + Number(sl.capacity || 0), 0);
            const totalFilled = (festival.slots || []).reduce((s: number, sl: any) => s + Number(sl.filledSpots || 0), 0);
            const fillRate = totalCapacity > 0 ? Math.round(totalFilled / totalCapacity * 100) : 0;
            const nextSlot = festival.slots?.find((sl: any) => new Date(sl.startDate) > new Date());

            return (
              <div
                key={festival.id}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 cursor-pointer group"
                onClick={() => navigate(`/dashboard/festivals/${festival.id}`)}
              >
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="w-full h-36 md:w-24 md:h-18 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative">
                    {festival.bannerImages?.length > 0 ? (
                      <img src={festival.bannerImages[0]} alt={festival.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Tent className="w-8 h-8" />
                      </div>
                    )}
                    {!festival.isPublished && (
                      <div className="absolute top-1.5 left-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-600 text-white uppercase tracking-wider shadow">Draft</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-base leading-tight group-hover:text-[#781216] transition-colors truncate">{festival.title}</h3>

                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                          {festival.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{festival.location}</span>}
                          {nextSlot?.startDate && (
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />
                              {format(new Date(nextSlot.startDate), "MMM d, yyyy")}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {totalFilled}/{totalCapacity} booked
                          </span>
                          {festival.packages?.[0]?.price && (
                            <span className="flex items-center gap-1 font-semibold text-[#781216]">
                              <IndianRupee className="w-3 h-3" />{parseInt(festival.packages[0].price).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>

                        {/* Fill rate bar */}
                        {totalCapacity > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden max-w-[120px]">
                              <div
                                className={`h-full rounded-full transition-all ${fillRate >= 80 ? "bg-emerald-500" : fillRate >= 50 ? "bg-[#c8a96e]" : "bg-red-400"}`}
                                style={{ width: `${fillRate}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-bold ${fillRate >= 80 ? "text-emerald-600" : fillRate >= 50 ? "text-[#8a6414]" : "text-red-500"}`}>
                              {fillRate}% full
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions + navigate */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/festivals/${festival.id}`);
                      }}
                      className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-[#781216] group-hover:gap-2 transition-all px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100"
                    >
                      <BarChart2 className="w-4 h-4" />
                      <span>View Details</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <div onClick={(e) => e.stopPropagation()}>
                      <FestivalActionMenu
                      festival={festival}
                      processingId={processingId}
                      processingAction={processingAction}
                      onShare={handleCreateShareLink}
                      onTogglePublish={handleTogglePublish}
                      onEdit={openEditModal}
                      onDelete={handleDelete}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
          })
        )}
      </div>

      <Dialog open={!!festivalToDelete} onOpenChange={(open) => !open && setFestivalToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Festival with Active Bookings</DialogTitle>
            <DialogDescription>
              This festival has active bookings. Deleting it will permanently delete the festival and all associated bookings. 
              This action cannot be undone.
              <br /><br />
              To confirm, please type <strong className="select-all">delete {festivalToDelete?.title}</strong> below:
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <Input 
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={`delete ${festivalToDelete?.title}`}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFestivalToDelete(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => executeDelete(festivalToDelete?.id)}
              disabled={deleteConfirmText !== `delete ${festivalToDelete?.title}` || processingId === festivalToDelete?.id}
            >
              {processingId === festivalToDelete?.id ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
