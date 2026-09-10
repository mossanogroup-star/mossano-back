import { z } from "zod";
import { APPLICATION_SLUGS } from "../stone/stone.constants.js";
import { PROJECT_SECTOR_SLUGS } from "./application.model.js";
import {
  objectIdSchema,
  searchSchema,
  csvQuerySchema,
  booleanQuerySchema,
  optionalText,
} from "../../utils/validationPrimitives.js";
import {
  makeSchema,
  idParamSchema,
  buildListQuery,
  toUpdateSchema,
} from "../../utils/resourceValidationHelpers.js";

const applicationBodyCreateSchema = z.object({
  title: z.string().trim().min(1, "Give this a title").max(160),
  application: z.enum(APPLICATION_SLUGS, {
    message: "Choose an application category",
  }),
  projectName: optionalText(160),
  location: optionalText(160),
  architect: optionalText(160),
  description: optionalText(4000),
  coverImage: objectIdSchema.optional(),
  imageIds: z.array(objectIdSchema).max(60).optional(),
  stoneIds: z.array(objectIdSchema).max(60).optional(),

  // Phase-1 feedback §6 — the Projects page.
  videoIds: z.array(objectIdSchema).max(12).optional(),
  links: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(80),
        url: z.string().trim().url("Enter a full URL, including https://").max(500),
      }),
    )
    .max(8)
    .optional(),
  sector: z.enum(PROJECT_SECTOR_SLUGS).optional(),
  areaSqFt: z.number().min(0).max(10_000_000).optional(),

  isFeatured: z.boolean().optional().default(false),
  isPublished: z.boolean().optional().default(true),
});

const applicationBodyUpdateSchema = toUpdateSchema(applicationBodyCreateSchema);

const applicationListSchema = makeSchema({
  query: buildListQuery({
    search: searchSchema,
    application: csvQuerySchema,
    featured: booleanQuerySchema,
    publishedOnly: booleanQuerySchema,
    stoneId: objectIdSchema.optional(),
  }),
});

const applicationCreateSchema = makeSchema({
  body: applicationBodyCreateSchema,
});
const applicationGetSchema = makeSchema({ params: idParamSchema });
const applicationUpdateSchema = makeSchema({
  params: idParamSchema,
  body: applicationBodyUpdateSchema,
});
const applicationDeleteSchema = makeSchema({ params: idParamSchema });

export {
  applicationListSchema,
  applicationCreateSchema,
  applicationGetSchema,
  applicationUpdateSchema,
  applicationDeleteSchema,
};
