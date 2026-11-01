import {describe,it,expect} from "vitest";
import {
 auditP4OriginalRetentionMetadataV39,
 P4_RETENTION_ORIGINAL_META_SQL_V39,
 P4_RETENTION_POPULATION_META_SQL_V39
} from "../server/lib/disruption/phase4Gate5OriginalRetentionMetadata_v39";

const scope=()=>({
 airportIcao:"WSSS",serviceWindowStartUtc:"2026-10-31T17:00:00.000Z",
 serviceWindowEndUtc:"2026-10-31T18:00:00.000Z",
 readAsOfUtc:"2026-11-01T04:40:00.000Z",
 reviewedFrozenManifestSha256:"a".repeat(64)
});
const o=(patch:Record<string,unknown>={})=>({
 receipts_seen:2,raw_present:1,raw_absent:1,
 expiry_marked:1,raw_with_expiry_marker:0,
 no_raw_no_expiry_marker:0,raw_without_persist_clock:0,
 persist_clock_after_available:0,raw_older_24h:1,raw_older_168h:0,...patch
});
const p=(patch:Record<string,unknown>={})=>({
 population_rows_seen:110,population_marked_expired:24,
 population_unmarked_older_168h:0,...patch
});
const db=(original:unknown,population:unknown)=>{
 const calls:Array<{sql:string;params:unknown[]}>=[];
 let i=0;
 return {calls,query:async(sql:string,params:unknown[])=>{
  calls.push({sql,params});
  return {rows:[i++===0?original:population]};
 }};
};
describe("Phase4 Gate5 original source retention METADATA ONLY",()=>{
 it("distinguishes technical presence, 24h/168h review flags, and unverified legal rights",async()=>{
  const client=db(o(),p());
  const r=await auditP4OriginalRetentionMetadataV39(client,scope());
  expect(client.calls).toHaveLength(2);
  expect(client.calls.every(x=>x.params[0]==="WSSS")).toBe(true);
  expect(client.calls.every(x=>x.params[1]==="2026-10-31T17:00:00.000Z")).toBe(true);
  expect(r.originalPayloadPresent).toBe(1);
  expect(r.originalPayloadOlderThan24hReviewCandidates).toBe(1);
  expect(r.originalPayloadOlderThan168hReviewCandidates).toBe(0);
  expect(r.normalizedPopulationMetadataRows).toBe(110);
  expect(r.accountSpecificDataRightsVerified).toBe(false);
  expect(r.databaseBackupPitrExpiryVerified).toBe(false);
  expect(r.verifiedActualOnlyWheelsOff).toBe(false);
  expect(r.strictGate5Passed).toBe(false);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
 });
 it("missing all original receipt metadata never becomes a measured retained source denominator of zero",async()=>{
  const client=db(o({
   receipts_seen:0,raw_present:0,raw_absent:0,
   expiry_marked:0,raw_older_24h:0
  }),p({population_rows_seen:0,population_marked_expired:0}));
  const r=await auditP4OriginalRetentionMetadataV39(client,scope());
  expect(r.originalReceiptMetadataRows).toBe(0);
  expect(r.originalPayloadPresent).toBeNull();
  expect(r.originalPayloadAbsent).toBeNull();
  expect(r.status).toContain("UNKNOWN");
 });
 it("rejects contradictory expiry-marker and source-clock counters",async()=>{
  await expect(auditP4OriginalRetentionMetadataV39(
   db(o({raw_with_expiry_marker:2}),p()),scope()))
   .rejects.toThrow("P4_RETENTION_META_COUNTER_CONTRADICTION_HOLD");
  await expect(auditP4OriginalRetentionMetadataV39(
   db(o({raw_older_168h:2}),p()),scope()))
   .rejects.toThrow("P4_RETENTION_META_COUNTER_CONTRADICTION_HOLD");
  await expect(auditP4OriginalRetentionMetadataV39(
   db(o(),p({population_unmarked_older_168h:90})),scope()))
   .rejects.toThrow("P4_RETENTION_META_COUNTER_CONTRADICTION_HOLD");
 });
 it("refuses invalid scope and counter shapes before interpreting retention",async()=>{
  await expect(auditP4OriginalRetentionMetadataV39(
   db(o(),p()),{...scope(),reviewedFrozenManifestSha256:"BAD"}))
   .rejects.toThrow("P4_FRESH_COHORT_MANIFEST_SCOPE_HOLD");
  await expect(auditP4OriginalRetentionMetadataV39(
   db(o({receipts_seen:-1}),p()),scope()))
   .rejects.toThrow("P4_RETENTION_META_INVALID_COUNTER");
 });
 it("SQL reads only metadata aggregates for exact cohort and as-of, never exposes raw bytes",()=>{
  for(const sql of [P4_RETENTION_ORIGINAL_META_SQL_V39,
   P4_RETENTION_POPULATION_META_SQL_V39]){
   expect(sql).toContain("source_airport_icao=$1");
   expect(sql).toContain("service_window_start_utc=$2::timestamptz".replace("service_window_start_utc","service_window_start_utc")===sql.includes("service_window_start_utc")?"service_window_start_utc=$2::timestamptz":"window_start_utc=$2::timestamptz");
   expect(sql).toContain("$4::timestamptz");
   expect(sql).not.toMatch(/\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bTRUNCATE\b/i);
   expect(sql).not.toMatch(/SELECT\s+(?:q\.)?raw_payload\b/i);
  }
 });
});
