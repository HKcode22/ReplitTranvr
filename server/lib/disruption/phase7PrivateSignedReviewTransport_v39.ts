/** Concrete immutable signed-review transport using the existing phase6_private
 * custody, V0106 staged constraint extension. No source data fetch, no new
 * signature, no paid retry or implicit policy approval. Exact wire validity
 * and source expiry are distinct. Recovery wires and fences are operational
 * digest/clock metadata, not reusable source Contents or research outcomes.
 * Their signed access cutoff remains unchanged; cleanup is due immediately
 * at the cutoff. No legal retention extension or proof of physical purge.
 */
import {createHash,createPublicKey,verify} from "node:crypto";
import {Client} from "pg";
import {readP6DayEpochRestrictedReaderClock,readP6DayEpochRestrictedPublisherClock} from "./phase6DayEpochSignedIndexOnce_v39.mjs";
import {hashPhase7DurableCandidate} from "./phase7DurableDerivedBundleCandidate_v39";
import {readPhase7PostReviewerPublicKey,phase7PostFragmentsDigest} from "./phase7SignedPostReview_v39";
import {assertPhase7PreProofMetadataShape,verifyPhase7SignedPreFieldProof,type Phase7SignedPreFieldProofWire} from "./phase7SignedPreFieldProof_v39";
import {parsePhase7ProtectedPrePolicy} from "./phase7ProtectedPreResolver_v39";
import {sameP6NeonDatabaseEndpoint} from "./phase6SameNeonEndpoint_v39";
import type {P5Stage14SingleFlightPrePermit} from "./phase5V0079SingleBoundFlightPreWriter_v39";
import type {P6PostCommittedScope,P6PostPreservationAnchor} from "./phase6ActualPostOutcomeObservability_v39";
import type {Phase7StoredPreFragment} from "./phase7FinalGroupAssembly_v39";
import type {Phase7PrivateOutcomeReviewTransport} from "./phase7SignedPostConsumer_v39";
import type {P5ReviewedFuturePostOneGet} from "./phase5V0083FuturePostOriginalDb_v39";
import type {Phase7RecoveryReceiptCustodyPort} from "./phase7CommittedPostRecovery_v39";
const TABLE="phase6_private.frozen_native_packet_v39";
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const hold=(s:string):never=>{throw Error("HOLD_P7_PRIVATE_REVIEW_TRANSPORT_"+s)};
const sha=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const exact=(x:unknown,k:string[])=>!!x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const at=(s:unknown)=>{if(typeof s!=="string"||!Number.isFinite(Date.parse(s))||new Date(s).toISOString()!==s)return hold("CLOCK");return Date.parse(s)};
const iso=(d:unknown)=>{if(!(d instanceof Date)||!Number.isFinite(d.getTime()))return hold("DATABASE_CLOCK");return d.toISOString()};
const digest=(s:unknown):s is string=>typeof s==="string"&&H.test(s)&&!/^([a-f0-9])\1{63}$/.test(s);
function b64(v:unknown,max:number){if(typeof v!=="string"||v.length>Math.ceil(max/3)*4||!(/^[A-Za-z0-9+/]+={0,2}$/).test(v))return hold("ENCODING");const b=Buffer.from(v,"base64");if(b.length>max||b.toString("base64")!==v)hold("ENCODING");return b}
type DB={query:(sql:string,args?:any[])=>Promise<any>};
export type P7ReviewSelector={kind:"PRE_PROOF"|"POST_RECOVERY"|"POST_SETTLEMENT";runDayIndex:number;scopeSha256:string};
export type P7Wire=Phase7SignedPreFieldProofWire;
export type P7ReviewTrust={env:NodeJS.ProcessEnv;expectedReaderSessionLogin:string;expectedPublisherSessionLogin:string};
export function preProofReviewSelector(p:P5Stage14SingleFlightPrePermit):P7ReviewSelector{return {kind:"PRE_PROOF",runDayIndex:p.runDayIndex,scopeSha256:hashPhase7DurableCandidate(p)}}
export function postRecoveryReviewSelector(s:Readonly<P6PostCommittedScope>):P7ReviewSelector{return {kind:"POST_RECOVERY",runDayIndex:s.packet.runDayIndex,scopeSha256:hashPhase7DurableCandidate(s)}}
export function postSettlementReviewSelector(s:Readonly<P6PostCommittedScope>,a:Readonly<P6PostPreservationAnchor>,f:readonly Phase7StoredPreFragment[]):P7ReviewSelector{return {kind:"POST_SETTLEMENT",runDayIndex:s.packet.runDayIndex,scopeSha256:hashPhase7DurableCandidate({committedPostSha256:hashPhase7DurableCandidate(s),anchorSha256:hashPhase7DurableCandidate(a),fragmentsSha256:phase7PostFragmentsDigest(f)})}}
function validateTrust(t:P7ReviewTrust){
 const e=t?.env;
 if(!e||e.P6_PHASE7_PRIVATE_REVIEW_TRANSPORT_APPROVED!=="1"||
  e.ADB_AUTO_COLLECT!=="0"||e.DATABASE_URL||e.V39_DATABASE_RUNTIME_URL||e.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
  !C.test(e.GITHUB_SHA??"")||e.GITHUB_SHA!==(e.V39_P5_APPROVED_CODE_SHA||e.V39_P5_POST_APPROVED_CODE_SHA)||
  ![e.V39_P5_MANIFEST_SHA256,e.V39_P5_RIGHTS_SHA256].every(digest)||
  !/^phase6_private_reader_login_[a-z0-9_]{6,50}$/.test(t.expectedReaderSessionLogin)||
  !/^phase6_private_publisher_login_[a-z0-9_]{6,50}$/.test(t.expectedPublisherSessionLogin)||
  t.expectedReaderSessionLogin===t.expectedPublisherSessionLogin)hold("PROTECTED_STUDY");
 return e;
}
export function p7ReviewPath(s:P7ReviewSelector){
 if(!s||!["PRE_PROOF","POST_RECOVERY","POST_SETTLEMENT"].includes(s.kind)||!Number.isSafeInteger(s.runDayIndex)||s.runDayIndex<1||s.runDayIndex>31||!digest(s.scopeSha256))hold("SELECTOR");
 return "data-collection/phase5/frozen/p7review_"+sha(JSON.stringify([s.kind,s.runDayIndex,s.scopeSha256]))+".json";
}
export function verifyP7StoredWire(t:P7ReviewTrust,s:P7ReviewSelector,wire:unknown,dbClock:string){
 const env=validateTrust(t),path=p7ReviewPath(s),now=at(dbClock);
 if(!exact(wire,["payloadBase64","signatureBase64"]))return hold("WIRE");
 const w=wire as P7Wire,raw=b64(w.payloadBase64,48000),signature=b64(w.signatureBase64,64);
 let key;
 if(s.kind==="PRE_PROOF"){
  const pem=b64(env.P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64,4096).toString("utf8");
  if(!pem.startsWith("-----BEGIN PUBLIC KEY-----")||!digest(env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256))hold("PRE_REVIEWER");
  key=createPublicKey(pem);
  const fp=sha(key.export({type:"spki",format:"der"}));
  if(fp!==env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256||fp===env.P6_PHASE7_POST_OUTCOME_REVIEWER_FINGERPRINT_SHA256)hold("PRE_REVIEWER");
 }else key=readPhase7PostReviewerPublicKey(env);
 if(key.asymmetricKeyType!=="ed25519"||signature.length!==64||!verify(null,raw,key,signature))hold("SIGNATURE");
 const x=JSON.parse(raw.toString("utf8"));
 // Only digest metadata may enter the PRE mailbox through this publisher.
 // Recheck full permit/policy/selected-value binding at consumption.
 if(s.kind==="PRE_PROOF"){
  if(raw.length>16384)hold("PRE_PROOF_BYTES");
  assertPhase7PreProofMetadataShape(x);
 }
 const schema=s.kind==="PRE_PROOF"?"v39.phase7.separate-pre-field-proof.v1":s.kind==="POST_RECOVERY"?"v39.phase7.committed-post-recovery-receipt.v2":"v39.phase7.exact-post-group-settlement.v1";
 const scope=s.kind==="PRE_PROOF"?x.permitSha256:s.kind==="POST_RECOVERY"?x.committedScopeSha256:hashPhase7DurableCandidate({committedPostSha256:x.committedPostSha256,anchorSha256:x.anchorSha256,fragmentsSha256:x.fragmentsSha256});
 const policy=s.kind==="PRE_PROOF"?env.P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256:env.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256;
 if(x.schema!==schema||!digest(policy)||x.policySha256!==policy||scope!==s.scopeSha256||
  (s.kind!=="POST_RECOVERY"&&(x.manifestSha256!==env.V39_P5_MANIFEST_SHA256||x.rightsSha256!==env.V39_P5_RIGHTS_SHA256)))hold("EXACT_SIGNED_SCOPE");
 const reviewed=s.kind==="PRE_PROOF"?x.issuedAtUtc:x.reviewedAtUtc,from=at(reviewed),until=at(x.validUntilUtc);
 if(from>now||now>=until||until-from>(s.kind==="PRE_PROOF"?86400000:s.kind==="POST_SETTLEMENT"?21600000:600000))hold("LIVE_REVIEW");
 // The receipt remains valid at most two minutes. The separate issuance
 // fence contains only bounded operational metadata, not the signed wire.
 if(s.kind==="POST_RECOVERY"&&(!exact(x,["schema","policySha256","committedScopeSha256","originalAuditSha256","originalAuditAtUtc","originalAvailableAtUtc","reviewedAtUtc","validUntilUtc"])||
  ![x.policySha256,x.committedScopeSha256,x.originalAuditSha256].every(digest)))hold("RECOVERY_METADATA_ONLY");
 const originalAvailable=s.kind==="POST_RECOVERY"?at(x.originalAvailableAtUtc):null;
 if(originalAvailable!==null&&(originalAvailable>at(x.originalAuditAtUtc)||at(x.originalAuditAtUtc)>from||until-from>120000||until>originalAvailable+600000))hold("RECOVERY_ORIGINAL_WINDOW");
 const bytes=Buffer.from(JSON.stringify(w));
 if(bytes.length<100||bytes.length>65000)hold("BYTES");
 return {path,wire:Object.freeze({...w}),bytes,contentSha256:sha(bytes),externalReviewSha256:sha(raw),reviewedAtUtc:reviewed,validUntilUtc:x.validUntilUtc as string,recoveryFenceUntilUtc:originalAvailable===null?null:new Date(originalAvailable+600000).toISOString(),storageKind:s.kind==="POST_RECOVERY"?"PHASE7_RECOVERY_RECEIPT":"PHASE7_SIGNED_REVIEW"};
}
/** Separate path domain; the marker is not a scientific result or a receipt. */
export function p7RecoveryFencePath(s:P7ReviewSelector){
 if(s.kind!=="POST_RECOVERY")hold("FENCE_SELECTOR");p7ReviewPath(s);
 return "data-collection/phase5/frozen/p7review_"+sha(JSON.stringify(["POST_RECOVERY_ISSUED",s.runDayIndex,s.scopeSha256]))+".json";
}
function recoveryFence(s:P7ReviewSelector,w:ReturnType<typeof verifyP7StoredWire>){
 if(s.kind!=="POST_RECOVERY"||!w.recoveryFenceUntilUtc)return hold("FENCE_SELECTOR");
 // No provider body, private anchor, flight ID, signed wire or denominator.
 const bytes=Buffer.from(JSON.stringify({schema:"v39.phase7.operational-recovery-issued-fence.v1",receiptPathSha256:sha(w.path),hardNotAfterUtc:w.recoveryFenceUntilUtc}));
 return {path:p7RecoveryFencePath(s),bytes,contentSha256:sha(bytes),until:w.recoveryFenceUntilUtc};
}
async function checkInstalled(c:DB){
 const z=await c.query("SELECT count(*)::int AS n FROM pg_constraint WHERE conrelid=$1::regclass AND convalidated AND conname='p6_v0101_kind_allowed' AND pg_get_constraintdef(oid) LIKE '%PHASE7_SIGNED_REVIEW%' AND pg_get_constraintdef(oid) LIKE '%PHASE7_RECOVERY_FENCE%' AND pg_get_constraintdef(oid) LIKE '%PHASE7_RECOVERY_RECEIPT%'",[TABLE]);
 if(z.rowCount!==1||z.rows[0]?.n!==1)hold("SCHEMA_NOT_COMMISSIONED");
}
async function readInTx(c:DB,t:P7ReviewTrust,selectors:readonly P7ReviewSelector[],clock:string){
 const e=validateTrust(t),paths=selectors.map(p7ReviewPath);
 if(paths.length<1||paths.length>96||new Set(paths).size!==paths.length)hold("BATCH");
 const z=await c.query("SELECT logical_path,kind,run_day_index,shard_index,reviewed_code_sha,manifest_sha256,rights_sha256,content_sha256,external_review_sha256,externally_reviewed_at_utc,retention_not_after_utc,committed_at_utc,payload_bytes,review_wire_bytes FROM "+TABLE+" WHERE logical_path=ANY($1::text[])",[paths]);
 // Inspect the exact issuance fence in the same snapshot, including when
 // the short-lived signed wire has already been physically removed.
 const recovery=selectors.filter(s=>s.kind==="POST_RECOVERY");
 const fenceRows=recovery.length?(await c.query("SELECT logical_path,kind,run_day_index,shard_index,reviewed_code_sha,manifest_sha256,rights_sha256,content_sha256,external_review_sha256,externally_reviewed_at_utc,retention_not_after_utc,committed_at_utc,payload_bytes,review_wire_bytes FROM "+TABLE+" WHERE logical_path=ANY($1::text[])",[recovery.map(p7RecoveryFencePath)])).rows:[];
 for(const s of recovery){
  const hits=fenceRows.filter((v:any)=>v.logical_path===p7RecoveryFencePath(s));
  const present=z.rows.some((v:any)=>v.logical_path===p7ReviewPath(s));
  if(!present&&hits.length!==0)hold("RECOVERY_PREVIOUSLY_ISSUED_NO_REISSUE");
  if(present&&hits.length!==1)hold("RECOVERY_FENCE_MISSING_OR_AMBIGUOUS");
 }
 if(z.rowCount!==selectors.length||z.rows.length!==selectors.length)hold("MISSING_EXACT_REVIEW_NO_FALLBACK");
 const results=new Map<string,P7Wire>();
 for(let i=0;i<selectors.length;i++){
  const hits=z.rows.filter((v:any)=>v.logical_path===paths[i]),v=hits[0],s=selectors[i];
  if(hits.length!==1||v.kind!==(s.kind==="POST_RECOVERY"?"PHASE7_RECOVERY_RECEIPT":"PHASE7_SIGNED_REVIEW")||v.run_day_index!==s.runDayIndex||v.shard_index!==1||
     v.reviewed_code_sha!==e.GITHUB_SHA||v.manifest_sha256!==e.V39_P5_MANIFEST_SHA256||v.rights_sha256!==e.V39_P5_RIGHTS_SHA256||
     v.review_wire_bytes!==null||!Buffer.isBuffer(v.payload_bytes)||v.payload_bytes.length>65000)hold("ROW_SCOPE");
  const w=verifyP7StoredWire(t,s,JSON.parse(v.payload_bytes.toString("utf8")),clock);
  if(w.path!==v.logical_path||!w.bytes.equals(v.payload_bytes)||w.contentSha256!==v.content_sha256||w.externalReviewSha256!==v.external_review_sha256||
   w.reviewedAtUtc!==iso(v.externally_reviewed_at_utc)||w.validUntilUtc!==iso(v.retention_not_after_utc)||
   at(iso(v.committed_at_utc))<at(w.reviewedAtUtc)||at(iso(v.committed_at_utc))>at(clock))hold("EXACT_DURABLE_WIRE");
  if(s.kind==="POST_RECOVERY"){
   const f=recoveryFence(s,w),v2=fenceRows.find((v:any)=>v.logical_path===f.path);
   if(!v2||v2.kind!=="PHASE7_RECOVERY_FENCE"||v2.run_day_index!==s.runDayIndex||v2.shard_index!==1||
    v2.reviewed_code_sha!==e.GITHUB_SHA||v2.manifest_sha256!==e.V39_P5_MANIFEST_SHA256||v2.rights_sha256!==e.V39_P5_RIGHTS_SHA256||
    v2.review_wire_bytes!==null||!Buffer.isBuffer(v2.payload_bytes)||!v2.payload_bytes.equals(f.bytes)||v2.content_sha256!==f.contentSha256||
    v2.external_review_sha256!==f.contentSha256||iso(v2.externally_reviewed_at_utc)!==w.reviewedAtUtc||iso(v2.retention_not_after_utc)!==f.until||
    at(iso(v2.committed_at_utc))<at(w.reviewedAtUtc)||at(iso(v2.committed_at_utc))>at(clock)||at(clock)>=at(f.until))hold("RECOVERY_FENCE_DRIFT");
  }
  results.set(s.scopeSha256,w.wire);
 }
 if(results.size!==selectors.length)hold("DUPLICATE_SCOPE");
 return results;
}
/** Independent reader transaction; published wire bytes never exposed in logs. */
export async function readP7PrivateSignedReviews(c:DB,t:P7ReviewTrust,selectors:readonly P7ReviewSelector[]){
 validateTrust(t);let tx=false;
 try{await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;await c.query("SET LOCAL statement_timeout='10000ms'");
  const now=await readP6DayEpochRestrictedReaderClock(c,t.expectedReaderSessionLogin);
  await checkInstalled(c);
  const wires=await readInTx(c,t,selectors,now);
  const end=await readP6DayEpochRestrictedReaderClock(c,t.expectedReaderSessionLogin);
  for(const s of selectors)verifyP7StoredWire(t,s,wires.get(s.scopeSha256),end);
  await c.query("ROLLBACK");tx=false;
  return wires;
 }finally{if(tx)await c.query("ROLLBACK").catch(()=>{});}
}
/** Actual already-signed wire publisher, separate role and no provider,
 * owner, reserve, PRE or bundle writer credentials. Never overwrite, never
 * extend a signed expiry; unknown commit must use independent readback. */
export async function publishP7PrivateSignedReviewOnce(input:{client:DB;reader:DB;trust:P7ReviewTrust;selector:P7ReviewSelector;wire:unknown}){
 const {client:c,reader,trust:t,selector:s,wire}=input,e=validateTrust(t);
 if(c===reader||e.P6_PHASE7_PRIVATE_REVIEW_PUBLISH_APPROVED!=="1"||
 Object.entries(e).some(([k,v])=>k.startsWith("P6_PHASE7_")&&k.includes("PRIVATE_KEY")&&v)||
 [e.AERODATABOX_API_KEY,e.RAPIDAPI_KEY,e.AERODATABOX_WEBHOOK_SECRET,e.P5_V39_OTHER_REST_RESERVE_DATABASE_URL,e.P5_V39_OTHER_REST_REVIEW_DATABASE_URL,e.P5_V39_PRE_DATABASE_URL,e.P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL].some(Boolean))hold("PUBLISHER_NO_PAID_SCOPE");
 let tx=false,commitAttempted=false;
 try{await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");tx=true;await c.query("SET LOCAL statement_timeout='10000ms'");await c.query("SET LOCAL lock_timeout='2000ms'");
  const now=await readP6DayEpochRestrictedPublisherClock(c,t.expectedPublisherSessionLogin);await checkInstalled(c);
  const w=verifyP7StoredWire(t,s,wire,now);
  const f=s.kind==="POST_RECOVERY"?recoveryFence(s,w):null;
  const q=await c.query("SELECT count(*)::int AS n FROM "+TABLE+" WHERE logical_path=ANY($1::text[])",[f?[w.path,f.path]:[w.path]]);
  if(q.rowCount!==1||q.rows[0]?.n!==0)hold("ALREADY_PRESENT_READ_ONLY_RECONCILE");
  const z=await c.query("INSERT INTO "+TABLE+" (logical_path,kind,run_day_index,shard_index,reviewed_code_sha,manifest_sha256,rights_sha256,content_sha256,external_review_sha256,externally_reviewed_at_utc,retention_not_after_utc,payload_bytes,review_wire_bytes) VALUES($1,$2,$3,1,$4,$5,$6,$7,$8,$9,$10,$11,NULL)",[w.path,w.storageKind,s.runDayIndex,e.GITHUB_SHA,e.V39_P5_MANIFEST_SHA256,e.V39_P5_RIGHTS_SHA256,w.contentSha256,w.externalReviewSha256,w.reviewedAtUtc,w.validUntilUtc,w.bytes]);
  if(z.rowCount!==1)hold("INSERT_COUNT");
  // Atomic with the immutable receipt: a committed fence survives physical
  // deletion of the short-lived proof until the original read window closes.
  if(f){
   const marker=await c.query("INSERT INTO "+TABLE+" (logical_path,kind,run_day_index,shard_index,reviewed_code_sha,manifest_sha256,rights_sha256,content_sha256,external_review_sha256,externally_reviewed_at_utc,retention_not_after_utc,payload_bytes,review_wire_bytes) VALUES($1,'PHASE7_RECOVERY_FENCE',$2,1,$3,$4,$5,$6,$6,$7,$8,$9,NULL)",[f.path,s.runDayIndex,e.GITHUB_SHA,e.V39_P5_MANIFEST_SHA256,e.V39_P5_RIGHTS_SHA256,f.contentSha256,w.reviewedAtUtc,f.until,f.bytes]);
   if(marker.rowCount!==1)hold("FENCE_INSERT_COUNT");
  }
  verifyP7StoredWire(t,s,wire,await readP6DayEpochRestrictedPublisherClock(c,t.expectedPublisherSessionLogin));
  commitAttempted=true;await c.query("COMMIT");tx=false;
 }catch(err){if(commitAttempted)hold("UNKNOWN_COMMIT_READ_ONLY_RECONCILE");throw err}
 finally{if(tx)await c.query("ROLLBACK").catch(()=>{});}
 const recovered=(await readP7PrivateSignedReviews(reader,t,[s])).get(s.scopeSha256);
 if(!recovered||JSON.stringify(recovered)!==JSON.stringify(wire))hold("INDEPENDENT_READBACK_DRIFT");
 return {status:"P7_SIGNED_WIRE_COMMITTED_INDEPENDENT_READBACK_NO_GO" as const,providerCalls:0 as const,phase6PaidGo:false as const};
}
export function openP7PrivateSignedReviewReader(env:NodeJS.ProcessEnv){
 const trust:P7ReviewTrust={env,expectedReaderSessionLogin:env.P6_PHASE7_PRIVATE_REVIEW_READER_LOGIN??"",expectedPublisherSessionLogin:env.P6_PHASE7_PRIVATE_REVIEW_PUBLISHER_LOGIN??""};
 validateTrust(trust);
 let base:URL,u:URL;
 try{base=new URL(env.V39_P5_SOURCE_DATABASE_URL??"");u=new URL(env.P6_PRIVATE_READER_DATABASE_URL??"")}catch{return hold("RESTRICTED_URL")}
 if(!sameP6NeonDatabaseEndpoint(base,u)||decodeURIComponent(u.username)!==trust.expectedReaderSessionLogin||u.username===base.username||!u.password||
 u.searchParams.getAll("sslmode").length!==1||!["require","verify-full"].includes(u.searchParams.get("sslmode")??"")||
 [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
 (u.searchParams.has("channel_binding")&&(u.searchParams.getAll("channel_binding").length!==1||u.searchParams.get("channel_binding")!=="require")))hold("RESTRICTED_TLS");
 u.searchParams.set("sslmode","verify-full");
 async function read(selectors:readonly P7ReviewSelector[]){
  const c=new Client({connectionString:u.toString(),connectionTimeoutMillis:8000,query_timeout:15000,application_name:"p7_independent_review_reader"});
  try{await c.connect();await c.query("SET ROLE phase6_private_frozen_reader_v39");return await readP7PrivateSignedReviews(c,trust,selectors)}
  finally{await c.end().catch(()=>{})}
 }
 return {read};
}
export function openP7StoredPreProofPort(env:NodeJS.ProcessEnv){
 if(env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||env.AERODATABOX_WEBHOOK_SECRET)hold("PRE_NO_PROVIDER");
 const policy=parsePhase7ProtectedPrePolicy(env),r=openP7PrivateSignedReviewReader(env);
 return {async readExactPermitProofs(permits:readonly P5Stage14SingleFlightPrePermit[]){
  const ids=permits.map(preProofReviewSelector),result=await r.read(ids);
  for(let i=0;i<ids.length;i++)verifyPhase7SignedPreFieldProof(env,permits[i],policy.reviewSha256,policy.dispositions,result.get(ids[i].scopeSha256));
  return result;
 }};
}
/** Recovery-only consumer. readOrRecord is deliberately READ ONLY: the
 * independent reviewer publishes before the worker settles, never the paid
 * worker. Missing or late publisher is an explicit HOLD, no fake receipt. */
export function openP7StoredRecoveryReceiptPort(env:NodeJS.ProcessEnv):Phase7RecoveryReceiptCustodyPort{
 const r=openP7PrivateSignedReviewReader(env);
 async function read(scope:Readonly<P6PostCommittedScope>){
  const s=postRecoveryReviewSelector(scope);return (await r.read([s])).get(s.scopeSha256);
 }
 return {readExactRecoveryReceipt:read,readOrRecordExactRecoveryReceipt:input=>read(input.committed)};
}

/** Recovery only: actual signed original receipt is already present. The
 * normal paid child MUST NOT use this port as a pre-spend readiness claim.
 * No new receipt is manufactured; every subsequent read reauthenticates it. */
export function openP7StoredPostRecoveryTransport(env:NodeJS.ProcessEnv,scope:Readonly<P6PostCommittedScope>):Phase7PrivateOutcomeReviewTransport{
 if(env.P6_PHASE7_POST_RECOVERY_APPROVED!=="1"||
  [env.AERODATABOX_API_KEY,env.RAPIDAPI_KEY,env.AERODATABOX_WEBHOOK_SECRET,env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL,env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL,env.P6_PRIVATE_PUBLISHER_DATABASE_URL].some(Boolean))hold("RECOVERY_ONLY");
 const reader=openP7PrivateSignedReviewReader(env),custody=openP7StoredRecoveryReceiptPort(env);
 const scopeSha=hashPhase7DurableCandidate(scope),packetSha=hashPhase7DurableCandidate(scope.packet);
 function check(s:Readonly<P6PostCommittedScope>){if(hashPhase7DurableCandidate(s)!==scopeSha)hold("RECOVERY_ORIGINAL_DRIFT")}
 const read=async(s:Readonly<P6PostCommittedScope>)=>{check(s);return custody.readExactRecoveryReceipt(s)};
 return {
  async preflight(p:Readonly<P5ReviewedFuturePostOneGet>){
   if(hashPhase7DurableCandidate(p)!==packetSha)hold("RECOVERY_PACKET_DRIFT");
   await read(scope);
   return {providerCalls:0,writeAuthority:false,independentReviewerAvailable:true,recoveryReceiptCustodyAvailable:true};
  },
  readExactRecoveryReceipt:read,
  readOrRecordExactRecoveryReceipt:input=>read(input.committed),
  async readExactReview(input){
   check(input.committed);
   const s=postSettlementReviewSelector(input.committed,input.anchor,input.fragments);
   return (await reader.read([s])).get(s.scopeSha256);
  }
 };
}

/** Actual restricted publisher + separate reader. No signer, paid reserve,
 * owner or research writer capability in this process. No automatic replay. */
export async function publishP7RecoveryWireFromProtectedEnv(env:NodeJS.ProcessEnv,s:P7ReviewSelector,wire:unknown,existing:boolean){
 const trust:P7ReviewTrust={env,expectedReaderSessionLogin:env.P6_PHASE7_PRIVATE_REVIEW_READER_LOGIN??"",expectedPublisherSessionLogin:env.P6_PHASE7_PRIVATE_REVIEW_PUBLISHER_LOGIN??""};
 validateTrust(trust);
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||env.GITHUB_REF!=="refs/heads/main"||
  env.GITHUB_RUN_ATTEMPT!=="1"||env.P6_PHASE7_POST_RECOVERY_APPROVED!=="1"||env.P6_PHASE7_PRIVATE_REVIEW_PUBLISH_APPROVED!=="1"||
  s.kind!=="POST_RECOVERY"||typeof existing!=="boolean"||Object.entries(env).some(([k,v])=>k.startsWith("P6_PHASE7_")&&k.includes("PRIVATE_KEY")&&v)||
  [env.AERODATABOX_API_KEY,env.RAPIDAPI_KEY,env.AERODATABOX_WEBHOOK_SECRET,env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL,
   env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL,env.P5_V39_PRE_DATABASE_URL,env.P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL].some(Boolean))hold("PUBLISHER_RECOVERY_ONLY");
 const source=new URL(env.V39_P5_SOURCE_DATABASE_URL??"");
 function url(name:string,login:string){
  const u=new URL(env[name]??"");
  if(!sameP6NeonDatabaseEndpoint(source,u)||decodeURIComponent(u.username)!==login||!u.password||u.username===source.username||
   u.searchParams.getAll("sslmode").length!==1||!["require","verify-full"].includes(u.searchParams.get("sslmode")??"")||
   [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
   (u.searchParams.has("channel_binding")&&(u.searchParams.getAll("channel_binding").length!==1||u.searchParams.get("channel_binding")!=="require")))hold("RESTRICTED_PUBLISHER_TLS");
  u.searchParams.set("sslmode","verify-full");return u.toString();
 }
 const reader=new Client({connectionString:url("P6_PRIVATE_READER_DATABASE_URL",trust.expectedReaderSessionLogin),connectionTimeoutMillis:8000,query_timeout:15000,application_name:"p7_recovery_wire_readback"});
 const publisher=new Client({connectionString:url("P6_PRIVATE_PUBLISHER_DATABASE_URL",trust.expectedPublisherSessionLogin),connectionTimeoutMillis:8000,query_timeout:15000,application_name:"p7_recovery_wire_publisher"});
 try{
  await reader.connect();await reader.query("SET ROLE phase6_private_frozen_reader_v39");
  if(existing){
   const again=(await readP7PrivateSignedReviews(reader,trust,[s])).get(s.scopeSha256);
   if(!again||JSON.stringify(again)!==JSON.stringify(wire))hold("EXISTING_WIRE_DRIFT");
   return {status:"P7_EXISTING_RECOVERY_WIRE_EXACT_READBACK_NO_REPLAY",providerCalls:0,phase6PaidGo:false};
  }
  await publisher.connect();await publisher.query("SET ROLE phase6_private_frozen_publisher_v39");
  return await publishP7PrivateSignedReviewOnce({client:publisher,reader,trust,selector:s,wire});
 }finally{await Promise.allSettled([reader.end(),publisher.end()])}
}
