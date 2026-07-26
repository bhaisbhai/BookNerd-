import { lookupByIsbn } from "../server/isbnLookup.js";

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

  const rawIsbn = req.query?.isbn;
  const isbn = Array.isArray(rawIsbn) ? rawIsbn[0] : rawIsbn;

  if (!isbn || typeof isbn !== "string") {
    return res.status(400).json({ error: "isbn query parameter is required" });
  }

  try {
    const result = await lookupByIsbn(isbn);
    if (!result) {
      return res.status(404).json({ error: "No book found for that barcode." });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("Lookup-isbn API Error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to look up that barcode."
    });
  }
}
