/**
 * The executive's alert, transcribed from the client's own document.
 *
 * The Website document's second drop specifies this verbatim:
 *
 *     New Stone Enquiry – Mossano
 *     Customer: [Name]   Product/Project: [Project]   Interest: Yes
 *     Quantity: 5,000 sqft   Location: Mumbai   Required Delivery: 1 month
 *     Customer contact: +91 XXXXX XXXXX
 *     View enquiry: [CRM link]
 *
 * Kept close to that wording on purpose — it is what the team asked to receive,
 * and it is what they will be scanning on a phone. The one liberty taken is
 * omitting a line entirely when its value is unknown, rather than printing
 * "Quantity: —". A half-filled template is harder to read at a glance than a
 * short one, and the same "never state what we do not know" rule that governs
 * the storefront applies to what the team is told.
 */
import { env } from "../../config/env.js";
import { ENQUIRY_TYPE_LABELS } from "../../modules/enquiry/enquiry.constants.js";

/** "+91 98200 11223" from whatever the customer typed. */
function formatContact(phone, email) {
  if (phone) {
    const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length === 10)
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    return phone.startsWith("+") ? phone : `+${digits}`;
  }
  return email || "not given";
}

function buildEnquiryAlert(enquiry) {
  const s = enquiry.sourcing ?? {};
  const stone = enquiry.stoneSnapshot?.mossanoCode
    ? `${enquiry.stoneSnapshot.mossanoCode} ${enquiry.stoneSnapshot.name ?? ""}`.trim()
    : null;

  const lines = [
    `New Stone Enquiry – Mossano`,
    ``,
    `Customer: ${enquiry.name}`,
  ];

  // Product/Project: the stone they asked about, or the project they named.
  const subject = stone ?? enquiry.projectName;
  if (subject) lines.push(`Product/Project: ${subject}`);
  if (enquiry.company) lines.push(`Company: ${enquiry.company}`);

  lines.push(`Interest: Yes`);

  if (s.quantity) lines.push(`Quantity: ${s.quantity}`);
  if (s.projectLocation) lines.push(`Location: ${s.projectLocation}`);
  if (s.requiredBy) lines.push(`Required Delivery: ${s.requiredBy}`);
  if (s.material) lines.push(`Material: ${s.material}`);

  lines.push(
    `Customer contact: ${formatContact(enquiry.phone, enquiry.email)}`,
  );

  if (enquiry.message) lines.push(``, `"${enquiry.message}"`);

  lines.push(
    ``,
    `Source: ${ENQUIRY_TYPE_LABELS[enquiry.type] ?? enquiry.type}  ·  Ref ${enquiry.reference}`,
    `View enquiry: ${env.PUBLIC_BASE_URL}/admin/enquiries/${enquiry._id ?? enquiry.id}`,
  );

  return lines.join("\n");
}

/** Subject line for the email provider. */
function buildEnquirySubject(enquiry) {
  const stone = enquiry.stoneSnapshot?.mossanoCode;
  return `New enquiry ${enquiry.reference} — ${enquiry.name}${stone ? ` (${stone})` : ""}`;
}

export { buildEnquiryAlert, buildEnquirySubject, formatContact };
