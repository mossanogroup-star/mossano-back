/**
 * @module VisitorKeyModel
 * @description Who has already given MOSSANO their email and phone, so the
 * storefront's image-view popup is not asked again on another device or in a
 * private window (client request, 20 Nov 2026).
 *
 * One document per thing we recognise them by: the network they sent it from,
 * their email, their phone. Stored as a SHA-256 hash only — this collection
 * answers "have we seen this before?" and never needs to give a value back.
 *
 * Network (IP) keys expire after VISITOR_IP_DAYS, because addresses are
 * reassigned; email and phone keys have no `expiresAt` and so never expire.
 */
import mongoose from "mongoose";

const VisitorKeySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    expiresAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

// TTL: Mongo removes a document once `expiresAt` has passed; documents
// without the field are left alone.
VisitorKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const VisitorKeyModel = mongoose.model("VisitorKey", VisitorKeySchema);

export { VisitorKeyModel };
