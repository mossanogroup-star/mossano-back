import { z } from "zod";
import {
  objectIdSchema,
  searchSchema,
  booleanQuerySchema,
  emailSchema,
  phoneSchema,
  optionalText,
  flexDateSchema,
} from "../../utils/validationPrimitives.js";
import {
  makeSchema,
  idParamSchema,
  tokenParamSchema,
  buildListQuery,
  toUpdateSchema,
} from "../../utils/resourceValidationHelpers.js";

const selectionItemSchema = z.object({
  stone: objectIdSchema,
  note: optionalText(600),
});

const selectionBodyCreateSchema = z.object({
  title: z.string().trim().min(1, "Give the selection a title").max(160),
  customerName: z.string().trim().min(1, "Who is this prepared for?").max(160),
  projectName: optionalText(160),
  customerEmail: emailSchema().optional(),
  customerPhone: phoneSchema.optional(),
  introduction: optionalText(3000),

  // Either shape is accepted: a plain ordered id list, or annotated items.
  stoneIds: z.array(objectIdSchema).max(80).optional(),
  items: z.array(selectionItemSchema).max(80).optional(),

  imageIds: z.array(objectIdSchema).max(30).optional(),
  sourceEnquiry: objectIdSchema.optional(),

  expiresAt: flexDateSchema.optional(),
  isPublished: z.boolean().optional().default(false),
});

const selectionBodyUpdateSchema = toUpdateSchema(selectionBodyCreateSchema);

const selectionListSchema = makeSchema({
  query: buildListQuery({
    search: searchSchema,
    publishedOnly: booleanQuerySchema,
    includeRevoked: booleanQuerySchema,
  }),
});

const selectionCreateSchema = makeSchema({ body: selectionBodyCreateSchema });
const selectionGetSchema = makeSchema({ params: idParamSchema });
const selectionUpdateSchema = makeSchema({
  params: idParamSchema,
  body: selectionBodyUpdateSchema,
});
const selectionDeleteSchema = makeSchema({ params: idParamSchema });
const selectionActionSchema = makeSchema({ params: idParamSchema });

const selectionNoteSchema = makeSchema({
  params: idParamSchema,
  body: z.object({ body: z.string().trim().min(1, "Write a note").max(3000) }),
});

/** Public routes: the token is the whole address. */
const selectionByTokenSchema = makeSchema({ params: tokenParamSchema });

export {
  selectionListSchema,
  selectionCreateSchema,
  selectionGetSchema,
  selectionUpdateSchema,
  selectionDeleteSchema,
  selectionActionSchema,
  selectionNoteSchema,
  selectionByTokenSchema,
};
