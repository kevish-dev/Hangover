import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BedDouble,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  ExternalLink,
  FileCheck2,
  Hotel,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  ReceiptText,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  AdminOption,
  BookingOperation,
  HotelReservation,
  operationsApi,
  VerificationStatus,
} from "../../../../lib/operationsApi";
import { DrawerShell, EmptyState, formatDate, formatMoney, fromDateTimeLocal, inputClass, labelClass, Panel, primaryButton, secondaryButton, StatusBadge, toDateTimeLocal } from "./OperationsShared";
import { HotelDialog, TaskDialog } from "./OperationsDialogs";

const adminName = (admins: AdminOption[], id?: string | null) => admins.find((admin) => admin.id === id)?.profile?.fullName || admins.find((admin) => admin.id === id)?.email || "Unassigned";

function VerificationActions({ current, busy, onSet }: { current: VerificationStatus; busy: boolean; onSet: (status: VerificationStatus) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {current !== "VERIFIED" && <button type="button" disabled={busy} onClick={() => onSet("VERIFIED")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><Check className="h-3.5 w-3.5" />Verify</button>}
      {current !== "REJECTED" && <button type="button" disabled={busy} onClick={() => onSet("REJECTED")} className="inline-flex min-h-9 items-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50">Reject</button>}
      {current !== "PENDING" && <button type="button" disabled={busy} onClick={() => onSet("PENDING")} className="inline-flex min-h-9 items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50">Pending</button>}
    </div>
  );
}

function ReadinessPanel({ booking }: { booking: BookingOperation }) {
  const percentage = Math.round((booking.readiness.completedChecks / booking.readiness.totalChecks) * 100);
  return (
    <Panel title="Booking readiness" eyebrow="Live controls" action={<StatusBadge status={booking.readiness.status} />}>
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#781216] transition-all" style={{ width: `${percentage}%` }} /></div><span className="text-xs font-bold text-gray-600">{booking.readiness.completedChecks}/{booking.readiness.totalChecks}</span></div>
        <div className="grid gap-2 sm:grid-cols-2">
          {booking.readiness.checks.map((check) => <div key={check.key} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold ${check.complete ? "border-emerald-100 bg-emerald-50/70 text-emerald-800" : "border-gray-200 bg-gray-50 text-gray-600"}`}>{check.complete ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <span className="h-4 w-4 shrink-0 rounded-full border-2 border-gray-300" />}{check.label}</div>)}
        </div>
      </div>
    </Panel>
  );
}

export default function BookingOperationsDrawer({ bookingId, admins, onClose, onChanged }: { bookingId: string; admins: AdminOption[]; onClose: () => void; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const [taskOpen, setTaskOpen] = useState(false);
  const [hotelEditor, setHotelEditor] = useState<HotelReservation | "new" | null>(null);
  const [coordinatorId, setCoordinatorId] = useState("");
  const [nextActionAt, setNextActionAt] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [blockerReason, setBlockerReason] = useState("");
  const [hotelRequired, setHotelRequired] = useState(false);
  const [specialReviewed, setSpecialReviewed] = useState(false);

  const { data: booking, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "operations", "booking", bookingId],
    queryFn: () => operationsApi.getBooking(bookingId),
  });

  useEffect(() => {
    if (!booking) return;
    setCoordinatorId(booking.opsCase?.coordinatorId || "");
    setNextActionAt(toDateTimeLocal(booking.opsCase?.nextActionAt));
    setInternalNotes(booking.opsCase?.internalNotes || "");
    setBlockerReason(booking.opsCase?.blockerResolvedAt ? "" : booking.opsCase?.blockerReason || "");
    setHotelRequired(Boolean(booking.opsCase?.hotelRequired));
    setSpecialReviewed(Boolean(booking.opsCase?.specialRequestsReviewedAt));
  }, [booking]);

  const refresh = async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ["admin", "operations"] }),
    ]);
    onChanged();
  };

  const opsMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => operationsApi.updateBooking(bookingId, payload),
    onSuccess: () => { toast.success("Booking operations updated"); refresh(); },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Could not update booking operations"),
  });
  const documentMutation = useMutation({
    mutationFn: ({ kind, travelerId, status, notes }: { kind: "primary" | "traveler"; travelerId?: string; status: VerificationStatus; notes?: string | null }) => kind === "primary"
      ? operationsApi.updatePrimaryDocument(bookingId, { status, notes })
      : operationsApi.updateTraveler(bookingId, travelerId!, { verificationStatus: status, verificationNotes: notes }),
    onSuccess: () => { toast.success("Traveler verification updated"); refresh(); },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Could not update verification"),
  });
  const taskMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => operationsApi.updateTask(id, { status }),
    onSuccess: () => { toast.success("Task updated"); refresh(); },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Could not update task"),
  });
  const hotelArchiveMutation = useMutation({
    mutationFn: (hotelId: string) => operationsApi.updateHotel(bookingId, hotelId, { archived: true }),
    onSuccess: () => { toast.success("Hotel reservation archived"); refresh(); },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Could not archive hotel"),
  });
  const reminderMutation = useMutation({
    mutationFn: () => operationsApi.sendPaymentReminder(bookingId),
    onSuccess: () => { toast.success("Balance reminder sent"); refresh(); },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Could not send reminder"),
  });
  const finalizeMutation = useMutation({
    mutationFn: () => operationsApi.finalizeBooking(bookingId),
    onSuccess: () => { toast.success("Booking completed and review request sent"); refresh(); },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Could not complete booking"),
  });

  const setVerification = (kind: "primary" | "traveler", status: VerificationStatus, travelerId?: string) => {
    const notes = status === "REJECTED" ? window.prompt("Reason for rejection (visible to operations staff):") : undefined;
    if (status === "REJECTED" && notes === null) return;
    documentMutation.mutate({ kind, travelerId, status, notes });
  };

  const contact = useMemo(() => {
    if (!booking) return { name: "Traveler", email: "", phone: "" };
    return {
      name: booking.user.profile?.fullName || booking.user.crmContact?.displayName || booking.user.email,
      email: booking.user.email,
      phone: booking.user.profile?.phone || booking.user.crmContact?.phone || "",
    };
  }, [booking]);

  if (isLoading) return <DrawerShell title="Loading booking…" onClose={onClose}><div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#781216]" /></div></DrawerShell>;
  if (isError || !booking) return <DrawerShell title="Booking unavailable" onClose={onClose}><div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">The booking operations workspace could not be loaded.</div></DrawerShell>;

  const item = booking.trip || booking.festival || booking.slot.trip || booking.slot.festival;
  const activeBlocker = booking.opsCase?.blockerReason && !booking.opsCase?.blockerResolvedAt;
  const saveOps = () => opsMutation.mutate({
    coordinatorId: coordinatorId || null,
    nextActionAt: fromDateTimeLocal(nextActionAt),
    internalNotes: internalNotes || null,
    hotelRequired,
    specialRequestsReviewed: specialReviewed,
    blockerReason: blockerReason || null,
  });

  return (
    <>
      <DrawerShell
        title={`${booking.bookingReference} · ${item?.title || "Booking"}`}
        subtitle={<div className="flex flex-wrap items-center gap-2"><span>{contact.name}</span><StatusBadge status={booking.status} compact /><StatusBadge status={booking.paymentStatus} compact /></div>}
        onClose={onClose}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.8fr)]">
          <div className="space-y-4">
            <ReadinessPanel booking={booking} />

            <Panel title="Customer payment" eyebrow="Booking ledger" action={<StatusBadge status={booking.paymentStatus} />}>
              <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
                <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Booking total</p><p className="mt-1 text-lg font-bold text-gray-950">{formatMoney(booking.totalAmount)}</p></div>
                <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Amount paid</p><p className="mt-1 text-lg font-bold text-emerald-800">{formatMoney(booking.amountPaid)}</p></div>
                <div className={`rounded-xl p-3 ${Number(booking.amountDue) > 0 ? "bg-red-50" : "bg-gray-50"}`}><p className={`text-[10px] font-bold uppercase tracking-wider ${Number(booking.amountDue) > 0 ? "text-red-700" : "text-gray-500"}`}>Balance due</p><p className={`mt-1 text-lg font-bold ${Number(booking.amountDue) > 0 ? "text-red-800" : "text-gray-950"}`}>{formatMoney(booking.amountDue)}</p><p className="mt-1 text-[11px] text-gray-500">{formatDate(booking.balanceDueDate)}</p></div>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3 sm:px-5">
                {booking.paymentStatus === "PARTIALLY_PAID" && Number(booking.amountDue) > 0 && <button type="button" className={secondaryButton} onClick={() => reminderMutation.mutate()} disabled={reminderMutation.isPending}>{reminderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}Send payment reminder</button>}
                {booking.status === "CONFIRMED" && <button type="button" className={secondaryButton} onClick={() => toast("Complete this booking?", { description: "Mark this booking completed and send the review request?", action: { label: "Confirm", onClick: () => finalizeMutation.mutate() }})} disabled={finalizeMutation.isPending}><CheckCircle2 className="h-4 w-4" />Complete booking</button>}
              </div>
              {booking.payments.length > 0 ? <div className="divide-y divide-gray-100 border-t border-gray-100">{booking.payments.map((payment) => <div key={payment.id} className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100"><ReceiptText className="h-4 w-4 text-gray-600" /></div><div><p className="font-semibold text-gray-900">{payment.type} · {formatMoney(payment.amount)}</p><p className="text-xs text-gray-500">{payment.receiptNumber || payment.razorpayPaymentId || "Transaction recorded"} · {formatDate(payment.paidAt || payment.createdAt, "dd MMM yyyy, h:mm a")}</p></div></div><StatusBadge status={payment.status} compact /></div>)}</div> : <EmptyState title="No transactions yet" detail="Payments will appear here when recorded." />}
            </Panel>

            <Panel title={`Traveler roster · ${booking.numberOfTravelers}`} eyebrow="Identity & safety">
              <div className="divide-y divide-gray-100">
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><p className="font-bold text-gray-950">{contact.name}</p><span className="rounded bg-[#f3e8e9] px-2 py-0.5 text-[10px] font-bold uppercase text-[#781216]">Primary</span><StatusBadge status={booking.user.profile?.govtIdVerificationStatus || "UNVERIFIED"} compact /></div><p className="text-sm text-gray-600">{booking.user.profile?.govtIdType || "Government ID"} {booking.user.profile?.govtIdNumber ? `· ${booking.user.profile.govtIdNumber}` : "· number not recorded"}</p><p className="mt-1 text-xs text-gray-500">Emergency: {booking.user.profile?.emergencyContactName || "Not set"} {booking.user.profile?.emergencyContactPhone ? `· ${booking.user.profile.emergencyContactPhone}` : ""}</p>{booking.user.profile?.medicalNotes && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Medical note: {booking.user.profile.medicalNotes}</p>}</div>
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">{booking.user.profile?.govtIdImageUrl && <a href={booking.user.profile.govtIdImageUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 text-xs font-bold text-[#781216] hover:underline">Open ID <ExternalLink className="h-3.5 w-3.5" /></a>}<VerificationActions current={booking.user.profile?.govtIdVerificationStatus || "UNVERIFIED"} busy={documentMutation.isPending} onSet={(status) => setVerification("primary", status)} /></div>
                  </div>
                </div>
                {booking.travelers.map((traveler, index) => <div key={traveler.id} className="p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="mb-2 flex flex-wrap items-center gap-2"><p className="font-bold text-gray-950">{traveler.fullName}</p><span className="text-xs text-gray-500">Traveler {index + 2}</span><StatusBadge status={traveler.verificationStatus} compact /></div><p className="text-sm text-gray-600">{[traveler.gender, traveler.dateOfBirth ? formatDate(traveler.dateOfBirth) : null, traveler.phone].filter(Boolean).join(" · ") || "Profile details not recorded"}</p>{traveler.verificationNotes && <p className="mt-2 text-xs text-red-600">Review note: {traveler.verificationNotes}</p>}</div><div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">{traveler.aadhaar && <a href={traveler.aadhaar} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 text-xs font-bold text-[#781216] hover:underline">Open ID <ExternalLink className="h-3.5 w-3.5" /></a>}<VerificationActions current={traveler.verificationStatus} busy={documentMutation.isPending} onSet={(status) => setVerification("traveler", status, traveler.id)} /></div></div></div>)}
                {booking.travelers.length < Math.max(0, booking.numberOfTravelers - 1) && <div className="flex items-center gap-2 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:px-5"><AlertTriangle className="h-4 w-4" />{booking.numberOfTravelers - 1 - booking.travelers.length} additional traveler record(s) missing</div>}
              </div>
            </Panel>

            <Panel title="Hotel reservations" eyebrow="Stay operations" action={<button type="button" className={secondaryButton} onClick={() => setHotelEditor("new")}><Plus className="h-4 w-4" />Add hotel</button>}>
              {booking.hotelReservations.length ? <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">{booking.hotelReservations.map((hotel) => <div key={hotel.id} className="rounded-xl border border-gray-200 p-4"><div className="flex items-start justify-between gap-3"><div><div className="mb-2 flex flex-wrap items-center gap-2"><Hotel className="h-4 w-4 text-[#781216]" /><p className="font-bold text-gray-950">{hotel.hotelName}</p></div><p className="text-xs text-gray-500">{formatDate(hotel.checkInAt)} – {formatDate(hotel.checkOutAt)}</p><p className="mt-1 text-xs text-gray-500">{hotel.roomCount} room(s) · {hotel.guestCount} guests {hotel.confirmationNumber ? `· ${hotel.confirmationNumber}` : ""}</p></div><StatusBadge status={hotel.status} compact /></div><div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-3 text-xs"><div><p className="text-gray-500">Hotel estimate</p><p className="mt-0.5 font-bold text-gray-900">{formatMoney(hotel.estimatedAmount)}</p></div><div><p className="text-gray-500">Paid to hotel</p><p className="mt-0.5 font-bold text-gray-900">{formatMoney(hotel.amountPaid)}</p></div></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><StatusBadge status={hotel.paymentStatus} compact /><div className="flex gap-2"><button type="button" className="text-xs font-bold text-[#781216] hover:underline" onClick={() => setHotelEditor(hotel)}>Edit</button><button type="button" className="text-xs font-bold text-gray-500 hover:text-red-600" onClick={() => window.confirm("Archive this hotel reservation?") && hotelArchiveMutation.mutate(hotel.id)}>Archive</button></div></div></div>)}</div> : <EmptyState title="No hotel reservation" detail={booking.opsCase?.hotelRequired ? "A hotel is required before this booking can be ready." : "Add a hotel when stay arrangements are needed."} />}
            </Panel>

            <Panel title="Operational tasks" eyebrow="Execution checklist" action={<button type="button" className={secondaryButton} onClick={() => setTaskOpen(true)}><Plus className="h-4 w-4" />New task</button>}>
              {booking.crmTasks.length ? <div className="divide-y divide-gray-100">{booking.crmTasks.map((task) => <div key={task.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className={`font-semibold ${task.status === "DONE" ? "text-gray-400 line-through" : "text-gray-900"}`}>{task.title}</p><StatusBadge status={task.priority} compact /><span className="text-[10px] font-bold uppercase text-gray-400">{task.category.replaceAll("_", " ")}</span></div><p className="mt-1 text-xs text-gray-500">Due {formatDate(task.dueAt, "dd MMM yyyy, h:mm a")} · {adminName(admins, task.assigneeId)}</p></div><div className="flex gap-2">{task.status === "OPEN" && <button type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100" onClick={() => taskMutation.mutate({ id: task.id, status: "DONE" })}><Check className="h-3.5 w-3.5" />Done</button>}</div></div>)}</div> : <EmptyState title="No operational tasks" detail="Create tasks for transport, permits, hotels, vendors, or traveler follow-up." />}
            </Panel>
          </div>

          <aside className="space-y-4">
            <Panel title="Operations owner" eyebrow="Assignment">
              <div className="space-y-4 p-4 sm:p-5">
                <div><label className={labelClass}>Coordinator</label><select className={inputClass} value={coordinatorId} onChange={(e) => setCoordinatorId(e.target.value)}><option value="">Unassigned</option>{admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.profile?.fullName || admin.email}</option>)}</select></div>
                <div><label className={labelClass}>Next action</label><input type="datetime-local" className={inputClass} value={nextActionAt} onChange={(e) => setNextActionAt(e.target.value)} /></div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#781216]" checked={hotelRequired} onChange={(e) => setHotelRequired(e.target.checked)} /><span><span className="block text-sm font-semibold text-gray-900">Hotel required</span><span className="block text-xs text-gray-500">At least one confirmed hotel becomes a readiness requirement.</span></span></label>
                {booking.specialRequests && <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#781216]" checked={specialReviewed} onChange={(e) => setSpecialReviewed(e.target.checked)} /><span><span className="block text-sm font-semibold text-amber-900">Special requests reviewed</span><span className="mt-1 block text-xs text-amber-800">{booking.specialRequests}</span></span></label>}
                <div><label className={labelClass}>Internal operations notes</label><textarea rows={5} className={inputClass} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Rooming, pickup, dietary, permit, or vendor context" /></div>
                <button type="button" className={`${primaryButton} w-full`} onClick={saveOps} disabled={opsMutation.isPending}>{opsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save operational controls</button>
              </div>
            </Panel>

            <Panel title="Blocker control" eyebrow="Exception management" action={activeBlocker ? <StatusBadge status="BLOCKED" compact /> : undefined}>
              <div className="space-y-3 p-4 sm:p-5">
                {activeBlocker && <div className="rounded-xl border border-red-200 bg-red-50 p-3"><p className="text-sm font-bold text-red-800">Active blocker</p><p className="mt-1 text-sm text-red-700">{booking.opsCase?.blockerReason}</p><button type="button" className="mt-3 text-xs font-bold text-red-800 underline" onClick={() => opsMutation.mutate({ blockerResolved: true })}>Mark resolved</button></div>}
                <div><label className={labelClass}>{activeBlocker ? "Replace blocker" : "Add a blocker"}</label><textarea rows={3} className={inputClass} value={blockerReason} onChange={(e) => setBlockerReason(e.target.value)} placeholder="Describe the issue preventing execution" /></div>
                <button type="button" className={secondaryButton} disabled={!blockerReason.trim() || opsMutation.isPending} onClick={() => opsMutation.mutate({ blockerReason })}><AlertTriangle className="h-4 w-4" />Save blocker</button>
              </div>
            </Panel>

            <Panel title="Customer & journey" eyebrow="Quick context">
              <div className="space-y-4 p-4 sm:p-5">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3e8e9]"><UserRound className="h-5 w-5 text-[#781216]" /></div><div className="min-w-0"><p className="truncate font-bold text-gray-950">{contact.name}</p><p className="truncate text-xs text-gray-500">{contact.email}</p></div></div>
                <div className="grid grid-cols-3 gap-2"><a href={`mailto:${contact.email}`} className="flex min-h-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" aria-label="Email"><Mail className="h-4 w-4" /></a><a href={contact.phone ? `tel:${contact.phone}` : undefined} className={`flex min-h-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 ${!contact.phone ? "pointer-events-none opacity-40" : ""}`} aria-label="Call"><Phone className="h-4 w-4" /></a><a target="_blank" rel="noreferrer" href={contact.phone ? `https://wa.me/${contact.phone.replace(/\D/g, "")}` : undefined} className={`flex min-h-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 ${!contact.phone ? "pointer-events-none opacity-40" : ""}`} aria-label="WhatsApp"><MessageCircle className="h-4 w-4" /></a></div>
                <dl className="space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-gray-500">Departure</dt><dd className="text-right font-semibold text-gray-900">{formatDate(booking.slot.startDate)} – {formatDate(booking.slot.endDate)}</dd></div><div className="flex justify-between gap-3"><dt className="text-gray-500">Package</dt><dd className="text-right font-semibold text-gray-900">{booking.package?.title || "Standard"}</dd></div><div className="flex justify-between gap-3"><dt className="text-gray-500">Travelers</dt><dd className="font-semibold text-gray-900">{booking.numberOfTravelers}</dd></div><div className="flex justify-between gap-3"><dt className="text-gray-500">Coordinator</dt><dd className="text-right font-semibold text-gray-900">{adminName(admins, booking.opsCase?.coordinatorId)}</dd></div></dl>
              </div>
            </Panel>

            {(booking.user.profile?.bloodGroup || booking.user.profile?.medicalNotes) && <Panel title="Safety notes" eyebrow="Traveler welfare"><div className="space-y-2 p-4 text-sm sm:p-5">{booking.user.profile?.bloodGroup && <p><span className="text-gray-500">Blood group:</span> <strong>{booking.user.profile.bloodGroup}</strong></p>}{booking.user.profile?.medicalNotes && <p className="rounded-lg bg-amber-50 p-3 text-amber-800">{booking.user.profile.medicalNotes}</p>}</div></Panel>}
          </aside>
        </div>
      </DrawerShell>
      {taskOpen && <TaskDialog admins={admins} bookingId={booking.id} slotId={booking.slotId} onClose={() => setTaskOpen(false)} onSaved={refresh} />}
      {hotelEditor && <HotelDialog bookingId={booking.id} hotel={hotelEditor === "new" ? null : hotelEditor} onClose={() => setHotelEditor(null)} onSaved={refresh} />}
    </>
  );
}
