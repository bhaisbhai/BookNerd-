import { searchBookSeriesLive } from "../server/gemini.js";
import { enrichSeriesBooks } from "../server/metadata.js";

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

  const body = typeof req.body === "object" && req.body !== null ? req.body as { query?: unknown } : {};
  const query = body.query;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Search query string is required" });
  }

  try {
    const results = await searchBookSeriesLive(query, "quick");

    // Each book gets its own cover/synopsis/rating - never reuse one book's metadata for another.
    if (results.books && results.books.length > 0) {
      results.books = await enrichSeriesBooks(results.books, results.author);
      if (!results.coverUrl) {
        results.coverUrl = results.books[0]?.coverUrl;
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
