import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,createHash,sign} from "node:crypto";
import {
 mkdtempSync,mkdirSync,writeFileSync,readFileSync,statSync,
 rmSync,existsSync
} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {
 P6_PRIVATE_SOURCE_POST_READ_SCHEMA,P6_SOURCE_POST_REVIEW_SCHEMA,
 P6_SOURCE_POST_REVIEW_AUDIENCE,
 signedP6PrivateSourcePostReviewBytes,
 verifyP6ExternalSourcePostReview,
 readP6PrivateSourcePostOnce,
 materializeP6VerifiedPrivatePacketOnce,
 withP6VerifiedPrivatePacketForExistingChild
} from "../server/lib/disruption/phase6PrivateSourcePostReadOnce_v39.mjs";

const H=(x)=>createHash("sha256").update(x).digest("hex");
const DB_NOW="2026-11-14T02:00:00.000Z";
const reviewedAt="2026-11-14T01:58:00.000Z";
const committedAt="2026-11-14T01:59:00.000Z";
const expiry="2026-11-16T02:00:00.000Z";
const validUntil="2026-11-14T03:00:00.000Z";
const publicKeyPair=generateKeyPairSync("ed25519");
const pem=publicKeyPair.publicKey.export({type:"spki",format:"pem"}).toString();
const keyFp=H(publicKeyPair.publicKey.export({type:"spki",format:"der"}));
function fixture(kind="SOURCE_QUERY_PACKET"){
 const logicalPath=kind==="POST_PACKET"?
  "data-collection/phase5/frozen/post_abcdefgh123.json":
  "data-collection/phase5/frozen/sourceq_abcdefgh123.json";
 const data=Buffer.from(JSON.stringify({
  schema:"synthetic_nonprovider_test_packet",
  payload:"x".repeat(140)
 }));
 const review={
  schema:P6_SOURCE_POST_REVIEW_SCHEMA,
  audience:P6_SOURCE_POST_REVIEW_AUDIENCE,
  kind,logicalPath,contentSha256:H(data),
  reviewedCodeSha:"a".repeat(40),
  manifestSha256:"b".repeat(64),
  rightsSha256:"c".repeat(64),
  runDayIndex:1,shardIndex:1,
  externalReviewEvidenceSha256:"d".repeat(64),
  reviewedAtUtc:reviewedAt,retentionNotAfterUtc:expiry,
  validUntilUtc:validUntil,
  reviewerPublicKeyFingerprintSha256:keyFp
 };
 const wire={
  review,signatureBase64:sign(null,
   signedP6PrivateSourcePostReviewBytes(review),
   publicKeyPair.privateKey).toString("base64")
 };
 const pins={
  privateSourcePostReadOnlyApproved:true,
  independentExternalReviewerSignaturePinsApproved:true,
  expectedKind:kind,expectedLogicalPath:logicalPath,
  expectedContentSha256:H(data),expectedReviewedMainSha:review.reviewedCodeSha,
  expectedManifestSha256:review.manifestSha256,
  expectedRightsSha256:review.rightsSha256,
  expectedExternalReviewEvidenceSha256:review.externalReviewEvidenceSha256,
  expectedReviewerPublicKeyFingerprintSha256:keyFp,
  expectedPrivateSessionLogin:"phase6_private_reader_login_ci_checks",
  expectedRunDayIndex:1,expectedShardIndex:1
 };
 const row={
  logical_path:logicalPath,run_day_index:1,shard_index:1,kind,
  content_sha256:H(data),reviewed_code_sha:review.reviewedCodeSha,
  manifest_sha256:review.manifestSha256,rights_sha256:review.rightsSha256,
  external_review_sha256:review.externalReviewEvidenceSha256,
  externally_reviewed_at_utc:new Date(reviewedAt),
  retention_not_after_utc:new Date(expiry),
  committed_at_utc:new Date(committedAt),payload_bytes:data
 };
 function db({badRole=false,badPayload=false,badTime=false}={}){
  const queries=[];
  return {queries,client:{async query(sql,params=[]){
   queries.push([sql,params]);
   if(sql.startsWith("BEGIN")||sql.startsWith("SET LOCAL")||sql==="ROLLBACK")
    return{rowCount:null,rows:[]};
   if(sql.includes("SELECT current_database() AS db"))
    return{rowCount:1,rows:[{
     db:"neondb",server_version:160016,ro:"on",replica:false,
     actor:badRole?"neondb_owner":"phase6_private_frozen_reader_v39",
     session_login:"phase6_private_reader_login_ci_checks",
     db_now:badTime?new Date("2026-11-18T02:00:00Z"):new Date(DB_NOW),
     can_select:true,can_insert:false,can_update:false,can_delete:false,
     login_enabled:true,login_superuser:false,login_createrole:false,
     group_can_login:false,group_bypass_rls:false
    }]};
   if(sql.includes("FROM phase6_private.frozen_native_packet_v39 WHERE"))
    return{rowCount:1,rows:[{
     ...row,payload_bytes:badPayload?
      Buffer.from(JSON.stringify({tampered:"z".repeat(150)})):data
    }]};
   throw Error("UNEXPECTED_TEST_SQL_ONLY");
  }}};
 }
 return {wire,pins,pem,data,review,row,db};
}
test("external Ed25519 review is exact source/POST path, content and key",()=>{
 for(const kind of ["SOURCE_QUERY_PACKET","POST_PACKET"]){
  const f=fixture(kind);
  const p=verifyP6ExternalSourcePostReview(f.wire,f.pem,f.pins);
  assert.equal(p.ed25519SignatureCryptographicallyVerified,true);
  assert.equal(p.legalSourceRightsCertified,false);
  assert.equal(p.organizationalIndependenceCertified,false);
 }
 const f=fixture();
 for(const changed of [
  {...f.wire,signatureBase64:Buffer.alloc(64).toString("base64")},
  {...f.wire,review:{...f.review,logicalPath:"../../unsafe"}},
  {...f.wire,review:{...f.review,contentSha256:"0".repeat(64)}}
 ])assert.throws(()=>verifyP6ExternalSourcePostReview(
   changed,f.pem,f.pins),/HOLD_P6_PRIVATE_SOURCE_POST_READ_/);
});
test("reject false review pin even when live reviewer signed something",()=>{
 const f=fixture();
 for(const changed of [
  {...f.pins,expectedContentSha256:"e".repeat(64)},
  {...f.pins,expectedReviewerPublicKeyFingerprintSha256:"f".repeat(64)},
  {...f.pins,independentExternalReviewerSignaturePinsApproved:false}
 ])assert.throws(()=>verifyP6ExternalSourcePostReview(
   f.wire,f.pem,changed),/HOLD_P6_PRIVATE_SOURCE_POST_READ_/);
});
test("restricted private-reader authorization is a separate gate from review signature",async()=>{
 const f=fixture();
 for(const bad of [
  {...f.pins,privateSourcePostReadOnlyApproved:false},
  {...f.pins,expectedPrivateSessionLogin:"neondb_owner"}
 ]){
  const db=f.db();
  await assert.rejects(readP6PrivateSourcePostOnce(db.client,bad,
   f.wire,f.pem),/EXPLICIT_PRIVATE_READER_SCOPE_REQUIRED/);
  assert.equal(db.queries.length,0);
 }
});
test("same restricted PG16 READ ONLY transaction, byte SHA and no JSON leak",async()=>{
 for(const kind of ["SOURCE_QUERY_PACKET","POST_PACKET"]){
  const f=fixture(kind),db=f.db();
  const r=await readP6PrivateSourcePostOnce(
   db.client,f.pins,f.wire,f.pem);
  assert.equal(r.redactedSummary.schema,P6_PRIVATE_SOURCE_POST_READ_SCHEMA);
  assert.equal(r.redactedSummary.kind,kind);
  assert.equal(r.redactedSummary.verifiedEd25519Review,true);
  assert.equal(r.redactedSummary.actualPhase6PaidGoCertified,false);
  assert.deepEqual(r.privateBytes,f.data);
  assert(!JSON.stringify(r).includes("synthetic_nonprovider_test_packet"));
  assert(!JSON.stringify(r).includes("abcdefgh123"));
  assert(db.queries.some(([q])=>q==="ROLLBACK"));
  assert(db.queries.some(([q])=>q.startsWith("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")));
  assert(db.queries.some(([q,ps])=>q.includes("WHERE logical_path=$1 AND kind=$2")&&
   ps[0]===f.pins.expectedLogicalPath&&ps[1]===kind));
  assert(!db.queries.some(([q])=>/^\s*(INSERT|UPDATE|DELETE|COMMIT|ALTER|DROP)/.test(q)));
 }
});
test("bad role, expired source or tampered raw payload fails with rollback",async()=>{
 const f=fixture();
 for(const bad of [{badRole:true},{badPayload:true},{badTime:true}]){
  const db=f.db(bad);
  await assert.rejects(readP6PrivateSourcePostOnce(
   db.client,f.pins,f.wire,f.pem),/HOLD_P6_PRIVATE_SOURCE_POST_READ_/);
  assert(db.queries.some(([q])=>q==="ROLLBACK"));
 }
});
test("forged signature must fail BEFORE opening DB or asking provider",async()=>{
 const f=fixture();
 const db=f.db();
 const bad={...f.wire,signatureBase64:Buffer.alloc(64).toString("base64")};
 await assert.rejects(readP6PrivateSourcePostOnce(db.client,f.pins,
  bad,f.pem),/HOLD_P6_PRIVATE_SOURCE_POST_READ_/);
 assert.equal(db.queries.length,0);
});
test("one ephemeral gitignored local output is 0600, no overwrite, cleanup",async()=>{
 const f=fixture("POST_PACKET"),d=f.db(),r=await readP6PrivateSourcePostOnce(
  d.client,f.pins,f.wire,f.pem);
 const root=mkdtempSync(join(tmpdir(),"p6-private-test-"));
 try{
  mkdirSync(join(root,"data-collection","phase5"),{recursive:true});
  writeFileSync(join(root,".gitignore"),"/data-collection/phase5/frozen/\n");
  assert.throws(()=>materializeP6VerifiedPrivatePacketOnce(r,root),
   /HOLD_P6_PRIVATE_SOURCE_POST_READ_/);
  const out=materializeP6VerifiedPrivatePacketOnce(r,root,{
   privateEphemeralFileApproved:true
  });
  const full=join(root,out.pathRelativeToRepo);
  assert.deepEqual(readFileSync(full),f.data);
  assert.equal(statSync(full).mode&0o777,0o600);
  assert.throws(()=>materializeP6VerifiedPrivatePacketOnce(r,root,{
   privateEphemeralFileApproved:true
  }),/HOLD_P6_PRIVATE_SOURCE_POST_READ_/);
  out.cleanup();
  assert.equal(existsSync(full),false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test("no supported path accepts arbitrary repo output or edited bytes",async()=>{
 const f=fixture(),d=f.db(),r=await readP6PrivateSourcePostOnce(
  d.client,f.pins,f.wire,f.pem);
 const root=mkdtempSync(join(tmpdir(),"p6-private-test-"));
 try{
  mkdirSync(join(root,"data-collection","phase5"),{recursive:true});
  writeFileSync(join(root,".gitignore"),"other/\n");
  assert.throws(()=>materializeP6VerifiedPrivatePacketOnce(r,root,{
   privateEphemeralFileApproved:true
  }),/GIT_IGNORE_NOT_ENFORCED/);
  assert.equal(existsSync(join(root,f.pins.expectedLogicalPath)),false);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test("same-process separately admitted child always cleans private SOURCE or POST file",async()=>{
 for(const kind of ["SOURCE_QUERY_PACKET","POST_PACKET"]){
  const f=fixture(kind),d=f.db(),r=await readP6PrivateSourcePostOnce(
   d.client,f.pins,f.wire,f.pem);
  const root=mkdtempSync(join(tmpdir(),"p6-child-clean-test-"));
  try{
   mkdirSync(join(root,"data-collection","phase5"),{recursive:true});
   writeFileSync(join(root,".gitignore"),"/data-collection/phase5/frozen/\n");
   const scope={
    privateEphemeralFileApproved:true,
    existingChildIndependentlyAdmitted:true,
    privateSourcePostAccessOnly:true
   };
   let fileSeen;
   const good=await withP6VerifiedPrivatePacketForExistingChild(
    r,root,scope,async(relative,summary)=>{
      fileSeen=join(root,relative);
      assert.deepEqual(readFileSync(fileSeen),f.data);
      assert.equal(summary.kind,kind);
      assert.equal(summary.actualPhase6PaidGoCertified,false);
      // No real provider, SQL mutation or paid child invoked by unit tests.
    });
   assert.equal(good.mandatoryPrivateFileCleanupAttempted,true);
   assert.equal(existsSync(fileSeen),false);
   await assert.rejects(withP6VerifiedPrivatePacketForExistingChild(
    r,root,scope,async(relative)=>{
      fileSeen=join(root,relative);
      assert.equal(existsSync(fileSeen),true);
      throw new Error("secret provider bytes must never reach logs");
    }),/EXISTING_CHILD_OPERATION_OR_PRIVATE_CLEANUP_HOLD_REDACTED/);
   assert.equal(existsSync(fileSeen),false);
  }finally{rmSync(root,{recursive:true,force:true});}
 }
});
test("cannot materialize and invoke child without explicit distinct admission",async()=>{
 const f=fixture(),d=f.db(),r=await readP6PrivateSourcePostOnce(
  d.client,f.pins,f.wire,f.pem);
 const root=mkdtempSync(join(tmpdir(),"p6-child-admission-test-"));
 try{
  mkdirSync(join(root,"data-collection","phase5"),{recursive:true});
  writeFileSync(join(root,".gitignore"),"/data-collection/phase5/frozen/\n");
  let called=false;
  await assert.rejects(withP6VerifiedPrivatePacketForExistingChild(
   r,root,{privateEphemeralFileApproved:true,
    existingChildIndependentlyAdmitted:false,
    privateSourcePostAccessOnly:true},async()=>{called=true;}),
    /EXISTING_CHILD_INDEPENDENT_ADMISSION_REQUIRED/);
  assert.equal(called,false);
  assert.equal(existsSync(join(root,f.pins.expectedLogicalPath)),false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
