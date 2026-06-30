import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, 
  Calendar, 
  Search, 
  Trash2, 
  Check, 
  RotateCw, 
  Bell, 
  Plus, 
  Star, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Newspaper, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  BookMarked,
  Sparkles,
  LogOut,
  UserCheck,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Sliders,
  ExternalLink,
  Info,
  Edit2
} from "lucide-react";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { auth, googleProvider, db } from "./lib/firebase.js";
import { TrackedSeries, CanonicalSeries, UserSeriesProgress, SearchResultSeries, ReleaseNotification, Book, UpcomingBook } from "./types.js";

// Curated demo/sample series data for one-click add recommendation panel
const RECOMMENDED_SERIES: any[] = [
  {
    id: "stormlight-archive",
    title: "The Stormlight Archive",
    author: "Brandon Sanderson",
    description: "An epic fantasy series set on the shattered world of Roshar, where storms of incredible power sweep the land and legendary knights must arise.",
    books: [
      { id: "way-of-kings", title: "The Way of Kings", volumeNumber: 1, releaseDate: "2010-08-31", status: "released", confidence: "confirmed", sourceUrls: ["https://www.brandonsanderson.com/"] },
      { id: "words-of-radiance", title: "Words of Radiance", volumeNumber: 2, releaseDate: "2014-03-04", status: "released", confidence: "confirmed", sourceUrls: ["https://www.brandonsanderson.com/"] },
      { id: "oathbringer", title: "Oathbringer", volumeNumber: 3, releaseDate: "2017-11-14", status: "released", confidence: "confirmed", sourceUrls: ["https://www.brandonsanderson.com/"] },
      { id: "rhythm-of-war", title: "Rhythm of War", volumeNumber: 4, releaseDate: "2020-11-17", status: "released", confidence: "confirmed", sourceUrls: ["https://www.brandonsanderson.com/"] }
    ],
    upcomingBook: {
      title: "Wind and Truth (Volume 5)",
      releaseDate: "2024-12-06",
      description: "The epic conclusion to the first five-book arc of the Stormlight Archive.",
      status: "upcoming",
      confidence: "confirmed",
      sourceUrls: ["https://www.brandonsanderson.com/"]
    }
  },
  {
    id: "kingkiller-chronicle",
    title: "The Kingkiller Chronicle",
    author: "Patrick Rothfuss",
    description: "The fantasy trilogy telling the autobiography of Kvothe, a legendary musician, arcanist, and adventurer who became a notorious kingkiller.",
    books: [
      { id: "name-of-the-wind", title: "The Name of the Wind", volumeNumber: 1, releaseDate: "2007-03-27", status: "released", confidence: "confirmed", sourceUrls: ["http://www.patrickrothfuss.com/"] },
      { id: "wise-mans-fear", title: "The Wise Man's Fear", volumeNumber: 2, releaseDate: "2011-03-01", status: "released", confidence: "confirmed", sourceUrls: ["http://www.patrickrothfuss.com/"] }
    ],
    upcomingBook: {
      title: "The Doors of Stone (Volume 3)",
      releaseDate: "TBA",
      description: "The long-awaited, highly anticipated final volume of the trilogy.",
      status: "announced",
      confidence: "rumoured",
      sourceUrls: ["http://www.patrickrothfuss.com/"]
    }
  },
  {
    id: "red-rising",
    title: "Red Rising Saga",
    author: "Pierce Brown",
    description: "A dystopian science fiction series following Darrow, a low-caste Red mining worker who infiltrates the ruling Gold class to spark a revolution.",
    books: [
      { id: "red-rising-b1", title: "Red Rising", volumeNumber: 1, releaseDate: "2014-01-28", status: "released", confidence: "confirmed", sourceUrls: ["https://www.piercebrownbooks.com/"] },
      { id: "golden-son", title: "Golden Son", volumeNumber: 2, releaseDate: "2015-01-06", status: "released", confidence: "confirmed", sourceUrls: ["https://www.piercebrownbooks.com/"] },
      { id: "morning-star", title: "Morning Star", volumeNumber: 3, releaseDate: "2016-02-09", status: "released", confidence: "confirmed", sourceUrls: ["https://www.piercebrownbooks.com/"] },
      { id: "iron-gold", title: "Iron Gold", volumeNumber: 4, releaseDate: "2018-01-16", status: "released", confidence: "confirmed", sourceUrls: ["https://www.piercebrownbooks.com/"] },
      { id: "dark-age", title: "Dark Age", volumeNumber: 5, releaseDate: "2019-07-30", status: "released", confidence: "confirmed", sourceUrls: ["https://www.piercebrownbooks.com/"] },
      { id: "light-bringer", title: "Light Bringer", volumeNumber: 6, releaseDate: "2023-07-25", status: "released", confidence: "confirmed", sourceUrls: ["https://www.piercebrownbooks.com/"] }
    ],
    upcomingBook: {
      title: "Red God (Volume 7)",
      releaseDate: "TBA",
      description: "The epic final installment of the Red Rising science fiction saga.",
      status: "announced",
      confidence: "likely",
      sourceUrls: ["https://www.piercebrownbooks.com/"]
    }
  },
  {
    id: "the-expanse",
    title: "The Expanse",
    author: "James S.A. Corey",
    description: "A gritty space opera following a crew of officers as they discover a massive conspiracy that threatens humanity's future in a colonized Solar System.",
    books: [
      { id: "leviathan-wakes", title: "Leviathan Wakes", volumeNumber: 1, releaseDate: "2011-06-15", status: "released", confidence: "confirmed", sourceUrls: ["https://www.orbitbooks.net/"] },
      { id: "calibans-war", title: "Caliban's War", volumeNumber: 2, releaseDate: "2012-06-26", status: "released", confidence: "confirmed", sourceUrls: ["https://www.orbitbooks.net/"] },
      { id: "abaddons-gate", title: "Abaddon's Gate", volumeNumber: 3, releaseDate: "2013-06-04", status: "released", confidence: "confirmed", sourceUrls: ["https://www.orbitbooks.net/"] },
      { id: "cibola-burn", title: "Cibola Burn", volumeNumber: 4, releaseDate: "2014-06-17", status: "released", confidence: "confirmed", sourceUrls: ["https://www.orbitbooks.net/"] },
      { id: "nemesis-games", title: "Nemesis Games", volumeNumber: 5, releaseDate: "2015-06-02", status: "released", confidence: "confirmed", sourceUrls: ["https://www.orbitbooks.net/"] },
      { id: "babylons-ashes", title: "Babylon's Ashes", volumeNumber: 6, releaseDate: "2016-12-06", status: "released", confidence: "confirmed", sourceUrls: ["https://www.orbitbooks.net/"] },
      { id: "persepolis-rising", title: "Persepolis Rising", volumeNumber: 7, releaseDate: "2017-12-05", status: "released", confidence: "confirmed", sourceUrls: ["https://www.orbitbooks.net/"] },
      { id: "tiamats-wrath", title: "Tiamat's Wrath", volumeNumber: 8, releaseDate: "2019-03-26", status: "released", confidence: "confirmed", sourceUrls: ["https://www.orbitbooks.net/"] },
      { id: "leviathan-falls", title: "Leviathan Falls", volumeNumber: 9, releaseDate: "2021-11-30", status: "released", confidence: "confirmed", sourceUrls: ["https://www.orbitbooks.net/"] }
    ],
    upcomingBook: null
  },
  {
    id: "a-court-of-thorns-and-roses",
    title: "A Court of Thorns and Roses",
    author: "Sarah J. Maas",
    description: "A captivating fantasy romance series charting the journey of Feyre Archeron after she is captured and brought to the magical faerie realm of Prythian.",
    books: [
      { id: "acotar", title: "A Court of Thorns and Roses", volumeNumber: 1, releaseDate: "2015-05-05", status: "released", confidence: "confirmed", sourceUrls: ["https://sarahjmaas.com/"] },
      { id: "acomaf", title: "A Court of Mist and Fury", volumeNumber: 2, releaseDate: "2016-05-03", status: "released", confidence: "confirmed", sourceUrls: ["https://sarahjmaas.com/"] },
      { id: "acowar", title: "A Court of Wings and Ruin", volumeNumber: 3, releaseDate: "2017-05-02", status: "released", confidence: "confirmed", sourceUrls: ["https://sarahjmaas.com/"] },
      { id: "acofas", title: "A Court of Frost and Starlight", volumeNumber: 3.5, releaseDate: "2018-05-01", status: "released", confidence: "confirmed", sourceUrls: ["https://sarahjmaas.com/"] },
      { id: "acosf", title: "A Court of Silver Flames", volumeNumber: 4, releaseDate: "2021-02-16", status: "released", confidence: "confirmed", sourceUrls: ["https://sarahjmaas.com/"] }
    ],
    upcomingBook: {
      title: "Untitled ACOTAR Sequel (Book 5)",
      releaseDate: "TBA 2026",
      description: "The next upcoming installment focusing on the ongoing struggles in Prythian.",
      status: "announced",
      confidence: "likely",
      sourceUrls: ["https://sarahjmaas.com/"]
    }
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "search" | "releases">("dashboard");
  const [seriesList, setSeriesList] = useState<TrackedSeries[]>([]);
  const [notifications, setNotifications] = useState<ReleaseNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Guest Storage local-only state (Priority 1)
  const [guestProgress, setGuestProgress] = useState<Record<string, UserSeriesProgress>>(() => {
    const saved = localStorage.getItem("biblios_guest_progress");
    return saved ? JSON.parse(saved) : {};
  });
  const [guestCanonical, setGuestCanonical] = useState<Record<string, CanonicalSeries>>(() => {
    const saved = localStorage.getItem("biblios_guest_canonical");
    return saved ? JSON.parse(saved) : {};
  });
  const [guestNotifications, setGuestNotifications] = useState<ReleaseNotification[]>(() => {
    const saved = localStorage.getItem("biblios_guest_notifications");
    return saved ? JSON.parse(saved) : [];
  });

  // Save guest details to local storage
  useEffect(() => {
    localStorage.setItem("biblios_guest_progress", JSON.stringify(guestProgress));
  }, [guestProgress]);

  useEffect(() => {
    localStorage.setItem("biblios_guest_canonical", JSON.stringify(guestCanonical));
  }, [guestCanonical]);

  useEffect(() => {
    localStorage.setItem("biblios_guest_notifications", JSON.stringify(guestNotifications));
  }, [guestNotifications]);

  // Migration state
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResultSeries | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Refresh and news scanning state
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [isScanningNews, setIsScanningNews] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  
  // Series editing state (notes/ratings)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editRating, setEditRating] = useState(0);

  // Manual corrections state (Priority 8)
  const [showCorrectionsId, setShowCorrectionsId] = useState<string | null>(null);
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookVol, setNewBookVol] = useState(1);
  const [newBookRelease, setNewBookRelease] = useState("");
  const [newBookIsNovella, setNewBookIsNovella] = useState(false);
  const [newBookIsSpinOff, setNewBookIsSpinOff] = useState(false);

  const [upcomingTitle, setUpcomingTitle] = useState("");
  const [upcomingRelease, setUpcomingRelease] = useState("");
  const [upcomingDesc, setUpcomingDesc] = useState("");
  const [upcomingConf, setUpcomingConf] = useState<"confirmed" | "likely" | "rumoured" | "unknown">("confirmed");
  
  // Filter for dashboard
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Expanded series accordion IDs
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    "stormlight-archive": true
  });

  // Observe Authentication Status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Show migration card if guest offline data is found after login
  useEffect(() => {
    if (user && Object.keys(guestProgress).length > 0) {
      setShowMigrationPrompt(true);
    } else {
      setShowMigrationPrompt(false);
    }
  }, [user, guestProgress]);

  // Helper to merge a canonical series document with a user progress document (Priority 2)
  const mergeCanonicalAndProgress = (canonical: CanonicalSeries, progress: UserSeriesProgress): TrackedSeries => {
    let books: Book[] = canonical.books.map(b => {
      const isRead = progress.readBookIds?.includes(b.id) || false;
      const isHidden = progress.hiddenBookIds?.includes(b.id) || false;
      const isNovella = progress.novellaBookIds?.includes(b.id) || b.isNovella || false;
      const isSpinOff = progress.spinoffBookIds?.includes(b.id) || b.isSpinOff || false;
      const customReleaseDate = progress.customReleaseDates?.[b.id] || b.releaseDate;
      return {
        ...b,
        isRead,
        isHidden,
        isNovella,
        isSpinOff,
        releaseDate: customReleaseDate
      };
    });

    // Add manually specified custom books
    if (progress.customBooks && progress.customBooks.length > 0) {
      progress.customBooks.forEach(cb => {
        if (!books.some(b => b.id === cb.id)) {
          books.push({
            ...cb,
            isRead: progress.readBookIds?.includes(cb.id) || false
          });
        }
      });
    }

    // Rearrange based on custom order if present
    if (progress.customBookOrder && progress.customBookOrder.length > 0) {
      const orderMap = new Map(progress.customBookOrder.map((id, idx) => [id, idx]));
      books.sort((a, b) => {
        const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
        const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
        if (idxA !== idxB) return idxA - idxB;
        return a.volumeNumber - b.volumeNumber;
      });
    } else {
      books.sort((a, b) => a.volumeNumber - b.volumeNumber);
    }

    // Use customized upcoming book details if present, otherwise default to canonical
    const upcomingBook = progress.customUpcomingBook !== undefined ? progress.customUpcomingBook : canonical.upcomingBook;

    return {
      ...canonical,
      status: progress.status || "reading",
      rating: progress.rating || 0,
      notes: progress.notes || "",
      books,
      upcomingBook
    };
  };

  // Bind Collections (either Firestore real-time or local Guest Mode)
  useEffect(() => {
    if (isAuthLoading) return;

    if (user) {
      // Setup Firestore real-time observer for user's personal progress
      const progressRef = collection(db, "users", user.uid, "progress");
      const unsubscribeProgress = onSnapshot(progressRef, async (snapshot) => {
        const progressList: UserSeriesProgress[] = [];
        snapshot.forEach((doc) => {
          progressList.push(doc.data() as UserSeriesProgress);
        });

        // Pull corresponding Canonical metadata to construct TrackedSeries
        const list: TrackedSeries[] = [];
        for (const prog of progressList) {
          const canonicalDocRef = doc(db, "canonicalSeries", prog.seriesId);
          const canonicalSnap = await getDoc(canonicalDocRef);
          if (canonicalSnap.exists()) {
            const canon = canonicalSnap.data() as CanonicalSeries;
            list.push(mergeCanonicalAndProgress(canon, prog));
          } else {
            // Fallback to recommended templates if metadata document is not yet in global DB
            const recommended = RECOMMENDED_SERIES.find(r => r.id === prog.seriesId);
            if (recommended) {
              const canon: CanonicalSeries = {
                id: recommended.id,
                title: recommended.title,
                author: recommended.author,
                description: recommended.description,
                books: recommended.books,
                upcomingBook: recommended.upcomingBook,
                lastChecked: new Date().toISOString()
              };
              list.push(mergeCanonicalAndProgress(canon, prog));
            }
          }
        }
        setSeriesList(list);
      }, (err) => {
        console.error("Firestore progress sync error:", err);
      });

      // Observer for user notifications
      const notifsRef = collection(db, "users", user.uid, "notifications");
      const unsubscribeNotifs = onSnapshot(notifsRef, (snapshot) => {
        const list: ReleaseNotification[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as ReleaseNotification);
        });
        // Sort notifications by dateAdded descending
        list.sort((a, b) => new Date(b.dateAdded || b.createdAt).getTime() - new Date(a.dateAdded || a.createdAt).getTime());
        setNotifications(list);
      }, (err) => {
        console.error("Firestore notifications read error:", err);
      });

      return () => {
        unsubscribeProgress();
        unsubscribeNotifs();
      };
    } else {
      // Guest mode - build merged series list from local memory hooks
      const list: TrackedSeries[] = [];
      Object.keys(guestProgress).forEach(id => {
        const prog = guestProgress[id];
        const canon = guestCanonical[id];
        if (canon && prog) {
          list.push(mergeCanonicalAndProgress(canon, prog));
        }
      });
      setSeriesList(list);
      setNotifications(guestNotifications);
    }
  }, [user, isAuthLoading, guestProgress, guestCanonical, guestNotifications]);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setShowUserDropdown(false);
    } catch (err: any) {
      console.error("Google login error:", err);
      if (err.code === "auth/popup-blocked") {
        alert("The Google login popup was blocked by your browser. Please permit popups and redirect cookies to sign in successfully.");
      } else if (err.code === "auth/unauthorized-domain") {
        alert(`Google Login failed: ${window.location.hostname} is not listed as an authorized Firebase Authentication domain.`);
      } else {
        alert(`Google Login failed: ${err.message}`);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setSeriesList([]);
      setNotifications([]);
      setShowUserDropdown(false);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleMigrateGuestData = async () => {
    if (!user) return;
    setIsMigrating(true);
    try {
      // Copy all guest canonical and progress records to cloud DB
      for (const id of Object.keys(guestProgress)) {
        const canon = guestCanonical[id];
        const prog = guestProgress[id];
        if (canon) {
          await setDoc(doc(db, "canonicalSeries", id), canon);
        }
        if (prog) {
          await setDoc(doc(db, "users", user.uid, "progress", id), prog);
        }
      }

      // Copy guest notifications
      for (const notif of guestNotifications) {
        await setDoc(doc(db, "users", user.uid, "notifications", notif.id), notif);
      }

      // Flush local memory
      setGuestProgress({});
      setGuestCanonical({});
      setGuestNotifications([]);
      localStorage.removeItem("biblios_guest_progress");
      localStorage.removeItem("biblios_guest_canonical");
      localStorage.removeItem("biblios_guest_notifications");

      alert("Your local offline library has been successfully migrated to your Personal Cloud Library.");
    } catch (e) {
      console.error("Guest migration failed:", e);
      alert("Error migrating library. Please try again.");
    } finally {
      setIsMigrating(false);
      setShowMigrationPrompt(false);
    }
  };

  const handleDismissMigration = () => {
    setGuestProgress({});
    setGuestCanonical({});
    setGuestNotifications([]);
    localStorage.removeItem("biblios_guest_progress");
    localStorage.removeItem("biblios_guest_canonical");
    localStorage.removeItem("biblios_guest_notifications");
    setShowMigrationPrompt(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResult(null);
    setSearchError(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery })
      });

      if (res.ok) {
        const data = await res.json();
        setSearchResult(data);
      } else {
        const errData = await res.json().catch(() => null);
        setSearchError(errData?.error || `Search failed (${res.status}). Please try again.`);
      }
    } catch (err) {
      setSearchError("An error occurred connecting to the live database.");
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTrackSeries = async (series: SearchResultSeries | typeof RECOMMENDED_SERIES[0]) => {
    const id = series.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    
    // Construct rich structures (Priority 2)
    const newCanonical: CanonicalSeries = {
      id,
      title: series.title,
      author: series.author,
      description: series.description,
      books: series.books.map(b => ({
        id: b.id,
        title: b.title,
        volumeNumber: b.volumeNumber,
        releaseDate: b.releaseDate,
        status: b.status || "released",
        confidence: b.confidence || "confirmed",
        sourceUrls: b.sourceUrls || []
      })),
      upcomingBook: series.upcomingBook ? {
        title: series.upcomingBook.title,
        releaseDate: series.upcomingBook.releaseDate,
        description: series.upcomingBook.description,
        status: series.upcomingBook.status || "upcoming",
        confidence: series.upcomingBook.confidence || "likely",
        sourceUrls: series.upcomingBook.sourceUrls || []
      } : null,
      lastChecked: new Date().toISOString(),
      confidence: series.confidence || "confirmed",
      sourceUrls: series.sourceUrls || []
    };

    const newProgress: UserSeriesProgress = {
      seriesId: id,
      status: "reading",
      rating: 0,
      notes: "",
      readBookIds: [],
      hiddenBookIds: [],
      spinoffBookIds: [],
      novellaBookIds: [],
      customBooks: [],
      customUpcomingBook: null,
      customBookOrder: series.books.map(b => b.id),
      customReleaseDates: {}
    };

    if (user) {
      try {
        await setDoc(doc(db, "canonicalSeries", id), newCanonical);
        await setDoc(doc(db, "users", user.uid, "progress", id), newProgress);

        if (series.upcomingBook) {
          const notifId = `notif-${Date.now()}`;
          const newNotif: ReleaseNotification = {
            id: notifId,
            seriesId: id,
            seriesTitle: series.title,
            bookTitle: series.upcomingBook.title,
            releaseDate: series.upcomingBook.releaseDate,
            alertType: "new_book_found",
            title: `New Upcoming Title Announcement`,
            message: `"${series.upcomingBook.title}" by ${series.author} is announced for release on ${series.upcomingBook.releaseDate}!`,
            createdAt: new Date().toISOString(),
            dateAdded: new Date().toISOString(),
            confidence: series.upcomingBook.confidence as any,
            sourceUrls: series.upcomingBook.sourceUrls
          };
          await setDoc(doc(db, "users", user.uid, "notifications", notifId), newNotif);
        }

        setExpandedIds(prev => ({ ...prev, [id]: true }));
        setActiveTab("dashboard");
        setSearchResult(null);
        setSearchQuery("");
      } catch (e: any) {
        console.error("Firestore track error:", e);
        alert(`Failed to save to cloud catalog: ${e.message}`);
      }
    } else {
      // Guest mode - purely local storage sync (Priority 1)
      setGuestCanonical(prev => ({ ...prev, [id]: newCanonical }));
      setGuestProgress(prev => ({ ...prev, [id]: newProgress }));

      if (series.upcomingBook) {
        const notifId = `notif-${Date.now()}`;
        const newNotif: ReleaseNotification = {
          id: notifId,
          seriesId: id,
          seriesTitle: series.title,
          bookTitle: series.upcomingBook.title,
          releaseDate: series.upcomingBook.releaseDate,
          alertType: "new_book_found",
          title: `New Upcoming Title Announcement`,
          message: `"${series.upcomingBook.title}" by ${series.author} is announced for release on ${series.upcomingBook.releaseDate}!`,
          createdAt: new Date().toISOString(),
          dateAdded: new Date().toISOString(),
          confidence: series.upcomingBook.confidence as any,
          sourceUrls: series.upcomingBook.sourceUrls
        };
        setGuestNotifications(prev => [newNotif, ...prev]);
      }

      setExpandedIds(prev => ({ ...prev, [id]: true }));
      setActiveTab("dashboard");
      setSearchResult(null);
      setSearchQuery("");
    }
  };

  // Helper to extract active user progress doc
  const getProgressDoc = (seriesId: string): UserSeriesProgress => {
    if (user) {
      const merged = seriesList.find(s => s.id === seriesId);
      return {
        seriesId,
        status: merged?.status || "reading",
        rating: merged?.rating || 0,
        notes: merged?.notes || "",
        readBookIds: merged?.books.filter(b => b.isRead).map(b => b.id) || [],
        hiddenBookIds: merged?.books.filter(b => b.isHidden).map(b => b.id) || [],
        spinoffBookIds: merged?.books.filter(b => b.isSpinOff).map(b => b.id) || [],
        novellaBookIds: merged?.books.filter(b => b.isNovella).map(b => b.id) || [],
        customBooks: merged?.books.filter(b => b.id.startsWith("custom-book-")) || [],
        customUpcomingBook: merged?.upcomingBook || null,
        customBookOrder: merged?.books.map(b => b.id) || [],
        customReleaseDates: merged?.books.reduce((acc, b) => {
          acc[b.id] = b.releaseDate || "";
          return acc;
        }, {} as Record<string, string>) || {}
      };
    } else {
      return guestProgress[seriesId] || {
        seriesId,
        status: "reading",
        rating: 0,
        notes: "",
        readBookIds: [],
        hiddenBookIds: [],
        spinoffBookIds: [],
        novellaBookIds: [],
        customBooks: [],
        customUpcomingBook: null,
        customBookOrder: [],
        customReleaseDates: {}
      };
    }
  };

  const saveProgressDoc = async (seriesId: string, progress: UserSeriesProgress) => {
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid, "progress", seriesId), progress, { merge: true });
      } catch (err) {
        console.error("Firestore save progress error:", err);
      }
    } else {
      setGuestProgress(prev => ({
        ...prev,
        [seriesId]: progress
      }));
    }
  };

  const handleToggleBookRead = async (seriesId: string, bookId: string) => {
    const progress = getProgressDoc(seriesId);
    let readBookIds = [...(progress.readBookIds || [])];
    if (readBookIds.includes(bookId)) {
      readBookIds = readBookIds.filter(id => id !== bookId);
    } else {
      readBookIds.push(bookId);
    }

    const series = seriesList.find(s => s.id === seriesId);
    if (!series) return;
    const allRead = series.books.every(b => b.id === bookId ? !b.isRead : b.isRead);
    let suggestedStatus = progress.status;
    if (allRead) {
      suggestedStatus = series.upcomingBook ? "up-to-date" : "completed";
    } else if (progress.status === "completed" || progress.status === "up-to-date") {
      suggestedStatus = "reading";
    }

    await saveProgressDoc(seriesId, {
      ...progress,
      readBookIds,
      status: suggestedStatus
    });
  };

  const handleUpdateStatus = async (seriesId: string, status: TrackedSeries["status"]) => {
    const progress = getProgressDoc(seriesId);
    await saveProgressDoc(seriesId, { ...progress, status });
  };

  const handleSaveNotesAndRating = async (seriesId: string) => {
    const progress = getProgressDoc(seriesId);
    await saveProgressDoc(seriesId, {
      ...progress,
      rating: editRating,
      notes: editNotes
    });
    setEditingId(null);
  };

  const handleDeleteSeries = async (seriesId: string) => {
    if (!confirm("Are you sure you want to stop tracking this book series? Your reading progress will be cleared.")) return;

    if (user) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "progress", seriesId));
      } catch (e) {
        console.error("Firestore delete series progress error:", e);
      }
    } else {
      setGuestProgress(prev => {
        const copy = { ...prev };
        delete copy[seriesId];
        return copy;
      });
      setGuestCanonical(prev => {
        const copy = { ...prev };
        delete copy[seriesId];
        return copy;
      });
      setGuestNotifications(prev => prev.filter(n => n.seriesId !== seriesId));
    }
  };

  // Manual Adjustments Handlers (Priority 8 & 9)
  const handleOpenCorrections = (series: TrackedSeries) => {
    if (showCorrectionsId === series.id) {
      setShowCorrectionsId(null);
    } else {
      setShowCorrectionsId(series.id);
      setNewBookTitle("");
      setNewBookVol(series.books.length + 1);
      setNewBookRelease("");
      setNewBookIsNovella(false);
      setNewBookIsSpinOff(false);

      if (series.upcomingBook) {
        setUpcomingTitle(series.upcomingBook.title);
        setUpcomingRelease(series.upcomingBook.releaseDate);
        setUpcomingDesc(series.upcomingBook.description || "");
        setUpcomingConf(series.upcomingBook.confidence || "confirmed");
      } else {
        setUpcomingTitle("");
        setUpcomingRelease("");
        setUpcomingDesc("");
        setUpcomingConf("confirmed");
      }
    }
  };

  const handleMoveBook = async (seriesId: string, bookId: string, direction: "up" | "down") => {
    const progress = getProgressDoc(seriesId);
    const series = seriesList.find(s => s.id === seriesId);
    if (!series) return;

    let currentOrder = progress.customBookOrder && progress.customBookOrder.length > 0
      ? [...progress.customBookOrder]
      : series.books.map(b => b.id);

    // Swap ordering coordinates
    const index = currentOrder.indexOf(bookId);
    if (index === -1) return;

    if (direction === "up" && index > 0) {
      const temp = currentOrder[index];
      currentOrder[index] = currentOrder[index - 1];
      currentOrder[index - 1] = temp;
    } else if (direction === "down" && index < currentOrder.length - 1) {
      const temp = currentOrder[index];
      currentOrder[index] = currentOrder[index + 1];
      currentOrder[index + 1] = temp;
    }

    await saveProgressDoc(seriesId, {
      ...progress,
      customBookOrder: currentOrder
    });
  };

  const handleAddCustomBook = async (seriesId: string) => {
    if (!newBookTitle.trim()) {
      alert("Please supply a book title.");
      return;
    }

    const progress = getProgressDoc(seriesId);
    const series = seriesList.find(s => s.id === seriesId);
    if (!series) return;

    const newId = `custom-book-${Date.now()}`;
    const newBook: Book = {
      id: newId,
      title: newBookTitle,
      volumeNumber: Number(newBookVol),
      releaseDate: newBookRelease || "TBA",
      isRead: false,
      status: newBookRelease ? "released" : "announced",
      isNovella: newBookIsNovella,
      isSpinOff: newBookIsSpinOff,
      confidence: "confirmed"
    };

    const customBooks = [...(progress.customBooks || []), newBook];
    const customBookOrder = progress.customBookOrder && progress.customBookOrder.length > 0
      ? [...progress.customBookOrder, newId]
      : [...series.books.map(b => b.id), newId];

    await saveProgressDoc(seriesId, {
      ...progress,
      customBooks,
      customBookOrder
    });

    setNewBookTitle("");
    setNewBookRelease("");
    setNewBookIsNovella(false);
    setNewBookIsSpinOff(false);
  };

  const handleToggleBookFlag = async (seriesId: string, bookId: string, flag: "hidden" | "novella" | "spinoff") => {
    const progress = getProgressDoc(seriesId);
    if (flag === "hidden") {
      let hiddenBookIds = [...(progress.hiddenBookIds || [])];
      if (hiddenBookIds.includes(bookId)) {
        hiddenBookIds = hiddenBookIds.filter(id => id !== bookId);
      } else {
        hiddenBookIds.push(bookId);
      }
      await saveProgressDoc(seriesId, { ...progress, hiddenBookIds });
    } else if (flag === "novella") {
      let novellaBookIds = [...(progress.novellaBookIds || [])];
      if (novellaBookIds.includes(bookId)) {
        novellaBookIds = novellaBookIds.filter(id => id !== bookId);
      } else {
        novellaBookIds.push(bookId);
      }
      await saveProgressDoc(seriesId, { ...progress, novellaBookIds });
    } else if (flag === "spinoff") {
      let spinoffBookIds = [...(progress.spinoffBookIds || [])];
      if (spinoffBookIds.includes(bookId)) {
        spinoffBookIds = spinoffBookIds.filter(id => id !== bookId);
      } else {
        spinoffBookIds.push(bookId);
      }
      await saveProgressDoc(seriesId, { ...progress, spinoffBookIds });
    }
  };

  const handleUpdateUpcomingBook = async (seriesId: string) => {
    if (!upcomingTitle.trim()) {
      alert("Please supply an upcoming book title.");
      return;
    }
    const progress = getProgressDoc(seriesId);
    const customUpcoming: UpcomingBook = {
      title: upcomingTitle,
      releaseDate: upcomingRelease || "TBA",
      description: upcomingDesc,
      status: upcomingRelease ? "upcoming" : "announced",
      confidence: upcomingConf
    };

    await saveProgressDoc(seriesId, {
      ...progress,
      customUpcomingBook: customUpcoming
    });
    alert("Upcoming sequel metadata saved manually!");
  };

  const handleOverrideReleaseDate = async (seriesId: string, bookId: string, newDate: string) => {
    const progress = getProgressDoc(seriesId);
    const customReleaseDates = { ...(progress.customReleaseDates || {}) };
    customReleaseDates[bookId] = newDate;

    await saveProgressDoc(seriesId, {
      ...progress,
      customReleaseDates
    });
  };

  const handleReportBadMetadata = async (seriesId: string) => {
    alert("Metadata reported. This series will prioritize deep web-grounding sifts on your next refresh command.");
    const series = seriesList.find(s => s.id === seriesId);
    if (series) {
      await handleRefreshSeries(seriesId);
    }
  };

  const handleRefreshSeries = async (seriesId: string) => {
    setRefreshingId(seriesId);
    try {
      const series = seriesList.find(s => s.id === seriesId);
      if (!series) return;

      const res = await fetch(`/api/series/${seriesId}/refresh`, {
        method: "POST"
      });

      if (res.ok) {
        const updatedCanonical = await res.json();
        if (user) {
          // Write back globally verified canonical metadata
          await setDoc(doc(db, "canonicalSeries", seriesId), updatedCanonical);
        } else {
          setGuestCanonical(prev => ({ ...prev, [seriesId]: updatedCanonical }));
        }
        alert("Series timeline verified and refreshed with live publisher catalogs!");
      } else {
        alert("Failed to fetch live updates. Using cached book coordinates.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleScanForNews = async () => {
    setIsScanningNews(true);
    setScanMessage("Searching the web for announcements & updates...");
    
    try {
      const res = await fetch("/api/check-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesList: seriesList,
          notifications: notifications
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.newsAdded > 0) {
          setScanMessage(`Found ${data.newsAdded} new title announcement(s)!`);
          
          if (user) {
            if (data.updatedSeriesList) {
              for (const s of data.updatedSeriesList) {
                // Save updated canonical details to global store
                await setDoc(doc(db, "canonicalSeries", s.id), s);
              }
            }
            if (data.newNotifications) {
              for (const n of data.newNotifications) {
                await setDoc(doc(db, "users", user.uid, "notifications", n.id), n);
              }
            }
          } else {
            // Guest mode updates
            if (data.updatedSeriesList) {
              data.updatedSeriesList.forEach((s: any) => {
                setGuestCanonical(prev => ({ ...prev, [s.id]: s }));
              });
            }
            if (data.newNotifications) {
              setGuestNotifications(prev => [...data.newNotifications, ...prev]);
            }
          }
        } else {
          setScanMessage("All series are currently up-to-date. No new announcements found.");
        }
      }
    } catch (e) {
      console.error(e);
      setScanMessage("Error scanning web publication catalogs.");
    } finally {
      setTimeout(() => {
        setIsScanningNews(false);
        setScanMessage("");
      }, 4000);
    }
  };

  const handleDismissNotification = async (id: string) => {
    if (user) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "notifications", id));
      } catch (e) {
        console.error("Firestore dismiss notification error:", e);
      }
    } else {
      setGuestNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const toggleAccordion = (id: string) => {
    setExpandedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Helper to calculate days until release
  const getDaysUntilRelease = (dateStr?: string) => {
    if (!dateStr) return null;
    const releaseDate = new Date(dateStr);
    if (isNaN(releaseDate.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = releaseDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Filter series based on status
  const filteredSeries = seriesList.filter(s => {
    if (statusFilter === "all") return true;
    return s.status === statusFilter;
  });

  // Calculate global stats
  const totalBooks = seriesList.reduce((acc, s) => acc + s.books.length, 0);
  const readBooks = seriesList.reduce((acc, s) => acc + s.books.filter(b => b.isRead).length, 0);
  const activeSeriesCount = seriesList.filter(s => s.status === "reading").length;
  const upcomingSeriesCount = seriesList.filter(s => s.upcomingBook).length;

  return (
    <div className="min-h-screen bg-[#FFFDF3] text-[#1A1A1A] selection:bg-[#FFE8CC] pb-24 font-sans">
      
      {/* Top Playful Header */}
      <header className="border-b-2 border-[#1A1A1A]/10 px-6 py-6 md:px-10 flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 select-none">
          <div className="bg-[#FF6B4A] text-white w-12 h-12 rounded-2xl flex items-center justify-center font-display text-2xl font-bold shadow-[3px_3px_0px_0px_#1A1A1A] border-2 border-[#1A1A1A] rotate-[-4deg]">
            🤓
          </div>
          <div className="flex flex-col">
            <h1 
              onClick={() => setActiveTab("dashboard")}
              className="text-4xl font-display font-extrabold tracking-tight cursor-pointer hover:scale-105 transition-transform text-[#1A1A1A]"
            >
              Book <span className="text-[#FF6B4A]">Nerd</span>
            </h1>
            <span className="text-[10px] font-playful font-bold tracking-wider text-[#F2A359] uppercase block">your cute series tracker</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-4 md:mt-0">
          <nav className="flex space-x-3 text-xs font-playful font-bold">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`cursor-pointer transition-all px-4 py-2 rounded-full border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A] ${
                activeTab === "dashboard" 
                  ? "bg-[#FF6B4A] text-white" 
                  : "bg-white text-[#1A1A1A] hover:bg-[#FFE8CC]"
              }`}
            >
              📚 My Shelf
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={`cursor-pointer transition-all px-4 py-2 rounded-full border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A] ${
                activeTab === "search" 
                  ? "bg-[#F2A359] text-white" 
                  : "bg-white text-[#1A1A1A] hover:bg-[#FFE8CC]"
              }`}
            >
              🔍 Discover
            </button>
            <button
              onClick={() => setActiveTab("releases")}
              className={`cursor-pointer transition-all px-4 py-2 rounded-full border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A] ${
                activeTab === "releases" 
                  ? "bg-[#4FB06D] text-white" 
                  : "bg-white text-[#1A1A1A] hover:bg-[#FFE8CC]"
              }`}
            >
              📅 Calendar ({upcomingSeriesCount})
            </button>
          </nav>

          <div className="flex items-center gap-4">
            {/* Live Announcements Trigger */}
            <button
              onClick={handleScanForNews}
              disabled={isScanningNews || seriesList.length === 0}
              title="Query publisher lists and live news for updates"
              className="px-4 py-2 border-2 border-[#1A1A1A] bg-[#4F46E5] text-white text-[11px] font-playful font-bold tracking-wider rounded-xl shadow-[2px_2px_0px_0px_#1A1A1A] hover:translate-y-[-1px] active:translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanningNews ? "animate-spin" : ""}`} />
              Scan Live News
            </button>

            {/* Notifications Alert Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 border-2 border-[#1A1A1A] bg-white text-[#1A1A1A] hover:bg-[#FFE8CC] rounded-full shadow-[2px_2px_0px_0px_#1A1A1A] transition-all relative cursor-pointer block"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#FF6B4A] text-white text-[10px] font-playful font-bold flex items-center justify-center rounded-full border-2 border-[#1A1A1A]">
                    {notifications.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#FFFDF3] border-2 border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A] rounded-2xl overflow-hidden z-50"
                  >
                    <div className="p-4 bg-[#FFE8CC] border-b-2 border-[#1A1A1A] flex justify-between items-center">
                      <span className="font-playful font-extrabold text-xs uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1">📣 Bookworm Despatches</span>
                      <button 
                        onClick={() => setShowNotifications(false)}
                        className="text-[#1A1A1A]/60 hover:text-[#1A1A1A] cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="max-h-96 overflow-y-auto divide-y-2 divide-[#1A1A1A]/10">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-xs text-[#1A1A1A]/50 italic font-playful">
                          No active updates. Subscribed titles appear here.
                        </div>
                      ) : (
                        notifications.map(notif => {
                          const daysLeft = getDaysUntilRelease(notif.releaseDate);
                          return (
                            <div key={notif.id} className="p-4 hover:bg-[#FFE8CC]/40 transition-colors relative group">
                              <button 
                                onClick={() => handleDismissNotification(notif.id)}
                                className="absolute top-4 right-4 text-[#1A1A1A]/40 hover:text-[#FF6B4A] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                title="Dismiss update"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                              
                              <div className="flex items-start gap-2.5">
                                <span className="p-1.5 rounded-lg bg-white border border-[#1A1A1A]/10 text-[#FF6B4A] mt-0.5 shadow-[1px_1px_0px_0px_#1A1A1A]">
                                  {notif.type === "new_announcement" ? (
                                    <Newspaper className="w-3.5 h-3.5" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5" />
                                  )}
                                </span>
                                <div className="flex-1 pr-4">
                                  <span className="text-[10px] font-playful font-bold uppercase tracking-wider text-[#F2A359] block mb-0.5">
                                    {notif.seriesTitle}
                                  </span>
                                  <p className="text-xs font-sans font-medium leading-relaxed text-[#1A1A1A]">
                                    {notif.message}
                                  </p>
                                  <div className="flex items-center gap-3 mt-2">
                                    <span className="text-[10px] font-mono bg-white text-[#1A1A1A] px-2 py-0.5 border-2 border-[#1A1A1A] rounded-md shadow-[1px_1px_0px_0px_#1A1A1A] font-bold">
                                      Launch: {notif.releaseDate}
                                    </span>
                                    {daysLeft !== null && daysLeft > 0 && (
                                      <span className="text-[10px] font-playful font-bold text-[#FF6B4A] animate-pulse">
                                        T-minus {daysLeft} Days ⏰
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Google Authentication Button / Avatar */}
            {isAuthLoading ? (
              <span className="w-4 h-4 border-2 border-[#1A1A1A]/20 border-t-[#1A1A1A] rounded-full animate-spin"></span>
            ) : user ? (
              <div className="relative">
                <button 
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-[#1A1A1A] hover:bg-[#EBE9E4] transition-all text-xs font-mono uppercase cursor-pointer"
                >
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || "User"} 
                      className="w-4 h-4 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-[9px] font-bold">
                      {user.displayName ? user.displayName[0].toUpperCase() : "U"}
                    </span>
                  )}
                  <span className="max-w-[90px] truncate hidden sm:inline">{user.displayName || "Library Owner"}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {showUserDropdown && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-[#FAF9F6] border border-[#1A1A1A] shadow-lg z-50 p-2 flex flex-col space-y-1.5"
                    >
                      <div className="px-2 py-1.5 border-b border-[#1A1A1A]/10">
                        <p className="text-[9px] font-mono opacity-50 uppercase">Personal Cloud Library</p>
                        <p className="text-[11px] font-serif font-semibold truncate text-[#1A1A1A]">{user.email}</p>
                      </div>
                      <button 
                        onClick={handleSignOut}
                        className="w-full text-left px-2 py-1.5 text-[10px] font-mono uppercase hover:bg-[#C45B31] hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="px-3.5 py-1.5 border border-[#1A1A1A] bg-[#1A1A1A] text-[#FAF9F6] text-[10px] font-mono tracking-widest uppercase hover:bg-transparent hover:text-[#1A1A1A] transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Global News Alerts */}
        <AnimatePresence>
          {scanMessage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 bg-[#EBE9E4] border border-[#1A1A1A] p-3 flex items-center gap-2 text-xs text-[#1A1A1A] w-full"
            >
              <AlertCircle className="w-4 h-4 text-[#C45B31] animate-pulse" />
              <span className="font-serif italic">{scanMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Grid Wrapper */}
      <main className="max-w-7xl mx-auto px-6 md:px-10 mt-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Playful Sidebar: Active Progress */}
          <aside className="lg:col-span-4 border-2 border-[#1A1A1A] p-6 bg-white rounded-3xl shadow-[4px_4px_0px_0px_#1A1A1A] flex flex-col space-y-8">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#F2A359] font-playful font-bold mb-3 block">📖 NERDY PROGRESS</span>
              <h2 className="text-3xl font-display font-extrabold leading-tight text-[#1A1A1A] mb-6">Currently<br/>Reading 🐛</h2>
              
              <div className="space-y-6">
                {seriesList.length === 0 ? (
                  <p className="text-xs font-playful text-[#1A1A1A]/60 italic">No series tracked yet. Use Discover or Search to start your shelf!</p>
                ) : (
                  seriesList.filter(s => s.status === "reading").slice(0, 4).map(series => {
                    const nextBook = series.books.find(b => !b.isRead);
                    const readCount = series.books.filter(b => b.isRead).length;
                    const percent = Math.round((readCount / series.books.length) * 100) || 0;
                    return (
                      <div 
                        key={series.id} 
                        className="group cursor-pointer p-4 rounded-2xl border-2 border-[#1A1A1A]/10 hover:border-[#1A1A1A] hover:bg-[#FFFDF3] transition-all hover:shadow-[2px_2px_0px_0px_#1A1A1A]" 
                        onClick={() => { 
                          setActiveTab("dashboard"); 
                          setExpandedIds(p => ({ ...p, [series.id]: true })); 
                        }}
                      >
                        <div className="flex justify-between items-end mb-2">
                          <h3 className="text-sm font-playful font-bold text-[#1A1A1A] group-hover:text-[#FF6B4A]">{series.title}</h3>
                          <span className="text-[10px] font-mono font-bold text-[#F2A359]">{readCount} / {series.books.length}</span>
                        </div>
                        <div className="w-full h-3 bg-[#EBE9E4] rounded-full overflow-hidden border border-[#1A1A1A]/10 relative">
                          <div 
                            className="absolute top-0 left-0 h-full bg-[#4FB06D] rounded-full transition-all duration-300" 
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                        {nextBook && (
                          <p className="text-[10px] mt-2 text-[#1A1A1A]/60 font-playful">Next book: <span className="font-bold text-[#1A1A1A]">{nextBook.title}</span></p>
                        )}
                      </div>
                    );
                  })
                )}

                {seriesList.filter(s => s.status === "reading").length === 0 && seriesList.length > 0 && (
                  <p className="text-xs font-playful italic text-[#1A1A1A]/60">All tracked series are up-to-date or completed! Time for a new series 📚</p>
                )}
              </div>
            </div>

            {/* General Goal Statistics Card */}
            <div className="border-t-2 border-[#1A1A1A]/10 pt-6">
              <div className="flex items-center space-x-4 bg-[#FFE8CC] p-4 border-2 border-[#1A1A1A] rounded-2xl shadow-[2px_2px_0px_0px_#1A1A1A]">
                <div className="w-10 h-10 bg-[#FF6B4A] rounded-xl border border-[#1A1A1A] flex items-center justify-center text-white text-lg font-bold">🤓</div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[#1A1A1A]/50 font-playful font-bold">Book Nerd Score</p>
                  <p className="text-xs font-extrabold font-playful text-[#1A1A1A]">{readBooks} of {totalBooks} books eaten! 🐛</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Tab Content Panel */}
          <section className="lg:col-span-8 flex flex-col space-y-6">
            
            {/* Migration Banner (Priority 1) */}
            {showMigrationPrompt && (
              <div className="bg-[#FAF9F6] border border-[#1A1A1A] p-5 shadow-sm space-y-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-[#C45B31] mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-serif font-bold text-sm text-[#1A1A1A]">Migrate Offline Reading Progress?</h4>
                    <p className="text-xs text-[#1A1A1A]/75 font-serif mt-1 leading-relaxed">
                      We discovered book series and reading progress logged in your local browser cache. Migrate them now to securely sync your curated library across all devices.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button
                    onClick={handleDismissMigration}
                    className="text-[10px] font-mono tracking-wider uppercase border border-[#1A1A1A]/30 px-3 py-1.5 hover:bg-[#1A1A1A]/5 cursor-pointer"
                  >
                    Clear Local Cache
                  </button>
                  <button
                    onClick={handleMigrateGuestData}
                    disabled={isMigrating}
                    className="text-[10px] font-mono tracking-wider uppercase bg-[#1A1A1A] text-white px-4 py-1.5 hover:bg-black cursor-pointer disabled:opacity-50"
                  >
                    {isMigrating ? "Syncing..." : "Sync to Cloud"}
                  </button>
                </div>
              </div>
            )}

            {/* Offline Guest Mode Banner (Priority 1) */}
            {!user && (
              <div className="bg-[#FAF9F6] border border-dashed border-[#1A1A1A]/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#C45B31]" />
                  <span className="font-serif italic text-[#1A1A1A]/80">
                    Browsing in <b>Offline Guest Mode</b>. Your tracking timelines are saved locally in this browser.
                  </span>
                </div>
                <button
                  onClick={handleSignIn}
                  className="px-3 py-1 bg-[#1A1A1A] text-white text-[9px] font-mono tracking-widest uppercase hover:bg-black transition-colors self-start sm:self-auto cursor-pointer"
                >
                  Connect Google Account
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              {activeTab === "dashboard" && (
                <motion.div
                  key="dashboard-view"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {/* Filter Sub-nav */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#1A1A1A]/10 pb-4">
                    <div className="flex flex-wrap gap-2">
                      {["all", "reading", "up-to-date", "completed", "paused"].map((filter) => {
                        const colors: Record<string, string> = {
                          all: "hover:bg-[#FFFDF3] bg-white text-[#1A1A1A] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A]",
                          reading: "hover:bg-[#FFFDF3] bg-[#FFE8CC] text-[#1A1A1A] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A]",
                          "up-to-date": "hover:bg-[#FFFDF3] bg-[#DFF0EA] text-[#1A1A1A] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A]",
                          completed: "hover:bg-[#FFFDF3] bg-[#E3E0F3] text-[#1A1A1A] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A]",
                          paused: "hover:bg-[#FFFDF3] bg-[#FADCE6] text-[#1A1A1A] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A]"
                        };
                        const activeColors: Record<string, string> = {
                          all: "bg-[#1A1A1A] text-white border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A]",
                          reading: "bg-[#FF6B4A] text-white border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A]",
                          "up-to-date": "bg-[#4FB06D] text-white border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A]",
                          completed: "bg-[#4F46E5] text-white border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A]",
                          paused: "bg-[#EC4899] text-white border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A]"
                        };
                        return (
                          <button
                            key={filter}
                            onClick={() => setStatusFilter(filter as any)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-playful font-bold uppercase transition-all cursor-pointer ${
                              statusFilter === filter ? activeColors[filter] : colors[filter]
                            }`}
                          >
                            {filter}
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-[11px] font-playful font-bold text-[#F2A359]">
                      Shelf Count: {filteredSeries.length} 📚
                    </span>
                  </div>

                  {/* Series List / Curated Recommendations (Priority 3) */}
                  {seriesList.length === 0 ? (
                    <div className="space-y-8">
                      <div className="border-2 border-dashed border-[#1A1A1A] p-12 text-center bg-white rounded-3xl">
                        <BookOpen className="w-12 h-12 mx-auto text-[#FF6B4A] mb-4 animate-bounce" />
                        <p className="font-display font-extrabold text-xl text-[#1A1A1A]">Your cute shelf is empty!</p>
                        <p className="text-xs text-[#1A1A1A]/70 font-playful mt-2 max-w-sm mx-auto leading-relaxed">
                          Search for any book series (like <b>Dune</b> or <b>A Court of Thorns and Roses</b>) to track chapters and live releases!
                        </p>
                        <button 
                          onClick={() => setActiveTab("search")}
                          className="mt-6 px-5 py-2.5 bg-[#FF6B4A] text-white text-xs font-playful font-bold uppercase rounded-full border-2 border-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A] hover:translate-y-[-1px] transition-all cursor-pointer"
                        >
                          Find a Series 🔍
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b-2 border-[#1A1A1A]/10 pb-2">
                          <Sparkles className="w-4 h-4 text-[#FF6B4A]" />
                          <h4 className="text-xs font-playful uppercase tracking-widest text-[#1A1A1A] font-extrabold">Fun Starter Series</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {RECOMMENDED_SERIES.map(rec => (
                            <div key={rec.id} className="border-2 border-[#1A1A1A] p-6 bg-white rounded-3xl flex flex-col justify-between space-y-4 shadow-[4px_4px_0px_0px_#1A1A1A] hover:shadow-[6px_6px_0px_0px_#1A1A1A] transition-all">
                              <div>
                                <h5 className="font-display font-bold text-lg leading-tight text-[#1A1A1A]">{rec.title}</h5>
                                <span className="text-xs font-playful font-semibold text-[#F2A359] block mt-0.5">by {rec.author} ✍️</span>
                                <p className="text-xs font-sans text-[#1A1A1A]/70 mt-3 line-clamp-3 leading-relaxed">{rec.description}</p>
                              </div>
                              <button
                                onClick={() => handleTrackSeries(rec)}
                                className="w-full py-2 bg-white text-[#1A1A1A] text-xs font-playful font-bold uppercase border-2 border-[#1A1A1A] rounded-xl shadow-[2px_2px_0px_0px_#1A1A1A] hover:bg-[#FFE8CC] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" /> Track This Series
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : filteredSeries.length === 0 ? (
                    <div className="border-2 border-dashed border-[#1A1A1A] p-12 text-center bg-white rounded-3xl">
                      <BookOpen className="w-12 h-12 mx-auto opacity-35 mb-4 text-[#FF6B4A]" />
                      <p className="font-display font-extrabold text-xl">No book series matches this filter.</p>
                      <button 
                        onClick={() => setStatusFilter("all")}
                        className="mt-6 px-5 py-2 bg-[#FF6B4A] text-white text-xs font-playful font-bold uppercase rounded-full border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A] transition-all cursor-pointer"
                      >
                        Reset Filter 🔄
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {filteredSeries.map((series) => {
                        const readCount = series.books.filter(b => b.isRead).length;
                        const bookPercent = Math.round((readCount / series.books.length) * 100) || 0;
                        const isExpanded = !!expandedIds[series.id];
                        const isRefreshing = refreshingId === series.id;

                        return (
                          <div 
                            key={series.id}
                            className="border-2 border-[#1A1A1A] bg-white rounded-3xl transition-all shadow-[4px_4px_0px_0px_#1A1A1A] hover:shadow-[6px_6px_0px_0px_#1A1A1A] overflow-hidden"
                          >
                            {/* Card Header Accordion Trigger */}
                            <div 
                              onClick={() => toggleAccordion(series.id)}
                              className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 cursor-pointer hover:bg-[#FFFDF3]/60 transition-colors select-none"
                            >
                              <div className="flex-1 space-y-2">
                                <div className="flex flex-wrap items-baseline gap-2.5">
                                  <h3 className="font-display text-2xl font-black text-[#1A1A1A] tracking-tight">{series.title}</h3>
                                  <span className="text-xs font-playful font-semibold text-[#F2A359]">by {series.author} ✍️</span>
                                </div>
                                <p className="text-xs font-sans text-[#1A1A1A]/70 line-clamp-1 pr-6">{series.description}</p>
                                
                                <div className="flex flex-wrap items-center gap-3 pt-2">
                                  {/* Playful Status Badge */}
                                  <span className={`text-[10px] font-playful font-bold uppercase px-3 py-1 border-2 border-[#1A1A1A] rounded-full shadow-[1px_1px_0px_0px_#1A1A1A] ${
                                    series.status === "reading" ? "bg-[#FFE8CC]" : 
                                    series.status === "completed" ? "bg-[#E3E0F3]" :
                                    series.status === "paused" ? "bg-[#FADCE6]" : "bg-[#DFF0EA]"
                                  }`}>
                                    {series.status === "reading" ? "📖 reading" : 
                                     series.status === "completed" ? "🎉 completed" :
                                     series.status === "paused" ? "⏸️ paused" : "✅ up-to-date"}
                                  </span>
                                  {/* Progress label */}
                                  <span className="text-xs font-playful font-extrabold text-[#1A1A1A]/75">
                                    {readCount} of {series.books.length} read ({bookPercent}%)
                                  </span>
                                  {/* Ratings stars */}
                                  {series.rating ? (
                                    <div className="flex items-center gap-0.5 text-[#F2A359]">
                                      {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-3.5 h-3.5 ${i < (series.rating || 0) ? "fill-[#F2A359] text-[#1A1A1A] stroke-[2]" : "opacity-20 text-[#1A1A1A]"}`} />
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 self-end sm:self-auto">
                                {series.upcomingBook && (
                                  <span className="text-[10px] font-playful font-extrabold uppercase px-3 py-1 bg-[#FF6B4A] text-white border-2 border-[#1A1A1A] rounded-full shadow-[2px_2px_0px_0px_#1A1A1A] animate-pulse">
                                    Sequel! 🚀
                                  </span>
                                )}
                                <div className="p-1.5 border-2 border-[#1A1A1A] bg-[#FFFDF3] rounded-xl shadow-[1.5px_1.5px_0px_0px_#1A1A1A]">
                                  {isExpanded ? <ChevronUp className="w-4 h-4 stroke-[2.5]" /> : <ChevronDown className="w-4 h-4 stroke-[2.5]" />}
                                </div>
                              </div>
                            </div>

                            {/* Card Content details */}
                            {isExpanded && (
                              <div className="border-t-2 border-[#1A1A1A] p-6 md:p-8 bg-[#FFFDF3]/30">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                  
                                  {/* Checklist - Left column */}
                                  <div className="lg:col-span-7 space-y-4">
                                    <div className="flex justify-between items-center border-b-2 border-[#1A1A1A]/10 pb-2">
                                      <span className="text-[10px] font-playful font-bold uppercase tracking-wider text-[#1A1A1A]/50">Reading Ledger 📔</span>
                                      <span className="text-[10px] font-playful font-bold text-[#FF6B4A]">Tap volume to check off!</span>
                                    </div>

                                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                                      {series.books.map(book => {
                                        // Hide unless Corrections Mode is active to keep checklist clean
                                        if (book.isHidden && showCorrectionsId !== series.id) return null;

                                        return (
                                          <div
                                            key={book.id}
                                            className="border-2 border-[#1A1A1A] bg-white rounded-2xl overflow-hidden shadow-[2px_2px_0px_0px_#1A1A1A] transition-all hover:translate-y-[-1px]"
                                          >
                                            <div 
                                              className={`p-4 transition-all flex items-center justify-between ${
                                                book.isRead 
                                                  ? "bg-[#4FB06D]/10 opacity-80" 
                                                  : "bg-white hover:bg-[#FFFDF3]/30"
                                              }`}
                                            >
                                              <div 
                                                onClick={() => handleToggleBookRead(series.id, book.id)}
                                                className="flex items-start gap-3 flex-1 cursor-pointer select-none"
                                              >
                                                <div className={`w-5 h-5 border-2 border-[#1A1A1A] rounded-md flex items-center justify-center transition-all mt-0.5 ${
                                                  book.isRead ? "bg-[#4FB06D] text-white" : "bg-white"
                                                }`}>
                                                  {book.isRead && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                </div>
                                                <div>
                                                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                    <span className="text-[10px] font-playful font-bold text-[#F2A359] block leading-none">Vol. {book.volumeNumber}</span>
                                                    {book.isNovella && (
                                                      <span className="text-[8px] font-playful font-bold bg-[#E3E0F3] text-[#1A1A1A] px-2 py-0.5 rounded uppercase tracking-wider border border-[#1A1A1A]/10">Novella</span>
                                                    )}
                                                    {book.isSpinOff && (
                                                      <span className="text-[8px] font-playful font-bold bg-[#DFF0EA] text-[#1A1A1A] px-2 py-0.5 rounded uppercase tracking-wider border border-[#1A1A1A]/10">Spin-Off</span>
                                                    )}
                                                    {book.isHidden && (
                                                      <span className="text-[8px] font-playful font-bold bg-[#FF6B4A] text-white px-2 py-0.5 rounded uppercase tracking-wider">Hidden</span>
                                                    )}
                                                  </div>
                                                  <span className={`text-xs font-sans font-bold block ${book.isRead ? "line-through opacity-50 text-[#1A1A1A]/60" : "text-[#1A1A1A]"}`}>
                                                    {book.title}
                                                  </span>
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-2">
                                                {showCorrectionsId === series.id ? (
                                                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                      type="text"
                                                      value={book.releaseDate || ""}
                                                      placeholder="YYYY-MM-DD"
                                                      onChange={(e) => handleOverrideReleaseDate(series.id, book.id, e.target.value)}
                                                      className="text-[10px] font-mono font-bold border-2 border-[#1A1A1A] px-2 py-1 rounded-lg w-28 bg-[#FFFDF3] text-center focus:outline-none"
                                                      title="Override launch date"
                                                    />
                                                    <button
                                                      onClick={() => handleMoveBook(series.id, book.id, "up")}
                                                      className="p-1 border-2 border-[#1A1A1A] bg-white hover:bg-[#FFE8CC] rounded-lg cursor-pointer"
                                                      title="Move Up"
                                                    >
                                                      <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                                                    </button>
                                                    <button
                                                      onClick={() => handleMoveBook(series.id, book.id, "down")}
                                                      className="p-1 border-2 border-[#1A1A1A] bg-white hover:bg-[#FFE8CC] rounded-lg cursor-pointer"
                                                      title="Move Down"
                                                    >
                                                      <ArrowDown className="w-3 h-3 stroke-[2.5]" />
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <span className="text-[10px] font-mono font-bold text-[#1A1A1A]/60 bg-[#EBE9E4] px-2.5 py-0.5 rounded-md border border-[#1A1A1A]/10">
                                                    {book.releaseDate || "TBA"}
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            {/* Flag Toggles Panel when Corrections is active */}
                                            {showCorrectionsId === series.id && (
                                              <div className="p-2.5 bg-[#FFFDF3] border-t-2 border-[#1A1A1A] flex items-center justify-between text-[10px] font-playful font-bold gap-4" onClick={(e) => e.stopPropagation()}>
                                                <span className="opacity-50 uppercase text-[9px]">Custom Book Tags:</span>
                                                <div className="flex gap-1.5">
                                                  <button
                                                    onClick={() => handleToggleBookFlag(series.id, book.id, "hidden")}
                                                    className={`px-2 py-1 border-2 border-[#1A1A1A] text-[9px] font-bold cursor-pointer rounded-lg flex items-center gap-1 ${
                                                      book.isHidden ? "bg-[#FF6B4A] text-white" : "bg-white text-[#1A1A1A] hover:bg-[#FFE8CC]"
                                                    }`}
                                                  >
                                                    {book.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                    {book.isHidden ? "Hidden" : "Hide Book"}
                                                  </button>
                                                  <button
                                                    onClick={() => handleToggleBookFlag(series.id, book.id, "novella")}
                                                    className={`px-2 py-1 border-2 border-[#1A1A1A] text-[9px] font-bold cursor-pointer rounded-lg ${
                                                      book.isNovella ? "bg-[#4F46E5] text-white" : "bg-white text-[#1A1A1A] hover:bg-[#FFE8CC]"
                                                    }`}
                                                  >
                                                    Novella
                                                  </button>
                                                  <button
                                                    onClick={() => handleToggleBookFlag(series.id, book.id, "spinoff")}
                                                    className={`px-2 py-1 border-2 border-[#1A1A1A] text-[9px] font-bold cursor-pointer rounded-lg ${
                                                      book.isSpinOff ? "bg-[#4FB06D] text-white" : "bg-white text-[#1A1A1A] hover:bg-[#FFE8CC]"
                                                    }`}
                                                  >
                                                    Spin-off
                                                  </button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Meta column - Right column */}
                                  <div className="lg:col-span-5 flex flex-col justify-between space-y-6 lg:border-l-2 lg:border-[#1A1A1A]/10 lg:pl-6">
                                    
                                    {/* Upcoming sequel card */}
                                    {series.upcomingBook ? (
                                      <div className="bg-[#FFE8CC] border-2 border-[#1A1A1A] p-5 rounded-2xl shadow-[2px_2px_0px_0px_#1A1A1A]">
                                        <div className="flex items-center gap-1.5 text-[#FF6B4A] mb-1.5">
                                          <Sparkles className="w-4 h-4 animate-bounce" />
                                          <span className="font-playful text-[10px] tracking-wide uppercase font-bold">Upcoming Release 🚀</span>
                                        </div>
                                        <h4 className="font-display font-extrabold text-base text-[#1A1A1A] leading-tight">
                                          {series.upcomingBook.title}
                                        </h4>
                                        <p className="text-[11px] font-sans text-[#1A1A1A]/80 mt-1.5 leading-relaxed">
                                          {series.upcomingBook.description || "Publishers are setting the launch coordinates."}
                                        </p>
                                        <div className="border-t border-[#1A1A1A]/10 mt-3 pt-2.5 flex justify-between items-center text-[10px]">
                                          <span className="font-playful font-bold opacity-60 uppercase">Confidence Level:</span>
                                          <span className={`font-playful uppercase font-bold px-2 py-0.5 border border-[#1A1A1A] rounded-md ${
                                            series.upcomingBook.confidence === "confirmed" ? "bg-[#4FB06D] text-white" : "bg-white text-[#1A1A1A]"
                                          }`}>
                                            {series.upcomingBook.confidence || "confirmed"}
                                          </span>
                                        </div>
                                        <div className="border-t border-[#1A1A1A]/10 mt-2 pt-2.5 flex justify-between items-center">
                                          <span className="text-[10px] font-playful font-bold opacity-60 uppercase">Launch Date:</span>
                                          <span className="text-xs font-mono font-bold bg-white border-2 border-[#1A1A1A] px-2 py-0.5 rounded-lg shadow-[1px_1px_0px_0px_#1A1A1A]">
                                            {series.upcomingBook.releaseDate}
                                          </span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="border-2 border-dashed border-[#1A1A1A]/30 p-5 bg-[#FFFDF3] rounded-2xl text-center">
                                        <span className="text-[10px] font-playful uppercase tracking-wider text-[#1A1A1A]/40 block mb-1">Upcoming release</span>
                                        <p className="text-xs font-playful italic text-[#1A1A1A]/50">No new mainline sequel announced yet.</p>
                                      </div>
                                    )}

                                    {/* Notes / Stars */}
                                    <div className="border-2 border-[#1A1A1A] p-5 bg-white rounded-2xl shadow-[2px_2px_0px_0px_#1A1A1A]">
                                      {editingId === series.id ? (
                                        <div className="space-y-3">
                                          <div>
                                            <label className="text-[10px] font-playful font-bold uppercase tracking-wider text-[#1A1A1A]/50 block mb-1">My Star Rating</label>
                                            <div className="flex items-center gap-1.5">
                                              {[1, 2, 3, 4, 5].map(val => (
                                                <button 
                                                  key={val} 
                                                  onClick={() => setEditRating(val)}
                                                  className="cursor-pointer text-[#F2A359] scale-110 hover:scale-125 transition-transform"
                                                >
                                                  <Star className={`w-5 h-5 ${val <= editRating ? "fill-[#F2A359] text-[#1A1A1A] stroke-[2.5]" : "opacity-20 text-[#1A1A1A]"}`} />
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                          <div>
                                            <label className="text-[10px] font-playful font-bold uppercase tracking-wider text-[#1A1A1A]/50 block mb-1">Personal Notes</label>
                                            <textarea
                                              value={editNotes}
                                              onChange={(e) => setEditNotes(e.target.value)}
                                              rows={2}
                                              placeholder="Prediction, thoughts, feelings, or reviews..."
                                              className="w-full text-xs font-sans p-2 border-2 border-[#1A1A1A] rounded-xl bg-[#FFFDF3] focus:outline-none"
                                            />
                                          </div>
                                          <div className="flex justify-end gap-2 pt-1">
                                            <button 
                                              onClick={() => setEditingId(null)} 
                                              className="text-[11px] font-playful font-bold uppercase border border-transparent px-3 py-1 cursor-pointer hover:underline text-[#1A1A1A]/70"
                                            >
                                              Cancel
                                            </button>
                                            <button 
                                              onClick={() => handleSaveNotesAndRating(series.id)} 
                                              className="text-[11px] font-playful font-bold uppercase border-2 border-[#1A1A1A] bg-[#FF6B4A] text-white px-4 py-1.5 rounded-xl shadow-[1px_1px_0px_0px_#1A1A1A] cursor-pointer hover:bg-[#FF5C35]"
                                            >
                                              Save Annotation 📝
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          <div className="flex justify-between items-baseline">
                                            <span className="text-[10px] font-playful font-bold uppercase tracking-wider text-[#1A1A1A]/50">My Annotations</span>
                                            <button 
                                              onClick={() => {
                                                setEditingId(series.id);
                                                setEditNotes(series.notes || "");
                                                setEditRating(series.rating || 0);
                                              }}
                                              className="text-[10px] font-playful font-bold uppercase underline text-[#FF6B4A] hover:text-[#FF5C35] cursor-pointer"
                                            >
                                              Edit Notes ✍️
                                            </button>
                                          </div>
                                          <p className="text-xs font-sans italic text-[#1A1A1A]/85 leading-relaxed bg-[#FFFDF3] p-3 rounded-xl border border-[#1A1A1A]/10">
                                            {series.notes ? `"${series.notes}"` : "Click Edit to note theories, predictions or bookmarks!"}
                                          </p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Action row */}
                                    <div className="border-t-2 border-[#1A1A1A]/10 pt-4 flex flex-wrap gap-3 justify-between items-center">
                                      <div className="flex items-center gap-2">
                                        <label className="text-[10px] font-playful font-bold uppercase tracking-wider text-[#1A1A1A]/50">Shelf Status:</label>
                                        <select
                                          value={series.status}
                                          onChange={(e) => handleUpdateStatus(series.id, e.target.value as TrackedSeries["status"])}
                                          className="text-xs font-playful font-bold bg-white border-2 border-[#1A1A1A] rounded-xl px-3 py-1.5 cursor-pointer focus:outline-none shadow-[2px_2px_0px_0px_#1A1A1A]"
                                        >
                                          <option value="reading">📖 Reading</option>
                                          <option value="up-to-date">✅ Up-to-Date</option>
                                          <option value="completed">🎉 Completed</option>
                                          <option value="paused">⏸️ Paused</option>
                                        </select>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        {/* Adjustments toggle button */}
                                        <button
                                          onClick={() => handleOpenCorrections(series)}
                                          className={`px-3 py-1.5 border-2 border-[#1A1A1A] rounded-xl text-[11px] font-playful font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#1A1A1A] ${
                                            showCorrectionsId === series.id 
                                              ? "bg-[#FF6B4A] text-white" 
                                              : "bg-white text-[#1A1A1A] hover:bg-[#FFE8CC]"
                                          }`}
                                          title="Override details, volumes, or metadata"
                                        >
                                          <Sliders className="w-3.5 h-3.5" />
                                          Adjustments
                                        </button>

                                        <button
                                          onClick={() => handleRefreshSeries(series.id)}
                                          disabled={isRefreshing}
                                          title="Sync news & book list via Gemini grounding search"
                                          className="p-2 border-2 border-[#1A1A1A] bg-white rounded-xl shadow-[2px_2px_0px_0px_#1A1A1A] hover:bg-[#FFE8CC] cursor-pointer transition-all disabled:opacity-40"
                                        >
                                          <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSeries(series.id)}
                                          className="p-2 border-2 border-[#1A1A1A] bg-white text-[#C45B31] rounded-xl shadow-[2px_2px_0px_0px_#1A1A1A] hover:bg-[#FADCE6] hover:text-red-600 cursor-pointer transition-all"
                                          title="Remove from Shelf"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                  </div>

                                  {/* If Corrections is Active, render Custom additions & Sequel Editing Panel */}
                                  {showCorrectionsId === series.id && (
                                    <div className="lg:col-span-12 border-2 border-[#1A1A1A] bg-[#FFFDF3] p-6 rounded-2xl space-y-6 shadow-[3px_3px_0px_0px_#1A1A1A]">
                                      <div className="border-b-2 border-[#1A1A1A]/10 pb-3">
                                        <h4 className="font-display font-black text-sm text-[#1A1A1A]">🛠️ Manual Adjustments for {series.title}</h4>
                                        <p className="text-[10px] font-playful font-bold text-[#1A1A1A]/50 mt-0.5">Override dates, add hidden books, or fix sequels.</p>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Form 1: Add Missing Book */}
                                        <div className="space-y-3">
                                          <span className="text-[10px] font-playful font-bold uppercase tracking-wider text-[#FF6B4A] block">1. Add Missing Book / Vol</span>
                                          <div className="grid grid-cols-3 gap-2">
                                            <div className="col-span-2">
                                              <label className="text-[9px] font-playful font-bold block mb-1 opacity-60">Book Title</label>
                                              <input
                                                type="text"
                                                value={newBookTitle}
                                                onChange={(e) => setNewBookTitle(e.target.value)}
                                                placeholder="e.g. Dawnshard"
                                                className="w-full text-xs font-sans p-2 border-2 border-[#1A1A1A] rounded-xl bg-white focus:outline-none"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-[9px] font-playful font-bold block mb-1 opacity-60">Vol #</label>
                                              <input
                                                type="number"
                                                value={newBookVol}
                                                onChange={(e) => setNewBookVol(Number(e.target.value))}
                                                step="0.5"
                                                className="w-full text-xs font-sans p-2 border-2 border-[#1A1A1A] rounded-xl bg-white focus:outline-none"
                                              />
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                            <div>
                                              <label className="text-[9px] font-playful font-bold block mb-1 opacity-60">Release Date (YYYY-MM-DD)</label>
                                              <input
                                                type="text"
                                                value={newBookRelease}
                                                onChange={(e) => setNewBookRelease(e.target.value)}
                                                placeholder="e.g. 2020-10-27"
                                                className="w-full text-xs font-sans p-2 border-2 border-[#1A1A1A] rounded-xl bg-white focus:outline-none"
                                              />
                                            </div>
                                            <div className="flex items-center gap-4 pt-4">
                                              <label className="flex items-center gap-1.5 text-[10px] font-playful font-bold cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={newBookIsNovella}
                                                  onChange={(e) => setNewBookIsNovella(e.target.checked)}
                                                  className="accent-[#FF6B4A]"
                                                />
                                                Novella
                                              </label>
                                              <label className="flex items-center gap-1.5 text-[10px] font-playful font-bold cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={newBookIsSpinOff}
                                                  onChange={(e) => setNewBookIsSpinOff(e.target.checked)}
                                                  className="accent-[#FF6B4A]"
                                                />
                                                Spin-off
                                              </label>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => handleAddCustomBook(series.id)}
                                            className="px-4 py-2 bg-[#1A1A1A] text-white text-[11px] font-playful font-bold uppercase rounded-xl border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A] hover:bg-[#FF6B4A] transition-all cursor-pointer"
                                          >
                                            Add to Ledger 📥
                                          </button>
                                        </div>

                                        {/* Form 2: Edit Sequel Details */}
                                        <div className="space-y-3">
                                          <span className="text-[10px] font-playful font-bold uppercase tracking-wider text-[#FF6B4A] block">2. Override Upcoming Sequel</span>
                                          <div className="grid grid-cols-2 gap-2">
                                            <div>
                                              <label className="text-[9px] font-playful font-bold block mb-1 opacity-60">Sequel Title</label>
                                              <input
                                                type="text"
                                                value={upcomingTitle}
                                                onChange={(e) => setUpcomingTitle(e.target.value)}
                                                placeholder="e.g. Doors of Stone"
                                                className="w-full text-xs font-sans p-2 border-2 border-[#1A1A1A] rounded-xl bg-white focus:outline-none"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-[9px] font-playful font-bold block mb-1 opacity-60">Expected Release</label>
                                              <input
                                                type="text"
                                                value={upcomingRelease}
                                                onChange={(e) => setUpcomingRelease(e.target.value)}
                                                placeholder="e.g. TBA 2026"
                                                className="w-full text-xs font-sans p-2 border-2 border-[#1A1A1A] rounded-xl bg-white focus:outline-none"
                                              />
                                            </div>
                                          </div>
                                          <div>
                                            <label className="text-[9px] font-playful font-bold block mb-1 opacity-60">Confidence Level</label>
                                            <select
                                              value={upcomingConf}
                                              onChange={(e) => setUpcomingConf(e.target.value as any)}
                                              className="w-full text-xs font-sans p-2 border-2 border-[#1A1A1A] rounded-xl bg-white focus:outline-none cursor-pointer"
                                            >
                                              <option value="confirmed">Confirmed (Publisher Verified)</option>
                                              <option value="likely">Likely (Author updates)</option>
                                              <option value="rumoured">Rumoured (Unofficial leaks)</option>
                                              <option value="unknown">Unknown</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="text-[9px] font-playful font-bold block mb-1 opacity-60">Brief Status / Description</label>
                                            <input
                                              type="text"
                                              value={upcomingDesc}
                                              onChange={(e) => setUpcomingDesc(e.target.value)}
                                              placeholder="e.g. Draft complete, undergoing editorial reviews."
                                              className="w-full text-xs font-sans p-2 border-2 border-[#1A1A1A] rounded-xl bg-white focus:outline-none"
                                            />
                                          </div>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => handleUpdateUpcomingBook(series.id)}
                                              className="px-4 py-2 bg-[#1A1A1A] text-white text-[11px] font-playful font-bold uppercase rounded-xl border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A] hover:bg-[#FF6B4A] transition-all cursor-pointer"
                                            >
                                              Save Sequel details 💾
                                            </button>
                                            <button
                                              onClick={() => handleReportBadMetadata(series.id)}
                                              className="px-4 py-2 border-2 border-[#1A1A1A] bg-white text-[#1A1A1A] text-[11px] font-playful font-bold uppercase rounded-xl shadow-[2px_2px_0px_0px_#1A1A1A] hover:bg-[#FFE8CC] transition-all cursor-pointer"
                                            >
                                              Scan Live News 🔍
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "search" && (
                <motion.div
                  key="search-view"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-8"
                >
                  {/* Web search controls */}
                  <div className="border-2 border-[#1A1A1A] p-6 md:p-8 bg-white rounded-3xl space-y-5 shadow-[4px_4px_0px_0px_#1A1A1A]">
                    <h3 className="font-display text-3xl font-black text-[#1A1A1A] tracking-tight">Search Publisher Registries 🔍</h3>
                    <p className="text-xs font-sans text-[#1A1A1A]/75 leading-relaxed max-w-2xl">
                      Query any real-world book series (e.g., <i>Dune</i>, <i>The Expanse</i>, <i>Crescent City</i>, or <i>A Song of Ice and Fire</i>). 
                      The portal will invoke a Gemini Search engine with live Google Grounding to fetch the correct chronological timeline, sequels, and launch schedules.
                    </p>

                    <form onSubmit={handleSearch} className="flex gap-2.5 pt-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#1A1A1A]/50 stroke-[2.5]" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search series name (e.g. Percy Jackson, The Witcher...)"
                          className="w-full bg-[#FFFDF3] border-2 border-[#1A1A1A] pl-11 pr-4 py-3 text-xs font-sans rounded-2xl focus:outline-none placeholder-[#1A1A1A]/40"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSearching || !searchQuery.trim()}
                        className="px-6 py-3 bg-[#FF6B4A] text-white text-xs font-playful font-extrabold uppercase rounded-2xl border-2 border-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#1A1A1A] hover:bg-[#FF5C35] hover:shadow-[3px_3px_0px_0px_#1A1A1A] transition-all cursor-pointer disabled:opacity-40"
                      >
                        {isSearching ? "Searching..." : "Search"}
                      </button>
                    </form>

                    {/* Fast presets */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <span className="text-[10px] font-playful font-bold uppercase text-[#1A1A1A]/50">Suggestions:</span>
                      {[
                        "A Song of Ice and Fire",
                        "Stormlight Archive",
                        "The Expanse",
                        "Percy Jackson",
                        "Dune",
                        "Crescent City"
                      ].map(term => (
                        <button
                          key={term}
                          onClick={() => {
                            setSearchQuery(term);
                            // Auto trigger search shortly
                            setTimeout(() => {
                              const btn = document.querySelector('form button[type="submit"]') as HTMLButtonElement;
                              btn?.click();
                            }, 100);
                          }}
                          className="text-[10px] font-playful font-bold text-[#1A1A1A] bg-[#FFFDF3] hover:bg-[#FFE8CC] px-3.5 py-1.5 transition-all cursor-pointer border-2 border-[#1A1A1A] rounded-xl shadow-[1px_1px_0px_0px_#1A1A1A]"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Searching progress */}
                  {isSearching && (
                    <div className="border-2 border-dashed border-[#1A1A1A]/50 rounded-3xl p-16 text-center space-y-4 bg-white shadow-[2px_2px_0px_0px_#1A1A1A]">
                      <div className="relative w-12 h-12 mx-auto">
                        <div className="absolute inset-0 border-4 border-[#1A1A1A]/10 rounded-full" />
                        <div className="absolute inset-0 border-4 border-t-[#FF6B4A] rounded-full animate-spin" />
                      </div>
                      <p className="font-display font-black text-base text-[#1A1A1A]">
                        Grounding Live News Search... 🔍
                      </p>
                      <p className="text-[10px] font-playful uppercase tracking-wider text-[#1A1A1A]/50 animate-pulse">
                        Scanning publishers, author blogs, and catalogs
                      </p>
                    </div>
                  )}

                  {/* Search error */}
                  {searchError && (
                    <div className="bg-[#FF6B4A]/10 border-2 border-[#FF6B4A] p-5 rounded-3xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-[#FF6B4A] mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-xs font-playful font-extrabold uppercase tracking-wider text-[#FF6B4A]">Retrieval Failure</h4>
                        <p className="text-xs font-sans leading-relaxed text-[#1A1A1A]/80 mt-1">
                          {searchError}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Search outcome */}
                  {searchResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-2 border-[#1A1A1A] bg-white rounded-3xl shadow-[4px_4px_0px_0px_#1A1A1A] overflow-hidden animate-fade-in"
                    >
                      {/* Top banner info */}
                      <div className="p-6 md:p-8 border-b-2 border-[#1A1A1A] bg-[#FFFDF3]/30 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[9px] font-playful font-extrabold tracking-widest uppercase bg-[#FFE8CC] px-2.5 py-1 border border-[#1A1A1A]/10 rounded-md">Search Result</span>
                            <span className="text-xs font-playful font-semibold text-[#F2A359]">by {searchResult.author} ✍️</span>
                          </div>
                          <h3 className="font-display text-3xl font-black text-[#1A1A1A] tracking-tight">{searchResult.title}</h3>
                          <p className="text-xs font-sans text-[#1A1A1A]/80 max-w-2xl leading-relaxed mt-2">{searchResult.description}</p>
                        </div>

                        <button
                          onClick={() => handleTrackSeries(searchResult)}
                          disabled={seriesList.some(s => s.title.toLowerCase() === searchResult.title.toLowerCase())}
                          className="px-6 py-3 bg-[#FF6B4A] text-[#FAF9F6] text-xs font-playful font-extrabold uppercase rounded-2xl border-2 border-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A] hover:bg-[#FF5C35] hover:shadow-[4px_4px_0px_0px_#1A1A1A] transition-all disabled:opacity-40 cursor-pointer self-start sm:self-auto flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          {seriesList.some(s => s.title.toLowerCase() === searchResult.title.toLowerCase()) 
                            ? "Tracked ✅" 
                            : "Track Series"
                          }
                        </button>
                      </div>

                      {/* Split list */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x-2 divide-[#1A1A1A]">
                        
                        {/* Books timeline list */}
                        <div className="lg:col-span-7 p-6 md:p-8 space-y-4">
                          <h4 className="text-[10px] font-playful font-bold uppercase tracking-wider text-[#1A1A1A]/50">Chronological Book Timeline 📚</h4>
                          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                            {searchResult.books.map(b => (
                              <div key={b.id} className="p-4 border-2 border-[#1A1A1A] bg-[#FFFDF3]/30 rounded-2xl flex justify-between items-center shadow-[1px_1px_0px_0px_#1A1A1A]">
                                <div>
                                  <span className="text-[10px] font-playful font-bold text-[#F2A359] block">Volume {b.volumeNumber}</span>
                                  <span className="text-xs font-sans font-bold text-[#1A1A1A]">{b.title}</span>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-[#1A1A1A]/60 bg-[#EBE9E4] px-2.5 py-0.5 rounded-lg border border-[#1A1A1A]/10">
                                  {b.releaseDate || "TBA"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Upcoming book details */}
                        <div className="lg:col-span-5 p-6 md:p-8 bg-[#FFFDF3]/10 flex flex-col justify-between space-y-6">
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-playful font-bold uppercase tracking-wider text-[#1A1A1A]/50">Announcements Scan 📰</h4>
                            
                            {searchResult.upcomingBook ? (
                              <div className="bg-[#FFE8CC] border-2 border-[#1A1A1A] p-5 space-y-3 rounded-2xl shadow-[2px_2px_0px_0px_#1A1A1A]">
                                <div className="flex items-center gap-1.5 text-[#FF6B4A]">
                                  <Sparkles className="w-4 h-4 animate-bounce" />
                                  <span className="font-playful text-[10px] tracking-wide uppercase font-bold">Upcoming Sequel Found!</span>
                                </div>
                                
                                <div>
                                  <h5 className="font-display font-extrabold text-[#1A1A1A] text-sm leading-tight">
                                    {searchResult.upcomingBook.title}
                                  </h5>
                                  <p className="text-[11px] font-sans text-[#1A1A1A]/80 mt-1 leading-relaxed">
                                    {searchResult.upcomingBook.description || "Publishers are setting coordinates."}
                                  </p>
                                </div>

                                <div className="border-t border-[#1A1A1A]/10 pt-2 flex items-center justify-between text-[10px] font-playful font-bold">
                                  <span className="opacity-60 uppercase">Expected Release:</span>
                                  <span className="bg-white border-2 border-[#1A1A1A] px-2.5 py-0.5 rounded-lg shadow-[1px_1px_0px_0px_#1A1A1A]">
                                    {searchResult.upcomingBook.releaseDate}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-[#1A1A1A]/30 p-5 rounded-2xl bg-white text-center space-y-2">
                                <AlertCircle className="w-6 h-6 opacity-40 mx-auto text-[#1A1A1A]" />
                                <p className="font-sans font-bold text-xs text-[#1A1A1A]/70">No active future launches reported.</p>
                                <p className="text-[10px] font-sans opacity-50 max-w-xs mx-auto">
                                  The series may be completed or no official announcements have been indexed recently.
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="text-[10px] font-sans opacity-50 italic">
                            💡 Tip: Tracking this series subscribes you to future title changes and notifies you in the dashboard.
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {activeTab === "releases" && (
                <motion.div
                  key="releases-view"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {/* Calendar intro header */}
                  <div className="border-2 border-[#1A1A1A] p-6 md:p-8 bg-white rounded-3xl shadow-[4px_4px_0px_0px_#1A1A1A] space-y-2">
                    <h3 className="font-display text-3xl font-black text-[#1A1A1A] tracking-tight">The Release Calendar 📅</h3>
                    <p className="text-xs font-sans text-[#1A1A1A]/75 leading-relaxed max-w-xl">
                      Tailored arrivals list mapping scheduled releases for your tracked library items. Use the header news scanner periodically to discover newly registered dates dynamically.
                    </p>
                  </div>

                  {/* List of arrivals */}
                  <div className="space-y-4">
                    {seriesList.filter(s => s.upcomingBook).length === 0 ? (
                      <div className="border-2 border-dashed border-[#1A1A1A]/30 p-12 text-center bg-white rounded-3xl shadow-[2px_2px_0px_0px_#1A1A1A]">
                        <Calendar className="w-10 h-10 mx-auto opacity-35 mb-4 text-[#1A1A1A]" />
                        <p className="font-display font-black text-lg">No future launches scheduled.</p>
                        <p className="text-xs text-[#1A1A1A]/60 font-sans mt-2 max-w-md mx-auto leading-relaxed">
                          None of your tracked series have pending upcoming releases. Click "Scan Live News" to search the web or track new catalogs!
                        </p>
                      </div>
                    ) : (
                      seriesList
                        .filter(s => s.upcomingBook)
                        .map(series => {
                          const book = series.upcomingBook as UpcomingBook;
                          const daysLeft = getDaysUntilRelease(book.releaseDate);

                          return (
                            <div 
                              key={series.id}
                              className="border-2 border-[#1A1A1A] p-6 bg-white rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[3px_3px_0px_0px_#1A1A1A] hover:shadow-[4px_4px_0px_0px_#1A1A1A] transition-all"
                            >
                              <div className="space-y-2 flex-1">
                                <span className="text-[9px] font-playful font-extrabold tracking-widest uppercase bg-[#FFE8CC] text-[#1A1A1A] px-2.5 py-1 rounded-md border border-[#1A1A1A]/10">
                                  {series.title} by {series.author} ✍️
                                </span>
                                <h4 className="font-display text-2xl font-black tracking-tight text-[#1A1A1A] pt-1">{book.title}</h4>
                                <p className="text-xs font-sans text-[#1A1A1A]/80 max-w-2xl leading-relaxed">
                                  {book.description || "Official plot synopses and metadata are preparing for circulation."}
                                </p>
                              </div>

                              <div className="bg-[#FFFDF3] border-2 border-[#1A1A1A] p-5 rounded-2xl flex flex-col items-start md:items-end justify-center min-w-[200px] flex-shrink-0 shadow-[2px_2px_0px_0px_#1A1A1A]">
                                <span className="text-[10px] font-playful font-bold uppercase text-[#1A1A1A]/50">Launch Target 🚀</span>
                                <span className="text-sm font-mono font-bold text-[#FF6B4A] mt-0.5">{book.releaseDate}</span>
                                
                                {daysLeft !== null ? (
                                  daysLeft > 0 ? (
                                    <span className="text-xs font-playful font-extrabold text-[#1A1A1A] mt-1.5 flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-[#FF6B4A] animate-pulse" />
                                      T-minus {daysLeft} Days
                                    </span>
                                  ) : (
                                    <span className="text-xs font-playful font-extrabold text-[#4FB06D] mt-1.5 flex items-center gap-1">
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      Available Now!
                                    </span>
                                  )
                                ) : (
                                  <span className="text-[9px] font-playful font-bold opacity-50 mt-1.5">Day date pending</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </section>

        </div>

      </main>

      {/* Editorial Footer */}
      <footer className="border-t-2 border-[#1A1A1A]/10 px-8 py-8 flex flex-col sm:flex-row justify-between items-center text-[10px] font-playful font-extrabold uppercase tracking-wider text-[#1A1A1A]/50 max-w-7xl mx-auto mt-20">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#4FB06D] animate-ping" />
          <span>Live Data Sync: Active (Gemini Search Grounding) 🤖</span>
        </div>
        <div className="flex space-x-6 mt-3 sm:mt-0">
          <span>Version 3.0.0</span>
          <span>&copy; 2026 Book Nerd Collective 📚</span>
        </div>
      </footer>

    </div>
  );
}
