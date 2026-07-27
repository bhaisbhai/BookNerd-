import React, { useEffect, useState } from "react";
import { BookOpen, Search, Calendar, Bell, X, LogOut, ChevronDown } from "lucide-react";
import { onAuthStateChanged, signInWithRedirect, getRedirectResult, signOut, User } from "firebase/auth";
import { collection, doc, getDoc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { auth, googleProvider, db } from "./lib/firebase.js";
import { stripUndefined, commitInBatches, withTimeout, describeFirestoreError } from "./lib/firestoreUtils.js";
import { LibraryBook, FollowedSeries, UserSeriesFollow, ReleaseNotification } from "./types.js";
import LibraryTab from "./components/LibraryTab.js";
import AddBooksTab from "./components/AddBooksTab.js";
import SeriesTab from "./components/SeriesTab.js";

type Tab = "library" | "add" | "series";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("library");

  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>([]);
  const [followedSeries, setFollowedSeries] = useState<FollowedSeries[]>([]);
  const [userFollows, setUserFollows] = useState<UserSeriesFollow[]>([]);
  const [notifications, setNotifications] = useState<ReleaseNotification[]>([]);

  const [isScanningNews, setIsScanningNews] = useState(false);
  const [scanMessage, setScanMessage] = useState("");

  // Guest-mode local storage (fresh key names - this app was rebuilt on a new unified data model,
  // so old-shaped cached JSON under the previous keys is never parsed against this code).
  const [guestLibrary, setGuestLibrary] = useState<LibraryBook[]>(() => {
    const saved = localStorage.getItem("booknerd_guest_library");
    return saved ? JSON.parse(saved) : [];
  });
  const [guestFollowedSeries, setGuestFollowedSeries] = useState<Record<string, FollowedSeries>>(() => {
    const saved = localStorage.getItem("booknerd_guest_followed_series");
    return saved ? JSON.parse(saved) : {};
  });
  const [guestUserFollows, setGuestUserFollows] = useState<Record<string, UserSeriesFollow>>(() => {
    const saved = localStorage.getItem("booknerd_guest_series_follows");
    return saved ? JSON.parse(saved) : {};
  });
  const [guestNotifications, setGuestNotifications] = useState<ReleaseNotification[]>(() => {
    const saved = localStorage.getItem("booknerd_guest_notifications");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => { localStorage.setItem("booknerd_guest_library", JSON.stringify(guestLibrary)); }, [guestLibrary]);
  useEffect(() => { localStorage.setItem("booknerd_guest_followed_series", JSON.stringify(guestFollowedSeries)); }, [guestFollowedSeries]);
  useEffect(() => { localStorage.setItem("booknerd_guest_series_follows", JSON.stringify(guestUserFollows)); }, [guestUserFollows]);
  useEffect(() => { localStorage.setItem("booknerd_guest_notifications", JSON.stringify(guestNotifications)); }, [guestNotifications]);

  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    getRedirectResult(auth).catch((err: any) => {
      console.error("Google login error:", err);
      if (err.code === "auth/unauthorized-domain") {
        alert(`Google Login failed: ${window.location.hostname} is not listed as an authorized Firebase Authentication domain.`);
      } else {
        alert(`Google Login failed: ${err.message}`);
      }
    });
  }, []);

  useEffect(() => {
    setShowMigrationPrompt(!!user && guestLibrary.length > 0);
  }, [user, guestLibrary]);

  // Bind data: Firestore for signed-in users, guest local state otherwise.
  useEffect(() => {
    if (isAuthLoading) return;

    if (user) {
      const unsubLibrary = onSnapshot(collection(db, "users", user.uid, "library"), (snap) => {
        setLibraryBooks(snap.docs.map(d => d.data() as LibraryBook));
      }, (err) => console.error("Firestore library read error:", err));

      const unsubFollows = onSnapshot(collection(db, "users", user.uid, "followedSeries"), async (snap) => {
        const follows = snap.docs.map(d => d.data() as UserSeriesFollow);
        setUserFollows(follows);

        const series: FollowedSeries[] = [];
        for (const follow of follows) {
          const snapDoc = await getDoc(doc(db, "canonicalSeries", follow.seriesId));
          if (snapDoc.exists()) series.push(snapDoc.data() as FollowedSeries);
        }
        setFollowedSeries(series);
      }, (err) => console.error("Firestore followed-series read error:", err));

      const unsubNotifs = onSnapshot(collection(db, "users", user.uid, "notifications"), (snap) => {
        const list = snap.docs.map(d => d.data() as ReleaseNotification);
        list.sort((a, b) => new Date(b.dateAdded || b.createdAt || 0).getTime() - new Date(a.dateAdded || a.createdAt || 0).getTime());
        setNotifications(list);
      }, (err) => console.error("Firestore notifications read error:", err));

      return () => {
        unsubLibrary();
        unsubFollows();
        unsubNotifs();
      };
    } else {
      setLibraryBooks(guestLibrary);
      setFollowedSeries(Object.values(guestFollowedSeries));
      setUserFollows(Object.values(guestUserFollows));
      setNotifications(guestNotifications);
    }
  }, [user, isAuthLoading, guestLibrary, guestFollowedSeries, guestUserFollows, guestNotifications]);

  const handleSignIn = async () => {
    setShowUserMenu(false);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.error("Google login error:", err);
      alert(`Google Login failed: ${err.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setShowUserMenu(false);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleMigrateGuestData = async () => {
    if (!user) return;
    setIsMigrating(true);
    try {
      await commitInBatches(db, guestLibrary, (batch, b) => {
        batch.set(doc(db, "users", user.uid, "library", b.id), stripUndefined(b));
      });
      for (const series of Object.values(guestFollowedSeries)) {
        await withTimeout(setDoc(doc(db, "canonicalSeries", series.id), stripUndefined(series)));
      }
      await commitInBatches(db, Object.values(guestUserFollows), (batch, f) => {
        batch.set(doc(db, "users", user.uid, "followedSeries", f.seriesId), stripUndefined(f));
      });
      await commitInBatches(db, guestNotifications, (batch, n) => {
        batch.set(doc(db, "users", user.uid, "notifications", n.id), stripUndefined(n));
      });

      setGuestLibrary([]);
      setGuestFollowedSeries({});
      setGuestUserFollows({});
      setGuestNotifications([]);
    } catch (e) {
      console.error("Guest migration failed:", e);
      alert("Error migrating your library. Please try again.");
    } finally {
      setIsMigrating(false);
      setShowMigrationPrompt(false);
    }
  };

  const handleDismissMigration = () => {
    setGuestLibrary([]);
    setGuestFollowedSeries({});
    setGuestUserFollows({});
    setGuestNotifications([]);
    setShowMigrationPrompt(false);
  };

  // Returns whether the write actually succeeded, so callers can show a confirmation that
  // reflects reality instead of assuming success the instant this is called - a real gap that
  // let "Added N books" show up even when the underlying save later failed.
  const handleAddLibraryBooks = async (books: LibraryBook[]): Promise<boolean> => {
    if (user) {
      try {
        // A single atomic batch (chunked under Firestore's 500-operation limit) instead of firing
        // one independent setDoc per book - far more reliable for a big batch (e.g. pasting dozens
        // of books at once) than many concurrent connections, and it fails as a unit rather than
        // some books silently saving while others don't.
        await commitInBatches(db, books, (batch, b) => {
          batch.set(doc(db, "users", user.uid, "library", b.id), stripUndefined(b));
        });
        return true;
      } catch (e) {
        console.error("Firestore add library books error:", e);
        alert(`Couldn't save that to your library (${describeFirestoreError(e)}). Please check your connection and try again.`);
        return false;
      }
    } else {
      setGuestLibrary(prev => [...books, ...prev]);
      return true;
    }
  };

  const handleUpdateLibraryBook = async (id: string, patch: Partial<LibraryBook>) => {
    if (user) {
      try {
        await withTimeout(setDoc(doc(db, "users", user.uid, "library", id), stripUndefined(patch), { merge: true }));
      } catch (e) {
        console.error("Firestore update library book error:", e);
        alert(`Couldn't save that change (${describeFirestoreError(e)}). Please try again.`);
      }
    } else {
      setGuestLibrary(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
    }
  };

  const handleDeleteLibraryBook = async (id: string) => {
    if (user) {
      try {
        await withTimeout(deleteDoc(doc(db, "users", user.uid, "library", id)));
      } catch (e) {
        console.error("Firestore delete library book error:", e);
      }
    } else {
      setGuestLibrary(prev => prev.filter(b => b.id !== id));
    }
  };

  const handleFollowSeries = async (series: FollowedSeries) => {
    const follow: UserSeriesFollow = { seriesId: series.id, followedAt: new Date().toISOString() };
    if (user) {
      try {
        await withTimeout(setDoc(doc(db, "canonicalSeries", series.id), stripUndefined(series)));
        await withTimeout(setDoc(doc(db, "users", user.uid, "followedSeries", series.id), stripUndefined(follow), { merge: true }));
      } catch (e) {
        console.error("Firestore follow series error:", e);
        alert(`Couldn't follow that series (${describeFirestoreError(e)}). Please try again.`);
      }
    } else {
      setGuestFollowedSeries(prev => ({ ...prev, [series.id]: series }));
      setGuestUserFollows(prev => ({ ...prev, [series.id]: follow }));
    }
  };

  const handleUnfollowSeries = async (seriesId: string) => {
    if (user) {
      try {
        await withTimeout(deleteDoc(doc(db, "users", user.uid, "followedSeries", seriesId)));
      } catch (e) {
        console.error("Firestore unfollow series error:", e);
      }
    } else {
      setGuestUserFollows(prev => {
        const copy = { ...prev };
        delete copy[seriesId];
        return copy;
      });
    }
  };

  const handleScanForNews = async () => {
    setIsScanningNews(true);
    setScanMessage("Searching the web for announcements...");

    try {
      const seriesForCheck = followedSeries.map(s => ({
        id: s.id,
        title: s.title,
        author: s.author,
        books: s.books.map(b => ({ title: b.title })),
        lastChecked: s.lastChecked
      }));

      const res = await fetch("/api/check-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesList: seriesForCheck, notifications })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.newsAdded > 0) {
          setScanMessage(`Found ${data.newsAdded} new announcement(s)!`);
          if (user) {
            for (const s of data.updatedSeriesList || []) {
              await withTimeout(setDoc(doc(db, "canonicalSeries", s.id), { lastChecked: s.lastChecked }, { merge: true }));
            }
            for (const n of data.newNotifications || []) {
              await withTimeout(setDoc(doc(db, "users", user.uid, "notifications", n.id), stripUndefined(n)));
            }
          } else {
            for (const s of data.updatedSeriesList || []) {
              setGuestFollowedSeries(prev => {
                const existing = prev[s.id];
                return existing ? { ...prev, [s.id]: { ...existing, lastChecked: s.lastChecked } } : prev;
              });
            }
            if (data.newNotifications?.length) {
              setGuestNotifications(prev => [...data.newNotifications, ...prev]);
            }
          }
        } else {
          setScanMessage("All caught up - no new announcements found.");
        }
      }
    } catch (e) {
      console.error(e);
      setScanMessage("Error scanning for updates.");
    } finally {
      setTimeout(() => { setIsScanningNews(false); setScanMessage(""); }, 4000);
    }
  };

  const handleDismissNotification = async (id: string) => {
    if (user) {
      try {
        await withTimeout(deleteDoc(doc(db, "users", user.uid, "notifications", id)));
      } catch (e) {
        console.error("Firestore dismiss notification error:", e);
      }
    } else {
      setGuestNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof BookOpen }[] = [
    { id: "library", label: "Library", icon: BookOpen },
    { id: "add", label: "Add Books", icon: Search },
    { id: "series", label: "Series & News", icon: Calendar }
  ];

  return (
    <div className="min-h-screen bg-app-bg text-ink font-sans">
      <header className="border-b border-line bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4.5 h-4.5 text-white" strokeWidth={1.75} />
            </div>
            <span className="text-base font-semibold text-ink">Book Nerd</span>
          </div>

          <nav className="hidden sm:flex items-center gap-1 bg-app-bg rounded-full p-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors cursor-pointer ${
                  activeTab === t.id ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-app-bg transition-colors cursor-pointer relative"
              >
                <Bell className="w-4 h-4 text-ink-muted" strokeWidth={1.75} />
                {notifications.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-accent rounded-full" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-surface border border-line rounded-2xl shadow-lg overflow-hidden z-50">
                  <div className="p-3 border-b border-line flex items-center justify-between">
                    <span className="text-xs font-medium text-ink-muted">Notifications</span>
                    <button onClick={() => setShowNotifications(false)} className="text-ink-muted hover:text-ink cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-line">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-ink-muted">No notifications yet.</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-3 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-medium text-ink">{n.seriesTitle}</p>
                            <p className="text-xs text-ink-muted mt-0.5">{n.message}</p>
                          </div>
                          <button onClick={() => handleDismissNotification(n.id)} className="text-ink-muted/50 hover:text-ink-muted cursor-pointer flex-shrink-0">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {isAuthLoading ? (
              <div className="w-6 h-6 border-2 border-line border-t-ink-muted rounded-full animate-spin" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-app-bg transition-colors cursor-pointer"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || "User"} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-ink text-white flex items-center justify-center text-[10px] font-medium">
                      {user.displayName ? user.displayName[0].toUpperCase() : "U"}
                    </span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-ink-muted" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-44 bg-surface border border-line rounded-xl shadow-lg overflow-hidden z-50">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-ink hover:bg-app-bg transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="px-3.5 py-1.5 bg-ink text-white text-xs font-medium rounded-full hover:opacity-85 transition-opacity cursor-pointer"
              >
                Sign in
              </button>
            )}
          </div>
        </div>

        <nav className="sm:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === t.id ? "bg-ink text-white" : "bg-app-bg text-ink-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {!user && !isAuthLoading && (
          <div className="mb-6 bg-surface border border-line rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-ink-muted">Browsing as a guest - your library is saved to this browser only.</p>
            <button onClick={handleSignIn} className="text-xs font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer flex-shrink-0">
              Sign in to sync
            </button>
          </div>
        )}

        {showMigrationPrompt && (
          <div className="mb-6 bg-accent/5 border border-accent/20 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-ink">
              You have {guestLibrary.length} book{guestLibrary.length === 1 ? "" : "s"} saved locally. Move them to your account?
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={handleDismissMigration} className="text-xs text-ink-muted hover:text-ink cursor-pointer">Discard</button>
              <button
                onClick={handleMigrateGuestData}
                disabled={isMigrating}
                className="text-xs font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer disabled:opacity-40"
              >
                {isMigrating ? "Moving..." : "Move to my account"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "library" && (
          <LibraryTab
            libraryBooks={libraryBooks}
            followedSeries={followedSeries}
            onUpdateBook={handleUpdateLibraryBook}
            onDeleteBook={handleDeleteLibraryBook}
            onAddBooks={handleAddLibraryBooks}
            onFollowSeries={handleFollowSeries}
          />
        )}
        {activeTab === "add" && (
          <AddBooksTab libraryBooks={libraryBooks} onAddBooks={handleAddLibraryBooks} onFollowSeries={handleFollowSeries} />
        )}
        {activeTab === "series" && (
          <SeriesTab
            followedSeries={followedSeries}
            userFollows={userFollows}
            libraryBooks={libraryBooks}
            onScanNews={handleScanForNews}
            isScanningNews={isScanningNews}
            scanMessage={scanMessage}
            onUnfollow={handleUnfollowSeries}
            onUpdateBook={handleUpdateLibraryBook}
            onAddBooks={handleAddLibraryBooks}
            onFollowSeries={handleFollowSeries}
          />
        )}
      </main>
    </div>
  );
}
