import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { BookRecommendation } from "../src/types.js";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export interface RecommendCandidate {
  id: string;
  title: string;
  author: string;
}

export interface TasteSignal {
  title: string;
  rating: number;
}

/**
 * Picks one book from the reader's "want to read" list to read next, optionally informed by how
 * they've rated books they've already read. Falls back to a simple pick if Gemini's choice doesn't
 * match a real candidate (id hallucination) or there's nothing to reason about.
 */
export async function recommendNextRead(
  candidates: RecommendCandidate[],
  tasteSignals: TasteSignal[] = []
): Promise<BookRecommendation> {
  if (candidates.length === 0) {
    throw new Error("No unread books in the library to recommend from.");
  }

  if (candidates.length === 1) {
    const only = candidates[0];
    return {
      id: only.id,
      title: only.title,
      author: only.author,
      reason: "It's the only unread book on your list right now — no decision paralysis today!"
    };
  }

  if (!apiKey) {
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return { id: pick.id, title: pick.title, author: pick.author, reason: "Picked at random — no AI configured." };
  }

  const wantToReadList = candidates.map(c => `- id: ${c.id} | "${c.title}" by ${c.author || "Unknown"}`).join("\n");
  const tasteList = tasteSignals.length > 0
    ? tasteSignals.map(t => `- "${t.title}" rated ${t.rating}/5`).join("\n")
    : "(no rating history available)";

  const prompt = `
A reader can't decide what to read next. Here is their "want to read" list:
${wantToReadList}

For taste calibration, here's what they've read and rated before (1-5 stars):
${tasteList}

Pick exactly ONE book from the list above that they should read next. Copy its "id" value exactly as given.
Give a short, compelling 1-2 sentence reason for this specific pick, tied to their apparent taste, mood, or a nice change of pace.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Must exactly match one of the given candidate ids." },
          reason: { type: Type.STRING, description: "A short, compelling reason for this pick." }
        },
        required: ["id", "reason"]
      }
    }
  });

  if (!response.text) {
    throw new Error("No response content received from Gemini.");
  }

  const data = JSON.parse(response.text.trim()) as { id: string; reason: string };
  const match = candidates.find(c => c.id === data.id);
  const chosen = match || candidates[Math.floor(Math.random() * candidates.length)];

  return {
    id: chosen.id,
    title: chosen.title,
    author: chosen.author,
    reason: data.reason || "A great next pick from your list."
  };
}
