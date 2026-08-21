/**
 * wa.me deep links — Admin Scope §8, which asks for the MOSSANO code in the
 * message: "Hi MOSSANO, I am interested in MM-024 Calacatta Viola."
 *
 * Built server-side so the link is in the HTML a crawler sees and works with
 * JavaScript disabled.
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
