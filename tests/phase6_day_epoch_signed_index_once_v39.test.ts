import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
 P6_DAY_EPOCH_REVIEW_SCHEMA,P6_DAY_EPOCH_REVIEW_AUDIENCE,
 p6DayEpochReviewPreimage,verifyP6DayEpochExternalReview,
 validateP6DayEpochIndexBytes,
 publishP6DayEpochIndexRevisionOnce,readP6DayEpochIndexCurrentPriorOnce
} from "../server/lib/disruption/phase6DayEpochSignedIndexOnce_v39.mjs";

const h=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const key=generateKeyPairSync("ed25519");
const pem=key.publicKey.export({format:"pem",type:"spki"}).toString();
const fingerprint=h(key.publicKey.export({format:"der",type:"spki"}));
const repeat=(x:string)=>x.repeat(64);
const clock="2026-11-14T02:15:00.000Z",
 published="2026-11-14T02:00:00.000Z",
 reviewed="2026-11-14T02:10:00.000Z",
 valid="2026-11-14T04:00:00.000Z",
 expire="2026-11-14T05:00:00.000Z",
 code="f".repeat(40),manifest=repeat("a"),calendar=repeat("b"),
 rights=repeat("c"),release=repeat("d"),evidence=repeat("e"),
 reader="phase6_private_reader_login_ci_mock",
 publisher="phase6_private_publisher_login_ci_mock";
type Entry={lane:string,runDayIndex:number,shardIndex:number,
 filePath:string,fileSha256:string,publishedAtUtc:string,
 notBeforeUtc:string,hardLatestUtc:string,
 reviewEvidenceSha256:string,sourceRegistryFilePath:string|null,
 sourceRegistrySha256:string|null};
function source(day:number,shard:number):Entry{
 return{lane:"SOURCE",runDayIndex:day,shardIndex:shard,
  filePath:"data-collection/phase5/frozen/source_day"+day+"_shard"+shard+"_registry.json",
  fileSha256:h(Buffer.from("synthetic-source-"+day+"-"+shard)),
  publishedAtUtc:published,notBeforeUtc:"2026-11-14T02:20:00.000Z",
  hardLatestUtc:"2026-11-14T03:10:00.000Z",
  reviewEvidenceSha256:evidence,sourceRegistryFilePath:null,sourceRegistrySha256:null};
}
function later(src:Entry):Entry{
 return{lane:"LATER_PRE",runDayIndex:src.runDayIndex,shardIndex:3,
  filePath:"data-collection/phase5/frozen/later_day"+src.runDayIndex+"_registry.json",
  fileSha256:h(Buffer.from("synthetic-later-"+src.runDayIndex)),
  publishedAtUtc:published,notBeforeUtc:"2026-11-14T02:30:00.000Z",
  hardLatestUtc:"2026-11-14T03:10:00.000Z",
  reviewEvidenceSha256:evidence,sourceRegistryFilePath:src.filePath,
  sourceRegistrySha256:src.fileSha256};
}
function fixture(day=1,revision=1){
 const a=source(day,1),b=source(day,2);
 const first={
  schema:"v39.phase6.run-day-scoped-append-only-index.v1",
  runDayIndex:day,revision:1,previousIndexSha256:null as string|null,
  manifestSha256:manifest,calendarSha256:calendar,
  reviewedCodeSha:code,reviewedReleaseSha256:release,
  reviewedRightsSha256:rights,entries:[a] as Entry[]
 };
 const priorBytes=Buffer.from(JSON.stringify(first));
 const index=revision===1?first:{
  ...first,revision:2,previousIndexSha256:h(priorBytes),
  entries:[a,b,later(a)]
 };
 const bytes=Buffer.from(JSON.stringify(index));
 const review={
  schema:P6_DAY_EPOCH_REVIEW_SCHEMA,audience:P6_DAY_EPOCH_REVIEW_AUDIENCE,
  runDayIndex:day,indexRevision:revision,indexSha256:h(bytes),
  previousIndexSha256:index.previousIndexSha256,
  reviewedCodeSha:code,manifestSha256:manifest,
  calendarSha256:calendar,releaseSha256:release,
  rightsSha256:rights,externalReviewEvidenceSha256:evidence,
  reviewedAtUtc:reviewed,validUntilUtc:valid,retentionNotAfterUtc:expire,
  reviewerPublicKeyFingerprintSha256:fingerprint
 };
 const wire={review,signatureBase64:sign(null,p6DayEpochReviewPreimage(review),
   key.privateKey).toString("base64")};
 const pins={
  independentExternalReviewerSignaturePinsApproved:true,
  privateDayIndexReadOnlyApproved:true,privateDayIndexPublicationApproved:true,
  expectedReaderSessionLogin:reader,expectedRunDayIndex:day,
  expectedIndexRevision:revision,expectedIndexSha256:h(bytes),
  expectedPreviousIndexSha256:index.previousIndexSha256,
  expectedReviewedCodeSha:code,expectedManifestSha256:manifest,
  expectedCalendarSha256:calendar,expectedReleaseSha256:release,
  expectedRightsSha256:rights,
  expectedExternalReviewEvidenceSha256:evidence,
  expectedReviewerPublicKeyFingerprintSha256:fingerprint
 };
 const scope={
  privateDayIndexStorageApproved:true,
  independentProviderContentsReviewApproved:true,
  existingPaidDispatchApproved:false,
  adbAutoCollect:"0",phase6ProcessArmed:"0",
  expectedPublisherSessionLogin:publisher,
  approvedCodeSha:code,approvedCalendarSha256:calendar,
  approvedRightsSha256:rights,approvedRetentionNotAfterUtc:expire
 };
 const identity=(mode:string,wrong=false,expired=false)=>({
  db:"neondb",version:160016,ro:mode==="publisher"?"off":"on",
  replica:false,actor:wrong?"neondb_owner":
    mode==="publisher"?"phase6_private_frozen_publisher_v39":
      "phase6_private_frozen_reader_v39",
  login:mode==="publisher"?publisher:reader,
  db_now:new Date(expired?"2026-11-18T02:15:00.000Z":clock),
  index_select:true,index_insert:mode==="publisher",
  index_update:false,index_delete:false,
  packet_select:true,packet_insert:mode==="publisher",
  packet_update:false,packet_delete:false,
  login_enabled:true,login_superuser:false,login_createrole:false,
  login_bypassrls:false,group_login:false,group_superuser:false,
  group_bypassrls:false
 });
 const row=(obj:object,raw:Buffer,rev:number)=>({
  run_day_index:day,revision:rev,
  previous_index_sha256:rev===1?null:h(priorBytes),
  content_sha256:h(raw),reviewed_code_sha:code,manifest_sha256:manifest,
  calendar_sha256:calendar,release_sha256:release,rights_sha256:rights,
  external_review_sha256:evidence,externally_reviewed_at_utc:new Date(reviewed),
  retention_not_after_utc:new Date(expire),
  committed_at_utc:new Date("2026-11-14T02:01:00.000Z"),
  payload_bytes:raw
 });
 const prevRow=row(first,priorBytes,1),currentRow=row(index,bytes,revision);
 function mocked(mode:"publisher"|"reader",opts:Record<string,boolean>={}){
  const calls:Array<{sql:string,params:any[]}>=[],marks:string[]=[];
  const client={async query(sql:string,params:any[]=[]){
   calls.push({sql,params});
   if(sql.startsWith("BEGIN")||sql.startsWith("SET LOCAL")||sql==="ROLLBACK")
    return{rowCount:0,rows:[]};
   if(sql==="COMMIT"){
    if(opts.unknownCommit)throw Error("PRIVATE_COMMIT_SECRET_ERROR");
    return{rowCount:0,rows:[]};
   }
   if(sql.includes("SELECT current_database() AS db"))
    return{rowCount:1,rows:[identity(mode,opts.wrongRole,opts.expired)]};
   if(sql.includes("FROM phase6_private.frozen_native_packet_v39 WHERE")){
    const all=index.entries.map(e=>({
     logical_path:e.filePath,
     run_day_index:opts.wrongPacketDay?day+1:day,
     shard_index:e.shardIndex,
     kind:e.lane==="SOURCE"?"SOURCE_DAY_REGISTRY":
      e.lane==="LATER_PRE"?"LATER_PRE_DAY_REGISTRY":"POST_PACKET",
     content_sha256:e.fileSha256,reviewed_code_sha:code,
     manifest_sha256:manifest,rights_sha256:rights,
     external_review_sha256:evidence,
     retention_not_after_utc:new Date(expire),
     committed_at_utc:new Date("2026-11-14T01:58:00.000Z")
    }));
    const rows=opts.missingPacket?all.slice(0,-1):all;
    return{rowCount:rows.length,rows};
   }
   if(sql.startsWith("SELECT COUNT(*)::integer AS n FROM phase6_private.signed_run_day_index_revision_v39"))
    return{rowCount:1,rows:[{n:0}]};
   if(sql.startsWith("SELECT COUNT(*)::integer AS n FROM phase6_private.signed_run_day_epoch_claim_v39"))
    return{rowCount:1,rows:[{n:0}]};
   if(sql.includes("SELECT run_day_index,revision,previous_index_sha256")){
    const prior={
      ...prevRow,
      run_day_index:opts.wrongPriorDay?day+1:day,
      retention_not_after_utc:
       opts.shortPriorTTL?new Date("2026-11-14T02:45:00.000Z"):
        prevRow.retention_not_after_utc
    };
    const rows=mode==="reader"?
      revision===1?[currentRow]:[currentRow,prior]:[prior];
    return{rowCount:rows.length,rows};
   }
   if(sql.startsWith("INSERT INTO phase6_private.signed_run_day_index_revision_v39")){
    marks.push("ONE_SQL_INDEX_INSERT");return{rowCount:1,rows:[]};
   }
   if(sql==="SELECT clock_timestamp() AS db_now")
    return{rowCount:1,rows:[{db_now:new Date("2026-11-14T02:16:00.000Z")}]};
   throw Error("MOCK_UNEXPECTED_SQL");
  }};
  return{client,calls,marks};
 }
 return {review,wire,pins,scope,index,bytes,priorBytes,mocked};
}
describe("Signed day-epoch private reader and publisher — no provider/GO",()=>{
 it("Ed25519 external signature binds separate day, exact byte SHA and legal review fingerprint",()=>{
  const a=fixture(1),b=fixture(2);
  expect(verifyP6DayEpochExternalReview({
    wire:a.wire,publicKeyPem:pem,pins:a.pins
   }).signatureVerified).toBe(true);
  expect(verifyP6DayEpochExternalReview({
    wire:b.wire,publicKeyPem:pem,pins:b.pins
   }).providerContentsOrDerivedWorksRightsCertifiedHere).toBe(false);
  expect(()=>verifyP6DayEpochExternalReview({
    wire:a.wire,publicKeyPem:pem,pins:b.pins
   })).toThrow(/UNPINNED_WRONG_DAY/);
  expect(()=>verifyP6DayEpochExternalReview({
    wire:{...a.wire,review:{...a.review,rightsSha256:repeat("0")}},
    publicKeyPem:pem,pins:a.pins
   })).toThrow(/HOLD_P6_DAY_EPOCH_INDEX_/);
  expect(()=>verifyP6DayEpochExternalReview({
    wire:{...a.wire,signatureBase64:Buffer.alloc(64).toString("base64")},
    publicKeyPem:pem,pins:a.pins
   })).toThrow(/ED25519_DAY_EPOCH_REVIEW_SIGNATURE_INVALID/);
 });
 it("rejects wrong-day later PRE and forged SOURCE registry SHA",()=>{
  const a=fixture(1,2),p=JSON.parse(a.bytes.toString("utf8"));
  expect(validateP6DayEpochIndexBytes(a.bytes,a.review).entries).toHaveLength(3);
  p.entries[2].runDayIndex=2;
  expect(()=>validateP6DayEpochIndexBytes(Buffer.from(JSON.stringify(p)),a.review))
   .toThrow(/CROSS_DAY/);
  p.entries[2].runDayIndex=1;
  p.entries[2].sourceRegistrySha256=repeat("0");
  expect(()=>validateP6DayEpochIndexBytes(Buffer.from(JSON.stringify(p)),a.review))
   .toThrow(/MISSING_OR_CROSS_DAY_SOURCE/);
 });
 it("genesis of day1 and day2 publishes one signed index with 0 paid or child dispatch",async()=>{
  for(const day of [1,2]){
   const a=fixture(day),db=a.mocked("publisher");
   const out=await publishP6DayEpochIndexRevisionOnce({
    client:db.client,pins:a.pins,wire:a.wire,
    publicKeyPem:pem,indexBytes:a.bytes,scope:a.scope
   });
   expect(out.runDayIndex).toBe(day);
   expect(out.phase6PaidGo).toBe(false);
   expect(db.marks).toEqual(["ONE_SQL_INDEX_INSERT"]);
   expect(db.calls.some(x=>x.sql==="COMMIT")).toBe(true);
  }
 });
 it("append within day admits signed SHA-pinned PRE and SOURCE bundle",async()=>{
  const a=fixture(4,2),db=a.mocked("publisher");
  const out=await publishP6DayEpochIndexRevisionOnce({
   client:db.client,pins:a.pins,wire:a.wire,
   publicKeyPem:pem,indexBytes:a.bytes,scope:a.scope
  });
  expect(out.revision).toBe(2);
  expect(out.registryCount).toBe(3);
  expect(db.marks).toHaveLength(1);
 });
 it("reader uses a read-only role and returns hidden verified private bytes",async()=>{
  for(const rev of [1,2]){
   const a=fixture(1,rev),db=a.mocked("reader");
   const out=await readP6DayEpochIndexCurrentPriorOnce({
    client:db.client,pins:a.pins,wire:a.wire,publicKeyPem:pem
   });
   expect(out.redactedSummary.runDayIndex).toBe(1);
   expect(out.redactedSummary.revision).toBe(rev);
   expect(out.currentIndexBytes).toEqual(a.bytes);
   expect(out.previousIndexBytes).toEqual(rev===2?a.priorBytes:null);
   expect(JSON.stringify(out)).not.toContain("source_day");
   expect(db.calls.some(x=>x.sql.startsWith("INSERT"))).toBe(false);
  }
 });
 it("wrong roles, source from another day, missing packet, expired DB clock always hold",async()=>{
  const a=fixture();
  for(const field of ["wrongRole","missingPacket","wrongPacketDay","expired"]){
   const db=a.mocked("publisher",{[field]:true});
   await expect(publishP6DayEpochIndexRevisionOnce({
    client:db.client,pins:a.pins,wire:a.wire,
    publicKeyPem:pem,indexBytes:a.bytes,scope:a.scope
   })).rejects.toThrow(/HOLD_P6_DAY_EPOCH_INDEX_/);
   expect(db.marks).toHaveLength(0);
   expect(db.calls.some(x=>x.sql==="COMMIT")).toBe(false);
  }
 });
 it("reader refuses a prior revision from the wrong parent day",async()=>{
  const a=fixture(1,2),db=a.mocked("reader",{wrongPriorDay:true});
  await expect(readP6DayEpochIndexCurrentPriorOnce({
   client:db.client,pins:a.pins,wire:a.wire,publicKeyPem:pem
  })).rejects.toThrow(/INDEX_ROW_UNKNOWN_EXPIRED_OR_CROSS_DAY/);
  expect(db.calls.some(x=>x.sql==="ROLLBACK")).toBe(true);
 });
 it("predecessor expiry cannot strand later same-day revision",async()=>{
  const a=fixture(1,2);
  const publisherDb=a.mocked("publisher",{shortPriorTTL:true});
  await expect(publishP6DayEpochIndexRevisionOnce({
    client:publisherDb.client,pins:a.pins,wire:a.wire,
    publicKeyPem:pem,indexBytes:a.bytes,scope:a.scope
  })).rejects.toThrow(/PREVIOUS_DAY_REVISION_SHA_OR_EXPIRY/);
  expect(publisherDb.marks).toHaveLength(0);
  const readerDb=a.mocked("reader",{shortPriorTTL:true});
  await expect(readP6DayEpochIndexCurrentPriorOnce({
    client:readerDb.client,pins:a.pins,wire:a.wire,publicKeyPem:pem
  })).rejects.toThrow(/PREDECESSOR_EXPIRES_BEFORE_CURRENT_DAY_INDEX/);
 });
 it("unknown commit is never replayed or reported as success",async()=>{
  const a=fixture(),db=a.mocked("publisher",{unknownCommit:true});
  await expect(publishP6DayEpochIndexRevisionOnce({
   client:db.client,pins:a.pins,wire:a.wire,
   publicKeyPem:pem,indexBytes:a.bytes,scope:a.scope
  })).rejects.toThrow(/UNKNOWN_COMMIT_INDEPENDENT_READBACK_NEVER_REPLAY/);
  expect(db.marks).toHaveLength(1);
  expect(db.calls.filter(x=>x.sql==="COMMIT")).toHaveLength(1);
  expect(db.calls.filter(x=>x.sql==="ROLLBACK")).toHaveLength(0);
 });
 it("scope booleans cannot bypass independent rights, armed STOP or code/calendar drift",async()=>{
  const a=fixture(),db=a.mocked("publisher");
  for(const scope of [
   {...a.scope,independentProviderContentsReviewApproved:false},
   {...a.scope,existingPaidDispatchApproved:true},
   {...a.scope,phase6ProcessArmed:"1"},
   {...a.scope,approvedCalendarSha256:repeat("0")}
  ]){
   await expect(publishP6DayEpochIndexRevisionOnce({
    client:db.client,pins:a.pins,wire:a.wire,
    publicKeyPem:pem,indexBytes:a.bytes,scope
   })).rejects.toThrow(/NO_APPROVED_DAY_EPOCH/);
  }
  expect(db.calls).toHaveLength(0);
 });
});
