import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Download,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  ReceiptText,
  Send,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { apiClient } from "../../../lib/axios";

type InvoiceItem = { description: string; price: number };

type ReceiptSync = {
  state:
    | "CURRENT"
    | "REFUNDED"
    | "REFUND_PENDING"
    | "PARTIALLY_REFUNDED"
    | "BOOKING_CANCELLED"
    | "PAYMENT_NOT_SUCCESSFUL"
    | "UNLINKED"
    | "BOOKING_MISSING"
    | "PAYMENT_MISSING"
    | "PAYMENT_BOOKING_MISMATCH"
    | "PAYMENT_AMOUNT_MISMATCH";
  issues: string[];
  booking: {
    id: string;
    bookingReference: string;
    status: string;
    paymentStatus: string;
    numberOfTravelers: number;
    totalAmount: string;
    amountPaid: string;
    amountDue: string;
    balanceDueDate?: string | null;
    customer: { name?: string | null; email?: string | null; phone?: string | null };
    journey: {
      kind: string;
      title: string;
      location?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      durationDays?: number | null;
      packageName?: string | null;
    };
  } | null;
  payment: {
    id: string;
    bookingId: string;
    type: string;
    status: string;
    amount: string;
    currency: string;
    paymentMethod?: string | null;
    utr?: string | null;
    receiptNumber?: string | null;
    razorpayOrderId?: string | null;
    razorpayPaymentId?: string | null;
    paidAt?: string | null;
    createdAt: string;
    successfulRefunded: number;
    pendingRefunded: number;
    netAmount: number;
    refunds: Array<{
      id: string;
      amount: string;
      status: string;
      reason?: string | null;
      razorpayRefundId?: string | null;
      createdAt: string;
      processedAt?: string | null;
    }>;
  } | null;
};

type Invoice = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  title: string;
  description?: string;
  items: InvoiceItem[];
  amount: string;
  currency: string;
  dueDate?: string;
  status: string;
  createdAt: string;
  source?: "CUSTOM" | "BOOKING_RECEIPT";
  bookingId?: string;
  paymentId?: string;
  sentAt?: string;
  sync?: ReceiptSync | null;
};

const syncDisplay: Record<ReceiptSync["state"], { label: string; className: string; description: string }> = {
  CURRENT: { label: "Current", className: "border-emerald-200 bg-emerald-50 text-emerald-700", description: "The receipt matches the current booking payment." },
  REFUNDED: { label: "Refunded", className: "border-violet-200 bg-violet-50 text-violet-700", description: "The payment recorded by this receipt has been fully refunded." },
  PARTIALLY_REFUNDED: { label: "Partially refunded", className: "border-violet-200 bg-violet-50 text-violet-700", description: "Part of the payment recorded by this receipt has been refunded." },
  REFUND_PENDING: { label: "Refund pending", className: "border-amber-200 bg-amber-50 text-amber-800", description: "A refund has been initiated and is awaiting completion." },
  BOOKING_CANCELLED: { label: "Booking cancelled", className: "border-slate-200 bg-slate-100 text-slate-700", description: "The booking has since been cancelled." },
  PAYMENT_NOT_SUCCESSFUL: { label: "Payment needs review", className: "border-red-200 bg-red-50 text-red-700", description: "The linked transaction is no longer a successful payment." },
  UNLINKED: { label: "Not linked", className: "border-amber-200 bg-amber-50 text-amber-800", description: "This legacy receipt cannot be matched to both a booking and payment." },
  BOOKING_MISSING: { label: "Booking unavailable", className: "border-red-200 bg-red-50 text-red-700", description: "The booking linked to this receipt is unavailable." },
  PAYMENT_MISSING: { label: "Payment unavailable", className: "border-red-200 bg-red-50 text-red-700", description: "The transaction linked to this receipt is unavailable." },
  PAYMENT_BOOKING_MISMATCH: { label: "Link mismatch", className: "border-red-200 bg-red-50 text-red-700", description: "The receipt payment belongs to a different booking." },
  PAYMENT_AMOUNT_MISMATCH: { label: "Amount mismatch", className: "border-red-200 bg-red-50 text-red-700", description: "The stored receipt amount differs from the linked payment." },
};

const formatDate = (value?: string | null, pattern = "MMM d, yyyy") => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : format(date, pattern);
};

const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start && !end) return "Dates not recorded";
  if (!start) return formatDate(end);
  if (!end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
};

function SyncBadge({ invoice }: { invoice: Invoice }) {
  if (!invoice.sync) {
    return <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600">Custom receipt</span>;
  }
  const display = syncDisplay[invoice.sync.state];
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${display.className}`}>{display.label}</span>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1.4fr)] gap-3 border-b border-gray-100 py-2.5 text-sm last:border-0"><span className="text-gray-500">{label}</span><span className="break-words text-right font-medium text-gray-900">{value}</span></div>;
}

function ReceiptDetailsModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const sync = invoice.sync;
  const display = sync ? syncDisplay[sync.state] : null;
  const SyncIcon = sync?.state === "CURRENT" ? CheckCircle2 : CircleAlert;
  const booking = sync?.booking;
  const payment = sync?.payment;
  const formatCurrency = (amount: number | string, currency = "INR") => new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(Number(amount || 0));

  return (
    <div role="dialog" aria-modal="true" aria-label={`Receipt details for ${invoice.title}`} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm md:items-center md:p-4" onClick={onClose}>
      <div className="max-h-[96dvh] w-full max-w-5xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:max-h-[90vh] md:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur md:px-6">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2"><SyncBadge invoice={invoice} /><span className="text-xs font-medium text-gray-500">{invoice.source === "BOOKING_RECEIPT" ? "Booking receipt" : "Custom receipt"}</span></div>
            <h2 className="break-words text-lg font-bold text-gray-950 md:text-xl">{invoice.title}</h2>
            <p className="mt-1 text-sm text-gray-500">Issued {formatDate(invoice.sentAt || invoice.createdAt, "MMM d, yyyy · h:mm a")}</p>
          </div>
          <button type="button" aria-label="Close receipt details" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"><X className="h-5 w-5" /></button>
        </header>

        <div className="space-y-5 p-5 md:p-6">
          {display && <section className={`rounded-xl border p-4 ${display.className}`}><div className="flex items-start gap-3"><SyncIcon className="mt-0.5 h-5 w-5 shrink-0" /><div><h3 className="font-bold">{display.label}</h3><p className="mt-1 text-sm">{display.description}</p>{sync?.issues.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{sync.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}</div></div></section>}

          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-800"><ReceiptText className="h-4 w-4 text-[#781216]" />Receipt record</h3><div className="mt-2"><DetailRow label="Recipient" value={`${invoice.customerName} · ${invoice.customerEmail}`} /><DetailRow label="Receipt amount" value={formatCurrency(invoice.amount, invoice.currency)} /><DetailRow label="Receipt status" value={invoice.status} /><DetailRow label="Reference" value={invoice.paymentId || invoice.bookingId || invoice.id} />{invoice.description ? <DetailRow label="Notes" value={invoice.description} /> : null}</div></section>

          {booking && <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-800"><UserRound className="h-4 w-4 text-[#781216]" />Current booking</h3><div className="mt-2"><DetailRow label="Booking reference" value={booking.bookingReference} /><DetailRow label="Booking status" value={booking.status.replaceAll("_", " ")} /><DetailRow label="Payment status" value={booking.paymentStatus.replaceAll("_", " ")} /><DetailRow label="Travelers" value={String(booking.numberOfTravelers)} /><DetailRow label="Customer" value={booking.customer.name || booking.customer.email || "Not recorded"} /></div><Link to={`/dashboard/bookings/${booking.id}`} onClick={onClose} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#781216] hover:underline">Open booking <ExternalLink className="h-3.5 w-3.5" /></Link></section>
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-800"><MapPin className="h-4 w-4 text-[#781216]" />Current journey</h3><div className="mt-2"><DetailRow label="Journey" value={booking.journey.title} /><DetailRow label="Type" value={booking.journey.kind.replaceAll("_", " ")} /><DetailRow label="Location" value={booking.journey.location || "Not recorded"} /><DetailRow label="Travel dates" value={formatDateRange(booking.journey.startDate, booking.journey.endDate)} /><DetailRow label="Package" value={booking.journey.packageName || "Not recorded"} /></div></section>
          </div>}

          {payment && <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-800"><WalletCards className="h-4 w-4 text-[#781216]" />Linked payment</h3><div className="mt-2"><DetailRow label="Transaction amount" value={formatCurrency(payment.amount, payment.currency)} /><DetailRow label="Transaction status" value={payment.status} /><DetailRow label="Payment type" value={payment.type} /><DetailRow label="Method" value={payment.paymentMethod?.toUpperCase() || "Not recorded"} /><DetailRow label="Paid at" value={formatDate(payment.paidAt || payment.createdAt, "MMM d, yyyy · h:mm a")} /><DetailRow label="Receipt number" value={payment.receiptNumber || "Not recorded"} /><DetailRow label="Transaction ID" value={payment.razorpayPaymentId || payment.utr || payment.id} /></div></section>
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-800"><CalendarDays className="h-4 w-4 text-[#781216]" />Live payment position</h3><div className="mt-2"><DetailRow label="Booking total" value={booking ? formatCurrency(booking.totalAmount) : "Not recorded"} /><DetailRow label="Paid on booking" value={booking ? formatCurrency(booking.amountPaid) : "Not recorded"} /><DetailRow label="Balance due" value={booking ? formatCurrency(booking.amountDue) : "Not recorded"} /><DetailRow label="Refunded" value={formatCurrency(payment.successfulRefunded, payment.currency)} /><DetailRow label="Refund pending" value={formatCurrency(payment.pendingRefunded, payment.currency)} /><DetailRow label="Net received" value={formatCurrency(payment.netAmount, payment.currency)} /></div></section>
          </div>}

          {payment?.refunds.length ? <section className="rounded-xl border border-violet-200 bg-violet-50/50 p-4"><h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-violet-900"><AlertTriangle className="h-4 w-4" />Refund activity</h3><div className="mt-3 divide-y divide-violet-100">{payment.refunds.map((refund) => <div key={refund.id} className="flex flex-col gap-1 py-3 text-sm first:pt-0 sm:flex-row sm:items-center sm:justify-between"><div><span className="font-bold text-gray-900">{formatCurrency(refund.amount, payment.currency)}</span><span className="ml-2 text-gray-600">{refund.reason || "Refund"}</span></div><span className="text-xs font-semibold text-violet-800">{refund.status} · {formatDate(refund.processedAt || refund.createdAt)}</span></div>)}</div></section> : null}

          <section className="rounded-xl border border-gray-200 bg-gray-50/60 p-4"><h3 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-800">Line items on this receipt</h3><div className="mt-3 space-y-2">{invoice.items.length ? invoice.items.map((item, index) => <div key={`${item.description}-${index}`} className="flex items-start justify-between gap-4 text-sm"><span className="text-gray-700">{item.description || "Receipt item"}</span><span className="shrink-0 font-semibold text-gray-900">{formatCurrency(item.price, invoice.currency)}</span></div>) : <p className="text-sm text-gray-500">No line items were recorded.</p>}</div></section>
        </div>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/invoices");
      if (res.data.status === "success") {
        setInvoices(res.data.data);
      }
    } catch (error) {
      toast.error("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { description: "", price: 0 }]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    if (items.length === 0) return 0;
    return items.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerEmail || !title) {
      toast.error("Please fill all required fields");
      return;
    }

    const totalAmount = items.length > 0 ? calculateTotal() : 0;

    setIsSubmitting(true);
    try {
      const res = await apiClient.post("/invoices", {
        customerName,
        customerEmail,
        customerPhone,
        title,
        description,
        dueDate,
        items,
        amount: totalAmount,
        currency: "INR",
      });
      
      if (res.data.status === "success") {
        toast.success("Receipt created and emailed successfully!");
        setIsDialogOpen(false);
        fetchInvoices();
        // Reset form
        setCustomerName("");
        setCustomerEmail("");
        setCustomerPhone("");
        setTitle("");
        setDescription("");
        setDueDate("");
        setItems([]);
      } else {
        toast.error(res.data.message || "Failed to create invoice");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number | string, currency = "INR") => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    }).format(Number(amount));
  };

  const exportCsv = () => {
    if (!invoices.length) {
      toast.error("No receipt records to export");
      return;
    }

    const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const headers = ["Sent at", "Source", "Live state", "Customer", "Email", "Phone", "Title", "Booking ID", "Payment ID", "Amount", "Currency", "Receipt status", "Line items", "Notes"];
    const rows = invoices.map((invoice) => [
      invoice.sentAt || invoice.createdAt,
      invoice.source === "BOOKING_RECEIPT" ? "Booking receipt" : "Custom receipt",
      invoice.sync?.state || "CUSTOM",
      invoice.customerName,
      invoice.customerEmail,
      invoice.customerPhone,
      invoice.title,
      invoice.bookingId,
      invoice.paymentId,
      invoice.amount,
      invoice.currency,
      invoice.status,
      invoice.items.map((item) => `${item.description}: ${item.price}`).join(" | "),
      invoice.description,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-records-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt records exported");
  };

  const bookingReceipts = invoices.filter((invoice) => invoice.source === "BOOKING_RECEIPT");
  const currentReceipts = bookingReceipts.filter((invoice) => invoice.sync?.state === "CURRENT");
  const needsReview = bookingReceipts.filter((invoice) => invoice.sync && invoice.sync.state !== "CURRENT");
  const refundedReceipts = bookingReceipts.filter((invoice) => ["REFUNDED", "PARTIALLY_REFUNDED", "REFUND_PENDING"].includes(invoice.sync?.state || ""));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Receipts</h2>
          <p className="text-sm text-gray-500">Booking receipts show their live booking, payment and refund position alongside the original record.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={!invoices.length}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={fetchInvoices} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Raise Receipt
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Raise Custom Receipt</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name *</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Email Address *</Label>
                  <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Phone (Optional)</Label>
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Payment Date (Optional)</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Receipt Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Flight Tickets & Consultation" required />
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Any notes for the customer..." />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Line Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                </div>
                {items.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4 border rounded-md border-dashed">No items added. The total will be 0.</p>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          className="flex-1"
                          required
                        />
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={item.price}
                          onChange={(e) => updateItem(index, "price", Number(e.target.value))}
                          className="w-32"
                          min="0"
                          step="0.01"
                          required
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          Remove
                        </Button>
                      </div>
                    ))}
                    <div className="flex justify-end pt-2 text-sm font-medium">
                      Total: {formatCurrency(calculateTotal())}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send Receipt
                </Button>
              </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!loading && invoices.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Receipt records</p><p className="mt-2 text-2xl font-bold text-gray-950">{invoices.length}</p><p className="mt-1 text-xs text-gray-500">Booking and custom receipts</p></section>
          <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Current</p><p className="mt-2 text-2xl font-bold text-emerald-800">{currentReceipts.length}</p><p className="mt-1 text-xs text-emerald-700">Live booking receipts in sync</p></section>
          <section className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Needs review</p><p className="mt-2 text-2xl font-bold text-amber-900">{needsReview.length}</p><p className="mt-1 text-xs text-amber-800">Missing, changed or mismatched records</p></section>
          <section className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-widest text-violet-700">Refund activity</p><p className="mt-2 text-2xl font-bold text-violet-900">{refundedReceipts.length}</p><p className="mt-1 text-xs text-violet-800">Receipts with an active or completed refund</p></section>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-500 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading receipts...
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No receipts found. Click "Raise Receipt" to create one.
          </div>
        ) : (
          <>
          <div className="space-y-3 p-3 md:hidden">
            {invoices.map((invoice) => {
              const booking = invoice.sync?.booking;
              return <button type="button" key={invoice.id} onClick={() => setSelectedInvoice(invoice)} className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-[#c8a96e] hover:bg-[#fbf7ed]/30">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><SyncBadge invoice={invoice} /><h3 className="mt-2 break-words text-sm font-bold text-gray-950">{invoice.title}</h3><p className="mt-1 text-xs text-gray-500">{booking?.bookingReference || invoice.customerEmail}</p></div><span className="shrink-0 text-sm font-bold text-gray-950">{formatCurrency(invoice.amount, invoice.currency)}</span></div>
                <div className="mt-3 border-t border-gray-100 pt-3"><p className="text-sm font-semibold text-gray-900">{booking?.journey.title || invoice.customerName}</p><p className="mt-1 text-xs text-gray-500">{booking ? `${formatDateRange(booking.journey.startDate, booking.journey.endDate)} · ${booking.paymentStatus.replaceAll("_", " ")}` : formatDate(invoice.sentAt || invoice.createdAt)}</p></div>
              </button>;
            })}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
                <tr>
                  <th className="px-5 py-4">Receipt</th>
                  <th className="px-5 py-4">Booking & journey</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4 text-right">Receipt amount</th>
                  <th className="px-5 py-4">Live state</th>
                  <th className="px-5 py-4">Issued</th>
                  <th className="px-5 py-4"><span className="sr-only">Open receipt</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="align-top hover:bg-gray-50/70">
                    <td className="max-w-[260px] px-5 py-4">
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">{inv.source === "BOOKING_RECEIPT" ? "Booking receipt" : "Custom receipt"}</div>
                      <div className="break-words font-semibold text-gray-950">{inv.title}</div>
                      <div className="mt-1 font-mono text-[11px] text-gray-500">{inv.paymentId || inv.bookingId || inv.id}</div>
                    </td>
                    <td className="max-w-[270px] px-5 py-4">
                      {inv.sync?.booking ? <><div className="font-mono text-xs font-semibold text-[#781216]">{inv.sync.booking.bookingReference}</div><div className="mt-1 break-words font-semibold text-gray-950">{inv.sync.booking.journey.title}</div><div className="mt-1 text-xs text-gray-500">{formatDateRange(inv.sync.booking.journey.startDate, inv.sync.booking.journey.endDate)} · {inv.sync.booking.journey.packageName || "Package not recorded"}</div></> : <span className="text-sm text-gray-400">No live booking data</span>}
                    </td>
                    <td className="max-w-[220px] px-5 py-4"><div className="break-words font-semibold text-gray-900">{inv.customerName}</div><div className="mt-1 break-all text-xs text-gray-500">{inv.customerEmail}</div></td>
                    <td className="px-5 py-4 text-right font-bold text-gray-950">{formatCurrency(inv.amount, inv.currency)}</td>
                    <td className="px-5 py-4"><SyncBadge invoice={inv} />{inv.sync?.payment ? <p className="mt-1 text-xs text-gray-500">Payment: {inv.sync.payment.status}</p> : null}</td>
                    <td className="px-5 py-4 text-gray-500">
                      {formatDate(inv.sentAt || inv.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-right"><Button variant="outline" size="sm" onClick={() => setSelectedInvoice(inv)}>Details</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
      {selectedInvoice && <ReceiptDetailsModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}
    </div>
  );
}
