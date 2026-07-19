import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Check, Edit2, Eye, EyeOff, Image, Loader2, MapPin, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../../lib/axios";
import { formatPrice, type ApiTrip } from "../../../lib/tripApi";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";

const MAX_SIGNATURE_TRIPS = 6;

export default function AdminLandingPage() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading } = useQuery({
    // Keep this key distinct from the trip-management query. That query caches
    // the full paginated response, while this one caches only the trip array.
    queryKey: ["admin", "trips", "signature-collection-options"],
    queryFn: async () => {
      const response = await apiClient.get("/trips?adminView=true&limit=200");
      return response.data.data as ApiTrip[];
    },
  });

  // Do not let malformed or legacy cached data take down the entire route.
  const trips = Array.isArray(data) ? data : [];
  const selectedTrips = useMemo(
    () => selectedIds.map((id) => trips.find((trip) => trip.id === id)).filter(Boolean) as ApiTrip[],
    [selectedIds, trips]
  );
  const eligibleTrips = useMemo(
    () => trips.filter((trip) => trip.isActive && trip.isPublished && trip.bannerImages?.length > 0),
    [trips]
  );

  useEffect(() => {
    if (!isInitialized && trips.length > 0) {
      setSelectedIds(
        trips
          .filter((trip) => trip.isSignature)
          .sort((a, b) => (a.signatureOrder ?? 0) - (b.signatureOrder ?? 0))
          .map((trip) => trip.id)
      );
      setIsInitialized(true);
    }
  }, [isInitialized, trips]);

  const toggleTrip = (tripId: string) => {
    setSelectedIds((current) => {
      if (current.includes(tripId)) return current.filter((id) => id !== tripId);
      if (current.length >= MAX_SIGNATURE_TRIPS) {
        toast.error(`You can select up to ${MAX_SIGNATURE_TRIPS} trips.`);
        return current;
      }
      return [...current, tripId];
    });
  };

  const moveTrip = (index: number, direction: -1 | 1) => {
    setSelectedIds((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const saveCollection = async () => {
    setIsSaving(true);
    try {
      await apiClient.put("/trips/signature-collection", { tripIds: selectedIds });
      await queryClient.invalidateQueries({ queryKey: ["admin", "trips"] });
      toast.success("Signature Collection updated");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update the Signature Collection");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-gray-500">Loading landing page settings...</div>;

  return (
    <div className="w-full max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6 md:mb-8">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Image className="w-6 h-6 text-[#c8a96e]" />
            Landing Page
          </h1>
          <p className="text-gray-500 text-sm mt-1">Choose and arrange the trips shown in the Signature Collection below the homepage hero.</p>
        </div>
        <Button onClick={saveCollection} disabled={isSaving} className="w-full md:w-auto bg-[#c8a96e] hover:bg-[#b8943a] text-white gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save collection
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Selected trips</h2>
            <p className="text-xs text-gray-500 mt-1">The list order is the order shown on the landing page. {selectedIds.length}/{MAX_SIGNATURE_TRIPS} selected.</p>
          </div>
          <div className="divide-y divide-gray-100 min-h-44">
            {selectedTrips.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">Select published trips from the list to build this collection.</div>
            ) : selectedTrips.map((trip, index) => (
              <div key={trip.id} className="p-3 md:p-4 flex flex-wrap md:flex-nowrap items-center gap-3">
                <span className="w-6 text-xs font-semibold text-gray-400">{String(index + 1).padStart(2, "0")}</span>
                <div className="w-14 h-12 rounded overflow-hidden bg-gray-100 shrink-0">
                  {trip.bannerImages?.[0] ? <img src={trip.bannerImages[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-gray-300"><Image className="w-4 h-4" /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-gray-900 truncate">{trip.title}</p>
                  <p className="text-xs text-gray-500 truncate">{trip.location} · {formatPrice(trip.packages?.[0]?.price || 0)}</p>
                </div>
                <div className="flex w-full md:w-auto items-center justify-end gap-1 shrink-0">
                  <button type="button" onClick={() => moveTrip(index, -1)} disabled={index === 0} className="p-1.5 text-gray-500 hover:text-[#781216] disabled:opacity-30" aria-label={`Move ${trip.title} up`}><ArrowUp className="w-4 h-4" /></button>
                  <button type="button" onClick={() => moveTrip(index, 1)} disabled={index === selectedTrips.length - 1} className="p-1.5 text-gray-500 hover:text-[#781216] disabled:opacity-30" aria-label={`Move ${trip.title} down`}><ArrowDown className="w-4 h-4" /></button>
                  <button type="button" onClick={() => toggleTrip(trip.id)} className="p-1.5 text-gray-500 hover:text-red-600" aria-label={`Remove ${trip.title}`}><X className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Published trips</h2>
            <p className="text-xs text-gray-500 mt-1">Only active, published trips with a banner image are eligible for the landing page.</p>
          </div>
          <div className="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
            {eligibleTrips.map((trip) => {
              const selected = selectedIds.includes(trip.id);
              return (
                <button key={trip.id} type="button" onClick={() => toggleTrip(trip.id)} className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors">
                  <span className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${selected ? "bg-[#781216] border-[#781216] text-white" : "border-gray-300"}`}>
                    {selected && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <div className="w-14 h-12 rounded overflow-hidden bg-gray-100 shrink-0">
                    {trip.bannerImages?.[0] ? <img src={trip.bannerImages[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-gray-300"><Image className="w-4 h-4" /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-900 truncate">{trip.title}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{trip.location} · {formatPrice(trip.packages?.[0]?.price || 0)}</p>
                  </div>
                </button>
              );
            })}
            {eligibleTrips.length === 0 && <div className="p-8 text-center text-sm text-gray-500">Publish a trip and add a banner image before adding it to the Signature Collection.</div>}
          </div>
        </section>
      </div>

      <LandingReasonsManager />
      <LandingTripTypesManager />
      <LandingContentManager type="footprints" title="Our Footprints" />
      <LandingContentManager type="journey" title="Our Journey" />
    </div>
  );
}

interface LandingReason {
  id: string;
  title: string;
  description: string;
  detail: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
}

const emptyReason = (): Omit<LandingReason, "id"> => ({
  title: "",
  description: "",
  detail: "",
  imageUrl: "",
  sortOrder: 0,
  isActive: true,
});

function LandingReasonsManager() {
  const queryClient = useQueryClient();
  const [editingReason, setEditingReason] = useState<LandingReason | null>(null);
  const [form, setForm] = useState<Omit<LandingReason, "id">>(emptyReason());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const { data: reasons = [], isLoading } = useQuery({
    queryKey: ["admin", "landing-reasons"],
    queryFn: async () => {
      const response = await apiClient.get("/landing-reasons?adminView=true");
      return response.data.data as LandingReason[];
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "landing-reasons"] });

  const openCreate = () => {
    setEditingReason(null);
    setForm({ ...emptyReason(), sortOrder: reasons.length + 1 });
    setIsDialogOpen(true);
  };

  const openEdit = (reason: LandingReason) => {
    setEditingReason(reason);
    setForm({
      title: reason.title,
      description: reason.description,
      detail: reason.detail,
      imageUrl: reason.imageUrl,
      sortOrder: reason.sortOrder,
      isActive: reason.isActive,
    });
    setIsDialogOpen(true);
  };

  const saveReason = async () => {
    setIsSaving(true);
    try {
      if (editingReason) await apiClient.put(`/landing-reasons/${editingReason.id}`, form);
      else await apiClient.post("/landing-reasons", form);
      await refresh();
      setIsDialogOpen(false);
      toast.success(editingReason ? "Why Hangover panel updated" : "Why Hangover panel added");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save the panel");
    } finally {
      setIsSaving(false);
    }
  };

  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const payload = new FormData();
      payload.append("image", file);
      const response = await apiClient.post("/landing-reasons/image", payload);
      setForm((current) => ({ ...current, imageUrl: response.data.imageUrl }));
      toast.success("Panel image uploaded");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to upload the image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const toggleActive = async (reason: LandingReason) => {
    try {
      await apiClient.put(`/landing-reasons/${reason.id}`, { isActive: !reason.isActive });
      await refresh();
    } catch {
      toast.error("Failed to update panel visibility");
    }
  };

  const deleteReason = async (reason: LandingReason) => {
    try {
      await apiClient.delete(`/landing-reasons/${reason.id}`);
      await refresh();
      toast.success("Why Hangover panel deleted");
    } catch {
      toast.error("Failed to delete the panel");
    }
  };

  return (
    <section className="mt-6 md:mt-10 bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 md:px-5 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">Why Hangover Trails</h2>
          <p className="text-xs text-gray-500 mt-1">Manage the accordion panels shown after the Signature Collection.</p>
        </div>
        <Button onClick={openCreate} className="w-full md:w-auto bg-[#781216] hover:bg-[#5e0e12] text-white gap-2"><Plus className="w-4 h-4" /> Add panel</Button>
      </div>

      {isLoading ? <div className="p-6 text-sm text-gray-500">Loading panels...</div> : (
        <div className="divide-y divide-gray-100">
          {reasons.map((reason) => (
            <div key={reason.id} className="p-4 flex flex-wrap items-center gap-3">
              <div className="w-16 h-12 rounded bg-gray-100 overflow-hidden shrink-0">
                <img src={reason.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-gray-900 truncate">{reason.sortOrder}. {reason.title}</p>
                <p className="text-xs text-gray-500 truncate">{reason.description}</p>
              </div>
              {!reason.isActive && <span className="text-xs font-medium text-orange-700 bg-orange-50 px-2 py-1 rounded">Hidden</span>}
              <div className="flex w-full md:w-auto items-center justify-end gap-1 shrink-0">
                <button type="button" onClick={() => toggleActive(reason)} className="p-2 text-gray-500 hover:text-[#781216]" aria-label={reason.isActive ? `Hide ${reason.title}` : `Show ${reason.title}`}>{reason.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
                <button type="button" onClick={() => openEdit(reason)} className="p-2 text-gray-500 hover:text-[#781216]" aria-label={`Edit ${reason.title}`}><Edit2 className="w-4 h-4" /></button>
                <button type="button" onClick={() => deleteReason(reason)} className="p-2 text-gray-500 hover:text-red-600" aria-label={`Delete ${reason.title}`}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {reasons.length === 0 && <div className="p-6 text-sm text-gray-500">No panels have been added yet.</div>}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="!w-[calc(100%-0.75rem)] !max-h-[calc(100dvh-0.75rem)] md:!w-full md:!max-h-[90vh] sm:max-w-xl overflow-y-auto p-4 md:p-6">
          <DialogHeader><DialogTitle>{editingReason ? "Edit Why Hangover panel" : "Add Why Hangover panel"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label htmlFor="reason-title">Title</Label><Input id="reason-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="reason-description">Short label</Label><Input id="reason-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="reason-detail">Detail</Label><Textarea id="reason-detail" value={form.detail} onChange={(event) => setForm({ ...form, detail: event.target.value })} /></div>
            <div className="grid gap-2">
              <Label htmlFor="reason-image">Panel image</Label>
              {form.imageUrl && <img src={form.imageUrl} alt="Panel preview" className="w-full h-40 object-cover rounded border border-gray-200" />}
              <Input id="reason-image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={isUploadingImage} onChange={(event) => uploadImage(event.target.files?.[0])} />
              <p className="text-xs text-gray-500 flex items-center gap-1"><Upload className="w-3 h-3" /> Upload a JPEG, PNG, WebP, or AVIF image to Cloudinary.</p>
            </div>
            <div className="grid gap-2"><Label htmlFor="reason-order">Display order</Label><Input id="reason-order" type="number" min="0" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} /></div>
          </div>
          <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2"><Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full md:w-auto">Cancel</Button><Button onClick={saveReason} disabled={isSaving || isUploadingImage} className="w-full md:w-auto bg-[#781216] hover:bg-[#5e0e12] text-white">{(isSaving || isUploadingImage) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{isUploadingImage ? "Uploading image" : "Save panel"}</Button></div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

interface LandingTripType {
  id: string;
  label: string;
  description: string;
  tag: string;
  imageUrl: string;
  iconName: string;
  sortOrder: number;
  isActive: boolean;
}

const emptyTripType = (): Omit<LandingTripType, "id"> => ({ label: "", description: "", tag: "", imageUrl: "", iconName: "Compass", sortOrder: 0, isActive: true });

function LandingTripTypesManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<LandingTripType | null>(null);
  const [form, setForm] = useState<Omit<LandingTripType, "id">>(emptyTripType());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const { data: tripTypes = [], isLoading } = useQuery({
    queryKey: ["admin", "landing-trip-types"],
    queryFn: async () => (await apiClient.get("/landing-trip-types?adminView=true")).data.data as LandingTripType[],
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "landing-trip-types"] });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyTripType(), sortOrder: tripTypes.length + 1 });
    setIsDialogOpen(true);
  };
  const openEdit = (tripType: LandingTripType) => {
    setEditing(tripType);
    setForm({ label: tripType.label, description: tripType.description, tag: tripType.tag, imageUrl: tripType.imageUrl, iconName: tripType.iconName, sortOrder: tripType.sortOrder, isActive: tripType.isActive });
    setIsDialogOpen(true);
  };
  const save = async () => {
    setIsSaving(true);
    try {
      if (editing) await apiClient.put(`/landing-trip-types/${editing.id}`, form);
      else await apiClient.post("/landing-trip-types", form);
      await refresh();
      setIsDialogOpen(false);
      toast.success(editing ? "Trip type updated" : "Trip type added");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save trip type");
    } finally { setIsSaving(false); }
  };
  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const payload = new FormData();
      payload.append("image", file);
      const response = await apiClient.post("/landing-trip-types/image", payload);
      setForm((current) => ({ ...current, imageUrl: response.data.imageUrl }));
      toast.success("Trip type image uploaded");
    } catch (error: any) { toast.error(error?.response?.data?.message || "Failed to upload the image"); }
    finally { setIsUploadingImage(false); }
  };
  const toggleActive = async (tripType: LandingTripType) => {
    try { await apiClient.put(`/landing-trip-types/${tripType.id}`, { isActive: !tripType.isActive }); await refresh(); }
    catch { toast.error("Failed to update trip type visibility"); }
  };
  const remove = async (tripType: LandingTripType) => {
    try { await apiClient.delete(`/landing-trip-types/${tripType.id}`); await refresh(); toast.success("Trip type deleted"); }
    catch { toast.error("Failed to delete trip type"); }
  };

  return (
    <section className="mt-6 md:mt-10 bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 md:px-5 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div><h2 className="font-semibold text-gray-900">Types of Trips</h2><p className="text-xs text-gray-500 mt-1">Manage the independent trip-type carousel on the landing page.</p></div>
        <Button onClick={openCreate} className="w-full md:w-auto bg-[#781216] hover:bg-[#5e0e12] text-white gap-2"><Plus className="w-4 h-4" /> Add type</Button>
      </div>
      {isLoading ? <div className="p-6 text-sm text-gray-500">Loading trip types...</div> : <div className="divide-y divide-gray-100">
        {tripTypes.map((tripType) => <div key={tripType.id} className="p-4 flex flex-wrap items-center gap-3">
          <div className="w-16 h-12 rounded bg-gray-100 overflow-hidden shrink-0"><img src={tripType.imageUrl} alt="" className="w-full h-full object-cover" /></div>
          <div className="min-w-0 flex-1"><p className="font-medium text-sm text-gray-900 truncate">{tripType.sortOrder}. {tripType.label}</p><p className="text-xs text-gray-500 truncate">{tripType.tag}</p></div>
          {!tripType.isActive && <span className="text-xs font-medium text-orange-700 bg-orange-50 px-2 py-1 rounded">Hidden</span>}
          <div className="flex w-full md:w-auto items-center justify-end gap-1 shrink-0"><button type="button" onClick={() => toggleActive(tripType)} className="p-2 text-gray-500 hover:text-[#781216]" aria-label={tripType.isActive ? `Hide ${tripType.label}` : `Show ${tripType.label}`}>{tripType.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button><button type="button" onClick={() => openEdit(tripType)} className="p-2 text-gray-500 hover:text-[#781216]" aria-label={`Edit ${tripType.label}`}><Edit2 className="w-4 h-4" /></button><button type="button" onClick={() => remove(tripType)} className="p-2 text-gray-500 hover:text-red-600" aria-label={`Delete ${tripType.label}`}><Trash2 className="w-4 h-4" /></button></div>
        </div>)}
        {tripTypes.length === 0 && <div className="p-6 text-sm text-gray-500">No trip types have been added yet.</div>}
      </div>}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogContent className="!w-[calc(100%-0.75rem)] !max-h-[calc(100dvh-0.75rem)] md:!w-full md:!max-h-[90vh] sm:max-w-xl overflow-y-auto p-4 md:p-6"><DialogHeader><DialogTitle>{editing ? "Edit trip type" : "Add trip type"}</DialogTitle></DialogHeader><div className="grid gap-4 py-2">
        <div className="grid gap-2"><Label htmlFor="type-label">Label</Label><Input id="type-label" value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} /></div>
        <div className="grid gap-2"><Label htmlFor="type-description">Description</Label><Textarea id="type-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
        <div className="grid gap-2"><Label htmlFor="type-tag">Tag</Label><Input id="type-tag" value={form.tag} onChange={(event) => setForm({ ...form, tag: event.target.value })} /></div>
        <div className="grid gap-2"><Label htmlFor="type-icon">Icon</Label><select id="type-icon" value={form.iconName} onChange={(event) => setForm({ ...form, iconName: event.target.value })} className="h-10 w-full rounded-md border border-input bg-input-background px-3 text-sm"><option value="Users">Group</option><option value="Home">Family</option><option value="Heart">Couple</option><option value="GraduationCap">Students</option><option value="Mountain">Trekking</option><option value="Compass">Custom</option></select></div>
        <div className="grid gap-2"><Label htmlFor="type-image">Image</Label>{form.imageUrl && <img src={form.imageUrl} alt="Trip type preview" className="w-full h-40 object-cover rounded border border-gray-200" />}<Input id="type-image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={isUploadingImage} onChange={(event) => uploadImage(event.target.files?.[0])} /><p className="text-xs text-gray-500 flex items-center gap-1"><Upload className="w-3 h-3" /> Upload to Cloudinary.</p></div>
        <div className="grid gap-2"><Label htmlFor="type-order">Display order</Label><Input id="type-order" type="number" min="0" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} /></div>
      </div><div className="flex flex-col-reverse md:flex-row md:justify-end gap-2"><Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full md:w-auto">Cancel</Button><Button onClick={save} disabled={isSaving || isUploadingImage} className="w-full md:w-auto bg-[#781216] hover:bg-[#5e0e12] text-white">{(isSaving || isUploadingImage) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{isUploadingImage ? "Uploading image" : "Save type"}</Button></div></DialogContent></Dialog>
    </section>
  );
}

function LandingContentManager({ type, title }: { type: "footprints" | "journey"; title: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [open, setOpen] = useState(false);
  const { data: items = [], isLoading } = useQuery({ queryKey: ["admin", "landing-content", type], queryFn: async () => (await apiClient.get(`/landing-content/${type}?adminView=true`)).data.data as any[] });
  const fields = type === "footprints" ? ["value", "suffix", "label", "sublabel", "sortOrder"] : ["period", "title", "tagline", "description", "iconName", "sortOrder"];
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "landing-content", type] });
  const edit = (item?: any) => { setEditing(item || null); setForm(item ? { ...item } : { sortOrder: items.length + 1, isActive: true, ...(type === "footprints" ? { value: 0, suffix: "", label: "", sublabel: "" } : { period: "", title: "", tagline: "", description: "", iconName: "MapPin" }) }); setOpen(true); };
  const save = async () => { try { if (editing) await apiClient.put(`/landing-content/${type}/${editing.id}`, form); else await apiClient.post(`/landing-content/${type}`, form); await refresh(); setOpen(false); toast.success(`${title} updated`); } catch { toast.error(`Failed to save ${title}`); } };
  const toggle = async (item: any) => { await apiClient.put(`/landing-content/${type}/${item.id}`, { isActive: !item.isActive }); await refresh(); };
  const remove = async (item: any) => { await apiClient.delete(`/landing-content/${type}/${item.id}`); await refresh(); };
  return (
    <section className="mt-6 md:mt-10 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
        <div>
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-xs text-gray-500">
            Manage the landing page {type === "footprints" ? "numbers" : "milestones"}.
          </p>
        </div>
        <Button onClick={() => edit()} className="w-full gap-2 bg-[#781216] text-white hover:bg-[#5e0e12] md:w-auto">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {isLoading ? (
        <div className="p-6 text-sm text-gray-500">Loading...</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {items.map((item: any) => (
            <div key={item.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {type === "footprints" ? `${item.value}${item.suffix} ${item.label}` : `${item.period} - ${item.title}`}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {type === "footprints" ? item.sublabel : item.tagline}
                </p>
              </div>
              {!item.isActive && <span className="text-xs text-orange-700">Hidden</span>}
              <div className="flex w-full items-center justify-end gap-1 md:w-auto">
                <button onClick={() => toggle(item)} className="p-2 text-gray-500" aria-label={item.isActive ? "Hide item" : "Show item"}>
                  {item.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button onClick={() => edit(item)} className="p-2 text-gray-500" aria-label="Edit item">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={() => remove(item)} className="p-2 text-red-600" aria-label="Delete item">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!w-[calc(100%-0.75rem)] !max-h-[calc(100dvh-0.75rem)] overflow-y-auto p-4 sm:max-w-xl md:!w-full md:!max-h-[90vh] md:p-6">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "Add"} {title}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {fields.map((field) => (
              <div key={field} className="grid gap-2">
                <Label htmlFor={`${type}-${field}`}>{field}</Label>
                {field === "description" ? (
                  <Textarea id={`${type}-${field}`} value={form[field] ?? ""} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
                ) : field === "iconName" ? (
                  <select id={`${type}-${field}`} value={form[field] ?? "MapPin"} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="h-10 rounded-md border px-3 text-base md:text-sm">
                    <option>MapPin</option><option>Lightbulb</option><option>User</option><option>Users</option><option>GraduationCap</option><option>Music2</option><option>Flame</option>
                  </select>
                ) : (
                  <Input id={`${type}-${field}`} type={field === "value" || field === "sortOrder" ? "number" : "text"} value={form[field] ?? ""} onChange={(event) => setForm({ ...form, [field]: field === "value" || field === "sortOrder" ? Number(event.target.value) : event.target.value })} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)} className="w-full md:w-auto">Cancel</Button>
            <Button onClick={save} className="w-full bg-[#781216] text-white md:w-auto">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
