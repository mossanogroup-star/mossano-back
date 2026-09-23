import { z } from "zod";
import { LOOK_SLUGS } from "../stone/stone.constants.js";
import { objectIdSchema, optionalText } from "../../utils/validationPrimitives.js";
import { makeSchema } from "../../utils/resourceValidationHelpers.js";

const lookContentSaveSchema = makeSchema({
  params: z.object({ look: z.enum(LOOK_SLUGS) }),
  body: z.object({
    headline: optionalText(120),
    description: optionalText(4000),
    imageIds: z.array(objectIdSchema).max(40).optional(),
    isPublished: z.boolean().optional().default(true),
  }),
});

export { lookContentSaveSchema };
