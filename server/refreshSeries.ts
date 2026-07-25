import { searchBookSeriesLive } from "./gemini.js";
import { CanonicalSeries, Book } from "../src/types.js";

export interface RefreshSeriesInput {
  id: string;
  title: string;
  author: string;
  books: { id: string; title: string }[];
  upcomingBook?: { title: string } | null;
}

export interface RefreshSeriesResult {
  canonical: CanonicalSeries;
  hasNewAnnouncement: boolean;
}

/**
 * Re-queries live search grounding for a series and rebuilds its canonical
 * metadata, preserving existing book ids (matched by normalized title) so
 * per-user read progress keyed on those ids still lines up.
 */
export async function refreshSeriesData(input: RefreshSeriesInput): Promise<RefreshSeriesResult> {
  const freshData = await searchBookSeriesLive(`${input.title} by ${input.author}`);

  const existingIdByKey = new Map<string, string>();
  input.books.forEach(b => {
    const key = b.title.toLowerCase().replace(/[^a-z0-9]+/g, "");
    existingIdByKey.set(key, b.id);
  });

  const books: Omit<Book, "isRead">[] = (freshData.books || []).map((freshBook, idx) => {
    const key = freshBook.title.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const existingId = existingIdByKey.get(key);
    return {
      ...freshBook,
      id: existingId || freshBook.id || `book-${idx + 1}`
    };
  });

  const oldUpcomingTitle = input.upcomingBook?.title;
  const newUpcomingTitle = freshData.upcomingBook?.title;
  const hasNewAnnouncement = Boolean(newUpcomingTitle && newUpcomingTitle !== oldUpcomingTitle);

  const canonical: CanonicalSeries = {
    id: input.id,
    title: input.title,
    author: input.author,
    description: freshData.description || "",
    books,
    upcomingBook: freshData.upcomingBook || null,
    lastChecked: new Date().toISOString(),
    confidence: freshData.confidence,
    sourceUrls: freshData.sourceUrls
  };

  return { canonical, hasNewAnnouncement };
}
