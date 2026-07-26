// A book the user is personally tracking - the single source of truth for "have I read this."
// Optionally linked to a followed series via seriesId/volumeNumber, but tracked independently.
export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  status: "want_to_read" | "reading" | "read";
  rating?: number; // 1 to 5 stars, meaningful once read
  notes?: string;
  addedAt: string; // ISO string
  finishedAt?: string; // ISO string, set when moved to "read"
  seriesId?: string;
  volumeNumber?: number;
  source: "search" | "scanned" | "manual";
  currentPage?: number;
  totalPages?: number;
}

// One volume in a series' canonical, shared publication timeline.
export interface SeriesBook {
  id: string;
  title: string;
  volumeNumber: number;
  releaseDate?: string; // e.g. "1996-08-01" or "August 1996"
  status: "released" | "upcoming" | "announced" | "rumoured" | "unknown";
  sourceUrls?: string[];
  confidence?: "confirmed" | "likely" | "rumoured" | "unknown";
  lastVerifiedAt?: string;
}

export interface UpcomingBook {
  title: string;
  releaseDate: string; // e.g. "2026-11-20" or "TBA 2027"
  description?: string;
  status: "announced" | "upcoming" | "rumoured" | "unknown";
  sourceUrls?: string[];
  confidence?: "confirmed" | "likely" | "rumoured" | "unknown";
  lastVerifiedAt?: string;
}

// Canonical/global metadata for a series - shared across all users, purely about the
// publication timeline and release news, decoupled from anyone's personal read status.
export interface FollowedSeries {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl?: string;
  books: SeriesBook[];
  upcomingBook?: UpcomingBook | null;
  lastChecked: string; // ISO string
  sourceUrls?: string[];
  confidence?: "confirmed" | "likely" | "rumoured" | "unknown";
  lastVerifiedAt?: string;
}

// A user's personal follow relationship to a series - just enough to know they're
// subscribed to its news/releases, plus an optional series-level rating/notes.
export interface UserSeriesFollow {
  seriesId: string;
  rating?: number;
  notes?: string;
  followedAt: string; // ISO string
}

// Fast, lightweight autocomplete result (no Gemini call) shown while typing.
export interface BookSuggestion {
  title: string;
  author: string;
  coverUrl?: string;
}

// Fuller, Gemini-enriched result once a suggestion is chosen or a search is committed to.
// Represents the whole series timeline the searched book belongs to (which may be a single
// standalone book with one entry in `books`) - the client picks out the specific book being
// added and optionally offers to follow the rest of the series for release news.
export interface SeriesSearchResult {
  title: string; // series title (== book title for standalone books)
  author: string;
  description: string;
  coverUrl?: string;
  books: SeriesBook[];
  upcomingBook?: UpcomingBook | null;
  sourceUrls?: string[];
  confidence?: "confirmed" | "likely" | "rumoured" | "unknown";
  lastVerifiedAt?: string;
}

// A book identified from a bookshelf photo scan, pending user review before it's added.
export interface ScanCandidate {
  title: string;
  author: string;
  coverUrl?: string;
}

// Result of asking for a "what should I read next" recommendation.
export interface BookRecommendation {
  id: string; // matches a LibraryBook id
  title: string;
  author: string;
  reason: string;
}

export interface ReleaseNotification {
  id: string;
  seriesId: string;
  seriesTitle: string;
  bookTitle?: string;
  releaseDate?: string;
  alertType?: "new_book_found" | "release_date_added" | "release_date_changed" | "cover_revealed" | "book_released_today" | "no_confirmed_update";
  type?: string; // compatibility field
  title?: string;
  message: string;
  sourceUrls?: string[];
  confidence?: "confirmed" | "likely" | "rumoured";
  createdAt?: string;
  dateAdded: string; // compatibility
}
