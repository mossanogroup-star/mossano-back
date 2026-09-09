/**
 * Brand facts, transcribed from the client's own material — see
 * CLIENT-FACTS.md. Nothing here is invented copy.
 *
 * It lives on the server so the storefront's footer, contact page, WhatsApp
 * links and structured data all read the same values, and so changing a phone
 * number is a config change rather than a search across components.
 */
import { env } from "./env.js";

/**
 * The three offices printed under GET IN TOUCH in the client's brochure.
 *
 * This replaces the Kishangarh address, which came from a partially obscured
 * scan of the earlier catalogue and was never confirmed — the brochure names
 * Mumbai twice and Dubai once, and Kishangarh nowhere. The state is the only
 * value not printed verbatim; Mumbai is in Maharashtra.
 */
const HEAD_OFFICE = Object.freeze({
  label: "Head Office",
  line1: "20 V.V. Chandan Street, 4, Kanch Wala Bldg",
  line2: "1st Floor",
  city: "Mumbai",
  state: "Maharashtra",
  postalCode: "400003",
  country: "India",
});

const STUDIO = Object.freeze({
  label: "Studio",
  line1: "703, 7th Floor, Accord Classic",
  line2: "Near Goregaon Railway Station, Goregaon",
  city: "Mumbai",
  state: "Maharashtra",
  postalCode: "400063",
  country: "India",
});

const DUBAI = Object.freeze({
  label: "Dubai",
  line1: "1035, 1st Floor, DBCS Building",
  line2: "Al Qusais",
  city: "Dubai",
  state: "",
  postalCode: "",
  country: "United Arab Emirates",
});

const brand = Object.freeze({
  name: "MOSSANO MARMO",
  wordmark: "MOSSANO",
  tagline: "Curated Natural Stone. Sourced Globally.",
  /** From the catalogue covers, verbatim. */
  strapline: "Curators of Exceptional Natural Stone",

  phones: ["9619176132", "9136116132"],
  whatsappNumber: env.WHATSAPP_NUMBER,
  email: "mossanogroup@gmail.com",

  /** The footer, the selection PDF and the structured data each show one. */
  address: HEAD_OFFICE,
  locations: Object.freeze([HEAD_OFFICE, STUDIO, DUBAI]),

  /** Printed on the client's material; the site is being built for it. */
  canonicalDomain: "www.mossanomarmo.com",
  baseUrl: env.PUBLIC_BASE_URL,
});

export { brand };
