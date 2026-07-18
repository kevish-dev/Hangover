import { useEffect, useMemo, useState } from "react";
import { Copy, Eye, FilePlus2, Link2, Loader2, Mail, Pencil, Plus, Search, Send, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../../lib/axios";
import { customTripApi, type CustomTrip, type CustomTripDay, type CustomTripHighlight, type CustomTripInput, type CustomTripStatus } from "../../../lib/customTripApi";

const field = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#781216] focus:ring-2 focus:ring-[#781216]/10";
const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600";
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 16);
const dateValue = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : "";
const dateTimeValue = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";
const money = (value: string | number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value));
const duration = (start: string, end: string) => {
  if (!start || !end) return 0;
  return Math.floor((new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / 86_400_000) + 1;
};

const statusStyle: Record<CustomTripStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700", SENT: "bg-blue-100 text-blue-700", VIEWED: "bg-violet-100 text-violet-700",
  CONVERTED: "bg-emerald-100 text-emerald-700", EXPIRED: "bg-amber-100 text-amber-800", CANCELLED: "bg-red-100 text-red-700",
};

const emptyForm = () => ({
  title: "", description: "", customerName: "", customerEmail: "", customerPhone: "", customerUserId: "",
  startDate: today(), endDate: today(), travelerCount: 1, totalAmount: "", tokenAmount: "",
  balanceDueDate: today(), validUntil: plusDays(7), pricingNotes: "", internalNotes: "",
  bannerImages: [] as string[], highlights: [{ title: "", description: "" }] as CustomTripHighlight[],
  itinerary: [{ day: 1, title: "", description: "", activities: [] }] as CustomTripDay[],
});

function OfferPreview({ trip, onClose }: { trip: CustomTrip; onClose: () => void }) {
  return <div className="fixed inset-0 z-[70] flex justify-end bg-black/50" onClick={onClose}>
    <div className="h-full w-full max-w-2xl overflow-y-auto bg-[#faf8f3] shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-[#a17d2c]">Customer preview</p><h2 className="text-xl font-bold text-gray-900">{trip.title}</h2></div>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100"><X className="h-5 w-5" /></button>
      </div>
      {trip.bannerImages[0] && <img src={trip.bannerImages[0]} alt="" className="h-64 w-full object-cover" />}
      <div className="space-y-7 p-5 md:p-8">
        <div><p className="text-sm text-gray-500">Prepared exclusively for {trip.customerName}</p><p className="mt-2 text-sm leading-7 text-gray-700">{trip.description}</p></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[['Dates', `${new Date(trip.startDate).toLocaleDateString('en-IN')} – ${new Date(trip.endDate).toLocaleDateString('en-IN')}`], ['Duration', `${trip.durationDays} days`], ['Travelers', trip.travelerCount], ['Total', money(trip.totalAmount)]].map(([k,v]) => <div key={String(k)} className="rounded-xl border bg-white p-3"><p className="text-[10px] uppercase tracking-wide text-gray-500">{k}</p><p className="mt-1 text-sm font-semibold">{v}</p></div>)}
        </div>
        <section><h3 className="mb-3 text-lg font-bold">Highlights</h3><div className="grid gap-3 sm:grid-cols-2">{trip.highlights.map((h,i) => <div key={i} className="rounded-xl border bg-white p-4"><p className="font-semibold">{h.title || `Highlight ${i+1}`}</p>{h.description && <p className="mt-1 text-sm text-gray-600">{h.description}</p>}</div>)}</div></section>
        <section><h3 className="mb-3 text-lg font-bold">Day-wise itinerary</h3><div className="space-y-3">{trip.itinerary.map((d) => <div key={d.day} className="rounded-xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-[#781216]">Day {d.day}</p><p className="mt-1 font-semibold">{d.title}</p>{d.description && <p className="mt-1 text-sm leading-6 text-gray-600">{d.description}</p>}{d.activities?.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">{d.activities.map((a,i)=><li key={i}>{a}</li>)}</ul>}</div>)}</div></section>
        {trip.pricingNotes && <section className="rounded-xl border border-[#c8a96e]/40 bg-[#fffaf0] p-4"><h3 className="font-bold">Pricing notes</h3><p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{trip.pricingNotes}</p></section>}
      </div>
    </div>
  </div>;
}

function CustomTripEditor({ trip, onClose, onSaved }: { trip: CustomTrip | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>(() => trip ? {
    title: trip.title, description: trip.description || "", customerName: trip.customerName, customerEmail: trip.customerEmail || "",
    customerPhone: trip.customerPhone || "", customerUserId: trip.customerUserId || "", startDate: dateValue(trip.startDate), endDate: dateValue(trip.endDate),
    travelerCount: trip.travelerCount, totalAmount: String(trip.totalAmount), tokenAmount: String(trip.tokenAmount), balanceDueDate: dateValue(trip.balanceDueDate),
    validUntil: dateTimeValue(trip.validUntil), pricingNotes: trip.pricingNotes || "", internalNotes: trip.internalNotes || "", bannerImages: [...trip.bannerImages],
    highlights: trip.highlights.length ? trip.highlights.map((h) => ({...h})) : [{title:"",description:""}], itinerary: trip.itinerary.length ? trip.itinerary.map((d) => ({...d, activities:[...(d.activities || [])]})) : [{day:1,title:"",description:"",activities:[]}],
  } : emptyForm());
  const [users, setUsers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const days = Math.max(0, duration(form.startDate, form.endDate));

  useEffect(() => {
    Promise.all([apiClient.get("/users", { params: { limit: 100 } }), apiClient.get("/trips", { params: { limit: 100 } })])
      .then(([u,t]) => { setUsers(u.data?.data || []); setTemplates(Array.isArray(t.data) ? t.data : t.data?.data || []); })
      .catch(() => undefined);
  }, []);

  const set = (key: string, value: any) => setForm((current: any) => ({ ...current, [key]: value }));
  const syncDays = () => {
    if (days < 1 || days > 60) return toast.error("Choose a valid date range of up to 60 days.");
    set("itinerary", Array.from({ length: days }, (_, index) => form.itinerary[index] || { day: index + 1, title: "", description: "", activities: [] }).map((d: any, i: number) => ({ ...d, day: i + 1 })));
  };
  const chooseCustomer = (id: string) => {
    const user = users.find((entry) => entry.id === id);
    setForm((current: any) => ({ ...current, customerUserId: id, ...(user ? { customerEmail: user.email, customerName: user.profile?.fullName || user.email.split("@")[0], customerPhone: user.profile?.phone || "" } : {}) }));
  };
  const applyTemplate = () => {
    const source = templates.find((entry) => entry.id === templateId);
    if (!source) return;
    setForm((current: any) => ({ ...current, title: source.title, description: source.overview || "", bannerImages: source.bannerImages || [], highlights: source.highlights || [], itinerary: source.itinerary || [], totalAmount: String(source.price || ""), tokenAmount: String(source.tokenAmount || "") }));
    toast.success("Trip content copied. Dates and customer remain independent.");
  };
  const updateHighlight = (index: number, key: string, value: string) => set("highlights", form.highlights.map((h: any, i: number) => i === index ? {...h,[key]:value} : h));
  const updateDay = (index: number, key: string, value: any) => set("itinerary", form.itinerary.map((d: any, i: number) => i === index ? {...d,[key]:value} : d));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const bannerCount = form.bannerImages.length + files.length;
    if (bannerCount < 1) return toast.error("Add at least one banner image before creating the trip.");
    if (bannerCount > 10) return toast.error("A custom trip can have at most 10 banner images.");
    if (!form.highlights.some((highlight: any) => highlight.title?.trim() || highlight.description?.trim())) {
      return toast.error("Add at least one trip highlight before creating the trip.");
    }
    if (days !== form.itinerary.length) return toast.error(`The ${days}-day date range needs exactly ${days} itinerary days. Use “Sync itinerary”.`);
    if (form.itinerary.some((day: any) => !day.title?.trim() && !day.description?.trim() && !day.activities?.length)) {
      return toast.error("Every itinerary day needs a title, description, or activity.");
    }
    const validUntil = new Date(form.validUntil);
    const startDate = new Date(`${form.startDate}T00:00:00`);
    if (Number.isNaN(validUntil.getTime())) return toast.error("Choose when the offer expires.");
    if (validUntil <= new Date()) return toast.error("Offer validity must be in the future.");
    const validityDay = new Date(validUntil.getFullYear(), validUntil.getMonth(), validUntil.getDate()).getTime();
    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
    if (validityDay > startDay) return toast.error("Offer validity cannot extend beyond the trip start date.");
    const totalAmount = Number(form.totalAmount);
    const tokenAmount = Number(form.tokenAmount || 0);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) return toast.error("Total amount must be greater than zero.");
    if (!Number.isFinite(tokenAmount) || tokenAmount < 0 || tokenAmount > totalAmount) return toast.error("Token amount must be between zero and the total amount.");
    if (tokenAmount < totalAmount && !form.balanceDueDate) return toast.error("Add a balance due date when a token payment is available.");
    if (form.balanceDueDate && new Date(`${form.balanceDueDate}T00:00:00`).getTime() < new Date(new Date().toDateString()).getTime()) {
      return toast.error("Balance due date cannot be in the past.");
    }
    setSaving(true);
    try {
      const payload: CustomTripInput = {
        title: form.title, description: form.description || null, customerName: form.customerName, customerEmail: form.customerEmail,
        customerPhone: form.customerPhone || null, customerUserId: form.customerUserId || null, startDate: form.startDate, endDate: form.endDate,
        travelerCount: Number(form.travelerCount), totalAmount: Number(form.totalAmount), tokenAmount: Number(form.tokenAmount || 0),
        balanceDueDate: form.balanceDueDate || null, validUntil: validUntil.toISOString(), pricingNotes: form.pricingNotes || null,
        internalNotes: form.internalNotes || null, bannerImages: form.bannerImages, highlights: form.highlights, itinerary: form.itinerary,
      } as CustomTripInput;
      if (trip) await customTripApi.update(trip.id, payload, files);
      else await customTripApi.create(payload, files);
      toast.success(trip ? "Custom trip updated" : "Custom trip created and ready to share");
      onSaved(); onClose();
    } catch (error: any) { toast.error(error?.response?.data?.message || "Could not save the custom trip."); }
    finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-2 md:p-5" onClick={onClose}>
    <form onSubmit={submit} className="max-h-[calc(100dvh-1rem)] w-full max-w-5xl overflow-y-auto rounded-2xl bg-gray-50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-4 py-4 md:px-6"><div><h2 className="text-lg font-bold">{trip ? "Edit custom trip" : "Create custom trip"}</h2><p className="text-xs text-gray-500">Independent private offer — no inquiry is linked or modified.</p></div><button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-gray-100"><X className="h-5 w-5" /></button></header>
      <div className="space-y-5 p-4 md:p-6">
        <section className="rounded-xl border bg-white p-4"><div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end"><div className="flex-1"><label className={label}>Copy content from a public trip (optional)</label><select className={field} value={templateId} onChange={(e)=>setTemplateId(e.target.value)}><option value="">Choose a reusable template</option>{templates.map((t)=><option key={t.id} value={t.id}>{t.title}</option>)}</select></div><button type="button" onClick={applyTemplate} disabled={!templateId} className="rounded-lg border px-4 py-2.5 text-sm font-semibold disabled:opacity-40"><Copy className="mr-2 inline h-4 w-4"/>Copy content</button></div><p className="text-xs text-gray-500">Only content is copied. The custom trip stays private and has its own dates, price, customer, and lifecycle.</p></section>
        <section className="rounded-xl border bg-white p-4"><h3 className="mb-4 font-bold">Customer</h3><div className="grid gap-4 md:grid-cols-2"><div><label className={label}>Existing account (optional)</label><select className={field} value={form.customerUserId} onChange={(e)=>chooseCustomer(e.target.value)}><option value="">Manual customer details</option>{users.map((u)=><option key={u.id} value={u.id}>{u.profile?.fullName || u.email} — {u.email}</option>)}</select></div><div><label className={label}>Customer name *</label><input required className={field} value={form.customerName} onChange={(e)=>set("customerName",e.target.value)}/></div><div><label className={label}>Email *</label><input required type="email" className={field} value={form.customerEmail} readOnly={Boolean(form.customerUserId)} onChange={(e)=>set("customerEmail",e.target.value)}/></div><div><label className={label}>Phone</label><input className={field} value={form.customerPhone} onChange={(e)=>set("customerPhone",e.target.value)}/></div></div></section>
        <section className="rounded-xl border bg-white p-4"><h3 className="mb-4 font-bold">Core trip details</h3><div className="grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><label className={label}>Title *</label><input required minLength={3} maxLength={160} className={field} value={form.title} onChange={(e)=>set("title",e.target.value)}/></div><div className="md:col-span-2"><label className={label}>Description</label><textarea rows={4} className={field} value={form.description} onChange={(e)=>set("description",e.target.value)}/></div><div><label className={label}>Start date *</label><input required type="date" className={field} value={form.startDate} onChange={(e)=>set("startDate",e.target.value)}/></div><div><label className={label}>End date *</label><input required type="date" className={field} value={form.endDate} onChange={(e)=>set("endDate",e.target.value)}/></div><div><label className={label}>Travelers *</label><input required type="number" min={1} max={100} className={field} value={form.travelerCount} onChange={(e)=>set("travelerCount",e.target.value)}/></div><div className="flex items-end"><div className="w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm"><strong>{days > 0 ? days : 0}</strong> inclusive travel day(s)</div></div></div></section>
        <section className="rounded-xl border bg-white p-4"><h3 className="mb-4 font-bold">Pricing and validity</h3><div className="grid gap-4 md:grid-cols-2"><div><label className={label}>Total price (entire group) *</label><input required type="number" min="0.01" step="0.01" className={field} value={form.totalAmount} onChange={(e)=>set("totalAmount",e.target.value)}/></div><div><label className={label}>Booking/token amount *</label><input required type="number" min="0" step="0.01" className={field} value={form.tokenAmount} onChange={(e)=>set("tokenAmount",e.target.value)}/></div><div><label className={label}>Balance due date</label><input type="date" className={field} value={form.balanceDueDate} onChange={(e)=>set("balanceDueDate",e.target.value)}/></div><div><label className={label}>Offer valid until *</label><input required type="datetime-local" className={field} value={form.validUntil} onChange={(e)=>set("validUntil",e.target.value)}/></div><div className="md:col-span-2"><label className={label}>Customer-visible pricing notes</label><textarea rows={3} className={field} value={form.pricingNotes} onChange={(e)=>set("pricingNotes",e.target.value)}/></div><div className="md:col-span-2"><label className={label}>Internal admin notes (never shown to customer)</label><textarea rows={2} className={field} value={form.internalNotes} onChange={(e)=>set("internalNotes",e.target.value)}/></div></div></section>
        <section className="rounded-xl border bg-white p-4"><h3 className="mb-4 font-bold">Banner images *</h3><div className="mb-3 flex flex-wrap gap-3">{form.bannerImages.map((url:string)=><div key={url} className="relative"><img src={url} alt="" className="h-24 w-36 rounded-lg object-cover"/><button type="button" onClick={()=>set("bannerImages",form.bannerImages.filter((v:string)=>v!==url))} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"><X className="h-3 w-3"/></button></div>)}</div><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(e)=>setFiles(Array.from(e.target.files || []))} className={field}/><p className="mt-2 text-xs text-gray-500">Up to 10 images, 12 MB each. At least one is required to create the trip.</p></section>
        <section className="rounded-xl border bg-white p-4"><div className="mb-4 flex items-center justify-between"><h3 className="font-bold">Highlights</h3><button type="button" onClick={()=>set("highlights",[...form.highlights,{title:"",description:""}])} className="text-sm font-semibold text-[#781216]"><Plus className="mr-1 inline h-4 w-4"/>Add</button></div><div className="space-y-3">{form.highlights.map((h:any,i:number)=><div key={i} className="grid gap-2 rounded-lg bg-gray-50 p-3 md:grid-cols-[1fr_2fr_auto]"><input placeholder="Highlight title" className={field} value={h.title||""} onChange={(e)=>updateHighlight(i,"title",e.target.value)}/><input placeholder="Short description" className={field} value={h.description||""} onChange={(e)=>updateHighlight(i,"description",e.target.value)}/><button type="button" onClick={()=>set("highlights",form.highlights.filter((_:any,index:number)=>index!==i))} className="p-2 text-red-600"><Trash2 className="h-4 w-4"/></button></div>)}</div></section>
        <section className="rounded-xl border bg-white p-4"><div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="font-bold">Day-wise itinerary</h3><p className="text-xs text-gray-500">One entry per inclusive travel day.</p></div><button type="button" onClick={syncDays} className="rounded-lg border px-3 py-2 text-xs font-semibold">Sync to {days} day(s)</button></div><div className="space-y-3">{form.itinerary.map((d:any,i:number)=><div key={i} className="rounded-xl border bg-gray-50 p-3"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#781216]">Day {i+1}</p><div className="grid gap-2"><input required placeholder="Day title" className={field} value={d.title||""} onChange={(e)=>updateDay(i,"title",e.target.value)}/><textarea rows={2} placeholder="What happens on this day?" className={field} value={d.description||""} onChange={(e)=>updateDay(i,"description",e.target.value)}/><input placeholder="Activities separated by commas" className={field} value={(d.activities||[]).join(", ")} onChange={(e)=>updateDay(i,"activities",e.target.value.split(",").map(v=>v.trim()).filter(Boolean))}/></div></div>)}</div></section>
      </div>
      <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t bg-white p-4 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-lg border px-5 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-lg bg-[#781216] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving && <Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>}{trip ? "Save changes" : "Create trip"}</button></footer>
    </form>
  </div>;
}

export default function AdminCustomTripsPage() {
  const [trips, setTrips] = useState<CustomTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [editing, setEditing] = useState<CustomTrip | null | undefined>(undefined);
  const [preview, setPreview] = useState<CustomTrip | null>(null);
  const load = async () => { setLoading(true); try { setTrips((await customTripApi.list({limit:100,status,q:search})).data); } catch (e:any) { toast.error(e?.response?.data?.message || "Could not load custom trips."); } finally { setLoading(false); } };
  useEffect(() => { const timer=setTimeout(load,250); return()=>clearTimeout(timer); }, [search,status]);
  const counts = useMemo(() => trips.reduce((a,t)=>({...a,[t.status]:(a[t.status]||0)+1}),{} as Record<string,number>),[trips]);

  const sendOffer = async (trip: CustomTrip) => { try { const result=await customTripApi.send(trip.id); await navigator.clipboard?.writeText(result.offerLink); toast.success(result.emailSent ? "Offer emailed and secure link copied" : result.emailError || "Secure link copied"); await load(); } catch(e:any){toast.error(e?.response?.data?.message||"Could not send offer.");} };
  const duplicate = async (trip:CustomTrip)=>{try{await customTripApi.duplicate(trip.id);toast.success("Draft duplicated");await load();}catch(e:any){toast.error(e?.response?.data?.message||"Could not duplicate.");}};
  const cancel = async (trip:CustomTrip)=>{const reason=window.prompt("Cancellation reason","");if(reason===null)return;try{await customTripApi.cancel(trip.id,reason);toast.success("Custom trip cancelled");await load();}catch(e:any){toast.error(e?.response?.data?.message||"Could not cancel.");}};
  const remove = async (trip:CustomTrip)=>{if(!window.confirm(`Delete draft ${trip.reference}?`))return;try{await customTripApi.remove(trip.id);toast.success("Draft deleted");await load();}catch(e:any){toast.error(e?.response?.data?.message||"Could not delete.");}};

  return <div className="w-full space-y-5">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><FilePlus2 className="h-6 w-6 text-[#c8a96e]"/>Custom Trips</h1><p className="mt-1 text-sm text-gray-500">Create private, date-specific offers independently from customer inquiries.</p></div><button onClick={()=>setEditing(null)} className="rounded-lg bg-[#781216] px-4 py-2.5 text-sm font-semibold text-white"><Plus className="mr-2 inline h-4 w-4"/>Create custom trip</button></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[["Visible results",trips.length],["Drafts",counts.DRAFT||0],["Awaiting customer",(counts.SENT||0)+(counts.VIEWED||0)],["Converted",counts.CONVERTED||0]].map(([k,v])=><div key={String(k)} className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">{k}</p><p className="mt-1 text-2xl font-bold">{v}</p></div>)}</div>
    <div className="flex flex-col gap-3 rounded-xl border bg-white p-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400"/><input className={`${field} pl-9`} placeholder="Search title, customer, email, or reference" value={search} onChange={(e)=>setSearch(e.target.value)}/></div><select className={`${field} sm:w-48`} value={status} onChange={(e)=>setStatus(e.target.value)}><option value="ALL">All statuses</option>{Object.keys(statusStyle).map(s=><option key={s}>{s}</option>)}</select></div>
    {loading ? <div className="py-16 text-center text-gray-500"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin"/>Loading custom trips…</div> : trips.length===0 ? <div className="rounded-xl border bg-white py-16 text-center"><FilePlus2 className="mx-auto mb-3 h-10 w-10 text-gray-300"/><p className="font-semibold">No custom trips found</p><p className="text-sm text-gray-500">Create an independent private offer for a customer.</p></div> : <div className="grid gap-4 xl:grid-cols-2">{trips.map(trip=><article key={trip.id} className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="flex gap-4 p-4">{trip.bannerImages[0]?<img src={trip.bannerImages[0]} alt="" className="h-24 w-28 rounded-lg object-cover"/>:<div className="flex h-24 w-28 items-center justify-center rounded-lg bg-gray-100"><FilePlus2 className="text-gray-300"/></div>}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{trip.reference}</p><h2 className="truncate font-bold text-gray-900">{trip.title}</h2></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyle[trip.status]}`}>{trip.status}</span></div><p className="mt-2 truncate text-sm text-gray-600">{trip.customerName} · {trip.customerEmail}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500"><span>{new Date(trip.startDate).toLocaleDateString('en-IN')} – {new Date(trip.endDate).toLocaleDateString('en-IN')}</span><span><Users className="mr-1 inline h-3 w-3"/>{trip.travelerCount}</span><strong className="text-gray-800">{money(trip.totalAmount)}</strong></div></div></div><div className="flex flex-wrap gap-2 border-t bg-gray-50 p-3"><button onClick={()=>setPreview(trip)} className="rounded-md border bg-white px-3 py-2 text-xs font-semibold"><Eye className="mr-1 inline h-3.5 w-3.5"/>Preview</button>{!["CONVERTED","CANCELLED"].includes(trip.status)&&<button onClick={()=>setEditing(trip)} className="rounded-md border bg-white px-3 py-2 text-xs font-semibold"><Pencil className="mr-1 inline h-3.5 w-3.5"/>Edit</button>}{!["CONVERTED","CANCELLED"].includes(trip.status)&&<button onClick={()=>sendOffer(trip)} className="rounded-md bg-[#781216] px-3 py-2 text-xs font-semibold text-white"><Send className="mr-1 inline h-3.5 w-3.5"/>{trip.status==="DRAFT"?"Send":"Resend"}</button>}<button onClick={()=>duplicate(trip)} className="rounded-md border bg-white px-3 py-2 text-xs font-semibold"><Copy className="mr-1 inline h-3.5 w-3.5"/>Duplicate</button>{trip.booking&&<a href={`/dashboard/bookings?booking=${trip.booking.id}`} className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><Link2 className="mr-1 inline h-3.5 w-3.5"/>Booking</a>}{trip.status==="DRAFT"?<button onClick={()=>remove(trip)} className="ml-auto p-2 text-red-600"><Trash2 className="h-4 w-4"/></button>:!["CONVERTED","CANCELLED"].includes(trip.status)&&<button onClick={()=>cancel(trip)} className="ml-auto p-2 text-red-600"><X className="h-4 w-4"/></button>}</div></article>)}</div>}
    {editing!==undefined&&<CustomTripEditor trip={editing} onClose={()=>setEditing(undefined)} onSaved={load}/>} {preview&&<OfferPreview trip={preview} onClose={()=>setPreview(null)}/>} 
  </div>;
}
