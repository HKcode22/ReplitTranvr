import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
 P6_INDEX_REVIEW_SCHEMA,P6_INDEX_REVIEW_AUDIENCE,
 p6SignedIndexReviewPreimage
} from "../server/lib/disruption/phase6PrivateSignedIndexReadOnce_v39.mjs";
import {hydrateP6SignedIndexAndFullRegistryHandoffsReadOnly,
 P6_PRIVATE_FULL_REGISTRY_BRIDGE_SCHEMA}
 from "../server/lib/disruption/phase6PrivateSignedIndexRegistryInMemoryHandoff_v39.mjs";
const H=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const keys=generateKeyPairSync("ed25519");
const fp=H(keys.publicKey.export({format:"der",type:"spki"}));
const pem=keys.publicKey.export({format:"pem",type:"spki"}).toString();
const reviewed="2026-11-14T01:59:50.000Z";
const now="2026-11-14T02:00:00.000Z";
const later="2026-11-14T02:00:01.000Z";
const expires="2026-11-14T03:00:00.000Z";
const valid="2026-11-14T02:20:00.000Z";
const manifest="a".repeat(64),calendar="b".repeat(64),
 release="c".repeat(64),rights="d".repeat(64),
 evidence="e".repeat(64),code="f".repeat(40);
const root="data-collection/phase5/frozen/";
function fixture(){
 const packet=(day:number)=>({
  schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:manifest,runDayIndex:day,
  entries:[{
   filePath:root+"sourceq_packet_"+day+"_synthetic.json",
   expectedPacketSha256:H("synthetic packet "+day),
   expectedQueryDigestSha256:H("synthetic query "+day)
  }]
 });
 const p1=root+"source_abcdefgh123.json";
 const p2=root+"source_ijklmnop456.json";
 const b1=Buffer.from(JSON.stringify(packet(1)));
 const b2=Buffer.from(JSON.stringify(packet(2)));
 const e=(day:number,filePath:string,bytes:Buffer,publishedAtUtc:string)=>({
  lane:"SOURCE",runDayIndex:day,shardIndex:1,
  filePath,fileSha256:H(bytes),publishedAtUtc,
  notBeforeUtc:"2026-11-14T01:59:55.000Z",
  hardLatestUtc:"2026-11-14T02:30:00.000Z",
  reviewEvidenceSha256:evidence,
  sourceRegistryFilePath:null,sourceRegistrySha256:null
 });
 const e1=e(1,p1,b1,"2026-11-14T01:59:30.000Z");
 const e2=e(2,p2,b2,"2026-11-14T01:59:40.000Z");
 const index=(revision:number,entries:unknown[],previousIndexSha256:string|null)=>({
  schema:"v39.phase5.phase6-append-only-day-shard-index.v1",
  manifestSha256:manifest,calendarSha256:calendar,
  reviewedCodeSha:code,reviewedReleaseSha256:release,
  reviewedRightsSha256:rights,revision,previousIndexSha256,
  entries
 });
 const prev=index(1,[e1],null);
 const prevRaw=Buffer.from(JSON.stringify(prev));
 const current=index(2,[e1,e2],H(prevRaw));
 const currentRaw=Buffer.from(JSON.stringify(current));
 const review={
  schema:P6_INDEX_REVIEW_SCHEMA,audience:P6_INDEX_REVIEW_AUDIENCE,
  indexRevision:2,indexSha256:H(currentRaw),
  previousIndexSha256:H(prevRaw),reviewedCodeSha:code,
  manifestSha256:manifest,calendarSha256:calendar,
  releaseSha256:release,rightsSha256:rights,
  externalReviewEvidenceSha256:evidence,
  reviewedAtUtc:reviewed,validUntilUtc:valid,
  retentionNotAfterUtc:expires,
  reviewerPublicKeyFingerprintSha256:fp
 };
 const reviewWire={
  review,
  signatureBase64:sign(null,p6SignedIndexReviewPreimage(review),
   keys.privateKey).toString("base64")
 };
 const pins={
  independentExternalReviewerSignaturePinsApproved:true,
  privateIndexReadOnlyApproved:true,
  existingPaidGithubDispatchApproved:false,
  expectedReaderSessionLogin:"phase6_private_reader_login_ci_checks",
  expectedIndexRevision:2,expectedIndexSha256:H(currentRaw),
  expectedPreviousIndexSha256:H(prevRaw),
  expectedReviewedCodeSha:code,
  expectedManifestSha256:manifest,
  expectedCalendarSha256:calendar,
  expectedReleaseSha256:release,
  expectedRightsSha256:rights,
  expectedExternalReviewEvidenceSha256:evidence,
  expectedReviewerPublicKeyFingerprintSha256:fp
 };
 const indexRow=(revision:number,bytes:Buffer,prior:string|null)=>({
  revision,previous_index_sha256:prior,
  content_sha256:H(bytes),reviewed_code_sha:code,
  manifest_sha256:manifest,calendar_sha256:calendar,
  release_sha256:release,rights_sha256:rights,
  external_review_sha256:evidence,
  externally_reviewed_at_utc:new Date(reviewed),
  retention_not_after_utc:new Date(expires),
  committed_at_utc:new Date("2026-11-14T01:59:45Z"),
  payload_bytes:bytes
 });
 const registryRow=(entry:typeof e1,bytes:Buffer)=>({
  logical_path:entry.filePath,run_day_index:entry.runDayIndex,
  shard_index:entry.shardIndex,kind:"SOURCE_DAY_REGISTRY",
  content_sha256:entry.fileSha256,
  reviewed_code_sha:code,manifest_sha256:manifest,
  rights_sha256:rights,external_review_sha256:evidence,
  externally_reviewed_at_utc:new Date("2026-11-14T01:59:20Z"),
  retention_not_after_utc:new Date(expires),
  committed_at_utc:new Date("2026-11-14T01:59:25Z"),
  payload_bytes:bytes
 });
 const rows=[registryRow(e1,b1),registryRow(e2,b2)];
 function db({
  badRegistrySha=false,missingOne=false,wrongRole=false,
  cutoffClockDrift=false,oldExpiry=false,
  fakeFlightContents=false,tooLarge=false,
  forgedReviewer=false
 }={}){
  const queries:string[]=[];
  const client={async query(sql:string){
   queries.push(sql);
   if(sql.startsWith("BEGIN")||sql.startsWith("SET LOCAL")||
      sql==="ROLLBACK")return{rowCount:null,rows:[]};
   if(sql.startsWith("SELECT current_database() AS db")){
    const first=sql.includes("login_role.rolcanlogin");
    const auth={
     db:"neondb",version:160016,ro:"on",replica:false,
     actor:wrongRole?"neondb_owner":"phase6_private_frozen_reader_v39",
     login:"phase6_private_reader_login_ci_checks",
     db_now:new Date(first?now:cutoffClockDrift?
       "2026-11-14T02:05:00Z":later),
     select_index:true,insert_index:false,update_index:false,
     delete_index:false,select_packet:true,insert_packet:false,
     login_enabled:true,login_superuser:false,
     login_createrole:false,login_bypassrls:false,
     group_login:false,group_superuser:false,group_bypassrls:false,
     read_index:true,write_index:false,
     read_packets:true,write_packets:false,
     update_packets:false,delete_packets:false
    };
    return{rowCount:1,rows:[auth]};
   }
   if(sql.includes("FROM phase6_private.signed_day_shard_index_revision_v39 WHERE revision=ANY")){
    return{rowCount:2,rows:[
     indexRow(2,currentRaw,H(prevRaw)),
     indexRow(1,prevRaw,null)]};
   }
   if(sql.startsWith("SELECT count(*)::integer AS n,COALESCE(sum(octet_length(payload_bytes))")){
    const selected=missingOne?rows.slice(0,-1):rows;
    return{rowCount:1,rows:[{n:selected.length,
     bytes:tooLarge?String(40*1024*1024):
      String(selected.reduce((s,r)=>s+r.payload_bytes.length,0))}]};
   }
   if(sql.startsWith("SELECT logical_path,run_day_index,shard_index,kind,")){
    const selected=(missingOne?rows.slice(0,-1):rows).map(x=>({...x}));
    if(badRegistrySha)selected[1].content_sha256="0".repeat(64);
    if(oldExpiry)selected[0].retention_not_after_utc=
      new Date("2026-11-14T01:59:59Z");
    if(fakeFlightContents){
     selected[0].payload_bytes=Buffer.from(JSON.stringify({
      schema:"CI_FORGED_FLIGHT_NOT_SOURCE_REGISTRY",x:"X".repeat(150)
     }));
     selected[0].content_sha256=H(selected[0].payload_bytes);
    }
    return{rowCount:selected.length,rows:selected};
   }
   throw Error("UNEXPECTED_OFFLINE_SQL");
  }};
  return{client,queries};
 }
 return{db,reviewWire,pins,p1,p2,reviewed,prevRaw,currentRaw,b1,b2};
}
describe("V0096 PRIVATE in-memory 31-day index/registry bridge (NO GO)",()=>{
 it("authenticates independent Ed25519 current/prior, two exact committed SOURCE registries, Day1/Day2 and redaction",async()=>{
  const f=fixture(),db=f.db();
  const out=await hydrateP6SignedIndexAndFullRegistryHandoffsReadOnly({
   client:db.client,reviewPins:f.pins,reviewWire:f.reviewWire,
   reviewerPublicKeyPem:pem
  });
  expect(out.redactedSummary.currentIndexRevision).toBe(2);
  expect(out.redactedSummary.verifiedRegistryCount).toBe(2);
  expect(out.redactedSummary.selectedRouteCount).toBe(2);
  expect(out.redactedSummary.lanes[0].proposed).toBe(2);
  expect(out.redactedSummary.githubChildDispatches).toBe(0);
  expect(out.redactedSummary.phase6PaidGo).toBe(false);
  expect(out.redactedSummary.privateRegistryBytesWereNeverWrittenToCheckout)
   .toBe(true);
  const json=JSON.stringify(out);
  for(const x of [f.p1,f.p2,"sourceq_packet","SYNTHETIC_TEST",
   "source_abcdefgh123"])expect(json).not.toContain(x);
  expect([...out.privateRegistryBytes.keys()]).toEqual([f.p1,f.p2]);
  expect(out.privateRoutingCandidates.map((x:any)=>x.runDayIndex))
   .toEqual([1,2]);
  expect(db.queries.filter(x=>x.startsWith("BEGIN")).length).toBe(2);
  expect(db.queries.filter(x=>x==="ROLLBACK").length).toBe(2);
  expect(db.queries.some(x=>/^\s*(COMMIT|INSERT|DELETE|UPDATE)/.test(x)))
   .toBe(false);
 });
 it("refuses missing/tampered/retention-expired rows, fake Source JSON, overbudget transfer and stale DB clock",async()=>{
  const f=fixture();
  for(const settings of [
   {badRegistrySha:true},{missingOne:true},{wrongRole:true},
   {cutoffClockDrift:true},{oldExpiry:true},
   {fakeFlightContents:true},{tooLarge:true}
  ]){
   const d=f.db(settings);
   await expect(hydrateP6SignedIndexAndFullRegistryHandoffsReadOnly({
    client:d.client,reviewPins:f.pins,reviewWire:f.reviewWire,
    reviewerPublicKeyPem:pem
   })).rejects.toThrow(/HOLD_P6_|REFUSED_P5_PHASE6_/);
   expect(d.queries.filter(x=>x==="ROLLBACK").length).toBeGreaterThan(0);
   expect(d.queries.some(x=>x==="COMMIT")).toBe(false);
  }
 });
 it("refuses paid child admission and invalid signature before PostgreSQL",async()=>{
  const f=fixture();
  for(const option of [
   {reviewPins:{...f.pins,existingPaidGithubDispatchApproved:true}},
   {reviewPins:{...f.pins,privateIndexReadOnlyApproved:false}},
   {reviewWire:{...f.reviewWire,signatureBase64:
     Buffer.alloc(64).toString("base64")}}
  ]){
   const d=f.db();
   await expect(hydrateP6SignedIndexAndFullRegistryHandoffsReadOnly({
    client:d.client,reviewPins:f.pins,reviewWire:f.reviewWire,
    reviewerPublicKeyPem:pem,...option
   })).rejects.toThrow(/HOLD_P6_/);
   expect(d.queries.length).toBe(0);
  }
 });
});
