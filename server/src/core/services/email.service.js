import transport from "../smtp/client.js";
import env from "../env/env.js";

const FROM = env.SMTP_FROM;

/**
 * Send booking confirmation email
 */
export const sendBookingConfirmedEmail = async ({ to, name, bookingRef, tripTitle, amountPaid, totalAmount, amountDue, paymentType, receiptNumber, invoiceDate, travelersCount }) => {
  const dateStr = new Date(invoiceDate).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  await transport.sendMail({
    from: FROM,
    to,
    subject: `Booking Confirmed & Invoice – ${tripTitle}`,
    html: `
      <div style="font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;max-width:650px;margin:0 auto;padding:30px;background:#ffffff;border:1px solid #eaeaea;border-radius:12px;color:#333;">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #f0f0f0;padding-bottom:20px;margin-bottom:20px;">
          <div>
            <h1 style="color:#781216;margin:0;font-size:24px;letter-spacing:1px;text-transform:uppercase;">Hangover</h1>
            <p style="margin:4px 0 0;font-size:12px;color:#777;">Trip Booking Invoice & Receipt</p>
          </div>
          <div style="text-align:right;">
            <p style="margin:0;font-size:14px;font-weight:bold;color:#333;">INVOICE #${receiptNumber}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#777;">Date: ${dateStr}</p>
          </div>
        </div>

        <!-- Greeting -->
        <h2 style="font-size:18px;margin-bottom:15px;">🎉 You're all set, ${name}!</h2>
        <p style="font-size:14px;line-height:1.6;color:#555;">Your booking for <strong>${tripTitle}</strong> has been successfully confirmed. Please find your invoice and payment details below.</p>

        <!-- Booking Details -->
        <div style="background:#fcfcfc;padding:20px;border-radius:8px;margin:25px 0;">
          <h3 style="margin-top:0;font-size:15px;border-bottom:1px solid #eaeaea;padding-bottom:10px;margin-bottom:15px;">Booking Information</h3>
          <table style="width:100%;font-size:14px;line-height:1.8;">
            <tr><td style="color:#666;width:40%;">Booking Reference:</td><td style="font-weight:bold;color:#222;">${bookingRef}</td></tr>
            <tr><td style="color:#666;">Trip Name:</td><td style="font-weight:bold;color:#222;">${tripTitle}</td></tr>
            <tr><td style="color:#666;">Number of Travelers:</td><td style="font-weight:bold;color:#222;">${travelersCount}</td></tr>
          </table>
        </div>

        <!-- Invoice Table -->
        <h3 style="font-size:15px;margin-bottom:15px;">Payment Summary</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:30px;">
          <thead>
            <tr style="background:#f5f5f5;text-align:left;">
              <th style="padding:12px;border:1px solid #ddd;">Description</th>
              <th style="padding:12px;border:1px solid #ddd;text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:12px;border:1px solid #ddd;color:#444;">${tripTitle} Package (x${travelersCount})</td>
              <td style="padding:12px;border:1px solid #ddd;text-align:right;color:#444;">₹${Number(totalAmount).toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td style="padding:12px;border:1px solid #ddd;text-align:right;font-weight:bold;">Total Amount</td>
              <td style="padding:12px;border:1px solid #ddd;text-align:right;font-weight:bold;">₹${Number(totalAmount).toLocaleString('en-IN')}</td>
            </tr>
            <tr style="background:#fdfdfd;">
              <td style="padding:12px;border:1px solid #ddd;text-align:right;color:#781216;">Amount Paid (${paymentType})</td>
              <td style="padding:12px;border:1px solid #ddd;text-align:right;font-weight:bold;color:#781216;">- ₹${Number(amountPaid).toLocaleString('en-IN')}</td>
            </tr>
            <tr style="background:#f4f4f4;">
              <td style="padding:12px;border:1px solid #ddd;text-align:right;font-weight:bold;font-size:15px;">Balance Due</td>
              <td style="padding:12px;border:1px solid #ddd;text-align:right;font-weight:bold;font-size:15px;">₹${Number(amountDue).toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>

        <!-- Footer Note -->
        <div style="padding-top:20px;border-top:1px solid #eaeaea;text-align:center;">
          <p style="font-size:13px;color:#666;line-height:1.5;">Thank you for choosing Hangover Trips!<br/>We'll be in touch with more details closer to the trip date. If you have any questions, simply reply to this email.</p>
          <p style="margin-top:15px;color:#aaa;font-size:11px;">Hangover Trips • Contact: +91 98765 43210</p>
        </div>
      </div>
    `,
  });
};

/**
 * Send balance payment reminder email
 */
export const sendPaymentReminderEmail = async ({ to, name, bookingRef, tripTitle, balanceAmount, dueDate, paymentLink }) => {
  const formattedDue = new Date(dueDate).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  await transport.sendMail({
    from: FROM,
    to,
    subject: `Balance Payment Due – ${tripTitle} (${bookingRef})`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#c0392b;">⏰ Balance Payment Reminder</h2>
        <p>Hi ${name},</p>
        <p>This is a reminder that your balance payment for <strong>${tripTitle}</strong> is due.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;color:#555;">Booking Reference</td><td style="padding:8px;font-weight:bold;">${bookingRef}</td></tr>
          <tr><td style="padding:8px;color:#555;">Balance Due</td><td style="padding:8px;font-weight:bold;color:#c0392b;">₹${balanceAmount}</td></tr>
          <tr><td style="padding:8px;color:#555;">Due Date</td><td style="padding:8px;font-weight:bold;">${formattedDue}</td></tr>
        </table>
        <a href="${paymentLink}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#e74c3c;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Pay Now</a>
        <p style="margin-top:24px;color:#999;font-size:12px;">If you've already paid, please ignore this email. – Hangover Trips</p>
      </div>
    `,
  });
};

/**
 * Send refund initiated email
 */
export const sendRefundInitiatedEmail = async ({ to, name, bookingRef, tripTitle, refundAmount }) => {
  await transport.sendMail({
    from: FROM,
    to,
    subject: `Refund Initiated – ${tripTitle} (${bookingRef})`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#1a1a2e;">Refund Initiated</h2>
        <p>Hi ${name},</p>
        <p>A refund of <strong>₹${refundAmount}</strong> has been initiated for your booking <strong>${bookingRef}</strong> (${tripTitle}).</p>
        <p>Refunds typically take 5–7 business days to reflect in your account depending on your bank.</p>
        <p style="margin-top:24px;color:#999;font-size:12px;">Hangover Trips</p>
      </div>
    `,
  });
};

/**
 * Send payment failure notification
 */
export const sendPaymentFailedEmail = async ({ to, name, bookingRef, tripTitle, amount }) => {
  await transport.sendMail({
    from: FROM,
    to,
    subject: `Payment Failed – ${tripTitle} (${bookingRef})`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#c0392b;">Payment Failed</h2>
        <p>Hi ${name},</p>
        <p>Unfortunately your payment of <strong>₹${amount}</strong> for booking <strong>${bookingRef}</strong> (${tripTitle}) could not be processed.</p>
        <p>Please try again or contact us if the issue persists.</p>
        <p style="margin-top:24px;color:#999;font-size:12px;">Hangover Trips</p>
      </div>
    `,
  });
};

/**
 * Send booking cancelled and refunded notification
 */
export const sendBookingCancelledRefundedEmail = async (to, { name, bookingRef, tripTitle, refundAmount }) => {
  await transport.sendMail({
    from: FROM,
    to,
    subject: `Booking Cancelled & Refunded – ${tripTitle} (${bookingRef})`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#c0392b;">Booking Cancelled & Refunded</h2>
        <p>Hi ${name},</p>
        <p>Your booking <strong>${bookingRef}</strong> for <strong>${tripTitle}</strong> has been cancelled.</p>
        <p>A full refund of <strong>₹${refundAmount}</strong> has been initiated and should reflect in your original payment method within 5–7 business days.</p>
        <p>If you have any questions or if you'd like to book another trip, please don't hesitate to contact us.</p>
        <p style="margin-top:24px;color:#999;font-size:12px;">Hangover Trips</p>
      </div>
    `,
  });
};
