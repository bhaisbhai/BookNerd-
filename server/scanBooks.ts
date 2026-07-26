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

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // guards against pathological base64 payloads before they hit Gemini

/**
 * Identifies individual books from an image and enriches each with a best-effort cover image.
 * Returns candidates for the user to review before anything is persisted. Handles three kinds of
 * input equally well: a photo of a bookshelf/stack/pile, a photo of a single book's cover or
 * spine, and a screenshot from a book-tracking app or website (e.g. Goodreads) showing a shelf,
 * list, or detail page - which needs reading on-screen text/UI labels rather than physical spines.
 */
export async function scanBooksFromImage(imageBase64: string, mimeType: string): Promise<ScanCandidate[]> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  if (!imageBase64) {
    throw new Error("An image is required.");
  }
  if (imageBase64.length > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large. Please upload a smaller photo.");
  }

  const prompt = `
This image is one of: a photo of a bookshelf, book stack, or pile of books; a photo of a single book's cover or spine; or a screenshot from a book-tracking app or website (e.g. Goodreads, StoryGraph, a library catalogue, an online bookstore) showing a shelf, list, or detail page for one or more books.

Identify every distinct book present:
- If it's a photo of physical books, read the visible spines or covers. Use your general knowledge of book titles/authors to correct likely misreads of partial or angled text.
- If it's a screenshot of an app/website, read the on-screen text (titles, author names, list rows) rather than looking for physical spines.

Only include a book if you're reasonably confident of at least its title. If you can't determine the author, return an empty string for author.
Do not invent books that aren't actually present in the image. Skip anything you cannot read at all.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: imageBase64 } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          books: {
            type: Type.ARRAY,
            description: "Books identified in the photo.",
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "The book's title." },
                author: { type: Type.STRING, description: "The author's full name, or empty string if unreadable/unknown." }
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
