import {describe,it,expect} from "vitest";
import {
 auditP4G5HorizonPreexpiryV39,
 P4_G5_HORIZON_PREEXPIRY_SOURCE_SQL_V39,
 P4_G5_HORIZON_PREEXPIRY_PRE_SQL_V39,
 type P4G5HorizonPreexpiryScopeV39
} from "../server/lib/disruption/phase4Gate5HorizonPreexpiryReadOnly_v39";

const sha=(s:string)=>s.repeat(64);
const start="2026-11-05T06:00:00.000Z";
const end="2026-11-05T07:00:00.000Z";
const audit="2026-11-05T00:20:00.000Z";
const scope=():P4G5HorizonPreexpiryScopeV39=>({
 airportIcao:"WSSS",serviceStartUtc:start,serviceEndUtc:end,
 reviewedManifestSha256:sha("a"),horizon:"T-6h",
 expectedOwnerGithubRunId:"123456789012",readAtUtc:audit
});
const rows=(flight="physical-A",originalAt="2026-11-04T23:30:00.000Z")=>
 [0,1,2].map(i=>({
  query_id:"a9bfb0cb-dfd2-4a39-8ab0-"+String(i+1).padStart(12,"0"),
  query_digest:sha(["b","c","d"][i]),
  original_sha:sha(["e","f","1"][i]),
  response_sha:sha(["e","f","1"][i]),
  horizon:"T-6h",
  github_run_id:"123456789012",
  committed_at_utc:"2026-11-04T22:00:00.000Z",
  source_use_expires_at_utc:"2026-11-05T12:00:00.000Z",
  source_airport_icao:"WSSS",
  service_window_start_utc:start,service_window_end_utc:end,
  original_available_at:originalAt,
  flight_id:flight,analytic_id:flight,
  population_role:"requested_airport_primary",
  scope_classification:"confirmed_core",
  codeshare_resolution_status:"confirmed_operating_leg",
  dep_scheduled_utc:"2026-11-05T06:00:00.000Z",
  member_available_at:originalAt,
  member_sha:sha(["e","f","1"][i]),
  provider_content_expired_at_utc:null
 }));
const pre=(source=rows()[0])=>({
 flight_id:"physical-A",horizon:"T-6h",
 prediction_cutoff_utc:"2026-11-05T00:00:00.000Z",
 selected_t_milestone_utc:"2026-11-05T06:00:00.000Z",
 query_id:source.query_id,
 response_sha:source.original_sha,
 created_at:"2026-11-04T23:55:00.000Z",
 builder_version:"preSnapshotBuilder_v3@1.3.0"
});
const db=(source:unknown[],preRows:unknown[])=>{
 const calls:{sql:string;args:readonly unknown[]}[]=[];
 let i=0;
 return {
  calls,query:async(sql:string,args:readonly unknown[])=>{
   calls.push({sql,args});
   const data=[source,preRows][i++];
   if(!data)throw Error("UNEXPECTED_THIRD_QUERY");
   return {rows:data};
  }
 };
};
describe("Phase4 Gate5 per-horizon pre-expiry real V0077 original & PRE readback",()=>{
 it("counts three original provider-bound query receipts, dedup physical leg and valid timely PRE",async()=>{
  const source=rows();
  const q=db(source,[pre(source[2])]);
  const out=await auditP4G5HorizonPreexpiryV39(q,scope());
  expect(q.calls.length).toBe(2);
  expect(q.calls[0].args[5]).toBe("T-6h");
  expect(out.observedBoundOriginals).toBe(3);
  expect(out.distinctQuerySlots).toBe(3);
  expect(out.sourceScopedPhysicalCandidates).toBe(1);
  expect(out.operatingCandidates).toBe(1);
  expect(out.eligibleCutoffCandidates).toBe(1);
  expect(out.prePresent).toBe(1);
  expect(out.missingPreCandidateCount).toBe(0);
  expect(out.candidatePreCompleteness).toBe(1);
  expect(out.nativeSelectedTMilestoneIndependentlyVerified).toBe(false);
  expect(out.realPostflightWebhookInOutUnresolvedAudited).toBe(false);
  expect(out.scientificGate5Passed).toBe(false);
  expect(out.providerCalls).toBe(0);
  expect(out.databaseWrites).toBe(0);
 });
 it("does NOT use a late returned flight for earlier T-6h PRE or pretend zero events",async()=>{
  const q=db(rows("physical-A","2026-11-05T00:05:00.000Z"),[]);
  const r=await auditP4G5HorizonPreexpiryV39(q,scope());
  expect(r.eligibleCutoffCandidates).toBe(0);
  expect(r.lateOriginalForCutoff).toBe(1);
  expect(r.candidatePreCompleteness).toBeNull();
  expect(r.missingDenominatorReason).not.toBeNull();
 });
 it("does NOT call PRE query when even one source original is missing/expired",async()=>{
  const s=rows().slice(0,2);
  const q=db(s,[]);
  const r=await auditP4G5HorizonPreexpiryV39(q,scope());
  expect(r.status).toBe("HOLD_FROZEN_HORIZON_SOURCE_NOT_ALL_THREE_RETAINED");
  expect(r.observedBoundOriginals).toBe(2);
  expect(r.expectedPreCandidates).toBeNull();
  expect(q.calls).toHaveLength(1);
 });
 it("source/member hash, owner run, expiry or missing original provenance fails closed",async()=>{
  const a=rows();a[0].member_sha=sha("7");
  await expect(auditP4G5HorizonPreexpiryV39(db(a,[]),scope()))
   .rejects.toThrow("P4_G5_HORIZON_PREEXPIRY_NORMALIZED_MEMBER_SOURCE_PARITY_HOLD");
  const b=rows();b[0].github_run_id="999999999999";
  await expect(auditP4G5HorizonPreexpiryV39(db(b,[]),scope()))
   .rejects.toThrow("P4_G5_HORIZON_PREEXPIRY_SOURCE_OWNER_HASH_SCOPE_HOLD");
  const c=rows();c[0].source_use_expires_at_utc=audit;
  await expect(auditP4G5HorizonPreexpiryV39(db(c,[]),scope()))
   .rejects.toThrow("P4_G5_HORIZON_PREEXPIRY_SOURCE_COMMIT_OR_EXPIRY_HOLD");
 });
 it("a retrospectively inserted PRE after its historical cutoff does not count",async()=>{
  const a=rows(),p={...pre(a[0]),created_at:"2026-11-05T00:10:00.000Z"};
  const x=await auditP4G5HorizonPreexpiryV39(db(a,[p]),scope());
  expect(x.prePresent).toBe(0);
  expect(x.invalidOrPosthocPRE).toBe(1);
  expect(x.missingPreCandidateCount).toBe(1);
 });
 it("unrelated or wrong-horizon PRE is never counted as eligible source",async()=>{
  const a=rows(),p={...pre(a[0]),query_id:"uuid-foreign"};
  const x=await auditP4G5HorizonPreexpiryV39(db(a,[p]),scope());
  expect(x.prePresent).toBe(0);
  expect(x.invalidOrPosthocPRE).toBe(1);
  const y={...pre(a[0]),horizon:"T-90m"};
  await expect(auditP4G5HorizonPreexpiryV39(db(a,[y]),scope()))
   .rejects.toThrow("P4_G5_HORIZON_PREEXPIRY_PRE_WRONG_HORIZON_HOLD");
 });
 it("unknown operating role and codeshare only are excluded from physical operating denominator",async()=>{
  const a=rows().map((x,i)=>({
   ...x,
   codeshare_resolution_status:i===0?"ambiguous_unknown":"resolved_marketing",
   scope_classification:"unknown"
  }));
  const x=await auditP4G5HorizonPreexpiryV39(db(a,[]),scope());
  expect(x.sourceScopedPhysicalCandidates).toBe(1);
  expect(x.operatingCandidates).toBe(0);
  expect(x.identityScopeAmbiguous).toBe(1);
  expect(x.eligibleCutoffCandidates).toBe(0);
 });
 it("first generic schedule with a future cutoff is pending, not a missing PRE",async()=>{
  const a=rows().map(x=>({...x,dep_scheduled_utc:"2026-11-05T06:30:00.000Z"}));
  const x=await auditP4G5HorizonPreexpiryV39(db(a,[]),scope());
  expect(x.notYetDue).toBe(1);
  expect(x.eligibleCutoffCandidates).toBe(0);
  expect(x.candidatePreCompleteness).toBeNull();
 });
 it("one exact READ ONLY horizon and no future or unowned database write",()=>{
  expect(P4_G5_HORIZON_PREEXPIRY_SOURCE_SQL_V39)
   .toContain("clean.phase4_g5_fids_original_binding_v39");
  expect(P4_G5_HORIZON_PREEXPIRY_SOURCE_SQL_V39)
   .toContain("clean.phase4_g5_fids_physical_attempt_v39");
  expect(P4_G5_HORIZON_PREEXPIRY_SOURCE_SQL_V39)
   .toContain("AND o.horizon=$6");
  expect(P4_G5_HORIZON_PREEXPIRY_PRE_SQL_V39)
   .toContain("AND o.github_run_id=$3");
  for(const sql of [P4_G5_HORIZON_PREEXPIRY_SOURCE_SQL_V39,
    P4_G5_HORIZON_PREEXPIRY_PRE_SQL_V39]){
   expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE|GRANT)\b/i);
  }
 });
 it("malformed scope and nonsensical source result refuse before science",async()=>{
  const a=scope();a.reviewedManifestSha256="not-a-pin";
  await expect(auditP4G5HorizonPreexpiryV39(db(rows(),[]),a))
   .rejects.toThrow("P4_G5_HORIZON_PREEXPIRY_SCOPE_HOLD");
  const b=scope();b.readAtUtc="2026-11-05";
  await expect(auditP4G5HorizonPreexpiryV39(db(rows(),[]),b))
   .rejects.toThrow("P4_G5_HORIZON_PREEXPIRY_INVALID_UTC_AUDIT_HOLD");
 });
});
