import { searchBookSeriesLive } from "../server/gemini.js";
import { enrichSeriesBooks } from "../server/metadata.js";
import { findMatchingBook } from "../src/lib/bookMatching.js";

type VercelRequest = {
  method?: string;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Allow", "POST");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "object" && req.body !== null ? req.body as { query?: unknown; matchTitle?: unknown } : {};
  const query = body.query;
  const matchTitle = body.matchTitle;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Search query string is required" });
  }

  try {
    const results = await searchBookSeriesLive(query, "quick");

    // Enrich only the specific book being added, not every book in the series - enriching all of
    // them eagerly on every search meant a multi-book series paid for N enrichment round-trips
    // (Google Books/Open Library calls) on a request that only needs one book's metadata right
    // now. The rest of the series still gets a reasonable series-level cover fallback.
    if (results.books && results.books.length > 0) {
      const target = findMatchingBook(results, typeof matchTitle === "string" && matchTitle ? matchTitle : query);
      if (target) {
        const [enriched] = await enrichSeriesBooks([target], results.author);
        results.books = results.books.map(b => b.id === enriched.id ? enriched : b);
      }
      if (!results.coverUrl) {
        results.coverUrl = results.books.find(b => b.coverUrl)?.coverUrl;
      }
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error("Search API Error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch live book data.",
    });
  }
}
