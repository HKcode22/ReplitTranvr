/**
 * Configure webhook security evidence (no provider calls).
 *
 * Host precedence:
 *   V39_PUBLIC_WEBHOOK_BASE_URL -> existing WEBHOOK_BASE_URL -> REPLIT_DOMAINS.
 * Historical hard-coded deployment hosts are forbidden.
 *
 * Generates AERODATABOX_WEBHOOK_SECRET when absent, verifies the production
 * secret-path route and replay-safe raw identity, then writes no-secret
 * V39_WEBHOOK_SECURITY_EVIDENCE to the ignored .env.
 */
import { randomBytes } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ENV_PATH = join(process.cwd(), ".env");

function upsertEnvVar(src: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(src)) return src.replace(re, () => line);
  return src.endsWith("\n") || src.length === 0 ? `${src}${line}\n` : `${src}\n${line}\n`;
}
function envValue(src: string, key: string): string {
  const match = src.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, "") : "";
}
function resolveBaseUrl(envText: string): string {
  const explicit = String(process.env.V39_PUBLIC_WEBHOOK_BASE_URL ?? "").trim() || envValue(envText, "V39_PUBLIC_WEBHOOK_BASE_URL");
  const existing = String(process.env.WEBHOOK_BASE_URL ?? "").trim() || envValue(envText, "WEBHOOK_BASE_URL");
  const domain = String(process.env.REPLIT_DOMAINS ?? "").split(",")[0]?.trim();
  const raw = explicit || existing || (domain ? `https://${domain}` : "");
  if (!raw) throw new Error("V39_PUBLIC_WEBHOOK_BASE_URL or WEBHOOK_BASE_URL/REPLIT_DOMAINS is required");
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("public webhook base URL must use https");
  if (url.username || url.password || url.search || url.hash) throw new Error("public webhook base URL must not contain credentials/query/fragment");
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString().replace(/\/$/, "");
}

function hasReplaySafeRawIdentity(rawSource: string): boolean {
  // SQL formatting/whitespace is not semantically meaningful. The previous
  // checker required an exact space after the comma and incorrectly rejected
  // the real `ON CONFLICT (delivery_id,item_index) DO NOTHING` implementation.
  const envelope = /ON\s+CONFLICT\s*\(\s*delivery_id\s*\)\s+DO\s+NOTHING/i.test(rawSource);
  const item = /ON\s+CONFLICT\s*\(\s*delivery_id\s*,\s*item_index\s*\)\s+DO\s+NOTHING/i.test(rawSource);
  return envelope && item;
}

async function main(): Promise<void> {
  let env = "";
  try { env = readFileSync(ENV_PATH, "utf8"); } catch { env = ""; }
  const baseUrl = resolveBaseUrl(env);
  let secret = String(process.env.AERODATABOX_WEBHOOK_SECRET ?? "").trim() || envValue(env, "AERODATABOX_WEBHOOK_SECRET");
  if (!secret) {
    secret = randomBytes(32).toString("hex");
    env = upsertEnvVar(env, "AERODATABOX_WEBHOOK_SECRET", secret);
    console.log("webhook secret: generated");
  } else {
    console.log("webhook secret: already set (kept)");
  }
  if (secret.length < 32) throw new Error("AERODATABOX_WEBHOOK_SECRET must be at least 32 characters");
  env = upsertEnvVar(env, "WEBHOOK_BASE_URL", baseUrl);
  writeFileSync(ENV_PATH, env, { mode: 0o600 });
  process.env.AERODATABOX_WEBHOOK_SECRET = secret;
  process.env.WEBHOOK_BASE_URL = baseUrl;

  const { defaultWebhookUrl } = await import("../server/lib/disruption/aerodataboxLimiter_v3");
  const runtimeUrl = defaultWebhookUrl();
  const httpsOk = runtimeUrl.startsWith("https://");
  const hasSecretPath = /\/api\/v1\/webhooks\/aerodatabox\/.+/.test(runtimeUrl);
  const routes = readFileSync(join(process.cwd(), "server", "routes_v3.ts"), "utf8");
  const enforcesSecret = routes.includes("req.params.secret") && routes.includes("webhookSecret()");
  const prepaidRoute = routes.includes('/api/v1/webhooks/aerodatabox/:secret/prepaid/:sessionId');
  const raw = readFileSync(join(process.cwd(), "server", "lib", "disruption", "rawIngress_v3.ts"), "utf8");
  const replaySafe = hasReplaySafeRawIdentity(raw);
  if (!httpsOk || !hasSecretPath || !enforcesSecret || !prepaidRoute || !replaySafe) {
    throw new Error(`webhook verification failed https=${httpsOk} secretPath=${hasSecretPath} enforce=${enforcesSecret} prepaid=${prepaidRoute} replay=${replaySafe}`);
  }

  const evidence = {
    url: `${new URL(baseUrl).origin}/api/v1/webhooks/aerodatabox`,
    providerAuth: "token" as const,
    compensatingControlApproved: false,
    replaySafeIdentity: true,
  };
  env = readFileSync(ENV_PATH, "utf8");
  env = upsertEnvVar(env, "V39_WEBHOOK_SECURITY_EVIDENCE", `'${JSON.stringify(evidence)}'`);
  writeFileSync(ENV_PATH, env, { mode: 0o600 });
  console.log(`webhook host verified: ${new URL(baseUrl).host} (https, secret path, prepaid route, replay-safe)`);
  console.log("webhook evidence written to ignored .env (contains no secret)");
}

main().catch((e) => {
  console.error(`webhook configure FAILED: ${e?.message ?? e}`);
  process.exit(1);
});
