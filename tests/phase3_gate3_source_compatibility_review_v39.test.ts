import {describe, expect, it, vi} from "vitest";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {reviewGate3SourceCompatibilityV39, type Gate3SourceSnapshotV39}
  from "../server/lib/disruption/gate3SourceCompatibilityReview_v39";
import {runGate3SourceReviewReadonlyV39}
  from "../scripts/v39_gate3_source_compatibility_readonly_v39";

const sourceFile=(path:string)=>readFileSync(join(process.cwd(),path),"utf8");
const current=():Gate3SourceSnapshotV39=>({
  callbackOnly:sourceFile("server/phase2gCallbackOnly.ts"),
  registeredRoutes:sourceFile("server/routes_v3.ts"),
  prepaidRuntime:sourceFile("server/lib/disruption/prepaidProbeRuntime_v39.ts"),
  legacyCanary:sourceFile("scripts/credit_canary.ts"),
  legacyWrapper:sourceFile("scripts/v39_gate3_canary_v39.ts"),
  legacyReadiness:sourceFile("server/lib/disruption/gate3CanaryReceiverReadiness_v39.ts"),
  baselineSessionSchema:sourceFile("migrations/baseline/B0062__v39_schema_baseline_20261001.sql"),
  additiveCanarySchema:sourceFile("migrations/current/V0065__phase3_gate3_prepaid_canary_owner_v39.sql"),
});
describe("Phase3 zero-provider compatibility inventory",()=>{
  it("must see real source incompatibilities instead of treating YSSY approval as paid Gate3",()=>{
    const result=reviewGate3SourceCompatibilityV39(current());
    expect(result.status).toBe("BLOCKED_SOURCE_CONTRACT");
    expect(result.blockers).toContain("LEGACY_CANARY_STILL_USES_NONPREPAID_LEDGER");
    // Retired canonical Gate3 CLI no longer delegates after AUTH.
    expect(result.blockers).not.toContain("GATE3_WRAPPER_STILL_DELEGATES_LEGACY_CANARY");
    expect(result.blockers).not.toContain("GATE3_WRAPPER_DIRECT_NO_GO_NOT_VERIFIED");
    // The dedicated owner-kind and draft prearmed runner are now present.
    // Original legacy wrapper remains deliberately NO-GO for real provider.
    expect(result.blockers).not.toContain(
      "DEDICATED_GATE3_SESSION_OWNER_KIND_NOT_IMPLEMENTED");
    expect(result.blockers).not.toContain("UNSAFE_LEGACY_CANARY_OWNER_GUARD_NOT_VERIFIED");
    expect(result.authorizedPaidCanary).toBe(false);
    expect(result.livePublishedVerified).toBe(false);
    expect(result.providerCalls).toBe(0);
    expect(result.databaseMutations).toBe(0);
  });
  it("rejects restoring old paid-script delegation behind AUTH",()=>{
    const s=current();
    const v=reviewGate3SourceCompatibilityV39({
      ...s,legacyWrapper:s.legacyWrapper+
        ' spawnSync("npx", ["tsx", "scripts/credit_canary.ts", ...extra]);',
    });
    expect(v.blockers).toContain("GATE3_WRAPPER_STILL_DELEGATES_LEGACY_CANARY");
    expect(v.authorizedPaidCanary).toBe(false);
  });
  it("fails closed when reviewed forward-only Gate3 owner SQL is removed",()=>{
    const snapshot=current();
    const verdict=reviewGate3SourceCompatibilityV39({
      ...snapshot,additiveCanarySchema:"",
    });
    expect(verdict.blockers).toContain(
      "ADDITIVE_GATE3_SQL_OWNER_AND_DURABLE_RECEIPT_MISSING");
    expect(verdict.authorizedPaidCanary).toBe(false);
  });
  it("hard detects removal or relocation of legacy paid guard",()=>{
    const snapshot=current();
    const bad=reviewGate3SourceCompatibilityV39({
      ...snapshot,legacyCanary:snapshot.legacyCanary.replace(
        "refuseLegacyGate3CanaryReceiverV39();","// accidentally removed guard"),
    });
    expect(bad.blockers).toContain("UNSAFE_LEGACY_CANARY_OWNER_GUARD_NOT_VERIFIED");
    expect(bad.authorizedPaidCanary).toBe(false);
  });
  it("rejects missing or malformed source evidence without runtime crashes",()=>{
    for(const bad of [null,{},[],{...current(),prepaidRuntime:undefined}]) {
      const result=reviewGate3SourceCompatibilityV39(bad as Gate3SourceSnapshotV39);
      expect(result).toMatchObject({
        status:"BLOCKED_SOURCE_CONTRACT",authorizedPaidCanary:false,
      });
      expect(result.blockers).toContain("SOURCE_SNAPSHOT_INVALID");
    }
  });
  it("CLI requires exact read-only and explicitly refuses historical legacy source",()=>{
    expect(()=>runGate3SourceReviewReadonlyV39([])).toThrow(
      "GATE3_SOURCE_REVIEW_EXACT_READ_ONLY_FLAG_REQUIRED");
    const log=vi.spyOn(console,"log").mockImplementation(()=>{});
    try {
      expect(runGate3SourceReviewReadonlyV39(["--read-only"])).toBe(2);
      const output=JSON.parse(String(log.mock.calls.at(-1)?.[0]));
      expect(output.status).toBe("BLOCKED_SOURCE_CONTRACT");
      expect(output.paidCanaryAllowed).toBe(false);
      expect(output.publishedRouteHTTPTested).toBe(false);
      expect(output.inspection).toBe("LOCAL_GIT_SOURCE_ONLY");
    } finally { log.mockRestore(); }
  });
});
