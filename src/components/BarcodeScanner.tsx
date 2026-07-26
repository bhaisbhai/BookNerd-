import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { X, AlertCircle } from "lucide-react";
import { extractIsbn } from "../lib/isbn.js";

interface BarcodeScannerProps {
  onDetected: (isbn: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let cancelled = false;

    reader.decodeFromVideoDevice(null, videoRef.current!, (result, err) => {
      if (cancelled) return;
      if (result) {
        const isbn = extractIsbn(result.getText());
        if (isbn) {
          cancelled = true;
          reader.reset();
          onDetected(isbn);
        }
        return;
      }
      // NotFoundException fires on essentially every frame with no barcode in view - expected,
      // not an error worth surfacing. Anything else (most commonly a permission/device problem)
      // is worth telling the user about.
      if (err && !(err instanceof NotFoundException)) {
        setError("Couldn't access the camera. Check camera permissions and try again.");
      }
    }).catch(() => {
      setError("Couldn't access the camera. Check camera permissions and try again.");
    });

    return () => {
      cancelled = true;
      reader.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-lg max-w-sm w-full overflow-hidden">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <p className="text-sm font-medium text-ink">Scan a barcode</p>
          <button onClick={onClose} aria-label="Close barcode scanner" className="text-ink-muted hover:text-ink cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative aspect-square bg-black">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          {!error && (
            <div className="absolute inset-6 border-2 border-white/70 rounded-xl pointer-events-none" />
          )}
        </div>

        <div className="p-4">
          {error ? (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
              <p className="text-xs text-ink-muted">{error}</p>
            </div>
          ) : (
            <p className="text-xs text-ink-muted text-center">Point the camera at the barcode on the back of the book.</p>
          )}
        </div>
      </div>
    </div>
  );
}
