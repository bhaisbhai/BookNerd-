import { FollowedSeries, LibraryBook, SeriesBook } from "../types.js";

// The next unread, released volume in a followed series - only surfaced once the user has
// actually started the series (read at least one book in it), so a freshly-followed series
// with nothing read yet isn't misleadingly flagged as "continue".
export function getNextToRead(series: FollowedSeries, libraryBooks: LibraryBook[]): SeriesBook | null {
  const inSeries = libraryBooks.filter((b) => b.seriesId === series.id);
  const hasStarted = inSeries.some((b) => b.status === "read");
  if (!hasStarted) return null;

  const readVolumeNumbers = new Set(
    inSeries.filter((b) => b.status === "read").map((b) => b.volumeNumber)
  );

  const candidates = series.books
    .filter((book) => book.status === "released" && !readVolumeNumbers.has(book.volumeNumber))
    .sort((a, b) => a.volumeNumber - b.volumeNumber);

  return candidates[0] ?? null;
}
