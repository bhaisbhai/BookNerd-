interface EnrichedBookMetadata {
  coverUrl?: string;
  publisher?: string;
  publishDate?: string;
  isbn?: string;
  description?: string;
}

/**
 * Queries Google Books API to enrich book metadata (cover, publisher, publication date, description, ISBN).
 */
export async function enrichWithGoogleBooks(title: string, author: string): Promise<EnrichedBookMetadata | null> {
  try {
    const query = `intitle:${title} inauthor:${author}`;
    let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`;
    if (process.env.GOOGLE_BOOKS_API_KEY) {
      url += `&key=${encodeURIComponent(process.env.GOOGLE_BOOKS_API_KEY)}`;
    }
    const res = await fetch(url, {
      headers: { "User-Agent": "BibliosTracker/1.0.0" }
    });
    
    if (!res.ok) return null;
    const data = await res.json() as any;
    
    if (data.items && data.items.length > 0) {
      const volumeInfo = data.items[0].volumeInfo;
      const isbnObj = volumeInfo.industryIdentifiers?.find((id: any) => id.type === "ISBN_13" || id.type === "ISBN_10");
      
      return {
        coverUrl: volumeInfo.imageLinks?.thumbnail?.replace("http://", "https://") || volumeInfo.imageLinks?.smallThumbnail?.replace("http://", "https://"),
        publisher: volumeInfo.publisher,
        publishDate: volumeInfo.publishedDate,
        isbn: isbnObj?.identifier,
        description: volumeInfo.description
      };
    }
  } catch (error) {
    console.error(`Google Books enrichment failed for "${title}" by ${author}:`, error);
  }
  return null;
}

/**
 * Queries Open Library API as a fallback to enrich book metadata and covers.
 */
export async function enrichWithOpenLibrary(title: string, author: string): Promise<EnrichedBookMetadata | null> {
  try {
    const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "BibliosTracker/1.0.0 (contact: raj.arjan@gmail.com)" }
    });
    
    if (!res.ok) return null;
    const data = await res.json() as any;
    
    if (data.docs && data.docs.length > 0) {
      const doc = data.docs[0];
      const isbn = doc.isbn ? doc.isbn[0] : undefined;
      const coverUrl = isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg` : undefined;
      
      return {
        coverUrl,
        publisher: doc.publisher ? doc.publisher[0] : undefined,
        publishDate: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
        isbn,
      };
    }
  } catch (error) {
    console.error(`Open Library enrichment failed for "${title}" by ${author}:`, error);
  }
  return null;
}

/**
 * Hybrid enrichment that combines Google Books and Open Library metadata.
 */
export async function enrichBook(title: string, author: string): Promise<EnrichedBookMetadata> {
  const gb = await enrichWithGoogleBooks(title, author);
  if (gb && gb.coverUrl) {
    return gb;
  }
  
  const ol = await enrichWithOpenLibrary(title, author);
  return {
    coverUrl: gb?.coverUrl || ol?.coverUrl,
    publisher: gb?.publisher || ol?.publisher,
    publishDate: gb?.publishDate || ol?.publishDate,
    isbn: gb?.isbn || ol?.isbn,
    description: gb?.description || ol?.description
  };
}
