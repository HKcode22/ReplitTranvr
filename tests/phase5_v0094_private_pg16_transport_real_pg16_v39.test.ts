import {createHash} from "node:crypto";
import {Client} from "pg";
import {describe,it,expect,afterAll,beforeAll} from "vitest";
import {
 hydrateP5PrivateLaterPreFromPg16ReadOnly,
 type P5PrivateFrozenHydrationPins
} from "../server/lib/disruption/phase5Phase6Pg16PrivateLaterPreHydrator_v39";
import type {P5SignedSourceBatchRegistry}
 from "../server/lib/disruption/phase5SignedPerDaySourceBatchReadonly_v39";
import type {P5SignedLaterPreDayRegistry}
 from "../server/lib/disruption/phase5SignedLaterPreDayRegistry_v39";

const H=(n:string)=>n.repeat(64);
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const code="e".repeat(40);
const sourcePath="data-collection/phase5/frozen/source_day_ci0004.json";
const registryPath="data-collection/phase5/frozen/later_day_shard_ci0001.json";
const packetPath="data-collection/phase5/frozen/later_packet_ci0001.json";
const ciLogin="phase6_private_reader_login_ci20261113";
const ciPass="ci-only-testing-no-provider";
const manifest=H("1"),rights=H("3"),release=H("2");
const sourceEvidence=H("7"),laterEvidence=H("8");
const native="2027-02-10T12:00:00.000Z";
const source:P5SignedSourceBatchRegistry={
 schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
 manifestSha256:manifest,runDayIndex:4,entries:[{
  filePath:"data-collection/phase5/frozen/source_query_ci0001.json",
  expectedPacketSha256:H("b"),expectedQueryDigestSha256:H("a")
 }]
};
const sourceRaw=Buffer.from(JSON.stringify(source));
const packet=Buffer.from(JSON.stringify({
 schema:"v39.phase5.github-witnessed-later-pre-reviewed.v1",
 reviewedCodeSha:code,independentLaterHorizonAndT24ReviewAttested:true,
 prePermit:{
  manifestSha256:manifest,runDayIndex:4,flightInstanceId:"ci-native:flight:00001",
  horizon:"T-6h",selectedTNativeUtc:native,
  expectedReviewedReleaseSha256:release,
  expectedReviewedSourceRightsSha256:rights,
  queryDigestSha256:H("a"),
  expectedSourcePopulationQueryId:"a23e4567-e89b-42d3-a456-426614174000",
  identityEvidenceTier:"PROVIDER_NATIVE_OPERATING_LEG",
  externalNativeTPhysicalLegAndSourceUseReviewed:true,
  reviewedT24WitnessReceipt:{receiptSha256:H("5")}
 }
}));
const registry:P5SignedLaterPreDayRegistry={
 schema:"v39.phase5.signed-later-pre-day-registry.v1",
 manifestSha256:manifest,reviewedCodeSha:code,
 sourceDayRegistrySha256:sha(sourceRaw),
 sourceDayRegistryFilePath:sourcePath,
 runDayIndex:4,shardIndex:1,entries:[{
  filePath:packetPath,expectedPacketSha256:sha(packet),
  expectedQueryDigestSha256:H("a"),
  expectedFlightInstanceId:"ci-native:flight:00001",
  expectedHorizon:"T-6h",
  expectedSelectedTNativeUtc:native,
  expectedSourcePopulationQueryId:"a23e4567-e89b-42d3-a456-426614174000",
  expectedT24ReceiptSha256:H("5")
 }]
};
const registryRaw=Buffer.from(JSON.stringify(registry));
const pins:P5PrivateFrozenHydrationPins={
 registryFilePath:registryPath,
 expectedRegistrySha256:sha(registryRaw),
 expectedSourceDayRegistrySha256:sha(sourceRaw),
 expectedSourceRegistryPath:sourcePath,
 expectedManifestSha256:manifest,
 expectedApprovedMainSha:code,
 expectedRunDayIndex:4,
 expectedReleaseSha256:release,
 expectedRightsSha256:rights,
 expectedSourceReviewEvidenceSha256:sourceEvidence,
 expectedLaterReviewEvidenceSha256:laterEvidence,
 expectedPrivateSessionLogin:ciLogin,
 privateReadOnlyApproved:true,
 paidProviderCallsAllowed:false
};
let owner:Client,reader:Client;
const table="phase6_private.frozen_native_packet_v39";
beforeAll(async()=>{
 if(process.env.ADB_AUTO_COLLECT!=="0"||
    process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
    process.env.AERODATABOX_API_KEY||
    process.env.AERODATABOX_WEBHOOK_SECRET||
    !process.env.DATABASE_URL?.includes("localhost:5432/neondb"))
  throw Error("REFUSED_P5_V0094_CI_DISPOSABLE_PG_ONLY");
 owner=new Client({connectionString:process.env.DATABASE_URL});
 await owner.connect();
 // THIS is a CI-only disposable PostgreSQL role. The actual database
 // migration NEVER creates LOGINs or a production GH secret.
 await owner.query("CREATE ROLE "+ciLogin+
  " LOGIN PASSWORD '"+ciPass+"' NOINHERIT NOSUPERUSER "+
  "NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS");
 await owner.query("GRANT phase6_private_frozen_reader_v39 TO "+ciLogin+
  " WITH ADMIN FALSE, INHERIT FALSE, SET TRUE");
 const q="INSERT INTO "+table+" ("+
  "logical_path,run_day_index,shard_index,kind,"+
  "content_sha256,reviewed_code_sha,manifest_sha256,rights_sha256,"+
  "external_review_sha256,externally_reviewed_at_utc,"+
  "retention_not_after_utc,payload_bytes) "+
  "VALUES ($1,4,$2,$3,$4,$5,$6,$7,$8,"+
  "'2026-11-01T00:00:00Z','2027-05-01T00:00:00Z',$9)";
 const rows:[
  string,number,string,Buffer,string
 ][]=[
  [sourcePath,1,"SOURCE_DAY_REGISTRY",sourceRaw,sourceEvidence],
  [packetPath,1,"LATER_PRE_PACKET",packet,laterEvidence],
  [registryPath,1,"LATER_PRE_DAY_REGISTRY",registryRaw,laterEvidence]
 ];
 for(const [path,shard,kind,payload,evidence] of rows)
  await owner.query(q,[path,shard,kind,sha(payload),code,
   manifest,rights,evidence,payload]);
 const base=new URL(process.env.DATABASE_URL!);
 base.username=ciLogin;base.password=ciPass;
 reader=new Client({connectionString:base.toString()});
 await reader.connect();
 await reader.query("SET ROLE phase6_private_frozen_reader_v39");
});
afterAll(async()=>{
 if(reader)await reader.end().catch(()=>{});
 if(owner)await owner.end().catch(()=>{});
});
describe("actual disposable PG16 V0094 private bytea and original later-PRE registry verifier, no paid calls",()=>{
 it("keeps ZERO new login memberships on the actual staged V0094 schema (only disposable CI grants follow)",async()=>{
  const z=await owner.query(
   "SELECT rolcanlogin,rolsuper,rolcreaterole FROM pg_catalog.pg_roles "+
   "WHERE rolname=$1",["phase6_private_frozen_reader_v39"]);
  expect(z.rows[0]).toMatchObject({
   rolcanlogin:false,rolsuper:false,rolcreaterole:false
  });
  const grants=await owner.query(
   "SELECT has_table_privilege($1,$2,'SELECT') AS reader,"+
   "has_table_privilege($1,$2,'INSERT') AS writer",
   ["phase6_private_frozen_reader_v39",table]);
  expect(grants.rows[0]).toEqual({reader:true,writer:false});
 });
 it("verifies real effective PG16 NOLOGIN reader, private exact bytes, SOURCE lineage and native cutoff",async()=>{
  const x=await hydrateP5PrivateLaterPreFromPg16ReadOnly(reader,pins);
  expect(x.verified.entries).toHaveLength(1);
  expect(x.verified.entries[0].packetSha256).toBe(sha(packet));
  expect(x.verified.entries[0].bytes).toEqual(packet);
  expect(x.verified.sourceDayRegistrySha256).toBe(sha(sourceRaw));
  expect(x.redactedSummary).toMatchObject({
   signedNativeFlightHorizons:1,actualPrivatePayloadsRead:3,
   providerCalls:0,databaseWrites:0,githubDispatches:0,
   publicCheckoutContentsEmitted:false,
   phase6PaidGoGranted:false
  });
  expect(JSON.stringify(x.redactedSummary)).not.toContain("ci-native:flight");
  expect(x.observedDbClockUtc.endsWith("Z")).toBe(true);
 });
 it("rejects a DB owner despite same access, and all reader writes",async()=>{
  await expect(hydrateP5PrivateLaterPreFromPg16ReadOnly(owner,pins))
   .rejects.toThrow("PG16_ROLE_IDENTITY_READONLY_PRIVILEGE_MATRIX_INVALID");
  const q=await reader.query(
   "SELECT current_user AS actor,session_user AS sess");
  expect(q.rows[0]).toMatchObject({
   actor:"phase6_private_frozen_reader_v39",sess:ciLogin
  });
  await expect(reader.query(
   "DELETE FROM "+table+" WHERE logical_path=$1",[packetPath]))
   .rejects.toMatchObject({code:"42501"});
 });
 it("rejects an altered independently pinned SHA and unknown source review evidence",async()=>{
  await expect(hydrateP5PrivateLaterPreFromPg16ReadOnly(
   reader,{...pins,expectedRegistrySha256:H("f")}))
   .rejects.toThrow("PRIVATE_REGISTRY_BYTES_NOT_EXTERNALLY_PINNED");
  await expect(hydrateP5PrivateLaterPreFromPg16ReadOnly(
   reader,{...pins,expectedSourceReviewEvidenceSha256:H("f")}))
   .rejects.toThrow("PRIVATE_FLIGHT_SOURCE_OR_REVIEW_METADATA_DRIFT");
 });
 it("SQL SHA/bytes, unique path and immutable UPDATE guards fail closed",async()=>{
  await expect(owner.query(
   "UPDATE "+table+" SET external_review_sha256=$1 WHERE logical_path=$2",
   [H("f"),packetPath]))
   .rejects.toThrow("P5_V0094_IMMUTABLE_PACKET_NO_UPDATE");
  await expect(owner.query(
   "INSERT INTO "+table+" "+
   "(logical_path,run_day_index,shard_index,kind,"+
   "content_sha256,reviewed_code_sha,manifest_sha256,rights_sha256,"+
   "external_review_sha256,externally_reviewed_at_utc,"+
   "retention_not_after_utc,payload_bytes) VALUES "+
   "($1,4,1,'LATER_PRE_PACKET',$2,$3,$4,$5,$6,"+
   "'2026-11-01T00:00:00Z','2027-05-01T00:00:00Z',$7)",
   ["data-collection/phase5/frozen/fake_packet_0001.json",
    H("0"),code,manifest,rights,laterEvidence,packet]
  )).rejects.toMatchObject({code:"23514"});
  const q=await owner.query("SELECT count(*)::integer AS n FROM "+table);
  expect(q.rows[0].n).toBe(3);
 });
});
