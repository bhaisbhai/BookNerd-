import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { SearchResultSeries } from "../src/types.js";

dotenv.config();

// Validate API key is present
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("Warning: GEMINI_API_KEY is not defined in the environment.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

/**
 * Searches the web via Gemini Search Grounding for live book series data.
 */
export async function searchBookSeriesLive(query: string): Promise<SearchResultSeries> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }

  const prompt = `
Search the web for up-to-date, live, accurate data about the book series matching this query: "${query}".

You need to extract:
1. The official name of the series.
2. The full name of the author.
3. A short, compelling 1-2 sentence description of the series.
4. A chronological list of the main, mainline novels/volumes published in the series in correct reading order. Include their volume number (starting from 1), title, and publication/release date.
5. Critical: Search for any upcoming book, recently announced book, or next volume in development for this series. If the author has announced a new book, or if there is a book with a scheduled release date (e.g. in late 2026, 2027, or TBA), extract its title, expected release date, and a brief description. If no upcoming book is announced or scheduled, do not include the upcomingBook field (or set it to null).

For every book (both published and upcoming), research the level of trust and confidence and locate real source URLs (author blogs, publisher catalogs, major booksellers, public catalogs):
- confidence: "confirmed" (publisher confirmed date), "likely" (seen on reputable booksellers/catalogs), "rumoured" (community speculation/unverified), or "unknown".
- sourceUrls: List the actual URLs/websites found verifying this book's release.
- lastVerifiedAt: Set this to the current date/timestamp.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "The official name of the book series." },
            author: { type: Type.STRING, description: "The full name of the author of the series." },
            description: { type: Type.STRING, description: "An elegant description of the series plot, genre, or premise." },
            books: {
              type: Type.ARRAY,
              description: "List of mainline published books in chronological reading order.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "A unique slug ID for the book (e.g., 'a-game-of-thrones')." },
                  title: { type: Type.STRING, description: "The title of the book." },
                  volumeNumber: { type: Type.INTEGER, description: "The sequence volume number in the series." },
                  releaseDate: { type: Type.STRING, description: "The release date (e.g. YYYY-MM-DD or Month YYYY)." },
                  status: { type: Type.STRING, description: "Status: must be 'released'." },
                  confidence: { type: Type.STRING, description: "Confidence level: 'confirmed', 'likely', 'rumoured', or 'unknown'." },
                  sourceUrls: {
                    type: Type.ARRAY,
                    description: "Specific source links for this book.",
                    items: { type: Type.STRING }
                  }
                },
                required: ["id", "title", "volumeNumber", "releaseDate", "status"]
              }
            },
            upcomingBook: {
              type: Type.OBJECT,
              description: "Information about the next upcoming or newly announced book in this series, or null if there is no announced upcoming book.",
              properties: {
                title: { type: Type.STRING, description: "The title of the upcoming book." },
                releaseDate: { type: Type.STRING, description: "The expected release date (e.g. 'November 2026', 'TBA 2027', or 'Fall 2026')." },
                description: { type: Type.STRING, description: "Brief summary of the announcement, news, or plot of this upcoming release." },
                status: { type: Type.STRING, description: "Must be 'announced', 'upcoming', 'rumoured', or 'unknown'." },
                confidence: { type: Type.STRING, description: "Confidence level: 'confirmed', 'likely', 'rumoured', or 'unknown'." },
                sourceUrls: {
                  type: Type.ARRAY,
                  description: "Specific source links for this upcoming book.",
                  items: { type: Type.STRING }
                }
              },
              required: ["title", "releaseDate", "status"]
            },
            sourceUrls: {
              type: Type.ARRAY,
              description: "Overall source URLs for the series.",
              items: { type: Type.STRING }
            },
            confidence: { type: Type.STRING, description: "Overall confidence: 'confirmed', 'likely', 'rumoured', or 'unknown'." }
          },
          required: ["title", "author", "description", "books"]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response content received from Gemini.");
    }

    const data = JSON.parse(response.text.trim()) as SearchResultSeries;
    
    // Ensure book status and unique ids are valid
    if (data.books) {
      data.books = data.books.map((b, idx) => ({
        ...b,
        id: b.id || `book-${idx + 1}`,
        volumeNumber: b.volumeNumber || (idx + 1),
        status: "released",
        confidence: b.confidence || "likely",
        sourceUrls: b.sourceUrls || ["https://openlibrary.org"],
        lastVerifiedAt: new Date().toISOString()
      }));
    }

    if (data.upcomingBook) {
      data.upcomingBook.confidence = data.upcomingBook.confidence || "likely";
      data.upcomingBook.sourceUrls = data.upcomingBook.sourceUrls || ["https://openlibrary.org"];
      data.upcomingBook.lastVerifiedAt = new Date().toISOString();
    }

    data.confidence = data.confidence || "likely";
    data.sourceUrls = data.sourceUrls || ["https://openlibrary.org"];
    data.lastVerifiedAt = new Date().toISOString();

    return data;
  } catch (error) {
    console.error("Error in searchBookSeriesLive:", error);
    throw error;
  }
}

/**
 * Checks for any new announcements or release changes specifically for a given series.
 * This will be used to simulate live notifications for tracked series.
 */
export async function checkSeriesNewsLive(seriesTitle: string, author: string, lastBookTitle: string): Promise<{
  hasNews: boolean;
  newsType?: "announcement" | "delay" | "none";
  headline?: string;
  details?: string;
  date?: string;
}> {
  if (!apiKey) {
    return { hasNews: false };
  }

  const prompt = `
Search the web for any brand new announcements, news, or release schedules related to the book series "${seriesTitle}" by ${author}.
Specifically, check if there are any announcements of a new title, updates on the next book (successor to "${lastBookTitle}"), release date announcements, or release delays.

Return a JSON object:
{
  "hasNews": true/false,
  "newsType": "announcement" or "delay" or "none",
  "headline": "A short newspaper-style headline of the news, e.g. 'Winds of Winter release window discussed by GRRM'",
  "details": "A detailed 1-2 sentence description of what was announced and the source.",
  "date": "Estimated date of the news or release"
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasNews: { type: Type.BOOLEAN },
            newsType: { type: Type.STRING },
            headline: { type: Type.STRING },
            details: { type: Type.STRING },
            date: { type: Type.STRING }
          },
          required: ["hasNews"]
        }
      }
    });

    if (!response.text) {
       return { hasNews: false };
    }

    return JSON.parse(response.text.trim());
  } catch (err) {
    console.error("Error in checkSeriesNewsLive:", err);
    return { hasNews: false };
  }
}
