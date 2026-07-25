import { BookSuggestion } from "../src/types.js";

/**
 * Fast, lightweight autocomplete for the Add Books search box. Hits Google Books directly
 * (no Gemini call) so it's cheap enough to call on every debounced keystroke.
 */
export async function suggestBooks(query: string): Promise<BookSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(trimmed)}&maxResults=6`;
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    url += `&key=${encodeURIComponent(process.env.GOOGLE_BOOKS_API_KEY)}`;
  }

  const res = await fetch(url, {
    headers: { "User-Agent": "BookNerd/1.0.0" }
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Book suggestion service is rate-limited right now. Try again shortly.");
    }
    throw new Error("Failed to fetch book suggestions.");
  }

  const data = await res.json() as any;
  const items = Array.isArray(data.items) ? data.items : [];

  const seen = new Set<string>();
  const suggestions: BookSuggestion[] = [];

  for (const item of items) {
    const info = item.volumeInfo || {};
    const title = info.title;
    if (!title) continue;

    const author = Array.isArray(info.authors) ? info.authors[0] : "";
    const key = `${title.toLowerCase()}|${(author || "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    suggestions.push({
      title,
      author: author || "Unknown",
      coverUrl: info.imageLinks?.thumbnail?.replace("http://", "https://") || info.imageLinks?.smallThumbnail?.replace("http://", "https://")
    });
  }

  return suggestions;
}
