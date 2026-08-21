import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

const searchSchema = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : undefined));

const pageSchema = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => Number(v || 1))
  .pipe(z.number().int().min(1));

const limitSchema = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => Number(v || 24))
  .pipe(z.number().int().min(1).max(200));

/**
 * Query strings arrive as text, so "true"/"false" have to be coerced. Anything
 * unrecognised folds to undefined rather than erroring — a filter toggle
 * should never 400 a catalogue page.
 */
const booleanQuerySchema = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((v) => {
    if (typeof v === "boolean") return v;
    if (v === "true") return true;
    if (v === "false") return false;
    return undefined;
  });

const emptyObjectPassthroughSchema = z.object({}).passthrough();

/**
 * Optional integer query param. An empty string means "not supplied" (a blank
 * filter box), so it folds to undefined rather than being coerced to 0.
 */
function intQuerySchema(min = 0, max) {
  return z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined || v === "" ? undefined : Number(v)))
    .pipe(
      max === undefined
        ? z.number().int().min(min).optional()
        : z.number().int().min(min).max(max).optional(),
    );
}

/**
 * A comma-separated query param (?look=dramatic,dark-moody) or a repeated one
 * (?look=a&look=b), normalised to a de-duplicated string array either way.
 * The Stone Shop's filter rail sends both shapes depending on the control.
 */
const csvQuerySchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    const list = Array.isArray(v) ? v : String(v).split(",");
    const cleaned = [
      ...new Set(list.map((s) => String(s).trim()).filter(Boolean)),
    ];
    return cleaned.length ? cleaned : undefined;
  });

/** A url-safe slug: lower-case letters, digits and single hyphens. */
const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be a slug, e.g. black-marquina")
  .max(160);

/**
 * An Indian mobile or landline as customers actually type it — with spaces,
 * hyphens, a +91, or none of those. Stored as entered, normalised only when a
 * wa.me link is built from it.
 */
const phoneSchema = z
  .string()
  .trim()
  .min(6, "Enter a contact number")
  .max(24)
  .refine(
    (v) => v.replace(/\D/g, "").length >= 8,
    "Enter a valid contact number",
  );

function emailSchema(message = "Enter a valid email address") {
  return z.string().trim().toLowerCase().email(message);
}

/**
 * Optional free text. An empty string collapses to undefined so clearing an
 * input does not write "" over a real value — and so the storefront's
 * "On request" rule keys off one absent state rather than two.
 */
function optionalText(max = 500) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));
}

/** Accepts DD/MM/YYYY or ISO and converts to a Date. */
const flexDateSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    let date;
    if (v.includes("/")) {
      const [d, m, y] = v.split("/");
      date = new Date(
        `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00.000Z`,
      );
    } else {
      date = new Date(v);
    }
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid date" });
      return z.NEVER;
    }
    return date;
  });

export {
  objectIdSchema,
  searchSchema,
  pageSchema,
  limitSchema,
  booleanQuerySchema,
  intQuerySchema,
  csvQuerySchema,
  slugSchema,
  phoneSchema,
  emailSchema,
  optionalText,
  flexDateSchema,
  emptyObjectPassthroughSchema,
};
