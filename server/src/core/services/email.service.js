import transport from "../smtp/client.js";
import env from "../env/env.js";
import { prisma } from "../../prisma/client.js";

const FROM = env.SMTP_FROM;
const APP_URL = env.ORIGIN.replace(/\/+$/, "");
const APP_ORIGIN = new URL(APP_URL).origin;

const BRAND = Object.freeze({
  name: "Hangover Trails",
  legalName: "Dawn Tours and Travels",
  supportEmail: "experience@hangovertrails.com",
  supportPhone: "+91 84159 29069",
  supportPhoneHref: "+918415929069",
  address: "Papu-1, Naharlagun, Arunachal Pradesh - 791110",
  gstin: "12BSPPT9347F1Z8",
  burgundy: "#781216",
  burgundyDark: "#540b0e",
  gold: "#b8943a",
  cream: "#f5f0e6",
  ink: "#1e1a14",
  muted: "#6f685f",
  border: "#e8e0d3",
  white: "#ffffff",
});

const isPresent = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const displayValue = (value) => {
  if (!isPresent(value)) return null;
  if (Array.isArray(value)) {
    const entries = value.map(displayValue).filter(Boolean);
    return entries.length ? entries.join(", ") : null;
  }
  return String(value).trim();
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const sanitizeHeader = (value, fallback = "") =>
  String(value ?? fallback)
    .replace(/[\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 240);

const appLink = (path = "/") => new URL(path, `${APP_URL}/`).toString();

const safeAppUrl = (value, fallbackPath = "/") => {
  const fallback = appLink(fallbackPath);
  try {
    const parsed = new URL(value || fallback, `${APP_URL}/`);
    if (!["http:", "https:"].includes(parsed.protocol)) return fallback;
    if (parsed.origin !== APP_ORIGIN) return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
};

const recordDeliveredBookingReceipt = async ({ options, travelerName, journeyTitle, transactionAmount, cumulativePaid, paidAt, type }) => {
  const amount = Number(transactionAmount ?? cumulativePaid ?? options.totalAmount ?? 0);
  const paymentRecordId = options.invoicePaymentId || options.paymentRecordId || null;
  const record = {
    customerName: travelerName,
    customerEmail: options.to,
    customerPhone: options.phone || null,
    title: `${type.label} receipt · ${journeyTitle}`,
    description: options.bookingRef ? `Booking reference: ${options.bookingRef}` : null,
    items: [{ description: `${type.label} payment for ${journeyTitle}`, price: amount }],
    amount,
    currency: options.currency || "INR",
    dueDate: paidAt ? new Date(paidAt) : new Date(),
    status: "PAID",
    source: "BOOKING_RECEIPT",
    bookingId: options.bookingId || null,
    paymentId: paymentRecordId,
    sentAt: new Date(),
  };
  if (paymentRecordId) {
    await prisma.customInvoice.upsert({
      where: { paymentId: paymentRecordId },
      create: record,
      update: record,
    });
    return;
  }
  await prisma.customInvoice.create({ data: record });
};

const toNumber = (value) => {
  if (!isPresent(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const firstNumber = (...values) => {
  for (const value of values) {
    const number = toNumber(value);
    if (number !== null) return number;
  }
  return null;
};

const formatCurrency = (value, currency = "INR") => {
  const number = toNumber(value);
  if (number === null) return null;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  } catch {
    return `₹${number.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
};

const validDate = (value) => {
  if (!isPresent(value)) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = validDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const formatDateTime = (value) => {
  const date = validDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
    timeZoneName: "short",
  }).format(date);
};

const formatDateRange = (startDate, endDate) => {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  if (start && end) return `${start} – ${end}`;
  return start || end || null;
};

const sectionHeading = (title) => `
  <tr>
    <td style="padding:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${BRAND.burgundy};">
      ${escapeHtml(title)}
    </td>
  </tr>`;

const renderDetails = (title, rows) => {
  const visibleRows = rows
    .map((row) => ({ ...row, value: displayValue(row.value) }))
    .filter((row) => row.value);
  if (!visibleRows.length) return "";

  const renderedRows = visibleRows
    .map(
      ({ label, value, emphasis = false }, index) => `
        <tr>
          <td class="detail-label" width="42%" valign="top" style="width:42%;padding:${index === 0 ? "14px" : "11px"} 12px 11px 0;border-bottom:1px solid ${BRAND.border};font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${BRAND.muted};">
            ${escapeHtml(label)}
          </td>
          <td class="detail-value" width="58%" valign="top" align="right" style="width:58%;padding:${index === 0 ? "14px" : "11px"} 0 11px 12px;border-bottom:1px solid ${BRAND.border};font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;font-weight:${emphasis ? "700" : "600"};color:${emphasis ? BRAND.burgundy : BRAND.ink};word-break:break-word;">
            ${escapeHtml(value)}
          </td>
        </tr>`,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:0 0 28px 0;">
      ${sectionHeading(title)}
      <tr>
        <td colspan="2" style="padding:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border-top:1px solid ${BRAND.border};">
            ${renderedRows}
          </table>
        </td>
      </tr>
    </table>`;
};

const renderAmounts = (title, rows) => {
  const visibleRows = rows.filter((row) => displayValue(row.value));
  if (!visibleRows.length) return "";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:0 0 28px 0;">
      ${sectionHeading(title)}
      <tr>
        <td style="padding:0;border:1px solid ${BRAND.border};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
            ${visibleRows
              .map(
                ({ label, value, strong = false, accent = false }, index) => `
                  <tr bgcolor="${strong ? BRAND.cream : BRAND.white}">
                    <td valign="top" style="padding:${strong ? "14px 16px" : "11px 16px"};${index ? `border-top:1px solid ${BRAND.border};` : ""}font-family:Arial,Helvetica,sans-serif;font-size:${strong ? "14px" : "13px"};line-height:20px;font-weight:${strong ? "700" : "400"};color:${accent ? BRAND.burgundy : BRAND.muted};">
                      ${escapeHtml(label)}
                    </td>
                    <td valign="top" align="right" style="padding:${strong ? "14px 16px" : "11px 16px"};${index ? `border-top:1px solid ${BRAND.border};` : ""}font-family:Arial,Helvetica,sans-serif;font-size:${strong ? "15px" : "13px"};line-height:20px;font-weight:700;color:${accent ? BRAND.burgundy : BRAND.ink};white-space:nowrap;">
                      ${escapeHtml(value)}
                    </td>
                  </tr>`,
              )
              .join("")}
          </table>
        </td>
      </tr>
    </table>`;
};

const renderNotice = (text, tone = "neutral") => {
  if (!displayValue(text)) return "";
  const isAlert = tone === "alert";
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${isAlert ? "#fff4f2" : BRAND.cream}" style="width:100%;border-collapse:collapse;margin:0 0 28px 0;border-left:3px solid ${isAlert ? BRAND.burgundy : BRAND.gold};">
      <tr>
        <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;color:${BRAND.ink};">
          ${escapeHtml(text)}
        </td>
      </tr>
    </table>`;
};

const renderButton = ({ label, url }) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left" style="border-collapse:separate;margin:0 0 14px 0;">
    <tr>
      <td align="center" bgcolor="${BRAND.burgundy}" style="border-radius:5px;mso-padding-alt:14px 26px;">
        <a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:14px 26px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:16px;font-weight:700;letter-spacing:0.7px;text-transform:uppercase;text-decoration:none;color:${BRAND.white};border:1px solid ${BRAND.burgundy};border-radius:5px;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;

const renderEmail = ({ preheader, eyebrow, title, intro, badge, bodyHtml, cta, footerNote }) => {
  const ctaHtml = cta
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:2px 0 26px 0;">
        <tr><td>${renderButton(cta)}</td></tr>
        <tr>
          <td style="padding:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#8a8278;word-break:break-all;">
            If the button does not open, copy this link into your browser:<br />
            <a href="${escapeHtml(cta.url)}" style="color:${BRAND.burgundy};text-decoration:underline;">${escapeHtml(cta.url)}</a>
          </td>
        </tr>
      </table>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <title>${escapeHtml(title)}</title>
  <!--[if mso]><style>table,td,a,p,h1{font-family:Arial,Helvetica,sans-serif !important;}</style><![endif]-->
  <style>
    @media only screen and (max-width:640px) {
      .email-shell { width:100% !important; }
      .mobile-pad { padding-left:22px !important; padding-right:22px !important; }
      .detail-label,.detail-value { display:block !important; width:100% !important; box-sizing:border-box !important; text-align:left !important; }
      .detail-label { padding-bottom:2px !important; border-bottom:0 !important; }
      .detail-value { padding-top:0 !important; padding-left:0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(preheader)}&#847; &zwnj; &nbsp; &#847; &zwnj; &nbsp;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.cream}" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <!--[if mso]><table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table class="email-shell" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.white}" style="width:100%;max-width:640px;border-collapse:collapse;border:1px solid ${BRAND.border};">
          <tr>
            <td class="mobile-pad" bgcolor="${BRAND.ink}" style="padding:24px 34px;border-bottom:3px solid ${BRAND.gold};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:19px;line-height:24px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${BRAND.white};">Hangover <span style="color:${BRAND.gold};">Trails</span></td>
                </tr>
                <tr>
                  <td style="padding-top:4px;font-family:Arial,Helvetica,sans-serif;font-size:9px;line-height:14px;letter-spacing:1.8px;text-transform:uppercase;color:#c7bfae;">Curated journeys. Stories that stay.</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding:38px 42px 34px 42px;">
              ${badge ? `<div style="margin:0 0 13px 0;"><span style="display:inline-block;padding:5px 9px;background:${BRAND.cream};border:1px solid ${BRAND.border};font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${BRAND.burgundy};">${escapeHtml(badge)}</span></div>` : ""}
              <p style="margin:0 0 9px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:${BRAND.gold};">${escapeHtml(eyebrow)}</p>
              <h1 style="margin:0 0 15px 0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:38px;font-weight:400;color:${BRAND.ink};">${escapeHtml(title)}</h1>
              <p style="margin:0 0 30px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:25px;color:${BRAND.muted};">${escapeHtml(intro)}</p>
              ${bodyHtml}
              ${ctaHtml}
              <p style="margin:0;padding-top:22px;border-top:1px solid ${BRAND.border};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#8a8278;">${escapeHtml(footerNote || `This is a transactional message from ${BRAND.name}.`)}</p>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" bgcolor="${BRAND.ink}" style="padding:25px 34px;">
              <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:${BRAND.white};"><strong>${BRAND.name}</strong> · ${BRAND.legalName}</p>
              <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:#c7bfae;">${BRAND.address}</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:#c7bfae;">
                <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.gold};text-decoration:none;">${BRAND.supportEmail}</a>
                &nbsp;·&nbsp;
                <a href="tel:${BRAND.supportPhoneHref}" style="color:${BRAND.gold};text-decoration:none;">${BRAND.supportPhone}</a>
              </p>
              <p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:16px;color:#91897d;">© ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.</p>
            </td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const plainSection = (title, rows) => {
  const lines = rows
    .map((row) => ({ ...row, value: displayValue(row.value) }))
    .filter((row) => row.value)
    .map(({ label, value }) => `${label}: ${value}`);
  return lines.length ? `${title.toUpperCase()}\n${lines.join("\n")}` : null;
};

const renderPlainText = ({ title, intro, sections = [], notice, cta, closing }) =>
  [
    BRAND.name,
    title,
    intro,
    ...sections.filter(Boolean),
    displayValue(notice),
    cta ? `${cta.label}: ${cta.url}` : null,
    closing || `Questions? Email ${BRAND.supportEmail} or call ${BRAND.supportPhone}.`,
    `${BRAND.legalName}\n${BRAND.address}`,
  ]
    .filter(Boolean)
    .join("\n\n");

const sendTemplate = async ({ to, subject, text, replyTo, ...layout }) => {
  const recipient = sanitizeHeader(to);
  if (!recipient) throw new TypeError("Email recipient is required.");

  return transport.sendMail({
    from: FROM,
    replyTo: sanitizeHeader(replyTo) || BRAND.supportEmail,
    to: recipient,
    subject: sanitizeHeader(subject, BRAND.name),
    text,
    html: renderEmail(layout),
  });
};

export const sendNewInquiryNotificationEmail = async (options = {}) => {
  const {
    name,
    email,
    phone,
    subject,
    message,
    tripType,
    inquiryId,
  } = options;
  const recipient = options.to || env.INQUIRY_NOTIFICATION_EMAIL || BRAND.supportEmail;
  const interest = options.itemTitle || options.tripTitle || options.festivalTitle || tripType || "General travel inquiry";
  const rows = [
    { label: "Customer", value: name, emphasis: true },
    { label: "Email", value: email },
    { label: "Phone", value: phone },
    { label: "Interest", value: interest },
    { label: "Subject", value: subject },
    { label: "Inquiry ID", value: inquiryId },
  ];
  const notice = displayValue(message) || "No message was supplied.";
  const cta = {
    label: "Open inquiry dashboard",
    url: safeAppUrl(options.crmUrl, "/dashboard/inquiries"),
  };
  const title = `New inquiry from ${displayValue(name) || "a traveler"}`;
  const intro = "A new website inquiry has been captured and added to the CRM lead pipeline.";

  return sendTemplate({
    to: recipient,
    replyTo: email,
    subject: `New website inquiry – ${displayValue(name) || displayValue(interest) || "Hangover Trails"}`,
    text: renderPlainText({
      title,
      intro,
      sections: [plainSection("Inquiry details", rows)],
      notice: `MESSAGE\n${notice}`,
      cta,
    }),
    preheader: `${displayValue(name) || "A traveler"} submitted a new website inquiry.`,
    eyebrow: "New CRM lead",
    title,
    intro,
    badge: "Website inquiry",
    bodyHtml: [
      renderDetails("Inquiry details", rows),
      renderNotice(notice),
    ].join(""),
    cta,
    footerNote: "Reply directly to this email to contact the traveler, then log the interaction in the CRM.",
  });
};

const paymentTypeDetails = (paymentType) => {
  switch (String(paymentType || "").toUpperCase()) {
    case "TOKEN":
      return {
        code: "TOKEN",
        label: "Booking payment",
        subjectPrefix: "Trip reserved & payment received",
        eyebrow: "Reservation confirmed",
        title: "Your spot is reserved",
        intro: "We have received your booking payment and reserved your place on the trip. Your booking details and payment receipt are below.",
      };
    case "FULL":
      return {
        code: "FULL",
        label: "Full payment",
        subjectPrefix: "Booking confirmed & payment received",
        eyebrow: "Booking confirmed",
        title: "Your journey is confirmed",
        intro: "We have received your full payment and confirmed your booking. Everything you need for your records is included below.",
      };
    case "BALANCE":
      return {
        code: "BALANCE",
        label: "Balance payment",
        subjectPrefix: "Balance received & booking confirmed",
        eyebrow: "Balance paid",
        title: "You are fully paid and confirmed",
        intro: "We have received your outstanding balance. Your booking is now fully paid and confirmed for the selected journey.",
      };
    default:
      return {
        code: "PAYMENT",
        label: "Payment",
        subjectPrefix: "Payment received",
        eyebrow: "Payment received",
        title: "Thank you — your payment is recorded",
        intro: "We have received your payment. Your booking and transaction details are included below for your records.",
      };
  }
};

/** Send the private, expiring offer prepared by an administrator for one customer. */

/**
 * Send a reservation/payment receipt. Existing fields remain supported; richer
 * callers may additionally pass bookingId, itemLocation, transactionAmount,
 * cumulativeAmountPaid, previousAmountPaid, paidAt, paymentMethod, paymentId,
 * balanceDueDate, bookingUrl, and paymentLink.
 */
export const sendBookingConfirmedEmail = async (options = {}) => {
  const {
    to,
    name,
    bookingRef,
    tripTitle,
    itemTitle,
    tripStartDate,
    tripEndDate,
    totalAmount,
    amountDue,
    paymentType,
    receiptNumber,
    travelersCount,
    packageName,
    slotName,
    slotTitle,
    travelersDetails,
    itemLocation,
    tripLocation,
    location,
    duration,
    paymentMethod,
    paymentId,
    razorpayPaymentId,
    balanceDueDate,
    bookingId,
    bookingUrl,
    paymentLink,
    currency = "INR",
  } = options;

  const travelerName = displayValue(name) || "Traveler";
  const journeyTitle = displayValue(tripTitle) || displayValue(itemTitle) || "your trip";
  const type = paymentTypeDetails(paymentType);
  const transactionAmount = firstNumber(options.transactionAmount, options.amountPaid);
  const total = toNumber(totalAmount);
  const due = toNumber(amountDue);
  let cumulativePaid = firstNumber(
    options.cumulativeAmountPaid,
    options.amountPaidToDate,
    options.totalPaid,
  );
  if (cumulativePaid === null && total !== null && due !== null) {
    cumulativePaid = Math.max(0, total - due);
  }
  if (cumulativePaid === null) cumulativePaid = transactionAmount;

  let previousPaid = firstNumber(options.previousAmountPaid, options.amountPreviouslyPaid);
  if (previousPaid === null && cumulativePaid !== null && transactionAmount !== null) {
    previousPaid = Math.max(0, cumulativePaid - transactionAmount);
  }

  const paidAt = options.paidAt || options.invoiceDate || options.paymentDate;
  const dateRange = formatDateRange(tripStartDate, tripEndDate);
  const subtotal = total === null ? null : total / 1.05;
  const gstAmount = total === null ? null : total - subtotal;
  const paymentSubtotal = transactionAmount === null ? null : transactionAmount / 1.05;
  const paymentGstAmount = transactionAmount === null ? null : transactionAmount - paymentSubtotal;
  const destination = itemLocation || tripLocation || location;
  const selectedSlot = slotTitle || options.slotLabel;
  const travelDates = dateRange || slotName;

  const bookingRows = [
    { label: "Booking reference", value: bookingRef, emphasis: true },
    { label: "Journey", value: journeyTitle },
    { label: "Location", value: destination },
    { label: "Package", value: packageName },
    { label: "Selected slot", value: selectedSlot },
    { label: "Travel dates", value: travelDates },
    { label: "Duration", value: duration },
    { label: "Travelers", value: travelersCount },
    { label: "Traveler names", value: travelersDetails },
  ];

  const transactionRows = [
    { label: "Receipt number", value: receiptNumber ? `#${receiptNumber}` : null },
    { label: "Payment date", value: formatDateTime(paidAt) },
    { label: "Payment type", value: type.label },
    { label: "Payment method", value: paymentMethod },
    { label: "Transaction ID", value: paymentId || razorpayPaymentId },
    { label: "GSTIN", value: BRAND.gstin },
  ];

  const amountRows = [
    { label: `${packageName || journeyTitle} subtotal`, value: formatCurrency(subtotal, currency) },
    { label: "GST (5%) on booking", value: formatCurrency(gstAmount, currency) },
    { label: "Booking total (including GST)", value: formatCurrency(total, currency), strong: true },
    { label: "This payment subtotal", value: formatCurrency(paymentSubtotal, currency) },
    { label: "GST (5%) on this payment", value: formatCurrency(paymentGstAmount, currency) },
    { label: "This payment (including GST)", value: formatCurrency(transactionAmount, currency), accent: true },
    ...(previousPaid > 0
      ? [{ label: "Previously paid", value: formatCurrency(previousPaid, currency) }]
      : []),
    { label: "Total paid to date", value: formatCurrency(cumulativePaid, currency), strong: true },
    { label: "Balance due", value: formatCurrency(due, currency), strong: true, accent: due > 0 },
  ];

  const dueNotice = due > 0
    ? `Your remaining balance of ${formatCurrency(due, currency)}${formatDate(balanceDueDate) ? ` is due by ${formatDate(balanceDueDate)}` : " is still payable"}. Your place remains reserved in the meantime.`
    : "Your booking is confirmed and fully paid. No balance remains on this booking. Please keep this email as your payment receipt."

  const fallbackPath = "/profile";
  const requestedUrl = type.code === "TOKEN" && due > 0
    ? paymentLink || (bookingId ? appLink(`/bookings/${bookingId}/pay-balance`) : bookingUrl)
    : bookingUrl;
  const cta = {
    label: type.code === "TOKEN" && due > 0 ? "View booking & pay balance" : "View my booking",
    url: safeAppUrl(requestedUrl, fallbackPath),
  };

  const bodyHtml = [
    renderDetails("Booking details", bookingRows),
    renderDetails("Transaction details", transactionRows),
    renderAmounts("Payment summary", amountRows),
    renderNotice(dueNotice),
  ].join("");

  const title = `${type.title}, ${travelerName}`;
  const subject = `${type.subjectPrefix} – ${journeyTitle}${bookingRef ? ` (${bookingRef})` : ""}`;
  const text = renderPlainText({
    title: type.title,
    intro: type.intro,
    sections: [
      plainSection("Booking details", bookingRows),
      plainSection("Transaction details", transactionRows),
      plainSection("Payment summary", amountRows),
    ],
    notice: dueNotice,
    cta,
  });

  const result = await sendTemplate({
    to,
    subject,
    text,
    preheader: `${type.subjectPrefix} for ${journeyTitle}.`,
    eyebrow: type.eyebrow,
    title,
    intro: type.intro,
    badge: bookingRef || type.label,
    bodyHtml,
    cta,
    footerNote: "Keep this email for your records. Reply to it if any booking or payment detail looks incorrect.",
  });
  try {
    await recordDeliveredBookingReceipt({ options, travelerName, journeyTitle, transactionAmount, cumulativePaid, paidAt, type });
  } catch (error) {
    console.error("Failed to record delivered booking receipt:", error);
  }
  return result;
};

/** Send a balance payment reminder. */
export const sendPaymentReminderEmail = async (options = {}) => {
  const {
    to,
    name,
    bookingRef,
    tripTitle,
    itemTitle,
    balanceAmount,
    dueDate,
    paymentLink,
    totalAmount,
    amountPaid,
    packageName,
    slotName,
    slotTitle,
    tripStartDate,
    tripEndDate,
    travelersCount,
    itemLocation,
    tripLocation,
    location,
    currency = "INR",
  } = options;

  const travelerName = displayValue(name) || "Traveler";
  const journeyTitle = displayValue(tripTitle) || displayValue(itemTitle) || "your trip";
  const dueDateValue = validDate(dueDate);
  const overdue = typeof options.isOverdue === "boolean"
    ? options.isOverdue
    : Boolean(dueDateValue && dueDateValue.getTime() < Date.now());
  const formattedBalance = formatCurrency(balanceAmount, currency);
  const requestedAmount = options.paymentRequestAmount === undefined ? null : formatCurrency(options.paymentRequestAmount, currency);
  const installmentRequest = options.isInstallmentRequest === true;
  const websitePaymentLink = options.isWebsitePaymentLink === true;

  const bookingRows = [
    { label: "Booking reference", value: bookingRef, emphasis: true },
    { label: "Journey", value: journeyTitle },
    { label: "Location", value: itemLocation || tripLocation || location },
    { label: "Package", value: packageName },
    { label: "Selected slot", value: slotTitle || options.slotLabel },
    { label: "Travel dates", value: formatDateRange(tripStartDate, tripEndDate) || slotName },
    { label: "Travelers", value: travelersCount },
  ];
  const amountRows = [
    { label: "Booking total", value: formatCurrency(totalAmount, currency) },
    { label: "Paid to date", value: formatCurrency(amountPaid, currency) },
    ...(installmentRequest ? [{ label: "Payment requested now", value: requestedAmount, strong: true, accent: true }] : []),
    { label: "Balance due", value: formattedBalance, strong: true, accent: true },
    { label: overdue ? "Payment was due" : "Payment due date", value: formatDate(dueDate), strong: true },
  ];

  const title = websitePaymentLink ? `Your payment page, ${travelerName}` : installmentRequest ? `Your payment link, ${travelerName}` : overdue ? `Your balance is overdue, ${travelerName}` : `A quick payment reminder, ${travelerName}`;
  const intro = overdue
    ? `The balance for ${journeyTitle} has passed its due date. Please complete the payment as soon as possible to keep your booking in good standing.`
    : websitePaymentLink
      ? `Open your secure Hangover Trails payment page to pay ${requestedAmount || "the amount due"} for ${journeyTitle}.`
      : installmentRequest
      ? `Please use this secure Razorpay link to pay ${requestedAmount} toward ${journeyTitle}. We have included your booking and remaining-balance details below.`
      : `Your remaining payment for ${journeyTitle} is coming up. We have gathered the important booking and balance details below.`;
  const notice = "If you have already completed this payment, no action is needed. Payment updates may take a few moments to appear.";
  const cta = {
    label: websitePaymentLink ? "Open secure payment page" : installmentRequest ? "Pay securely" : "Pay balance securely",
    url: safeAppUrl(paymentLink, "/profile"),
  };

  return sendTemplate({
    to,
    subject: `${websitePaymentLink ? "Payment page" : installmentRequest ? "Payment link" : overdue ? "Balance payment overdue" : "Balance payment reminder"} – ${journeyTitle}${bookingRef ? ` (${bookingRef})` : ""}`,
    text: renderPlainText({
      title,
      intro,
      sections: [
        plainSection("Booking details", bookingRows),
        plainSection("Payment summary", amountRows),
      ],
      notice,
      cta,
    }),
    preheader: `${websitePaymentLink ? `${requestedAmount || formattedBalance} payment requested` : installmentRequest ? `${requestedAmount} payment requested` : formattedBalance || "Your booking balance"} for ${journeyTitle}.`,
    eyebrow: websitePaymentLink ? "Secure payment page" : installmentRequest ? "Secure payment link" : overdue ? "Payment overdue" : "Payment reminder",
    title,
    intro,
    badge: bookingRef,
    bodyHtml: [
      renderDetails("Booking details", bookingRows),
      renderAmounts("Payment summary", amountRows),
      renderNotice(notice, overdue ? "alert" : "neutral"),
    ].join(""),
    cta,
    footerNote: "For payment questions or assistance, reply to this email and our team will help.",
  });
};

/** Send refund initiation details. */
export const sendRefundInitiatedEmail = async (options = {}) => {
  const {
    to,
    name,
    bookingRef,
    tripTitle,
    itemTitle,
    refundAmount,
    paymentMethod,
    packageName,
    tripStartDate,
    tripEndDate,
    travelersCount,
    itemLocation,
    tripLocation,
    location,
    bookingUrl,
    currency = "INR",
  } = options;

  const travelerName = displayValue(name) || "Traveler";
  const journeyTitle = displayValue(tripTitle) || displayValue(itemTitle) || "your trip";
  const reason = options.refundReason || options.reason;
  const refundId = options.refundId || options.refundReference;
  const refundDate = options.refundDate || options.initiatedAt;
  const fullRefund = options.isFullRefund === true || String(options.refundType || "").toUpperCase() === "FULL";
  const partialRefund = options.isFullRefund === false || String(options.refundType || "").toUpperCase() === "PARTIAL";
  const refundLabel = fullRefund ? "Full refund" : partialRefund ? "Partial refund" : "Refund amount";

  const bookingRows = [
    { label: "Booking reference", value: bookingRef, emphasis: true },
    { label: "Journey", value: journeyTitle },
    { label: "Location", value: itemLocation || tripLocation || location },
    { label: "Package", value: packageName },
    { label: "Travel dates", value: formatDateRange(tripStartDate, tripEndDate) },
    { label: "Travelers", value: travelersCount },
  ];
  const refundAmountRows = [
    { label: fullRefund ? "Full refund of this payment" : refundLabel, value: formatCurrency(refundAmount, currency), strong: true, accent: true },
    { label: "Original payment", value: formatCurrency(options.originalPaymentAmount, currency) },
    { label: "Booking amount paid after refund", value: formatCurrency(options.bookingAmountPaidAfterRefund ?? options.amountPaid, currency), strong: true },
    { label: "Refundable amount remaining on this payment", value: formatCurrency(options.refundableAmountRemaining ?? options.remainingAmount, currency) },
  ];
  const refundDetailRows = [
    { label: "Refund reference", value: refundId },
    { label: "Initiated on", value: formatDateTime(refundDate) },
    { label: "Original payment method", value: paymentMethod },
    { label: "Reason", value: reason },
  ];

  const title = `Your refund is on its way, ${travelerName}`;
  const intro = `We have initiated a refund for your ${journeyTitle} booking. The request has been sent to the original payment method.`;
  const notice = options.expectedBy
    ? `Your bank should reflect the refund by ${formatDate(options.expectedBy)}. Processing time ultimately depends on your bank or payment provider.`
    : "Most refunds appear within 5–7 business days, although the exact timing depends on your bank or payment provider.";
  const cta = { label: "View booking", url: safeAppUrl(bookingUrl, "/profile") };

  return sendTemplate({
    to,
    subject: `Refund initiated – ${journeyTitle}${bookingRef ? ` (${bookingRef})` : ""}`,
    text: renderPlainText({
      title,
      intro,
      sections: [plainSection("Booking details", bookingRows), plainSection("Refund summary", refundAmountRows), plainSection("Refund processing details", refundDetailRows)],
      notice,
      cta,
    }),
    preheader: `${formatCurrency(refundAmount, currency) || "Your refund"} has been initiated for ${journeyTitle}.`,
    eyebrow: "Refund initiated",
    title,
    intro,
    badge: bookingRef,
    bodyHtml: [renderDetails("Booking details", bookingRows), renderAmounts("Refund summary", refundAmountRows), renderDetails("Refund processing details", refundDetailRows), renderNotice(notice)].join(""),
    cta,
    footerNote: "Keep this email until the refund appears in your account. Reply if you need help tracing it.",
  });
};

/** Send a payment failure notification with a safe retry path. */
export const sendPaymentFailedEmail = async (options = {}) => {
  const {
    to,
    name,
    bookingRef,
    tripTitle,
    itemTitle,
    amount,
    paymentType,
    packageName,
    tripStartDate,
    tripEndDate,
    itemLocation,
    tripLocation,
    location,
    amountDue,
    dueDate,
    currency = "INR",
  } = options;

  const travelerName = displayValue(name) || "Traveler";
  const journeyTitle = displayValue(tripTitle) || displayValue(itemTitle) || "your trip";
  const type = paymentTypeDetails(paymentType);
  const reason = options.failureReason || options.reason;
  const paymentId = options.paymentId || options.orderId || options.razorpayOrderId;
  const attemptedAt = options.attemptedAt || options.failedAt;
  const retryLink = options.retryLink || options.paymentLink;
  const attemptedAmount = options.transactionAmount ?? amount;

  const bookingRows = [
    { label: "Booking reference", value: bookingRef, emphasis: true },
    { label: "Journey", value: journeyTitle },
    { label: "Location", value: itemLocation || tripLocation || location },
    { label: "Package", value: packageName },
    { label: "Travel dates", value: formatDateRange(tripStartDate, tripEndDate) },
  ];
  const failureRows = [
    { label: "Attempted amount", value: formatCurrency(attemptedAmount, currency), strong: true, accent: true },
    { label: "Payment type", value: type.label },
    { label: "Attempted on", value: formatDateTime(attemptedAt) },
    { label: "Order / transaction ID", value: paymentId },
    { label: "Reason", value: reason },
    { label: "Error code", value: options.code || options.failureCode },
    { label: "Outstanding balance", value: formatCurrency(amountDue, currency) },
    { label: "Balance due date", value: formatDate(dueDate) },
  ];

  const title = `That payment did not go through, ${travelerName}`;
  const intro = `We could not complete your ${type.label.toLowerCase()} for ${journeyTitle}. No successful payment was recorded for this attempt.`;
  const notice = type.code === "BALANCE"
    ? "You can safely try the balance payment again. If money was debited despite this message, wait for your bank to reverse it before retrying or contact us with the transaction reference."
    : "Open My Bookings to review the latest payment status. If money was debited despite this message, wait for your bank to reverse it and contact us with the transaction reference before trying again.";
  const cta = { label: type.code === "BALANCE" ? "Try balance payment again" : "View my booking", url: safeAppUrl(retryLink, "/profile") };

  return sendTemplate({
    to,
    subject: `Payment unsuccessful – ${journeyTitle}${bookingRef ? ` (${bookingRef})` : ""}`,
    text: renderPlainText({
      title,
      intro,
      sections: [plainSection("Booking details", bookingRows), plainSection("Attempt details", failureRows)],
      notice,
      cta,
    }),
    preheader: `Your payment attempt for ${journeyTitle} was unsuccessful. You can try again securely.`,
    eyebrow: "Payment unsuccessful",
    title,
    intro,
    badge: bookingRef,
    bodyHtml: [renderDetails("Booking details", bookingRows), renderDetails("Attempt details", failureRows), renderNotice(notice, "alert")].join(""),
    cta,
    footerNote: "Hangover Trails will never ask you to share an OTP, PIN, CVV, or card password by email or phone.",
  });
};

/**
 * Send cancellation/refund details. Supports the legacy `(to, details)` call as
 * well as a single options object.
 */
export const sendBookingCancelledRefundedEmail = async (toOrOptions, details) => {
  const options = typeof toOrOptions === "object" && toOrOptions !== null && details === undefined
    ? toOrOptions
    : { ...(details || {}), to: toOrOptions };
  const {
    to,
    name,
    bookingRef,
    tripTitle,
    itemTitle,
    refundAmount,
    packageName,
    tripStartDate,
    tripEndDate,
    itemLocation,
    tripLocation,
    location,
    travelersCount,
    currency = "INR",
  } = options;

  const travelerName = displayValue(name) || "Traveler";
  const journeyTitle = displayValue(tripTitle) || displayValue(itemTitle) || "your trip";
  const refund = toNumber(refundAmount) || 0;
  const hasRefund = refund > 0;
  const fullRefund = options.isFullRefund === true || String(options.refundType || "").toUpperCase() === "FULL";
  const partialRefund = options.isFullRefund === false || String(options.refundType || "").toUpperCase() === "PARTIAL";
  const cancellationDate = options.cancelledAt || options.cancellationDate;
  const reason = options.cancellationReason || options.reason;
  const refundId = options.refundId || options.refundReference;

  const bookingRows = [
    { label: "Booking reference", value: bookingRef, emphasis: true },
    { label: "Journey", value: journeyTitle },
    { label: "Location", value: itemLocation || tripLocation || location },
    { label: "Package", value: packageName },
    { label: "Travel dates", value: formatDateRange(tripStartDate, tripEndDate) },
    { label: "Travelers", value: travelersCount },
    { label: "Cancelled on", value: formatDateTime(cancellationDate) },
    { label: "Cancellation reason", value: reason },
  ];
  const refundAmountRows = hasRefund
    ? [
        {
          label: fullRefund ? "Full refund" : partialRefund ? "Partial refund" : "Refund initiated",
          value: formatCurrency(refund, currency),
          strong: true,
          accent: true,
        },
        { label: "Paid before cancellation", value: formatCurrency(options.totalPaid, currency) },
        { label: "Paid amount remaining", value: formatCurrency(options.remainingPaidAmount, currency) },
      ]
    : [];
  const refundDetailRows = hasRefund
    ? [
        { label: "Refund reference", value: refundId },
        { label: "Original payment method", value: options.paymentMethod },
      ]
    : [];

  const intro = hasRefund
    ? `Your booking for ${journeyTitle} has been cancelled, and a refund of ${formatCurrency(refund, currency)} has been initiated to the original payment method.`
    : `Your booking for ${journeyTitle} has been cancelled. No refund amount was recorded for this cancellation.`;
  const notice = hasRefund
    ? "Most refunds appear within 5–7 business days. Your bank or payment provider controls the final processing time."
    : "If you believe a refund should apply, reply to this email and our team will review the booking with you.";
  const title = `Your booking has been cancelled, ${travelerName}`;
  const cta = { label: "Explore other journeys", url: safeAppUrl(options.exploreUrl, "/trips") };

  return sendTemplate({
    to,
    subject: `Booking cancelled${hasRefund ? " & refund initiated" : ""} – ${journeyTitle}${bookingRef ? ` (${bookingRef})` : ""}`,
    text: renderPlainText({
      title,
      intro,
      sections: [plainSection("Booking details", bookingRows), plainSection("Refund summary", refundAmountRows), plainSection("Refund processing details", refundDetailRows)],
      notice,
      cta,
    }),
    preheader: `Your ${journeyTitle} booking has been cancelled${hasRefund ? ` and ${formatCurrency(refund, currency)} is being refunded` : ""}.`,
    eyebrow: "Booking cancelled",
    title,
    intro,
    badge: bookingRef,
    bodyHtml: [renderDetails("Booking details", bookingRows), renderAmounts("Refund summary", refundAmountRows), renderDetails("Refund processing details", refundDetailRows), renderNotice(notice, hasRefund ? "neutral" : "alert")].join(""),
    cta,
    footerNote: "Reply to this email if any cancellation or refund detail looks incorrect.",
  });
};

/** Send a post-trip review invitation. */
export const sendReviewRequestEmail = async (options = {}) => {
  const {
    to,
    name,
    tripTitle,
    itemTitle,
    reviewLink,
    bookingRef,
    packageName,
    tripStartDate,
    tripEndDate,
    itemLocation,
    tripLocation,
    location,
  } = options;

  const travelerName = displayValue(name) || "Traveler";
  const journeyTitle = displayValue(tripTitle) || displayValue(itemTitle) || "your recent trip";
  const tripRows = [
    { label: "Booking reference", value: bookingRef },
    { label: "Journey", value: journeyTitle, emphasis: true },
    { label: "Location", value: itemLocation || tripLocation || location },
    { label: "Package", value: packageName },
    { label: "Travel dates", value: formatDateRange(tripStartDate, tripEndDate) },
  ];
  const title = `How was the journey, ${travelerName}?`;
  const intro = `We hope ${journeyTitle} left you with stories worth retelling. Your honest feedback helps future travelers and helps our team make every departure better.`;
  const notice = "A thoughtful review only takes a minute. Share what you loved and anything you think we could improve.";
  const cta = { label: "Share my experience", url: safeAppUrl(reviewLink, "/profile") };

  return sendTemplate({
    to,
    subject: `How was ${journeyTitle}? Share your experience`,
    text: renderPlainText({
      title,
      intro,
      sections: [plainSection("Your journey", tripRows)],
      notice,
      cta,
    }),
    preheader: `Tell us about your experience on ${journeyTitle}.`,
    eyebrow: "Welcome home",
    title,
    intro,
    badge: bookingRef,
    bodyHtml: [renderDetails("Your journey", tripRows), renderNotice(notice)].join(""),
    cta,
    footerNote: "Thank you for traveling with Hangover Trails. We hope to see you on another trail soon.",
  });
};

/** Send a welcome message using the same branded transactional shell. */
export const sendWelcomeEmail = async (options = {}) => {
  const { to } = options;
  const travelerName = displayValue(options.name || options.fullName) || "Traveler";
  const title = `Welcome to the trail, ${travelerName}`;
  const intro = "Your next great story starts here. You are now part of a community that values thoughtful journeys, local connections, and the kind of memories that stay long after the road ends.";
  const cta = { label: "Start exploring", url: safeAppUrl(options.exploreUrl, "/trips") };
  const welcomeRows = [
    { label: "Curated departures", value: "Small-group journeys planned with care" },
    { label: "Local perspective", value: "Places, people, and stories beyond the usual route" },
    { label: "Human support", value: `Real help from our team at ${BRAND.supportEmail}` },
  ];

  return sendTemplate({
    to,
    subject: `Welcome to ${BRAND.name}`,
    text: renderPlainText({
      title,
      intro,
      sections: [plainSection("What you can expect", welcomeRows)],
      notice: "Browse the latest trips and festivals whenever you are ready. We will be here when the right journey finds you.",
      cta,
      closing: `See you out there,\nThe ${BRAND.name} Team`,
    }),
    preheader: `Welcome to ${BRAND.name}. Your next great story starts here.`,
    eyebrow: "Welcome aboard",
    title,
    intro,
    bodyHtml: [
      renderDetails("What you can expect", welcomeRows),
      renderNotice("Browse the latest trips and festivals whenever you are ready. We will be here when the right journey finds you."),
    ].join(""),
    cta,
    footerNote: `You received this welcome email because an account was created with ${BRAND.name}.`,
  });
};

/**
 * Sends an operations task reminder to an admin.
 * Called by the in-memory operations worker when a task's dueAt is approaching.
 */
export const sendOperationsReminderEmail = async (options = {}) => {
  const {
    to,
    taskTitle,
    taskCategory,
    taskDescription,
    dueAt,
    daysTillDue,
    bookingId,
    isOverdue = false,
  } = options;

  const urgencyLabel = isOverdue
    ? "⚠️ OVERDUE"
    : daysTillDue <= 1
    ? "⚠️ DUE TODAY / TOMORROW"
    : `Due in ${daysTillDue} day(s)`;

  const subject = `[Ops Alert] ${urgencyLabel} — ${taskTitle}`;

  const rows = [
    ["Task", taskTitle],
    ["Category", taskCategory],
    ...(taskDescription ? [["Details", taskDescription]] : []),
    ["Due At", dueAt ? new Date(dueAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"],
    ["Booking ID", bookingId],
    ["Status", isOverdue ? "OVERDUE" : "URGENT"],
  ];

  return sendTemplate({
    to,
    subject,
    preheader: `Ops task "${taskTitle}" needs your attention.`,
    eyebrow: "Operations Alert",
    title: urgencyLabel,
    intro: `The following operational task requires your immediate attention.`,
    bodyHtml: renderDetails("Task Details", rows),
    footerNote: "This is an automated reminder from the Hangover Trails operations system.",
    text: rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
  });
};

/**
 * Send a custom invoice email.
 */
export const sendCustomInvoiceEmail = async (options = {}) => {
  const {
    to,
    customerName,
    title,
    description,
    items,
    amount,
    currency = "INR",
    dueDate,
  } = options;

  const subtotal = (Array.isArray(items) ? items : []).reduce(
    (sum, item) => sum + Number(item?.price || 0),
    0,
  );
  const gstAmount = Number(amount || 0) - subtotal;

  const invoiceRows = [
    { label: "Billed to", value: customerName, emphasis: true },
    { label: "Invoice Title", value: title },
    { label: "Description", value: description },
    { label: "Date", value: formatDate(dueDate || new Date()) },
    { label: "GSTIN", value: BRAND.gstin },
  ];

  const amountRows = items && items.length > 0
    ? items.map(item => ({ label: item.description, value: formatCurrency(item.price, currency) }))
    : [];

  const summaryRows = [
    ...amountRows,
    { label: "Subtotal", value: formatCurrency(subtotal, currency) },
    { label: "GST (5%)", value: formatCurrency(gstAmount, currency) },
    { label: "Total Amount (including GST)", value: formatCurrency(amount, currency), strong: true, accent: true },
  ];

  const intro = `Please find your payment receipt details below.`;
  const emailTitle = `Payment Receipt: ${title}`;

  return sendTemplate({
    to,
    subject: `Payment Receipt: ${title}`,
    text: renderPlainText({
      title: emailTitle,
      intro,
      sections: [plainSection("Receipt Details", invoiceRows), plainSection("Amount Summary", summaryRows)],
    }),
    preheader: `Receipt for ${formatCurrency(amount, currency)} is ready.`,
    eyebrow: "Payment Receipt",
    title: emailTitle,
    intro,
    bodyHtml: [
      renderDetails("Receipt Details", invoiceRows),
      renderAmounts("Amount Summary", summaryRows),
      renderNotice("This invoice has been marked as paid. Thank you for your payment!"),
    ].join(""),
    footerNote: "If you have any questions about this receipt, reply to this email.",
  });
};
