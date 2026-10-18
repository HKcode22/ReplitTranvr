/** Exact WSSS05 approved Saturday Oct17 23:20 PDT source AUTH; offline only. */
import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {sha256HexString,approvedArtifactHashesFromLedger,type AuthRecord}
 from "../server/lib/disruption/authRecord_v39";
import {reviewGate3LedgerBoundPreparationV39}
 from "../server/lib/disruption/gate3LedgerBoundSessionPreparation_v39";

const F="data-collection/authorizations/V3.9_PHASE3_GATE3_AUTH_20261018_WSSS05.json";
const L="data-collection/evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md";
const A="data-collection/phase3/2026-10-16_GATE3_WSSS_AUTH_SHA_APPROVAL_ADDENDUM.md";
const ID="AUTH-20261018-G3WSSS05";
const WINDOW="WSSS/departures/2026-10-18T06:20:00Z+600s";
const HASH="6f1a780a616aa5d0dc45421a32c750980b2932695359ffa0121df549f85556ac";
const raw=()=>readFileSync(F,"utf8");
const ledger=()=>readFileSync(L,"utf8")+"\n"+readFileSync(A,"utf8");
const req=()=>({authArtifactRaw:raw(),expectedAuthId:ID,
 expectedAirportFilterWindow:WINDOW,icao:"WSSS",canaryCreditCeiling:50,
 fixedExposureSeconds:600,nowUtc:new Date("2026-10-18T06:14:00Z")});
describe("2026-10-17 23:20 PDT WSSS05 owner approved exact window",()=>{
  it("requires immutable original approved byte SHA and all exact bounds",()=>{
    const record=JSON.parse(raw()) as AuthRecord;
    expect(sha256HexString(raw())).toBe(HASH);
    expect(approvedArtifactHashesFromLedger(ledger())).toContain(HASH);
    expect(record.authorizationId).toBe(ID);
    expect(record.airportFilterWindow).toBe(WINDOW);
    expect(record.maxAlertCredits).toBe(50);
    expect(record.maxRestUnitsByCategory).toBeNull();
    expect(record.startNotBeforeUtc).toBe("2026-10-18T05:55:00.000Z");
    expect(record.expiresAtUtc).toBe("2026-10-18T07:20:00.000Z");
    for(const p of record.predecessorEvidenceIds)expect(ledger()).toContain(p);
    expect(reviewGate3LedgerBoundPreparationV39(req(),ledger())
      .authArtifactSha256).toBe(HASH);
  });
  it("refuses alternate window, budget, airport or approval digest",()=>{
    for(const patch of [
      {expectedAuthId:"AUTH-20261018-G3WSSS04"},
      {expectedAirportFilterWindow:"WSSS/departures/2026-10-18T06:21:00Z+600s"},
      {icao:"YSSY"},{canaryCreditCeiling:51},{fixedExposureSeconds:601},
    ])expect(()=>reviewGate3LedgerBoundPreparationV39({...req(),...patch},ledger())).toThrow();
    expect(()=>reviewGate3LedgerBoundPreparationV39(req(),
      ledger().replace("AUTH_ARTIFACT_SHA256:"+HASH,""))).toThrow();
  });
  it("refuses early or expired preparation before SQL/provider reads",()=>{
    expect(()=>reviewGate3LedgerBoundPreparationV39({...req(),
      nowUtc:new Date("2026-10-18T06:10:00Z")},ledger())).toThrow();
    expect(()=>reviewGate3LedgerBoundPreparationV39({...req(),
      nowUtc:new Date("2026-10-18T06:20:16Z")},ledger())).toThrow();
  });
});
