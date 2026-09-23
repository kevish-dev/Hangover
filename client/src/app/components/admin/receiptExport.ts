import { format } from "date-fns";
import type { jsPDF } from "jspdf";
import type { UserOptions } from "jspdf-autotable";
import { formatDate, formatDateRange, receiptTaxBreakdown, syncDisplay, type Invoice } from "./receipts";

const BRAND = {
  name: "Hangover Trails",
  legalName: "Dawn Tours and Travels",
  supportEmail: "experience@hangovertrails.com",
  supportPhone: "+91 84159 29069",
  address: "Papu-1, Naharlagun, Arunachal Pradesh - 791110",
  gstin: "12BSPPT9347F1Z8",
};

type Rgb = [number, number, number];
const COLORS = {
  burgundy: [120, 18, 22] as Rgb,
  gold: [184, 148, 58] as Rgb,
  cream: [245, 240, 230] as Rgb,
  ink: [30, 26, 20] as Rgb,
  muted: [111, 104, 95] as Rgb,
  border: [232, 224, 211] as Rgb,
  white: [255, 255, 255] as Rgb,
};

const STATE_COLORS: Record<string, Rgb> = {
  CURRENT: [4, 120, 87],
  REFUNDED: [109, 40, 217],
  PARTIALLY_REFUNDED: [109, 40, 217],
  REFUND_PENDING: [180, 83, 9],
  UNLINKED: [180, 83, 9],
  BOOKING_CANCELLED: [71, 85, 105],
  CUSTOM: [75, 85, 99],
};
const stateColor = (state?: string) => STATE_COLORS[state || "CUSTOM"] || ([185, 28, 28] as Rgb);

const sourceLabel = (invoice: Invoice) => (invoice.source === "BOOKING_RECEIPT" ? "Booking receipt" : "Custom receipt");
const stateLabel = (invoice: Invoice) => (invoice.sync ? syncDisplay[invoice.sync.state].label : "Custom receipt");
const humanize = (value?: string | null) => (value ? value.replaceAll("_", " ") : "Not recorded");
const fileDate = () => format(new Date(), "yyyy-MM-dd");

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

export const exportReceiptsCsv = (invoices: Invoice[]) => {
  const escapeCsv = (value: unknown) => {
    let text = String(value ?? "");
    // Customer-supplied text (e.g. profile names) must not execute as a spreadsheet formula.
    // Plain numbers and phone numbers ("+91 98765 43210") are left untouched.
    if (/^[=+\-@\t\r]/.test(text) && Number.isNaN(Number(text)) && !/^\+[\d\s()-]+$/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const headers = [
    "Sent at", "Source", "Live state", "Customer", "Email", "Phone", "Title", "Booking ID", "Payment ID", "Amount", "Currency", "Receipt status", "Line items", "Notes",
    "Booking reference", "Journey", "Travel start", "Travel end", "Package", "Booking status", "Booking payment status",
    "Payment status", "Payment type", "Payment method", "Transaction ID", "Receipt number",
    "Subtotal (excl. GST)", "GST (5%)", "Refunded", "Refund pending", "Net received", "Review issues",
  ];
  const rows = invoices.map((invoice) => {
    const booking = invoice.sync?.booking;
    const payment = invoice.sync?.payment;
    const tax = receiptTaxBreakdown(invoice);
    return [
      invoice.sentAt || invoice.createdAt,
      sourceLabel(invoice),
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
      booking?.bookingReference,
      booking?.journey.title,
      booking?.journey.startDate,
      booking?.journey.endDate,
      booking?.journey.packageName,
      booking?.status,
      booking?.paymentStatus,
      payment?.status,
      payment?.type,
      payment?.paymentMethod,
      payment ? payment.razorpayPaymentId || payment.utr || payment.id : "",
      payment?.receiptNumber,
      tax.subtotal.toFixed(2),
      tax.gst.toFixed(2),
      payment ? payment.successfulRefunded.toFixed(2) : "",
      payment ? payment.pendingRefunded.toFixed(2) : "",
      payment ? payment.netAmount.toFixed(2) : "",
      invoice.sync?.issues.join(" | "),
    ];
  });
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  downloadBlob(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" }), `receipt-records-${fileDate()}.csv`);
};

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

export type ReceiptPdfMode =
  /** Summary register followed by one page per receipt. */
  | "full"
  /** Summary register table only. */
  | "register"
  /** One page per receipt, no register. */
  | "receipts";

/**
 * The built-in PDF fonts only cover Latin-1, so map common typographic
 * characters to ASCII and replace anything else rather than emitting garbage.
 */
const pdfText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFC")
    .replaceAll("\u20B9", "INR ")
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replaceAll("\u2026", "...")
    .replaceAll("\u2022", "\u00B7")
    .replace(/[^\n\x20-\x7E\xA0-\xFF]/g, "?");

const money = (amount: number | string, currency = "INR") =>
  `${currency} ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount) || 0)}`;

const DATE = "dd MMM yyyy";
const DATE_TIME = "dd MMM yyyy, h:mm a";
const PAGE = { width: 210, height: 297, margin: 14 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;

type AutoTable = (doc: jsPDF, options: UserOptions) => void;
const lastY = (doc: jsPDF) => ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? PAGE.margin);

const drawBrandHeader = (doc: jsPDF) => {
  doc.setFillColor(...COLORS.burgundy);
  doc.rect(0, 0, PAGE.width, 24, "F");
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 24, PAGE.width, 0.8, "F");

  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(BRAND.name.toUpperCase(), PAGE.margin, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`${BRAND.legalName} · GSTIN ${BRAND.gstin}`, PAGE.margin, 18);
  doc.text(BRAND.address, PAGE.width - PAGE.margin, 12, { align: "right" });
  doc.text(`${BRAND.supportEmail} · ${BRAND.supportPhone}`, PAGE.width - PAGE.margin, 18, { align: "right" });
};

const drawFooters = (doc: jsPDF, generatedAt: string) => {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.border);
    doc.line(PAGE.margin, PAGE.height - 12, PAGE.width - PAGE.margin, PAGE.height - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Generated ${generatedAt} from the ${BRAND.name} admin console`, PAGE.margin, PAGE.height - 7);
    doc.text(`Page ${page} of ${pages}`, PAGE.width - PAGE.margin, PAGE.height - 7, { align: "right" });
  }
};

const sectionHeading = (doc: jsPDF, label: string, x: number, y: number) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.burgundy);
  doc.text(label.toUpperCase(), x, y);
};

const tableBase = (doc: jsPDF): Partial<UserOptions> => ({
  styles: { font: "helvetica", fontSize: 8.5, textColor: COLORS.ink, cellPadding: { top: 1.8, bottom: 1.8, left: 2, right: 2 }, lineColor: COLORS.border, overflow: "linebreak" },
  headStyles: { fillColor: COLORS.burgundy, textColor: COLORS.white, fontStyle: "bold", fontSize: 8 },
  footStyles: { fillColor: COLORS.cream, textColor: COLORS.ink, fontStyle: "bold" },
  alternateRowStyles: { fillColor: [251, 249, 245] },
  margin: { left: PAGE.margin, right: PAGE.margin, top: 32, bottom: 18 },
  // Continuation pages of a long table still carry the brand header.
  didDrawPage: () => drawBrandHeader(doc),
});

/** Start a new branded page when a section would not fit below `y`. */
const ensureSpace = (doc: jsPDF, y: number, needed: number) => {
  if (y + needed <= PAGE.height - 18) return y;
  doc.addPage();
  drawBrandHeader(doc);
  return 36;
};

/** A label/value list rendered as a borderless two-column table. */
const detailsTable = (autoTable: AutoTable, doc: jsPDF, rows: Array<[string, string]>, startY: number, left: number, width: number) => {
  autoTable(doc, {
    ...tableBase(doc),
    startY,
    theme: "plain",
    body: rows.map(([label, value]) => [pdfText(label), pdfText(value)]),
    tableWidth: width,
    margin: { left, right: PAGE.width - left - width, top: 32, bottom: 18 },
    styles: { font: "helvetica", fontSize: 8.5, textColor: COLORS.ink, cellPadding: { top: 1.3, bottom: 1.3, left: 0, right: 2 }, overflow: "linebreak" },
    columnStyles: { 0: { textColor: COLORS.muted, cellWidth: Math.min(width * 0.38, 40) }, 1: { fontStyle: "bold" } },
  });
  return lastY(doc);
};

const drawRegister = (autoTable: AutoTable, doc: jsPDF, invoices: Invoice[], generatedAt: string) => {
  drawBrandHeader(doc);
  let y = 36;
  doc.setTextColor(...COLORS.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("Receipt register", PAGE.margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text(`${invoices.length} receipt record${invoices.length === 1 ? "" : "s"} · generated ${generatedAt}`, PAGE.margin, y + 6);

  // Summary tiles
  const totalsByCurrency = new Map<string, number>();
  const refundsByCurrency = new Map<string, number>();
  for (const invoice of invoices) {
    totalsByCurrency.set(invoice.currency, (totalsByCurrency.get(invoice.currency) || 0) + (Number(invoice.amount) || 0));
    const payment = invoice.sync?.payment;
    if (payment?.successfulRefunded) refundsByCurrency.set(payment.currency, (refundsByCurrency.get(payment.currency) || 0) + payment.successfulRefunded);
  }
  const sumLabel = (totals: Map<string, number>) => (totals.size ? [...totals].map(([currency, amount]) => money(amount, currency)).join(" + ") : money(0));
  const bookingReceipts = invoices.filter((invoice) => invoice.source === "BOOKING_RECEIPT");
  const tiles: Array<[string, string]> = [
    ["Total receipted", sumLabel(totalsByCurrency)],
    ["Booking / custom", `${bookingReceipts.length} / ${invoices.length - bookingReceipts.length}`],
    ["Needs review", String(bookingReceipts.filter((invoice) => invoice.sync && invoice.sync.state !== "CURRENT").length)],
    ["Refunded", sumLabel(refundsByCurrency)],
  ];
  y += 12;
  const gap = 3;
  const tileWidth = (CONTENT_WIDTH - gap * (tiles.length - 1)) / tiles.length;
  tiles.forEach(([label, value], index) => {
    const x = PAGE.margin + index * (tileWidth + gap);
    doc.setFillColor(...COLORS.cream);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(x, y, tileWidth, 17, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(label.toUpperCase(), x + 3, y + 5.5);
    doc.setFontSize(value.length > 18 ? 8.5 : 11);
    doc.setTextColor(...COLORS.ink);
    doc.text(pdfText(value), x + 3, y + 12.5, { maxWidth: tileWidth - 6 });
  });
  y += 24;

  autoTable(doc, {
    ...tableBase(doc),
    startY: y,
    theme: "striped",
    showFoot: "lastPage",
    head: [["#", "Issued", "Receipt", "Customer", "Booking ref", "Live state", "Amount"]],
    body: invoices.map((invoice, index) => [
      String(index + 1),
      formatDate(invoice.sentAt || invoice.createdAt, DATE),
      pdfText(invoice.title),
      pdfText(`${invoice.customerName}\n${invoice.customerEmail}`),
      pdfText(invoice.sync?.booking?.bookingReference || "-"),
      pdfText(stateLabel(invoice)),
      money(invoice.amount, invoice.currency),
    ]),
    foot: [[{ content: "Total", colSpan: 6, styles: { halign: "right" } }, pdfText(sumLabel(totalsByCurrency))]],
    styles: { ...tableBase(doc).styles, fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 7, textColor: COLORS.muted },
      1: { cellWidth: 21 },
      2: { cellWidth: "auto" },
      3: { cellWidth: 38 },
      4: { cellWidth: 26 },
      5: { cellWidth: 20, fontStyle: "bold" },
      6: { cellWidth: 31, halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 5) {
        data.cell.styles.textColor = stateColor(invoices[data.row.index]?.sync?.state);
      }
      if (data.section !== "body" && data.column.index === 6) data.cell.styles.halign = "right";
    },
  });
};

const drawReceiptPage = (autoTable: AutoTable, doc: jsPDF, invoice: Invoice) => {
  drawBrandHeader(doc);
  const sync = invoice.sync;
  const booking = sync?.booking;
  const payment = sync?.payment;
  const tax = receiptTaxBreakdown(invoice);

  let y = 35;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.gold);
  doc.text(sourceLabel(invoice).toUpperCase(), PAGE.margin, y);

  // Live state label on the right
  const state = stateLabel(invoice).toUpperCase();
  doc.setFontSize(7.5);
  const pillWidth = doc.getTextWidth(state) + 6;
  const pillX = PAGE.width - PAGE.margin - pillWidth;
  doc.setDrawColor(...stateColor(sync?.state));
  doc.roundedRect(pillX, y - 4, pillWidth, 6, 3, 3, "S");
  doc.setTextColor(...stateColor(sync?.state));
  doc.text(state, pillX + 3, y);

  y += 7;
  doc.setFontSize(15);
  doc.setTextColor(...COLORS.ink);
  const titleLines = doc.splitTextToSize(pdfText(invoice.title), CONTENT_WIDTH - pillWidth - 4) as string[];
  doc.text(titleLines, PAGE.margin, y);
  y += titleLines.length * 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Issued ${formatDate(invoice.sentAt || invoice.createdAt, DATE_TIME)}`, PAGE.margin, y);
  y += 9;

  const columnGap = 8;
  const columnWidth = (CONTENT_WIDTH - columnGap) / 2;
  const rightX = PAGE.margin + columnWidth + columnGap;

  // Billed to / receipt record
  sectionHeading(doc, "Billed to", PAGE.margin, y);
  sectionHeading(doc, "Receipt record", rightX, y);
  const leftEnd = detailsTable(autoTable, doc, [
    ["Name", invoice.customerName],
    ["Email", invoice.customerEmail],
    ["Phone", invoice.customerPhone || booking?.customer.phone || "Not recorded"],
  ], y + 2, PAGE.margin, columnWidth);
  const rightEnd = detailsTable(autoTable, doc, [
    ["Reference", invoice.paymentId || invoice.bookingId || invoice.id],
    ["Receipt number", payment?.receiptNumber ? `#${payment.receiptNumber}` : "Not recorded"],
    ["Receipt status", invoice.status],
    ["Payment date", formatDate(invoice.dueDate, DATE)],
  ], y + 2, rightX, columnWidth);
  y = Math.max(leftEnd, rightEnd) + 7;

  if (booking || payment) {
    if (booking) sectionHeading(doc, "Booking & journey", PAGE.margin, y);
    if (payment) sectionHeading(doc, "Linked payment", booking ? rightX : PAGE.margin, y);
    const bookingEnd = booking ? detailsTable(autoTable, doc, [
      ["Booking reference", booking.bookingReference],
      ["Journey", booking.journey.title],
      ["Location", booking.journey.location || "Not recorded"],
      ["Travel dates", formatDateRange(booking.journey.startDate, booking.journey.endDate, DATE)],
      ["Package", booking.journey.packageName || "Not recorded"],
      ["Travelers", String(booking.numberOfTravelers)],
      ["Booking status", humanize(booking.status)],
      ["Payment status", humanize(booking.paymentStatus)],
    ], y + 2, PAGE.margin, columnWidth) : y;
    const paymentEnd = payment ? detailsTable(autoTable, doc, [
      ["Transaction ID", payment.razorpayPaymentId || payment.utr || payment.id],
      ["Payment type", humanize(payment.type)],
      ["Method", payment.paymentMethod?.toUpperCase() || "Not recorded"],
      ["Status", humanize(payment.status)],
      ["Paid at", formatDate(payment.paidAt || payment.createdAt, DATE_TIME)],
      ["Refunded", money(payment.successfulRefunded, payment.currency)],
      ["Refund pending", money(payment.pendingRefunded, payment.currency)],
      ["Net received", money(payment.netAmount, payment.currency)],
    ], y + 2, booking ? rightX : PAGE.margin, columnWidth) : y;
    y = Math.max(bookingEnd, paymentEnd) + 7;

    if (booking) {
      y = ensureSpace(doc, y, 22);
      sectionHeading(doc, "Booking position", PAGE.margin, y);
      y = detailsTable(autoTable, doc, [
        ["Booking total (incl. GST)", money(booking.totalAmount)],
        ["Paid to date", money(booking.amountPaid)],
        ["Balance due", `${money(booking.amountDue)}${Number(booking.amountDue) > 0 && booking.balanceDueDate ? ` by ${formatDate(booking.balanceDueDate, DATE)}` : ""}`],
      ], y + 2, PAGE.margin, columnWidth) + 7;
    }
  }

  // Line items with GST summary
  const itemLabel = tax.itemsIncludeGst ? "Amount (incl. GST)" : "Amount";
  y = ensureSpace(doc, y, 40);
  autoTable(doc, {
    ...tableBase(doc),
    startY: y,
    theme: "striped",
    head: [["Description", { content: itemLabel, styles: { halign: "right" } }]],
    body: invoice.items.length
      ? invoice.items.map((item) => [pdfText(item.description || "Receipt item"), money(item.price, invoice.currency)])
      : [[{ content: "No line items were recorded.", colSpan: 2, styles: { textColor: COLORS.muted } }]],
    foot: [
      ["Subtotal (excl. GST)", money(tax.subtotal, invoice.currency)],
      ["GST (5%)", money(tax.gst, invoice.currency)],
      ["Total (incl. GST)", money(tax.total, invoice.currency)],
    ],
    showFoot: "lastPage",
    columnStyles: { 1: { halign: "right", cellWidth: 45 } },
    didParseCell: (data) => {
      if (data.section === "foot") {
        data.cell.styles.halign = "right";
        const isTotal = data.row.index === 2;
        data.cell.styles.fontStyle = isTotal ? "bold" : "normal";
        data.cell.styles.fillColor = isTotal ? COLORS.burgundy : COLORS.cream;
        data.cell.styles.textColor = isTotal ? COLORS.white : COLORS.ink;
      }
    },
  });
  y = lastY(doc) + 7;

  if (payment?.refunds.length) {
    y = ensureSpace(doc, y, 22);
    sectionHeading(doc, "Refund activity", PAGE.margin, y);
    autoTable(doc, {
      ...tableBase(doc),
      startY: y + 2,
      theme: "grid",
      head: [["Date", "Reason", "Status", "Refund ID", { content: "Amount", styles: { halign: "right" } }]],
      body: payment.refunds.map((refund) => [
        formatDate(refund.processedAt || refund.createdAt, DATE),
        pdfText(refund.reason || "Refund"),
        humanize(refund.status),
        pdfText(refund.razorpayRefundId || "-"),
        money(refund.amount, payment.currency),
      ]),
      columnStyles: { 3: { font: "courier", fontSize: 7.5 }, 4: { halign: "right", cellWidth: 32 } },
    });
    y = lastY(doc) + 7;
  }

  const notes: Array<[string, string]> = [];
  if (sync && sync.state !== "CURRENT") notes.push(["Review", `${syncDisplay[sync.state].description}${sync.issues.length ? ` ${sync.issues.join(" ")}` : ""}`]);
  if (invoice.description) notes.push(["Notes", invoice.description]);
  if (notes.length) {
    y = ensureSpace(doc, y, 18);
    sectionHeading(doc, "Notes", PAGE.margin, y);
    detailsTable(autoTable, doc, notes, y + 2, PAGE.margin, CONTENT_WIDTH);
  }
};

const pdfFilename = (invoices: Invoice[], mode: ReceiptPdfMode) => {
  if (mode === "receipts" && invoices.length === 1) {
    const [invoice] = invoices;
    const reference = invoice.sync?.booking?.bookingReference || invoice.paymentId || invoice.id;
    return `receipt-${reference.replace(/[^A-Za-z0-9_-]+/g, "-")}.pdf`;
  }
  return mode === "register" ? `receipt-register-${fileDate()}.pdf` : `receipts-${fileDate()}.pdf`;
};

export const exportReceiptsPdf = async (invoices: Invoice[], mode: ReceiptPdfMode = "full") => {
  // Loaded on demand so the PDF libraries stay out of the main admin bundle.
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const generatedAt = format(new Date(), DATE_TIME);
  doc.setProperties({
    title: mode === "register" ? "Receipt register" : invoices.length === 1 ? pdfText(invoices[0].title) : "Receipts",
    author: BRAND.name,
    creator: `${BRAND.name} admin`,
  });

  let firstPage = true;
  if (mode !== "receipts") {
    drawRegister(autoTable, doc, invoices, generatedAt);
    firstPage = false;
  }
  if (mode !== "register") {
    for (const invoice of invoices) {
      if (!firstPage) doc.addPage();
      firstPage = false;
      drawReceiptPage(autoTable, doc, invoice);
    }
  }

  drawFooters(doc, generatedAt);
  doc.save(pdfFilename(invoices, mode));
};
