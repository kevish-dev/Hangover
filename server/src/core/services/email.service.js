import transport from "../smtp/client.js";
import env from "../env/env.js";

const FROM = env.SMTP_FROM;

/**
 * Send booking confirmation email
 */
export const sendBookingConfirmedEmail = async ({ to, name, bookingRef, tripTitle, totalAmount, paymentType }) => {
  await transport.sendMail({
    from: FROM,
    to,
    subject: `Booking Confirmed – ${tripTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#1a1a2e;">🎉 You're all set, ${name}!</h2>
        <p>Your booking for <strong>${tripTitle}</strong> has been confirmed.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;color:#555;">Booking Reference</td><td style="padding:8px;font-weight:bold;">${bookingRef}</td></tr>
          <tr><td style="padding:8px;color:#555;">Amount Paid</td><td style="padding:8px;font-weight:bold;">₹${totalAmount}</td></tr>
          <tr><td style="padding:8px;color:#555;">Payment Type</td><td style="padding:8px;">${paymentType}</td></tr>
        </table>
        <p style="color:#555;">We'll be in touch with more details closer to the trip date. If you have any questions, reply to this email.</p>
        <p style="margin-top:24px;color:#999;font-size:12px;">Hangover Trips</p>
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
