// ISBN-13 barcodes are standard EAN-13 codes starting with 978 or 979. Filtering on this instead
// of restricting the barcode decoder to a specific format keeps scanning simple and
// format-agnostic - any decoded text that happens to look like an ISBN-13 is accepted.
export function extractIsbn(text: string): string | null {
  const digits = text.replace(/[^0-9]/g, "");
  return /^(978|979)\d{10}$/.test(digits) ? digits : null;
}
