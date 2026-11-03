import {describe,it,expect} from "vitest";
import {
 auditP4G5BoundSourceCaptureReadOnlyV39,
 P4_G5_BOUND_SOURCE_ROWS_SQL_V39,
 P4_G5_BOUND_PRE_ROWS_SQL_V39,
 P4_G5_BOUND_WEBHOOK_ROWS_SQL_V39,
 type P4G5BoundReadScopeV39
} from "../server/lib/disruption/phase4Gate5BoundSourceCaptureReadonly_v39";
const h=(x:string)=>x.repeat(64);
const scope=():P4G5BoundReadScopeV39=>({
 airportIcao:"WSSS",reviewedManifestSha256:h("a"),
 serviceStartUtc:"2026-11-05T06:00:00.000Z",
 serviceEndUtc:"2026-11-05T07:00:00.000Z",
 captureStartUtc:"2026-11-04T18:00:00.000Z",
 captureEndUtc:"2026-11-05T10:00:00.000Z",
 auditAtUtc:"2026-11-05T11:00:00.000Z",
 reviewedCandidateSubscriptionIds:["BATCH-TEST-REVIEWED-SUB-1"]
});
const horizons=["T-24h","T-6h","T-90m"] as const;
function source(n=9){
 return Array.from({length:n},(_,i)=>({
  query_id:"6d1248a0-0049-4b10-9011-"+String(i+1).padStart(12,"0"),
  query_digest:h(String((i%9)+1)),original_sha:h(["a","b","c","d","e","f","1","2","3"][i]),
  response_sha:h(["a","b","c","d","e","f","1","2","3"][i]),
  source_use_expires_at_utc:"2026-11-06T06:00:00.000Z",
  github_run_id:"1234567",
  horizon:horizons[Math.floor(i/3)],
  committed_at_utc:"2026-11-04T19:00:00.000Z",
  original_available_at:"2026-11-04T20:00:00.000Z",
  raw_expired_at_utc:null,
  source_airport_icao:"WSSS",
  service_window_start_utc:"2026-11-05T06:00:00.000Z",
  service_window_end_utc:"2026-11-05T07:00:00.000Z",
  flight_id:"physical-A",analytic_id:"physical-A",
  population_role:"requested_airport_primary",
  scope_classification:"confirmed_core",
  codeshare_resolution_status:"confirmed_operating_leg",
  dep_scheduled_utc:"2026-11-05T06:00:00.000Z",
  member_available_at:"2026-11-04T20:00:00.000Z",
  member_sha:h(["a","b","c","d","e","f","1","2","3"][i]),
  provider_content_expired_at_utc:null
 }));
}
const pre=(record=source()[5])=>({
 flight_id:"physical-A",horizon:"T-6h",
 prediction_cutoff_utc:"2026-11-05T00:00:00.000Z",
 selected_t_milestone_utc:"2026-11-05T06:00:00.000Z",
 query_id:record.query_id,response_sha:record.original_sha,
 created_at:"2026-11-04T23:59:00.000Z",builder_version:"preSnapshotBuilder_v3@1.3.0"
});
const callback=(n:string,flight:string|null,status:string,opts:Record<string,unknown>={})=>({
 delivery_id:"delivery-"+n,notification_id:"notification-"+n,
 subscription_id:"BATCH-TEST-REVIEWED-SUB-1",
 received_at_utc:"2026-11-05T07:15:00.000Z",
 delivery_attempt_seq_no:1,item_index:0,
 raw_item_sha256:h("e"),resolution_status:status,
 flight_id:flight,origin_icao:flight?"WSSS":null,
 initial_scheduled_gate_out_utc:flight?"2026-11-05T06:00:00.000Z":null,
 ...opts
});
function db(resultSets:unknown[][]){
 const queries:{sql:string;args:readonly unknown[]}[]=[];
 let i=0;
 return {
  queries,query:async(sql:string,args:readonly unknown[])=>{
   queries.push({sql,args});
   if(i>=resultSets.length)throw Error("UNEXPECTED_EXTRA_SQL");
   return {rows:resultSets[i++]};
  }
 };
}
describe("Gate5 real DB bound read-only current original/PRE/callback CANDIDATES",()=>{
 it("joins nine V0077 receipts, physical source, timely PRE and scoped callback items",async()=>{
  const q=db([source(),[pre()],[callback("1","physical-A","resolved"),
    callback("2","physical-B","resolved"),
    callback("3",null,"quarantined")]]);
  const result=await auditP4G5BoundSourceCaptureReadOnlyV39(q,scope());
  expect(result.status).toBe("V0077_BOUND_SOURCE_PRE_AND_SUBSCRIPTION_CANDIDATES_ONLY");
  if(result.status!=="V0077_BOUND_SOURCE_PRE_AND_SUBSCRIPTION_CANDIDATES_ONLY")throw Error("no candidate");
  expect(q.queries).toHaveLength(3);
  expect(result.exactBoundOriginalReceiptsPresent).toBe(9);
  expect(result.provisionalDistinctPhysicalIds).toBe(1);
  expect(result.partition.horizonReports[0].qualifiedOperatingLegAsOfEligible).toBe(0);
  expect(result.partition.horizonReports[1].qualifiedOperatingLegAsOfEligible).toBe(1);
  expect(result.partition.horizonReports[1].actualPrePersistedCandidates).toBe(1);
  expect(result.partition.horizonReports[1].distinctResolvedMatchedInside).toBe(1);
  expect(result.partition.horizonReports[1].distinctResolvedOutsideObservedPrimaryFrame).toBe(1);
  expect(result.partition.horizonReports[1].unresolvedUniqueNotifications).toBe(1);
  expect(result.sourceRightsIndependentlyVerified).toBe(false);
  expect(result.actualSelectedTVerified).toBe(false);
  expect(result.strictGate5Passed).toBe(false);
  expect(result.providerCalls).toBe(0);
  expect(result.databaseWrites).toBe(0);
 });
 it("no nine originals -> no population inferred, no PRE/webhook DB queries",async()=>{
  const q=db([source(8)]);
  const r=await auditP4G5BoundSourceCaptureReadOnlyV39(q,scope());
  expect(r.status).toBe("HOLD_INCOMPLETE_OR_EXPIRED_NINE_ORIGINALS");
  expect(r.exactBoundOriginalReceiptsPresent).toBe(8);
  if(r.status!=="HOLD_INCOMPLETE_OR_EXPIRED_NINE_ORIGINALS")throw Error("bad");
  expect(r.actualFlightDenominator).toBeNull();
  expect(r.provisionalCutoffCapturePartition).toBeNull();
  expect(q.queries).toHaveLength(1);
 });
 it("no independently reviewed callback subscription mapping means UNKNOWN, not zero capture",async()=>{
  const s=scope();s.reviewedCandidateSubscriptionIds=[];
  const q=db([source(),[pre()]]);
  const r=await auditP4G5BoundSourceCaptureReadOnlyV39(q,s);
  expect(r.status).toBe("HOLD_WEBHOOK_SUBSCRIPTION_SCOPE_UNBOUND");
  if(r.status!=="HOLD_WEBHOOK_SUBSCRIPTION_SCOPE_UNBOUND")throw Error("bad");
  expect(r.unresolvedWebhookCount).toBeNull();
  expect(r.provisionalCutoffCapturePartition).toBeNull();
  expect(q.queries).toHaveLength(2);
 });
 it("retransmission one notification item; changing body or identity is conflicting",async()=>{
  const a=callback("1","physical-A","resolved");
  const dup=callback("1","physical-A","resolved",{delivery_id:"delivery-1-retry"});
  const r=await auditP4G5BoundSourceCaptureReadOnlyV39(
    db([source(),[pre()],[a,dup]]),scope());
  if(!("partition" in r))throw Error("missing partition");
  expect(r.partition.distinctObservedNotificationIds).toBe(1);
  expect(r.partition.duplicateDeliveryAttempts).toBe(1);
  expect(r.partition.horizonReports[1].distinctResolvedMatchedInside).toBe(1);
  const conflict=callback("1","physical-B","resolved",{
    delivery_id:"delivery-1-conflict",raw_item_sha256:h("f")
  });
  const bad=await auditP4G5BoundSourceCaptureReadOnlyV39(
    db([source(),[],[a,conflict]]),scope());
  if(!("partition" in bad))throw Error("missing");
  expect(bad.webhookConflictingNotifications).toBe(1);
  expect(bad.partition.horizonReports[1].distinctResolvedMatchedInside).toBe(0);
 });
 it("late PRE cannot backfill earlier cutoff, and is excluded",async()=>{
  const late={...pre(),created_at:"2026-11-05T00:05:00.000Z"};
  const r=await auditP4G5BoundSourceCaptureReadOnlyV39(
   db([source(),[late],[]]),scope());
  if(!("partition" in r))throw Error("missing");
  expect(r.retroactivelyWrittenPreExcluded).toBe(1);
  expect(r.partition.horizonReports[1].actualPrePersistedCandidates).toBe(0);
  expect(r.partition.horizonReports[1].missingPreCandidates).toBe(1);
 });
 it("source hash conflict and foreign subscription fail closed",async()=>{
  const s=source();s[0].response_sha=h("6");
  await expect(auditP4G5BoundSourceCaptureReadOnlyV39(db([s]),scope()))
   .rejects.toThrow("P4_G5_BOUND_CAPTURE_ORIGINAL_SHA_OR_QUERY_DIGEST_HOLD");
  await expect(auditP4G5BoundSourceCaptureReadOnlyV39(
   db([source(),[],[callback("1","physical-A","resolved",{
     subscription_id:"not-owned-by-reviewed-claim"
   })]]),scope()))
   .rejects.toThrow("P4_G5_BOUND_CAPTURE_CALLBACK_FOREIGN_SUBSCRIPTION_HOLD");
 });
 it("DB never writes or reads raw Contents into caller; only manifest-scoped V0077",()=>{
  for(const sql of [P4_G5_BOUND_SOURCE_ROWS_SQL_V39,
   P4_G5_BOUND_PRE_ROWS_SQL_V39,P4_G5_BOUND_WEBHOOK_ROWS_SQL_V39]){
   expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE|GRANT)\b/i);
   expect(sql).not.toContain("SELECT *");
  }
  expect(P4_G5_BOUND_SOURCE_ROWS_SQL_V39)
   .toContain("clean.phase4_g5_fids_original_binding_v39");
  expect(P4_G5_BOUND_SOURCE_ROWS_SQL_V39)
   .toContain("clean.phase4_g5_fids_physical_attempt_v39");
  expect(P4_G5_BOUND_SOURCE_ROWS_SQL_V39)
   .toContain("AND b.source_use_expires_at_utc>$5::timestamptz");
  expect(P4_G5_BOUND_PRE_ROWS_SQL_V39).toContain("s.prediction_state='PRE_DEPARTURE'");
  expect(P4_G5_BOUND_WEBHOOK_ROWS_SQL_V39)
   .toContain("d.subscription_id=ANY($1::text[])");
  expect(P4_G5_BOUND_WEBHOOK_ROWS_SQL_V39)
   .toContain("clean.webhook_identity_resolution");
  expect(P4_G5_BOUND_SOURCE_ROWS_SQL_V39).not.toContain("s.raw_payload AS");
  expect(P4_G5_BOUND_WEBHOOK_ROWS_SQL_V39).not.toContain("d.raw_body");
 });
});
