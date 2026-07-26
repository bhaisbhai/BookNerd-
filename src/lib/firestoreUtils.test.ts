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

  // Regression test: FollowedSeries.books is an array of SeriesBook objects, each with its own
  // optional coverUrl/description/rating that per-book enrichment can leave undefined. A shallow
  // strip only cleans the outer object, so the nested undefined still reached Firestore and threw -
  // silently breaking "follow this series" for any series where at least one book's enrichment
  // came back empty (common, since not every book has cover/rating data available).
  it("strips undefined values nested inside arrays of objects", () => {
    const result = stripUndefined({
      id: "series-1",
      title: "Mistborn",
      books: [
        { id: "b1", title: "The Final Empire", coverUrl: undefined, averageRating: 4.5 },
        { id: "b2", title: "The Well of Ascension", coverUrl: "https://example.com/b2.jpg", description: undefined }
      ]
    });

    expect(result).toEqual({
      id: "series-1",
      title: "Mistborn",
      books: [
        { id: "b1", title: "The Final Empire", averageRating: 4.5 },
        { id: "b2", title: "The Well of Ascension", coverUrl: "https://example.com/b2.jpg" }
      ]
    });
    expect("coverUrl" in result.books[0]).toBe(false);
    expect("description" in result.books[1]).toBe(false);
  });

  it("strips undefined values nested inside plain objects", () => {
    const result = stripUndefined({
      title: "Dune",
      upcomingBook: { title: "Dune Messiah", releaseDate: undefined, status: "unknown" }
    });

    expect(result).toEqual({ title: "Dune", upcomingBook: { title: "Dune Messiah", status: "unknown" } });
  });
});
