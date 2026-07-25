import React, { useEffect, useRef, useState } from "react";
import { Search, Camera, Check, X, BookOpen, AlertCircle } from "lucide-react";
import { LibraryBook, BookSuggestion, SeriesSearchResult, SeriesBook, FollowedSeries, ScanCandidate } from "../types.js";
import { fileToResizedBase64 } from "../lib/imageUtils.js";
import { slugify, normalize, findMatchingBook } from "../lib/bookMatching.js";

interface AddBooksTabProps {
  libraryBooks: LibraryBook[];
  onAddBooks: (books: LibraryBook[]) => void;
  onFollowSeries: (series: FollowedSeries) => void;
}

interface ReviewCandidate extends ScanCandidate {
  include: boolean;
}

type ConfirmStatus = "want_to_read" | "reading" | "read";

export default function AddBooksTab({ libraryBooks, onAddBooks, onFollowSeries }: AddBooksTabProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<BookSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [searchTakingAWhile, setSearchTakingAWhile] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const confirmationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showConfirmation = (message: string) => {
    if (confirmationTimerRef.current) clearTimeout(confirmationTimerRef.current);
    setConfirmationMessage(message);
    confirmationTimerRef.current = setTimeout(() => setConfirmationMessage(null), 3000);
  };

  useEffect(() => {
    return () => {
      if (confirmationTimerRef.current) clearTimeout(confirmationTimerRef.current);
    };
  }, []);

  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<BookSuggestion | null>(null);
  const [seriesResult, setSeriesResult] = useState<SeriesSearchResult | null>(null);
  const [matchedBook, setMatchedBook] = useState<SeriesBook | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<ConfirmStatus>("want_to_read");
  const [followSeries, setFollowSeries] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextSuggestRef = useRef(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (suppressNextSuggestRef.current) {
      suppressNextSuggestRef.current = false;
      return;
    }

    if (query.trim().length < 2) {
      setSuggestions([]);
      setSuggestError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setSuggestError(null);
        } else {
          // Don't leave a previous query's results on screen when this one failed - that
          // reads as "no match for what I typed" rather than "search failed, try again."
          setSuggestions([]);
          const errData = await res.json().catch(() => null);
          setSuggestError(errData?.error || "Search is temporarily unavailable.");
        }
      } catch (err) {
        console.error(err);
        setSuggestions([]);
        setSuggestError("Search is temporarily unavailable.");
      } finally {
        setIsSuggesting(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Shared by both paths into a lookup: picking a suggestion, and typing a full title and
  // hitting Enter directly (which doesn't depend on the suggestions API working at all).
  const runSearch = async (searchQuery: string, matchTitle: string) => {
    setSeriesResult(null);
    setMatchedBook(null);
    setSearchError(null);
    setConfirmStatus("want_to_read");
    setFollowSeries(true);
    setIsSearching(true);
    setSearchTakingAWhile(false);

    // Live web search can genuinely take a while - say so after a few seconds rather than
    // leaving a bare "Looking up details..." that starts to look stuck.
    const slowTimer = setTimeout(() => setSearchTakingAWhile(true), 5000);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery })
      });

      if (res.ok) {
        const raw = await res.json();
        // Defense-in-depth: normalize here too, even though the server guarantees this -
        // an AI-generated response shape should never be trusted blindly on the client either.
        const result: SeriesSearchResult = { ...raw, books: Array.isArray(raw.books) ? raw.books : [] };
        if (result.books.length === 0) {
          setSearchError("Couldn't find book details for that title. Try again.");
        } else {
          setSeriesResult(result);
          setMatchedBook(findMatchingBook(result, matchTitle));
        }
      } else {
        const errData = await res.json().catch(() => null);
        setSearchError(errData?.error || "Couldn't find details for that book. Try again.");
      }
    } catch (err) {
      console.error(err);
      setSearchError("An error occurred looking up that book.");
    } finally {
      clearTimeout(slowTimer);
      setIsSearching(false);
      setSearchTakingAWhile(false);
    }
  };

  const handleSelectSuggestion = (suggestion: BookSuggestion) => {
    suppressNextSuggestRef.current = true;
    setShowSuggestions(false);
    setQuery(suggestion.title);
    setSuggestions([]);
    setSuggestError(null);
    setSelectedSuggestion(suggestion);
    runSearch(`${suggestion.title} by ${suggestion.author}`, suggestion.title);
  };

  // Fallback for when you already know exactly what you want and don't want to wait on (or
  // depend on) the instant-suggestions API - just type the full title and press Enter.
  const handleDirectSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const typed = query.trim();
    if (!typed || isSearching) return;

    suppressNextSuggestRef.current = true;
    setShowSuggestions(false);
    setSuggestions([]);
    setSuggestError(null);
    setSelectedSuggestion({ title: typed, author: "" });
    runSearch(typed, typed);
  };

  const isAlreadyInLibrary = (title: string, author: string) => {
    const key = `${normalize(title)}|${normalize(author)}`;
    return libraryBooks.some(b => `${normalize(b.title)}|${normalize(b.author)}` === key);
  };

  const isPartOfOngoingSeries = seriesResult && (seriesResult.books.length > 1 || !!seriesResult.upcomingBook);

  const handleConfirmAdd = () => {
    if (!seriesResult || !matchedBook || !selectedSuggestion) return;

    const seriesId = isPartOfOngoingSeries ? slugify(seriesResult.title) : undefined;
    const now = new Date().toISOString();

    const book: LibraryBook = {
      id: `book-${slugify(matchedBook.title)}-${Date.now()}`,
      title: matchedBook.title,
      author: seriesResult.author,
      coverUrl: seriesResult.coverUrl || selectedSuggestion.coverUrl,
      status: confirmStatus,
      addedAt: now,
      finishedAt: confirmStatus === "read" ? now : undefined,
      seriesId,
      volumeNumber: seriesId ? matchedBook.volumeNumber : undefined,
      source: "search"
    };

    onAddBooks([book]);

    if (seriesId && followSeries) {
      const followed: FollowedSeries = {
        id: seriesId,
        title: seriesResult.title,
        author: seriesResult.author,
        description: seriesResult.description,
        coverUrl: seriesResult.coverUrl,
        books: seriesResult.books,
        upcomingBook: seriesResult.upcomingBook || null,
        lastChecked: now,
        confidence: seriesResult.confidence,
        sourceUrls: seriesResult.sourceUrls
      };
      onFollowSeries(followed);
    }

    showConfirmation(`Added "${book.title}" to your library${seriesId && followSeries ? ` and followed ${seriesResult.title}` : ""}`);
    resetSearch();
  };

  const resetSearch = () => {
    setQuery("");
    setSuggestions([]);
    setSelectedSuggestion(null);
    setSeriesResult(null);
    setMatchedBook(null);
    setSearchError(null);
  };

  // --- Screenshot scan flow ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [reviewCandidates, setReviewCandidates] = useState<ReviewCandidate[] | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsScanning(true);
    setScanError(null);
    setReviewCandidates(null);

    try {
      const { base64, mimeType } = await fileToResizedBase64(file);
      const res = await fetch("/api/scan-books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType })
      });

      if (res.ok) {
        const data = await res.json();
        const candidates: ReviewCandidate[] = (data.books || []).map((b: ScanCandidate) => ({ ...b, include: true }));
        if (candidates.length === 0) {
          setScanError("No books could be identified in that photo. Try a clearer, well-lit shot of the spines.");
        } else {
          setReviewCandidates(candidates);
        }
      } else {
        const errData = await res.json().catch(() => null);
        setScanError(errData?.error || "Failed to scan that photo. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setScanError("An error occurred reading or uploading that photo.");
    } finally {
      setIsScanning(false);
    }
  };

  const updateCandidate = (index: number, patch: Partial<ReviewCandidate>) => {
    setReviewCandidates(prev => prev ? prev.map((c, i) => i === index ? { ...c, ...patch } : c) : prev);
  };

  const confirmAddCandidates = () => {
    if (!reviewCandidates) return;
    const now = Date.now();
    const newBooks: LibraryBook[] = reviewCandidates
      .filter(c => c.include && c.title.trim())
      .map((c, idx) => ({
        id: `book-${slugify(c.title)}-${now}-${idx}`,
        title: c.title.trim(),
        author: c.author.trim(),
        coverUrl: c.coverUrl,
        status: "want_to_read" as const,
        addedAt: new Date().toISOString(),
        source: "scanned" as const
      }));

    if (newBooks.length > 0) {
      onAddBooks(newBooks);
      showConfirmation(`Added ${newBooks.length} book${newBooks.length === 1 ? "" : "s"} to your library`);
    }
    setReviewCandidates(null);
  };

  return (
    <div className="space-y-6">
      {confirmationMessage && (
        <div className="bg-success/10 border border-success/20 rounded-2xl px-4 py-3 flex items-center gap-2.5">
          <Check className="w-4 h-4 text-success flex-shrink-0" strokeWidth={2.5} />
          <p className="text-sm text-ink">{confirmationMessage}</p>
        </div>
      )}

      {/* Search */}
      <div className="bg-surface rounded-2xl border border-line shadow-sm p-5 relative">
        <form onSubmit={handleDirectSearch} className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" strokeWidth={2} />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search for a book, or type the full title and press Enter..."
              className="w-full bg-app-bg border border-line pl-10 pr-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder-ink-muted"
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || isSearching}
            className="px-4 py-2.5 bg-ink text-white text-xs font-medium rounded-xl hover:opacity-85 transition-opacity cursor-pointer disabled:opacity-40 flex-shrink-0"
          >
            Search
          </button>
        </form>

        {showSuggestions && query.trim().length >= 2 && (suggestions.length > 0 || isSuggesting || suggestError) && (
          <div className="absolute left-5 right-[5.5rem] mt-1.5 bg-surface border border-line rounded-xl shadow-md overflow-hidden z-10 max-h-72 overflow-y-auto">
            {isSuggesting && suggestions.length === 0 ? (
              <div className="p-4 text-xs text-ink-muted text-center">Searching...</div>
            ) : suggestError ? (
              <div className="p-4 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-danger mt-0.5 flex-shrink-0" />
                <p className="text-xs text-ink-muted">{suggestError} Press Enter to search directly instead.</p>
              </div>
            ) : (
              suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full flex items-center gap-3 p-2.5 hover:bg-app-bg transition-colors text-left cursor-pointer"
                >
                  <div className="w-8 h-11 flex-shrink-0 bg-app-bg rounded overflow-hidden flex items-center justify-center">
                    {s.coverUrl ? (
                      <img src={s.coverUrl} alt={s.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-3.5 h-3.5 text-ink-muted/40" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{s.title}</p>
                    <p className="text-xs text-ink-muted truncate">{s.author}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {isSearching && (
        <div className="bg-surface rounded-2xl border border-line shadow-sm p-6 text-center">
          <p className="text-sm text-ink-muted">
            {searchTakingAWhile ? "Still searching the web for verified details - this can take a bit..." : "Looking up details..."}
          </p>
        </div>
      )}

      {searchError && (
        <div className="bg-danger/5 border border-danger/20 rounded-2xl p-4 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
          <p className="text-sm text-ink-muted">{searchError}</p>
        </div>
      )}

      {seriesResult && matchedBook && selectedSuggestion && (
        <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
          <div className="p-5 flex gap-4">
            <div className="w-16 h-24 flex-shrink-0 bg-app-bg rounded-lg overflow-hidden flex items-center justify-center">
              {(seriesResult.coverUrl || selectedSuggestion.coverUrl) ? (
                <img src={seriesResult.coverUrl || selectedSuggestion.coverUrl} alt={matchedBook.title} className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="w-6 h-6 text-ink-muted/40" strokeWidth={1.75} />
              )}
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
              <h3 className="text-base font-semibold text-ink leading-snug">{matchedBook.title}</h3>
              <p className="text-xs text-ink-muted">{seriesResult.author}</p>
              {isAlreadyInLibrary(matchedBook.title, seriesResult.author) && (
                <p className="text-xs text-accent font-medium">Already in your library</p>
              )}
              <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">{seriesResult.description}</p>
            </div>
          </div>

          <div className="px-5 pb-5 space-y-4">
            <div>
              <p className="text-xs font-medium text-ink-muted mb-2">Status</p>
              <div className="flex gap-2">
                {(["want_to_read", "reading", "read"] as ConfirmStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setConfirmStatus(s)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                      confirmStatus === s ? "bg-accent text-white" : "bg-app-bg text-ink-muted hover:text-ink"
                    }`}
                  >
                    {s === "want_to_read" ? "Want to read" : s === "reading" ? "Reading" : "Read"}
                  </button>
                ))}
              </div>
            </div>

            {isPartOfOngoingSeries && (
              <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={followSeries}
                  onChange={(e) => setFollowSeries(e.target.checked)}
                  className="rounded border-line text-accent focus:ring-accent/30"
                />
                Also follow <span className="font-medium text-ink">{seriesResult.title}</span> for new release news
              </label>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={resetSearch}
                className="px-4 py-2 text-ink-muted text-xs font-medium rounded-lg hover:bg-app-bg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAdd}
                className="px-4 py-2 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent-hover transition-colors cursor-pointer"
              >
                Add to Library
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-line" />
        <span className="text-xs text-ink-muted">or</span>
        <div className="flex-1 h-px bg-line" />
      </div>

      {/* Scan a photo */}
      <div className="bg-surface rounded-2xl border border-line shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-ink-muted" strokeWidth={2} />
          <p className="text-sm font-medium text-ink">Scan a photo of your shelf</p>
        </div>
        <p className="text-xs text-ink-muted">Snap a photo of a bookshelf or stack - we'll identify the titles and let you review them before adding.</p>

        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanning}
          className="px-4 py-2 bg-app-bg text-ink text-xs font-medium rounded-lg hover:bg-line transition-colors cursor-pointer disabled:opacity-40"
        >
          {isScanning ? "Scanning..." : "Upload a Photo"}
        </button>

        {scanError && (
          <div className="flex items-start gap-2 pt-1">
            <AlertCircle className="w-3.5 h-3.5 text-danger mt-0.5 flex-shrink-0" />
            <p className="text-xs text-ink-muted">{scanError}</p>
          </div>
        )}
      </div>

      {reviewCandidates && (
        <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
          <div className="p-5 border-b border-line flex items-center justify-between">
            <h4 className="text-sm font-semibold text-ink">
              Found {reviewCandidates.length} book{reviewCandidates.length === 1 ? "" : "s"} - review before adding
            </h4>
            <button onClick={() => setReviewCandidates(null)} className="text-ink-muted hover:text-ink cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-line">
            {reviewCandidates.map((c, idx) => (
              <div key={idx} className={`p-3 flex items-center gap-3 ${c.include ? "" : "opacity-40"}`}>
                <button
                  onClick={() => updateCandidate(idx, { include: !c.include })}
                  className={`w-5 h-5 flex-shrink-0 rounded-md flex items-center justify-center cursor-pointer transition-colors ${c.include ? "bg-accent" : "bg-app-bg border border-line"}`}
                >
                  {c.include && <Check className="w-3 h-3 text-white" strokeWidth={2.5} />}
                </button>

                <div className="w-8 h-11 flex-shrink-0 bg-app-bg rounded overflow-hidden flex items-center justify-center">
                  {c.coverUrl ? (
                    <img src={c.coverUrl} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="w-3.5 h-3.5 text-ink-muted/40" />
                  )}
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    value={c.title}
                    onChange={(e) => updateCandidate(idx, { title: e.target.value })}
                    className="bg-app-bg border border-line px-2.5 py-1.5 text-xs font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder="Title"
                  />
                  <input
                    value={c.author}
                    onChange={(e) => updateCandidate(idx, { author: e.target.value })}
                    className="bg-app-bg border border-line px-2.5 py-1.5 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder="Author"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-5 border-t border-line flex justify-end gap-2">
            <button
              onClick={() => setReviewCandidates(null)}
              className="px-4 py-2 text-ink-muted text-xs font-medium rounded-lg hover:bg-app-bg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={confirmAddCandidates}
              disabled={!reviewCandidates.some(c => c.include && c.title.trim())}
              className="px-4 py-2 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-40"
            >
              Add {reviewCandidates.filter(c => c.include && c.title.trim()).length} to Library
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
