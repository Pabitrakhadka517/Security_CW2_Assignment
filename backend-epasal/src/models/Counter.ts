import mongoose, { Schema } from 'mongoose';

/**
 * Counter
 * A tiny collection of named atomic counters used to generate short, sequential,
 * human-readable identifiers (e.g. order numbers). Each document is one named
 * sequence; `nextSequence` increments and returns it atomically so concurrent
 * callers never receive the same value.
 *
 * NOTE: `_id` is a string (the counter name), so we intentionally do NOT extend
 * mongoose's `Document` (whose `_id` is an ObjectId). A plain interface is the
 * recommended pattern for string-keyed collections.
 */
export interface ICounter {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

export const Counter = mongoose.model<ICounter>('Counter', CounterSchema);

/**
 * Atomically increment the named counter and return the new value.
 * Upserts the counter on first use.
 */
export async function nextSequence(key: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc!.seq;
}
