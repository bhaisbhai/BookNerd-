import React, { useMemo, useState } from "react";
import { Star, X, Trash2, BookOpen, AlertCircle, Search } from "lucide-react";
import { LibraryBook, FollowedSeries, SeriesBook } from "../types.js";
import BookCard from "./BookCard.js";
import RecommendationCard from "./RecommendationCard.js";
import ContinueSeriesCard from "./ContinueSeriesCard.js";
import { getBookLinks } from "../lib/bookLinks.js";
import { slugify, findMatchingBook } from "../lib/bookMatching.js";

interface LibraryTabProps {
  libraryBooks: LibraryBook[];
  followedSeries: FollowedSeries[];
  onUpdateBook: (id: string, patch: Partial<LibraryBook>) => void;
  onDeleteBook: (id: string) => void;
  onAddBooks: (books: LibraryBook[]) => void;
  onFollowSeries: (series: FollowedSeries) => void;
}

type StatusFilter = "all" | "want_to_read" | "reading" | "read";
type SortBy = "recent" | "title" | "author" | "rating";

const STATUS_LABEL: Record<LibraryBook["status"], string> = {
  want_to_read: "Want to read",
  reading: "Reading",
  read: "Read"
};

export default function LibraryTab({ libraryBooks, followedSeries, onUpdateBook, onDeleteBook, onAddBooks, onFollowSeries }: LibraryTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [currentPageDraft, setCurrentPageDraft] = useState("");
  const [totalPagesDraft, setTotalPagesDraft] = useState("");

  const [isCheckingSeries, setIsCheckingSeries] = useState(false);
  const [checkSeriesError, setCheckSeriesError] = useState<string | null>(null);

  const wantToReadBooks = libraryBooks.filter(b => b.status === "want_to_read");
  const tasteSignals = libraryBooks
    .filter(b => b.status === "read" && (b.rating || 0) > 0)
    .map(b => ({ title: b.title, rating: b.rating || 0 }));

  const currentlyReading = libraryBooks.filter(b => b.status === "reading");
  const readThisYear = libraryBooks.filter(b => {
    if (b.status !== "read" || !b.finishedAt) return false;
    const finished = new Date(b.finishedAt);
    return !isNaN(finished.getTime()) && finished.getFullYear() === new Date().getFullYear();
  }).length;

  const progressPercent = (book: LibraryBook) =>
    book.currentPage && book.totalPages && book.totalPages > 0
      ? Math.round((book.currentPage / book.totalPages) * 100)
      : undefined;

  const filtered = useMemo(() => {
    const list = statusFilter === "all" ? libraryBooks : libraryBooks.filter(b => b.status === statusFilter);
    const sorted = [...list];
    if (sortBy === "title") sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === "author") sorted.sort((a, b) => a.author.localeCompare(b.author));
    else if (sortBy === "rating") sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else sorted.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    return sorted;
  }, [libraryBooks, statusFilter, sortBy]);

  const selectedBook = selectedId ? libraryBooks.find(b => b.id === selectedId) || null : null;
  const selectedBookSeries = selectedBook?.seriesId ? followedSeries.find(s => s.id === selectedBook.seriesId) || null : null;

  const openBook = (book: LibraryBook) => {
    setSelectedId(book.id);
    setNotesDraft(book.notes || "");
    setCurrentPageDraft(book.currentPage ? String(book.currentPage) : "");
    setTotalPagesDraft(book.totalPages ? String(book.totalPages) : "");
    setCheckSeriesError(null);
  };

  const closeBook = () => {
    if (selectedBook) {
      const currentPage = currentPageDraft.trim() ? Number(currentPageDraft) : undefined;
      const totalPages = totalPagesDraft.trim() ? Number(totalPagesDraft) : undefined;
      onUpdateBook(selectedBook.id, {
        notes: notesDraft,
        currentPage: currentPage !== undefined && !isNaN(currentPage) ? currentPage : undefined,
        totalPages: totalPages !== undefined && !isNaN(totalPages) ? totalPages : undefined
      });
    }
    setSelectedId(null);
  };

  const handleStartReading = (series: FollowedSeries, book: SeriesBook) => {
    const now = new Date().toISOString();
    onAddBooks([{
      id: `book-${slugify(book.title)}-${Date.now()}`,
      title: book.title,
      author: series.author,
      coverUrl: book.coverUrl || series.coverUrl,
      status: "reading",
      addedAt: now,
      seriesId: series.id,
      volumeNumber: book.volumeNumber,
      source: "search"
    }]);
  };

  const handleCheckForSeries = async () => {
    if (!selectedBook) return;
    setIsCheckingSeries(true);
    setCheckSeriesError(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: `${selectedBook.title} by ${selectedBook.author}` })
      });

      if (res.ok) {
        const raw = await res.json();
        const result = { ...raw, books: Array.isArray(raw.books) ? raw.books : [] };
        const matched = findMatchingBook(result, selectedBook.title);
        const isPartOfSeries = result.books.length > 1 || !!result.upcomingBook;

        if (!matched || !isPartOfSeries) {
          setCheckSeriesError("Couldn't find a series for this book.");
        } else {
          const seriesId = slugify(result.title);
          onUpdateBook(selectedBook.id, { seriesId, volumeNumber: matched.volumeNumber });
          onFollowSeries({
            id: seriesId,
            title: result.title,
            author: result.author,
            description: result.description,
            coverUrl: result.coverUrl,
            books: result.books,
            upcomingBook: result.upcomingBook || null,
            lastChecked: new Date().toISOString(),
            confidence: result.confidence,
            sourceUrls: result.sourceUrls
          });
        }
      } else {
        setCheckSeriesError("Couldn't find a series for this book.");
      }
    } catch (err) {
      console.error(err);
      setCheckSeriesError("An error occurred checking for a series.");
    } finally {
      setIsCheckingSeries(false);
    }
  };

  const counts = {
    all: libraryBooks.length,
    want_to_read: libraryBooks.filter(b => b.status === "want_to_read").length,
    reading: libraryBooks.filter(b => b.status === "reading").length,
    read: libraryBooks.filter(b => b.status === "read").length
  };

  return (
    <div className="space-y-6">
      {readThisYear > 0 && (
        <p className="text-xs text-ink-muted">{readThisYear} book{readThisYear === 1 ? "" : "s"} read in {new Date().getFullYear()}</p>
      )}

      <ContinueSeriesCard followedSeries={followedSeries} libraryBooks={libraryBooks} onStartReading={handleStartReading} />

      {currentlyReading.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-ink">Currently reading</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {currentlyReading.map(book => (
              <BookCard
                key={book.id}
                title={book.title}
                author={book.author}
                coverUrl={book.coverUrl}
                onClick={() => openBook(book)}
                progressPercent={progressPercent(book)}
              >
                {progressPercent(book) !== undefined && (
                  <div className="absolute top-2 right-2 bg-surface/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 shadow-sm">
                    <span className="text-[10px] font-medium text-ink">{progressPercent(book)}%</span>
                  </div>
                )}
              </BookCard>
            ))}
          </div>
        </div>
      )}

      <RecommendationCard
        wantToReadBooks={wantToReadBooks}
        tasteSignals={tasteSignals}
        onStartReading={(id) => onUpdateBook(id, { status: "reading" })}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {(["all", "want_to_read", "reading", "read"] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer ${
                statusFilter === s ? "bg-ink text-white" : "bg-surface text-ink-muted border border-line hover:text-ink"
              }`}
            >
              {s === "all" ? "All" : STATUS_LABEL[s]} <span className="opacity-60">{counts[s]}</span>
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="text-xs text-ink-muted bg-surface border border-line rounded-full px-3 py-1.5 focus:outline-none cursor-pointer"
        >
          <option value="recent">Recently added</option>
          <option value="title">Title</option>
          <option value="author">Author</option>
          <option value="rating">Rating</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-line rounded-2xl p-12 text-center">
          <BookOpen className="w-8 h-8 mx-auto text-ink-muted/40 mb-3" strokeWidth={1.5} />
          <p className="text-sm text-ink-muted">
            {libraryBooks.length === 0 ? "Your library is empty. Head to Add Books to get started." : "No books match this filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filtered.map(book => (
            <BookCard
              key={book.id}
              title={book.title}
              author={book.author}
              coverUrl={book.coverUrl}
              onClick={() => openBook(book)}
              progressPercent={progressPercent(book)}
            >
              {book.rating ? (
                <div className="absolute top-2 right-2 bg-surface/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 flex items-center gap-0.5 shadow-sm">
                  <Star className="w-3 h-3 text-accent fill-accent" />
                  <span className="text-[10px] font-medium text-ink">{book.rating}</span>
                </div>
              ) : null}
            </BookCard>
          ))}
        </div>
      )}

      {selectedBook && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={closeBook}>
          <div className="bg-surface rounded-2xl shadow-lg max-w-md w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="w-14 h-20 flex-shrink-0 bg-app-bg rounded-lg overflow-hidden flex items-center justify-center">
                    {selectedBook.coverUrl ? (
                      <img src={selectedBook.coverUrl} alt={selectedBook.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-ink-muted/40" strokeWidth={1.75} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-ink leading-snug">{selectedBook.title}</h3>
                    <p className="text-xs text-ink-muted mt-0.5">{selectedBook.author}</p>
                    {selectedBookSeries && selectedBook.volumeNumber && (
                      <p className="text-xs text-accent font-medium mt-0.5">
                        Book {selectedBook.volumeNumber} of {selectedBookSeries.books.length} in {selectedBookSeries.title}
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={closeBook} className="text-ink-muted hover:text-ink cursor-pointer flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <p className="text-xs font-medium text-ink-muted mb-2">Status</p>
                <div className="flex gap-2">
                  {(["want_to_read", "reading", "read"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => onUpdateBook(selectedBook.id, { status: s, finishedAt: s === "read" ? new Date().toISOString() : selectedBook.finishedAt })}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                        selectedBook.status === s ? "bg-accent text-white" : "bg-app-bg text-ink-muted hover:text-ink"
                      }`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>

              {selectedBook.status === "reading" && (
                <div>
                  <p className="text-xs font-medium text-ink-muted mb-2">Reading progress</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={currentPageDraft}
                      onChange={(e) => setCurrentPageDraft(e.target.value)}
                      placeholder="Page"
                      className="w-20 bg-app-bg border border-line rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                    <span className="text-xs text-ink-muted">of</span>
                    <input
                      type="number"
                      min={0}
                      value={totalPagesDraft}
                      onChange={(e) => setTotalPagesDraft(e.target.value)}
                      placeholder="Total pages"
                      className="w-24 bg-app-bg border border-line rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                    {Number(currentPageDraft) > 0 && Number(totalPagesDraft) > 0 && (
                      <span className="text-xs text-ink-muted">
                        {Math.round((Number(currentPageDraft) / Number(totalPagesDraft)) * 100)}% through
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-ink-muted mb-2">Rating</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => onUpdateBook(selectedBook.id, { rating: selectedBook.rating === n ? 0 : n })} className="cursor-pointer">
                      <Star className={`w-5 h-5 ${(selectedBook.rating || 0) >= n ? "text-accent fill-accent" : "text-line"}`} strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-ink-muted mb-2">Buy or borrow</p>
                <div className="flex flex-wrap gap-2">
                  {getBookLinks(selectedBook.title, selectedBook.author).map(link => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-app-bg text-ink-muted hover:text-ink text-xs font-medium rounded-lg transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>

              {!selectedBook.seriesId && (
                <div>
                  <button
                    onClick={handleCheckForSeries}
                    disabled={isCheckingSeries}
                    className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <Search className="w-3.5 h-3.5" /> {isCheckingSeries ? "Checking..." : "Check if this is part of a series"}
                  </button>
                  {checkSeriesError && (
                    <div className="flex items-start gap-1.5 pt-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-danger mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-ink-muted">{checkSeriesError}</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-ink-muted mb-2">Notes</p>
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={3}
                  placeholder="Add a note..."
                  className="w-full bg-app-bg border border-line rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
              </div>

              <button
                onClick={() => { onDeleteBook(selectedBook.id); setSelectedId(null); }}
                className="flex items-center gap-1.5 text-xs text-danger hover:opacity-70 transition-opacity cursor-pointer pt-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove from library
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
