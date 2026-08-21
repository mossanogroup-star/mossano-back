/**
 * Every form on the storefront lands in one inbox.
 *
 * Admin Scope §5 asks for a single enquiry list. Splitting reservations,
 * slab-video requests and sourcing briefs into separate screens would give the
 * team four places to check and a customer four ways to be missed — so the
 * shape is one collection with a `type`, and the admin filters it.
 */
const ENQUIRY_TYPES = [
  "general", // Contact page (Website §11)
  "stone", // "Enquire" on a stone page
  "reserve", // "Reserve This Lot" (Website §4)
  "slab_video", // "Request Actual Slab Video" (Website §4)
  "sourcing", // Private Sourcing requirement (Website §8)
  "prebook", // Next Edit (Website §2)
  "register_interest", // Upcoming Edit (Website §2)
  "selection", // raised from inside a private selection (Website §9)
  "chatbot", // the scripted assistant (Website Notes, second drop)
];

const ENQUIRY_TYPE_LABELS = {
  general: "General enquiry",
  stone: "Stone enquiry",
  reserve: "Reservation request",
  slab_video: "Slab video request",
  sourcing: "Private sourcing",
  prebook: "Pre-book",
  register_interest: "Register interest",
  selection: "From a private selection",
  chatbot: "Chatbot",
};

/**
 * Admin Scope §5: "New → Contacted → Interested → Reserved → Purchased".
 *
 * `closed` is the one addition, and it is not a fifth stage — it is the exit.
 * Without it a lead that went nowhere has no resting place and sits in the
 * inbox forever, which is how a team stops trusting the inbox.
 */
const ENQUIRY_STATUSES = [
  "new",
  "contacted",
  "interested",
  "reserved",
  "purchased",
  "closed",
];

const ENQUIRY_STATUS_LABELS = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  reserved: "Reserved",
  purchased: "Purchased",
  closed: "Closed",
};

/** The pipeline as the admin renders it, in order. `closed` sits outside it. */
const ENQUIRY_PIPELINE = [
  "new",
  "contacted",
  "interested",
  "reserved",
  "purchased",
];

/**
 * Which types are urgent. A reservation request against a lot that may sell
 * this afternoon is not the same as a general "tell me more", and the admin
 * dashboard sorts on this.
 */
const HIGH_INTENT_TYPES = [
  "reserve",
  "prebook",
  "selection",
  "sourcing",
  "chatbot",
];

export {
  ENQUIRY_TYPES,
  ENQUIRY_TYPE_LABELS,
  ENQUIRY_STATUSES,
  ENQUIRY_STATUS_LABELS,
  ENQUIRY_PIPELINE,
  HIGH_INTENT_TYPES,
};
