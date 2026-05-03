// Shared, typed helpers used by both the Sentry and PostHog client wrappers.
// Centralizing them keeps DNT detection and route sanitization consistent
// so we never accidentally leak a token-bearing URL through one tool while
// scrubbing it in the other.

type DntSource = {
  doNotTrack?: string | null;
  msDoNotTrack?: string | null;
};

export function isDoNotTrack(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav: DntSource = navigator;
  const win: DntSource = typeof window !== "undefined" ? (window as unknown as DntSource) : {};
  const dnt = nav.doNotTrack ?? win.doNotTrack ?? nav.msDoNotTrack ?? null;
  return dnt === "1" || dnt === "yes";
}

// Strip query strings, hashes, and token/id-like path segments so we never
// send a token-bearing URL (e.g. /book/<optionToken>, /proposal/<token>,
// /reset-password?token=...) to a third-party telemetry service.
export function sanitizePath(path: string): string {
  const noQuery = path.split("?")[0].split("#")[0];
  return noQuery
    .split("/")
    .map((seg) => {
      if (!seg) return seg;
      if (/^[0-9a-fA-F]{8}-[0-9a-fA-F-]{20,}$/.test(seg)) return ":id";
      if (/^\d+$/.test(seg)) return ":id";
      if (seg.length >= 24 && /^[A-Za-z0-9_-]+$/.test(seg)) return ":token";
      return seg;
    })
    .join("/");
}
