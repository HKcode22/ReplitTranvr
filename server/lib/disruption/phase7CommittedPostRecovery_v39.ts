/** Recovery-only boundary for an already committed POST. No HTTP, reserve,
 * source write, policy creation, or authorization. Independent reviewer must
 * supply the exact prior audit receipt, kept only within source custody.
 * This is deliberately not a paid child entrypoint or a rerun of one. */
import {createPublicKey,sign,verify,type KeyObject} from "node:crypto";
import type {Pool} from "pg";
import {readP6CommittedPostOutcomeObservability,type P6PostCommittedScope} from "./phase6ActualPostOutcomeObservability_v39";
import {phase7AuditedPreservationGroups,requirePhase7PostConsumer,consumeCommittedPhase7Post,type Phase7PostAudit,type Phase7PostConsumer} from "./phase7PostPreservationBridge_v39";
import {readPhase7PostReviewerPublicKey} from "./phase7SignedPostReview_v39";
import {hashPhase7DurableCandidate} from "./phase7DurableDerivedBundleCandidate_v39";
import {verifyP5FuturePostReviewedFrame,type P5ReviewedFuturePostOneGet} from "./phase5V0083FuturePostOriginalDb_v39";
import {P5_STAGE28_GROUPS} from "./phase5Stage28DedicatedRolePool_v39";
const hold=(s:string):never=>{throw Error("HOLD_P7_COMMITTED_POST_RECOVERY_"+s);};
const H=/^[a-f0-9]{64}$/;
const clock=(s:string)=>{const t=Date.parse(s);if(!Number.isFinite(t)||new Date(t).toISOString()!==s)hold("CLOCK");return t;};
const exact=(o:unknown,ks:string[])=>!!o&&typeof o==="object"&&!Array.isArray(o)&&Object.keys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k));
function decode(v:unknown,max:number){
 if(typeof v!=="string"||v.length>Math.ceil(max/3)*4||!(/^[A-Za-z0-9+/]+={0,2}$/).test(v))return hold("WIRE");
 const b=Buffer.from(v,"base64");if(b.length>max||b.toString("base64")!==v)hold("WIRE");return b;
}
export interface Phase7CommittedPostRecoveryReceipt{
 schema:"v39.phase7.committed-post-recovery-receipt.v1";
 policySha256:string;
 committedScopeSha256:string;
 originalAuditSha256:string;
 originalAuditAtUtc:string;
 reviewedAtUtc:string;
 validUntilUtc:string;
}
export function phase7CommittedPostAuditIdentity(a:Phase7PostAudit){
 phase7AuditedPreservationGroups(a);
 if(Object.getOwnPropertyDescriptor(a,"privatePreservationAnchors")?.enumerable!==false||
  Object.getOwnPropertyDescriptor(a,"privateDecisions")?.enumerable!==false||
  !Array.isArray(a.privateDecisions))hold("PRIVATE_AUDIT");
 // Include the entire private denominator, not just counts or a chosen
 // anchor. Sorting removes only query ordering differences.
 const sort=(v:readonly unknown[])=>v.map(hashPhase7DurableCandidate).sort();
 return hashPhase7DurableCandidate({publicAudit:{...a},anchors:sort(a.privatePreservationAnchors),
  decisions:sort(a.privateDecisions),ambiguous:[...a.privateAmbiguousPreservationFlightIds].sort()});
}
function verifyReceipt(env:NodeJS.ProcessEnv,s:P6PostCommittedScope,wire:unknown){
 if(!exact(wire,["payloadBase64","signatureBase64"]))return hold("WIRE");
 const w=wire as {payloadBase64:string;signatureBase64:string};
 const raw=decode(w.payloadBase64,4096),sig=decode(w.signatureBase64,64);
 if(sig.length!==64||!verify(null,raw,readPhase7PostReviewerPublicKey(env),sig))hold("SIGNATURE");
 const x=JSON.parse(raw.toString("utf8")) as Phase7CommittedPostRecoveryReceipt;
 if(!exact(x,["schema","policySha256","committedScopeSha256","originalAuditSha256","originalAuditAtUtc","reviewedAtUtc","validUntilUtc"])||
  x.schema!=="v39.phase7.committed-post-recovery-receipt.v1"||
  x.policySha256!==env.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256||
  x.committedScopeSha256!==hashPhase7DurableCandidate(s)||!H.test(x.originalAuditSha256))hold("EXACT_SCOPE");
 const prior=clock(x.originalAuditAtUtc),reviewed=clock(x.reviewedAtUtc),until=clock(x.validUntilUtc);
 if(prior>reviewed||reviewed>=until||until-prior>600000)hold("REVIEW_WINDOW");
 return x;
}
/** Authenticate an independently stored recovery wire against the current
 * private audit and an actual restricted database clock. The original
 * audit timestamp is not replaced by the recovery/re-read time. */
export function verifyPhase7RecoveryReceiptForAudit(env:NodeJS.ProcessEnv,s:P6PostCommittedScope,a:Phase7PostAudit,wire:unknown,observedDbClockUtc:string){
 const x=verifyReceipt(env,s,wire),now=clock(observedDbClockUtc),auditAt=clock(a.privateObservedDbClockUtc);
 if(clock(x.originalAuditAtUtc)>auditAt||auditAt>now||
    now<clock(x.reviewedAtUtc)||now>=clock(x.validUntilUtc)||
    x.originalAuditSha256!==phase7CommittedPostAuditIdentity(a))hold("LIVE_AUDIT_DRIFT");
 return x;
}
/** The outcome review authority must independently re-read the original and
 * persist the signed recovery wire inside bounded source custody. The
 * consumer only transmits the scope and audit digest, never source bodies
 * or the private flight denominator. A second exact readback is required.
 * This interface itself is not a storage implementation or commissioning.
 */
export interface Phase7RecoveryReceiptCustodyPort{
 readOrRecordExactRecoveryReceipt(input:Readonly<{committed:Readonly<P6PostCommittedScope>;priorAudit:Readonly<{sha256:string;observedAtUtc:string}>}>):Promise<unknown>;
 readExactRecoveryReceipt(scope:Readonly<P6PostCommittedScope>):Promise<unknown>;
}
export async function requirePhase7RecoveryReceiptBeforeSettlement(input:{
 env:NodeJS.ProcessEnv;scope:P6PostCommittedScope;audit:Phase7PostAudit;
 custody:Phase7RecoveryReceiptCustodyPort;readRestrictedClock:()=>Promise<string>;
}){
 const {env,scope,audit,custody}=input;
 if(typeof custody?.readOrRecordExactRecoveryReceipt!=="function"||typeof custody?.readExactRecoveryReceipt!=="function"||
    typeof input.readRestrictedClock!=="function")hold("RECEIPT_CUSTODY_REQUIRED");
 const privateScope=Object.freeze({...scope,packet:Object.freeze({...scope.packet})});
 const priorAudit=Object.freeze({sha256:phase7CommittedPostAuditIdentity(audit),observedAtUtc:audit.privateObservedDbClockUtc});
 const wire=await custody.readOrRecordExactRecoveryReceipt(Object.freeze({committed:privateScope,priorAudit}));
 // Never read back an invalid, mismatched or expired write result as success.
 verifyPhase7RecoveryReceiptForAudit(env,scope,audit,wire,await input.readRestrictedClock());
 const again=await custody.readExactRecoveryReceipt(privateScope);
 verifyPhase7RecoveryReceiptForAudit(env,scope,audit,again,await input.readRestrictedClock());
 const x=wire as {payloadBase64:string;signatureBase64:string},y=again as typeof x;
 if(x.payloadBase64!==y.payloadBase64||x.signatureBase64!==y.signatureBase64)hold("RECOVERY_CUSTODY_READBACK_DRIFT");
 return {status:"EXACT_SIGNED_RECOVERY_RECEIPT_READBACK_BEFORE_SETTLEMENT" as const,providerCalls:0 as const};
}
/** Requires an independently signed receipt of the previous full audit.
 * Re-read the identical original and live denominator from the existing
 * restricted SOURCE role. If an anchor expired or new PRE appeared, hold
 * instead of silently settling a smaller/different experiment. Existing
 * bundle consumer performs its own fresh exact review and reconciliation.
 * Recovery beyond the existing ten-minute original read is NOT authorized. */
export async function recoverPhase7CommittedPost(input:{
 env:NodeJS.ProcessEnv;scope:P6PostCommittedScope;wire:unknown;
 source:Pick<Pool,"connect">;consumer:Phase7PostConsumer;
}){
 const {env,scope:s,wire,source}=input;
 if(env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||env.AERODATABOX_WEBHOOK_SECRET||env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||
  env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL||env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL||
  Object.entries(env).some(([k,v])=>k.startsWith("P6_PHASE7_")&&k.includes("PRIVATE_KEY")&&v))hold("RECOVERY_ONLY");
 const f=verifyP5FuturePostReviewedFrame(s.packet);
 if(f.reservedSha256!==s.reservationSha256||s.packet.manifestSha256!==env.V39_P5_MANIFEST_SHA256||
  s.packet.reviewedSourceRightsSha256!==env.V39_P5_RIGHTS_SHA256)hold("ORIGINAL_SCOPE");
 const consumer=requirePhase7PostConsumer(env,input.consumer);
 verifyReceipt(env,s,wire);
 const a=await readP6CommittedPostOutcomeObservability(source,s);
 verifyPhase7RecoveryReceiptForAudit(env,s,a,wire,a.privateObservedDbClockUtc);
 await consumer.preflight(s.packet);
 const result=await consumeCommittedPhase7Post(consumer,s,a);
 return {status:"COMMITTED_POST_RECOVERY_INDEPENDENT_READBACK_NO_GET" as const,
  ...result,paidReservations:0,phase6PaidGo:false as const};
}

/** Discover the original from the immutable reservation of the ORIGINAL
 * paid run, not the recovery run. This is metadata discovery only, followed
 * by the existing full body, lineage and private denominator audit.
 * Zero/duplicate/expired original is an explicit HOLD, never a retry GET. */
export async function discoverPhase7CommittedPostScope(source:Pick<Pool,"connect">,packet:P5ReviewedFuturePostOneGet):Promise<P6PostCommittedScope>{
 const f=verifyP5FuturePostReviewedFrame(packet);
 const c=await source.connect();let tx=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await c.query("SET LOCAL statement_timeout='12000ms'");
  const id=await c.query("SELECT current_user AS role,session_user AS login,current_database() AS db,current_setting('transaction_read_only') AS ro,current_setting('server_version_num')::int AS version,pg_is_in_recovery() AS replica,clock_timestamp() AS now");
  const w=id.rows[0];
  if(id.rowCount!==1||w?.role!==P5_STAGE28_GROUPS.source||w.login!=="phase5_p5_source_login_20261108"||w.db!=="neondb"||w.ro!=="on"||w.version<160000||w.version>=170000||w.replica!==false||!(w.now instanceof Date)||!Number.isFinite(w.now.getTime()))hold("DISCOVERY_ACTOR");
  const z=await c.query("SELECT r.population_query_id::text AS id,r.response_hash,"+
   "(SELECT count(*)::int FROM clean.flight_population fp WHERE fp.population_query_id=r.population_query_id AND fp.batch_id=$1) AS members "+
   "FROM clean.fids_query_response r WHERE r.raw_expired_at_utc IS NULL AND r.raw_payload IS NOT NULL "+
   "AND r.raw_payload->>'phase5PostReservationSha256'=$1 AND r.source_airport_icao=$2 AND r.query_direction='Departure' "+
   "AND r.service_window_start_utc=$3::timestamptz AND r.service_window_end_utc=$4::timestamptz "+
   "AND r.openapi_sha256=$5 AND r.available_at<=$6::timestamptz "+
   "AND r.available_at>=$6::timestamptz-interval '10 minutes' AND r.raw_persisted_at_utc>=$6::timestamptz-interval '10 minutes' LIMIT 2",
   [f.reservedSha256,packet.airportIcao,packet.plannedSourceFromUtc,packet.plannedSourceToUtc,packet.reviewedProviderContractSha256,w.now.toISOString()]);
  const row=z.rows[0];
  if(z.rowCount!==1||z.rows.length!==1||!(/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i).test(row?.id)||!H.test(row.response_hash)||!Number.isSafeInteger(row.members)||row.members<0||row.members>2500)hold("DISCOVERY_NO_UNIQUE_LIVE_ORIGINAL_NO_REPLAY");
  await c.query("ROLLBACK");tx=false;
  return {packet,populationQueryId:row.id,responseSha256:row.response_hash,normalizedMembers:row.members,reservationSha256:f.reservedSha256};
 }finally{if(tx)await c.query("ROLLBACK").catch(()=>{});c.release();}
}
/** Independent reviewer process only. An expected prior audit identity is
 * not itself evidence: reread the actual committed original and the full
 * live denominator before issuing a receipt. No arbitrary caller timestamp,
 * private signing key in the consumer, or extension of the original window.
 * The reviewer must be separately commissioned and retain the wire only
 * within the approved source custody; no public artifact/log output. */
export async function issuePhase7CommittedPostRecoveryReceipt(input:{
 env:NodeJS.ProcessEnv;source:Pick<Pool,"connect">;scope:P6PostCommittedScope;
 priorAudit:{sha256:string;observedAtUtc:string};signer:KeyObject;
}){
 const {env,source,scope:s,priorAudit,signer}=input;
 if(env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||env.AERODATABOX_WEBHOOK_SECRET||env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||
    env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL||env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL||
    env.P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL||env.P6_PRIVATE_PUBLISHER_DATABASE_URL||
    env.P6_PHASE7_POST_RECOVERY_REVIEWER_APPROVED!=="1")hold("INDEPENDENT_RECOVERY_ISSUER_SCOPE");
 const trusted=readPhase7PostReviewerPublicKey(env);
 if(signer?.type!=="private"||signer.asymmetricKeyType!=="ed25519"||
   !createPublicKey(signer).export({type:"spki",format:"der"}).equals(trusted.export({type:"spki",format:"der"})))hold("ISSUER_PIN");
 if(s.packet.manifestSha256!==env.V39_P5_MANIFEST_SHA256||s.packet.reviewedSourceRightsSha256!==env.V39_P5_RIGHTS_SHA256||
    !H.test(priorAudit?.sha256??""))hold("ISSUER_ORIGINAL_SCOPE");
 const prior=clock(priorAudit.observedAtUtc);
 const a=await readP6CommittedPostOutcomeObservability(source,s);
 const now=clock(a.privateObservedDbClockUtc);
 if(now<prior||now>=prior+600000||phase7CommittedPostAuditIdentity(a)!==priorAudit.sha256)hold("ISSUER_PRIOR_AUDIT_DRIFT");
 // This is only a short-lived reviewer receipt, never an outcome label.
 // Bound additionally by every live anchor, and by the prior audit window.
 const until=Math.min(prior+600000,now+120000,...a.privatePreservationAnchors.map(h=>clock(h.sourceExpiresAtUtc)));
 if(until<=now)hold("ISSUER_EXPIRED");
 const receipt:Phase7CommittedPostRecoveryReceipt={schema:"v39.phase7.committed-post-recovery-receipt.v1",
  policySha256:env.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256!,committedScopeSha256:hashPhase7DurableCandidate(s),
  originalAuditSha256:priorAudit.sha256,originalAuditAtUtc:priorAudit.observedAtUtc,
  reviewedAtUtc:a.privateObservedDbClockUtc,validUntilUtc:new Date(until).toISOString()};
 const b=Buffer.from(JSON.stringify(receipt)),wire={payloadBase64:b.toString("base64"),signatureBase64:sign(null,b,signer).toString("base64")};
 verifyReceipt(env,s,wire);
 const out={status:"INDEPENDENT_COMMITTED_POST_RECOVERY_RECEIPT_ISSUED_NO_GO",providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 return Object.freeze(Object.defineProperty(out,"privateWire",{value:wire,enumerable:false})) as typeof out&{readonly privateWire:typeof wire};
}
/** Restart entry boundary. The original signed packet must already have
 * been authenticated by the existing private packet reader; the prior
 * audit receipt independently binds the exact original run and scope.
 * No paid child import, no key, no provider and no fallback. */
export async function recoverPhase7PostByOriginalReservation(input:{
 env:NodeJS.ProcessEnv;packet:P5ReviewedFuturePostOneGet;wire:unknown;
 source:Pick<Pool,"connect">;consumer:Phase7PostConsumer;
}){
 const e=input.env;
 if(e.AERODATABOX_API_KEY||e.RAPIDAPI_KEY||e.AERODATABOX_WEBHOOK_SECRET||e.DATABASE_URL||e.V39_DATABASE_RUNTIME_URL||
   e.P5_V39_OTHER_REST_RESERVE_DATABASE_URL||e.P5_V39_OTHER_REST_REVIEW_DATABASE_URL||
   input.packet.manifestSha256!==e.V39_P5_MANIFEST_SHA256||input.packet.reviewedSourceRightsSha256!==e.V39_P5_RIGHTS_SHA256)hold("RECOVERY_ONLY");
 const scope=await discoverPhase7CommittedPostScope(input.source,input.packet);
 return recoverPhase7CommittedPost({env:e,scope,wire:input.wire,source:input.source,consumer:input.consumer});
}
