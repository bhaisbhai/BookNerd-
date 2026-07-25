import React, { useState } from "react";
import { Sparkles, Check, Shuffle, BookOpen, AlertCircle } from "lucide-react";
import { LibraryBook, BookRecommendation } from "../types.js";

interface RecommendationCardProps {
  wantToReadBooks: LibraryBook[];
  tasteSignals: { title: string; rating: number }[];
  onStartReading: (id: string) => void;
}

export default function RecommendationCard({ wantToReadBooks, tasteSignals, onStartReading }: RecommendationCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<BookRecommendation | null>(null);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);

  if (wantToReadBooks.length === 0) return null;

  const requestRecommendation = async (exclude: string[]) => {
    const candidates = wantToReadBooks
      .filter(b => !exclude.includes(b.id))
      .map(b => ({ id: b.id, title: b.title, author: b.author }));

    if (candidates.length === 0) {
      setError("That's everything on your want-to-read list! Add more books or start one you've already got.");
      setRecommendation(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates, tasteSignals })
      });

      if (res.ok) {
        const rec = await res.json();
        setRecommendation(rec);
        setExcludedIds(exclude);
      } else {
        const errData = await res.json().catch(() => null);
        setError(errData?.error || "Failed to get a recommendation. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred getting a recommendation.");
    } finally {
      setIsLoading(false);
    }
  };

  const recommendedBook = recommendation ? wantToReadBooks.find(b => b.id === recommendation.id) : null;

  if (recommendation) {
    return (
      <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
        <div className="p-5 flex gap-4">
          <div className="w-16 h-24 flex-shrink-0 bg-app-bg rounded-lg overflow-hidden flex items-center justify-center">
            {recommendedBook?.coverUrl ? (
              <img src={recommendedBook.coverUrl} alt={recommendation.title} className="w-full h-full object-cover" />
            ) : (
              <BookOpen className="w-6 h-6 text-ink-muted/40" strokeWidth={1.75} />
            )}
          </div>
          <div className="flex-1 space-y-1.5">
            <span className="text-[11px] font-medium tracking-wide uppercase text-accent">Read next</span>
            <h3 className="text-base font-semibold text-ink leading-snug">{recommendation.title}</h3>
            <p className="text-xs text-ink-muted">{recommendation.author || "Unknown"}</p>
            <p className="text-xs text-ink-muted italic leading-relaxed pt-0.5">{recommendation.reason}</p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => { onStartReading(recommendation.id); setRecommendation(null); setExcludedIds([]); }}
                className="px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent-hover transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={2} /> Start reading
              </button>
              <button
                onClick={() => requestRecommendation([...excludedIds, recommendation.id])}
                disabled={isLoading}
                className="px-3 py-1.5 text-ink-muted text-xs font-medium rounded-lg hover:bg-app-bg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
              >
                <Shuffle className="w-3.5 h-3.5" strokeWidth={2} /> Another
              </button>
              <button
                onClick={() => { setRecommendation(null); setExcludedIds([]); }}
                className="px-2 py-1.5 text-ink-muted/60 text-xs hover:text-ink-muted transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm p-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4.5 h-4.5 text-accent" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-sm font-medium text-ink">Not sure what to read next?</p>
          {error ? (
            <p className="text-xs text-danger flex items-center gap-1 mt-0.5">
              <AlertCircle className="w-3 h-3" /> {error}
            </p>
          ) : (
            <p className="text-xs text-ink-muted">Pick from your want-to-read list, based on what you've liked.</p>
          )}
        </div>
      </div>
      <button
        onClick={() => requestRecommendation([])}
        disabled={isLoading}
        className="px-4 py-2 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-40 flex-shrink-0"
      >
        {isLoading ? "Thinking..." : "Recommend"}
      </button>
    </div>
  );
}
