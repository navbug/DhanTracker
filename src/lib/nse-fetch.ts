/**
 * Bounded-concurrency fetch helper for stock-nse-india.
 *
 * WHY THIS EXISTS:
 * A single `NseIndia` instance shares one cookie jar / session across every call.
 * If a concurrent call gets a 401/403, the library calls invalidateNseSession(),
 * which wipes the shared jar and swaps in a brand-new (empty) one — out from under
 * any other in-flight or queued calls on that same instance. The library itself
 * only allows 5 truly concurrent connections internally (queuing the rest), so
 * firing dozens of requests at once means most of them are queued behind the
 * first few — and if NSE blocks any of those first few, the session wipe cascades
 * into failures for everything queued behind it.
 *
 * Keeping our own concurrency at or below the library's internal cap means far
 * fewer requests are ever competing for the shared session at once, so a single
 * blocked request can't take the rest of a large batch down with it.
 */

const DEFAULT_CONCURRENCY = 4; // stays under stock-nse-india's own 5-connection cap

export async function fetchPooled<TIn, TOut>(
  items: TIn[],
  fetcher: (item: TIn) => Promise<TOut>,
  options: {
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<PromiseSettledResult<TOut>[]> {
  const { concurrency = DEFAULT_CONCURRENCY, onProgress } = options;
  const results: PromiseSettledResult<TOut>[] = new Array(items.length);
  let cursor = 0;
  let completed = 0;

  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        const value = await fetcher(items[i]);
        results[i] = { status: "fulfilled", value };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
      completed++;
      onProgress?.(completed, items.length);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}