import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { searchBookSeriesLive } from "./server/gemini.js";
import { enrichBook } from "./server/metadata.js";
import { suggestBooks } from "./server/suggest.js";
import { refreshSeriesData } from "./server/refreshSeries.js";
import { checkNewsForSeries, NewsCheckSeriesInput } from "./server/newsCheck.js";
import { scanBooksFromImage } from "./server/scanBooks.js";
import { recommendNextRead, RecommendCandidate, TasteSignal } from "./server/recommend.js";
import { ReleaseNotification } from "./src/types.js";

dotenv.config();

const app = express();
const PORT = 3000;

// Raised from the default 100kb so bookshelf photo uploads (base64-encoded) fit.
app.use(express.json({ limit: "10mb" }));

// --- API Endpoints ---
// All of these are stateless - the client (Firestore for signed-in users, localStorage for
// guests) owns persistence, and mirrors 1:1 with the Vercel functions under api/*.ts.

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// GET fast, lightweight autocomplete suggestions while typing (no Gemini call).
app.get("/api/suggest", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q : "";
  if (!query) {
    return res.json({ suggestions: [] });
  }

  try {
    const suggestions = await suggestBooks(query);
    res.json({ suggestions });
  } catch (error) {
    console.error("Suggest error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch book suggestions." });
  }
});

// POST search live book/series data via Gemini once a suggestion is chosen or a search is committed to.
app.post("/api/search", async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Search query string is required" });
  }

  try {
    const results = await searchBookSeriesLive(query, "quick");

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

// POST refresh a followed series' canonical metadata to fetch the newest books & upcoming announcements.
app.post("/api/refresh-series", async (req, res) => {
  const { id, title, author, books, upcomingBook } = req.body || {};

  if (typeof id !== "string" || typeof title !== "string" || typeof author !== "string" || !Array.isArray(books)) {
    return res.status(400).json({ error: "id, title, author and books are required" });
  }

  try {
    const result = await refreshSeriesData({ id, title, author, books, upcomingBook: upcomingBook ?? null });
    res.json(result);
  } catch (error) {
    console.error(`Refresh error for series ${id}:`, error);
    res.status(500).json({ error: "Failed to refresh series from search grounding." });
  }
});

// POST check news for a caller-supplied list of followed series to discover title announcements.
app.post("/api/check-news", async (req, res) => {
  const seriesList: NewsCheckSeriesInput[] = Array.isArray(req.body?.seriesList) ? req.body.seriesList : [];
  const notifications: ReleaseNotification[] = Array.isArray(req.body?.notifications) ? req.body.notifications : [];

  if (seriesList.length === 0) {
    return res.json({ message: "No followed series to check.", newsAdded: 0, updatedSeriesList: [], newNotifications: [] });
  }

  try {
    const result = await checkNewsForSeries(seriesList, notifications);
    res.json({ message: "Successfully checked live announcements.", ...result });
  } catch (error) {
    console.error("Check-news error:", error);
    res.status(500).json({ error: "Failed to check live announcements." });
  }
});

// POST scan a bookshelf photo and return candidate books for the user to review before adding.
app.post("/api/scan-books", async (req, res) => {
  const { image, mimeType } = req.body || {};

  if (typeof image !== "string" || typeof mimeType !== "string") {
    return res.status(400).json({ error: "image (base64) and mimeType are required" });
  }

  try {
    const books = await scanBooksFromImage(image, mimeType);
    res.json({ books });
  } catch (error) {
    console.error("Scan-books error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to scan bookshelf photo." });
  }
});

// POST recommend the next book to read from the caller's "want to read" list.
app.post("/api/recommend", async (req, res) => {
  const candidates: RecommendCandidate[] = Array.isArray(req.body?.candidates) ? req.body.candidates : [];
  const tasteSignals: TasteSignal[] = Array.isArray(req.body?.tasteSignals) ? req.body.tasteSignals : [];

  if (candidates.length === 0) {
    return res.status(400).json({ error: "candidates (unread library books) are required" });
  }

  try {
    const recommendation = await recommendNextRead(candidates, tasteSignals);
    res.json(recommendation);
  } catch (error) {
    console.error("Recommend error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate a recommendation." });
  }
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
