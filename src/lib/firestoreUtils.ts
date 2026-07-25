// Firestore rejects any field explicitly set to `undefined` (as opposed to omitted or null) and
// throws on setDoc/updateDoc. Optional fields built from AI-generated data (Gemini results, cover
// enrichment, etc.) routinely end up `undefined` rather than simply absent, so every write needs
// this before it reaches Firestore.
export function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}
