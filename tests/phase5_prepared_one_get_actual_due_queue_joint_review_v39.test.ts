import {describe,it,expect} from "vitest";
import {
 intersectP5OneGetDraftWithActualSourceDueQueue,
 type P5UnapprovedOneGetCandidate
} from "../server/lib/disruption/phase5PreparedQueryToOneGetDraft_v39";
import {
 classifyP5SignedUpcomingSourceQueue,
 type P5SourceQueueMetadataRow
} from "../server/lib/disruption/phase5SourceUpcomingDueQueueReadonly_v39";
import {P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
const sha=(c:string)=>c.repeat(64);
const dispatch="2027-02-01T10:00:00.000Z";
const later="2027-02-01T10:01:00.000Z";
const before="2027-02-01T09:00:00.000Z";
const scope={
 expectedManifestSha256:sha("a"),
 expectedReleaseSha256:sha("b"),
 expectedRightsSha256:sha("c"),
 expectedProviderContractSha256:sha("d"),
 expectedSourceRole:P5_STAGE28_GROUPS.source
};
function live(patch:Partial<P5SourceQueueMetadataRow>={},when=before){
 return classifyP5SignedUpcomingSourceQueue([{
  query_digest:sha("e"),manifest_sha256:sha("a"),run_day_index:1,
  query_key:"P5_D01_WSSS_T24_PART01",
  slot_id:"HUB",horizon:"T-24h",airport_icao:"WSSS",
  state:"PREPARED",github_run_id:"00000",
  early_draw_sha256:sha("f"),
  rights_review_sha256:sha("c"),reviewed_release_sha256:sha("b"),
  provider_contract_sha256:sha("d"),
  planned_dispatch_utc:dispatch,
  hard_latest_dispatch_utc:later,
  prediction_cutoff_utc:"2027-02-01T10:10:00.000Z",
  api_units_per_attempt:2,max_physical_attempts:1,
  existing_attempt_sha256:null,existing_prearm_sha256:null,
  existing_original_population_query_id:null,
  ...patch
 }],scope,when);
}
function draft():P5UnapprovedOneGetCandidate{
 return {
  schema:"v39.phase5.prepared-source-query-one-get-draft.v1",
  status:"EXACT_SELECTED_DB_SOURCE_QUERY_AWAITING_INDEPENDENT_PAID_RELEASE",
  expectedStage8ProposalSha256:sha("9"),
  selectedQueryDigestSha256:sha("e"),
  exactSourceCandidateSha256:sha("8"),restCategory:"FIDS_BASE_UNITS",
  selectedQueryAlreadyPreparedInProduction:false,
  independentlySignedRawJsonBytes:false,
  sourceContentsAndMlRightsApproved:false,
  phase5ScientificFreezePassed:false,phase6PaidGo:false,
  providerCalls:0,databaseWrites:0,
  unsignedQueryEnvelope:{
   schema:"v39.phase5.github-source-one-query-template.v2",
   manifestSha256:sha("a"),queryDigestSha256:sha("e"),
   plan:{
    expectedEarlyDrawSha256:sha("f"),
    independentlyApprovedSourceAndRetention:false,
    githubOnlyOwnerApproved:false,
    acquisition:{
     runDayIndex:1,queryKey:"P5_D01_WSSS_T24_PART01",
     slot:"HUB",horizon:"T-24h",icao:"WSSS",
     scheduledRequestUtc:dispatch,apiUnitsPerAttempt:2,
     maxAttempts:1
    }
   } as unknown as P5UnapprovedOneGetCandidate["unsignedQueryEnvelope"]["plan"]
  }
 };
}
const match=(d=draft(),q=live())=>
 intersectP5OneGetDraftWithActualSourceDueQueue(d,q);
describe("Phase5 source automation: Stage8 UNARMED draft meets actual Stage9 V0079 due queue",()=>{
 it("reconciles exact saved manifest/draw/query/slot/horizon/time but never self-signs or dispatches",()=>{
  const r=match();
  expect(r.status).toBe(
   "SAME_SOURCE_DRAFT_AND_DB_DUE_QUERY_AWAIT_SIGNED_RELEASE_NO_DISPATCH");
  expect(r.manifestSha256).toBe(sha("a"));
  expect(r.queryDigestSha256).toBe(sha("e"));
  expect(r.savedEarlyDrawSha256).toBe(sha("f"));
  expect(r.runDayIndex).toBe(1);
  expect(r.reviewedPlannedDispatchUtc).toBe(dispatch);
  expect(r.hardLatestDispatchUtc).toBe(later);
  expect(r.independentSignedQueryByteReleasePresent).toBe(false);
  expect(r.currentDbQueueAuthenticityIndependentlyAuthenticatedByThisFunction).toBe(false);
  expect(r.sourceContractAndPhysicalBudgetIndependentlyVerifiedHere).toBe(false);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
  expect(r.externalGithubDispatches).toBe(0);
  expect(r.phase6PaidGoGranted).toBe(false);
 });
 it("refuses stale, TOO LATE, STOPPED, RESERVED or PREARMED actual queue",()=>{
  for(const change of [
   {state:"STOPPED"},
   {existing_attempt_sha256:sha("1")},
   {existing_prearm_sha256:sha("2")},
   {github_run_id:"1234567890",state:"ACTIVE"}
  ]){
   expect(()=>match(draft(),live(change)))
    .toThrow("QUEUE_RESV_OR_REPLAY_OR_CHANGED_SOURCE_PLAN");
  }
  expect(()=>match(draft(),live({},"2027-02-01T09:55:00.000Z")))
   .toThrow("QUEUE_RESV_OR_REPLAY_OR_CHANGED_SOURCE_PLAN");
  expect(()=>match(draft(),live({},"2027-02-01T10:01:00.000Z")))
   .toThrow("QUEUE_RESV_OR_REPLAY_OR_CHANGED_SOURCE_PLAN");
 });
 it("refuses switched source query, early draw, region, horizon, ICAO, schedule",()=>{
  const edits=[
   (d:P5UnapprovedOneGetCandidate)=>d.selectedQueryDigestSha256=sha("7"),
   (d:P5UnapprovedOneGetCandidate)=>d.unsignedQueryEnvelope.plan.expectedEarlyDrawSha256=sha("7"),
   (d:P5UnapprovedOneGetCandidate)=>d.unsignedQueryEnvelope.plan.acquisition.queryKey="P5_D01_YSSY_T24_PART01",
   (d:P5UnapprovedOneGetCandidate)=>d.unsignedQueryEnvelope.plan.acquisition.horizon="T-6h",
   (d:P5UnapprovedOneGetCandidate)=>d.unsignedQueryEnvelope.plan.acquisition.icao="YSSY",
   (d:P5UnapprovedOneGetCandidate)=>d.unsignedQueryEnvelope.plan.acquisition.slot="MID_A",
   (d:P5UnapprovedOneGetCandidate)=>d.unsignedQueryEnvelope.plan.acquisition.scheduledRequestUtc=later
  ];
  for(const edit of edits){
   const d=draft();edit(d);
   expect(()=>match(d)).toThrow(
    /QUEUE_RESV_OR_REPLAY_OR_CHANGED_SOURCE_PLAN|NO_UNIQUE_ACTUAL_DB_PREPARED_SOURCE_QUERY/);
  }
  const d=draft();d.unsignedQueryEnvelope.manifestSha256=sha("6");
  expect(()=>match(d)).toThrow("STATIC_MANIFEST_QUERY_OR_AIRPORT_SCOPE_CHANGED");
 });
 it("refuses a draft upgraded by a caller without independent release",()=>{
  for(const change of [
   (d:P5UnapprovedOneGetCandidate)=>d.sourceContentsAndMlRightsApproved=true as false,
   (d:P5UnapprovedOneGetCandidate)=>d.independentlySignedRawJsonBytes=true as false,
   (d:P5UnapprovedOneGetCandidate)=>d.phase6PaidGo=true as false,
   (d:P5UnapprovedOneGetCandidate)=>d.unsignedQueryEnvelope.plan.githubOnlyOwnerApproved=true as false,
   (d:P5UnapprovedOneGetCandidate)=>d.unsignedQueryEnvelope.plan.independentlyApprovedSourceAndRetention=true as false
  ]){
   const d=draft();change(d);
   expect(()=>match(d)).toThrow(
    /NOT_TWO_UNRELEASED_READONLY_SOURCE_VIEW_STATES|UNREVIEWED_STATIC_QUERY_DRAFT_OR_PRICE/);
  }
 });
 it("refuses fake queue without exact candidate list and clean zero-dispatch provenance",()=>{
  const q=live();
  expect(()=>match(draft(),{...q,observedQueries:2}))
   .toThrow("NOT_TWO_UNRELEASED_READONLY_SOURCE_VIEW_STATES");
  expect(()=>match(draft(),{...q,paidGetDispatched:true as false}))
   .toThrow("NOT_TWO_UNRELEASED_READONLY_SOURCE_VIEW_STATES");
  expect(()=>match(draft(),{...q,sourceUseAndRetentionNotCertifiedHere:false as true}))
   .toThrow("NOT_TWO_UNRELEASED_READONLY_SOURCE_VIEW_STATES");
  expect(()=>match(draft(),{...q,candidates:[]}))
   .toThrow("NOT_TWO_UNRELEASED_READONLY_SOURCE_VIEW_STATES");
 });
 it("rejects incorrect physical source GET units or multiple real attempts",()=>{
  for(const p of [{apiUnitsPerAttempt:3},{maxAttempts:2}]){
   const d=draft();Object.assign(d.unsignedQueryEnvelope.plan.acquisition,p);
   expect(()=>match(d)).toThrow("UNREVIEWED_STATIC_QUERY_DRAFT_OR_PRICE");
  }
 });
});
