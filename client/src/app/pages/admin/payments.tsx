import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isValid } from "date-fns";
import {
  AlertTriangle,
  Copy,
  CreditCard,
  IndianRupee,
  Loader2,
  MapPin,
  ReceiptText,
  RefreshCw,
  Search,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ApiPayment, paymentApi } from "../../../lib/paymentApi";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrency = (value: string | number | null | undefined) =>
  currencyFormatter.format(Number(value || 0));

const formatDate = (value: string | null | undefined, pattern = "MMM d, yyyy · h:mm a") => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return isValid(date) ? format(date, pattern) : "Invalid date";
};

const formatCalendarDate = (value: string | null | undefined) => {
  if (!value) return "Date not provided";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return formatDate(value, "MMM d, yyyy");

  const [, year, month, day] = match;
  return format(new Date(Number(year), Number(month) - 1, Number(day)), "MMM d, yyyy");
};

const getItemDetails = (payment: ApiPayment) => {
  const festival = payment.booking.festival || payment.booking.slot?.festival;
  const trip = payment.booking.trip || payment.booking.slot?.trip;
  const item = festival || trip;

  return {
    kind: festival ? "Festival" : trip ? "Trip" : "Booking",
    title: item?.title || "Booking item unavailable",
    location: item?.location || "Location not provided",
  };
};

const getCustomerName = (payment: ApiPayment) => {
  const fullName = payment.booking.user.profile?.fullName?.trim();
  if (fullName) return fullName;

  const emailName = payment.booking.user.email.split("@")[0];
  return emailName
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Name not provided";
};

const statusStyles: Record<string, string> = {
  SUCCESS: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
  CANCELLED: "border-slate-200 bg-slate-100 text-slate-600",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  CREATED: "border-blue-200 bg-blue-50 text-blue-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] ${statusStyles[status] || statusStyles.CREATED}`}>
      {status}
    </span>
  );
}

function BookingKindBadge({ kind }: { kind: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
      kind === "Festival" ? "bg-[#fff3d6] text-[#8a6414]" : "bg-[#f3e8e9] text-[#781216]"
    }`}>
      {kind}
    </span>
  );
}

function CopyValue({ value, label }: { value: string | null; label: string }) {
  if (!value) return <span className="text-gray-400">Not recorded</span>;

  return (
    <span className="flex min-w-0 items-center gap-2">
      <code className="min-w-0 break-all text-xs text-gray-700">{value}</code>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            toast.success(`${label} copied`);
          } catch {
            toast.error(`Could not copy ${label.toLowerCase()}`);
          }
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-white hover:text-[#781216]"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(92px,0.75fr)_minmax(0,1.5fr)] gap-3 py-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <div className="min-w-0 text-right font-medium text-gray-900 sm:text-left">{children}</div>
    </div>
  );
}

function PaymentDetailsModal({ payment, onClose }: { payment: ApiPayment; onClose: () => void }) {
  const item = getItemDetails(payment);
  const customerName = getCustomerName(payment);
  const successfulRefundTotal = payment.refunds
    .filter((refund) => ["PENDING", "SUCCESS"].includes(refund.status))
    .reduce((total, refund) => total + Number(refund.amount), 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Payment details for ${payment.booking.bookingReference}`}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[96dvh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:max-h-[90vh] md:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white/95 px-4 py-4 backdrop-blur md:px-6">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <BookingKindBadge kind={item.kind} />
              <StatusBadge status={payment.status} />
            </div>
            <h2 className="break-words text-lg font-bold text-gray-950 md:text-xl">{item.title}</h2>
            <p className="mt-1 font-mono text-xs text-[#781216]">{payment.booking.bookingReference}</p>
          </div>
          <button
            type="button"
            aria-label="Close payment details"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
          <section className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-800">
              <UserRound className="h-4 w-4 text-[#781216]" /> Customer & booking
            </h3>
            <DetailRow label="Customer">{customerName}</DetailRow>
            <DetailRow label="Email"><span className="break-all">{payment.booking.user.email}</span></DetailRow>
            <DetailRow label="Phone">{payment.booking.user.profile?.phone || "Not provided"}</DetailRow>
            <DetailRow label="Travelers">{payment.booking.numberOfTravelers}</DetailRow>
            <DetailRow label="Booking status">{payment.booking.status.replaceAll("_", " ")}</DetailRow>
            <DetailRow label="Payment status">{payment.booking.paymentStatus.replaceAll("_", " ")}</DetailRow>
          </section>

          <section className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-800">
              <MapPin className="h-4 w-4 text-[#781216]" /> Journey details
            </h3>
            <DetailRow label="Type">{item.kind}</DetailRow>
            <DetailRow label="Item">{item.title}</DetailRow>
            <DetailRow label="Location">{item.location}</DetailRow>
            <DetailRow label="Package">{payment.booking.package?.title || "Standard option"}</DetailRow>
            <DetailRow label="Slot">
              {payment.booking.slot?.title || formatCalendarDate(payment.booking.slot?.startDate)}
            </DetailRow>
            <DetailRow label="Travel dates">
              {payment.booking.slot?.startDate
                ? `${formatCalendarDate(payment.booking.slot.startDate)} – ${formatCalendarDate(payment.booking.slot.endDate)}`
                : "Dates not provided"}
            </DetailRow>
          </section>

          <section className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-800">
              <WalletCards className="h-4 w-4 text-[#781216]" /> Payment breakdown
            </h3>
            <DetailRow label="This payment"><span className="text-base font-bold">{formatCurrency(payment.amount)}</span></DetailRow>
            <DetailRow label="Payment type">{payment.type}</DetailRow>
            <DetailRow label="Method">{payment.paymentMethod?.toUpperCase() || "Not recorded"}</DetailRow>
            <DetailRow label="Booking total">{formatCurrency(payment.booking.totalAmount)}</DetailRow>
            <DetailRow label="Total paid"><span className="text-emerald-700">{formatCurrency(payment.booking.amountPaid)}</span></DetailRow>
            <DetailRow label="Balance due"><span className={Number(payment.booking.amountDue) > 0 ? "text-red-600" : "text-gray-900"}>{formatCurrency(payment.booking.amountDue)}</span></DetailRow>
            <DetailRow label="Refunded">{formatCurrency(successfulRefundTotal)}</DetailRow>
          </section>

          <section className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-800">
              <ReceiptText className="h-4 w-4 text-[#781216]" /> Transaction record
            </h3>
            <DetailRow label="Transaction"><CopyValue value={payment.id} label="Transaction ID" /></DetailRow>
            <DetailRow label="Order ID"><CopyValue value={payment.razorpayOrderId} label="Order ID" /></DetailRow>
            <DetailRow label="Payment ID"><CopyValue value={payment.razorpayPaymentId} label="Payment ID" /></DetailRow>
            <DetailRow label="Receipt"><CopyValue value={payment.receiptNumber} label="Receipt number" /></DetailRow>
            <DetailRow label="Paid at">{formatDate(payment.paidAt || payment.createdAt)}</DetailRow>
          </section>

          {(payment.failureReason || payment.refunds.length > 0) && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 md:col-span-2">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-900">
                <AlertTriangle className="h-4 w-4" /> Exceptions & refunds
              </h3>
              {payment.failureReason && (
                <p className="mb-3 text-sm text-red-700">
                  {payment.failureCode ? `${payment.failureCode}: ` : ""}{payment.failureReason}
                </p>
              )}
              {payment.refunds.map((refund) => (
                <div key={refund.id} className="flex flex-col gap-1 border-t border-amber-200 py-3 text-sm first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="font-semibold text-gray-900">{formatCurrency(refund.amount)}</span>
                    <span className="ml-2 text-gray-600">{refund.reason || "Refund"}</span>
                  </div>
                  <span className="text-xs font-semibold text-amber-800">{refund.status} · {formatDate(refund.processedAt || refund.createdAt, "MMM d, yyyy")}</span>
                </div>
              ))}
            </section>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-gray-100 bg-white px-4 py-3 text-right md:px-6">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 w-full rounded-lg bg-[#781216] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#5f0e11] md:w-auto"
          >
            Close details
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [selectedPayment, setSelectedPayment] = useState<ApiPayment | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("date_desc");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: () => paymentApi.getAllPayments({ limit: 1000 }),
  });

  const allPayments = data?.data || [];

  const payments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = allPayments.filter((payment) => {
      if (statusFilter !== "ALL" && payment.status !== statusFilter) return false;
      if (!query) return true;

      const item = getItemDetails(payment);
      const searchable = [
        payment.id,
        payment.razorpayOrderId,
        payment.razorpayPaymentId,
        payment.receiptNumber,
        payment.booking.bookingReference,
        payment.booking.user.email,
        getCustomerName(payment),
        item.kind,
        item.title,
        item.location,
        payment.booking.package?.title,
      ].filter(Boolean).join(" ").toLowerCase();

      return searchable.includes(query);
    });

    return filtered.sort((a, b) => {
      if (sortBy === "amount_desc") return Number(b.amount) - Number(a.amount);
      if (sortBy === "amount_asc") return Number(a.amount) - Number(b.amount);
      const aDate = new Date(a.paidAt || a.createdAt).getTime();
      const bDate = new Date(b.paidAt || b.createdAt).getTime();
      return sortBy === "date_asc" ? aDate - bDate : bDate - aDate;
    });
  }, [allPayments, searchQuery, sortBy, statusFilter]);

  const stats = useMemo(() => {
    const successful = allPayments.filter((payment) => payment.status === "SUCCESS");
    const attention = allPayments.filter((payment) => ["FAILED", "PENDING", "CREATED"].includes(payment.status));
    const refunded = allPayments.reduce(
      (total, payment) => total + payment.refunds
        .filter((refund) => ["PENDING", "SUCCESS"].includes(refund.status))
        .reduce((sum, refund) => sum + Number(refund.amount), 0),
      0,
    );

    return {
      received: successful.reduce((total, payment) => total + Number(payment.amount), 0),
      successful: successful.length,
      attention: attention.length,
      refunded,
    };
  }, [allPayments]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#c8a96e]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
        <h1 className="mt-3 text-lg font-bold text-gray-900">Payments could not be loaded</h1>
        <p className="mt-1 text-sm text-gray-500">Please check the server connection and try again.</p>
        <button type="button" onClick={() => refetch()} className="mt-5 rounded-lg bg-[#781216] px-4 py-2 text-sm font-semibold text-white">
          Try again
        </button>
      </div>
    );
  }

  const statCards = [
    { label: "Successful volume", value: formatCurrency(stats.received), sublabel: `${stats.successful} successful payment${stats.successful === 1 ? "" : "s"}`, icon: IndianRupee, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Transactions", value: allPayments.length.toLocaleString("en-IN"), sublabel: "Across trips and festivals", icon: CreditCard, tone: "bg-[#f7f1e5] text-[#8a6414]" },
    { label: "Needs attention", value: stats.attention.toLocaleString("en-IN"), sublabel: "Created, pending or failed", icon: AlertTriangle, tone: "bg-amber-50 text-amber-700" },
    { label: "Refunded", value: formatCurrency(stats.refunded), sublabel: "Pending and completed refunds", icon: RefreshCw, tone: "bg-purple-50 text-purple-700" },
  ];

  return (
    <div className="mx-auto max-w-[1500px] pb-12">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#a27d2e]">
            <WalletCards className="h-4 w-4" /> Finance overview
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 md:text-3xl">Payments Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Clear payment records for every trip and festival booking.</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#c8a96e] hover:text-[#781216] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh data
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <section key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-500">{card.label}</p>
                  <p className="mt-2 text-xl font-bold text-gray-950">{card.value}</p>
                  <p className="mt-1 text-xs text-gray-500">{card.sublabel}</p>
                </div>
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.tone}`}><Icon className="h-5 w-5" /></span>
              </div>
            </section>
          );
        })}
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search customer, booking, item, receipt or transaction ID..."
              className="min-h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#c8a96e] focus:bg-white focus:ring-2 focus:ring-[#c8a96e]/20 md:text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#c8a96e] focus:ring-2 focus:ring-[#c8a96e]/20"
            >
              <option value="ALL">All statuses</option>
              <option value="SUCCESS">Successful</option>
              <option value="PENDING">Pending</option>
              <option value="CREATED">Created</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="min-h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#c8a96e] focus:ring-2 focus:ring-[#c8a96e]/20"
            >
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="amount_desc">Amount: high to low</option>
              <option value="amount_asc">Amount: low to high</option>
            </select>
          </div>
        </div>
        <p className="mt-3 px-1 text-xs text-gray-500">Showing {payments.length} of {allPayments.length} transactions</p>
      </div>

      <div className="space-y-3 md:hidden">
        {payments.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">No payments match your filters.</div>
        ) : payments.map((payment) => {
          const item = getItemDetails(payment);
          return (
            <article key={payment.id} onClick={() => setSelectedPayment(payment)} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm active:bg-gray-50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2"><BookingKindBadge kind={item.kind} /><span className="font-mono text-[11px] text-[#781216]">{payment.booking.bookingReference}</span></div>
                  <h2 className="break-words text-sm font-bold text-gray-950">{item.title}</h2>
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-500"><MapPin className="h-3 w-3" /> {item.location}</p>
                </div>
                <StatusBadge status={payment.status} />
              </div>
              <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg bg-gray-50 p-3">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-900">{getCustomerName(payment)}</p><p className="truncate text-xs text-gray-500">{payment.booking.user.email}</p></div>
                <p className="text-base font-bold text-gray-950">{formatCurrency(payment.amount)}</p>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500"><span>{payment.type} · {payment.paymentMethod?.toUpperCase() || "Method unavailable"}</span><span>{formatDate(payment.paidAt || payment.createdAt, "MMM d, yyyy")}</span></div>
              <p className="mt-3 text-right text-xs font-semibold text-[#781216]">Tap for full transaction details</p>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
              <tr>
                <th className="px-5 py-4">Transaction</th>
                <th className="px-5 py-4">Booking & item</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Payment</th>
                <th className="px-5 py-4 text-right">Amount</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-14 text-center text-gray-500">No payments match your filters.</td></tr>
              ) : payments.map((payment) => {
                const item = getItemDetails(payment);
                return (
                  <tr key={payment.id} onClick={() => setSelectedPayment(payment)} className="cursor-pointer align-top transition hover:bg-[#fcfaf5]">
                    <td className="px-5 py-4">
                      <p className="font-mono text-xs font-semibold text-gray-800" title={payment.id}>{payment.id.slice(0, 8)}…</p>
                      <p className="mt-1 text-[11px] text-gray-400">{payment.receiptNumber || "Receipt pending"}</p>
                    </td>
                    <td className="max-w-[290px] px-5 py-4">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2"><BookingKindBadge kind={item.kind} /><span className="font-mono text-[11px] font-semibold text-[#781216]">{payment.booking.bookingReference}</span></div>
                      <p className="break-words font-semibold text-gray-950">{item.title}</p>
                      <p className="mt-1 truncate text-xs text-gray-500">{payment.booking.package?.title || "Standard option"} · {payment.booking.slot?.title || formatCalendarDate(payment.booking.slot?.startDate)}</p>
                    </td>
                    <td className="max-w-[230px] px-5 py-4">
                      <p className="break-words font-semibold text-gray-900">{getCustomerName(payment)}</p>
                      <p className="mt-1 break-all text-xs text-gray-500">{payment.booking.user.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-800">{payment.type}</p>
                      <p className="mt-1 text-xs text-gray-500">{payment.paymentMethod?.toUpperCase() || "Method unavailable"}</p>
                    </td>
                    <td className="px-5 py-4 text-right"><p className="whitespace-nowrap text-base font-bold text-gray-950">{formatCurrency(payment.amount)}</p><p className="mt-1 text-xs text-gray-500">of {formatCurrency(payment.booking.totalAmount)}</p></td>
                    <td className="px-5 py-4"><StatusBadge status={payment.status} /></td>
                    <td className="whitespace-nowrap px-5 py-4"><p className="text-sm font-medium text-gray-800">{formatDate(payment.paidAt || payment.createdAt, "MMM d, yyyy")}</p><p className="mt-1 text-xs text-gray-500">{formatDate(payment.paidAt || payment.createdAt, "h:mm a")}</p></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPayment && <PaymentDetailsModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />}
    </div>
  );
}
