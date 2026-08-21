import { z } from "zod";
import { emailSchema } from "../../utils/validationPrimitives.js";
import { makeSchema } from "../../utils/resourceValidationHelpers.js";

const loginSchema = makeSchema({
  body: z.object({
    email: emailSchema(),
    password: z.string().min(1, "Enter your password"),
  }),
});

const changePasswordSchema = makeSchema({
  body: z.object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(10, "Use at least 10 characters")
      .max(200)
      .refine(
        (v) => /[a-zA-Z]/.test(v) && /\d/.test(v),
        "Include at least one letter and one number",
      ),
  }),
});

export { loginSchema, changePasswordSchema };
