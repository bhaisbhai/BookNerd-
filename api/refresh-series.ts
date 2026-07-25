import { refreshSeriesData } from "../server/refreshSeries.js";

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

  const body = typeof req.body === "object" && req.body !== null ? req.body as Record<string, unknown> : {};
  const { id, title, author, books, upcomingBook } = body;

  if (typeof id !== "string" || typeof title !== "string" || typeof author !== "string" || !Array.isArray(books)) {
    return res.status(400).json({ error: "id, title, author and books are required" });
  }

  try {
    const result = await refreshSeriesData({
      id,
      title,
      author,
      books: books as { id: string; title: string }[],
      upcomingBook: (upcomingBook as { title: string } | null | undefined) ?? null
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error(`Refresh error for series ${id}:`, error);
    return res.status(500).json({ error: "Failed to refresh series from search grounding." });
  }
}
