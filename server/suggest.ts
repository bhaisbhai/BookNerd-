import { BookSuggestion } from "../src/types.js";

/**
 * Fast, lightweight autocomplete for the Add Books search box. Hits Google Books directly (no
 * Gemini call) so it's cheap enough to call on every debounced keystroke. Even with an API key,
 * Google Books can transiently rate-limit or error out under rapid typing-triggered requests, so
 * this falls back to Open Library rather than surfacing an error the moment Google Books hiccups -
 * an empty/degraded suggestion list is a better experience than a scary failure message, especially
 * since typing the full title and pressing Enter (a full Gemini-backed search) always still works.
 */
export async function suggestBooks(query: string): Promise<BookSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const fromGoogleBooks = await suggestFromGoogleBooks(trimmed);
  if (fromGoogleBooks.length > 0) return fromGoogleBooks;

  return suggestFromOpenLibrary(trimmed);
}

async function suggestFromGoogleBooks(query: string): Promise<BookSuggestion[]> {
  try {
    let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=6`;
    if (process.env.GOOGLE_BOOKS_API_KEY) {
      url += `&key=${encodeURIComponent(process.env.GOOGLE_BOOKS_API_KEY)}`;
    }

    const res = await fetch(url, { headers: { "User-Agent": "BookNerd/1.0.0" } });
    if (!res.ok) return [];

    const data = await res.json() as any;
    return dedupeSuggestions(data.items, (item: any) => {
      const info = item.volumeInfo || {};
      if (!info.title) return null;
      const author = Array.isArray(info.authors) ? info.authors[0] : "";
      return {
        title: info.title,
        author: author || "Unknown",
        coverUrl: info.imageLinks?.thumbnail?.replace("http://", "https://") || info.imageLinks?.smallThumbnail?.replace("http://", "https://")
      };
    });
  } catch (error) {
    console.error(`Google Books suggest failed for "${query}":`, error);
    return [];
  }
}

async function suggestFromOpenLibrary(query: string): Promise<BookSuggestion[]> {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=6&fields=title,author_name,cover_i`;
    const res = await fetch(url, { headers: { "User-Agent": "BookNerd/1.0.0 (contact: raj.arjan@gmail.com)" } });
    if (!res.ok) return [];

    const data = await res.json() as any;
    return dedupeSuggestions(data.docs, (doc: any) => {
      if (!doc.title) return null;
      const author = Array.isArray(doc.author_name) ? doc.author_name[0] : "";
      return {
        title: doc.title,
        author: author || "Unknown",
        coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined
      };
    });
  } catch (error) {
    console.error(`Open Library suggest failed for "${query}":`, error);
    return [];
  }
}

function dedupeSuggestions<T>(items: T[] | undefined, toSuggestion: (item: T) => BookSuggestion | null): BookSuggestion[] {
  const seen = new Set<string>();
  const suggestions: BookSuggestion[] = [];
  for (const item of items || []) {
    const suggestion = toSuggestion(item);
    if (!suggestion) continue;
    const key = `${suggestion.title.toLowerCase()}|${suggestion.author.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push(suggestion);
  }
  return suggestions;
}
