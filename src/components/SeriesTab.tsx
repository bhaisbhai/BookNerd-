import React, { useState } from "react";
import { RefreshCw, ChevronDown, ChevronUp, Check, Clock, X, Calendar, BookMarked, BookOpen, Star } from "lucide-react";
import { FollowedSeries, UserSeriesFollow, LibraryBook, SeriesBook } from "../types.js";
import { getNextToRead } from "../lib/seriesProgress.js";
import { slugify } from "../lib/bookMatching.js";

interface SeriesTabProps {
  followedSeries: FollowedSeries[];
  userFollows: UserSeriesFollow[];
  libraryBooks: LibraryBook[];
  onScanNews: () => void;
  isScanningNews: boolean;
  scanMessage: string;
  onUnfollow: (seriesId: string) => void;
  onUpdateBook: (id: string, patch: Partial<LibraryBook>) => void;
  onAddBooks: (books: LibraryBook[]) => void;
}

type StatusValue = "" | LibraryBook["status"];

const STATUS_LABEL: Record<LibraryBook["status"], string> = {
  want_to_read: "Want to read",
  reading: "Reading",
  read: "Read"
};

function getDaysUntilRelease(dateStr?: string): number | null {
  if (!dateStr) return null;
  const releaseDate = new Date(dateStr);
  if (isNaN(releaseDate.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((releaseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function SeriesTab({ followedSeries, userFollows, libraryBooks, onScanNews, isScanningNews, scanMessage, onUnfollow, onUpdateBook, onAddBooks }: SeriesTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ series: FollowedSeries; book: SeriesBook } | null>(null);

  const setBookStatus = (series: FollowedSeries, book: SeriesBook, libraryMatch: LibraryBook | undefined, status: LibraryBook["status"]) => {
    if (libraryMatch) {
      onUpdateBook(libraryMatch.id, { status, finishedAt: status === "read" ? new Date().toISOString() : libraryMatch.finishedAt });
    } else {
      const now = new Date().toISOString();
      onAddBooks([{
        id: `book-${slugify(book.title)}-${Date.now()}`,
        title: book.title,
        author: series.author,
        coverUrl: book.coverUrl || series.coverUrl,
        status,
        addedAt: now,
        finishedAt: status === "read" ? now : undefined,
        seriesId: series.id,
        volumeNumber: book.volumeNumber,
        source: "search"
      }]);
    }
  };

  const detailLibraryMatch = detail ? libraryBooks.find(lb => lb.seriesId === detail.series.id && lb.volumeNumber === detail.book.volumeNumber) : undefined;

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
            const nextToRead = getNextToRead(series, libraryBooks);

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
                            <button
                              onClick={() => setDetail({ series, book: b })}
                              className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer hover:text-ink"
                            >
                              <span className="text-ink-muted flex-shrink-0">Vol. {b.volumeNumber}</span>
                              <span className="text-ink font-medium truncate">{b.title}</span>
                              {nextToRead?.id === b.id && (
                                <span className="flex items-center gap-1 text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                                  <BookMarked className="w-2.5 h-2.5" /> Next up
                                </span>
                              )}
                            </button>
                            <select
                              value={(libraryMatch?.status || "") as StatusValue}
                              onChange={(e) => setBookStatus(series, b, libraryMatch, e.target.value as LibraryBook["status"])}
                              className="text-[11px] text-ink-muted bg-app-bg border border-line rounded-full px-2 py-1 focus:outline-none cursor-pointer flex-shrink-0"
                            >
                              <option value="" disabled hidden>Add</option>
                              <option value="want_to_read">Want to read</option>
                              <option value="reading">Reading</option>
                              <option value="read">Read</option>
                            </select>
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

      {detail && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setDetail(null)}>
          <div className="bg-surface rounded-2xl shadow-lg max-w-md w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="w-14 h-20 flex-shrink-0 bg-app-bg rounded-lg overflow-hidden flex items-center justify-center">
                    {(detail.book.coverUrl || detail.series.coverUrl) ? (
                      <img src={detail.book.coverUrl || detail.series.coverUrl} alt={detail.book.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-ink-muted/40" strokeWidth={1.75} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-ink leading-snug">{detail.book.title}</h3>
                    <p className="text-xs text-ink-muted mt-0.5">{detail.series.author}</p>
                    <p className="text-xs text-accent font-medium mt-0.5">
                      Book {detail.book.volumeNumber} of {detail.series.books.length} in {detail.series.title}
                    </p>
                  </div>
                </div>
                <button onClick={() => setDetail(null)} className="text-ink-muted hover:text-ink cursor-pointer flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs text-ink-muted">
                <span>{detail.book.releaseDate || "Release date TBA"}</span>
                {typeof detail.book.averageRating === "number" && (
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                    {detail.book.averageRating.toFixed(1)}
                    {detail.book.ratingsCount ? ` (${detail.book.ratingsCount.toLocaleString()})` : ""}
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-ink-muted mb-2">Status</p>
                <div className="flex gap-2">
                  {(["want_to_read", "reading", "read"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setBookStatus(detail.series, detail.book, detailLibraryMatch, s)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                        detailLibraryMatch?.status === s ? "bg-accent text-white" : "bg-app-bg text-ink-muted hover:text-ink"
                      }`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-ink-muted mb-2">Synopsis</p>
                <p className="text-sm text-ink-muted leading-relaxed">{detail.book.description || detail.series.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
