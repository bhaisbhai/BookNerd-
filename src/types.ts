export interface Book {
  id: string;
  title: string;
  volumeNumber: number;
  releaseDate?: string; // e.g. "1996-08-01" or "August 1996"
  isRead: boolean;
  status: "released" | "upcoming" | "announced" | "rumoured" | "unknown";
  isNovella?: boolean;
  isSpinOff?: boolean;
  isHidden?: boolean;
  // Trust/grounding fields
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

// Canonical/Global Metadata for a Book Series
export interface CanonicalSeries {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl?: string;
  books: Omit<Book, "isRead">[];
  upcomingBook?: UpcomingBook | null;
  lastChecked: string; // ISO string
  sourceUrls?: string[];
  confidence?: "confirmed" | "likely" | "rumoured" | "unknown";
  lastVerifiedAt?: string;
}

// User-specific progress and customizations for a Series
export interface UserSeriesProgress {
  seriesId: string;
  status: "reading" | "up-to-date" | "completed" | "paused";
  rating?: number; // 1 to 5 stars
  notes?: string;
  readBookIds: string[]; // List of book IDs marked as read
  hiddenBookIds: string[]; // List of book IDs hidden by the user
  novellaBookIds?: string[]; // Book IDs marked as novellas
  spinoffBookIds?: string[]; // Book IDs marked as spin-offs
  customBooks?: Book[]; // Manually added books by the user
  customUpcomingBook?: UpcomingBook | null; // Manually edited/added upcoming book
  customBookOrder?: string[]; // Array of book IDs in correct order
  customReleaseDates?: Record<string, string>; // mapping bookId -> customized releaseDate
}

// Merged runtime entity used for UI rendering
export interface TrackedSeries extends CanonicalSeries {
  status: "reading" | "up-to-date" | "completed" | "paused";
  rating?: number;
  notes?: string;
  books: Book[]; // Merged with isRead, novellas, spin-offs, hidden, and custom books
  upcomingBook?: UpcomingBook | null; // Merged with manual upcoming book updates
}

export interface SearchResultSeries {
  title: string;
  author: string;
  description: string;
  coverUrl?: string;
  books: Omit<Book, "isRead">[];
  upcomingBook?: UpcomingBook | null;
  sourceUrls?: string[];
  confidence?: "confirmed" | "likely" | "rumoured" | "unknown";
  lastVerifiedAt?: string;
}

export interface ReleaseNotification {
  id: string;
  seriesId: string;
  seriesTitle: string;
  workId?: string;
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
