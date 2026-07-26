import { LibraryBook } from "../types.js";
import { normalize } from "./bookMatching.js";

// A title can end up in the library more than once - e.g. added once via search and marked
// "read", then again later via a photo scan, pasted list, or barcode scan, all of which default
// new adds to "want to read". Recommending one of those duplicates as if it were unread reads as
// "recommending a book I've already read," so it's excluded from the recommendable set.
export function getRecommendableWantToRead(libraryBooks: LibraryBook[]): LibraryBook[] {
  const key = (b: LibraryBook) => `${normalize(b.title)}|${normalize(b.author)}`;
  const inProgressOrReadKeys = new Set(
    libraryBooks.filter(b => b.status !== "want_to_read").map(key)
  );
  return libraryBooks.filter(b => b.status === "want_to_read" && !inProgressOrReadKeys.has(key(b)));
}
