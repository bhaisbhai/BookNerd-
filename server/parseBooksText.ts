import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { enrichBook } from "./metadata.js";
import { ScanCandidate } from "../src/types.js";

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

const MAX_TEXT_LENGTH = 20000; // guards against pathological paste sizes

/**
 * Identifies individual books from a pasted block of freeform text and enriches each with a
 * best-effort cover image. Returns candidates for the user to review before anything is
 * persisted, mirroring scanBooksFromImage's contract so both flows share the same review UI.
 */
export async function parseBooksFromText(text: string): Promise<ScanCandidate[]> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Some text is required.");
  }
  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new Error("That's too much text to parse at once. Try pasting a shorter list.");
  }

  const prompt = `
The following text is a pasted list of books - it might be a numbered list, one title per line, a comma-separated list, a Goodreads/StoryGraph export, or informal notes with extra commentary mixed in. Extract every distinct book mentioned.

Text:
"""
${trimmed}
"""

For each book, extract the title and, if mentioned, the author. Use your general knowledge to fix obvious typos and to fill in the author if the title alone unambiguously identifies a well-known book, but never invent a book that isn't actually referenced in the text. Ignore any text that isn't naming a book (headers, commentary, dates, star ratings, etc.).
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          books: {
            type: Type.ARRAY,
            description: "Books identified in the pasted text.",
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "The book's title." },
                author: { type: Type.STRING, description: "The author's full name, or empty string if unmentioned/unknown." }
              },
              required: ["title"]
            }
          }
        },
        required: ["books"]
      }
    }
  });

  if (!response.text) {
    throw new Error("No response content received from Gemini.");
  }

  const data = JSON.parse(response.text.trim()) as { books: { title: string; author?: string }[] };
  const rawCandidates = (data.books || []).filter(b => b.title && b.title.trim().length > 0);

  // Enrich each candidate with a cover image so the user can visually confirm matches during review.
  const enriched = await Promise.all(
    rawCandidates.map(async (b): Promise<ScanCandidate> => {
      const title = b.title.trim();
      const author = (b.author || "").trim();
      try {
        const meta = await enrichBook(title, author);
        return { title, author, coverUrl: meta?.coverUrl };
      } catch {
        return { title, author };
      }
    })
  );

  return enriched;
}
