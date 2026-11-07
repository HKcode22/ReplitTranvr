/**
 * Phase 5 / Phase 6 — fail closed BEFORE any experimental subscription CREATE.
 *
 * The webhook receiver in routes_v3.ts requires a secret path segment and
 * refuses callbacks without a configured AERODATABOX_WEBHOOK_SECRET. The
 * generic defaultWebhookUrl() permits a secretless fallback; Phase 6 must NOT
 * use that fallback to create paid-sending subscriptions.
 *
 * Pure, no network, no database, no provider call, no secret logging.
 */
export const P5_P6_WEBHOOK_GUARD_V39 =
  "v39.phase5.phase6-webhook-destination-guard.v1" as const;

const fail = (): never => {
  throw new Error("REFUSED_PHASE6_WEBHOOK_CALLBACK_UNVERIFIED");
};

export function requireP5P6WebhookDestinationV39(
  env: Record<string, string | undefined>
): string {
  const secret = env.AERODATABOX_WEBHOOK_SECRET;
  if (typeof secret !== "string") {
    throw new Error("REFUSED_PHASE6_WEBHOOK_CALLBACK_UNVERIFIED");
  }
  if (secret.length < 16 || secret.length > 512 ||
      secret.trim() !== secret || /[\u0000-\u001f\u007f]/.test(secret))
    fail();

  const configured = env.WEBHOOK_BASE_URL?.trim();
  const firstDomain = env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  // Unlike generic defaultWebhookUrl(), no implicit travnr.com fallback.
  const base = configured || (firstDomain ? `https://${firstDomain}` : "");
  if (!base) fail();

  let u: URL;
  try { u = new URL(base); }
  catch { return fail(); }
  if (u.protocol !== "https:" || !u.hostname ||
      u.username || u.password || u.search || u.hash ||
      (u.port !== "" && u.port !== "443") ||
      (u.pathname !== "/" && u.pathname !== ""))
    fail();

  const url = new URL(
    `/api/v1/webhooks/aerodatabox/${encodeURIComponent(secret)}`,
    u
  );
  if (!url.pathname.startsWith("/api/v1/webhooks/aerodatabox/"))
    fail();
  // Don't log / persist this URL: the path embeds a private auth secret.
  return url.toString();
}
