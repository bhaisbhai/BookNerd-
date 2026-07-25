import { describe, it, expect } from "vitest";
import { stripUndefined } from "./firestoreUtils.js";

describe("stripUndefined", () => {
  // Regression test: Firestore's setDoc throws on any field explicitly set to `undefined`
  // (as opposed to omitted or null). LibraryBook/FollowedSeries objects built from optional
  // AI-generated data routinely end up with undefined fields (finishedAt, seriesId, coverUrl,
  // etc.), and that write failure was previously silent - the UI looked like it succeeded while
  // the book was never actually saved.
  it("removes keys whose value is undefined", () => {
    const result = stripUndefined({
      id: "book-1",
      title: "Dune",
      finishedAt: undefined,
      seriesId: undefined,
      coverUrl: "https://example.com/cover.jpg"
    });

    expect(result).toEqual({ id: "book-1", title: "Dune", coverUrl: "https://example.com/cover.jpg" });
    expect("finishedAt" in result).toBe(false);
    expect("seriesId" in result).toBe(false);
  });

  it("keeps null values as-is (Firestore allows null, just not undefined)", () => {
    const result = stripUndefined({ upcomingBook: null, title: "Dune" });
    expect(result).toEqual({ upcomingBook: null, title: "Dune" });
  });

  it("keeps falsy-but-defined values like 0, empty string, and false", () => {
    const result = stripUndefined({ rating: 0, notes: "", followSeries: false });
    expect(result).toEqual({ rating: 0, notes: "", followSeries: false });
  });

  it("returns an equivalent object when nothing is undefined", () => {
    const input = { a: 1, b: "two" };
    expect(stripUndefined(input)).toEqual(input);
  });
});
