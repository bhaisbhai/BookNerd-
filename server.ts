import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { searchBookSeriesLive, checkSeriesNewsLive } from "./server/gemini.js";
import { enrichBook } from "./server/metadata.js";
import { TrackedSeries, SearchResultSeries, ReleaseNotification, Book } from "./src/types.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Ensure persistent data directory exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const SERIES_FILE = path.join(DATA_DIR, "tracked_series.json");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");

// Helper to read JSON data safely
function readJSONFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content) as T;
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
  }
  return defaultValue;
}

// Helper to write JSON data safely
function writeJSONFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
  }
}

// Pre-populate with a couple of popular series if empty to show how the tracker works immediately
function preseedIfEmpty() {
  const currentSeries = readJSONFile<TrackedSeries[]>(SERIES_FILE, []);
  if (currentSeries.length === 0) {
    const defaultSeries: TrackedSeries[] = [
      {
        id: "stormlight-archive",
        title: "The Stormlight Archive",
        author: "Brandon Sanderson",
        description: "An epic fantasy series set on the shattered world of Roshar, where storms of incredible power sweep the land and legendary knights must arise.",
        status: "reading",
        rating: 5,
        notes: "Incredible worldbuilding! Can't wait for Wind and Truth.",
        lastChecked: new Date().toISOString(),
        books: [
          { id: "way-of-kings", title: "The Way of Kings", volumeNumber: 1, releaseDate: "2010-08-31", isRead: true, status: "released" },
          { id: "words-of-radiance", title: "Words of Radiance", volumeNumber: 2, releaseDate: "2014-03-04", isRead: true, status: "released" },
          { id: "oathbringer", title: "Oathbringer", volumeNumber: 3, releaseDate: "2017-11-14", isRead: false, status: "released" },
          { id: "rhythm-of-war", title: "Rhythm of War", volumeNumber: 4, releaseDate: "2020-11-17", isRead: false, status: "released" }
        ],
        upcomingBook: {
          title: "Wind and Truth (Volume 5)",
          releaseDate: "2024-12-06",
          description: "The epic conclusion to the first five-book arc of the Stormlight Archive.",
          status: "upcoming"
        }
      },
      {
        id: "kingkiller-chronicle",
        title: "The Kingkiller Chronicle",
        author: "Patrick Rothfuss",
        description: "The fantasy trilogy telling the autobiography of Kvothe, a legendary musician, arcanist, and adventurer who became a notorious kingkiller.",
        status: "paused",
        rating: 4,
        notes: "Absolutely beautiful prose. Please Pat, release Book 3!",
        lastChecked: new Date().toISOString(),
        books: [
          { id: "name-of-the-wind", title: "The Name of the Wind", volumeNumber: 1, releaseDate: "2007-03-27", isRead: true, status: "released" },
          { id: "wise-mans-fear", title: "The Wise Man's Fear", volumeNumber: 2, releaseDate: "2011-03-01", isRead: true, status: "released" }
        ],
        upcomingBook: {
          title: "The Doors of Stone (Volume 3)",
          releaseDate: "TBA",
          description: "The long-awaited, highly anticipated final volume of the trilogy.",
          status: "announced"
        }
      }
    ];
    writeJSONFile(SERIES_FILE, defaultSeries);
    
    const defaultNotifications: ReleaseNotification[] = [
      {
        id: "notif-1",
        seriesId: "stormlight-archive",
        seriesTitle: "The Stormlight Archive",
        bookTitle: "Wind and Truth (Volume 5)",
        releaseDate: "2024-12-06",
        type: "release_countdown",
        message: "Wind and Truth (Volume 5) launches on December 6, 2024! Get ready to complete your reading list.",
        dateAdded: new Date().toISOString()
      }
    ];
    writeJSONFile(NOTIFICATIONS_FILE, defaultNotifications);
  }
}

preseedIfEmpty();

// --- API Endpoints ---

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// GET all tracked series
app.get("/api/series", (req, res) => {
  const series = readJSONFile<TrackedSeries[]>(SERIES_FILE, []);
  res.json(series);
});

// POST track a new series
app.post("/api/series", (req, res) => {
  const searchResult = req.body as SearchResultSeries;
  if (!searchResult.title || !searchResult.author) {
    return res.status(400).json({ error: "Missing required fields title or author" });
  }

  const seriesList = readJSONFile<TrackedSeries[]>(SERIES_FILE, []);
  
  // Prevent duplicates
  const exists = seriesList.find(s => s.title.toLowerCase() === searchResult.title.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "Series is already being tracked." });
  }

  const id = searchResult.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  
  const newSeries: TrackedSeries = {
    id,
    title: searchResult.title,
    author: searchResult.author,
    description: searchResult.description,
    status: "reading",
    coverUrl: searchResult.coverUrl,
    rating: 0,
    notes: "",
    books: searchResult.books.map(b => ({
      ...b,
      isRead: false
    })),
    upcomingBook: searchResult.upcomingBook || null,
    lastChecked: new Date().toISOString()
  };

  seriesList.push(newSeries);
  writeJSONFile(SERIES_FILE, seriesList);

  // If there's an upcoming book, add an automatic notification
  if (newSeries.upcomingBook) {
    const notifications = readJSONFile<ReleaseNotification[]>(NOTIFICATIONS_FILE, []);
    notifications.unshift({
      id: `notif-${Date.now()}`,
      seriesId: newSeries.id,
      seriesTitle: newSeries.title,
      bookTitle: newSeries.upcomingBook.title,
      releaseDate: newSeries.upcomingBook.releaseDate,
      type: "new_announcement",
      message: `New upcoming title found for ${newSeries.title}: "${newSeries.upcomingBook.title}" (Estimated Release: ${newSeries.upcomingBook.releaseDate})!`,
      dateAdded: new Date().toISOString()
    });
    writeJSONFile(NOTIFICATIONS_FILE, notifications);
  }

  res.status(201).json(newSeries);
});

// PUT update a tracked series progress
app.put("/api/series/:id", (req, res) => {
  const id = req.params.id;
  const updatedData = req.body as Partial<TrackedSeries>;
  
  const seriesList = readJSONFile<TrackedSeries[]>(SERIES_FILE, []);
  const index = seriesList.findIndex(s => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Series not found" });
  }

  const existingSeries = seriesList[index];
  
  // Merge updates safely
  const updatedSeries: TrackedSeries = {
    ...existingSeries,
    ...updatedData,
    // Keep immutable properties
    id: existingSeries.id,
    title: existingSeries.title,
    author: existingSeries.author,
    // Safely update sub-arrays/objects if present
    books: updatedData.books ? updatedData.books : existingSeries.books,
    upcomingBook: updatedData.upcomingBook !== undefined ? updatedData.upcomingBook : existingSeries.upcomingBook,
  };

  seriesList[index] = updatedSeries;
  writeJSONFile(SERIES_FILE, seriesList);

  res.json(updatedSeries);
});

// DELETE stop tracking a series
app.delete("/api/series/:id", (req, res) => {
  const id = req.params.id;
  const seriesList = readJSONFile<TrackedSeries[]>(SERIES_FILE, []);
  const filtered = seriesList.filter(s => s.id !== id);

  if (seriesList.length === filtered.length) {
    return res.status(404).json({ error: "Series not found" });
  }

  writeJSONFile(SERIES_FILE, filtered);
  
  // Clean up notifications for this series
  const notifications = readJSONFile<ReleaseNotification[]>(NOTIFICATIONS_FILE, []);
  const filteredNotifications = notifications.filter(n => n.seriesId !== id);
  writeJSONFile(NOTIFICATIONS_FILE, filteredNotifications);

  res.json({ message: "Series stopped tracking successfully" });
});

// POST search live book series via Gemini
app.post("/api/search", async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Search query string is required" });
  }

  try {
    const results = await searchBookSeriesLive(query);
    
    // Enrich with genuine metadata if cover is missing or placeholder
    if (!results.coverUrl && results.books && results.books.length > 0) {
      const firstBookTitle = results.books[0].title;
      const enrichment = await enrichBook(firstBookTitle, results.author);
      if (enrichment && enrichment.coverUrl) {
        results.coverUrl = enrichment.coverUrl;
      }
    }
    
    res.json(results);
  } catch (error) {
    console.error("Search API Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch live book data." });
  }
});

// POST refresh series to fetch the newest books & upcoming announcements
app.post("/api/series/:id/refresh", async (req, res) => {
  const id = req.params.id;
  const seriesList = readJSONFile<TrackedSeries[]>(SERIES_FILE, []);
  const index = seriesList.findIndex(s => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Series not found" });
  }

  const series = seriesList[index];

  try {
    // Re-query Gemini using the exact series title + author to get fresh data
    const freshData = await searchBookSeriesLive(`${series.title} by ${series.author}`);

    // Sync books
    const updatedBooks: Book[] = [];
    
    // Create map of existing books to preserve 'isRead'
    const existingBooksMap = new Map<string, Book>();
    series.books.forEach(b => {
      // Index by normalized title to avoid minor spelling/spacing mismatches
      const key = b.title.toLowerCase().replace(/[^a-z0-9]+/g, "");
      existingBooksMap.set(key, b);
    });

    freshData.books.forEach((freshBook, idx) => {
      const key = freshBook.title.toLowerCase().replace(/[^a-z0-9]+/g, "");
      const existing = existingBooksMap.get(key);
      
      if (existing) {
        updatedBooks.push({
          ...freshBook,
          isRead: existing.isRead, // Preserve read status
          id: existing.id // Keep original ID
        });
      } else {
        // Newly added book in fresh data!
        updatedBooks.push({
          ...freshBook,
          isRead: false // Defaults to unread
        });
      }
    });

    // Check if a new upcoming book announcement occurred
    let hasNewAnnouncement = false;
    if (freshData.upcomingBook) {
      const oldUpcomingTitle = series.upcomingBook?.title;
      const newUpcomingTitle = freshData.upcomingBook.title;
      
      if (newUpcomingTitle && oldUpcomingTitle !== newUpcomingTitle) {
        hasNewAnnouncement = true;
      }
    }

    const updatedSeries: TrackedSeries = {
      ...series,
      description: freshData.description || series.description,
      books: updatedBooks,
      upcomingBook: freshData.upcomingBook,
      lastChecked: new Date().toISOString()
    };

    seriesList[index] = updatedSeries;
    writeJSONFile(SERIES_FILE, seriesList);

    // Write a notification if a new book was announced
    if (hasNewAnnouncement && updatedSeries.upcomingBook) {
      const notifications = readJSONFile<ReleaseNotification[]>(NOTIFICATIONS_FILE, []);
      notifications.unshift({
        id: `notif-${Date.now()}`,
        seriesId: updatedSeries.id,
        seriesTitle: updatedSeries.title,
        bookTitle: updatedSeries.upcomingBook.title,
        releaseDate: updatedSeries.upcomingBook.releaseDate,
        type: "new_announcement",
        message: `Exciting announcement! A new upcoming book "${updatedSeries.upcomingBook.title}" has been spotted for the series "${updatedSeries.title}".`,
        dateAdded: new Date().toISOString()
      });
      writeJSONFile(NOTIFICATIONS_FILE, notifications);
    }

    res.json(updatedSeries);
  } catch (error) {
    console.error(`Refresh error for series ${id}:`, error);
    res.status(500).json({ error: "Failed to refresh series from search grounding." });
  }
});

// GET notifications
app.get("/api/notifications", (req, res) => {
  const notifications = readJSONFile<ReleaseNotification[]>(NOTIFICATIONS_FILE, []);
  res.json(notifications);
});

// POST dismiss a notification
app.post("/api/notifications/dismiss", (req, res) => {
  const { id } = req.body;
  const notifications = readJSONFile<ReleaseNotification[]>(NOTIFICATIONS_FILE, []);
  const filtered = notifications.filter(n => n.id !== id);
  writeJSONFile(NOTIFICATIONS_FILE, filtered);
  res.json({ message: "Notification dismissed" });
});

// POST check news for all tracked series to discover title announcements dynamically
app.post("/api/check-news", async (req, res) => {
  const { seriesList: reqSeriesList, notifications: reqNotifications } = req.body;
  const isCustom = Array.isArray(reqSeriesList);
  const seriesList = isCustom ? reqSeriesList : readJSONFile<TrackedSeries[]>(SERIES_FILE, []);
  
  if (seriesList.length === 0) {
    return res.json({ message: "No tracked series to check.", newsAdded: 0, updatedSeriesList: [], newNotifications: [] });
  }

  let newsAdded = 0;
  const notifications = isCustom ? (reqNotifications || []) : readJSONFile<ReleaseNotification[]>(NOTIFICATIONS_FILE, []);
  const addedNotifications: ReleaseNotification[] = [];

  // Pick a random series to check live to avoid heavy API rate-limiting, or check all if small
  // For the best user experience, let's check up to 2 series that haven't been checked in a while
  const sortedByChecked = [...seriesList].sort((a, b) => new Date(a.lastChecked).getTime() - new Date(b.lastChecked).getTime());
  const seriesToCheck = sortedByChecked.slice(0, 2);

  for (const series of seriesToCheck) {
    const lastBook = series.books[series.books.length - 1];
    const lastBookTitle = lastBook ? lastBook.title : "none";
    
    try {
      const news = await checkSeriesNewsLive(series.title, series.author, lastBookTitle);
      
      if (news && news.hasNews && news.headline) {
        // Check if we already have this notification headline
        const duplicate = notifications.find(n => n.seriesId === series.id && n.bookTitle === news.headline);
        if (!duplicate) {
          const newNotif: ReleaseNotification = {
            id: `news-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            seriesId: series.id,
            seriesTitle: series.title,
            bookTitle: news.headline,
            releaseDate: news.date || "TBA",
            type: news.newsType === "delay" ? "release_countdown" : "new_announcement",
            message: `${news.headline}: ${news.details}`,
            dateAdded: new Date().toISOString()
          };
          notifications.unshift(newNotif);
          addedNotifications.push(newNotif);
          newsAdded++;
        }
      }

      // Update lastChecked time
      const index = seriesList.findIndex(s => s.id === series.id);
      if (index !== -1) {
        seriesList[index].lastChecked = new Date().toISOString();
      }
    } catch (e) {
      console.error(`Error checking news for ${series.title}:`, e);
    }
  }

  if (!isCustom) {
    if (newsAdded > 0) {
      writeJSONFile(NOTIFICATIONS_FILE, notifications);
      writeJSONFile(SERIES_FILE, seriesList);
    }
  }

  res.json({ 
    message: `Successfully checked live announcements.`, 
    newsAdded,
    updatedSeriesList: isCustom ? seriesList : undefined,
    newNotifications: isCustom ? addedNotifications : undefined
  });
});

// --- Front-end Integration & Vite Middleware ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
