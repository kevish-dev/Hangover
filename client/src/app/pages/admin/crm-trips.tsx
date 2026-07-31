import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { CalendarDays, ChevronRight, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../../lib/axios";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";

type Destination = { id: string; name: string };
type CrmTrip = { id: string; name: string; numberOfNights: number; destination: Destination; airportPickupEnabled: boolean; airportDropEnabled: boolean; _count?: { itineraryDays: number; inclusions: number } };

export default function CrmTripsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const tripsQuery = useQuery({ queryKey: ["crm-trips"], queryFn: async () => (await apiClient.get("/crm-trips", { params: { limit: 100 } })).data });
  const destinationsQuery = useQuery({ queryKey: ["crm", "destinations"], queryFn: async () => (await apiClient.get("/crm-destinations", { params: { limit: 200 } })).data.data as Destination[] });
  const trips: CrmTrip[] = tripsQuery.data?.data || [];

  const remove = async (trip: CrmTrip) => {
    if (!window.confirm(`Delete “${trip.name}” and its itinerary?`)) return;
    try { await apiClient.delete(`/crm-trips/${trip.id}`); toast.success("CRM trip deleted"); queryClient.invalidateQueries({ queryKey: ["crm-trips"] }); }
    catch (error: any) { toast.error(error?.response?.data?.message || "Could not delete trip"); }
  };

  return <div className="mx-auto max-w-7xl space-y-6 pb-12">
    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b59410]">CRM foundation</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">Itinerary trips</h1><p className="mt-2 text-sm text-gray-500">Create a trip from master data, then shape each day of the itinerary.</p></div><Button onClick={() => setOpen(true)} className="bg-[#781216] text-white hover:bg-[#5f0e11]"><Plus className="mr-2 h-4 w-4" />Create trip</Button></header>
    {tripsQuery.isLoading ? <div className="py-20 text-center text-gray-500"><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />Loading trips…</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {trips.map((trip) => <article key={trip.id} className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex flex-1 justify-between gap-3"><div><h2 className="text-lg font-bold text-gray-900">{trip.name}</h2><p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500"><MapPin className="h-4 w-4" />{trip.destination.name}</p></div><span className="h-fit rounded-full bg-[#fcf4e7] px-2.5 py-1 text-xs font-semibold text-[#8a620b]">{trip.numberOfNights} {trip.numberOfNights === 1 ? "night" : "nights"}</span></div><div className="mt-5 flex items-center gap-3 text-xs text-gray-500"><span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{trip._count?.itineraryDays || trip.numberOfNights + 1} days</span><span>{trip._count?.inclusions || 0} inclusions</span></div><div className="mt-5 flex items-center justify-between border-t pt-4"><Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => remove(trip)}><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button><Button asChild size="sm" className="bg-[#781216] text-white hover:bg-[#5f0e11]"><Link to={`/dashboard/crm-trips/${trip.id}`}>Build itinerary <ChevronRight className="ml-1 h-4 w-4" /></Link></Button></div></article>)}
      {!trips.length && <button type="button" onClick={() => setOpen(true)} className="col-span-full rounded-xl border-2 border-dashed border-gray-200 bg-white py-16 text-center text-gray-500 hover:border-[#b59410] hover:text-[#781216]"><Plus className="mx-auto mb-3 h-6 w-6" />Create your first itinerary trip</button>}
    </div>}
    <CreateTripDialog open={open} onOpenChange={setOpen} destinations={destinationsQuery.data || []} onCreated={(trip) => { queryClient.invalidateQueries({ queryKey: ["crm-trips"] }); navigate(`/dashboard/crm-trips/${trip.id}`); }} />
  </div>;
}

function CreateTripDialog({ open, onOpenChange, destinations, onCreated }: { open: boolean; onOpenChange: (value: boolean) => void; destinations: Destination[]; onCreated: (trip: CrmTrip) => void }) {
  const [name, setName] = useState(""); const [nights, setNights] = useState("1"); const [totalAmount, setTotalAmount] = useState(""); const [tokenAmount, setTokenAmount] = useState(""); const [destinationId, setDestinationId] = useState(""); const [pickup, setPickup] = useState(false); const [drop, setDrop] = useState(false); const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); try { const response = await apiClient.post("/crm-trips", { name, numberOfNights: Number(nights), totalAmount: Number(totalAmount), tokenAmount: Number(tokenAmount), destinationId, airportPickupEnabled: pickup, airportDropEnabled: drop }); toast.success("CRM trip created with its itinerary days"); onOpenChange(false); onCreated(response.data); } catch (error: any) { toast.error(error?.response?.data?.message || "Could not create trip"); } finally { setSaving(false); } };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>New itinerary trip</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={submit}><label className="block space-y-1.5"><span className="text-sm font-medium">Trip name</span><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Goa escape" /></label><div className="grid grid-cols-2 gap-3"><label className="block space-y-1.5"><span className="text-sm font-medium">Number of nights</span><Input required min="0" max="365" type="number" value={nights} onChange={(e) => setNights(e.target.value)} /></label><label className="block space-y-1.5"><span className="text-sm font-medium">Total amount</span><Input required min="1" type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} /></label></div><label className="block space-y-1.5"><span className="text-sm font-medium">Token amount</span><Input required min="0" type="number" value={tokenAmount} onChange={(e) => setTokenAmount(e.target.value)} /></label><label className="block space-y-1.5"><span className="text-sm font-medium">Destination</span><select required className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={destinationId} onChange={(e) => setDestinationId(e.target.value)}><option value="">Select destination</option>{destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}</select></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pickup} onChange={(e) => setPickup(e.target.checked)} />Include airport pickup</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={drop} onChange={(e) => setDrop(e.target.checked)} />Include airport drop</label><p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">This creates {Math.max(0, Number(nights) || 0) + 1} itinerary days automatically.</p><div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving} className="bg-[#781216] text-white hover:bg-[#5f0e11]">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create trip</Button></div></form></DialogContent></Dialog>;
}
