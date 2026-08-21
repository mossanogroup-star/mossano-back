/**
 * WhatsApp Business Cloud API — the client's stated preference:
 * "Backend automatically → Executive ko WhatsApp".
 *
 * ── This is not the same thing as the wa.me links elsewhere ───────────────
 * Everything else the site does is click-to-chat: the customer taps a link and
 * their own WhatsApp opens with the text pre-filled. Free, no account, no
 * approval. This provider is the opposite direction — MOSSANO messaging the
 * executive unprompted — which is business-initiated messaging and needs:
 *
 *   · a Meta WhatsApp Business Platform account with a verified business
 *   · a phone number registered to it, which can then no longer be used in the
 *     ordinary WhatsApp app on a handset
 *   · a pre-approved template, because free-form text is only allowed inside a
 *     24-hour customer service window and an alert to staff is outside one
 *   · per-message billing at Meta's utility-conversation rate
 *
 * The free-form send below therefore works only while a 24-hour window is open
 * — in practice, if the executive has messaged the business number recently.
 * For reliable delivery, set WHATSAPP_TEMPLATE_NAME and register the template
 * with Meta; the code then sends the template form instead.
 *
 * See docs/CLIENT-QUESTIONS.md §12 — the email provider is the cheaper path and
 * needs none of the above.
 */
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

const GRAPH_VERSION = "v21.0";

const whatsappProvider = {
  name: "whatsapp",

  get isConfigured() {
    return Boolean(
      env.WHATSAPP_TOKEN &&
      env.WHATSAPP_PHONE_NUMBER_ID &&
      env.EXECUTIVE_WHATSAPP,
    );
  },

  async send({ text, to }) {
    const recipient = (to || env.EXECUTIVE_WHATSAPP).replace(/\D/g, "");
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    // A template send when one is registered, free-form otherwise. The template
    // is the only form Meta will deliver outside a 24-hour window.
    const body = env.WHATSAPP_TEMPLATE_NAME
      ? {
          messaging_product: "whatsapp",
          to: recipient,
          type: "template",
          template: {
            name: env.WHATSAPP_TEMPLATE_NAME,
            language: { code: env.WHATSAPP_TEMPLATE_LANG },
            // One body parameter carrying the whole alert. A template with more
            // placeholders would need this split to match its registered shape.
            components: [
              { type: "body", parameters: [{ type: "text", text }] },
            ],
          },
        }
      : {
          messaging_product: "whatsapp",
          to: recipient,
          type: "text",
          text: { preview_url: false, body: text },
        };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // Meta's errors are specific and worth keeping intact — "template not
      // found" and "outside the 24 hour window" need completely different fixes.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `WhatsApp send failed (${res.status}): ${detail.slice(0, 300)}`,
      );
    }

    const result = await res.json().catch(() => ({}));
    logger.info(
      { to: recipient, id: result?.messages?.[0]?.id },
      "Executive alerted on WhatsApp",
    );
    return result;
  },
};

export { whatsappProvider };
