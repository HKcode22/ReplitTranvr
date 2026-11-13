import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
 admitP5Phase6ShardReadOnlyObserver,
 runP5Phase6ShardIndexReadOnlyObserver
} from "../scripts/v39_phase5_phase6_append_only_shard_index_readonly_observer_v39";
const H=(s:string)=>createHash("sha256").update(s).digest("hex");
const code="f".repeat(40);
const a="a".repeat(64),b="b".repeat(64),c="c".repeat(64),d="d".repeat(64);
const root="data-collection/phase5/frozen/";
const p1=root+"phase6_source_day1_shard1.json";
const p2=root+"phase6_source_day2_shard1.json";
const idx=root+"phase6_index_revision1.json";
const prev=root+"phase6_index_revision2.json";
const observed="2027-02-10T00:36:00.000Z";
const record=(day:number)=>({
 schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
 manifestSha256:a,runDayIndex:day,
 entries:[{
  filePath:root+`source_packet_day${day}_signed.json`,
  expectedPacketSha256:H(`source-packet-day${day}`),
  expectedQueryDigestSha256:H(`source-query-day${day}`)
 }]
});
const json=(x:unknown)=>Buffer.from(JSON.stringify(x));
type Storage=Map<string,Buffer>;
function fixture(){
 const files:Storage=new Map();
 files.set(p1,json(record(1)));
 files.set(p2,json(record(2)));
 const e=(day:number,file:string,publishedAtUtc:string,notBeforeUtc:string,hardLatestUtc:string)=>({
  lane:"SOURCE" as const,runDayIndex:day,shardIndex:1,filePath:file,
  fileSha256:H(files.get(file)!.toString()),
  publishedAtUtc,notBeforeUtc,hardLatestUtc,
  reviewEvidenceSha256:d,sourceRegistryFilePath:null,sourceRegistrySha256:null
 });
 const one=e(1,p1,"2027-02-09T22:00:00.000Z",
  "2027-02-09T23:15:00.000Z","2027-02-10T00:40:00.000Z");
 const two=e(2,p2,"2027-02-09T22:10:00.000Z",
  "2027-02-10T00:15:00.000Z","2027-02-10T01:40:00.000Z");
 const release=(entries:unknown[],revision:number,parent:string|null)=>({
  schema:"v39.phase5.phase6-append-only-day-shard-index.v1",
  manifestSha256:a,calendarSha256:b,reviewedCodeSha:code,
  reviewedReleaseSha256:c,reviewedRightsSha256:d,
  revision,previousIndexSha256:parent,entries
 });
 const first=json(release([one,two],1,null));
 files.set(idx,first);
 const env:Record<string,string>={
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,
  P5_SHARD_INDEX_RO_CODE_SHA:code,
  P5_SHARD_INDEX_RO_EXECUTE:"0", // enabled explicitly only during each case
  P5_SHARD_INDEX_RO_CONFIRM:
    "READ_ONLY_PINNED_SHARDS_NO_PROVIDER_NO_DISPATCH",
  P5_SHARD_INDEX_RO_MANUAL_MAIN_SHA:code,
  ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",
  V39_PHASE6_OWNER_APPROVED:"0",
  P5_SHARD_INDEX_RO_INDEX_FILE:idx,
  P5_SHARD_INDEX_RO_PRIOR_INDEX_FILE:"",
  P5_SHARD_INDEX_RO_PRIOR_INDEX_SHA256:"",
  P5_SHARD_INDEX_RO_CURRENT_SHA256:H(first.toString()),
  P5_SHARD_INDEX_RO_EXTERNAL_REVIEW_SHA256:H(first.toString()),
  P5_SHARD_INDEX_RO_MANIFEST_SHA256:a,
  P5_SHARD_INDEX_RO_CALENDAR_SHA256:b,
  P5_SHARD_INDEX_RO_RELEASE_SHA256:c,
  P5_SHARD_INDEX_RO_RIGHTS_SHA256:d,
  V39_P5_SOURCE_DATABASE_URL:
    "postgresql://phase5_p5_source_login_20261108:synthetic_password@localhost/neondb?sslmode=verify-full"
 };
 return{files,env,first,release,one,two};
}
const read=(files:Storage)=>(path:string)=>{
 const v=files.get(path);
 if(!v)throw Error("NO_SYNTHETIC_SIGNED_FILE");
 return v;
};
describe("default-OFF real PG-clock SHA-pinned Phase6 shard read-only observer",()=>{
 it("is inert without explicit manual confirmation or reviewed exact code",()=>{
  const {env}=fixture();
  for(const [key,value] of Object.entries({
    P5_SHARD_INDEX_RO_EXECUTE:"0",
    P5_SHARD_INDEX_RO_CONFIRM:"WRONG",
    GITHUB_SHA:"e".repeat(40),
    V39_PHASE6_PROCESS_ARMED:"1",
    V39_PHASE6_OWNER_APPROVED:"1",
    AERODATABOX_API_KEY:"forbidden",
    DATABASE_URL:"postgresql://neondb_owner:password@host/neondb",
    GITHUB_TOKEN:"forbidden",
    GITHUB_REF:"refs/heads/feature",
    P5_SHARD_INDEX_RO_MANUAL_MAIN_SHA:"e".repeat(40)
  })){
   expect(()=>admitP5Phase6ShardReadOnlyObserver(
    {...env,P5_SHARD_INDEX_RO_EXECUTE:"1",[key]:value}
   )).toThrow("NOT_EXACT_MAIN_STOP_DEFAULT_NO_PAID_READONLY");
  }
 });
 it("validates exact source login and independently distinct indexed hashes",()=>{
  const {env}=fixture();
  expect(admitP5Phase6ShardReadOnlyObserver({
   ...env,P5_SHARD_INDEX_RO_EXECUTE:"1"
  }).filePath).toBe(idx);
  for(const [key,value,error] of [
    ["V39_P5_SOURCE_DATABASE_URL",
     "postgresql://neondb_owner:pass@host/neondb",
     "WRONG_EXISTING_RESTRICTED_SOURCE_LOGIN"],
    ["P5_SHARD_INDEX_RO_EXTERNAL_REVIEW_SHA256",
     "e".repeat(64),"MISSING_DISTINCT_EXTERNAL_INDEX_PIN_OR_RELEASE_DIGEST"],
    ["P5_SHARD_INDEX_RO_INDEX_FILE","../etc/passwd",
     "UNREVIEWED_INDEX_OR_PREVIOUS_FILE_PATH"],
    ["P5_SHARD_INDEX_RO_PRIOR_INDEX_FILE",prev,
     "UNREVIEWED_INDEX_OR_PREVIOUS_FILE_PATH"]
  ] as const){
   expect(()=>admitP5Phase6ShardReadOnlyObserver({
    ...env,P5_SHARD_INDEX_RO_EXECUTE:"1",[key]:value
   })).toThrow(error);
  }
 });
 it("read-only observer selects 2 overlapping true signed SOURCE days",async()=>{
  const {env,files}=fixture();
  let calls=0;
  const result=await runP5Phase6ShardIndexReadOnlyObserver(
   {...env,P5_SHARD_INDEX_RO_EXECUTE:"1"},
   read(files),async(conn)=>{
    calls++;
    expect(conn).toContain("phase5_p5_source_login_20261108");
    return observed;
   }
  );
  expect(calls).toBe(1);
  expect(result.status).toBe(
   "P5_PHASE6_ACTUAL_CLOCK_PINNED_SHARDS_READONLY_NO_DISPATCH");
  expect(result.dueShardCounts.SOURCE).toBe(2);
  expect(result.selectedForIndependentChildReview.SOURCE).
   toHaveLength(2);
  expect(result.databaseWrites).toBe(0);
  expect(result.githubChildDispatches).toBe(0);
  expect(result.providerCalls).toBe(0);
  expect(result.ownerAuthorizationOrPaidGoGranted).toBe(false);
 });
 it("detects retrospective/expired day 1 while preserving day 2",async()=>{
  const {env,files}=fixture();
  const out=await runP5Phase6ShardIndexReadOnlyObserver(
   {...env,P5_SHARD_INDEX_RO_EXECUTE:"1"},read(files),
   async()=> "2027-02-10T00:55:00.000Z");
  expect(out.missedCensoredShardCounts.SOURCE).toBe(1);
  expect(out.selectedForIndependentChildReview.SOURCE.
   map(e=>e.runDayIndex)).toEqual([2]);
 });
 it("rejects tampered frozen day bytes even when index pin unchanged",async()=>{
  const {env,files}=fixture();
  files.set(p2,Buffer.from('{"tampered":true}'));
  await expect(runP5Phase6ShardIndexReadOnlyObserver(
   {...env,P5_SHARD_INDEX_RO_EXECUTE:"1"},read(files),
   async()=>observed)).rejects.toThrow(
    "UNVERIFIED_FROZEN_REGISTRY_BYTES");
 });
 it("requires the previous signed index for revision 2 and exact append-only previous bytes",async()=>{
  const {env,files,first,release,one,two}=fixture();
  const nextPath=root+"phase6_index_revision2.json";
  const next=json(release([one,two,{
   ...two,lane:"SOURCE",runDayIndex:3,shardIndex:1,
   filePath:root+"phase6_source_day3_shard1.json",
   fileSha256:H(json(record(3)).toString()),
   publishedAtUtc:"2027-02-09T22:20:00.000Z"
  }],2,H(first.toString())));
  files.set(root+"phase6_source_day3_shard1.json",json(record(3)));
  files.set(nextPath,next);
  const good={
   ...env,P5_SHARD_INDEX_RO_EXECUTE:"1",
   P5_SHARD_INDEX_RO_INDEX_FILE:nextPath,
   P5_SHARD_INDEX_RO_PRIOR_INDEX_FILE:idx,
   P5_SHARD_INDEX_RO_PRIOR_INDEX_SHA256:H(first.toString()),
   P5_SHARD_INDEX_RO_CURRENT_SHA256:H(next.toString()),
   P5_SHARD_INDEX_RO_EXTERNAL_REVIEW_SHA256:H(next.toString())
  };
  expect((await runP5Phase6ShardIndexReadOnlyObserver(
   good,read(files),async()=>observed)).revision).toBe(2);
  await expect(runP5Phase6ShardIndexReadOnlyObserver(
   {...good,P5_SHARD_INDEX_RO_PRIOR_INDEX_SHA256:"e".repeat(64)},
   read(files),async()=>observed)).rejects.toThrow(
    "MISSING_EXACT_PREVIOUS_APPEND_ONLY_INDEX");
 });
 it("schedule remains STOP unless separately enabled, then still no child/paid GO",async()=>{
  const {env,files}=fixture();
  expect(()=>admitP5Phase6ShardReadOnlyObserver({
   ...env,P5_SHARD_INDEX_RO_EXECUTE:"1",
   GITHUB_EVENT_NAME:"schedule",P5_SHARD_INDEX_RO_ENABLED:"false"
  })).toThrow("NOT_EXACT_MAIN_STOP_DEFAULT_NO_PAID_READONLY");
  const out=await runP5Phase6ShardIndexReadOnlyObserver({
   ...env,P5_SHARD_INDEX_RO_EXECUTE:"1",
   GITHUB_EVENT_NAME:"schedule",P5_SHARD_INDEX_RO_ENABLED:"true"
  },read(files),async()=>observed);
  expect(out.githubChildDispatches).toBe(0);
 });
});
