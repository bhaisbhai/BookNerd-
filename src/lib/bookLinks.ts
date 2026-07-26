export interface BookLink {
  label: string;
  url: string;
}

// Deep-link search URLs, not API-backed lookups - each just lands the user on a search results
// page for the given book, since precise per-retailer/per-library availability isn't worth the
// integration cost (confirmed with the user: a generic library search link is enough).
export function getBookLinks(title: string, author: string): BookLink[] {
  const query = author ? `${title} ${author}` : title;
  const encoded = encodeURIComponent(query);

  return [
    { label: "Amazon", url: `https://www.amazon.com/s?k=${encoded}` },
    { label: "Bookshop.org", url: `https://bookshop.org/search?keywords=${encoded}` },
    { label: "Audible", url: `https://www.audible.com/search?keywords=${encoded}` },
    { label: "Apple Books", url: `https://books.apple.com/search?term=${encoded}` },
    { label: "Find at a library", url: `https://search.worldcat.org/search?q=${encoded}` },
  ];
}
