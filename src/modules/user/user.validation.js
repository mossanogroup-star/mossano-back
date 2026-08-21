import { z } from "zod";
import { ROLES } from "./user.model.js";
import { emailSchema, searchSchema } from "../../utils/validationPrimitives.js";
import {
  makeSchema,
  idParamSchema,
  buildListQuery,
  toUpdateSchema,
} from "../../utils/resourceValidationHelpers.js";

const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(200)
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "Include at least one letter and one number");

const userBodyCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: emailSchema(),
  password: passwordSchema,
  role: z.enum(ROLES).optional().default("editor"),
  isActive: z.boolean().optional().default(true),
});

// Password is optional on update, and only replaced when actually supplied.
const userBodyUpdateSchema = toUpdateSchema(userBodyCreateSchema).extend({
  password: passwordSchema.optional(),
});

const userListSchema = makeSchema({
  query: buildListQuery({ search: searchSchema }),
});
const userCreateSchema = makeSchema({ body: userBodyCreateSchema });
const userGetSchema = makeSchema({ params: idParamSchema });
const userUpdateSchema = makeSchema({
  params: idParamSchema,
  body: userBodyUpdateSchema,
});
const userDeleteSchema = makeSchema({ params: idParamSchema });

export { userListSchema, userCreateSchema, userGetSchema, userUpdateSchema, userDeleteSchema };
