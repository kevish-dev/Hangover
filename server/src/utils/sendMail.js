import env from "../core/env/env.js";
import transport from "../core/smtp/client.js";

const sendMail = async (to, subject, text, html) => {
  try {
    const info = await transport.sendMail({
      from: env.SMTP_FROM,
      to: to,
      subject: subject,
      text: text,
      html: html,
    });
  } catch (err) {
    console.error("Error while sending mail:", err);
  }
};

export default sendMail;
