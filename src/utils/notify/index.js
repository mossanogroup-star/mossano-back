/**
 * Alerting the team when an enquiry arrives.
 *
 * The client's flow ends "Backend automatically → Executive ko WhatsApp". Which
 * channel actually carries it is configuration, not code, because the WhatsApp
 * Business API needs an account, a dedicated number, template approval and a
 * budget — none of which exist yet, and one of which (§12) the client may
 * decide against once they see the cost.
 *
 * Selection order:
 *   1. NOTIFY_PROVIDER when set explicitly ("whatsapp" | "email" | "log")
 *   2. "whatsapp" when its credentials and an executive number are present
 *   3. "email" when SMTP and an executive address are present
 *   4. "log" otherwise — writes the exact message to the server log
 *
 * The log provider is not a stub. It means the whole path is exercised in
 * development and on a fresh deploy: the enquiry is stored, the template is
 * rendered, and the message that *would* have been sent is visible. Only the
 * transport is missing, so wiring credentials later changes one env var rather
 * than uncovering untested code.
 */
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { whatsappProvider } from "./whatsappProvider.js";
import { emailProvider } from "./emailProvider.js";
import { buildEnquiryAlert, buildEnquirySubject } from "./templates.js";

const logProvider = {
  name: "log",
  isConfigured: true,
  async send({ text, subject }) {
    logger.warn(
      { subject, alert: `\n${text}\n` },
      "Enquiry alert NOT SENT — no notification channel configured. " +
        "Set EXECUTIVE_WHATSAPP + WHATSAPP_TOKEN, or SMTP_* + EXECUTIVE_EMAIL.",
    );
  },
};

function resolveProvider() {
  const explicit = env.NOTIFY_PROVIDER;
  const byName = {
    whatsapp: whatsappProvider,
    email: emailProvider,
    log: logProvider,
  };

  if (explicit) {
    const chosen = byName[explicit];
    if (!chosen) {
      throw new Error(
        `Unknown NOTIFY_PROVIDER "${explicit}". Expected: ${Object.keys(byName).join(", ")}`,
      );
    }
    if (!chosen.isConfigured) {
      // Failing loudly beats silently falling back — an operator who set this
      // deliberately needs to know the credentials are incomplete.
      throw new Error(
        `NOTIFY_PROVIDER="${explicit}" but its configuration is incomplete. See .env.example.`,
      );
    }
    return chosen;
  }

  if (whatsappProvider.isConfigured) return whatsappProvider;
  if (emailProvider.isConfigured) return emailProvider;
  return logProvider;
}

const provider = resolveProvider();

if (provider.name === "log") {
  logger.warn(
    "Enquiry alerts are only being written to the log. The team will not be " +
      "notified of new enquiries until a channel is configured.",
  );
} else {
  logger.info({ provider: provider.name }, "Enquiry alerts ready");
}

/**
 * Alerts the team about one enquiry.
 *
 * Never throws. A failed notification must not fail the customer's submission —
 * the enquiry is already saved, and losing the lead because an SMTP host was
 * briefly unreachable would invert the priority entirely. Failures are logged
 * with the full message so nothing is unrecoverable.
 */
async function notifyEnquiry(enquiry) {
  const text = buildEnquiryAlert(enquiry);
  const subject = buildEnquirySubject(enquiry);

  try {
    await provider.send({ text, subject, enquiry });
    return { sent: true, provider: provider.name };
  } catch (err) {
    logger.error(
      {
        err,
        reference: enquiry.reference,
        provider: provider.name,
        alert: `\n${text}\n`,
      },
      "Could not alert the team about a new enquiry — the enquiry itself is saved",
    );
    return { sent: false, provider: provider.name, error: err.message };
  }
}

export { notifyEnquiry, provider as notifyProvider };
