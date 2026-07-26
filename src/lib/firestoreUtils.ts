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
