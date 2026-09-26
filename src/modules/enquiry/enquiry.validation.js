import { z } from "zod";
import { ENQUIRY_TYPES, ENQUIRY_STATUSES } from "./enquiry.constants.js";
import { MATERIAL_SLUGS, COLOUR_SLUGS, isApplicationSlug } from "../stone/stone.constants.js";
import {
  objectIdSchema,
  searchSchema,
  csvQuerySchema,
  booleanQuerySchema,
  emailSchema,
  phoneSchema,
  optionalText,
  flexDateSchema,
} from "../../utils/validationPrimitives.js";
import {
  makeSchema,
  idParamSchema,
  buildListQuery,
} from "../../utils/resourceValidationHelpers.js";

/** Website §8 Step 1. Every field optional — a brief arrives half-formed. */
const sourcingBriefSchema = z.object({
  material: z.enum(MATERIAL_SLUGS).optional(),
  colour: z.enum(COLOUR_SLUGS).optional(),
  /** Phase-2 feedback §7 — the chatbot's "what is it for" step. */
  application: z.string().refine(isApplicationSlug, "Unknown application").optional(),
  thickness: optionalText(60),
  quantity: optionalText(60),
  budget: optionalText(60),
  projectLocation: optionalText(160),
  // Free text — see the model. "1mth" is a real answer, not a malformed date.
  requiredBy: optionalText(60),
  referenceImages: z.array(objectIdSchema).max(6).optional(),
  wantsMossanoToSelect: z.boolean().optional().default(false),
});

/**
 * The public submission schema, shared by every form on the site.
 *
 * The one cross-field rule: a customer must leave some way of being reached.
 * Website §11's contact form and §8's sourcing brief both ask for details, and
 * an enquiry with neither an email nor a phone number is not a lead — it is a
 * message nobody can answer.
 *
 * The exception is "reference_image", the floating uploader: Phase-3 feedback,
 * the client wanted it to be the photograph and nothing else. It needs an image
 * instead, and may arrive without a name or any way to reply.
 */
const enquirySubmitBodySchema = z
  .object({
    type: z.enum(ENQUIRY_TYPES).optional().default("general"),
    name: z.string().trim().max(120).optional(),
    email: emailSchema().optional(),
    phone: phoneSchema.optional(),
    company: optionalText(160),
    projectName: optionalText(160),

    // Addressed by slug: it is what the storefront URL already carries, and it
    // does not expose internal ids in the page source.
    stoneSlug: optionalText(160),
    editId: objectIdSchema.optional(),
    selectionToken: optionalText(120),

    requirement: optionalText(2000),
    message: optionalText(4000),
    sourcing: sourcingBriefSchema.optional(),

    sourcePath: optionalText(300),
  })
  .refine((v) => v.type === "reference_image" || Boolean(v.name), {
    message: "Please give your name",
    path: ["name"],
  })
  .refine((v) => v.type === "reference_image" || Boolean(v.email || v.phone), {
    message: "Add an email address or a phone number so MOSSANO can reply",
    path: ["email"],
  })
  .refine((v) => v.type !== "reference_image" || Boolean(v.sourcing?.referenceImages?.length), {
    message: "Add at least one reference image",
    path: ["sourcing"],
  });

const enquirySubmitSchema = makeSchema({ body: enquirySubmitBodySchema });

const enquiryListSchema = makeSchema({
  query: buildListQuery({
    search: searchSchema,
    status: csvQuerySchema,
    type: csvQuerySchema,
    assignedTo: objectIdSchema.optional(),
    stoneId: objectIdSchema.optional(),
    from: flexDateSchema.optional(),
    to: flexDateSchema.optional(),
    includeDeleted: booleanQuerySchema,
  }),
});

const enquiryGetSchema = makeSchema({ params: idParamSchema });

const enquiryStatusSchema = makeSchema({
  params: idParamSchema,
  body: z.object({ status: z.enum(ENQUIRY_STATUSES) }),
});

const enquiryUpdateSchema = makeSchema({
  params: idParamSchema,
  body: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    email: emailSchema().optional(),
    phone: phoneSchema.optional(),
    company: optionalText(160),
    projectName: optionalText(160),
    requirement: optionalText(2000),
    message: optionalText(4000),
  }),
});

const enquiryNoteSchema = makeSchema({
  params: idParamSchema,
  body: z.object({ body: z.string().trim().min(1, "Write a note").max(4000) }),
});

const enquiryAssignSchema = makeSchema({
  params: idParamSchema,
  // null clears the assignment.
  body: z.object({ assignedTo: objectIdSchema.nullable().optional() }),
});

const enquiryDeleteSchema = makeSchema({ params: idParamSchema });

export {
  enquirySubmitSchema,
  enquirySubmitBodySchema,
  enquiryListSchema,
  enquiryGetSchema,
  enquiryStatusSchema,
  enquiryUpdateSchema,
  enquiryNoteSchema,
  enquiryAssignSchema,
  enquiryDeleteSchema,
  sourcingBriefSchema,
};
