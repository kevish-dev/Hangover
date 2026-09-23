import { format } from "date-fns";

export type InvoiceItem = { description: string; price: number };

export type ReceiptSync = {
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

export type Invoice = {
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

export const syncDisplay: Record<ReceiptSync["state"], { label: string; className: string; description: string }> = {
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

export const formatDate = (value?: string | null, pattern = "MMM d, yyyy") => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : format(date, pattern);
};

export const formatDateRange = (start?: string | null, end?: string | null, pattern?: string) => {
  if (!start && !end) return "Dates not recorded";
  if (!start) return formatDate(end, pattern);
  if (!end) return formatDate(start, pattern);
  return `${formatDate(start, pattern)} – ${formatDate(end, pattern)}`;
};

export const GST_RATE = 0.05;

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Receipt amounts are always stored GST-inclusive. Custom receipt line items
 * are entered before tax, while booking receipt line items already include it.
 */
export const receiptTaxBreakdown = (invoice: Invoice) => {
  const total = roundCurrency(Number(invoice.amount || 0));
  const itemsIncludeGst = invoice.source === "BOOKING_RECEIPT";
  const subtotal = itemsIncludeGst || !invoice.items.length
    ? roundCurrency(total / (1 + GST_RATE))
    : roundCurrency(invoice.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0));
  return { subtotal, gst: roundCurrency(total - subtotal), total, itemsIncludeGst };
};
