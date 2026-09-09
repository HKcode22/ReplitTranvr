import { createHash } from "crypto";
import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { pool } from "../server/db";
import { startBatch } from "../server/lib/disruption/adbCollectionController_v3";
import { resolveOwnerAuthorization } from "./v39_paid_guard_v39";

const PHASE6_SCOPE = "Phase 6 (separate authorization)";
const REQUIRED_SCHEMA_VERSION = "0046";

function currentGitSha(): string {
  try {
    const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (!/^[a-f0-9]{40}$/i.test(sha)) throw new Error("invalid git SHA");
    return sha.toLowerCase();
  } catch (error: any) {
    throw new Error(`REFUSED_CODE_SHA_UNAVAILABLE: ${error?.message ?? error}`);
  }
}

export async function runPhase6StartOwner(argv = process.argv.slice(2)): Promise<number> {
  const commandAuth = resolveOwnerAuthorization(PHASE6_SCOPE, argv);
  const hashIndex = argv.indexOf("--manifest-sha256");
  const expectedHash = hashIndex >= 0 ? argv[hashIndex + 1] : null;
  const manifestPath = process.env.V39_MANIFEST_PATH;
  if (!expectedHash || !/^[a-f0-9]{64}$/i.test(expectedHash) || !manifestPath) {
    throw new Error("REFUSED_MANIFEST: --manifest-sha256 <64hex> and V39_MANIFEST_PATH are required");
  }
  const actualHash = createHash("sha256").update(readFileSync(manifestPath)).digest("hex");
  if (actualHash !== expectedHash.toLowerCase()) {
    throw new Error(`REFUSED_MANIFEST_HASH: presented=${expectedHash} actual=${actualHash}`);
  }

  const auth = await pool.query(
    `SELECT authorization_id,manifest_sha256,calendar_hash,config_hash,code_sha,
            schema_version,enabled,revoked_at_utc
       FROM clean.adb_phase6_authorization
      WHERE singleton_key=true`,
  );
  if (auth.rowCount !== 1) throw new Error("REFUSED_PHASE6_AUTH: persistent singleton authorization is missing");
  const row = auth.rows[0];
  if (row.enabled !== true || row.revoked_at_utc !== null) throw new Error("REFUSED_PHASE6_AUTH: persistent authorization is disabled/revoked");
  if (String(row.authorization_id) !== commandAuth.authId) {
    throw new Error(`REFUSED_PHASE6_AUTH_ID: command AUTH ${commandAuth.authId} != persistent ${row.authorization_id}`);
  }
  if (String(row.manifest_sha256).toLowerCase() !== actualHash) {
    throw new Error("REFUSED_PHASE6_MANIFEST_BINDING: persistent authorization does not bind the presented manifest bytes");
  }
  const gitSha = currentGitSha();
  if (String(row.code_sha).toLowerCase() !== gitSha) throw new Error(`REFUSED_CODE_SHA: authorized=${row.code_sha} running=${gitSha}`);
  if (String(row.schema_version) !== REQUIRED_SCHEMA_VERSION) {
    throw new Error(`REFUSED_SCHEMA_VERSION: authorized=${row.schema_version} required=${REQUIRED_SCHEMA_VERSION}`);
  }

  const schema = await pool.query(
    `SELECT
       to_regclass('clean.adb_phase6_calendar_day') AS calendar,
       to_regclass('clean.adb_airport_sampling_state') AS sampling_state,
       to_regclass('clean.adb_phase6_admission_attempt') AS admission,
       to_regclass('clean.webhook_identity_resolution') AS identity_resolution`,
  );
  const s = schema.rows[0] ?? {};
  if (!s.calendar || !s.sampling_state || !s.admission || !s.identity_resolution) {
    throw new Error("REFUSED_SCHEMA_INCOMPLETE: required Phase-6/identity tables are missing");
  }

  const result = await startBatch();
  console.log(JSON.stringify({
    schema: "v39.phase6-start-evidence.v2",
    status: "PASS",
    authorizationId: commandAuth.authId,
    manifestSha256: actualHash,
    codeSha: gitSha,
    schemaVersion: REQUIRED_SCHEMA_VERSION,
    calendarHash: String(row.calendar_hash),
    configHash: String(row.config_hash),
    batchId: result.batch.batchId,
    created: result.created.length,
    skipped: result.skipped.length,
  }));
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPhase6StartOwner().then((code) => { process.exitCode = code; }).catch((error: any) => {
    console.error(JSON.stringify({ schema: "v39.phase6-start-evidence.v2", status: "FAIL", error: error?.message ?? String(error) }));
    process.exitCode = 1;
  }).finally(async () => {
    await pool.end().catch(() => undefined);
  });
}
