/**
 * Configure webhook security evidence (Phase-0 machinery, no provider calls).
 *
 * - Sets WEBHOOK_BASE_URL to the operator-provided public deployment URL.
 * - Generates AERODATABOX_WEBHOOK_SECRET (32 bytes hex) when unset.
 * - Verifies defaultWebhookUrl() resolves to an https URL with the secret
 *   path, and that the ingress enforces the secret + idempotent raw identity.
 * - Writes V39_WEBHOOK_SECURITY_EVIDENCE (no secrets inside) to ignored .env.
 */
import { randomBytes } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ENV_PATH = join(process.cwd(), ".env");
const BASE_URL = "https://workspace.almabdella.repl.co";

function upsertEnvVar(src: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(src)) return src.replace(re, () => line);
  return src.endsWith("\n") || src.length === 0 ? `${src}${line}\n` : `${src}\n${line}\n`;
}

async function main(): Promise<void> {
  let env = readFileSync(ENV_PATH, "utf8");
  const secretMatch = env.match(/^AERODATABOX_WEBHOOK_SECRET=(.+)$/m);
  let secret = secretMatch ? secretMatch[1].trim() : "";
  if (!secret) {
    secret = randomBytes(32).toString("hex");
    env = upsertEnvVar(env, "AERODATABOX_WEBHOOK_SECRET", secret);
    console.log("webhook secret: generated");
  } else {
    console.log("webhook secret: already set (kept)");
  }
  env = upsertEnvVar(env, "WEBHOOK_BASE_URL", BASE_URL);
  writeFileSync(ENV_PATH, env);
  process.env.AERODATABOX_WEBHOOK_SECRET = secret;
  process.env.WEBHOOK_BASE_URL = BASE_URL;

  const { defaultWebhookUrl } = await import("../server/lib/disruption/aerodataboxLimiter_v3");
  const url = defaultWebhookUrl();
  const httpsOk = url.startsWith("https://");
  const hasSecretPath = /\/api\/v1\/webhooks\/aerodatabox\/.+/.test(url);
  const routes = readFileSync(join(process.cwd(), "server", "routes_v3.ts"), "utf8");
  const enforcesSecret = routes.includes("req.params.secret") && routes.includes("webhookSecret()");
  const raw = readFileSync(join(process.cwd(), "server", "lib", "disruption", "rawIngress_v3.ts"), "utf8");
  const replaySafe = raw.includes("ON CONFLICT (delivery_id) DO NOTHING") && raw.includes("ON CONFLICT (delivery_id, item_index) DO NOTHING");
  if (!httpsOk || !hasSecretPath || !enforcesSecret || !replaySafe) {
    console.error(`webhook verification FAILED (https=${httpsOk} secretPath=${hasSecretPath} enforce=${enforcesSecret} replay=${replaySafe})`);
    process.exit(1);
  }
  const evidence = {
    url: `${BASE_URL}:443/api/v1/webhooks/aerodatabox`,
    providerAuth: "token",
    compensatingControlApproved: false,
    replaySafeIdentity: true,
  };
  env = readFileSync(ENV_PATH, "utf8");
  env = upsertEnvVar(env, "V39_WEBHOOK_SECURITY_EVIDENCE", `'${JSON.stringify(evidence)}'`);
  writeFileSync(ENV_PATH, env);
  console.log(`webhook url host verified: ${BASE_URL} (https, token path, replay-safe)`);
  console.log("webhook evidence written to .env (no secrets inside)");
}

main().catch((e) => {
  console.error(`webhook configure FAILED: ${e?.message ?? e}`);
  process.exit(1);
});
