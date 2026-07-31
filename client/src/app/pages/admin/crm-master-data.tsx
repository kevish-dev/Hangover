import { FormEvent, type ReactNode, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../../lib/axios";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";

type MasterKind = "destination" | "place" | "stay-location" | "property" | "transfer-location";
type MasterItem = Record<string, any>;

const config: Record<MasterKind, { label: string; singular: string; endpoint: string; owner?: "destinationId" | "stayLocationId" }> = {
  destination: { label: "Destinations", singular: "Destination", endpoint: "/crm-destinations" },
  place: { label: "Visiting places", singular: "Visiting place", endpoint: "/places", owner: "destinationId" },
  "stay-location": { label: "Stay locations", singular: "Stay location", endpoint: "/stay-locations", owner: "destinationId" },
  property: { label: "Properties", singular: "Property", endpoint: "/properties", owner: "stayLocationId" },
  "transfer-location": { label: "Transfer locations", singular: "Transfer location", endpoint: "/transfer-locations", owner: "destinationId" },
};

const getError = (error: any, fallback: string) => error?.response?.data?.message || fallback;

export default function CrmMasterDataPage() {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<MasterKind>("destination");
  const [editing, setEditing] = useState<MasterItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const current = config[kind];

  const destinationsQuery = useQuery({
    queryKey: ["crm", "destinations"],
    queryFn: async () => (await apiClient.get("/crm-destinations", { params: { limit: 200 } })).data.data as MasterItem[],
  });
  const staysQuery = useQuery({
    queryKey: ["crm", "stay-locations"],
    queryFn: async () => (await apiClient.get("/stay-locations", { params: { limit: 200 } })).data.data as MasterItem[],
    enabled: kind === "property" || dialogOpen,
  });
  const recordsQuery = useQuery({
    queryKey: ["crm", kind],
    queryFn: async () => {
      const params = { limit: 200 };
      const response = await apiClient.get(current.endpoint, { params });
      return response.data.data as MasterItem[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["crm", kind] });
    if (kind === "destination") queryClient.invalidateQueries({ queryKey: ["crm", "destinations"] });
    if (kind === "stay-location") queryClient.invalidateQueries({ queryKey: ["crm", "stay-locations"] });
  };

  const remove = async (item: MasterItem) => {
    if (!window.confirm(`Delete ${item.name}? Related records prevent unsafe deletions.`)) return;
    try {
      await apiClient.delete(`${current.endpoint}/${item.id}`);
      toast.success(`${current.singular} deleted`);
      invalidate();
    } catch (error) {
      toast.error(getError(error, `Could not delete ${current.singular.toLowerCase()}`));
    }
  };

  const destinations = destinationsQuery.data || [];
  const stays = staysQuery.data || [];
  const records = recordsQuery.data || [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b59410]">CRM foundation</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">Master data</h1>
          <p className="mt-2 text-sm text-gray-500">Build reusable destinations, visiting places, stays, properties and transfer locations before creating an itinerary.</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="bg-[#781216] text-white hover:bg-[#5f0e11]">
          <Plus className="mr-2 h-4 w-4" /> Add {current.singular}
        </Button>
      </header>

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2">
        {(Object.keys(config) as MasterKind[]).map((key) => (
          <button key={key} type="button" onClick={() => setKind(key)} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${kind === key ? "bg-[#781216] text-white" : "text-gray-600 hover:bg-gray-100"}`}>
            {config[key].label}
          </button>
        ))}
      </div>

      {recordsQuery.isLoading ? <div className="py-16 text-center text-gray-500"><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />Loading {current.label.toLowerCase()}…</div> : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3">Name</th><th className="hidden px-5 py-3 md:table-cell">Parent</th><th className="hidden px-5 py-3 lg:table-cell">Details</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((item) => {
                const parent = item.destination?.name || item.stayLocation?.name || "—";
                const details = item.description || item.address || "—";
                return <tr key={item.id} className="hover:bg-gray-50/70"><td className="px-5 py-4 font-semibold text-gray-900"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />{item.name}</td><td className="hidden px-5 py-4 text-gray-600 md:table-cell">{parent}</td><td className="hidden max-w-sm truncate px-5 py-4 text-gray-500 lg:table-cell">{details}</td><td className="px-5 py-4"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => { setEditing(item); setDialogOpen(true); }} aria-label={`Edit ${item.name}`}><Edit2 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => remove(item)} aria-label={`Delete ${item.name}`}><Trash2 className="h-4 w-4" /></Button></div></td></tr>;
              })}
              {!records.length && <tr><td colSpan={4} className="px-5 py-14 text-center text-gray-500"><MapPin className="mx-auto mb-3 h-6 w-6 text-gray-300" />No {current.label.toLowerCase()} yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <MasterDialog kind={kind} item={editing} open={dialogOpen} onOpenChange={setDialogOpen} destinations={destinations} stays={stays} onSaved={invalidate} />
    </div>
  );
}

function MasterDialog({ kind, item, open, onOpenChange, destinations, stays, onSaved }: { kind: MasterKind; item: MasterItem | null; open: boolean; onOpenChange: (value: boolean) => void; destinations: MasterItem[]; stays: MasterItem[]; onSaved: () => void }) {
  const current = config[kind];
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    setForm(item ? { ...item, description: item.description || "", address: item.address || "" } : { name: "", description: "", address: "", destinationId: "", stayLocationId: "", isActive: true });
  }, [item, kind, open]);

  const title = item ? `Edit ${current.singular}` : `New ${current.singular}`;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload: Record<string, any> = { name: form.name.trim() };
    if (kind === "destination") Object.assign(payload, { name: form.name.trim() });
    else {
      if (current.owner) payload[current.owner] = form[current.owner];
      payload.description = form.description.trim() || null;
      payload.isActive = Boolean(form.isActive);
      if (kind === "property") payload.address = form.address.trim() || null;
    }
    setSaving(true);
    try {
      if (item) await apiClient.patch(`${current.endpoint}/${item.id}`, payload);
      else await apiClient.post(current.endpoint, payload);
      toast.success(`${current.singular} ${item ? "updated" : "created"}`);
      onSaved(); onOpenChange(false);
    } catch (error) { toast.error(getError(error, `Could not save ${current.singular.toLowerCase()}`)); } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4">
    <Field label="Name"><Input required value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={`Enter ${current.singular.toLowerCase()} name`} /></Field>
    {current.owner === "destinationId" && <Field label="Destination"><select required className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={form.destinationId || ""} onChange={(e) => setForm({ ...form, destinationId: e.target.value })}><option value="">Select destination</option>{destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}</select></Field>}
    {current.owner === "stayLocationId" && <Field label="Stay location"><select required className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={form.stayLocationId || ""} onChange={(e) => setForm({ ...form, stayLocationId: e.target.value })}><option value="">Select stay location</option>{stays.map((stay) => <option key={stay.id} value={stay.id}>{stay.name}{stay.destination ? ` — ${stay.destination.name}` : ""}</option>)}</select></Field>}
    {kind === "property" && <Field label="Address (optional)"><Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>}
    {kind !== "destination" && <><Field label="Description (optional)"><Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></Field><Check label="Active and selectable" checked={form.isActive !== false} onChange={(value) => setForm({ ...form, isActive: value })} /></>}
    <div className="flex justify-end gap-2 pt-3"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving} className="bg-[#781216] text-white hover:bg-[#5f0e11]">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{item ? "Save changes" : `Create ${current.singular}`}</Button></div>
  </form></DialogContent></Dialog>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block space-y-1.5"><span className="text-sm font-medium text-gray-700">{label}</span>{children}</label>; }
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />{label}</label>; }
