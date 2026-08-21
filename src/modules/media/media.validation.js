import { z } from "zod";
import { MEDIA_KINDS } from "./media.model.js";
import { searchSchema, optionalText } from "../../utils/validationPrimitives.js";
import {
  makeSchema,
  idParamSchema,
  buildListQuery,
} from "../../utils/resourceValidationHelpers.js";

const mediaListSchema = makeSchema({
  query: buildListQuery({
    kind: z.enum(MEDIA_KINDS).optional(),
    search: searchSchema,
  }),
});

/**
 * Upload metadata travels as multipart form fields, so every value arrives as
 * a string — no coercion needed here, but nothing may be typed as a number.
 */
const mediaUploadSchema = makeSchema({
  body: z.object({
    kind: z.enum(MEDIA_KINDS).optional().default("general"),
    alt: optionalText(300),
    caption: optionalText(300),
  }),
});

const mediaUpdateSchema = makeSchema({
  params: idParamSchema,
  body: z.object({
    alt: optionalText(300),
    caption: optionalText(300),
    kind: z.enum(MEDIA_KINDS).optional(),
  }),
});

const mediaGetSchema = makeSchema({ params: idParamSchema });
const mediaDeleteSchema = makeSchema({ params: idParamSchema });

export {
  mediaListSchema,
  mediaUploadSchema,
  mediaUpdateSchema,
  mediaGetSchema,
  mediaDeleteSchema,
};
