import { toMediaDto } from "../media/media.dto.js";
import { toPublicStoneDto } from "../stone/stone.dto.js";
import { env } from "../../config/env.js";
import { whatsappLink, selectionMessage } from "../../utils/whatsapp.js";

/**
 * What the customer holding the link sees.
 *
 * The token is not echoed back, the team's internal notes are not included, and
 * neither is the view count — the customer should not be able to tell how
 * closely their browsing is being watched. Website §9's four actions (favourite,
 * request more information, WhatsApp, request reservation) are all the page
 * needs, and they are all present.
 */
function toPublicSelectionDto(doc, items) {
  if (!doc) return null;

  return {
    reference: doc.reference,
    title: doc.title,
    customerName: doc.customerName,
    projectName: doc.projectName ?? null,
    introduction: doc.introduction || "",
    preparedOn: doc.createdAt,
    expiresAt: doc.expiresAt ?? null,

    images: (doc.images ?? []).map(toMediaDto).filter(Boolean),

    stones: (items ?? []).map(({ stone, note }) => ({
      ...toPublicStoneDto(stone),
      selectionNote: note,
    })),
    stoneCount: items?.length ?? 0,

    whatsapp: whatsappLink(selectionMessage(doc)),
    pdfUrl: `${env.PUBLIC_BASE_URL}/selection/${doc.token}/pdf`,
  };
}

/** The admin's view: everything, including the link and how it has been used. */
function toAdminSelectionDto(doc, items) {
  if (!doc) return null;

  return {
    id: String(doc._id),
    reference: doc.reference,
    title: doc.title,
    customerName: doc.customerName,
    projectName: doc.projectName ?? null,
    customerEmail: doc.customerEmail ?? null,
    customerPhone: doc.customerPhone ?? null,
    introduction: doc.introduction || "",

    items: (doc.items ?? []).map((i) => ({ stoneId: String(i.stone), note: i.note ?? null })),
    stones: items ? items.map(({ stone, note }) => ({ ...toPublicStoneDto(stone), selectionNote: note })) : undefined,
    stoneCount: doc.items?.length ?? 0,

    images: (doc.images ?? []).map(toMediaDto).filter(Boolean),
    imageIds: (doc.images ?? []).map((m) => String(m?._id ?? m)),

    token: doc.token,
    url: `${env.PUBLIC_BASE_URL}/selection/${doc.token}`,
    pdfUrl: `${env.PUBLIC_BASE_URL}/selection/${doc.token}/pdf`,
    isPublished: Boolean(doc.isPublished),
    isRevoked: Boolean(doc.isRevoked),
    expiresAt: doc.expiresAt ?? null,
    isExpired: Boolean(doc.expiresAt && doc.expiresAt <= new Date()),

    viewCount: doc.viewCount ?? 0,
    firstViewedAt: doc.firstViewedAt ?? null,
    lastViewedAt: doc.lastViewedAt ?? null,

    notes: (doc.notes ?? []).map((n) => ({
      id: String(n._id),
      body: n.body,
      authorName: n.authorName ?? null,
      createdAt: n.createdAt,
    })),

    sourceEnquiry: doc.sourceEnquiry
      ? {
          id: String(doc.sourceEnquiry._id ?? doc.sourceEnquiry),
          reference: doc.sourceEnquiry.reference ?? null,
        }
      : null,
    createdBy: doc.createdBy?.name ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export { toPublicSelectionDto, toAdminSelectionDto };
