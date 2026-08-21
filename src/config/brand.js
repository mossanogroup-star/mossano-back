/**
 * Brand facts, transcribed from the client's own material — see
 * CLIENT-FACTS.md. Nothing here is invented copy.
 *
 * It lives on the server so the storefront's footer, contact page, WhatsApp
 * links and structured data all read the same values, and so changing a phone
 * number is a config change rather than a search across components.
 */
import { env } from "./env.js";

const brand = Object.freeze({
  name: "MOSSANO MARMO",
  wordmark: "MOSSANO",
  tagline: "Curated Natural Stone. Sourced Globally.",
  /** From the catalogue covers, verbatim. */
  strapline: "Curators of Exceptional Natural Stone",

  phones: ["9619176132", "9136116132"],
  whatsappNumber: env.WHATSAPP_NUMBER,
  email: "mossanogroup@gmail.com",

  address: {
    line1: "Natural Stone House, Survey No. 172",
    line2: "New Marble Market",
    city: "Kishangarh",
    state: "Rajasthan",
    postalCode: "305801",
    country: "India",
  },

  /** Printed on the client's material; the site is being built for it. */
  canonicalDomain: "www.mossanomarmo.com",
  baseUrl: env.PUBLIC_BASE_URL,
});

export { brand };
