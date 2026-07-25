import { describe, it, expect } from "vitest";
import { findMatchingBook, normalize, slugify } from "./bookMatching.js";
import { SeriesSearchResult } from "../types.js";

function makeSeries(titles: string[]): SeriesSearchResult {
  return {
    title: "Test Series",
    author: "Test Author",
    description: "",
    books: titles.map((title, idx) => ({
      id: `book-${idx}`,
      title,
      volumeNumber: idx + 1,
      status: "released"
    }))
  };
}

describe("findMatchingBook", () => {
  const series = makeSeries([
    "Mistborn: The Final Empire",
    "Mistborn: The Well of Ascension",
    "Mistborn: The Hero of Ages"
  ]);

  it("matches an exact, clean title", () => {
    const match = findMatchingBook(series, "Mistborn: The Well of Ascension");
    expect(match?.title).toBe("Mistborn: The Well of Ascension");
  });

  it("matches case/punctuation-insensitively", () => {
    const match = findMatchingBook(series, "mistborn the well of ascension");
    expect(match?.title).toBe("Mistborn: The Well of Ascension");
  });

  // Regression test: a real bug where direct-search queries phrased as "Title by Author" (a very
  // natural thing to type) always silently matched the *first* book in the series instead of the
  // one actually searched for, because the exact-match-or-bust logic never accounted for the
  // extra " by Author" text. This looked like "the book I added before just disappeared," when
  // what actually happened was the wrong book got added in its place.
  it("matches when the query includes a trailing 'by Author' the title doesn't have", () => {
    const match = findMatchingBook(series, "Mistborn: The Well of Ascension by Brandon Sanderson");
    expect(match?.title).toBe("Mistborn: The Well of Ascension");
  });

  it("matches a partial/shortened title against the full title", () => {
    const match = findMatchingBook(series, "Well of Ascension");
    expect(match?.title).toBe("Mistborn: The Well of Ascension");
  });

  it("falls back to the first book when nothing matches at all", () => {
    const match = findMatchingBook(series, "Completely Unrelated Book Title");
    expect(match?.title).toBe("Mistborn: The Final Empire");
  });

  it("returns null when the series has no books", () => {
    const empty = makeSeries([]);
    expect(findMatchingBook(empty, "Anything")).toBeNull();
  });
});

describe("normalize", () => {
  it("lowercases and strips punctuation/whitespace", () => {
    expect(normalize("The Way of Kings!")).toBe("thewayofkings");
    expect(normalize("Mistborn: The Final Empire")).toBe(normalize("mistborn the final empire"));
  });
});

describe("slugify", () => {
  it("produces a url-safe, trimmed slug", () => {
    expect(slugify("The Way of Kings")).toBe("the-way-of-kings");
    expect(slugify("  Leading/Trailing!! ")).toBe("leading-trailing");
  });
});
