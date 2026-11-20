/** Actual PostgreSQL16 mailbox tests use disposable original V0094-V0101
 * schema and real restricted reader/publisher roles. Keys/receipts are CI-only. */
import {describe,it,expect} from "vitest";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {Client} from "pg";
import {p7ReviewPath,p7RecoveryFencePath,verifyP7StoredWire,publishP7PrivateSignedReviewOnce,readP7PrivateSignedReviews,type P7ReviewSelector} from "../server/lib/disruption/phase7PrivateSignedReviewTransport_v39";
import {hashPhase7DurableCandidate} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
const h=(s:string)=>createHash("sha256").update(s).digest("hex");
const pre=generateKeyPairSync("ed25519"),post=generateKeyPairSync("ed25519");
const publicPin=(k:typeof pre)=>createHash("sha256").update(k.publicKey.export({type:"spki",format:"der"})).digest("hex");
const pub=(k:typeof pre)=>Buffer.from(k.publicKey.export({type:"spki",format:"pem"})).toString("base64");
const wire=(x:unknown,k:typeof pre)=>{const raw=Buffer.from(JSON.stringify(x));return {payloadBase64:raw.toString("base64"),signatureBase64:sign(null,raw,k.privateKey).toString("base64")}};
const readerLogin="phase6_private_reader_login_ci_epoch",publisherLogin="phase6_private_publisher_login_ci_epoch";
const code="c".repeat(40),manifest=h("ci manifest"),rights=h("ci rights"),prePolicy=h("ci pre"),postPolicy=h("ci post");
const trust={expectedReaderSessionLogin:readerLogin,expectedPublisherSessionLogin:publisherLogin,env:{ADB_AUTO_COLLECT:"0",GITHUB_SHA:code,V39_P5_APPROVED_CODE_SHA:code,
 V39_P5_MANIFEST_SHA256:manifest,V39_P5_RIGHTS_SHA256:rights,P6_PHASE7_PRIVATE_REVIEW_TRANSPORT_APPROVED:"1",P6_PHASE7_PRIVATE_REVIEW_PUBLISH_APPROVED:"1",
 P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256:prePolicy,P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256:publicPin(pre),P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64:pub(pre),
 P6_PHASE7_POST_PRESERVATION_POLICY_SHA256:postPolicy,P6_PHASE7_POST_OUTCOME_REVIEWER_FINGERPRINT_SHA256:publicPin(post),P6_PHASE7_POST_OUTCOME_REVIEWER_PUBLIC_KEY_BASE64:pub(post)}};
function fixtures(now:number){
 const issuedAtUtc=new Date(now-5000).toISOString(),validUntilUtc=new Date(now+90000).toISOString(),clock=new Date(now).toISOString();
 const a:P7ReviewSelector={kind:"PRE_PROOF",runDayIndex:31,scopeSha256:h("permit")};
 const b:P7ReviewSelector={kind:"POST_RECOVERY",runDayIndex:31,scopeSha256:h("committed")};
 const postScope={committedPostSha256:h("committed"),anchorSha256:h("anchor"),fragmentsSha256:h("fragments")};
 const c:P7ReviewSelector={kind:"POST_SETTLEMENT",runDayIndex:31,scopeSha256:hashPhase7DurableCandidate(postScope)};
 const prePayload={schema:"v39.phase7.separate-pre-field-proof.v1",manifestSha256:manifest,rightsSha256:rights,policySha256:prePolicy,permitSha256:a.scopeSha256,issuedAtUtc,validUntilUtc,fields:[]};
 const recoveryPayload={schema:"v39.phase7.committed-post-recovery-receipt.v2",policySha256:postPolicy,originalAvailableAtUtc:new Date(now-10000).toISOString(),committedScopeSha256:b.scopeSha256,originalAuditSha256:h("audit"),originalAuditAtUtc:issuedAtUtc,reviewedAtUtc:issuedAtUtc,validUntilUtc};
 const settlementPayload={schema:"v39.phase7.exact-post-group-settlement.v1",manifestSha256:manifest,rightsSha256:rights,policySha256:postPolicy,...postScope,reviewedAtUtc:issuedAtUtc,validUntilUtc,scope:{synthetic:true}};
 return {clock,validUntilUtc,a,b,c,prePayload,recoveryPayload,settlementPayload,aw:wire(prePayload,pre),bw:wire(recoveryPayload,post),cw:wire(settlementPayload,post)};
}
it("authenticates exact signed scope, separate key, study and short-lived clock before storage",()=>{
 const f=fixtures(Date.parse("2027-01-01T00:00:00.000Z"));
 for(const [s,w] of [[f.a,f.aw],[f.b,f.bw],[f.c,f.cw]] as const)expect(verifyP7StoredWire(trust,s,w,f.clock).wire).toEqual(w);
 expect(new Set([f.a,f.b,f.c].map(p7ReviewPath).concat(p7RecoveryFencePath(f.b))).size).toBe(4);
 expect(()=>verifyP7StoredWire(trust,f.b,wire({...f.recoveryPayload,originalAvailableAtUtc:"2026-12-31T23:45:00.000Z"},post),f.clock)).toThrow("RECOVERY_ORIGINAL_WINDOW");
 expect(()=>verifyP7StoredWire(trust,f.a,wire(f.prePayload,post),f.clock)).toThrow("SIGNATURE");
 expect(()=>verifyP7StoredWire(trust,f.a,wire({...f.prePayload,manifestSha256:h("foreign")},pre),f.clock)).toThrow("EXACT_SIGNED_SCOPE");
 expect(()=>verifyP7StoredWire(trust,f.b,f.bw,f.validUntilUtc)).toThrow("LIVE_REVIEW");
 expect(verifyP7StoredWire(trust,f.b,f.bw,f.clock).storageKind).toBe("PHASE7_RECOVERY_RECEIPT");
 expect(()=>verifyP7StoredWire(trust,f.b,wire({...f.recoveryPayload,flightInstanceId:"unexpected source content"},post),f.clock)).toThrow("RECOVERY_METADATA_ONLY");
 expect(()=>verifyP7StoredWire(trust,f.b,wire({...f.recoveryPayload,originalAuditSha256:"not-a-digest"},post),f.clock)).toThrow("RECOVERY_METADATA_ONLY");
 expect(()=>verifyP7StoredWire(trust,{...f.c,scopeSha256:h("wrong")},f.cw,f.clock)).toThrow("EXACT_SIGNED_SCOPE");
 expect(()=>verifyP7StoredWire({...trust,env:{...trust.env,P6_PHASE7_PRIVATE_REVIEW_TRANSPORT_APPROVED:"0"}},f.a,f.aw,f.clock)).toThrow("PROTECTED_STUDY");
});
const url="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const active=process.env.P6_POST_OUTCOME_DISPOSABLE_PG16==="1"?describe:describe.skip;
active("real private custody signed-review transport",()=>{
 it("publishes immutable exact wires and independently reads them via restricted roles, no fallback",async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||process.env.DATABASE_URL!==url||process.env.V39_DATABASE_RUNTIME_URL!==url||
     process.env.AERODATABOX_API_KEY||process.env.RAPIDAPI_KEY||process.env.ADB_AUTO_COLLECT!=="0"||process.env.V39_PHASE6_PROCESS_ARMED!=="0")throw Error("DISPOSABLE_ONLY");
  const reader=new Client({connectionString:"postgresql://"+readerLogin+":ci-only-day-read@localhost:5432/neondb?sslmode=disable"});
  const publisher=new Client({connectionString:"postgresql://"+publisherLogin+":ci-only-day-pub@localhost:5432/neondb?sslmode=disable"});
  try{
   await reader.connect();await publisher.connect();await reader.query("SET ROLE phase6_private_frozen_reader_v39");await publisher.query("SET ROLE phase6_private_frozen_publisher_v39");
   const now=(await reader.query("SELECT clock_timestamp() AS at")).rows[0].at.getTime(),f=fixtures(now);
   for(const [s,w] of [[f.a,f.aw],[f.b,f.bw],[f.c,f.cw]] as const){
    const args={client:publisher,reader,trust,selector:s,wire:w};
    expect(await publishP7PrivateSignedReviewOnce(args)).toMatchObject({status:"P7_SIGNED_WIRE_COMMITTED_INDEPENDENT_READBACK_NO_GO",providerCalls:0});
    await expect(publishP7PrivateSignedReviewOnce(args)).rejects.toThrow("ALREADY_PRESENT_READ_ONLY_RECONCILE");
   }
   expect([...(await readP7PrivateSignedReviews(reader,trust,[f.a,f.b,f.c])).values()]).toEqual([f.aw,f.bw,f.cw]);
   const q=await reader.query("SELECT count(*)::int AS n FROM phase6_private.frozen_native_packet_v39 WHERE kind IN ('PHASE7_SIGNED_REVIEW','PHASE7_RECOVERY_RECEIPT') AND retention_not_after_utc=$1::timestamptz",[f.validUntilUtc]);expect(q.rows[0].n).toBe(3);
   const kinds=await reader.query("SELECT kind,count(*)::int n FROM phase6_private.frozen_native_packet_v39 WHERE kind IN ('PHASE7_SIGNED_REVIEW','PHASE7_RECOVERY_RECEIPT') GROUP BY kind ORDER BY kind");expect(kinds.rows).toEqual([{kind:"PHASE7_RECOVERY_RECEIPT",n:1},{kind:"PHASE7_SIGNED_REVIEW",n:2}]);
   await expect(readP7PrivateSignedReviews(reader,trust,[{...f.a,scopeSha256:h("absent")}])).rejects.toThrow("MISSING_EXACT_REVIEW_NO_FALLBACK");
   await expect(readP7PrivateSignedReviews(publisher,trust,[f.a])).rejects.toThrow();
   await expect(publisher.query("UPDATE phase6_private.frozen_native_packet_v39 SET retention_not_after_utc=clock_timestamp()+interval '1 day' WHERE logical_path=$1",[p7ReviewPath(f.a)])).rejects.toThrow();
   await expect(reader.query("DELETE FROM phase6_private.frozen_native_packet_v39 WHERE logical_path=$1",[p7ReviewPath(f.a)])).rejects.toThrow();
   // Simulate the original short-lived receipt being physically deleted,
   // keeping the independently read immutable issuance fence. A fresh wire
   // for the same original must never get a second committed receipt.
   const owner=new Client({connectionString:url});
   try{
    await owner.connect();
    const q2=await owner.query("SELECT kind,retention_not_after_utc,payload_bytes FROM phase6_private.frozen_native_packet_v39 WHERE logical_path=$1",[p7RecoveryFencePath(f.b)]);
    expect(q2.rows[0].kind).toBe("PHASE7_RECOVERY_FENCE");
    expect(q2.rows[0].retention_not_after_utc.toISOString()).toBe(new Date(Date.parse(f.recoveryPayload.originalAvailableAtUtc)+600000).toISOString());
    expect(q2.rows[0].payload_bytes.toString()).not.toContain(f.bw.payloadBase64);
    await owner.query("DELETE FROM phase6_private.frozen_native_packet_v39 WHERE logical_path=$1",[p7ReviewPath(f.b)]);
    await expect(readP7PrivateSignedReviews(reader,trust,[f.b])).rejects.toThrow("RECOVERY_PREVIOUSLY_ISSUED_NO_REISSUE");
    await expect(publishP7PrivateSignedReviewOnce({client:publisher,reader,trust,selector:f.b,wire:f.bw})).rejects.toThrow("ALREADY_PRESENT_READ_ONLY_RECONCILE");
   }finally{await owner.end()}
   console.log("P7_PRIVATE_SIGNED_REVIEW_REAL_PG16_EXACT_READBACK_PASS_SYNTHETIC_ONLY");
  }finally{await Promise.allSettled([reader.end(),publisher.end()])}
 },30000);
});
