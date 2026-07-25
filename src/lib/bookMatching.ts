import { SeriesBook, SeriesSearchResult } from "../types.js";

export function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function normalize(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Finds the book within a series search result that corresponds to what the user actually
 * searched for. queryTitle is often not a clean book title on its own - it can be the exact
 * suggestion title (clean), or free text typed directly into search that includes the author
 * ("Mistborn: The Well of Ascension by Brandon Sanderson"), a partial title, or extra whitespace.
 *
 * Falls back to a substring match in both directions before giving up and returning the first
 * book in the series - an exact-only match would silently return the wrong book (always book 1)
 * for anything but a perfectly clean title, which previously caused a real bug: searching for a
 * later volume with "Title by Author" phrasing always added the first book in the series instead.
 */
export function findMatchingBook(result: SeriesSearchResult, queryTitle: string): SeriesBook | null {
  if (!result.books || result.books.length === 0) return null;

  const target = normalize(queryTitle);

  const exact = result.books.find(b => normalize(b.title) === target);
  if (exact) return exact;

  const substring = result.books.find(b => {
    const bookTitle = normalize(b.title);
    return bookTitle.length > 0 && (target.includes(bookTitle) || bookTitle.includes(target));
  });
  if (substring) return substring;

  return result.books[0];
}
