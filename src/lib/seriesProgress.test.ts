import { describe, it, expect } from "vitest";
import { getNextToRead } from "./seriesProgress.js";
import { FollowedSeries, LibraryBook } from "../types.js";

function makeSeries(books: FollowedSeries["books"]): FollowedSeries {
  return {
    id: "series-1",
    title: "Test Series",
    author: "Test Author",
    description: "",
    books,
    lastChecked: "2026-01-01T00:00:00.000Z",
  };
}

function makeLibraryBook(overrides: Partial<LibraryBook>): LibraryBook {
  return {
    id: "book-1",
    title: "Book",
    author: "Author",
    status: "read",
    addedAt: "2026-01-01T00:00:00.000Z",
    source: "manual",
    seriesId: "series-1",
    ...overrides,
  };
}

describe("getNextToRead", () => {
  it("returns the next released volume after the highest read one", () => {
    const series = makeSeries([
      { id: "b1", title: "Book 1", volumeNumber: 1, status: "released" },
      { id: "b2", title: "Book 2", volumeNumber: 2, status: "released" },
      { id: "b3", title: "Book 3", volumeNumber: 3, status: "released" },
    ]);
    const library = [makeLibraryBook({ volumeNumber: 1, status: "read" })];

    expect(getNextToRead(series, library)?.id).toBe("b2");
  });

  it("returns null when fully caught up", () => {
    const series = makeSeries([
      { id: "b1", title: "Book 1", volumeNumber: 1, status: "released" },
      { id: "b2", title: "Book 2", volumeNumber: 2, status: "released" },
    ]);
    const library = [
      makeLibraryBook({ id: "l1", volumeNumber: 1, status: "read" }),
      makeLibraryBook({ id: "l2", volumeNumber: 2, status: "read" }),
    ];

    expect(getNextToRead(series, library)).toBeNull();
  });

  it("skips an unreleased next volume", () => {
    const series = makeSeries([
      { id: "b1", title: "Book 1", volumeNumber: 1, status: "released" },
      { id: "b2", title: "Book 2", volumeNumber: 2, status: "upcoming" },
    ]);
    const library = [makeLibraryBook({ volumeNumber: 1, status: "read" })];

    expect(getNextToRead(series, library)).toBeNull();
  });

  it("returns null for a series the user hasn't started", () => {
    const series = makeSeries([
      { id: "b1", title: "Book 1", volumeNumber: 1, status: "released" },
      { id: "b2", title: "Book 2", volumeNumber: 2, status: "released" },
    ]);
    const library = [makeLibraryBook({ volumeNumber: 1, status: "want_to_read" })];

    expect(getNextToRead(series, library)).toBeNull();
  });

  it("skips a released volume already in progress but not yet marked read", () => {
    const series = makeSeries([
      { id: "b1", title: "Book 1", volumeNumber: 1, status: "released" },
      { id: "b2", title: "Book 2", volumeNumber: 2, status: "released" },
    ]);
    const library = [
      makeLibraryBook({ id: "l1", volumeNumber: 1, status: "read" }),
      makeLibraryBook({ id: "l2", volumeNumber: 2, status: "reading" }),
    ];

    expect(getNextToRead(series, library)?.id).toBe("b2");
  });
});
