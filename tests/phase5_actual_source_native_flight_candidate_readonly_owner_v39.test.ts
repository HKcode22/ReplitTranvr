import {describe,it,expect} from "vitest";
import {admitP5ActualNativeSourceReviewEnv,
 auditP5RealSourceToNativeFlightCandidatesReadonly,
 type P5PgReadonlyClient,type P5PgReadonlyPool}
 from "../scripts/v39_phase5_actual_source_native_flight_candidate_readonly_owner_v39";
import type {P5ActualSourceCandidateScope}
 from "../server/lib/disruption/phase5ActualSourceNativeFlightCandidateAudit_v39";
import {P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";

const h=(v:string)=>v.repeat(64);
const clock=new Date("2027-02-10T05:00:00.000Z");
const queryId="a23e4567-e89b-42d3-a456-426614174000";
const env=():NodeJS.ProcessEnv=>({
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"e".repeat(40),
 V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA:"e".repeat(40),
 P5_ACTUAL_NATIVE_SOURCE_READONLY_CONFIRM:
  "REVIEW_ONLY_ACTUAL_BOUND_SOURCE_NATIVE_FLIGHT_CANDIDATES_NO_GO",
 V39_P5_ACTUAL_NATIVE_REVIEW_OWNER_APPROVED:"1",
 V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",ADB_AUTO_COLLECT:"0",
 AERODATABOX_API_KEY:"",AERODATABOX_WEBHOOK_SECRET:"",
 DATABASE_URL:"",V39_DATABASE_RUNTIME_URL:"",
 V39_P5_SOURCE_DATABASE_URL:"",P5_V39_T24_WITNESS_DATABASE_URL:"",
 P5_V39_OTHER_REST_REVIEW_DATABASE_URL:"",
 P5_V39_OTHER_REST_RESERVE_DATABASE_URL:"",
 V39_PHASE6_PROCESS_ARMED:"0",
 V39_P5_ACTUAL_SOURCE_GITHUB_RUN_ID:"42899999999",
 V39_P5_MANIFEST_SHA256:h("1"),V39_P5_QUERY_DIGEST:h("2"),
 V39_P5_RELEASE_SHA256:h("3"),V39_P5_RIGHTS_SHA256:h("4"),
 V39_P5_PROVIDER_CONTRACT_SHA256:h("5"),
 V39_P5_ACTUAL_SOURCE_EARLY_DRAW_SHA256:h("6"),
 P5_ACTUAL_SOURCE_RUN_DAY_INDEX:"4",P5_ACTUAL_SOURCE_SLOT:"HUB",
 P5_ACTUAL_SOURCE_HORIZON:"T-6h",
 P5_ACTUAL_SOURCE_AIRPORT_ICAO:"WSSS",
 P5_ACTUAL_SOURCE_MAX_STALENESS_SECONDS:"7200",
 P5_V39_PRE_DATABASE_URL:
  "postgresql://phase5_p30_pre_login_20261107:test@localhost:5432/neondb"
});
function fixture():{
 scope:P5ActualSourceCandidateScope;
 original:Record<string,unknown>;
 member:Record<string,unknown>;
}{
 const {scope}=admitP5ActualNativeSourceReviewEnv(env());
 const original={
  manifest_sha256:scope.manifestSha256,
  run_day_index:4,slot_id:"HUB",horizon:"T-6h",
  airport_icao:"WSSS",github_run_id:scope.expectedSourceGithubRunId,
  state:"ACTIVE",early_draw_sha256:scope.earlyDrawSha256,
  reviewed_release_sha256:scope.reviewedReleaseSha256,
  rights_review_sha256:scope.rightsReviewSha256,
  provider_contract_sha256:scope.providerContractSha256,
  service_window_start_utc:new Date("2027-02-10T11:00:00.000Z"),
  service_window_end_utc:new Date("2027-02-10T13:00:00.000Z"),
  attempt_run_id:scope.expectedSourceGithubRunId,
  reserved_at:new Date("2027-02-10T04:29:00.000Z"),
  population_query_id:queryId,original_response_hash:h("a"),
  bound_rights:scope.rightsReviewSha256,
  source_expires_at_utc:new Date("2027-02-10T10:00:00.000Z"),
  normalized_members_count:1,
  bound_at_utc:new Date("2027-02-10T04:31:00.000Z"),
  source_available:new Date("2027-02-10T04:30:00.000Z"),
  fids_retrieval_utc:new Date("2027-02-10T04:29:15.000Z"),
  raw_persisted_at_utc:new Date("2027-02-10T04:29:20.000Z"),
  fids_response_hash:h("a"),fids_airport_icao:"WSSS",
  original_current:true
 };
 const member={
  population_query_id:queryId,
  analytic_identity_id:"leg:fixture:native-one",
  canonical_flight_instance_id:"leg:fixture:native-one",
  source_airport_icao:"WSSS",dep_airport_icao:"WSSS",
  population_role:"requested_airport_primary",
  scope_classification:"confirmed_core",
  codeshare_resolution_status:"confirmed_operating_leg",
  source_type:"fids",response_hash:h("a"),
  provider_content_expired_at_utc:null,
  available_at:new Date("2027-02-10T04:30:10.000Z"),
  dep_scheduled_utc:new Date("2027-02-10T12:00:00.000Z"),
  population_member_id:"member-one",
  flight_number:"AB123",arr_airport_icao:"OMAA",
  query_direction:"Departure"
 };
 return{scope,original,member};
}
function fakePool(options?:{
 actor?:string;source?:Record<string,unknown>[];
 members?:Record<string,unknown>[];
 tooMany?:boolean;
}){
 const f=fixture(),sql:string[]=[];
 let released=false;
 const client:P5PgReadonlyClient={
  async query(statement,args){
   sql.push(statement);
   if(statement.includes("current_user AS actor"))
    return{rowCount:1,rows:[{
     actor:options?.actor??P5_STAGE28_GROUPS.pre,
     db:"neondb",ro:"on",replica:false,now:clock
    }]};
   if(statement.includes("FROM clean.phase5_fids_allowed_query_v39"))
    return{rowCount:options?.source?.length??1,
     rows:options?.source??[f.original]};
   if(statement.includes("FROM clean.flight_population p"))
    return{rowCount:options?.tooMany?2501:
      options?.members?.length??1,
     rows:options?.tooMany?
      Array.from({length:2501},()=>f.member):
      options?.members??[f.member]};
   return{rowCount:0,rows:[]};
  },release(){released=true;}
 };
 const pool:P5PgReadonlyPool={async connect(){return client;}};
 return{pool,sql,wasReleased:()=>released};
}
describe("real restricted role SOURCE member audit owner, no paid or PRE",()=>{
 it("admits independently signed manual GH read-only, without Phase6 GO",()=>{
  const p=admitP5ActualNativeSourceReviewEnv(env());
  expect(p.scope.horizon).toBe("T-6h");
  expect(p.scope.runDayIndex).toBe(4);
  expect(p.scope.expectedSourceGithubRunId).toBe("42899999999");
  expect(p.connectionString).toContain("phase5_p30_pre_login");
 });
 it("rejects unapproved rights, provider, Phase6 arming and other roles",()=>{
  for(const change of [
   {GITHUB_EVENT_NAME:"schedule"},
   {GITHUB_REF:"refs/pull/1/merge"},
   {GITHUB_RUN_ATTEMPT:"2"},
   {V39_PHASE5_SOURCE_RIGHTS_APPROVED:"0"},
   {V39_PHASE6_PROCESS_ARMED:"1"},
   {AERODATABOX_API_KEY:"should-not-appear"},
   {P5_V39_OTHER_REST_RESERVE_DATABASE_URL:"cross-role"},
   {V39_P5_ACTUAL_NATIVE_REVIEW_OWNER_APPROVED:"0"}
  ])expect(()=>admitP5ActualNativeSourceReviewEnv({...env(),...change}))
    .toThrow("MAIN_REVIEW_ONLY_RIGHTS_OR_SOURCE_RUN_NOT_SIGNED");
  expect(()=>admitP5ActualNativeSourceReviewEnv({
   ...env(),P5_V39_PRE_DATABASE_URL:
     "postgresql://application:pw@localhost/neondb"
  })).toThrow("SOURCE_NATIVE_REVIEW_CANNOT_USE_APPLICATION_OR_OTHER_ROLE");
 });
 it("uses authenticated real read-only transaction and bounded source-member SQL",async()=>{
  const f=fakePool(),scope=fixture().scope;
  const r=await auditP5RealSourceToNativeFlightCandidatesReadonly(
   f.pool,scope);
  expect(r.candidateCount).toBe(1);
  expect(r.candidates[0].flightInstanceId).toBe("leg:fixture:native-one");
  expect(r.signedPrePacketsCreated).toBe(0);
  expect(r.providerCalls).toBe(0);
  expect(f.sql[0]).toContain("READ ONLY");
  expect(f.sql.some(s=>s.includes("FROM clean.flight_population p")))
   .toBe(true);
  expect(f.sql.at(-1)).toBe("ROLLBACK");
  expect(f.sql.every(s=>!s.includes("INSERT INTO"))).toBe(true);
  expect(f.wasReleased()).toBe(true);
 });
 it("holds and rolls back if original never committed or duplicated",async()=>{
  for(const n of [0,2]){
   const a=fixture().original;
   const f=fakePool({source:n===0?[]:[a,a]});
   await expect(auditP5RealSourceToNativeFlightCandidatesReadonly(
    f.pool,fixture().scope))
    .rejects.toThrow("SOURCE_ORIGINAL_ABSENT_OR_AMBIGUOUS_NO_BACKFILL");
   expect(f.sql.at(-1)).toBe("ROLLBACK");
   expect(f.wasReleased()).toBe(true);
  }
 });
 it("denies incorrect SQL effective role before any original/source read",async()=>{
  const f=fakePool({actor:P5_STAGE28_GROUPS.source});
  await expect(auditP5RealSourceToNativeFlightCandidatesReadonly(
   f.pool,fixture().scope))
   .rejects.toThrow("ACTUAL_PG16_PRE_ONLY_READONLY_IDENTITY_UNVERIFIED");
  expect(f.sql.some(s=>s.includes("FROM clean.flight_population p")))
   .toBe(false);
  expect(f.sql.at(-1)).toBe("ROLLBACK");
 });
 it("fails above 2500 members instead of truncating a busy HUB",async()=>{
  const f=fakePool({tooMany:true});
  await expect(auditP5RealSourceToNativeFlightCandidatesReadonly(
   f.pool,fixture().scope))
   .rejects.toThrow("SOURCE_POPULATION_EXCEEDS_REVIEW_CAP_NO_SILENT_TRUNCATION");
  expect(f.sql.at(-1)).toBe("ROLLBACK");
 });
});
