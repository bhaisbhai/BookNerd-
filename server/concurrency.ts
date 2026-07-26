// Runs fn over items with at most `limit` calls in flight at once. Unbounded Promise.all over a
// large batch (e.g. enriching 90 pasted books, each firing off to Google Books/Open Library) can
// overwhelm outbound connections and blow past a serverless function's execution time limit -
// this bounds concurrency so batches of any size complete in predictable, bounded time.
export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await fn(items[current], current);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}
