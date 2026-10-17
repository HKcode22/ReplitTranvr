/**
 * Gate3 real-path regression: the one-run WSSS AUTH is not in the immutable
 * historical Wave B ledger. Every relevant real owner/sidecar/finalizer
 * must load the separate SHA approval addendum before any paid CREATE.
 * Source-only check: no provider, SQL, webhook, or GitHub network I/O.
 */
import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {approvedArtifactHashesFromLedger,sha256HexString} from
  "../server/lib/disruption/authRecord_v39";

const ADDENDUM="2026-10-16_GATE3_WSSS_AUTH_SHA_APPROVAL_ADDENDUM.md";
const HISTORICAL="data-collection/evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md";
const APPROVAL="data-collection/phase3/"+ADDENDUM;
const AUTH="data-collection/authorizations/V3.9_PHASE3_GATE3_AUTH_20261018_WSSS01.json";
const readers=[
  "server/lib/disruption/gate3OwnedPreExposure_v39.ts",
  "server/lib/disruption/gate3LedgerBoundSessionPreparation_v39.ts",
  "server/lib/disruption/prepaidProbeWindow_v39.ts",
  "server/lib/disruption/gate3LiveSettledFinalizer_v39.ts",
  "scripts/v39_gate3_independent_watchdog_v39.ts",
  "scripts/v39_gate3_owner_readonly_v39.ts",
] as const;

describe("Gate3 real-stage AUTH reads old ledger AND one-time independent SHA approval",()=>{
  it("new AUTH is absent from unchanged historical ledger but approved by addendum",()=>{
    const old=readFileSync(HISTORICAL,"utf8");
    const addendum=readFileSync(APPROVAL,"utf8");
    const sha=sha256HexString(readFileSync(AUTH,"utf8"));
    expect(sha).toBe("7ef03886961fa8a84677062862c675a00a1a6b646eb1407269be4e3831cb2746");
    expect(approvedArtifactHashesFromLedger(old)).not.toContain(sha);
    expect(approvedArtifactHashesFromLedger(old+"\n"+addendum)).toContain(sha);
  });
  it("every read path supporting LIVE Gate3 loads the separate reviewed approval",()=>{
    for(const path of readers){
      const source=readFileSync(path,"utf8");
      expect(source,path).toContain("V3.9_RUN_REPORTS_AND_EVIDENCE.md");
      expect(source,path).toContain(ADDENDUM);
    }
  });
  it("explicit preexposure review consumes the combined ledger before provider/SQL stage",()=>{
    const source=readFileSync(readers[0],"utf8");
    const addendumRead=source.indexOf(ADDENDUM);
    const preflight=source.indexOf("reviewGate3LedgerBoundPreparationV39(input,ledger);");
    const host=source.indexOf("await verifyGate3PublishedPrepaidHostV39(",preflight);
    const provider=source.indexOf("await reviewGate3CurrentProviderAccountV39(",preflight);
    const reserve=source.indexOf("await prepareGate3LedgerBoundSessionV39(",preflight);
    expect(addendumRead).toBeGreaterThan(0);
    expect(preflight).toBeGreaterThan(addendumRead);
    expect(host).toBeGreaterThan(preflight);
    expect(provider).toBeGreaterThan(host);
    expect(reserve).toBeGreaterThan(provider);
  });
});
