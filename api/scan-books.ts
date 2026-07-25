import { scanBooksFromImage } from "../server/scanBooks.js";

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
  const { image, mimeType } = body;

  if (typeof image !== "string" || typeof mimeType !== "string") {
    return res.status(400).json({ error: "image (base64) and mimeType are required" });
  }

  try {
    const books = await scanBooksFromImage(image, mimeType);
    return res.status(200).json({ books });
  } catch (error) {
    console.error("Scan-books API Error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to scan bookshelf photo."
    });
  }
}
