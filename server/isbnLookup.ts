import { BookSuggestion } from "../src/types.js";

/**
 * Looks up a book directly by ISBN (decoded from a barcode) - a precise, non-AI lookup that's
 * fast and not subject to the Gemini search-grounding latency/quota issues that affect the
 * title/author-based search flow. Google Books first, Open Library as a fallback.
 */
export async function lookupByIsbn(isbn: string): Promise<BookSuggestion | null> {
  const cleaned = isbn.replace(/[^0-9Xx]/g, "");
  if (!cleaned) return null;

  const fromGoogleBooks = await lookupGoogleBooks(cleaned);
  if (fromGoogleBooks) return fromGoogleBooks;

  return lookupOpenLibrary(cleaned);
}

async function lookupGoogleBooks(isbn: string): Promise<BookSuggestion | null> {
  try {
    let url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=1`;
    if (process.env.GOOGLE_BOOKS_API_KEY) {
      url += `&key=${encodeURIComponent(process.env.GOOGLE_BOOKS_API_KEY)}`;
    }

    const res = await fetch(url, { headers: { "User-Agent": "BookNerd/1.0.0" } });
    if (!res.ok) return null;

    const data = await res.json() as any;
    const info = data.items?.[0]?.volumeInfo;
    if (!info?.title) return null;

    return {
      title: info.title,
      author: Array.isArray(info.authors) ? info.authors[0] : "Unknown",
      coverUrl: info.imageLinks?.thumbnail?.replace("http://", "https://") || info.imageLinks?.smallThumbnail?.replace("http://", "https://")
    };
  } catch (error) {
    console.error(`Google Books ISBN lookup failed for "${isbn}":`, error);
    return null;
  }
}

async function lookupOpenLibrary(isbn: string): Promise<BookSuggestion | null> {
  try {
    const res = await fetch(`https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`, {
      headers: { "User-Agent": "BookNerd/1.0.0 (contact: raj.arjan@gmail.com)" }
    });
    if (!res.ok) return null;

    const data = await res.json() as any;
    if (!data.title) return null;

    let author = "Unknown";
    const authorKey = data.authors?.[0]?.key;
    if (authorKey) {
      try {
        const authorRes = await fetch(`https://openlibrary.org${authorKey}.json`, {
          headers: { "User-Agent": "BookNerd/1.0.0 (contact: raj.arjan@gmail.com)" }
        });
        if (authorRes.ok) {
          const authorData = await authorRes.json() as any;
          author = authorData.name || author;
        }
      } catch {
        // Best-effort - fall through with author left as "Unknown".
      }
    }

    return {
      title: data.title,
      author,
      coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
    };
  } catch (error) {
    console.error(`Open Library ISBN lookup failed for "${isbn}":`, error);
    return null;
  }
}
