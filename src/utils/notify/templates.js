/**
 * The executive's alert, worded as the Website document specifies it.
 *
 * A line whose value is unknown is omitted rather than printed empty — the
 * same "never state what we do not know" rule the storefront follows.
 */
import { env } from "../../config/env.js";
import { ENQUIRY_TYPE_LABELS } from "../../modules/enquiry/enquiry.constants.js";

/** "+91 98200 11223" from whatever the customer typed. */
function formatContact(phone, email) {
  if (phone) {
    const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    return phone.startsWith("+") ? phone : `+${digits}`;
  }
  return email || "not given";
}

function buildEnquiryAlert(enquiry) {
  const s = enquiry.sourcing ?? {};
  const stone = enquiry.stoneSnapshot?.mossanoCode
    ? `${enquiry.stoneSnapshot.mossanoCode} ${enquiry.stoneSnapshot.name ?? ""}`.trim()
    : null;

  const lines = [`New Stone Enquiry – Mossano`, ``, `Customer: ${enquiry.name}`];

  // Product/Project: the stone they asked about, or the project they named.
  const subject = stone ?? enquiry.projectName;
  if (subject) lines.push(`Product/Project: ${subject}`);
  if (enquiry.company) lines.push(`Company: ${enquiry.company}`);

  lines.push(`Interest: Yes`);

  if (s.quantity) lines.push(`Quantity: ${s.quantity}`);
  if (s.projectLocation) lines.push(`Location: ${s.projectLocation}`);
  if (s.requiredBy) lines.push(`Required Delivery: ${s.requiredBy}`);
  if (s.material) lines.push(`Material: ${s.material}`);

  lines.push(`Customer contact: ${formatContact(enquiry.phone, enquiry.email)}`);

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
