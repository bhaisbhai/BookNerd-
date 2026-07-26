import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { suggestBooks } from "./suggest.js";

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

describe("suggestBooks", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns Google Books results when available", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({
      items: [{ volumeInfo: { title: "Dune", authors: ["Frank Herbert"] } }]
    }));

    const result = await suggestBooks("dune");
    expect(result).toEqual([{ title: "Dune", author: "Frank Herbert", coverUrl: undefined }]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to Open Library when Google Books errors out", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(null, false)) // Google Books fails
      .mockResolvedValueOnce(jsonResponse({ docs: [{ title: "Dune", author_name: ["Frank Herbert"] }] })); // Open Library succeeds
    global.fetch = fetchMock;

    const result = await suggestBooks("dune");
    expect(result).toEqual([{ title: "Dune", author: "Frank Herbert", coverUrl: undefined }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to Open Library when Google Books returns no matches", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(jsonResponse({ docs: [{ title: "Dune", author_name: ["Frank Herbert"] }] }));
    global.fetch = fetchMock;

    const result = await suggestBooks("dune");
    expect(result).toEqual([{ title: "Dune", author: "Frank Herbert", coverUrl: undefined }]);
  });

  it("returns an empty list (not a thrown error) when both sources fail", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));

    const result = await suggestBooks("dune");
    expect(result).toEqual([]);
  });

  it("deduplicates identical title/author pairs", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({
      items: [
        { volumeInfo: { title: "Dune", authors: ["Frank Herbert"] } },
        { volumeInfo: { title: "Dune", authors: ["Frank Herbert"] } }
      ]
    }));

    const result = await suggestBooks("dune");
    expect(result).toHaveLength(1);
  });

  it("returns an empty list for a blank query without calling fetch", async () => {
    global.fetch = vi.fn();
    const result = await suggestBooks("   ");
    expect(result).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
