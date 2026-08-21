import { z } from "zod";
import { EDIT_STATUSES } from "./edit.model.js";
import {
  objectIdSchema,
  searchSchema,
  csvQuerySchema,
  booleanQuerySchema,
  optionalText,
  flexDateSchema,
} from "../../utils/validationPrimitives.js";
import {
  makeSchema,
  idParamSchema,
  slugParamSchema,
  buildListQuery,
  toUpdateSchema,
} from "../../utils/resourceValidationHelpers.js";

const editBodyCreateSchema = z.object({
  title: z.string().trim().min(1, "Give the Edit a title, e.g. August 2026").max(120),
  subtitle: optionalText(200),
  description: optionalText(4000),
  status: z.enum(EDIT_STATUSES).optional().default("upcoming"),
  periodStart: flexDateSchema.optional(),
  coverImage: objectIdSchema.optional(),
  imageIds: z.array(objectIdSchema).max(40).optional(),
  stoneIds: z.array(objectIdSchema).max(200).optional(),
  isPublished: z.boolean().optional().default(false),
});

const editBodyUpdateSchema = toUpdateSchema(editBodyCreateSchema);

const editListSchema = makeSchema({
  query: buildListQuery({
    search: searchSchema,
    status: csvQuerySchema,
    publishedOnly: booleanQuerySchema,
    includeArchived: booleanQuerySchema,
  }),
});

const editCreateSchema = makeSchema({ body: editBodyCreateSchema });
const editGetSchema = makeSchema({ params: idParamSchema });
const editGetBySlugSchema = makeSchema({ params: slugParamSchema });
const editUpdateSchema = makeSchema({
  params: idParamSchema,
  body: editBodyUpdateSchema,
});
const editDeleteSchema = makeSchema({ params: idParamSchema });

const editStatusSchema = makeSchema({
  params: idParamSchema,
  body: z.object({ status: z.enum(EDIT_STATUSES) }),
});

const editAddStonesSchema = makeSchema({
  params: idParamSchema,
  body: z.object({
    stoneIds: z.array(objectIdSchema).min(1, "Choose at least one stone").max(200),
  }),
});

const editRemoveStoneSchema = makeSchema({
  params: z.object({ id: objectIdSchema, stoneId: objectIdSchema }),
});

export {
  editListSchema,
  editCreateSchema,
  editGetSchema,
  editGetBySlugSchema,
  editUpdateSchema,
  editDeleteSchema,
  editStatusSchema,
  editAddStonesSchema,
  editRemoveStoneSchema,
};
