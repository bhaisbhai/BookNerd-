import { checkSeriesNewsLive } from "./gemini.js";
import { ReleaseNotification } from "../src/types.js";

export interface NewsCheckSeriesInput {
  id: string;
  title: string;
  author: string;
  books: { title: string }[];
  lastChecked?: string;
}

export interface NewsCheckResult {
  newsAdded: number;
  updatedSeriesList: NewsCheckSeriesInput[];
  newNotifications: ReleaseNotification[];
}

/**
 * Checks live news/announcements for a couple of the least-recently-checked
 * series (to stay within reasonable API usage per call) and returns any new
 * notifications, deduplicated against the notifications already known.
 */
export async function checkNewsForSeries(
  seriesList: NewsCheckSeriesInput[],
  notifications: ReleaseNotification[]
): Promise<NewsCheckResult> {
  if (!seriesList || seriesList.length === 0) {
    return { newsAdded: 0, updatedSeriesList: [], newNotifications: [] };
  }

  const updated = [...seriesList];
  const addedNotifications: ReleaseNotification[] = [];
  let newsAdded = 0;

  const sortedByChecked = [...updated].sort(
    (a, b) => new Date(a.lastChecked || 0).getTime() - new Date(b.lastChecked || 0).getTime()
  );
  const seriesToCheck = sortedByChecked.slice(0, 2);

  for (const series of seriesToCheck) {
    const lastBook = series.books[series.books.length - 1];
    const lastBookTitle = lastBook ? lastBook.title : "none";

    try {
      const news = await checkSeriesNewsLive(series.title, series.author, lastBookTitle);

      if (news && news.hasNews && news.headline) {
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
            createdAt: new Date().toISOString(),
            dateAdded: new Date().toISOString()
          };
          addedNotifications.push(newNotif);
          newsAdded++;
        }
      }

      const index = updated.findIndex(s => s.id === series.id);
      if (index !== -1) {
        updated[index] = { ...updated[index], lastChecked: new Date().toISOString() };
      }
    } catch (e) {
      console.error(`Error checking news for ${series.title}:`, e);
    }
  }

  return { newsAdded, updatedSeriesList: updated, newNotifications: addedNotifications };
}
