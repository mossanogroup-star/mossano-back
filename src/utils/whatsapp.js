/**
 * wa.me deep links.
 *
 * Admin Scope §8: WhatsApp must be reachable from Home, Stone Detail, Private
 * Sourcing, Private Selection and Contact, and "where possible, the WhatsApp
 * message should include the relevant MOSSANO code" —
 *
 *     Hi MOSSANO, I am interested in MM-024 Calacatta Viola.
 *
 * Built on the server rather than in the browser for two reasons: the number is
 * configuration, and the storefront is server-rendered, so a link assembled at
 * render time is present in the HTML a crawler sees and needs no JavaScript to
 * work.
 */
import { env } from "../config/env.js";

/** wa.me wants digits only — no +, spaces or hyphens. */
function normaliseNumber(number) {
  return String(number ?? env.WHATSAPP_NUMBER).replace(/\D/g, "");
}

function whatsappLink(message, { number } = {}) {
  const to = normaliseNumber(number);
  const text = encodeURIComponent(String(message || "").trim());
  return text ? `https://wa.me/${to}?text=${text}` : `https://wa.me/${to}`;
}

/** The exact sentence from the requirement document. */
function stoneEnquiryMessage(stone) {
  const label = [stone?.mossanoCode, stone?.name].filter(Boolean).join(" ");
  return label
    ? `Hi MOSSANO, I am interested in ${label}.`
    : "Hi MOSSANO, I would like to enquire about a stone.";
}

function slabVideoMessage(stone) {
  const label = [stone?.mossanoCode, stone?.name].filter(Boolean).join(" ");
  return `Hi MOSSANO, could you send the actual slab video for ${label}?`;
}

function reserveMessage(stone) {
  const label = [stone?.mossanoCode, stone?.name].filter(Boolean).join(" ");
  return `Hi MOSSANO, I would like to reserve ${label}.`;
}

/** Private Selection (Website §9) — the customer already has a curated set. */
function selectionMessage(selection) {
  const project = selection?.projectName ? ` for ${selection.projectName}` : "";
  return `Hi MOSSANO, I have reviewed the selection${project} and would like to discuss it.`;
}

function sourcingMessage() {
  return "Hi MOSSANO, I have a sourcing requirement I would like to discuss.";
}

export {
  whatsappLink,
  normaliseNumber,
  stoneEnquiryMessage,
  slabVideoMessage,
  reserveMessage,
  selectionMessage,
  sourcingMessage,
};
