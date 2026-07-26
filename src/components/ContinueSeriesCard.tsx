import React from "react";
import { ArrowRight, BookMarked } from "lucide-react";
import { FollowedSeries, LibraryBook, SeriesBook } from "../types.js";
import { getNextToRead } from "../lib/seriesProgress.js";

interface ContinueSeriesCardProps {
  followedSeries: FollowedSeries[];
  libraryBooks: LibraryBook[];
  onStartReading: (series: FollowedSeries, book: SeriesBook) => void;
}

export default function ContinueSeriesCard({ followedSeries, libraryBooks, onStartReading }: ContinueSeriesCardProps) {
  const continuations = followedSeries
    .map((series) => ({ series, next: getNextToRead(series, libraryBooks) }))
    .filter((c): c is { series: FollowedSeries; next: SeriesBook } => c.next !== null)
    // Once the next volume is already in the library (in any status), it's no longer a "start
    // reading" prompt - it already has its own card, and re-clicking here would add a duplicate.
    .filter(({ series, next }) => !libraryBooks.some((b) => b.seriesId === series.id && b.volumeNumber === next.volumeNumber));

  if (continuations.length === 0) return null;

  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2">
        <BookMarked className="w-4 h-4 text-ink-muted" strokeWidth={2} />
        <p className="text-sm font-medium text-ink">Continue your series</p>
      </div>
      <div className="space-y-2">
        {continuations.map(({ series, next }) => (
          <div key={series.id} className="flex items-center justify-between gap-3 bg-app-bg rounded-xl px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-xs text-ink-muted">
                Continue <span className="font-medium text-ink">{series.title}</span>
              </p>
              <p className="text-xs text-ink-muted mt-0.5 truncate">
                Book {next.volumeNumber}: {next.title}
              </p>
            </div>
            <button
              onClick={() => onStartReading(series, next)}
              className="flex items-center gap-1 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent-hover transition-colors cursor-pointer flex-shrink-0"
            >
              Start reading <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
