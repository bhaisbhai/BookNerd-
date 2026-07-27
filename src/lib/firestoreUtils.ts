import { Firestore, WriteBatch, writeBatch } from "firebase/firestore";

// Firestore rejects any field explicitly set to `undefined` (as opposed to omitted or null) and
// throws on setDoc/updateDoc - anywhere in the document tree, not just at the top level. Optional
// fields built from AI-generated data (Gemini results, cover enrichment, etc.) routinely end up
// `undefined` rather than simply absent, including inside nested arrays like FollowedSeries.books
// (each SeriesBook's own coverUrl/description/rating can be undefined), so this recurses through
// objects and arrays rather than only stripping the outermost keys.
function stripUndefinedDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripUndefinedDeep);
  }
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefinedDeep(v)])
    );
  }
  return value;
}

export function stripUndefined<T extends object>(obj: T): T {
  return stripUndefinedDeep(obj) as T;
}

// batch.commit() (and setDoc/deleteDoc) only resolve once the backend has acked the write - on a
// stalled or offline connection the SDK just keeps retrying, so the returned promise can hang
// indefinitely with nothing surfaced to the user. Race it against a timeout so a bad connection
// turns into a "please retry" error instead of a spinner that never resolves.
export function withTimeout<T>(promise: Promise<T>, ms = 20000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      // Tagged with a `.code` (rather than a bare Error) so describeFirestoreError can tell this
      // apart from a real Firestore rejection - a permission-denied or auth error comes back from
      // the backend in well under a second, so if this fires instead, the client never heard back
      // from Firestore at all within the timeout window, which is a materially different problem.
      const err = new Error(`Timed out after ${ms}ms waiting for Firestore`);
      (err as Error & { code: string }).code = "client-timeout";
      reject(err);
    }, ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

// A bare "please check your connection" message is indistinguishable whether the real cause is
// offline, a security-rules rejection, an unauthenticated/expired session, or something else -
// every one of those looks identical to a user with no way to open devtools. Firebase errors carry
// a `.code` (e.g. "permission-denied", "unavailable", "unauthenticated") that pinpoints which -
// surface it so a bug report actually says what's wrong instead of us having to guess blind.
export function describeFirestoreError(e: unknown): string {
  const code = (e as { code?: unknown } | null)?.code;
  if (typeof code === "string") return code;
  const message = (e as { message?: unknown } | null)?.message;
  return typeof message === "string" && message ? message : "unknown error";
}

// Firestore batches cap at 500 operations - chunk under that limit and commit each chunk as one
// atomic write. Far more reliable for a bulk operation (e.g. pasting dozens of books at once)
// than firing one independent setDoc per item: a batch either fully succeeds or fully fails,
// instead of leaving an ambiguous partial result if some individual writes fail and others don't.
export async function commitInBatches<T>(
  db: Firestore,
  items: T[],
  applyToBatch: (batch: WriteBatch, item: T) => void,
  chunkSize = 400
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const batch = writeBatch(db);
    items.slice(i, i + chunkSize).forEach(item => applyToBatch(batch, item));
    await withTimeout(batch.commit());
  }
}
