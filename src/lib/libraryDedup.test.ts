import { describe, it, expect } from "vitest";
import { getRecommendableWantToRead } from "./libraryDedup.js";
import { LibraryBook } from "../types.js";

function makeBook(overrides: Partial<LibraryBook>): LibraryBook {
  return {
    id: overrides.id || "book-1",
    title: "Dune",
    author: "Frank Herbert",
    status: "want_to_read",
    addedAt: "2026-01-01T00:00:00.000Z",
    source: "manual",
    ...overrides
  };
}

describe("getRecommendableWantToRead", () => {
  it("includes a want-to-read book with no duplicate elsewhere", () => {
    const library = [makeBook({ id: "b1" })];
    expect(getRecommendableWantToRead(library).map(b => b.id)).toEqual(["b1"]);
  });

  it("excludes a want-to-read entry that duplicates an already-read title/author", () => {
    const library = [
      makeBook({ id: "b1", status: "read" }),
      makeBook({ id: "b2", status: "want_to_read" })
    ];
    expect(getRecommendableWantToRead(library)).toEqual([]);
  });

  it("excludes a want-to-read entry that duplicates a currently-reading title/author", () => {
    const library = [
      makeBook({ id: "b1", status: "reading" }),
      makeBook({ id: "b2", status: "want_to_read" })
    ];
    expect(getRecommendableWantToRead(library)).toEqual([]);
  });

  it("matching is case/punctuation insensitive", () => {
    const library = [
      makeBook({ id: "b1", title: "DUNE:", author: "frank herbert", status: "read" }),
      makeBook({ id: "b2", title: "Dune", author: "Frank Herbert", status: "want_to_read" })
    ];
    expect(getRecommendableWantToRead(library)).toEqual([]);
  });

  it("does not exclude a different book by the same author", () => {
    const library = [
      makeBook({ id: "b1", title: "Dune", status: "read" }),
      makeBook({ id: "b2", title: "Dune Messiah", status: "want_to_read" })
    ];
    expect(getRecommendableWantToRead(library).map(b => b.id)).toEqual(["b2"]);
  });

  it("excludes reading/read books themselves, not just their want-to-read duplicates", () => {
    const library = [
      makeBook({ id: "b1", status: "read" }),
      makeBook({ id: "b2", status: "reading" })
    ];
    expect(getRecommendableWantToRead(library)).toEqual([]);
  });

  // Regression test: a duplicate added via a photo/barcode scan often has an empty or
  // OCR-imperfect author field, which wouldn't match the original entry's author under
  // title+author matching - the exact gap that let a duplicate keep getting recommended.
  it("excludes a duplicate even when its author field is empty", () => {
    const library = [
      makeBook({ id: "b1", author: "Frank Herbert", status: "read" }),
      makeBook({ id: "b2", author: "", status: "want_to_read", source: "scanned" })
    ];
    expect(getRecommendableWantToRead(library)).toEqual([]);
  });

  it("excludes a duplicate even when its author field differs in formatting", () => {
    const library = [
      makeBook({ id: "b1", author: "J.R.R. Tolkien", title: "The Hobbit", status: "read" }),
      makeBook({ id: "b2", author: "J R R Tolkien", title: "The Hobbit", status: "want_to_read" })
    ];
    expect(getRecommendableWantToRead(library)).toEqual([]);
  });
});
