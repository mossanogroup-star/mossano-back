/**
 * Email to the executive — the cheaper route to the same outcome.
 *
 * The client asked for an automatic WhatsApp to the executive. That needs a Meta
 * Business account, a dedicated number, template approval and per-message
 * billing (see whatsappProvider.js). This does the same job with none of it:
 * the alert arrives as email, and the "Reply on WhatsApp" link inside it opens
 * the *customer's* chat with a greeting already written.
 *
 * The executive taps once instead of zero times. That is the whole difference,
 * and it is worth putting to the client before committing to the Business API —
 * docs/CLIENT-QUESTIONS.md §12.
 */
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { formatContact } from "./templates.js";

let transporter = null;

/**
 * nodemailer is imported lazily so it is not required at boot when email is not
 * the selected provider — the same reasoning as sharp in the storage layer.
 */
async function getTransporter() {
  if (transporter) return transporter;
  const { default: nodemailer } = await import("nodemailer");
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

/** The wa.me link that opens the customer's chat, pre-written. */
function replyLink(enquiry) {
  if (!enquiry.phone) return null;
  const digits = enquiry.phone.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length < 10) return null;
  const e164 = digits.length === 10 ? `91${digits}` : digits;
  const greeting = `Hi ${enquiry.name}, thank you for your enquiry (${enquiry.reference}).`;
  return `https://wa.me/${e164}?text=${encodeURIComponent(greeting)}`;
}

const emailProvider = {
  name: "email",

  get isConfigured() {
    return Boolean(
      env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.EXECUTIVE_EMAIL,
    );
  },

  async send({ text, subject, enquiry }) {
    const wa = enquiry ? replyLink(enquiry) : null;

    // Plain text as the body, because that is what the client specified and it
    // reads correctly on every client. The HTML part only adds the two links.
    const html =
      `<pre style="font:14px/1.6 ui-monospace,Menlo,monospace;white-space:pre-wrap">${text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")}</pre>` +
      (wa
        ? `<p><a href="${wa}" style="display:inline-block;padding:10px 18px;background:#1fb658;color:#fff;text-decoration:none">Reply on WhatsApp</a></p>`
        : "");

    const mailer = await getTransporter();
    const info = await mailer.sendMail({
      from: env.SMTP_FROM || env.SMTP_USER,
      to: env.EXECUTIVE_EMAIL,
      subject,
      text: wa ? `${text}\n\nReply on WhatsApp: ${wa}` : text,
      html,
      replyTo: enquiry?.email || undefined,
    });

    logger.info(
      {
        to: env.EXECUTIVE_EMAIL,
        messageId: info.messageId,
        contact: formatContact(enquiry?.phone, enquiry?.email),
      },
      "Executive alerted by email",
    );
    return info;
  },
};

export { emailProvider };
