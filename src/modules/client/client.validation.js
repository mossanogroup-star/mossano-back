import { z } from "zod";
import { objectIdSchema } from "../../utils/validationPrimitives.js";
import {
  makeSchema,
  idParamSchema,
  toUpdateSchema,
} from "../../utils/resourceValidationHelpers.js";

const categoryBodyCreateSchema = z.object({
  name: z.string().trim().min(1, "Give the category a name").max(80),
  sortOrder: z.number().int().min(0).max(999).optional().default(0),
  isPublished: z.boolean().optional().default(true),
});

const clientBodyCreateSchema = z.object({
  name: z.string().trim().min(1, "Give the client a name").max(120),
  category: objectIdSchema,
  logo: objectIdSchema.optional(),
  /** Optional, but must be a real URL when given — it becomes an href. */
  website: z.string().trim().url("Enter a full URL, including https://").max(500).optional(),
  sortOrder: z.number().int().min(0).max(999).optional().default(0),
  isPublished: z.boolean().optional().default(true),
});

const categoryCreateSchema = makeSchema({ body: categoryBodyCreateSchema });
const categoryUpdateSchema = makeSchema({
  params: idParamSchema,
  body: toUpdateSchema(categoryBodyCreateSchema),
});
const categoryDeleteSchema = makeSchema({ params: idParamSchema });

const clientCreateSchema = makeSchema({ body: clientBodyCreateSchema });
const clientUpdateSchema = makeSchema({
  params: idParamSchema,
  body: toUpdateSchema(clientBodyCreateSchema),
});
const clientDeleteSchema = makeSchema({ params: idParamSchema });

export {
  categoryCreateSchema,
  categoryUpdateSchema,
  categoryDeleteSchema,
  clientCreateSchema,
  clientUpdateSchema,
  clientDeleteSchema,
};
