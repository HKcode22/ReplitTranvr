import "dotenv/config";
import { readFileSync } from "fs";
import { pathToFileURL } from "url";
import { getBalanceStrict, listSubscriptionsStrict, type WebhookSubscription } from "../server/lib/disruption/aerodataboxLimiter_v3";
import { evaluateGate0Accounting, GATE0_PHASE_GATE, serializeGate0Artifact, type Gate0AccountEvidence } from "../server/lib/disruption/gate0Accounting_v39";
import { parseArgs, verifyAuthFile } from "./v39_paid_guard_v39";

export interface Gate0Readers {
  getBalance(): Promise<{ creditsRemaining: number } | null>;
  listSubscriptionsStrict(): Promise<WebhookSubscription[]>;
}

type AuthVerifier = (authFile: string, phaseGate: string, auth: string) => boolean;

function accountEvidencePath(argv: string[]): string | null {
  const index = argv.indexOf("--account-evidence-file");
  return index >= 0 && index + 1 < argv.length ? argv[index + 1] : null;
}

export async function runGate0Gather(
  argv: string[],
  readers: Gate0Readers = { getBalance: getBalanceStrict, listSubscriptionsStrict },
  authorize: AuthVerifier = (file, phaseGate, auth) => {
    const checked = verifyAuthFile(file, phaseGate);
    return !("error" in checked) && checked.verdict.verified && checked.record.authorizationId === auth;
  },
): Promise<ReturnType<typeof evaluateGate0Accounting>> {
  const { auth, authFile, evidenceId } = parseArgs(argv);
  const evidenceFile = accountEvidencePath(argv);
  if (!auth || !/^AUTH-\d{8}-[A-Z0-9]+$/.test(auth)) throw new Error("REFUSED: valid --auth is required");
  if (!authFile) throw new Error("REFUSED: --auth-file is required");
  if (!evidenceId || !/^GATE-0-\d{8}-[A-Z0-9]+$/.test(evidenceId)) throw new Error("REFUSED: valid --evidence-id is required");
  if (!evidenceFile) throw new Error("REFUSED: --account-evidence-file is required");

  // Authorization is established before parsing evidence or touching the provider.
  if (!authorize(authFile, GATE0_PHASE_GATE, auth)) throw new Error("REFUSED: AUTH verification failed");

  let account: Gate0AccountEvidence;
  try { account = JSON.parse(readFileSync(evidenceFile, "utf8")); }
  catch { throw new Error("REFUSED: account evidence must be readable JSON"); }
  if (account.subscription_channel !== "rapidapi") {
    return evaluateGate0Accounting(account, { evidenceId, authorizationId: auth }, ["BLOCKED:current_provider_reader_is_rapidapi_only"]);
  }

  const balance = await readers.getBalance();
  if (!balance || !Number.isInteger(balance.creditsRemaining) || balance.creditsRemaining < 0) throw new Error("BLOCKED: authoritative getBalance is unavailable or uncertain");
  const subscriptions = await readers.listSubscriptionsStrict();
  const merged: Gate0AccountEvidence = {
    ...account,
    opening_nonexpiring_alert_balance: balance.creditsRemaining,
    active_subscription_inventory: subscriptions.map((subscription) => ({
      id: subscription.id,
      active: subscription.isActive,
      billing_type: subscription.billingType,
      subject_type: subscription.subject?.type ?? null,
      subject_id: subscription.subject?.id ?? null,
    })).sort((a, b) => a.id.localeCompare(b.id)),
  };
  return evaluateGate0Accounting(merged, { evidenceId, authorizationId: auth });
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  try {
    const artifact = await runGate0Gather(argv);
    process.stdout.write(serializeGate0Artifact(artifact));
    return artifact.status === "PASS" ? 0 : 2;
  } catch (error: any) {
    const message = String(error?.message ?? error);
    console.error(message.startsWith("REFUSED:") ? message : "BLOCKED: Gate-0 account evidence could not be established");
    return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main().then((code) => { process.exitCode = code; });
