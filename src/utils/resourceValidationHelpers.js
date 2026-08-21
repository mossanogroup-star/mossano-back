/**
 * Shared Zod builders — they remove the body/params/query boilerplate that
 * would otherwise repeat in every validation file.
 *
 *   makeSchema({ params: idParamSchema })              → /:id only
 *   makeSchema({ body: X, params: idParamSchema })     → PATCH /:id
 *   makeSchema({ query: buildListQuery({ search }) })  → a list endpoint
 */
import { z } from "zod";
import {
  objectIdSchema,
  pageSchema,
  limitSchema,
  emptyObjectPassthroughSchema,
} from "./validationPrimitives.js";

const idParamSchema = z.object({ id: objectIdSchema });

/** Public routes address a stone or an edit by slug, not by id. */
const slugParamSchema = z.object({ slug: z.string().trim().min(1).max(160) });

/** Private-selection links are addressed by an unguessable token. */
const tokenParamSchema = z.object({ token: z.string().trim().min(16).max(120) });

function makeSchema({ body, params, query } = {}) {
  return z.object({
    body: body ?? emptyObjectPassthroughSchema,
    params: params ?? emptyObjectPassthroughSchema,
    query: query ?? emptyObjectPassthroughSchema,
  });
}

function buildListQuery(extraFields = {}) {
  return z.object({
    page: pageSchema,
    limit: limitSchema,
    ...extraFields,
  });
}

/**
 * Recursively unwrap `.default()` (and any `.optional()` around it) from one
 * field, so an absent key stays absent instead of materialising its default.
 */
function stripDefault(field) {
  let current = field;
  // A field can be wrapped more than once, e.g. .optional().default(x).
  for (let i = 0; i < 5; i++) {
    if (current instanceof z.ZodDefault) {
      current = current.def.innerType;
      continue;
    }
    if (current instanceof z.ZodOptional && current.def.innerType instanceof z.ZodDefault) {
      current = current.def.innerType.def.innerType.optional();
      continue;
    }
    break;
  }
  return current;
}

/**
 * Build the PATCH counterpart of a create schema.
 *
 * `.partial()` alone is not enough. Zod applies a field's `.default()` whenever
 * the key is absent from the input, and `.partial()` does not remove defaults —
 * so `PATCH { notes: "x" }` against a schema carrying
 * `availability: z.enum([...]).default("verification_required")` would parse to
 * `{ notes: "x", availability: "verification_required" }` and silently reset a
 * stone that was marked Sold. Stripping the defaults first means a PATCH only
 * ever touches the fields it actually names.
 */
function toUpdateSchema(createSchema) {
  const shape = createSchema.shape;
  const stripped = {};
  for (const key of Object.keys(shape)) {
    stripped[key] = stripDefault(shape[key]);
  }
  return z.object(stripped).partial();
}

export {
  makeSchema,
  idParamSchema,
  slugParamSchema,
  tokenParamSchema,
  buildListQuery,
  toUpdateSchema,
};
