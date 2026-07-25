import { suggestBooks } from "../server/suggest.js";

type VercelRequest = {
  method?: string;
  query?: Record<string, string | string[]>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Allow", "GET");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawQuery = req.query?.q;
  const query = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery;

  if (!query || typeof query !== "string") {
    return res.status(200).json({ suggestions: [] });
  }

  try {
    const suggestions = await suggestBooks(query);
    return res.status(200).json({ suggestions });
  } catch (error) {
    console.error("Suggest API Error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch book suggestions."
    });
  }
}
