import { z } from "zod";
import { isApplicationSlug } from "../stone/stone.constants.js";

const applicationSlugSchema = z
  .string()
  .refine(isApplicationSlug, { message: "Choose an application category" });
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

const instagramUrlSchema = z
  .string()
  .trim()
  .url("Enter a full Instagram URL")
  .refine((u) => /^https?:\/\/(www\.)?instagram\.com\//i.test(u), {
    message: "That is not an instagram.com link",
  })
  .max(500);

const applicationBodyCreateSchema = z.object({
  title: z.string().trim().min(1, "Give this a title").max(160),
  application: applicationSlugSchema,
  projectName: optionalText(160),
  location: optionalText(160),
  architect: optionalText(160),
  description: optionalText(4000),
  coverImage: objectIdSchema.optional(),
  imageIds: z.array(objectIdSchema).max(60).optional(),
  stoneIds: z.array(objectIdSchema).max(60).optional(),

  // Phase-1 feedback §6 — the Projects page.
  videoIds: z.array(objectIdSchema).max(12).optional(),

  /**
   * Phase-2 feedback §3. Restricted to instagram.com so a paste of the wrong
   * link fails here rather than rendering an empty embed on the live page.
   */
  instagramUrls: z.array(instagramUrlSchema).max(12).optional(),
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

/** Phase-2 feedback §5 — an application page's own content. */
const applicationContentSaveSchema = makeSchema({
  params: z.object({ application: applicationSlugSchema }),
  body: z.object({
    headline: optionalText(120),
    description: optionalText(4000),
    imageIds: z.array(objectIdSchema).max(40).optional(),
    isPublished: z.boolean().optional().default(true),
  }),
});

/** Phase-3 feedback — a reel on the Projects page's Videos tab. */
const projectVideoBodySchema = z
  .object({
    title: z.string().trim().min(1, "Give this a title").max(160),
    instagramUrl: instagramUrlSchema.optional(),
    video: objectIdSchema.optional(),
    location: optionalText(160),
    isPublished: z.boolean().optional().default(true),
  })
  .refine((b) => b.instagramUrl || b.video, {
    message: "Upload a video or paste an Instagram link",
    path: ["video"],
  });

/** PATCH takes the whole record, as the admin form sends it, so a cleared
    field is cleared rather than left as it was. */
const projectVideoCreateSchema = makeSchema({ body: projectVideoBodySchema });
const projectVideoUpdateSchema = makeSchema({
  params: idParamSchema,
  body: projectVideoBodySchema,
});
const projectVideoDeleteSchema = makeSchema({ params: idParamSchema });

/** A new Shop by Application category. */
const applicationCategoryCreateSchema = makeSchema({
  body: z.object({ label: z.string().trim().min(2, "Name the application").max(60) }),
});
const applicationCategoryDeleteSchema = makeSchema({
  params: z.object({ slug: applicationSlugSchema }),
});

export {
  applicationCategoryCreateSchema,
  applicationCategoryDeleteSchema,
  projectVideoCreateSchema,
  projectVideoUpdateSchema,
  projectVideoDeleteSchema,
  applicationListSchema,
  applicationCreateSchema,
  applicationGetSchema,
  applicationUpdateSchema,
  applicationDeleteSchema,
  applicationContentSaveSchema,
};
