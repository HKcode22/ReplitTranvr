// Serial queue for AeroDataBox calls. RapidAPI plans on AeroDataBox throw
// HTTP 429 when several requests land at once (which happens when the
// dashboard rescores N flights in parallel, or the monitor cycle iterates).
// Every callsite that hits aerodatabox.p.rapidapi.com goes through here so
// the minimum spacing applies across the whole process, not per route.

const MIN_INTERVAL_MS = 500;

let lastStartedAt = 0;
let chain: Promise<void> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function aerodataboxFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const slot = chain.then(async () => {
    const wait = Math.max(0, lastStartedAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await sleep(wait);
    lastStartedAt = Date.now();
  });
  chain = slot.catch(() => {});
  return slot.then(() => fetch(input, init));
}
