import { appendFileSync, readFileSync } from "fs";
import { join } from "path";
import { sha256HexString, type AuthRecord } from "../server/lib/disruption/authRecord_v39";

const GATE1_PHASE = "Phase 2 / Gate 1";

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
}

function die(message: string): never {
  console.error(`REFUSED:${message}`);
  process.exit(2);
}

const authFile = arg("--auth-file");
if (!authFile) die("--auth-file is required");

let raw = "";
try { raw = readFileSync(authFile, "utf8"); }
catch (e: any) { die(`cannot read AUTH file: ${e?.message ?? e}`); }

let record: AuthRecord;
try { record = JSON.parse(raw) as AuthRecord; }
catch { die("AUTH file is not valid JSON"); }

if (!/^AUTH-\d{8}-[A-Z0-9]+$/.test(String(record.authorizationId ?? ""))) die("authorizationId malformed");
if (record.phaseGate !== GATE1_PHASE) die(`only '${GATE1_PHASE}' may be approved by this helper`);
if (record.maxAlertCredits !== null) die("Gate1 helper requires maxAlertCredits=null");
if (record.maxRestUnitsByCategory !== null) die("Gate1 helper requires maxRestUnitsByCategory=null");
if (record.cleanupOwner !== null) die("Gate1 helper requires cleanupOwner=null because no mutation is authorized");

const scope = String(record.airportFilterWindow ?? "").toLowerCase();
for (const required of ["documented-free", "no fids", "no refill", "no subscription mutation", "no smoke", "no probe"]) {
  if (!scope.includes(required)) die(`Gate1 scope missing required restriction '${required}'`);
}

if (record.startNotBeforeUtc) {
  const start = new Date(record.startNotBeforeUtc);
  if (!Number.isFinite(start.getTime())) die("startNotBeforeUtc invalid");
  if (Date.now() < start.getTime()) die(`AUTH not yet valid until ${record.startNotBeforeUtc}`);
}
if (record.expiresAtUtc) {
  const exp = new Date(record.expiresAtUtc);
  if (!Number.isFinite(exp.getTime())) die("expiresAtUtc invalid");
  if (Date.now() > exp.getTime()) die(`AUTH expired at ${record.expiresAtUtc}`);
}

const hash = sha256HexString(raw);
const token = `AUTH_ARTIFACT_SHA256:${hash}`;
const ledgerPath = join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md");
let ledger = "";
try { ledger = readFileSync(ledgerPath, "utf8"); }
catch (e: any) { die(`cannot read evidence ledger: ${e?.message ?? e}`); }

if (!ledger.includes(token)) {
  appendFileSync(
    ledgerPath,
    `\n### Exact read-only Gate1 AUTH approval — ${record.authorizationId}\n\`${token}\`\n`,
    "utf8",
  );
  console.log(`APPROVED_GATE1_ONLY:${record.authorizationId}`);
} else {
  console.log(`ALREADY_APPROVED:${record.authorizationId}`);
}
console.log(`phase_gate=${record.phaseGate}`);
console.log(`artifact_sha256=${hash}`);
console.log("paid_or_mutating_authorization=false");
console.log("ledger=SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md");
