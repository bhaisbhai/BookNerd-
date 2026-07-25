import React from "react";
import { BookOpen } from "lucide-react";

interface BookCardProps {
  title: string;
  author: string;
  coverUrl?: string;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode; // overlay content (badges, action buttons) positioned by the caller
}

// Shared cover-tile used across Library, Add Books review, and Series progress lists.
export default function BookCard({ title, author, coverUrl, onClick, className = "", children }: BookCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group relative bg-surface rounded-2xl border border-line shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      <div className="aspect-[2/3] bg-app-bg flex items-center justify-center overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <BookOpen className="w-7 h-7 text-ink-muted/40" strokeWidth={1.75} />
        )}
      </div>
      <div className="p-3 space-y-0.5">
        <p className="text-sm font-medium text-ink leading-snug line-clamp-2">{title}</p>
        <p className="text-xs text-ink-muted truncate">{author || "Unknown"}</p>
      </div>
      {children}
    </div>
  );
}
