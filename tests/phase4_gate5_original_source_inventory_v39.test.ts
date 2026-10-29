import {describe,it,expect,vi} from "vitest";
import {readFileSync} from "node:fs";
import {auditP4Gate5OriginalSourceInventory,P4_REQUIRED_SOURCE_TABLES,
 P4_INV_CATALOG_SQL,P4_INV_FIDS_SQL,P4_INV_POPULATION_SQL,P4_INV_BLOB_SQL,
 P4_INV_RAW_FIDS_FLAGS_SQL}
 from "../server/lib/disruption/phase4Gate5SourceInventory_v39";
import {requireP4InventoryActionsContext}
 from "../scripts/v39_gate5_source_inventory_readonly_actions";
const qid="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",sha="a".repeat(64);
const stamp=(s:string)=>new Date(s);
const scope={airport:"WSSS",auditUtc:"2026-10-29T16:00:00.000Z"};
const catalog=()=>P4_REQUIRED_SOURCE_TABLES.map(name=>({
 name,persistence:"p",readable:true
}));
const qrow={query_id:qid,airport:"WSSS",response_hash:sha,
 available_at:stamp("2026-10-29T04:00:00.000Z"),
 service_start:stamp("2026-10-29T11:00:00.000Z"),
 service_end:stamp("2026-10-29T15:00:00.000Z"),
 raw_present:true,raw_expired_at_utc:null};
const pRow={query_id:qid,canonical_id:"flight-1",
 population_role:"requested_airport_primary",scope:"confirmed_core",
 codeshare:"confirmed_operating_leg",
 response_hash:sha,
 available_at:stamp("2026-10-29T04:00:00.000Z"),
 dep_scheduled_utc:stamp("2026-10-29T12:00:00.000Z"),
 provider_content_expired_at_utc:null};
const blob={source_kind:"webhook",content_class:"raw_provider_content",
 content_sha256:sha,content_bytes:1000,
 persisted_at_utc:stamp("2026-10-29T04:00:00.000Z"),
 expires_at_utc:stamp("2026-10-30T04:00:00.000Z"),
 deleted_at_utc:null,source_record_id:"prepaid:scope-id:ppd_001"};
const originalAggregate={
 source_items:31,departure_items:31,arrival_items:0,
 codeshare_field_present:0,provider_operator_tagged:0,
 provider_marketing_tagged:0,provider_flight_id_present:0,
 explicit_departure_icao:0,explicit_arrival_icao:31,
 explicit_departure_schedule:31
};
function fake(c:unknown[]=catalog(),qs:unknown[]=[qrow],
 ps:unknown[]=[pRow],bs:unknown[]=[blob],
 original:unknown=originalAggregate){
 const calls:string[]=[];
 const db={query:vi.fn(async(sql:string,args:unknown[])=>{
  calls.push(sql);
  if(sql===P4_INV_CATALOG_SQL){
   expect(args).toEqual([[...P4_REQUIRED_SOURCE_TABLES]]);
   return {rows:c};
  }
  if(sql===P4_INV_FIDS_SQL){
   expect(args).toEqual(["WSSS",scope.auditUtc]);return {rows:qs};
  }
  if(sql===P4_INV_POPULATION_SQL){
   expect(args).toEqual([[qid]]);return {rows:ps};
  }
  if(sql===P4_INV_RAW_FIDS_FLAGS_SQL){
   expect(args).toEqual([[qid]]);return {rows:[original]};
  }
  if(sql===P4_INV_BLOB_SQL){
   expect(args[1]).toBe(scope.auditUtc);return {rows:bs};
  }
  throw Error("UNAUTHORIZED_SQL");
 })};
 return {db,calls};
}
describe("Phase4 original-source metadata, no provider",()=>{
 it("accounts for source query, time and hash only as candidate",async()=>{
  const {db,calls}=fake();const x=await auditP4Gate5OriginalSourceInventory(db,scope);
  expect(calls).toHaveLength(5);
  expect(x.latestFidsQuerySample).toBe(1);
  expect(x.candidatePopulationRows).toBe(1);
  expect(x.candidateOperatingLegRows).toBe(1);
  expect(x.candidateRowsBeforeScheduledHorizon).toEqual({
   "T-24h":0,"T-6h":1,"T-90m":1
  });
  expect(x.webhookUnexpiredLedgerRefs).toBe(1);
  expect(x.normalizedRoleCounts.primary).toBe(1);
  expect(x.normalizedScopeCounts.confirmedCore).toBe(1);
  expect(x.normalizedCodeshareCounts.confirmedOperating).toBe(1);
  expect(x.canonicalIdentityPresentRows).toBe(1);
  expect(x.originalFidsFieldSample.sourceItems).toBe(31);
  expect(x.originalFidsFieldSample.providerOperatorTagged).toBe(0);
  expect(x.webhookLedgerAirportAttributionVerified).toBe(false);
  expect(x.firstSelectedTIndependentlyVerified).toBe(false);
  expect(x.rawOriginalBytesHashReadbackProven).toBe(false);
  expect(x.strictGate5Passed).toBe(false);
  expect(x.phase6Authorized).toBe(false);
  expect(x.databaseWrites).toBe(0);
  expect(JSON.stringify(x)).not.toContain(qid);
 });
 it("missing logged relation cannot masquerade as measured zero",async()=>{
  const {db,calls}=fake(catalog().slice(1));
  const x=await auditP4Gate5OriginalSourceInventory(db,scope);
  expect(calls).toHaveLength(1);
  expect(x.status).toBe("BLOCKED_MISSING_OR_UNREADABLE_SOURCE_RELATIONS");
  expect(x.unavailableRelations).toBe(1);
  expect(x.allSourceCompletenessVerified).toBe(false);
 });
 it("UNLOGGED or insufficient SELECT privileges block source inventory",async()=>{
  for(const change of [{persistence:"u"},{readable:false}]){
   const list=catalog();Object.assign(list[0],change);
   const x=await auditP4Gate5OriginalSourceInventory(fake(list).db,scope);
   expect(x.status).toBe("BLOCKED_MISSING_OR_UNREADABLE_SOURCE_RELATIONS");
  }
 });
 it("empty FIDS sample is source unknown, not 0% capture",async()=>{
  const {db}=fake(catalog(),[],[],[]);
  const x=await auditP4Gate5OriginalSourceInventory(db,scope);
  expect(x.status).toBe("NO_SAMPLED_FIDS_SOURCE_OBSERVED_NOT_ZERO_COVERAGE");
  expect(x.missingFidsIsSourceUnknown).toBe(true);
  expect(x.candidateRowsBeforeScheduledHorizon["T-6h"]).toBe(0);
  expect(x.strictGate5Passed).toBe(false);
 });
 it("expired FIDS original metadata cannot support candidate count",async()=>{
  const {db}=fake(catalog(),[{...qrow,raw_present:false}], [pRow],[]);
  const x=await auditP4Gate5OriginalSourceInventory(db,scope);
  expect(x.fidsQueriesWithExpiredOrMissingRaw).toBe(1);
  expect(x.candidateOperatingLegRows).toBe(0);
 });
 it("future available_at is excluded, never backdated",async()=>{
  const {db}=fake(catalog(),[qrow],[{
   ...pRow,available_at:stamp("2026-10-29T14:00:00.000Z")
  }],[]);
  const x=await auditP4Gate5OriginalSourceInventory(db,scope);
  expect(x.candidateRowsBeforeScheduledHorizon["T-90m"]).toBe(0);
 });
 it("mismatched query response sha fails closed",async()=>{
  await expect(auditP4Gate5OriginalSourceInventory(
   fake(catalog(),[qrow],[{...pRow,response_hash:"b".repeat(64)}]).db,scope))
   .rejects.toThrow("P4_INV_POPULATION_QUERY_LINEAGE_MISMATCH");
 });
 it("deleted/expired refs separate from valid, never prove object readback",async()=>{
  const {db}=fake(catalog(),[qrow],[pRow],[blob,{
   ...blob,deleted_at_utc:stamp("2026-10-29T12:00:00.000Z")
  }]);
  const x=await auditP4Gate5OriginalSourceInventory(db,scope);
  expect(x.webhookExpiredOrDeletedLedgerRefs).toBe(1);
  expect(x.webhookUnexpiredLedgerRefs).toBe(1);
  expect(x.originalCallbackAcknowledgementVerified).toBe(false);
 });
 it("unexpected truncated data fails closed, not silent undercount",async()=>{
  await expect(auditP4Gate5OriginalSourceInventory(
   fake(catalog(),[qrow],Array(20001).fill(pRow),[]).db,scope))
   .rejects.toThrow("P4_INV_POPULATION_SAMPLE_TRUNCATED");
 });
 it("Actions guard allows only exact main WSSS metadata context",()=>{
  const env={GITHUB_ACTIONS:"true",GITHUB_REF:"refs/heads/main",
   GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"a".repeat(40),
   GITHUB_EVENT_NAME:"push",P4_GATE5_SOURCE_AIRPORT:"WSSS",
   P4_GATE5_READONLY_APPROVAL:"GATE5_SOURCE_METADATA_NO_PROVIDER"};
  expect(requireP4InventoryActionsContext(env)).toEqual({airport:"WSSS"});
  for(const change of [
   {GITHUB_REF:"refs/heads/branch"},
   {P4_GATE5_SOURCE_AIRPORT:"YSSY"},
   {GITHUB_RUN_ATTEMPT:"2"},
   {P4_GATE5_READONLY_APPROVAL:"PAID_OK"}
  ]){
   expect(()=>requireP4InventoryActionsContext({...env,...change}))
    .toThrow("P4_GATE5_INVENTORY_ACTIONS_CONTEXT_HOLD");
  }
 });
 it("separately counts ambiguous normalized operator/status/canonical evidence",async()=>{
  const r=await auditP4Gate5OriginalSourceInventory(fake(
   catalog(),[qrow],[{...pRow,canonical_id:null,
    codeshare:"ambiguous_codeshare",scope:"unknown",
    population_role:"opposite_movement_context"}],[]).db,scope);
  expect(r.candidateOperatingLegRows).toBe(0);
  expect(r.normalizedRoleCounts.context).toBe(1);
  expect(r.normalizedScopeCounts.other).toBe(1);
  expect(r.normalizedCodeshareCounts.other).toBe(1);
  expect(r.canonicalIdentityPresentRows).toBe(0);
 });
 it("checks source FIDS status-field aggregates without exporting raw records",async()=>{
  const r=await auditP4Gate5OriginalSourceInventory(fake().db,scope);
  expect(r.originalFidsFieldSample).toMatchObject({
   sourceItems:31,codeshareStatusPresent:0,providerOperatorTagged:0
  });
  expect(JSON.stringify(r)).not.toContain("flight-one");
 });
 it("source aggregate cannot claim more provider operators than status fields",async()=>{
  const bad={...originalAggregate,provider_operator_tagged:32};
  await expect(auditP4Gate5OriginalSourceInventory(
   fake(catalog(),[qrow],[pRow],[blob],bad).db,scope))
   .rejects.toThrow("P4_INV_ORIGINAL_FIDS_AGGREGATE_CONTRADICTION");
 });
 it("workflow source receives DB reader only; no provider key or paid mutation",()=>{
  const workflow=readFileSync(
   ".github/workflows/phase4-gate5-wsss-original-source-inventory-readonly.yml","utf8");
  const script=readFileSync(
   "scripts/v39_gate5_source_inventory_readonly_actions.ts","utf8");
  expect(workflow).toContain("environment: phase2g-paid");
  expect(workflow).toContain("GATE05_AUTOMATION_DATABASE_URL");
  expect(workflow).not.toContain("AERODATABOX_API_KEY");
  expect(workflow).not.toContain("node scripts/v39_gate05_science_one_paid");
  expect(script).toContain("REPEATABLE READ READ ONLY");
  expect(script).toContain('client.query("ROLLBACK")');
  expect(P4_INV_RAW_FIDS_FLAGS_SQL.startsWith("WITH")).toBe(true);
  expect(P4_INV_RAW_FIDS_FLAGS_SQL).toContain("jsonb_array_elements");
  expect(P4_INV_RAW_FIDS_FLAGS_SQL).not.toMatch(/\b(UPDATE|INSERT|DELETE|CREATE|TRUNCATE)\b/i);
  for(const sql of [P4_INV_CATALOG_SQL,P4_INV_FIDS_SQL,
    P4_INV_POPULATION_SQL,P4_INV_BLOB_SQL]){
   expect(sql.trim().startsWith("SELECT")).toBe(true);
   expect(sql).not.toMatch(/\b(UPDATE|INSERT|DELETE|CREATE|TRUNCATE)\b/i);
  }
 });
});
