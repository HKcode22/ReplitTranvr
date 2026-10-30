import {describe,it,expect,vi} from "vitest";
import {readFileSync} from "node:fs";
import {readPhase4Gate5CandidateEvidenceV39,validateGate5ReadScopeV39,
 GATE5_READ_FIDS_SQL_V39,GATE5_READ_WEBHOOK_SQL_V39,GATE5_READ_SNAPSHOT_SQL_V39}
 from "../server/lib/disruption/phase4Gate5ReadOnlySource_v39";
const sha="a".repeat(64),another="b".repeat(64);
const scope={airport:"WSSS",tier:"HUB",region:"AS",
 startUtc:"2026-10-29T11:00:00.000Z",endUtc:"2026-10-29T15:00:00.000Z",
 readAsOfUtc:"2026-10-29T16:00:00.000Z"};
const fids={
 analytic_id:"flight-1",canonical_id:"flight-1",query_id:"fd-1",
 role:"requested_airport_primary",scope:"confirmed_core",
 codeshare:"confirmed_operating_leg",
 scheduled:new Date("2026-10-29T12:00:00Z"),
 member_available:new Date("2026-10-29T04:00:00Z"),
 query_available:new Date("2026-10-29T04:00:00Z"),
 effective_available:new Date("2026-10-29T04:00:00Z"),
 source_clock_precision_compatible:true,
 row_hash:sha,query_hash:sha,airport:"WSSS"
};
const webhook={flight_id:"flight-1",received_at:new Date("2026-10-29T13:00:00Z"),
 envelope_sha:sha,item_sha:another,resolution_sha:another};
const snap={flight_id:"flight-1",horizon:"T-6h",
 cutoff:new Date("2026-10-29T06:00:00Z"),query_id:"fd-1",snapshot_hash:sha,
 missing_flags:{optional_weather:"missing"},created_at:new Date("2026-10-29T06:00:00Z")};
function db(a:unknown[]=[],b:unknown[]=[],c:unknown[]=[]){
 const calls:string[]=[];
 const query=vi.fn(async(sql:string,params?:readonly unknown[])=>{
   calls.push(sql);
   if(params?.[0]!=="WSSS"||params[1]!==scope.startUtc||
      params[2]!==scope.endUtc||params[3]!==scope.readAsOfUtc)
     throw Error("QUERY_SCOPE_MISMATCH");
   return {rows:[a,b,c][calls.length-1]};
 });
 return {query,calls};
}
describe("Phase4 read-only B0062 source adapter",()=>{
 it("projects real-shaped FIDS receipts, delivery item + resolution, and snapshot",async()=>{
   const connection=db([fids],[webhook],[snap]);
   const result=await readPhase4Gate5CandidateEvidenceV39(connection,scope);
   expect(connection.query).toHaveBeenCalledTimes(3);
   expect(result.counts.fidsRowsMapped).toBe(1);
   expect(result.counts.webhookRowsMapped).toBe(1);
   expect(result.counts.snapshotRowsMapped).toBe(1);
   expect(result.report.horizons.map(h=>h.population)).toEqual([0,1,1]);
   expect(result.report.horizons[1].createdSnapshots).toBe(1);
   expect(result.report.horizons[1].webhookCaptured).toBe(1);
   expect(result.report.horizons[1].rates.required.value).toBe(0);
   expect(result.strictGate5Passed).toBeUndefined();
   expect(result.report.strictPassed).toBe(false);
   expect(result.status).toContain("HOLD");
   expect(result.providerCalls).toBe(0);
 });
 it("no FIDS always yields NULL rates, never fabricated zero coverage",async()=>{
   const result=await readPhase4Gate5CandidateEvidenceV39(db([],[],[]),scope);
   expect(result.report.horizons[0].rates.capture.value).toBeNull();
   expect(result.report.horizons[1].population).toBe(0);
   expect(result.underlyingSourceCompletenessProven).toBe(false);
 });
 it("unmatched hashed item is quarantined rather than webhook count",async()=>{
   const result=await readPhase4Gate5CandidateEvidenceV39(
     db([fids],[{...webhook,resolution_sha:sha}],[]),scope);
   expect(result.counts.webhookRejectedRawHash).toBe(1);
   expect(result.report.horizons[1].webhookCaptured).toBe(0);
 });
 it("FIDS query and row receipt hashes must match, no cutoffs invented",async()=>{
   const r=await readPhase4Gate5CandidateEvidenceV39(
     db([{...fids,query_hash:another}],[],[snap]),scope);
   expect(r.counts.fidsRejectedHashesOrTime).toBe(1);
   expect(r.counts.snapshotRowsMapped).toBe(0);
   expect(r.report.horizons[1].population).toBe(0);
 });
 it("provisional FIDS ids never claim independently verified operator",async()=>{
   const r=await readPhase4Gate5CandidateEvidenceV39(db([{
     ...fids,canonical_id:null,analytic_id:"provisional-1"
   }],[],[]),scope);
   expect(r.report.horizons[1].population).toBe(0);
   expect(r.report.ambiguousExcluded).toBe(1);
 });
 it("accepts DB-certified submillisecond receipt-clock rounding without inventing source history",async()=>{
   // PG can distinguish 04:00:00.000001 from 04:00:00.000002, while
   // the JS Date fixtures collapse both into an identical millisecond.
   // The database-provided exact-precision verdict controls admission.
   const r=await readPhase4Gate5CandidateEvidenceV39(db([{
     ...fids,source_clock_precision_compatible:true
   }],[],[]),scope);
   expect(r.counts.fidsRowsMapped).toBe(1);
   expect(r.counts.fidsRejectedHashesOrTime).toBe(0);
   expect(r.report.strictPassed).toBe(false);
   expect(GATE5_READ_FIDS_SQL_V39).toContain("q.available_at-p.available_at<interval '1 millisecond'");
   expect(GATE5_READ_FIDS_SQL_V39).toContain("GREATEST(p.available_at,q.available_at)");
 });
 it("rejects database-certified inversion >=1ms despite JS Date rounding",async()=>{
   const r=await readPhase4Gate5CandidateEvidenceV39(db([{
     ...fids,source_clock_precision_compatible:false
   }],[],[]),scope);
   expect(r.counts.fidsRowsMapped).toBe(0);
   expect(r.counts.fidsRejectedHashesOrTime).toBe(1);
   expect(r.report.horizons[1].rates.capture.value).toBeNull();
 });
 it("uses later effective source clock, not just member clock, for cutoff eligibility",async()=>{
   const r=await readPhase4Gate5CandidateEvidenceV39(db([{
     ...fids,
     member_available:new Date("2026-10-29T05:59:59.999Z"),
     query_available:new Date("2026-10-29T06:00:00.001Z"),
     effective_available:new Date("2026-10-29T06:00:00.001Z"),
     source_clock_precision_compatible:true
   }],[],[]),scope);
   // This synthetic fixture exercises the effective timestamp only.
   // The SQL-certified flag is authoritative about unrounded DB clocks.
   expect(r.counts.fidsRowsMapped).toBe(1);
   expect(r.report.horizons[1].population).toBe(0);
   expect(r.report.horizons[2].population).toBe(1);
 });
 it("fails closed if the effective timestamp is earlier than either source clock",async()=>{
   const r=await readPhase4Gate5CandidateEvidenceV39(db([{
     ...fids,query_available:new Date("2026-10-29T04:00:00.500Z"),
     effective_available:new Date("2026-10-29T04:00:00.000Z")
   }],[],[]),scope);
   expect(r.counts.fidsRejectedHashesOrTime).toBe(1);
 });
 it("query available after durable row or invalid UTC is rejected",async()=>{
   const r=await readPhase4Gate5CandidateEvidenceV39(
     db([{...fids,query_available:new Date("2026-10-29T08:00:00Z")}],[],[]),scope);
   expect(r.counts.fidsRejectedHashesOrTime).toBe(1);
   expect(r.report.horizons[1].population).toBe(0);
   expect(()=>validateGate5ReadScopeV39({...scope,startUtc:"2026-10-29"}))
     .toThrow("GATE5_EXPLICIT_UTC_start");
 });
 it("enforces source bounds and never silently truncates",async()=>{
   const connection=db(Array(20001).fill(fids),[],[]);
   await expect(readPhase4Gate5CandidateEvidenceV39(connection,scope))
     .rejects.toThrow("GATE5_SOURCE_LIMIT_REACHED_NOT_COMPLETE");
 });
 it("uses static scoped SELECTs, retained bytes, separate source clocks",()=>{
   for(const sql of [GATE5_READ_FIDS_SQL_V39,GATE5_READ_WEBHOOK_SQL_V39,
     GATE5_READ_SNAPSHOT_SQL_V39]){
     expect(sql.trim().startsWith("SELECT")).toBe(true);
     expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE)\s+(?:INTO|FROM|TABLE|clean\.)/i);
     expect(sql).toContain("$1");
     expect(sql).toContain("LIMIT 20001");
   }
   expect(GATE5_READ_FIDS_SQL_V39).toContain("fids_query_response");
   expect(GATE5_READ_FIDS_SQL_V39).toContain("q.raw_payload IS NOT NULL");
   expect(GATE5_READ_WEBHOOK_SQL_V39).toContain("r.raw_item_sha256");
   expect(GATE5_READ_WEBHOOK_SQL_V39).toContain("raw_delivery_item");
 });
 it("operator refuses unapproved calls before opening a database",()=>{
   const source=readFileSync("scripts/v39_gate5_readonly_source_once_v39.ts","utf8");
   const guard=source.indexOf('PHASE4_READONLY_REVIEWED_GO');
   const imported=source.indexOf('await import("../server/lib/disruption/db_v39")');
   expect(guard).toBeGreaterThan(0);
   expect(imported).toBeGreaterThan(guard);
   expect(source).toContain("REPEATABLE READ READ ONLY");
   expect(source).toContain('client.query("ROLLBACK")');
   expect(source).not.toContain("fetchFidsAirport");
 });
});
