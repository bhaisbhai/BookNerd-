import React, { useState } from "react";
import { RefreshCw, ChevronDown, ChevronUp, Check, Clock, X, Calendar } from "lucide-react";
import { FollowedSeries, UserSeriesFollow, LibraryBook } from "../types.js";

interface SeriesTabProps {
  followedSeries: FollowedSeries[];
  userFollows: UserSeriesFollow[];
  libraryBooks: LibraryBook[];
  onScanNews: () => void;
  isScanningNews: boolean;
  scanMessage: string;
  onUnfollow: (seriesId: string) => void;
}

function getDaysUntilRelease(dateStr?: string): number | null {
  if (!dateStr) return null;
  const releaseDate = new Date(dateStr);
  if (isNaN(releaseDate.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((releaseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function SeriesTab({ followedSeries, userFollows, libraryBooks, onScanNews, isScanningNews, scanMessage, onUnfollow }: SeriesTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-2xl border border-line shadow-sm p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink">Followed series</p>
          <p className="text-xs text-ink-muted mt-0.5">{scanMessage || "Check for new announcements and release updates."}</p>
        </div>
        <button
          onClick={onScanNews}
          disabled={isScanningNews || followedSeries.length === 0}
          className="px-4 py-2 bg-ink text-white text-xs font-medium rounded-lg hover:opacity-85 transition-opacity cursor-pointer disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanningNews ? "animate-spin" : ""}`} />
          Scan for news
        </button>
      </div>

      {followedSeries.length === 0 ? (
        <div className="border border-dashed border-line rounded-2xl p-12 text-center">
          <Calendar className="w-8 h-8 mx-auto text-ink-muted/40 mb-3" strokeWidth={1.5} />
          <p className="text-sm text-ink-muted">
            You're not following any series yet. Add a book that's part of one from Add Books to start.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {followedSeries.map(series => {
            const follow = userFollows.find(f => f.seriesId === series.id);
            const seriesBooks = libraryBooks.filter(b => b.seriesId === series.id);
            const readCount = seriesBooks.filter(b => b.status === "read").length;
            const isExpanded = expandedId === series.id;
            const daysLeft = getDaysUntilRelease(series.upcomingBook?.releaseDate);

            return (
              <div key={series.id} className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : series.id)}
                  className="w-full p-5 flex items-center justify-between gap-4 text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{series.title}</p>
                    <p className="text-xs text-ink-muted mt-0.5">{series.author} - {readCount} of {series.books.length} read</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {series.upcomingBook && (
                      <span className="text-[11px] font-medium text-accent bg-accent/10 px-2 py-1 rounded-full whitespace-nowrap">
                        {daysLeft !== null && daysLeft > 0 ? `${daysLeft}d until next` : "New book announced"}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-ink-muted" /> : <ChevronDown className="w-4 h-4 text-ink-muted" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4 border-t border-line pt-4">
                    <p className="text-xs text-ink-muted leading-relaxed">{series.description}</p>

                    <div className="space-y-1.5">
                      {series.books.map(b => {
                        const libraryMatch = seriesBooks.find(lb => lb.volumeNumber === b.volumeNumber);
                        const isRead = libraryMatch?.status === "read";
                        return (
                          <div key={b.id} className="flex items-center gap-2.5 text-xs">
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${isRead ? "bg-success" : "bg-app-bg border border-line"}`}>
                              {isRead && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                            </span>
                            <span className="text-ink-muted">Vol. {b.volumeNumber}</span>
                            <span className="text-ink font-medium truncate">{b.title}</span>
                            <span className="text-ink-muted/60 ml-auto whitespace-nowrap">{b.releaseDate || "TBA"}</span>
                          </div>
                        );
                      })}
                    </div>

                    {series.upcomingBook && (
                      <div className="bg-app-bg rounded-xl p-3.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-accent">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-medium uppercase tracking-wide">Upcoming</span>
                        </div>
                        <p className="text-sm font-medium text-ink">{series.upcomingBook.title}</p>
                        <p className="text-xs text-ink-muted">{series.upcomingBook.releaseDate}</p>
                      </div>
                    )}

                    {follow && (
                      <button
                        onClick={() => onUnfollow(series.id)}
                        className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-danger transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Unfollow series
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
