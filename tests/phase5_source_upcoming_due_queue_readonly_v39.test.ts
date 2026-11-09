import {describe,it,expect} from "vitest";
import {
 classifyP5SignedUpcomingSourceQueue,auditP5UpcomingSourceQueue,
 P5_SOURCE_UPCOMING_METADATA_SQL,
 type P5SourceQueueMetadataRow
} from "../server/lib/disruption/phase5SourceUpcomingDueQueueReadonly_v39";
import {admitP5GitHubSourceQueueObserver}
 from "../scripts/v39_phase5_github_source_upcoming_queue_readonly_v39";
import {P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
const sha=(c:string)=>c.repeat(64);
const start=Date.parse("2027-02-01T10:00:00.000Z");
const instant=(n:number)=>new Date(n).toISOString();
const scope={
 expectedManifestSha256:sha("a"),
 expectedReleaseSha256:sha("b"),
 expectedRightsSha256:sha("c"),
 expectedProviderContractSha256:sha("d"),
 expectedSourceRole:P5_STAGE28_GROUPS.source
};
function row(overrides:Partial<P5SourceQueueMetadataRow>={}):
 P5SourceQueueMetadataRow{
 return {
  query_digest:sha("e"),
  manifest_sha256:scope.expectedManifestSha256,
  run_day_index:1,query_key:"P5_D01_WSSS_T24_PART01",
  slot_id:"HUB",horizon:"T-24h",airport_icao:"WSSS",
  state:"PREPARED",github_run_id:"00000",
  early_draw_sha256:sha("9"),
  rights_review_sha256:scope.expectedRightsSha256,
  reviewed_release_sha256:scope.expectedReleaseSha256,
  provider_contract_sha256:scope.expectedProviderContractSha256,
  planned_dispatch_utc:instant(start),
  hard_latest_dispatch_utc:instant(start+60_000),
  prediction_cutoff_utc:instant(start+10*60_000),
  api_units_per_attempt:2,max_physical_attempts:1,
  existing_attempt_sha256:null,existing_prearm_sha256:null,
  existing_original_population_query_id:null,
  ...overrides
 };
}
describe("V0079 future due queue — existing source role SELECT only",()=>{
 it("finds a reviewed candidate 60 minutes before real planned GET without authorizing GET",()=>{
  const v=classifyP5SignedUpcomingSourceQueue(
   [row()],scope,instant(start-60*60_000));
  expect(v.status).toBe("METADATA_ONLY_NOT_AN_AUTOMATIC_PAID_DISPATCH");
  expect(v.candidates[0].status).toBe("DUE_SOON_REVIEW_REQUIRED_NO_PAID_DISPATCH");
  expect(v.candidates[0].selectedAirportIcao).toBe("WSSS");
  expect(v.providerCalls).toBe(0);
  expect(v.dbWrites).toBe(0);
  expect(v.paidGetDispatched).toBe(false);
  expect(v.phase6GoGrantedHere).toBe(false);
  expect(v.sourceRangeAndSevenRestCategoriesNotCertifiedHere).toBe(true);
 });
 it("refuses too-close-to-GitHub-dispatch, expired, and too-early rather than fabricating PRE",()=>{
  for(const [delta,status] of [
   [106,"TOO_EARLY_FOR_REVIEWED_PREARM"],
   [14,"TOO_LATE_FOR_SAFE_SCHEDULED_DISPATCH"],
   [-2,"MISSED_DISPATCH_CUTOFF_NO_BACKFILL"]
  ] as const){
   const v=classifyP5SignedUpcomingSourceQueue(
    [row()],scope,instant(start-delta*60_000));
   expect(v.candidates[0].status).toBe(status);
  }
 });
 it("does not replay previously prearmed, physically reserved or bound original",()=>{
  for(const changed of [
   {existing_prearm_sha256:sha("0")},
   {existing_attempt_sha256:sha("1")},
   {existing_original_population_query_id:"12345678-1234-4234-9234-123456789012"},
   {state:"ACTIVE",github_run_id:"1234567890"}
  ]){
   const z=classifyP5SignedUpcomingSourceQueue(
    [row(changed)],scope,instant(start-60*60_000));
   expect(z.candidates[0].status).toBe(
    "PREARMED_OR_RESERVED_REQUIRES_SEPARATE_READBACK");
  }
  const stopped=classifyP5SignedUpcomingSourceQueue(
   [row({state:"STOPPED"})],scope,instant(start-60*60_000));
  expect(stopped.candidates[0].status).toBe("ALREADY_STOPPED_NO_DISPATCH");
 });
 it("accepts the existing source one-GET dotted query-key grammar",()=>{
  const result=classifyP5SignedUpcomingSourceQueue(
   [row({query_key:"P5.D01_WSSS:T24-PART01"})],
   scope,instant(start-60*60_000));
  expect(result.candidates[0].status)
   .toBe("DUE_SOON_REVIEW_REQUIRED_NO_PAID_DISPATCH");
 });
 it("refuses swapped signed manifest/source provider/release, duplicates and altered budget units",()=>{
  for(const changed of [
   {manifest_sha256:sha("f")},
   {rights_review_sha256:sha("f")},
   {reviewed_release_sha256:sha("f")},
   {provider_contract_sha256:sha("f")},
   {api_units_per_attempt:3},
   {max_physical_attempts:2},
   {airport_icao:"WSSX "},
   {github_run_id:"1"}
  ]){
   expect(()=>classifyP5SignedUpcomingSourceQueue(
    [row(changed)],scope,instant(start-60*60_000)))
    .toThrow("ALTERED_QUERY_SCOPE_OR_DUPLICATE_SOURCE_DIGEST");
  }
  expect(()=>classifyP5SignedUpcomingSourceQueue(
   [row(),row()],scope,instant(start-60*60_000)))
   .toThrow("ALTERED_QUERY_SCOPE_OR_DUPLICATE_SOURCE_DIGEST");
  expect(()=>classifyP5SignedUpcomingSourceQueue(
   [row({hard_latest_dispatch_utc:instant(start+15*60_000)})],
   scope,instant(start-60*60_000)))
   .toThrow("INVALID_OR_LATE_PRE_CUTOFF_GEOMETRY");
 });
 it("actual source role readback opens one REPEATABLE READ READ ONLY transaction only",async()=>{
  const sql:string[]=[];
  const client={
   query:async(text:string)=>{
    sql.push(text);
    if(text.startsWith("SELECT current_database()"))
     return {rowCount:1,rows:[{
      db:"neondb",actor:P5_STAGE28_GROUPS.source,ro:"on",
      replica:false,now:new Date(start-60*60_000)
     }]};
    if(text===P5_SOURCE_UPCOMING_METADATA_SQL)
     return {rowCount:1,rows:[row()]};
    return {rowCount:0,rows:[]};
   },
   release:()=>sql.push("RELEASE")
  };
  const result=await auditP5UpcomingSourceQueue({
   connect:async()=>client
  } as any,scope);
  expect(result.candidates[0].status).toBe(
   "DUE_SOON_REVIEW_REQUIRED_NO_PAID_DISPATCH");
  expect(sql[0]).toBe(
   "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(sql.includes("COMMIT")).toBe(true);
  expect(sql.at(-1)).toBe("RELEASE");
  expect(sql.some(t=>/\b(?:INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(t)))
   .toBe(false);
  expect(P5_SOURCE_UPCOMING_METADATA_SQL).toContain(
   "phase5_fids_github_prearm_v39");
  expect(P5_SOURCE_UPCOMING_METADATA_SQL).not.toContain(
   "phase5_fids_exact_query_partition_v39");
 });
 it("refuses writable, replica or application identity and ROLLBACKs read-only tx",async()=>{
  for(const change of [{ro:"off"},{actor:"app_role"},{replica:true}]){
   let rolled=false;
   const c={
    query:async(q:string)=>{
     if(q==="ROLLBACK")rolled=true;
     if(q.startsWith("SELECT current_database()"))
      return {rowCount:1,rows:[{db:"neondb",
       actor:P5_STAGE28_GROUPS.source,ro:"on",replica:false,
       now:new Date(start-60*60_000),...change}]};
     return {rowCount:0,rows:[]};
    },release:()=>{}
   };
   await expect(auditP5UpcomingSourceQueue({
    connect:async()=>c
   } as any,scope)).rejects.toThrow(
    "UNREVIEWED_SOURCE_ROLE_OR_WRITABLE_DATABASE");
   expect(rolled).toBe(true);
  }
 });
});
describe("GitHub source due queue observer remains inert before separate release",()=>{
 const env={
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"schedule",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"f".repeat(40),
  V39_P5_QUEUE_APPROVED_CODE_SHA:"f".repeat(40),
  ADB_AUTO_COLLECT:"0",AERODATABOX_API_KEY:"",
  V39_P5_SOURCE_QUEUE_OWNER_APPROVED:"1",
  V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE6_PROCESS_ARMED:"1",
  V39_P5_MANIFEST_SHA256:scope.expectedManifestSha256,
  V39_P5_RELEASE_SHA256:scope.expectedReleaseSha256,
  V39_P5_RIGHTS_SHA256:scope.expectedRightsSha256,
  V39_P5_PROVIDER_CONTRACT_SHA256:
   scope.expectedProviderContractSha256,
  V39_P5_SOURCE_DATABASE_URL:
   "postgresql://phase5_p5_source_login_20261108:ci@localhost/neondb"
 } as NodeJS.ProcessEnv;
 it("admits only already commissioned source login with signed separate future GO",()=>{
  const r=admitP5GitHubSourceQueueObserver(env);
  expect(r.scope.expectedSourceRole).toBe(P5_STAGE28_GROUPS.source);
  expect(r.sourceConnectionString).toContain("phase5_p5_source_login_20261108");
 });
 it("rejects unreviewed run, production credentials, and omitted scientific rights/GO",()=>{
  for(const change of [
   {GITHUB_REF:"refs/pull/527/merge"},
   {GITHUB_EVENT_NAME:"pull_request"},
   {GITHUB_RUN_ATTEMPT:"2"},
   {V39_P5_QUEUE_APPROVED_CODE_SHA:"a".repeat(40)},
   {V39_PHASE5_FREEZE_SIGNED:"0"},
   {V39_PHASE5_SOURCE_RIGHTS_APPROVED:"0"},
   {V39_PHASE6_PROCESS_ARMED:"0"},
   {V39_P5_SOURCE_QUEUE_OWNER_APPROVED:"0"},
   {ADB_AUTO_COLLECT:"1"},
   {AERODATABOX_API_KEY:"never-present"}
  ]){
   expect(()=>admitP5GitHubSourceQueueObserver({...env,...change}))
    .toThrow("UNSIGNED_PROSPECTIVE_MAIN_OR_SOURCE_USE_GO");
  }
  expect(()=>admitP5GitHubSourceQueueObserver({
   ...env,DATABASE_URL:env.V39_P5_SOURCE_DATABASE_URL
  })).toThrow("APPLICATION_SOURCE_ROLE_REUSE");
 });
});
