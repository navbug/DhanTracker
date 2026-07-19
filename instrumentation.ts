/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts (not on every request).
 * Used to kick off the Nifty 500 cache warming before any user request arrives.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run in the Node.js runtime (not Edge), and only on the server
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCacheWarmer } = await import("@/lib/cache-warmer");
    startCacheWarmer();
  }
}
