import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const path="scripts/v39_gate05_wsss_original_raw_final_readonly_20261028.mjs";
const source=readFileSync(path,"utf8");

describe("WSSS Gate05 original 28-blob read-only final readiness",()=>{
 it("targets only exact paid October28 WSSS source and never historical owner",()=>{
  for(const value of [
   "618582a3-ea3f-4a10-a756-c974c472af3c",
   "84b7f1565d0402facc8c3b9aacedc599eb6e2af1",
   "1fcded99e76cc974dc518495bd127000a3a7a9cb4344e41b6b89cb9e01b98b23",
   "cd93866bc18a2d1368981837d4af8c036094e421c7d30dd03570e0b611f43746",
   "2026-10-29T03:45:00.000Z","2026-10-29T04:45:00.000Z",
   "expectedJournalDeliveries:28,expectedJournalItems:151"
  ])expect(source).toContain(value);
  expect(source).toContain("EXACT_OWNER");
  expect(source).not.toContain("e69ffa34-d8a6-456f-a49c-9dd459e6d294");
 });
 it("uses a PostgreSQL read-only transaction and only original dedicated bucket reads",()=>{
  expect(source).toContain("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(source).toContain('options:"-c default_transaction_read_only=on"');
  expect(source).toContain('await client.query("ROLLBACK")');
  expect(source).toContain("createRequiredProviderBlobStoreV39");
  expect(source).toContain("store.downloadBytes(path)");
  expect(source).not.toMatch(/store\.(?:delete|uploadBytes)\(/);
  expect(source).not.toMatch(/client\.query\(\s*["'](?:UPDATE|INSERT|DELETE|ALTER|CREATE|TRUNCATE)/);
  expect(source).not.toContain("fetch(");
  expect(source).not.toContain("AERODATABOX_API_KEY");
  expect(source).not.toContain("createGate4SingleWithRawReceipt");
  expect(source).not.toContain("providerIdSha256");
 });
 it("cryptographically validates original blob bytes against retained journal and contract",()=>{
  expect(source).toContain("adaptGate05LoggedJournalToCensusV39");
  expect(source).toContain("censusGate05ObservedPilotV39");
  expect(source).toContain("source.contentSha256");
  expect(source).toContain("row.content_sha256!==row.body_sha256");
  expect(source).toContain('row.source_record_id!=="prepaid:"+SCOPE+":"+row.delivery_id');
  expect(source).toContain("row.deleted_at_utc!==null");
  expect(source).toContain("iso(row.expires_at_utc)<=now");
  expect(source).toContain("matchedOriginalBlobCount===28");
  expect(source).toContain("matchedOriginalItemCount===151");
 });
 it("does not falsely equate raw status items to verified flight leg or scientific PASS",()=>{
  expect(source).toContain("candidateStatusItemsAreNOTUniqueOperatingFlights:true");
  expect(source).toContain("verifiedDistinctPhysicalOperatingLegs:null");
  expect(source).toContain("verifiedCompletedPhysicalFlights:null");
  expect(source).toContain("verifiedAirbornePhysicalFlights:null");
  expect(source).toContain("verifiedUniqueUsableAirbornePoints:null");
  expect(source).toContain("prospectiveSameCohortT24T6T90Proven:false");
  expect(source).toContain("actualWheelsOffSourceActualityVerified:false");
  expect(source).toContain("scientificGate05StrictPassed:false");
  expect(source).toContain("originalHttp2xxAcknowledgementProven:false");
  expect(source).toContain("providerBillableCalls:0");
  expect(source).toContain("objectStorageMutations:0");
  expect(source).not.toContain("console.log(bytes)");
 });
 it("parses with Node without credentials or external requests",()=>{
  const p=spawnSync(process.execPath,["--check",path],
   {encoding:"utf8",timeout:10000});
  expect(p.status).toBe(0);
 });
});