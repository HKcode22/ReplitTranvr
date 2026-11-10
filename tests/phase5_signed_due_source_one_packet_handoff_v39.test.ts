import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {
 reviewP5OneSignedPacketAgainstActualDueQueue
} from "../server/lib/disruption/phase5SignedDueSourceOnePacketHandoff_v39";
import {
 classifyP5SignedUpcomingSourceQueue,type P5SourceQueueMetadataRow
} from "../server/lib/disruption/phase5SourceUpcomingDueQueueReadonly_v39";
import {P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import type {P5GitHubOneQueryReleaseEnvelope}
 from "../server/lib/disruption/phase5GitHubOneQueryReleaseAdmission_v39";
const h=(c:string)=>c.repeat(64);
const base=Date.parse("2027-02-02T12:00:00.000Z");
const iso=(ms:number)=>new Date(ms).toISOString();
const scope={
 expectedManifestSha256:h("a"),expectedReleaseSha256:h("b"),
 expectedRightsSha256:h("c"),expectedProviderContractSha256:h("d"),
 expectedSourceRole:P5_STAGE28_GROUPS.source
};
function row(update:Partial<P5SourceQueueMetadataRow>={}):P5SourceQueueMetadataRow{
 return{
  query_digest:h("e"),manifest_sha256:scope.expectedManifestSha256,
  run_day_index:1,query_key:"P5_D01_WSSS_T24_PART01",
  slot_id:"HUB",horizon:"T-24h",airport_icao:"WSSS",
  state:"PREPARED",github_run_id:"00000",
  early_draw_sha256:h("f"),rights_review_sha256:scope.expectedRightsSha256,
  reviewed_release_sha256:scope.expectedReleaseSha256,
  provider_contract_sha256:scope.expectedProviderContractSha256,
  planned_dispatch_utc:iso(base),hard_latest_dispatch_utc:iso(base+60_000),
  prediction_cutoff_utc:iso(base+10*60_000),
  api_units_per_attempt:2,max_physical_attempts:1,
  existing_attempt_sha256:null,existing_prearm_sha256:null,
  existing_original_population_query_id:null,
  ...update
 };
}
function fixture(
 rows:P5SourceQueueMetadataRow[]=[row()],
 now=base-60*60_000
){
 const packet={
  schema:"v39.phase5.github-source-one-query-template.v2",
  manifestSha256:scope.expectedManifestSha256,queryDigestSha256:h("e"),
  plan:{
   acquisition:{
    runDayIndex:1,slot:"HUB",horizon:"T-24h",icao:"WSSS",
    queryKey:"P5_D01_WSSS_T24_PART01",
    scheduledRequestUtc:iso(base),apiUnitsPerAttempt:2,
    maxAttempts:1,providerQueryDirection:"Departure"
   },
   day:{scheduledStartUtc:iso(base+60*60_000)},
   expectedEarlyDrawSha256:h("f"),
   reviewedReleaseSha256:scope.expectedReleaseSha256,
   reviewedProviderRightsSha256:scope.expectedRightsSha256,
   openapiSha256:scope.expectedProviderContractSha256,
   independentlyApprovedSourceAndRetention:true,
   githubOnlyOwnerApproved:true
  }
 } as unknown as P5GitHubOneQueryReleaseEnvelope;
 const bytes=Buffer.from(JSON.stringify(packet));
 const pins={
  filePath:"data-collection/phase5/frozen/prospective_day01_source.json",
  expectedPacketSha256:createHash("sha256").update(bytes).digest("hex"),
  expectedManifestSha256:scope.expectedManifestSha256,
  expectedQueryDigestSha256:h("e"),
  expectedReleaseSha256:scope.expectedReleaseSha256,
  expectedRightsSha256:scope.expectedRightsSha256,
  expectedProviderContractSha256:scope.expectedProviderContractSha256
 };
 const scan=classifyP5SignedUpcomingSourceQueue(rows,scope,iso(now));
 return {packet,bytes,pins,scan};
}
const assess=(f:ReturnType<typeof fixture>)=>
 reviewP5OneSignedPacketAgainstActualDueQueue(
  f.scan,f.bytes,f.packet,f.pins);

describe("one actual signed future source packet + READ ONLY V0079 queue handoff",()=>{
 it("matches one exact unreserved, due source query without dispatch authority",()=>{
  const d=assess(fixture());
  expect(d.status).toBe("SIGNED_QUERY_DUE_FOR_INDEPENDENT_RELEASE_NO_DISPATCH");
  expect(d.observedDbClockUtc).toBe(iso(base-3600000));
  expect(d.airportIcao).toBe("WSSS");
  expect(d.providerCalls).toBe(0);
  expect(d.databaseWrites).toBe(0);
  expect(d.githubChildWorkflowDispatched).toBe(false);
  expect(d.sevenPhysicalUtcRestCategoriesCertifiedHere).toBe(false);
  expect(d.sourceContentsRightsIndependentlyCertifiedHere).toBe(false);
  expect(d.phase6PaidGoGrantedHere).toBe(false);
 });
 it("waits before lookahead and distinguishes early prepared queue",()=>{
  expect(assess(fixture([],base-4*3600000)).status)
   .toBe("SIGNED_QUERY_NOT_YET_IN_DB_QUEUE_LOOKAHEAD");
  expect(assess(fixture([row()],base-106*60000)).status)
   .toBe("SIGNED_QUERY_TOO_EARLY_FOR_SAFE_DISPATCH");
 });
 it("never redraws, retries a committed prearm or erases missingness",()=>{
  const pre=fixture([row({existing_prearm_sha256:h("9")})]);
  expect(assess(pre).status)
   .toBe("SIGNED_QUERY_ALREADY_PREARMED_OR_RESERVED_NO_REDISPATCH");
  const reserved=fixture([row({existing_attempt_sha256:h("8")})]);
  expect(assess(reserved).status)
   .toBe("SIGNED_QUERY_ALREADY_PREARMED_OR_RESERVED_NO_REDISPATCH");
  expect(assess(fixture([row({state:"STOPPED"})])).status)
   .toBe("SIGNED_QUERY_STOPPED_NO_DISPATCH");
  expect(assess(fixture([row()],base-14*60000)).status)
   .toBe("SIGNED_QUERY_MISSED_OR_TOO_LATE_CENSOR");
  expect(assess(fixture([row()],base+2*60000)).status)
   .toBe("SIGNED_QUERY_MISSED_OR_TOO_LATE_CENSOR");
 });
 it("flags missing real prepared row in lookahead, does not invent one",()=>{
  expect(assess(fixture([],base-3600000)).status)
   .toBe("SIGNED_QUERY_EXPECTED_DB_ROW_MISSING_HOLD");
 });
 it("rejects altered raw JSON bytes or signed identity, source and rights",()=>{
  const a=fixture();a.bytes=Buffer.from("X"+a.bytes.toString());
  expect(()=>assess(a)).toThrow("UNSIGNED_FILE_OR_QUEUE_NOT_AUTHENTICATED");
  const b=fixture();b.pins.expectedQueryDigestSha256=h("0");
  expect(()=>assess(b)).toThrow("FROZEN_PACKET_OR_SOURCE_RIGHTS_PINS_DRIFT");
  const c=fixture();c.pins.expectedRightsSha256=h("0");
  expect(()=>assess(c)).toThrow("FROZEN_PACKET_OR_SOURCE_RIGHTS_PINS_DRIFT");
  const d=fixture();d.pins.filePath="../unsafe.json";
  expect(()=>assess(d)).toThrow("UNSIGNED_FILE_OR_QUEUE_NOT_AUTHENTICATED");
 });
 it("rejects mismatched physical airport or early-draw hash against real queue",()=>{
  const a=fixture([row({airport_icao:"YSSY"})]);
  expect(()=>assess(a)).toThrow("ACTUAL_DB_SOURCE_ROW_DRIFT");
  const b=fixture([row({early_draw_sha256:h("1")})]);
  expect(()=>assess(b)).toThrow("ACTUAL_DB_SOURCE_ROW_DRIFT");
  const c=fixture([row({query_key:"CHANGED_QUERY_KEY"})]);
  expect(()=>assess(c)).toThrow("ACTUAL_DB_SOURCE_ROW_DRIFT");
 });
 it("rejects unapproved attempt count even if frozen JSON SHA matched",()=>{
  const a=fixture();(a.packet.plan.acquisition as any).maxAttempts=2;
  a.bytes=Buffer.from(JSON.stringify(a.packet));
  a.pins.expectedPacketSha256=createHash("sha256").update(a.bytes)
   .digest("hex");
  expect(()=>assess(a)).toThrow(
   "UNREVIEWED_FLIGHT_SOURCE_OR_PHYSICAL_ATTEMPT");
 });
});
