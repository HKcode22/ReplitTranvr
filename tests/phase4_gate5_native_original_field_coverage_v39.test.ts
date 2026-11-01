import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {auditP4OriginalNativeFieldPresenceV39,P4_NATIVE_FIELD_SQL_V39}
 from "../server/lib/disruption/phase4Gate5NativeFidsFieldPresence_v39";
import type {P4FreshCohortScopeV39}
 from "../server/lib/disruption/phase4Gate5FreshCohortReadOnly_v39";
const scope=():P4FreshCohortScopeV39=>({
 airportIcao:"WSSS",serviceWindowStartUtc:"2026-10-31T17:00:00.000Z",
 serviceWindowEndUtc:"2026-10-31T18:00:00.000Z",
 readAsOfUtc:"2026-11-01T02:31:29.318Z",
 reviewedFrozenManifestSha256:"a".repeat(64)
});
const row=(patch:Record<string,unknown>={})=>({
 all_receipts:2,sampled_receipts:2,departure_rows:110,
 operator_rows:25,marketing_rows:18,
 origin_present:90,origin_matches:85,
 scheduled_present:110,revised_present:15,runway_present:8,
 quality_present:100,quality_live_tagged:12,...patch
});
const db=(r:unknown)=>({
 query:async (sql:string,args:unknown[])=>{
  expect(sql).toBe(P4_NATIVE_FIELD_SQL_V39);
  expect(args).toEqual(["WSSS","2026-10-31T17:00:00.000Z",
   "2026-10-31T18:00:00.000Z","2026-11-01T02:31:29.318Z"]);
  return {rows:[r]};
 }
});
describe("Phase4 retained provider-native field presence is NOT actual-only proof",()=>{
 it("counts operator/marketing, raw generic time fields, quality, without certifying target",async()=>{
  const r=await auditP4OriginalNativeFieldPresenceV39(db(row()),scope());
  expect(r.sampledOriginalReceipts).toBe(2);
  expect(r.departureSourceObservations).toBe(110);
  expect(r.codeshareUnknownObservations).toBe(67);
  expect(r.genericScheduledTimePresent).toBe(110);
  expect(r.runwayTimePresent).toBe(8);
  expect(r.liveQualityTagged).toBe(12);
  expect(r.confirmedPhysicalOperatingFlights).toBeNull();
  expect(r.verifiedScheduledRunwayT).toBeNull();
  expect(r.verifiedActualWheelsOff).toBeNull();
  expect(r.actualOutcomeRate).toBeNull();
  expect(r.strictGate5Passed).toBe(false);
  expect(r.phase5FreezeAuthorized).toBe(false);
  expect(r.phase6Authorized).toBe(false);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
 });
 it("no source originals means unknown field denominators, not observed zero",async()=>{
  const r=await auditP4OriginalNativeFieldPresenceV39(db(row({
   all_receipts:0,sampled_receipts:0,departure_rows:0,
   operator_rows:0,marketing_rows:0,origin_present:0,origin_matches:0,
   scheduled_present:0,revised_present:0,runway_present:0,
   quality_present:0,quality_live_tagged:0
  })),scope());
  expect(r.status).toBe("NO_RETAINED_ORIGINAL_FIELDS_UNKNOWN");
  expect(r.departureSourceObservations).toBeNull();
  expect(r.operatorTaggedObservations).toBeNull();
  expect(r.runwayTimePresent).toBeNull();
  expect(r.verifiedActualWheelsOff).toBeNull();
 });
 it("truncated query sampling remains explicit and cannot imply complete coverage",async()=>{
  const r=await auditP4OriginalNativeFieldPresenceV39(db(row({
   all_receipts:13,sampled_receipts:12
  })),scope());
  expect(r.sampleTruncated).toBe(true);
  expect(r.verifiedActualWheelsOff).toBeNull();
 });
 it("never accepts contradictory native operator, quality or explicit origin counts",async()=>{
  for(const x of [
   {operator_rows:100,marketing_rows:20},
   {quality_live_tagged:101},
   {origin_matches:91},{sampled_receipts:14}
  ]){
   await expect(auditP4OriginalNativeFieldPresenceV39(db(row(x)),scope()))
    .rejects.toThrow("P4_NATIVE_FIELD_COUNTER_CONTRADICTION_HOLD");
  }
 });
 it("one scoped SELECT only: no provider credentials, raw flight identifiers or SQL writes",()=>{
  expect(P4_NATIVE_FIELD_SQL_V39).toContain("raw_expired_at_utc IS NULL");
  expect(P4_NATIVE_FIELD_SQL_V39).toContain("LIMIT 12");
  expect(P4_NATIVE_FIELD_SQL_V39).toContain("service_window_start_utc=$2");
  expect(P4_NATIVE_FIELD_SQL_V39).toContain("service_window_end_utc=$3");
  expect(P4_NATIVE_FIELD_SQL_V39).not.toMatch(/\bINSERT\s+INTO\b|\bUPDATE\s+clean\.|\bDELETE\s+FROM\b/i);
  const s=readFileSync("server/lib/disruption/phase4Gate5NativeFidsFieldPresence_v39.ts","utf8");
  expect(s).not.toContain("AERODATABOX_API_KEY");
  expect(s).not.toContain("fetch(");
  expect(s).not.toContain("process.env");
  const operator=readFileSync(
   "scripts/v39_phase4_gate5_historical_cohort_smoke_readonly_actions.ts","utf8");
  expect(operator).toContain("auditP4OriginalNativeFieldPresenceV39(client,scope)");
  expect(operator).toContain("P4_HIST_NATIVE_FIELD_SOURCE_RECEIPT_PARITY_HOLD");
  expect(operator).toContain("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
 });
});