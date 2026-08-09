import { FormEvent, type ReactNode, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, ChevronRight, Edit2, Loader2, MapPin, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../../lib/axios";
import { uploadGenericImageDirect, uploadMultipleGenericImagesDirect } from "../../../lib/directImageUpload";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";

type MediaImage = { url: string; caption?: string };
type Destination = { id: string; name: string };
type Stay = { id: string; name: string; description?: string | null; imageUrl?: string | null; images?: MediaImage[] | null; isActive: boolean; _count?: { properties: number; places: number } };
type Item = { id: string; name: string; description?: string | null; address?: string | null; imageUrl?: string | null; images?: MediaImage[] | null; isActive: boolean };
type Kind = "destination" | "stay" | "property" | "place" | "transfer";
const info: Record<Kind, { singular: string; endpoint: string }> = {
  destination: { singular: "Destination", endpoint: "/crm-destinations" },
  stay: { singular: "Stay location", endpoint: "/stay-locations" },
  property: { singular: "Property", endpoint: "/properties" },
  place: { singular: "Visiting place", endpoint: "/places" },
  transfer: { singular: "Transfer location", endpoint: "/transfer-locations" },
};
const errorMessage = (error: any, fallback: string) => error?.response?.data?.message || fallback;

export default function CrmMasterDataPage() {
  const queryClient = useQueryClient();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [stay, setStay] = useState<Stay | null>(null);
  const [tab, setTab] = useState<"place" | "property">("place");
  const [dialog, setDialog] = useState<{ kind: Kind; item?: any } | null>(null);
  const destinationsQuery = useQuery({ queryKey: ["crm", "destinations"], queryFn: async () => (await apiClient.get("/crm-destinations", { params: { limit: 200 } })).data.data as Destination[] });
  const staysQuery = useQuery({ queryKey: ["crm", "stays", destination?.id], queryFn: async () => (await apiClient.get("/stay-locations", { params: { destinationId: destination!.id, limit: 200 } })).data.data as Stay[], enabled: Boolean(destination) });
  const propertiesQuery = useQuery({ queryKey: ["crm", "properties", stay?.id], queryFn: async () => (await apiClient.get("/properties", { params: { stayLocationId: stay!.id, limit: 200 } })).data.data as Item[], enabled: Boolean(stay) });
  const placesQuery = useQuery({ queryKey: ["crm", "places", stay?.id], queryFn: async () => (await apiClient.get("/places", { params: { stayLocationId: stay!.id, limit: 200 } })).data.data as Item[], enabled: Boolean(stay) });
  const destinations = destinationsQuery.data || [];
  const invalidate = (kind: Kind) => {
    if (kind === "destination") queryClient.invalidateQueries({ queryKey: ["crm", "destinations"] });
    if (kind === "stay") queryClient.invalidateQueries({ queryKey: ["crm", "stays", destination?.id] });
    if (kind === "property") queryClient.invalidateQueries({ queryKey: ["crm", "properties", stay?.id] });
    if (kind === "place") queryClient.invalidateQueries({ queryKey: ["crm", "places", stay?.id] });
    if (kind === "transfer") queryClient.invalidateQueries({ queryKey: ["crm", "transfers", destination?.id] });
  };
  const remove = (kind: Kind, item: Item) => {
    toast(`Delete ${item.name}?`, {
      description: "Related records prevent unsafe deletions.",
      position: "bottom-right",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await apiClient.delete(`${info[kind].endpoint}/${item.id}`);
            toast.success(`${info[kind].singular} deleted`);
            invalidate(kind);
          } catch (error) {
            toast.error(errorMessage(error, `Could not delete ${info[kind].singular.toLowerCase()}`));
          }
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  };

  if (!destination) return <div className="mx-auto max-w-7xl space-y-6 pb-12"><header className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b59410]">CRM foundation</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">Master data</h1><p className="mt-2 text-sm text-gray-500">Choose a destination, then manage its stay locations, properties and visiting places in context.</p></div><Button onClick={() => setDialog({ kind: "destination" })} className="bg-[#781216] text-white hover:bg-[#5f0e11]"><Plus className="mr-2 h-4 w-4" />Add destination</Button></header>{destinationsQuery.isLoading ? <Loading label="destinations" /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{destinations.map((item) => <button key={item.id} onClick={() => setDestination(item)} className="group rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-[#b59410] hover:shadow-md"><MapPin className="h-6 w-6 text-[#b59410]" /><h2 className="mt-5 text-lg font-bold text-gray-900">{item.name}</h2><p className="mt-1 text-sm text-gray-500">Manage stay locations</p></button>)}{!destinations.length && <Empty label="destinations" />}</div>}<MasterDialog dialog={dialog} destination={null} stay={null} stays={[]} onClose={() => setDialog(null)} onSaved={() => dialog && invalidate(dialog.kind)} /></div>;

  if (!stay)
    return (
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        <button type="button" onClick={() => setDestination(null)} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#781216]">
          <ArrowLeft className="h-4 w-4" /> All destinations
        </button>
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b59410]">CRM master data · {destination.name}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">Stay locations</h1>
            <p className="mt-2 text-sm text-gray-500">Choose where the group stays. Each location owns its properties and the visiting places around it.</p>
          </div>
          <Button onClick={() => setDialog({ kind: "stay" })} className="bg-[#781216] text-white hover:bg-[#5f0e11]">
            <Plus className="mr-2 h-4 w-4" /> Add stay location
          </Button>
        </header>
        {staysQuery.isLoading ? (
          <Loading label="stay locations" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(staysQuery.data || []).map((item) => {
              const legacy = item.name === "Imported visiting places";
              const coverUrl = item.imageUrl || item.images?.[0]?.url;
              return (
                <article
                  key={item.id}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    legacy ? "border-amber-300" : "border-gray-200 hover:border-[#b59410]"
                  }`}
                >
                  <button onClick={() => setStay(item)} className="block w-full text-left">
                    {coverUrl ? (
                      <div className="relative h-40 w-full overflow-hidden bg-gray-100">
                        <img src={coverUrl} alt={item.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        {item.images && item.images.length > 1 && (
                          <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                            📷 {item.images.length} photos
                          </span>
                        )}
                      </div>
                    ) : null}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        {!coverUrl && (
                          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${legacy ? "bg-amber-100 text-amber-800" : "bg-[#781216]/10 text-[#781216]"}`}>
                            <Building2 className="h-5 w-5" />
                          </div>
                        )}
                        {coverUrl && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-[#b59410]">Stay location</span>
                        )}
                        <ChevronRight className="mt-2 h-4 w-4 text-gray-400 transition group-hover:translate-x-1 group-hover:text-[#781216]" />
                      </div>
                      {!coverUrl && (
                        <p className={`mt-4 text-xs font-bold uppercase tracking-[0.14em] ${legacy ? "text-amber-700" : "text-[#b59410]"}`}>
                          {legacy ? "Legacy cleanup" : "Stay location"}
                        </p>
                      )}
                      <h2 className="mt-1 text-xl font-bold text-gray-900">{legacy ? "Unassigned visiting places" : item.name}</h2>
                      <p className="mt-2 min-h-10 text-sm leading-relaxed text-gray-500">
                        {legacy ? "Older places need to be moved to their real stay location." : item.description || "Open to manage the properties and places for this stay."}
                      </p>
                      <div className="mt-5 flex gap-2">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">{item._count?.places || 0} places</span>
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">{item._count?.properties || 0} properties</span>
                      </div>
                    </div>
                  </button>
                  <div className="px-5 pb-5">
                    <CardActions onEdit={() => setDialog({ kind: "stay", item })} onDelete={() => remove("stay", item)} />
                  </div>
                </article>
              );
            })}
            {!(staysQuery.data || []).length && <Empty label="stay locations" />}
          </div>
        )}
        <MasterDialog dialog={dialog} destination={destination} stay={null} stays={staysQuery.data || []} onClose={() => setDialog(null)} onSaved={() => dialog && invalidate(dialog.kind)} />
      </div>
    );

  const currentItems = tab === "property" ? propertiesQuery.data || [] : placesQuery.data || [];
  const currentLoading = tab === "property" ? propertiesQuery.isLoading : placesQuery.isLoading;
  const legacyStay = stay.name === "Imported visiting places";
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <button type="button" onClick={() => setStay(null)} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#781216]">
        <ArrowLeft className="h-4 w-4" />{destination.name} stay locations
      </button>
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b59410]">{destination.name}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">{legacyStay ? "Unassigned visiting places" : stay.name}</h1>
          <p className="mt-2 text-sm text-gray-500">{legacyStay ? "Move each legacy place into its actual stay location, then this temporary group can be deleted." : "Manage the property and visiting-place masters for this stay location."}</p>
        </div>
        <Button onClick={() => setDialog({ kind: tab })} className="bg-[#781216] text-white hover:bg-[#5f0e11]">
          <Plus className="mr-2 h-4 w-4" />Add {info[tab].singular.toLowerCase()}
        </Button>
      </header>
      <div className="flex gap-2 border-b border-gray-200">
        <Tab active={tab === "place"} onClick={() => setTab("place")}>Visiting places</Tab>
        <Tab active={tab === "property"} onClick={() => setTab("property")}>Properties</Tab>
      </div>
      {currentLoading ? (
        <Loading label={tab === "property" ? "properties" : "visiting places"} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {currentItems.map((item) => {
            const coverUrl = item.imageUrl || item.images?.[0]?.url;
            return (
              <article key={item.id} className="flex flex-col justify-between overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-[#b59410] hover:shadow-md">
                <div>
                  {coverUrl && (
                    <div className="relative h-40 w-full overflow-hidden bg-gray-100">
                      <img src={coverUrl} alt={item.name} className="h-full w-full object-cover" />
                      {item.images && item.images.length > 1 && (
                        <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                          📷 {item.images.length} photos
                        </span>
                      )}
                    </div>
                  )}
                  <div className="p-5">
                    <h2 className="text-lg font-bold text-gray-900">{item.name}</h2>
                    {item.address && <p className="mt-2 text-sm text-gray-600">{item.address}</p>}
                    {item.description && <p className="mt-2 text-sm text-gray-500">{item.description}</p>}
                    {item.images && item.images.length > 0 && item.images.some((img) => Boolean(img.caption)) && (
                      <div className="mt-3 space-y-1 border-t border-gray-100 pt-2">
                        {item.images
                          .filter((img) => Boolean(img.caption))
                          .map((img, i) => (
                            <p key={i} className="text-xs text-gray-500 italic">
                              • {img.caption}
                            </p>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="px-5 pb-5">
                  <CardActions onEdit={() => setDialog({ kind: tab, item })} onDelete={() => remove(tab, item)} />
                </div>
              </article>
            );
          })}
          {!currentItems.length && <Empty label={tab === "property" ? "properties" : "visiting places"} />}
        </div>
      )}
      <MasterDialog dialog={dialog} destination={destination} stay={stay} stays={staysQuery.data || []} onClose={() => setDialog(null)} onSaved={() => dialog && invalidate(dialog.kind)} />
    </div>
  );
}

function MasterDialog({ dialog, destination, stay, stays, onClose, onSaved }: { dialog: { kind: Kind; item?: any } | null; destination: Destination | null; stay: Stay | null; stays: Stay[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<{ name: string; description: string; address: string; imageUrl: string; images: MediaImage[]; isActive: boolean; stayLocationId: string }>({
    name: "",
    description: "",
    address: "",
    imageUrl: "",
    images: [],
    isActive: true,
    stayLocationId: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (dialog?.item) {
      const rawImages = Array.isArray(dialog.item.images) ? dialog.item.images : [];
      const normalizedImages: MediaImage[] = rawImages
        .map((img: any) => (typeof img === "string" ? { url: img, caption: "" } : { url: img?.url || img?.imageUrl || "", caption: img?.caption || "" }))
        .filter((img: MediaImage) => Boolean(img.url));

      if (dialog.item.imageUrl && !normalizedImages.some((img) => img.url === dialog.item.imageUrl)) {
        normalizedImages.unshift({ url: dialog.item.imageUrl, caption: "" });
      }

      setForm({
        name: dialog.item.name || "",
        description: dialog.item.description || "",
        address: dialog.item.address || "",
        imageUrl: dialog.item.imageUrl || normalizedImages[0]?.url || "",
        images: normalizedImages,
        isActive: dialog.item.isActive !== false,
        stayLocationId: "",
      });
    } else {
      setForm({ name: "", description: "", address: "", imageUrl: "", images: [], isActive: true, stayLocationId: "" });
    }
  }, [dialog]);

  if (!dialog) return null;
  const { kind, item } = dialog;
  const meta = info[kind];
  const movingLegacyPlace = kind === "place" && Boolean(item) && stay?.name === "Imported visiting places";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload: Record<string, any> = { name: form.name.trim() };
    if (kind === "stay" || kind === "transfer") payload.destinationId = destination?.id;
    if (kind === "property" || kind === "place") payload.stayLocationId = movingLegacyPlace ? form.stayLocationId : stay?.id;
    if (kind !== "destination") {
      payload.description = form.description.trim() || null;
      payload.isActive = form.isActive;
    }
    if (kind === "property") payload.address = form.address.trim() || null;

    if (kind === "stay" || kind === "place" || kind === "property") {
      const cleanImages = form.images.filter((img) => Boolean(img.url.trim()));
      payload.images = cleanImages;
      payload.imageUrl = cleanImages[0]?.url || form.imageUrl.trim() || null;
    }

    if (movingLegacyPlace && !payload.stayLocationId) return toast.error("Choose the stay location this visiting place belongs to");

    setSaving(true);
    try {
      if (item) await apiClient.patch(`${meta.endpoint}/${item.id}`, payload);
      else await apiClient.post(meta.endpoint, payload);
      toast.success(`${meta.singular} ${item ? "updated" : "created"}`);
      onSaved();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, `Could not save ${meta.singular.toLowerCase()}`));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{movingLegacyPlace ? "Place this visiting place" : item ? `Edit ${meta.singular}` : `New ${meta.singular}`}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Name">
            <Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Field>
          {movingLegacyPlace && (
            <Field label="Move to stay location">
              <select required className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={form.stayLocationId} onChange={(event) => setForm({ ...form, stayLocationId: event.target.value })}>
                <option value="">Select stay location</option>
                {stays.filter((option) => option.id !== stay?.id).map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </Field>
          )}
          {kind === "property" && (
            <Field label="Address (optional)">
              <Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            </Field>
          )}
          {(kind === "stay" || kind === "place" || kind === "property") && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Images & Captions (optional)</span>
                <span className="text-xs text-gray-500">{form.images.length} {form.images.length === 1 ? "image" : "images"}</span>
              </div>

              {form.images.length > 0 && (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {form.images.map((img, idx) => (
                    <div key={idx} className="flex gap-3 items-center p-2.5 rounded-xl border border-gray-200 bg-gray-50/50">
                      <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                        <img src={img.url} alt={`Upload ${idx + 1}`} className="h-full w-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute bottom-0 inset-x-0 bg-black/70 py-0.5 text-center text-[9px] font-bold text-white uppercase tracking-wider">
                            Cover
                          </span>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <Input
                          placeholder="Add caption (optional)"
                          value={img.caption || ""}
                          onChange={(e) => {
                            const updated = [...form.images];
                            updated[idx] = { ...updated[idx], caption: e.target.value };
                            setForm({ ...form, images: updated });
                          }}
                          className="h-8 text-xs bg-white"
                        />
                        <p className="text-[10px] text-gray-400 truncate">{img.url}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = form.images.filter((_, i) => i !== idx);
                          setForm({ ...form, images: updated, imageUrl: updated[0]?.url || "" });
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                        title="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 transition hover:border-[#b59410] hover:bg-white">
                {uploadingImage ? (
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin text-[#781216]" />
                    Uploading image…
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <UploadCloud className="h-6 w-6 text-[#b59410]" />
                    <span className="text-sm font-semibold text-gray-700">
                      {form.images.length > 0 ? "+ Add more images" : "Click to upload images"}
                    </span>
                    <span className="text-xs text-gray-500">Select one or multiple JPG, PNG, WebP or AVIF files</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    setUploadingImage(true);
                    try {
                      const urls = await uploadMultipleGenericImagesDirect(files);
                      const newEntries: MediaImage[] = urls.map((url) => ({ url, caption: "" }));
                      const updated = [...form.images, ...newEntries];
                      setForm((prev) => ({
                        ...prev,
                        images: updated,
                        imageUrl: prev.imageUrl || updated[0]?.url || "",
                      }));
                      toast.success(`${files.length} ${files.length === 1 ? "image" : "images"} uploaded successfully`);
                    } catch (err: any) {
                      toast.error(err?.message || "Failed to upload image");
                    } finally {
                      setUploadingImage(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
          )}
          {kind !== "destination" && (
            <>
              <Field label="Description (optional)">
                <Textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </Field>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
                Active and selectable
              </label>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={saving || uploadingImage} className="bg-[#781216] text-white hover:bg-[#5f0e11]">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {movingLegacyPlace ? "Move place" : item ? "Save changes" : `Create ${meta.singular}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CardActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="mt-3 flex justify-end gap-1 border-t pt-3">
      <Button variant="ghost" size="icon" onClick={onEdit}><Edit2 className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`border-b-2 px-4 py-3 text-sm font-semibold ${active ? "border-[#781216] text-[#781216]" : "border-transparent text-gray-500 hover:text-gray-800"}`}>{children}</button>;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium text-gray-700">{label}</span>{children}</label>;
}
function Loading({ label }: { label: string }) {
  return <div className="py-16 text-center text-gray-500"><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-[#781216]" />Loading {label}…</div>;
}
function Empty({ label }: { label: string }) {
  return <div className="col-span-full rounded-xl border-2 border-dashed border-gray-200 bg-white py-14 text-center text-sm text-gray-500">No {label} yet.</div>;
}
