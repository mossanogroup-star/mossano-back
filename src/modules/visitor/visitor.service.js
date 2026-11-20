import crypto from "node:crypto";
import { VisitorKeyModel } from "./visitor.model.js";
import { EnquiryModel } from "../enquiry/enquiry.model.js";
import { logger } from "../../config/logger.js";

/**
 * How long a network that sent details is remembered. Same Wi-Fi, any device
 * or private window, is let through for this long.
 */
const VISITOR_IP_DAYS = 60;

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

const normaliseEmail = (value) => String(value ?? "").trim().toLowerCase();

/**
 * The last ten digits: "+91 98765 43210", "098765-43210" and "9876543210" are
 * one number. Shorter numbers are kept whole.
 */
const normalisePhone = (value) => String(value ?? "").replace(/\D/g, "").slice(-10);

const ipKey = (ip) => (ip ? hash(`ip:${ip}`) : null);
const emailKey = (email) => (normaliseEmail(email) ? hash(`email:${normaliseEmail(email)}`) : null);
const phoneKey = (phone) =>
  normalisePhone(phone).length >= 8 ? hash(`phone:${normalisePhone(phone)}`) : null;

async function upsertKeys(keys) {
  const ops = keys
    .filter((k) => k.key)
    .map(({ key, expiresAt }) => ({
      updateOne: {
        filter: { key },
        update: expiresAt ? { $set: { expiresAt } } : { $unset: { expiresAt: 1 } },
        upsert: true,
      },
    }));
  if (ops.length) await VisitorKeyModel.bulkWrite(ops, { ordered: false });
}

/**
 * Leads that came in before this collection existed are only in the enquiry
 * inbox, so a contact we do not hold a key for is looked up there too.
 */
async function enquiryHasContact({ email, phone }) {
  if (email) {
    return Boolean(await EnquiryModel.exists({ email, isDeleted: false }));
  }
  // Stored as typed, so match the digits with anything between them.
  const pattern = new RegExp(`${phone.split("").join("\\D*")}\\D*$`);
  return Boolean(await EnquiryModel.exists({ phone: pattern, isDeleted: false }));
}

/** Reads "email or phone" from one input: anything with an @ is an email. */
function parseContact(contact) {
  const raw = String(contact ?? "").trim();
  if (raw.includes("@")) return { email: normaliseEmail(raw) };
  const phone = normalisePhone(raw);
  return phone.length >= 8 ? { phone } : null;
}

const visitorService = {
  /** Has anyone on this network already shared their details? */
  async isKnownIp(ip) {
    const key = ipKey(ip);
    if (!key) return false;
    return Boolean(await VisitorKeyModel.exists({ key }));
  },

  /**
   * Called after any enquiry that carried both an email and a phone — the
   * same rule the storefront uses to stop asking. Never throws: failing to
   * remember someone must not fail the enquiry they just sent.
   */
  async remember({ ip, email, phone }) {
    if (!email || !phone) return;
    try {
      await upsertKeys([
        { key: ipKey(ip), expiresAt: new Date(Date.now() + VISITOR_IP_DAYS * 864e5) },
        { key: emailKey(email) },
        { key: phoneKey(phone) },
      ]);
    } catch (err) {
      logger.warn({ err }, "Could not remember visitor");
    }
  },

  /**
   * "Already shared your details?" — the visitor types the email or phone
   * they gave before. Known → this network is remembered too, so the next
   * device on it is not asked at all.
   */
  async recognise({ ip, contact }) {
    const parsed = parseContact(contact);
    if (!parsed) return false;

    const key = parsed.email ? emailKey(parsed.email) : phoneKey(parsed.phone);
    const known =
      Boolean(await VisitorKeyModel.exists({ key })) || (await enquiryHasContact(parsed));
    if (!known) return false;

    await upsertKeys([
      { key },
      { key: ipKey(ip), expiresAt: new Date(Date.now() + VISITOR_IP_DAYS * 864e5) },
    ]).catch((err) => logger.warn({ err }, "Could not remember recognised visitor"));
    return true;
  },
};

export { visitorService, normalisePhone };
