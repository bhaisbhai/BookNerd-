import React, { useMemo, useState } from "react";
import { Star, X, Trash2, BookOpen } from "lucide-react";
import { LibraryBook } from "../types.js";
import BookCard from "./BookCard.js";
import RecommendationCard from "./RecommendationCard.js";

interface LibraryTabProps {
  libraryBooks: LibraryBook[];
  onUpdateBook: (id: string, patch: Partial<LibraryBook>) => void;
  onDeleteBook: (id: string) => void;
}

type StatusFilter = "all" | "want_to_read" | "reading" | "read";
type SortBy = "recent" | "title" | "author" | "rating";

const STATUS_LABEL: Record<LibraryBook["status"], string> = {
  want_to_read: "Want to read",
  reading: "Reading",
  read: "Read"
};

export default function LibraryTab({ libraryBooks, onUpdateBook, onDeleteBook }: LibraryTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  const wantToReadBooks = libraryBooks.filter(b => b.status === "want_to_read");
  const tasteSignals = libraryBooks
    .filter(b => b.status === "read" && (b.rating || 0) > 0)
    .map(b => ({ title: b.title, rating: b.rating || 0 }));

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

  const openBook = (book: LibraryBook) => {
    setSelectedId(book.id);
    setNotesDraft(book.notes || "");
  };

  const closeBook = () => {
    if (selectedBook) onUpdateBook(selectedBook.id, { notes: notesDraft });
    setSelectedId(null);
  };

  const counts = {
    all: libraryBooks.length,
    want_to_read: libraryBooks.filter(b => b.status === "want_to_read").length,
    reading: libraryBooks.filter(b => b.status === "reading").length,
    read: libraryBooks.filter(b => b.status === "read").length
  };

  return (
    <div className="space-y-6">
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
            <BookCard key={book.id} title={book.title} author={book.author} coverUrl={book.coverUrl} onClick={() => openBook(book)}>
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
