import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  Sparkles,
  Check,
  X,
  Trash2,
  Shuffle,
  BookOpen,
  AlertCircle,
  RotateCw
} from "lucide-react";
import { ShelfBook, ShelfScanCandidate, ShelfRecommendation } from "../types.js";
import { fileToResizedBase64 } from "../lib/imageUtils.js";

interface ReviewCandidate extends ShelfScanCandidate {
  include: boolean;
}

interface ShelfTabProps {
  shelfBooks: ShelfBook[];
  tasteSignals: { title: string; rating: number }[];
  onAddBooks: (books: ShelfBook[]) => void;
  onToggleRead: (id: string) => void;
  onDeleteBook: (id: string) => void;
}

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function ShelfTab({ shelfBooks, tasteSignals, onAddBooks, onToggleRead, onDeleteBook }: ShelfTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [reviewCandidates, setReviewCandidates] = useState<ReviewCandidate[] | null>(null);

  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendError, setRecommendError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<ShelfRecommendation | null>(null);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);

  const unreadBooks = shelfBooks.filter(b => !b.isRead);
  const readBooks = shelfBooks.filter(b => b.isRead);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsScanning(true);
    setScanError(null);
    setReviewCandidates(null);

    try {
      const { base64, mimeType } = await fileToResizedBase64(file);
      const res = await fetch("/api/scan-shelf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType })
      });

      if (res.ok) {
        const data = await res.json();
        const candidates: ReviewCandidate[] = (data.books || []).map((b: ShelfScanCandidate) => ({ ...b, include: true }));
        if (candidates.length === 0) {
          setScanError("No books could be identified in that photo. Try a clearer, well-lit shot of the spines.");
        } else {
          setReviewCandidates(candidates);
        }
      } else {
        const errData = await res.json().catch(() => null);
        setScanError(errData?.error || "Failed to scan that photo. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setScanError("An error occurred reading or uploading that photo.");
    } finally {
      setIsScanning(false);
    }
  };

  const updateCandidate = (index: number, patch: Partial<ReviewCandidate>) => {
    setReviewCandidates(prev => prev ? prev.map((c, i) => i === index ? { ...c, ...patch } : c) : prev);
  };

  const confirmAddCandidates = () => {
    if (!reviewCandidates) return;
    const now = Date.now();
    const newBooks: ShelfBook[] = reviewCandidates
      .filter(c => c.include && c.title.trim())
      .map((c, idx) => ({
        id: `shelf-${slugify(c.title)}-${now}-${idx}`,
        title: c.title.trim(),
        author: c.author.trim(),
        coverUrl: c.coverUrl,
        isRead: false,
        addedAt: new Date().toISOString(),
        source: "scanned"
      }));

    if (newBooks.length > 0) {
      onAddBooks(newBooks);
    }
    setReviewCandidates(null);
  };

  const runRecommendation = async (exclude: string[]) => {
    const candidates = unreadBooks
      .filter(b => !exclude.includes(b.id))
      .map(b => ({ id: b.id, title: b.title, author: b.author }));

    if (candidates.length === 0) {
      setRecommendError("That's everything unread on your shelf! Add more books or mark one as read.");
      setRecommendation(null);
      return;
    }

    setIsRecommending(true);
    setRecommendError(null);

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
        setRecommendError(errData?.error || "Failed to get a recommendation. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setRecommendError("An error occurred getting a recommendation.");
    } finally {
      setIsRecommending(false);
    }
  };

  const recommendedBook = recommendation ? shelfBooks.find(b => b.id === recommendation.id) : null;

  return (
    <div className="space-y-8">
      {/* Recommendation CTA */}
      <div className="border-2 border-[#1A1A1A] p-6 md:p-8 bg-[#4F46E5] rounded-3xl shadow-[4px_4px_0px_0px_#1A1A1A] text-white space-y-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display text-2xl font-black tracking-tight">Don't know what to read next?</h3>
            <p className="text-xs font-sans opacity-90 mt-1 max-w-xl leading-relaxed">
              Pick a book from your own unread shelf, chosen for you based on what's sitting there (and what you've liked before).
            </p>
          </div>
        </div>
        <button
          onClick={() => runRecommendation([])}
          disabled={isRecommending || unreadBooks.length === 0}
          className="px-6 py-3 bg-white text-[#4F46E5] text-xs font-playful font-extrabold uppercase rounded-2xl border-2 border-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#1A1A1A] hover:translate-y-[-1px] active:translate-y-[1px] transition-all cursor-pointer disabled:opacity-40 flex items-center gap-2"
        >
          <Sparkles className={`w-4 h-4 ${isRecommending ? "animate-pulse" : ""}`} />
          {isRecommending ? "Thinking..." : "What Should I Read Next?"}
        </button>
        {unreadBooks.length === 0 && (
          <p className="text-[10px] font-playful uppercase tracking-wider opacity-75">Add unread books to your shelf first.</p>
        )}
      </div>

      {/* Recommendation result / error */}
      <AnimatePresence>
        {recommendError && !recommendation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-[#FF6B4A]/10 border-2 border-[#FF6B4A] p-5 rounded-3xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-[#FF6B4A] mt-0.5 flex-shrink-0" />
            <p className="text-xs font-sans leading-relaxed text-[#1A1A1A]/80">{recommendError}</p>
          </motion.div>
        )}

        {recommendation && (
          <motion.div
            key={recommendation.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-2 border-[#1A1A1A] bg-white rounded-3xl shadow-[4px_4px_0px_0px_#1A1A1A] overflow-hidden"
          >
            <div className="p-6 md:p-8 flex flex-col sm:flex-row gap-6">
              <div className="w-24 h-36 flex-shrink-0 bg-[#FFE8CC] border-2 border-[#1A1A1A] rounded-xl overflow-hidden shadow-[2px_2px_0px_0px_#1A1A1A] flex items-center justify-center mx-auto sm:mx-0">
                {recommendedBook?.coverUrl ? (
                  <img src={recommendedBook.coverUrl} alt={recommendation.title} className="w-full h-full object-cover" />
                ) : (
                  <BookOpen className="w-8 h-8 text-[#1A1A1A]/40" />
                )}
              </div>
              <div className="flex-1 space-y-3">
                <span className="text-[9px] font-playful font-extrabold tracking-widest uppercase bg-[#FFE8CC] px-2.5 py-1 border border-[#1A1A1A]/10 rounded-md inline-block">
                  Your Next Read
                </span>
                <h3 className="font-display text-2xl font-black text-[#1A1A1A] tracking-tight leading-tight">{recommendation.title}</h3>
                <p className="text-xs font-playful font-semibold text-[#F2A359]">by {recommendation.author || "Unknown"}</p>
                <p className="text-xs font-sans text-[#1A1A1A]/80 leading-relaxed italic">"{recommendation.reason}"</p>

                <div className="flex flex-wrap gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      onToggleRead(recommendation.id);
                      setRecommendation(null);
                      setExcludedIds([]);
                    }}
                    className="px-4 py-2 bg-[#4FB06D] text-white text-[11px] font-playful font-bold uppercase rounded-xl border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A] hover:translate-y-[-1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Started Reading
                  </button>
                  <button
                    onClick={() => runRecommendation([...excludedIds, recommendation.id])}
                    disabled={isRecommending}
                    className="px-4 py-2 bg-white text-[#1A1A1A] text-[11px] font-playful font-bold uppercase rounded-xl border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A] hover:bg-[#FFE8CC] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Shuffle className="w-3.5 h-3.5" /> Give Me Another
                  </button>
                  <button
                    onClick={() => { setRecommendation(null); setExcludedIds([]); }}
                    className="px-4 py-2 text-[#1A1A1A]/50 text-[11px] font-playful font-bold uppercase rounded-xl hover:text-[#1A1A1A] transition-all cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan controls */}
      <div className="border-2 border-[#1A1A1A] p-6 md:p-8 bg-white rounded-3xl space-y-5 shadow-[4px_4px_0px_0px_#1A1A1A]">
        <h3 className="font-display text-3xl font-black text-[#1A1A1A] tracking-tight">Scan Your Shelf 📷</h3>
        <p className="text-xs font-sans text-[#1A1A1A]/75 leading-relaxed max-w-2xl">
          Snap a photo of a bookshelf, stack, or pile of books. We'll identify the titles and let you review them before adding anything.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanning}
          className="px-6 py-3 bg-[#FF6B4A] text-white text-xs font-playful font-extrabold uppercase rounded-2xl border-2 border-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#1A1A1A] hover:bg-[#FF5C35] hover:shadow-[3px_3px_0px_0px_#1A1A1A] transition-all cursor-pointer disabled:opacity-40 flex items-center gap-2"
        >
          <Camera className="w-4 h-4" />
          {isScanning ? "Scanning..." : "Upload a Photo"}
        </button>

        {isScanning && (
          <div className="flex items-center gap-3 pt-1">
            <div className="relative w-6 h-6">
              <div className="absolute inset-0 border-4 border-[#1A1A1A]/10 rounded-full" />
              <div className="absolute inset-0 border-4 border-t-[#FF6B4A] rounded-full animate-spin" />
            </div>
            <span className="text-[10px] font-playful uppercase tracking-wider text-[#1A1A1A]/50 animate-pulse">
              Identifying books in your photo
            </span>
          </div>
        )}

        {scanError && (
          <div className="bg-[#FF6B4A]/10 border-2 border-[#FF6B4A] p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-[#FF6B4A] mt-0.5 flex-shrink-0" />
            <p className="text-xs font-sans leading-relaxed text-[#1A1A1A]/80">{scanError}</p>
          </div>
        )}
      </div>

      {/* Review candidates before committing to the shelf */}
      <AnimatePresence>
        {reviewCandidates && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-2 border-[#1A1A1A] bg-white rounded-3xl shadow-[4px_4px_0px_0px_#1A1A1A] overflow-hidden"
          >
            <div className="p-6 md:p-8 border-b-2 border-[#1A1A1A] bg-[#FFFDF3]/30 flex items-center justify-between">
              <h4 className="font-display text-xl font-black text-[#1A1A1A]">Found {reviewCandidates.length} book{reviewCandidates.length === 1 ? "" : "s"} — review before adding</h4>
              <button onClick={() => setReviewCandidates(null)} className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[28rem] overflow-y-auto divide-y-2 divide-[#1A1A1A]/10">
              {reviewCandidates.map((c, idx) => (
                <div key={idx} className={`p-4 flex items-center gap-3 ${c.include ? "" : "opacity-40"}`}>
                  <button
                    onClick={() => updateCandidate(idx, { include: !c.include })}
                    className={`w-6 h-6 flex-shrink-0 rounded-lg border-2 border-[#1A1A1A] flex items-center justify-center cursor-pointer ${c.include ? "bg-[#4FB06D]" : "bg-white"}`}
                  >
                    {c.include && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>

                  <div className="w-10 h-14 flex-shrink-0 bg-[#FFE8CC] border border-[#1A1A1A]/20 rounded-md overflow-hidden flex items-center justify-center">
                    {c.coverUrl ? (
                      <img src={c.coverUrl} alt={c.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-4 h-4 text-[#1A1A1A]/30" />
                    )}
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      value={c.title}
                      onChange={(e) => updateCandidate(idx, { title: e.target.value })}
                      className="bg-[#FFFDF3] border-2 border-[#1A1A1A]/15 px-3 py-1.5 text-xs font-sans font-bold rounded-lg focus:outline-none focus:border-[#1A1A1A]"
                      placeholder="Title"
                    />
                    <input
                      value={c.author}
                      onChange={(e) => updateCandidate(idx, { author: e.target.value })}
                      className="bg-[#FFFDF3] border-2 border-[#1A1A1A]/15 px-3 py-1.5 text-xs font-sans rounded-lg focus:outline-none focus:border-[#1A1A1A]"
                      placeholder="Author"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 md:p-8 border-t-2 border-[#1A1A1A] flex justify-end gap-3">
              <button
                onClick={() => setReviewCandidates(null)}
                className="px-5 py-2.5 text-[#1A1A1A]/60 text-xs font-playful font-bold uppercase rounded-xl hover:text-[#1A1A1A] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddCandidates}
                disabled={!reviewCandidates.some(c => c.include && c.title.trim())}
                className="px-6 py-2.5 bg-[#FF6B4A] text-white text-xs font-playful font-extrabold uppercase rounded-xl border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A] hover:shadow-[3px_3px_0px_0px_#1A1A1A] transition-all cursor-pointer disabled:opacity-40"
              >
                Add {reviewCandidates.filter(c => c.include && c.title.trim()).length} to Shelf
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The shelf itself */}
      <div className="space-y-6">
        <div>
          <h4 className="text-[10px] font-playful font-bold uppercase tracking-wider text-[#1A1A1A]/50 mb-3">
            To Be Read ({unreadBooks.length})
          </h4>
          {unreadBooks.length === 0 ? (
            <div className="border-2 border-dashed border-[#1A1A1A]/30 p-8 rounded-3xl text-center text-xs font-sans text-[#1A1A1A]/50 italic">
              No unread books yet. Scan a photo above to get started.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {unreadBooks.map(book => (
                <ShelfBookCard key={book.id} book={book} onToggleRead={onToggleRead} onDelete={onDeleteBook} />
              ))}
            </div>
          )}
        </div>

        {readBooks.length > 0 && (
          <div>
            <h4 className="text-[10px] font-playful font-bold uppercase tracking-wider text-[#1A1A1A]/50 mb-3">
              Already Read ({readBooks.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {readBooks.map(book => (
                <ShelfBookCard key={book.id} book={book} onToggleRead={onToggleRead} onDelete={onDeleteBook} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ShelfBookCard({ book, onToggleRead, onDelete }: { book: ShelfBook; onToggleRead: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className="group relative border-2 border-[#1A1A1A] bg-white rounded-2xl shadow-[2px_2px_0px_0px_#1A1A1A] overflow-hidden flex flex-col">
      <div className="aspect-[2/3] bg-[#FFE8CC] flex items-center justify-center overflow-hidden">
        {book.coverUrl ? (
          <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <BookOpen className="w-8 h-8 text-[#1A1A1A]/30" />
        )}
      </div>
      <div className="p-2.5 space-y-0.5">
        <p className="text-[11px] font-sans font-bold text-[#1A1A1A] leading-tight line-clamp-2">{book.title}</p>
        <p className="text-[10px] font-sans text-[#1A1A1A]/60 truncate">{book.author || "Unknown"}</p>
      </div>

      <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onToggleRead(book.id)}
          title={book.isRead ? "Mark as unread" : "Mark as read"}
          className="w-6 h-6 bg-white border-2 border-[#1A1A1A] rounded-lg flex items-center justify-center cursor-pointer hover:bg-[#4FB06D] hover:text-white"
        >
          {book.isRead ? <RotateCw className="w-3 h-3" /> : <Check className="w-3 h-3" />}
        </button>
        <button
          onClick={() => onDelete(book.id)}
          title="Remove from shelf"
          className="w-6 h-6 bg-white border-2 border-[#1A1A1A] rounded-lg flex items-center justify-center cursor-pointer hover:bg-[#FF6B4A] hover:text-white"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
