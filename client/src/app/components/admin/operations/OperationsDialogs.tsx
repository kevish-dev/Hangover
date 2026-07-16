import { FormEvent, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  AdminOption,
  HotelInput,
  HotelReservation,
  operationsApi,
  TaskCategory,
  TaskPriority,
} from "../../../../lib/operationsApi";
import { fromDateTimeLocal, inputClass, labelClass, primaryButton, secondaryButton, toDateTimeLocal } from "./OperationsShared";

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-4 sm:px-6">
          <h2 className="text-lg font-bold text-gray-950">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function TaskDialog({
  admins,
  bookingId,
  slotId,
  hotelReservationId,
  onClose,
  onSaved,
}: {
  admins: AdminOption[];
  bookingId?: string;
  slotId?: string;
  hotelReservationId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TaskCategory>(hotelReservationId ? "HOTEL" : bookingId ? "GENERAL" : "TRANSPORT");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const mutation = useMutation({
    mutationFn: () => operationsApi.createTask({
      title,
      description: description || null,
      category,
      priority,
      assigneeId: assigneeId || null,
      dueAt: fromDateTimeLocal(dueAt),
      ...(bookingId && { bookingId }),
      ...(slotId && { slotId }),
      ...(hotelReservationId && { hotelReservationId }),
    }),
    onSuccess: () => { toast.success("Operational task created"); onSaved(); onClose(); },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Could not create task"),
  });
  const submit = (event: FormEvent) => { event.preventDefault(); if (title.trim()) mutation.mutate(); };

  return (
    <Dialog title="New operational task" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-4 sm:p-6">
        <div><label className={labelClass}>Task title</label><input autoFocus required maxLength={200} className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Confirm airport pickup" /></div>
        <div><label className={labelClass}>Details</label><textarea rows={3} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Instructions, vendor details, or completion criteria" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={labelClass}>Category</label><select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)}>{["FOLLOW_UP", "PAYMENT", "TRAVELER_DOCUMENT", "HOTEL", "TRANSPORT", "PERMIT", "VENDOR", "GENERAL"].map((value) => <option key={value}>{value}</option>)}</select></div>
          <div><label className={labelClass}>Priority</label><select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>{["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => <option key={value}>{value}</option>)}</select></div>
          <div><label className={labelClass}>Due date & time</label><input type="datetime-local" className={inputClass} value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
          <div><label className={labelClass}>Assignee</label><select className={inputClass} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}><option value="">Unassigned</option>{admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.profile?.fullName || admin.email}</option>)}</select></div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end"><button type="button" className={secondaryButton} onClick={onClose}>Cancel</button><button type="submit" className={primaryButton} disabled={mutation.isPending || !title.trim()}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Create task</button></div>
      </form>
    </Dialog>
  );
}

const emptyHotel = {
  hotelName: "", address: "", contactName: "", contactPhone: "", contactEmail: "", confirmationNumber: "", roomType: "", roomCount: 1, guestCount: 1, checkInAt: "", checkOutAt: "", status: "PLANNED", estimatedAmount: 0, amountPaid: 0, paymentStatus: "UNPAID", paymentDueAt: "", notes: "",
};

export function HotelDialog({ bookingId, hotel, onClose, onSaved }: { bookingId: string; hotel?: HotelReservation | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>(emptyHotel);
  useEffect(() => {
    setForm(hotel ? {
      ...emptyHotel,
      ...hotel,
      checkInAt: toDateTimeLocal(hotel.checkInAt),
      checkOutAt: toDateTimeLocal(hotel.checkOutAt),
      paymentDueAt: toDateTimeLocal(hotel.paymentDueAt),
      estimatedAmount: Number(hotel.estimatedAmount),
      amountPaid: Number(hotel.amountPaid),
    } : emptyHotel);
  }, [hotel]);
  const set = (key: string, value: unknown) => setForm((current: any) => ({ ...current, [key]: value }));
  const payload = (): HotelInput => ({
    hotelName: form.hotelName,
    address: form.address || null,
    contactName: form.contactName || null,
    contactPhone: form.contactPhone || null,
    contactEmail: form.contactEmail || null,
    confirmationNumber: form.confirmationNumber || null,
    roomType: form.roomType || null,
    roomCount: Number(form.roomCount),
    guestCount: Number(form.guestCount),
    checkInAt: fromDateTimeLocal(form.checkInAt),
    checkOutAt: fromDateTimeLocal(form.checkOutAt),
    status: form.status,
    estimatedAmount: Number(form.estimatedAmount),
    amountPaid: Number(form.amountPaid),
    paymentStatus: form.paymentStatus,
    paymentDueAt: fromDateTimeLocal(form.paymentDueAt),
    currency: "INR",
    notes: form.notes || null,
  });
  const mutation = useMutation({
    mutationFn: () => hotel ? operationsApi.updateHotel(bookingId, hotel.id, payload()) : operationsApi.createHotel(bookingId, payload()),
    onSuccess: () => { toast.success(hotel ? "Hotel reservation updated" : "Hotel reservation added"); onSaved(); onClose(); },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Could not save hotel reservation"),
  });
  const submit = (event: FormEvent) => { event.preventDefault(); if (form.hotelName.trim()) mutation.mutate(); };

  return (
    <Dialog title={hotel ? "Edit hotel reservation" : "Add hotel reservation"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className={labelClass}>Hotel name</label><input autoFocus required className={inputClass} value={form.hotelName} onChange={(e) => set("hotelName", e.target.value)} /></div>
          <div className="sm:col-span-2"><label className={labelClass}>Address</label><input className={inputClass} value={form.address} onChange={(e) => set("address", e.target.value)} /></div>
          <div><label className={labelClass}>Check-in</label><input type="datetime-local" className={inputClass} value={form.checkInAt} onChange={(e) => set("checkInAt", e.target.value)} /></div>
          <div><label className={labelClass}>Check-out</label><input type="datetime-local" className={inputClass} value={form.checkOutAt} onChange={(e) => set("checkOutAt", e.target.value)} /></div>
          <div><label className={labelClass}>Reservation status</label><select className={inputClass} value={form.status} onChange={(e) => set("status", e.target.value)}>{["PLANNED", "REQUESTED", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"].map((value) => <option key={value}>{value}</option>)}</select></div>
          <div><label className={labelClass}>Confirmation number</label><input className={inputClass} value={form.confirmationNumber} onChange={(e) => set("confirmationNumber", e.target.value)} /></div>
          <div><label className={labelClass}>Room type</label><input className={inputClass} value={form.roomType} onChange={(e) => set("roomType", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className={labelClass}>Rooms</label><input min="1" type="number" className={inputClass} value={form.roomCount} onChange={(e) => set("roomCount", e.target.value)} /></div><div><label className={labelClass}>Guests</label><input min="1" type="number" className={inputClass} value={form.guestCount} onChange={(e) => set("guestCount", e.target.value)} /></div></div>
          <div><label className={labelClass}>Contact name</label><input className={inputClass} value={form.contactName} onChange={(e) => set("contactName", e.target.value)} /></div>
          <div><label className={labelClass}>Contact phone</label><input className={inputClass} value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} /></div>
          <div className="sm:col-span-2"><label className={labelClass}>Contact email</label><input type="email" className={inputClass} value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} /></div>
          <div><label className={labelClass}>Estimated hotel amount</label><input min="0" step="0.01" type="number" className={inputClass} value={form.estimatedAmount} onChange={(e) => set("estimatedAmount", e.target.value)} /></div>
          <div><label className={labelClass}>Amount paid to hotel</label><input min="0" step="0.01" type="number" className={inputClass} value={form.amountPaid} onChange={(e) => set("amountPaid", e.target.value)} /></div>
          <div><label className={labelClass}>Vendor payment status</label><select className={inputClass} value={form.paymentStatus} onChange={(e) => set("paymentStatus", e.target.value)}>{["UNPAID", "PARTIALLY_PAID", "PAID", "REFUNDED"].map((value) => <option key={value}>{value}</option>)}</select></div>
          <div><label className={labelClass}>Vendor payment due</label><input type="datetime-local" className={inputClass} value={form.paymentDueAt} onChange={(e) => set("paymentDueAt", e.target.value)} /></div>
          <div className="sm:col-span-2"><label className={labelClass}>Internal hotel notes</label><textarea rows={3} className={inputClass} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end"><button type="button" className={secondaryButton} onClick={onClose}>Cancel</button><button type="submit" className={primaryButton} disabled={mutation.isPending || !form.hotelName.trim()}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save reservation</button></div>
      </form>
    </Dialog>
  );
}
