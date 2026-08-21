/**
 * Atomic sequence numbers, for human-readable references.
 *
 * An enquiry's reference is quoted on the phone, so it has to be short,
 * sequential and never reissued. Deriving it from a document count is the
 * obvious approach and the wrong one: two enquiries submitted in the same
 * second read the same count and collide on the unique index, which surfaces to
 * a customer as a failed form.
 *
 * `findOneAndUpdate` with `$inc` is atomic in MongoDB, so each caller gets a
 * distinct number regardless of concurrency.
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

/**
 * A prefixed, zero-padded reference — MM-E-0042.
 *
 * @param {string} name    counter key, e.g. "enquiry"
 * @param {string} prefix  e.g. "MM-E"
 */
async function nextReference(name, prefix, { pad = 4 } = {}) {
  const seq = await nextSequence(name);
  return `${prefix}-${String(seq).padStart(pad, "0")}`;
}

/**
 * Raises a counter to at least `value` without ever lowering it.
 *
 * Needed when a sequence has to take over from numbers that already exist —
 * MOSSANO codes imported with the catalogue, say. `$max` makes this safe to
 * call repeatedly and safe to race: it can only move the counter forwards.
 */
async function ensureCounterAtLeast(name, value) {
  if (!Number.isFinite(value) || value <= 0) return;
  await CounterModel.updateOne({ _id: name }, { $max: { seq: value } }, { upsert: true });
}

export { CounterModel, nextSequence, nextReference, ensureCounterAtLeast };
