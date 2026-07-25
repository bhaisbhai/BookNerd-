import { recommendNextRead, RecommendCandidate, TasteSignal } from "../server/recommend.js";

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
  const candidates = Array.isArray(body.candidates) ? body.candidates as RecommendCandidate[] : [];
  const tasteSignals = Array.isArray(body.tasteSignals) ? body.tasteSignals as TasteSignal[] : [];

  if (candidates.length === 0) {
    return res.status(400).json({ error: "candidates (unread shelf books) are required" });
  }

  try {
    const recommendation = await recommendNextRead(candidates, tasteSignals);
    return res.status(200).json(recommendation);
  } catch (error) {
    console.error("Recommend API Error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to generate a recommendation."
    });
  }
}
