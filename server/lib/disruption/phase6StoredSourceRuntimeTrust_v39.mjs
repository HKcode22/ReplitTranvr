/**
 * Stable approved study trust is distinct from every changing signed wire.
 * GH secret is constant for reviewed code/manifest/calendar/rights/release
 * and keys; no user-provided workflow input is a signer trust anchor.
 * Exact main changes require a deliberate release review, not auto-pinning.
 */
import {createHash,createPublicKey} from "node:crypto";
const SHA=/^[a-f0-9]{64}$/;
const CODE=/^[a-f0-9]{40}$/;
const LOGIN=/^phase6_private_reader_login_[a-z0-9_]{6,50}$/;
const fail=c=>{throw Error("HOLD_P6_STORED_SOURCE_TRUST_"+c);};
const fields=["independentStudyTrustPinsApproved","expectedReaderSessionLogin",
 "reviewedCodeSha","manifestSha256","calendarSha256","releaseSha256","rightsSha256",
 "dayReviewerFingerprintSha256","dayReviewerPublicKeyPem",
 "queryReviewerFingerprintSha256","queryReviewerPublicKeyPem"];
export function readP6StableSourceTrust(env){
 if(env?.P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED!=="1")
  fail("SEPARATE_STORED_MODE_APPROVAL_REQUIRED");
 const raw=env.P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64;
 if(typeof raw!=="string"||raw.length<16||raw.length>16000||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(raw))
  fail("MISSING_BOUNDED_TRUST");
 let t;
 try{
  const b=Buffer.from(raw,"base64");
  if(b.length>12000||b.toString("base64")!==raw)fail("NONCANONICAL_TRUST");
  t=JSON.parse(b.toString("utf8"));
 }catch{fail("INVALID_TRUST_JSON");}
 if(!t||Array.isArray(t)||Object.keys(t).sort().join("|")!==fields.slice().sort().join("|")||
    t.independentStudyTrustPinsApproved!==true||
    !LOGIN.test(t.expectedReaderSessionLogin??"")||
    !CODE.test(t.reviewedCodeSha??"")||t.reviewedCodeSha!==env.GITHUB_SHA||
    t.manifestSha256!==env.V39_P5_MANIFEST_SHA256||
    t.releaseSha256!==env.V39_P5_RELEASE_SHA256||
    t.rightsSha256!==env.V39_P5_RIGHTS_SHA256||
    ![t.manifestSha256,t.calendarSha256,t.releaseSha256,t.rightsSha256,
      t.dayReviewerFingerprintSha256,t.queryReviewerFingerprintSha256].every(x=>typeof x==="string"&&SHA.test(x)))
  fail("DRIFTED_STABLE_STUDY_PINS");
 for(const lane of ["day","query"]){
  try{
   const pem=t[lane+"ReviewerPublicKeyPem"];
   if(typeof pem!=="string"||pem.length>4096||
      !pem.startsWith("-----BEGIN PUBLIC KEY-----"))
    fail("NOT_PUBLIC_KEY_ONLY");
   const key=createPublicKey(pem);
   if(key.asymmetricKeyType!=="ed25519"||
      createHash("sha256").update(key.export({format:"der",type:"spki"})).digest("hex")!==
        t[lane+"ReviewerFingerprintSha256"])
    fail("WRONG_APPROVED_SIGNER");
  }catch{fail("INVALID_PINNED_PUBLIC_KEY");}
 }
 return Object.freeze(t);
}
// Only the original real SOURCE due-queue observer can supply these rows.
// Select the earliest cutoff days; disclose remaining due days, never
// silently substitute a guessed calendar day or an old packet.
export function selectP6DueSourceDays(scan){
 if(scan?.schema!=="v39.phase5.github-upcoming-source-queue-observer.v1"||
    scan.providerCalls!==0||scan.databaseWrites!==0||
    scan.externalGithubDispatches!==0||scan.signedDaySourceBatch!==null||
    scan.signedPacketHandoff!==null||
    !Array.isArray(scan.candidates)||scan.candidates.length!==scan.observedQueries||
    scan.candidates.length>700||!SHA.test(scan.manifestSha256??""))
  fail("ORIGINAL_SOURCE_QUEUE_REQUIRED");
 const seen=new Set(),due=new Map();
 const now=Date.parse(scan.checkedAtDatabaseUtc);
 if(!Number.isFinite(now))fail("INVALID_SOURCE_DB_CLOCK");
 for(const row of scan.candidates){
  if(!row||!SHA.test(row.queryDigestSha256??"")||seen.has(row.queryDigestSha256)||
     !Number.isSafeInteger(row.runDayIndex)||row.runDayIndex<1||row.runDayIndex>31)
   fail("INVALID_OR_DUPLICATE_SOURCE_DUE_ROW");
  seen.add(row.queryDigestSha256);
  if(row.status!=="DUE_SOON_REVIEW_REQUIRED_NO_PAID_DISPATCH")continue;
  const planned=Date.parse(row.plannedDispatchUtc),latest=Date.parse(row.latestDispatchUtc);
  if(!Number.isFinite(planned)||!Number.isFinite(latest)||planned-now<900000||
    planned-now>6300000||planned>=latest)
   fail("ORIGINAL_DUE_WINDOW_DRIFT");
  due.set(row.runDayIndex,Math.min(due.get(row.runDayIndex)??Infinity,latest));
 }
 const all=[...due.entries()].sort((a,b)=>a[1]-b[1]||a[0]-b[0]).map(x=>x[0]);
 return Object.freeze({dayIndices:Object.freeze(all.slice(0,2)),
  deferredDueDayCount:Math.max(0,all.length-2)});
}
const PRIVATE_PLACEHOLDER="PRIVATE_STORED";
export {PRIVATE_PLACEHOLDER as P6_STORED_PRIVATE_PATH_PLACEHOLDER};
export function makeP6StoredSourceChildInputs(proposal,day){
 const s=day?.redactedSummary;
 if(!s||s.runDayIndex!==proposal?.runDayIndex||
    !SHA.test(s.externallySignedDayEpochIndexSha256??"")||
    !Number.isSafeInteger(s.indexRevision)||s.indexRevision<1||s.indexRevision>1024||
    !SHA.test(proposal.queryDigestSha256??"")||
    !SHA.test(proposal.routingIntentSha256??""))
  fail("MISSING_EXACT_SIGNED_CHILD_REVISION");
 return Object.freeze({
  signed_registry_file:PRIVATE_PLACEHOLDER,
  frozen_release_file:PRIVATE_PLACEHOLDER,
  query_digest:proposal.queryDigestSha256,run_day_index:String(proposal.runDayIndex),
  confirm:"ONE_SIGNED_SOURCE_CHILD_MAX_ONE_PAID_GET",
  private_transport:"stored",private_confirm:"ONE_PRIVATE_SOURCE_ORIGINAL_P5_CHILD_SAME_JOB_ONE_GET",
  routing_intent_sha256:proposal.routingIntentSha256,
  day_index_revision:String(s.indexRevision),day_index_sha256:s.externallySignedDayEpochIndexSha256
 });
}

/** POST uses a separate protected reviewer pin; never let the day or SOURCE
 * reviewer stand in for the independent POST review. */
export function readP6StablePostTrust(env){
 const source=readP6StableSourceTrust(env);
 if(env.P6_PRIVATE_POST_STORED_REVIEW_APPROVED!=="1")
  fail("SEPARATE_POST_REVIEW_APPROVAL_REQUIRED");
 const raw=env.P6_PRIVATE_POST_REVIEWER_TRUST_BASE64;
 if(typeof raw!=="string"||raw.length<16||raw.length>8192||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(raw))
  fail("POST_REVIEW_TRUST_MISSING");
 let t;
 try{
  const b=Buffer.from(raw,"base64");
  if(b.toString("base64")!==raw||b.length>6000)fail("POST_REVIEW_TRUST_NONCANONICAL");
  t=JSON.parse(b.toString("utf8"));
 }catch{fail("INVALID_POST_TRUST_JSON");}
 if(!t||Array.isArray(t)||Object.keys(t).sort().join("|")!==
    ["independentPostReviewerPinsApproved","postReviewerFingerprintSha256","postReviewerPublicKeyPem"].sort().join("|")||
    t.independentPostReviewerPinsApproved!==true||
    !SHA.test(t.postReviewerFingerprintSha256??"")||
    [source.dayReviewerFingerprintSha256,source.queryReviewerFingerprintSha256].includes(t.postReviewerFingerprintSha256))
  fail("DISTINCT_POST_REVIEWER_PINS_REQUIRED");
 try{
  const pem=t.postReviewerPublicKeyPem;
  if(typeof pem!=="string"||pem.length>4096||!pem.startsWith("-----BEGIN PUBLIC KEY-----"))
   fail("POST_PUBLIC_KEY_ONLY");
  const pub=createPublicKey(pem);
  if(pub.asymmetricKeyType!=="ed25519"||
     createHash("sha256").update(pub.export({format:"der",type:"spki"})).digest("hex")!==t.postReviewerFingerprintSha256)
   fail("WRONG_POST_SIGNER");
 }catch{fail("INVALID_POST_PUBLIC_KEY");}
 return Object.freeze({...source,...t});
}
