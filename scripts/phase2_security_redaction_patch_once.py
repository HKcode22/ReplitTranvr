from pathlib import Path

hist = Path('server/lib/disruption/historicalOtp.ts')
text = hist.read_text()
old = '''    const rawText = await resp.text().catch(() => "");
    console.log(
      `[historicalOtp] ${normalized} raw response (first 500 chars): ${rawText.slice(0, 500)}`,
    );
'''
new = '''    const rawText = await resp.text().catch(() => "");
    console.log(
      `[historicalOtp] ${normalized} response received bytes=${Buffer.byteLength(rawText, "utf8")}`,
    );
'''
if old not in text:
    raise SystemExit('historicalOtp raw-response logging block not found')
hist.write_text(text.replace(old, new, 1))

anchor = Path('scripts/anchor_probe.ts')
text = anchor.read_text()
old = '''/** --check-webhook — prints the URL AeroDataBox posts to and probes reachability. */
async function runCheckWebhook(): Promise<void> {
  const url = defaultWebhookUrl();
  console.log("Webhook reachability check (Gate 3/0.5 pre-requisite):\\n");
  console.log(`  defaultWebhookUrl() : ${url}`);
'''
new = '''/** --check-webhook — probes reachability without printing the secret-bearing URL. */
async function runCheckWebhook(): Promise<void> {
  const url = defaultWebhookUrl();
  const parsedWebhook = new URL(url);
  const redactedWebhook = `${parsedWebhook.origin}/api/v1/webhooks/aerodatabox/[REDACTED]`;
  console.log("Webhook reachability check (Gate 3/0.5 pre-requisite):\\n");
  console.log(`  webhook target      : ${redactedWebhook}`);
'''
if old not in text:
    raise SystemExit('anchor_probe webhook logging block not found')
anchor.write_text(text.replace(old, new, 1))

limiter = Path('server/lib/disruption/aerodataboxLimiter_v3.ts')
text = limiter.read_text()
old = '''    if (!resp.ok) {
      console.warn(`[adb-v3] createSubscription ${subjectType}/${subjectId} ${resp.status}: ${text.slice(0, 300)}`);
      return null;
    }
'''
new = '''    if (!resp.ok) {
      // Never print provider response bodies for subscription creation: an
      // error response may echo the secret-bearing webhook target URL.
      console.warn(`[adb-v3] createSubscription ${subjectType}/${subjectId} HTTP ${resp.status} (body redacted)`);
      return null;
    }
'''
if old not in text:
    raise SystemExit('createSubscription body logging block not found')
limiter.write_text(text.replace(old, new, 1))
