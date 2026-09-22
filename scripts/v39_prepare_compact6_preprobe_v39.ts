import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

const SOURCE_DEFAULT = "artifacts/preprobe-reference-freeze-record.json";
const PLAN_DEFAULT = "SEPmd/V3.9_DataCollectPlan_f.8.md";
const OUT_DEFAULT = "artifacts/preprobe-reference-freeze-record-compact6-v1.json";
const COMPACT_ICAOS = ["WSSS","OMAA","MMUN","LKPR","SKBO","YSSY"] as const;
const MACRO_REGIONS = ["Asia-Pacific","Gulf/Africa","North America","Europe","South America","Oceania"] as const;

function sha256(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? String(process.argv[i + 1]) : fallback;
}

function main(): void {
  const sourcePath = path.resolve(process.cwd(), arg("--source", SOURCE_DEFAULT));
  const planPath = path.resolve(process.cwd(), arg("--plan", PLAN_DEFAULT));
  const outPath = path.resolve(process.cwd(), arg("--out", OUT_DEFAULT));

  const sourceRaw = readFileSync(sourcePath, "utf8");
  const planRaw = readFileSync(planPath, "utf8");
  const source = JSON.parse(sourceRaw);
  if (!Array.isArray(source.shortlist) || source.shortlist.length !== 12) {
    throw new Error("REFUSED_SOURCE_PREPROBE_NOT_LEGACY_12");
  }

  const byIcao = new Map(source.shortlist.map((x: any) => [String(x.icao).toUpperCase(), x]));
  const compact = COMPACT_ICAOS.map((icao) => {
    const row = byIcao.get(icao);
    if (!row) throw new Error(`REFUSED_COMPACT6_SOURCE_MISSING:${icao}`);
    return row;
  });
  const actualRegions = compact.map((x: any) => String(x.region));
  if (actualRegions.some((region, i) => region !== MACRO_REGIONS[i])) {
    throw new Error(`REFUSED_COMPACT6_REGION_ORDER:${actualRegions.join(",")}`);
  }

  const sourceFileSha256 = sha256(sourceRaw);
  const planSha256 = sha256(planRaw);
  const amended: any = {
    ...source,
    schema_version: "v3.9-preprobe-reference-freeze-2",
    status: "READY_FROZEN_PREPROBE_REFERENCE_COMPACT6",
    version: "v39-preprobe-reference-compact6-v1",
    frozen_at_utc: new Date().toISOString(),
    plan_sha256: planSha256,
    shortlist: compact,
    replacements: [],
    probeDesign: {
      variant: "compact6-region-stratified-v1",
      sourcePreprobeFileSha256: sourceFileSha256,
      legacyEvidencePreprobeSha256: sourceFileSha256,
      grandfatheredProbeIds: [2],
      grandfatheredEvidence: [{
        probeId: 2,
        icao: "OMAA",
        reason: "pre-amendment completed exact-MATCH two-hour Stage-1 result under identical time/cap protocol",
      }],
      macroRegions: [...MACRO_REGIONS],
      stage2Mode: "conditional-confirmation-v1",
      amendmentId: "P2G-AMEND-20260921-COMPACT6-RECONCILIATION",
      prospectiveOnly: true,
      historicalP2G06RemainsFailed: true,
    },
    shortlist_selection: {
      ...source.shortlist_selection,
      method: "compact6-one-per-frozen-macro-region-from-preoutcome-shortlist-v1",
      compact_icaos: [...COMPACT_ICAOS],
      region_order: [...MACRO_REGIONS],
    },
    probe_protocol: {
      ...source.probe_protocol,
      stage1CandidateCount: 6,
      deliveryCompletenessFloor: 0.99,
      creditDenominator: "settled_external_provider_spend",
      internalLedgerRole: "received-delivery-diagnostic",
      stage2Mode: "conditional-confirmation-v1",
    },
  };
  delete amended.artifact_sha256;
  const canonicalWithoutArtifactHash = JSON.stringify(amended);
  amended.artifact_sha256 = sha256(canonicalWithoutArtifactHash);

  const output = JSON.stringify(amended, null, 2) + "\n";
  writeFileSync(outPath, output, { flag: "wx" });
  const outFileSha256 = sha256(output);

  console.log(JSON.stringify({
    schema: "v39.compact6-preprobe-freeze.v1",
    status: "CREATED",
    providerCalled: false,
    providerMutation: false,
    sourcePath,
    sourceFileSha256,
    planPath,
    planSha256,
    outPath,
    outFileSha256,
    shortlist: COMPACT_ICAOS,
    grandfatheredProbeIds: [2],
  }, null, 2));
}

main();
