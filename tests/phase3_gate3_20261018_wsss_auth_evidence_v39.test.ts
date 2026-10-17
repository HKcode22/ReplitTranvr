/** Exact owner-approved WSSS Gate3 AUTH/ledger integration; NO provider or SQL I/O. */
import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {
  sha256HexString,approvedArtifactHashesFromLedger,type AuthRecord,
} from "../server/lib/disruption/authRecord_v39";
import {reviewGate3LedgerBoundPreparationV39} from
  "../server/lib/disruption/gate3LedgerBoundSessionPreparation_v39";

const authFile="data-collection/authorizations/V3.9_PHASE3_GATE3_AUTH_20261018_WSSS01.json";
const ledgerFile="data-collection/evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md";
const approvalAddendum="data-collection/phase3/2026-10-16_GATE3_WSSS_AUTH_SHA_APPROVAL_ADDENDUM.md";
const frozenSha="7ef03886961fa8a84677062862c675a00a1a6b646eb1407269be4e3831cb2746";
const window="WSSS/departures/2026-10-18T03:00:00Z+600s";
const id="AUTH-20261018-G3WSSS01";
const preflightAt=new Date("2026-10-18T02:54:00Z");
const raw=()=>readFileSync(authFile,"utf8");
const ledger=()=>readFileSync(ledgerFile,"utf8")+"\n"+readFileSync(approvalAddendum,"utf8");
const args=()=>({
  authArtifactRaw:raw(),expectedAuthId:id,
  expectedAirportFilterWindow:window,
  icao:"WSSS",canaryCreditCeiling:50,fixedExposureSeconds:600,
  nowUtc:preflightAt,
});

describe("Oct17 8 PM PDT / Oct18 03 UTC one WSSS source AUTH",()=>{
  it("pins exact bytes, approved predecessor, window and soft budget",()=>{
    const r=JSON.parse(raw()) as AuthRecord;
    expect(sha256HexString(raw())).toBe(frozenSha);
    expect(approvedArtifactHashesFromLedger(ledger())).toContain(frozenSha);
    expect(r.authorizationId).toBe(id);
    expect(r.phaseGate).toBe("Phase 3 / Gate 3");
    expect(r.airportFilterWindow).toBe(window);
    expect(r.maxAlertCredits).toBe(50);
    expect(r.maxRestUnitsByCategory).toBeNull();
    expect(r.startNotBeforeUtc).toBe("2026-10-18T02:35:00.000Z");
    expect(Date.parse(r.expiresAtUtc!))
      .toBeGreaterThan(Date.parse("2026-10-18T03:20:00Z"));
    expect(r.predecessorEvidenceIds.length).toBeGreaterThan(0);
    for(const p of r.predecessorEvidenceIds)expect(ledger()).toContain(p);
    const reviewed=reviewGate3LedgerBoundPreparationV39(args(),ledger());
    expect(reviewed.authArtifactSha256).toBe(frozenSha);
    expect(reviewed.canaryCreditCeiling).toBe(50);
    expect(reviewed.fixedExposureSeconds).toBe(600);
  });
  it("cannot broaden airport, authorized window, budget or ID",()=>{
    for(const patch of [
      {expectedAuthId:"AUTH-20261018-WRONG"},
      {expectedAirportFilterWindow:"WSSS/departures/2026-10-18T03:01:00Z+600s"},
      {icao:"YSSY"},{canaryCreditCeiling:51},{fixedExposureSeconds:601},
    ]){
      expect(()=>reviewGate3LedgerBoundPreparationV39(
        {...args(),...patch},ledger(),
      )).toThrow();
    }
  });
  it("refuses premature, expired and SHA-unapproved preparation",()=>{
    expect(()=>reviewGate3LedgerBoundPreparationV39(
      {...args(),nowUtc:new Date("2026-10-18T02:49:00Z")},ledger(),
    )).toThrow("GATE3_LEDGER_PREPARE_WINDOW_NOT_IMMINENT_HOLD");
    expect(()=>reviewGate3LedgerBoundPreparationV39(
      {...args(),nowUtc:new Date("2026-10-18T04:01:00Z")},ledger(),
    )).toThrow();
    expect(()=>reviewGate3LedgerBoundPreparationV39(
      args(),ledger().replace("AUTH_ARTIFACT_SHA256:"+frozenSha,""),
    )).toThrow("GATE3_LEDGER_PREPARE_AUTH_NOT_INDEPENDENTLY_APPROVED_HOLD");
  });
});
