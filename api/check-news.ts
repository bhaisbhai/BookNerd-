import { checkNewsForSeries, NewsCheckSeriesInput } from "../server/newsCheck.js";
import { ReleaseNotification } from "../src/types.js";

type VercelRequest = {
  method?: string;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Allow", "POST");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "object" && req.body !== null ? req.body as Record<string, unknown> : {};
  const seriesList = Array.isArray(body.seriesList) ? body.seriesList as NewsCheckSeriesInput[] : [];
  const notifications = Array.isArray(body.notifications) ? body.notifications as ReleaseNotification[] : [];

  if (seriesList.length === 0) {
    return res.status(200).json({ message: "No tracked series to check.", newsAdded: 0, updatedSeriesList: [], newNotifications: [] });
  }

  try {
    const result = await checkNewsForSeries(seriesList, notifications);
    return res.status(200).json({
      message: "Successfully checked live announcements.",
      ...result
    });
  } catch (error) {
    console.error("Check-news API Error:", error);
    return res.status(500).json({ error: "Failed to check live announcements." });
  }
}
