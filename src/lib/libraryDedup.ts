import { LibraryBook } from "../types.js";
import { normalize } from "./bookMatching.js";

// A title can end up in the library more than once - e.g. added once via search and marked
// "read", then again later via a photo scan, pasted list, or barcode scan, all of which default
// new adds to "want to read". Recommending one of those duplicates as if it were unread reads as
// "recommending a book I've already read," so it's excluded from the recommendable set.
//
// Matches on title alone, not title+author: scanned/barcode-added duplicates routinely have an
// empty or OCR-imperfect author field that wouldn't match the original entry's author, which let
// real duplicates slip through when matching required both to agree. The rare false positive
// (two different books that happen to share an exact title) is a much smaller cost than still
// recommending something already finished.
export function getRecommendableWantToRead(libraryBooks: LibraryBook[]): LibraryBook[] {
  const key = (b: LibraryBook) => normalize(b.title);
  const inProgressOrReadTitles = new Set(
    libraryBooks.filter(b => b.status !== "want_to_read").map(key)
  );
  return libraryBooks.filter(b => b.status === "want_to_read" && !inProgressOrReadTitles.has(key(b)));
}
