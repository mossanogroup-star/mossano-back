import { z } from "zod";
import {
  AVAILABILITY,
  LOOK_SLUGS,
  APPLICATION_SLUGS,
  MATERIAL_SLUGS,
  COLOUR_SLUGS,
  FINISH_SLUGS,
} from "./stone.constants.js";
import { SORTS } from "./stone.repository.js";
import {
  objectIdSchema,
  searchSchema,
  csvQuerySchema,
  booleanQuerySchema,
  intQuerySchema,
  optionalText,
} from "../../utils/validationPrimitives.js";
import {
  makeSchema,
  idParamSchema,
  slugParamSchema,
  buildListQuery,
  toUpdateSchema,
} from "../../utils/resourceValidationHelpers.js";

const slabSchema = z.object({
  reference: optionalText(60),
  image: objectIdSchema.optional(),
  lengthIn: z.number().min(0).max(400).optional(),
  widthIn: z.number().min(0).max(400).optional(),
  isSold: z.boolean().optional().default(false),
});

/**
 * Every field the client's catalogues do not carry is optional and has no
 * default. That is the schema-level half of the "never invent client data"
 * rule: there is no shape of request that can put a plausible origin, finish
 * or thickness onto a stone by accident.
 */
const stoneBodyCreateSchema = z.object({
  name: z.string().trim().min(1, "Stone name is required").max(160),
  // Normally generated. Accepted so an existing numbering can be imported.
  mossanoCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^MM-\d{3,}$/, "Use the MM-000 format")
    .optional(),
  lotNumber: optionalText(40),

  material: z.enum(MATERIAL_SLUGS).optional(),
  colour: z.enum(COLOUR_SLUGS).optional(),
  origin: optionalText(80),
  finish: z.enum(FINISH_SLUGS).optional(),
  thicknessMm: z.number().min(0).max(300).optional(),

  slabLengthIn: z.number().min(0).max(400).optional(),
  slabWidthIn: z.number().min(0).max(400).optional(),
  slabCount: z.number().int().min(0).max(10_000).optional(),
  areaSqFt: z.number().min(0).max(1_000_000).optional(),

  looks: z.array(z.enum(LOOK_SLUGS)).max(6).optional().default([]),
  applications: z.array(z.enum(APPLICATION_SLUGS)).max(7).optional().default([]),

  availability: z.enum(AVAILABILITY).optional().default("verification_required"),
  description: optionalText(4000),

  imageIds: z.array(objectIdSchema).max(60).optional(),
  videoIds: z.array(objectIdSchema).max(10).optional(),
  slabs: z.array(slabSchema).max(200).optional(),

  isFeatured: z.boolean().optional().default(false),
  isPublished: z.boolean().optional().default(true),
  internalNotes: optionalText(4000),
});

const stoneBodyUpdateSchema = toUpdateSchema(stoneBodyCreateSchema);

/** The Stone Shop rail (Website §3), shared by the public and admin lists. */
const stoneFilters = {
  search: searchSchema,
  material: csvQuerySchema,
  colour: csvQuerySchema,
  look: csvQuerySchema,
  application: csvQuerySchema,
  availability: csvQuerySchema,
  finish: csvQuerySchema,
  origin: searchSchema,
  featured: booleanQuerySchema,
  minAreaSqFt: intQuerySchema(0),
  sort: z.enum(Object.keys(SORTS)).optional(),
};

const stoneListSchema = makeSchema({ query: buildListQuery(stoneFilters) });

const stoneAdminListSchema = makeSchema({
  query: buildListQuery({
    ...stoneFilters,
    publishedOnly: booleanQuerySchema,
    includeDeleted: booleanQuerySchema,
  }),
});

const stoneCreateSchema = makeSchema({ body: stoneBodyCreateSchema });
const stoneGetSchema = makeSchema({ params: idParamSchema });
const stoneGetBySlugSchema = makeSchema({ params: slugParamSchema });
const stoneUpdateSchema = makeSchema({ params: idParamSchema, body: stoneBodyUpdateSchema });
const stoneDeleteSchema = makeSchema({ params: idParamSchema });

/** Admin Scope §2 — the one edit the team makes from a list row, not a form. */
const stoneAvailabilitySchema = makeSchema({
  params: idParamSchema,
  body: z.object({ availability: z.enum(AVAILABILITY) }),
});

const stoneVerifySchema = makeSchema({ params: idParamSchema });

export {
  stoneListSchema,
  stoneAdminListSchema,
  stoneCreateSchema,
  stoneGetSchema,
  stoneGetBySlugSchema,
  stoneUpdateSchema,
  stoneDeleteSchema,
  stoneAvailabilitySchema,
  stoneVerifySchema,
  stoneFilters,
  stoneBodyCreateSchema,
};
