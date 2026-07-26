import { describe, it, expect, vi, beforeEach } from "vitest";
import { stripUndefined, commitInBatches } from "./firestoreUtils.js";
import { writeBatch } from "firebase/firestore";

vi.mock("firebase/firestore", () => ({
  writeBatch: vi.fn()
}));

beforeEach(() => {
  vi.clearAllMocks();
});

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

describe("commitInBatches", () => {
  // Regression test: adding many books used to fire one independent setDoc per book via
  // Promise.all - this verifies the replacement instead commits everything through Firestore's
  // atomic batch API, one commit per chunk, rather than one write per item.
  it("commits all items in a single batch when under the chunk size", async () => {
    const sets: unknown[] = [];
    const commit = vi.fn().mockResolvedValue(undefined);
    (writeBatch as any).mockReturnValue({ set: (...args: unknown[]) => sets.push(args), commit });

    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    await commitInBatches({} as any, items, (batch, item) => batch.set(item as any, item));

    expect(writeBatch).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(sets).toHaveLength(3);
  });

  it("splits into multiple batch commits when the item count exceeds the chunk size", async () => {
    const commit = vi.fn().mockResolvedValue(undefined);
    (writeBatch as any).mockReturnValue({ set: vi.fn(), commit });

    const items = Array.from({ length: 5 }, (_, i) => ({ id: `item-${i}` }));
    await commitInBatches({} as any, items, (batch, item) => batch.set(item as any, item), 2);

    expect(writeBatch).toHaveBeenCalledTimes(3); // chunks of 2, 2, 1
    expect(commit).toHaveBeenCalledTimes(3);
  });

  it("does nothing for an empty item list", async () => {
    const commit = vi.fn();
    (writeBatch as any).mockReturnValue({ set: vi.fn(), commit });

    await commitInBatches({} as any, [], (batch, item) => batch.set(item as any, item));

    expect(writeBatch).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("propagates a commit failure rather than swallowing it", async () => {
    const commit = vi.fn().mockRejectedValue(new Error("network down"));
    (writeBatch as any).mockReturnValue({ set: vi.fn(), commit });

    await expect(
      commitInBatches({} as any, [{ id: "a" }], (batch, item) => batch.set(item as any, item))
    ).rejects.toThrow("network down");
  });
});
