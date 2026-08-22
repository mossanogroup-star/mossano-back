/**
 * Atomic sequence numbers for human-readable references (MM-E-0042).
 *
 * Deriving these from a document count races: two enquiries in the same second
 * read the same count and collide on the unique index, which the customer sees
 * as a failed form. `$inc` is atomic, so every caller gets a distinct number.
 */
import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema(
  {
    _id: { type: String },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

const CounterModel = mongoose.model("Counter", CounterSchema);

async function nextSequence(name) {
  const doc = await CounterModel.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  ).lean();
  return doc.seq;
}

/** `nextReference("enquiry", "MM-E")` → "MM-E-0042". */
async function nextReference(name, prefix, { pad = 4 } = {}) {
  const seq = await nextSequence(name);
  return `${prefix}-${String(seq).padStart(pad, "0")}`;
}

/**
 * Raises a counter without ever lowering it, for when a sequence has to take
 * over from numbers that already exist — MOSSANO codes imported with the
 * catalogue. `$max` makes it safe to re-run and safe to race.
 */
async function ensureCounterAtLeast(name, value) {
  if (!Number.isFinite(value) || value <= 0) return;
  await CounterModel.updateOne({ _id: name }, { $max: { seq: value } }, { upsert: true });
}

export { CounterModel, nextSequence, nextReference, ensureCounterAtLeast };
