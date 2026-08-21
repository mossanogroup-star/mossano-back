import { toMediaDto } from "../media/media.dto.js";
import {
  ENQUIRY_TYPE_LABELS,
  ENQUIRY_STATUS_LABELS,
  HIGH_INTENT_TYPES,
} from "./enquiry.constants.js";
import { MATERIALS, COLOURS, labelOf } from "../stone/stone.constants.js";

function toSourcingDto(sourcing) {
  if (!sourcing) return null;
  return {
    material: sourcing.material ?? null,
    materialLabel: labelOf(MATERIALS, sourcing.material),
    colour: sourcing.colour ?? null,
    colourLabel: labelOf(COLOURS, sourcing.colour),
    thickness: sourcing.thickness ?? null,
    quantity: sourcing.quantity ?? null,
    budget: sourcing.budget ?? null,
    projectLocation: sourcing.projectLocation ?? null,
    requiredBy: sourcing.requiredBy ?? null,
    referenceImages: (sourcing.referenceImages ?? [])
      .map(toMediaDto)
      .filter(Boolean),
    wantsMossanoToSelect: Boolean(sourcing.wantsMossanoToSelect),
  };
}

/**
 * The admin inbox shape.
 *
 * There is no public enquiry DTO on purpose: a customer never reads an enquiry
 * back. The public submit endpoint returns only a reference and an
 * acknowledgement, so nothing about the pipeline, the notes or who it is
 * assigned to can leak through a form response.
 */
function toEnquiryDto(doc) {
  if (!doc) return null;

  return {
    id: String(doc._id),
    reference: doc.reference,
    type: doc.type,
    typeLabel: ENQUIRY_TYPE_LABELS[doc.type] ?? doc.type,
    isHighIntent: HIGH_INTENT_TYPES.includes(doc.type),

    name: doc.name,
    email: doc.email ?? null,
    phone: doc.phone ?? null,
    company: doc.company ?? null,
    projectName: doc.projectName ?? null,

    stone: doc.stone
      ? {
          id: String(doc.stone._id ?? doc.stone),
          name: doc.stone.name ?? doc.stoneSnapshot?.name ?? null,
          slug: doc.stone.slug ?? null,
          mossanoCode:
            doc.stone.mossanoCode ?? doc.stoneSnapshot?.mossanoCode ?? null,
          availability: doc.stone.availability ?? null,
          primaryImageUrl: doc.stone.primaryImageUrl ?? null,
        }
      : null,
    // Survives the stone being renamed or removed.
    stoneSnapshot: doc.stoneSnapshot?.mossanoCode ? doc.stoneSnapshot : null,

    edit: doc.edit
      ? { id: String(doc.edit._id ?? doc.edit), title: doc.edit.title ?? null }
      : null,
    selection: doc.selection
      ? {
          id: String(doc.selection._id ?? doc.selection),
          title: doc.selection.title ?? null,
          token: doc.selection.token ?? null,
        }
      : null,

    requirement: doc.requirement ?? null,
    message: doc.message ?? null,
    sourcing: toSourcingDto(doc.sourcing),

    status: doc.status,
    statusLabel: ENQUIRY_STATUS_LABELS[doc.status] ?? doc.status,
    assignedTo: doc.assignedTo
      ? {
          id: String(doc.assignedTo._id ?? doc.assignedTo),
          name: doc.assignedTo.name ?? null,
        }
      : null,
    firstRespondedAt: doc.firstRespondedAt ?? null,

    notes: (doc.notes ?? []).map((n) => ({
      id: String(n._id),
      body: n.body,
      authorName: n.authorName ?? null,
      createdAt: n.createdAt,
    })),

    sourcePath: doc.sourcePath ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** What a customer gets back after submitting. Deliberately almost nothing. */
function toSubmissionReceiptDto(doc) {
  return {
    reference: doc.reference,
    type: doc.type,
    receivedAt: doc.createdAt,
  };
}

export { toEnquiryDto, toSubmissionReceiptDto, toSourcingDto };
