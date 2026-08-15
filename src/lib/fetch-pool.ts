/**
 * Generic bounded-concurrency fetch helper.
 *
 * Used to run a batch of async calls (e.g. several yahoo-finance2 quote()
 * requests, each covering a chunk of symbols) with a cap on how many are ever
 * in flight at once, rather than firing all of them simultaneously. Keeps a
 * lid on outbound request bursts and lets a per-item cursor keep results in
 * the same order as the input array regardless of which worker finishes an
 * item first.
 */

const DEFAULT_CONCURRENCY = 4;

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