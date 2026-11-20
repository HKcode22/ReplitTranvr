/** Protected no-provider PRE producer: independently reread the exact
 * V0079 source, reselect all present Stage14 inputs and authenticate the
 * separate-lane authority's signed receipt. The signer cannot invent a
 * receipt, omit real FIDS inputs or count a reference purpose as research.
 * No raw data is written by this process; proof wires contain digests only.
 */
import {createHash,createPublicKey,type KeyObject} from "node:crypto";
import {Pool} from "pg";
import {sameP6NeonDatabaseEndpoint} from "./phase6SameNeonEndpoint_v39";
import {makeP5Stage28DedicatedRolePool,P5_STAGE28_GROUPS} from "./phase5Stage28DedicatedRolePool_v39";
import {P5_E_V0079_SOURCE_READONLY_LOGIN_V39,type P5EReadOnlyPgPool} from "./phase5AmendmentEOriginalFidsReadonlyCompiler_v39";
import {parsePhase7ProtectedPrePolicy} from "./phase7ProtectedPreResolver_v39";
import {createPhase7IndependentPreProofPort,type Phase7AuthenticatedLaneReceipt} from "./phase7IndependentPreProofIssuer_v39";
import {readP7ExactSelectedFeatures} from "./phase7IndependentPreSourceReader_v39";
import {verifyP7NoaaExactPreLaneEvidence,type P7SignedPublicNoaaArtifact} from "./phase7IndependentNoaaReceipt_v39";
import {hashPhase7DurableCandidate} from "./phase7DurableDerivedBundleCandidate_v39";
import type {P5Stage14SingleFlightPrePermit} from "./phase5V0079SingleBoundFlightPreWriter_v39";
const hold=(s:string):never=>{throw Error("HOLD_P7_EXACT_PRE_PRODUCER_"+s);};
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const digest=(s:unknown):s is string=>typeof s==="string"&&H.test(s)&&!/^([a-f0-9])\1{63}$/.test(s);
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const clock=(s:string)=>{const n=Date.parse(s);if(!Number.isFinite(n)||new Date(n).toISOString()!==s)hold("CLOCK");return n};
type Input={wire:unknown;weatherArtifacts:readonly P7SignedPublicNoaaArtifact[]};
export interface P7IndependentLaneArchivePort{
 /** Independently signed, exact permit-bound lane evidence already produced
  * by the separately approved source authority. Never a caller's booleans
  * or a proof generated from the PRE permit itself. */
 readExactSignedLaneReceipt(p:Readonly<P5Stage14SingleFlightPrePermit>):Promise<Input>;
}
function publicKey(v:string|undefined){
 if(!v||v.length>5500||!/^[A-Za-z0-9+/]+={0,2}$/.test(v))return hold("AUTHORITY_PUBLIC_KEY");
 const b=Buffer.from(v,"base64");if(b.toString("base64")!==v||!b.toString("utf8").startsWith("-----BEGIN PUBLIC KEY-----"))hold("AUTHORITY_PUBLIC_KEY");
 return createPublicKey(b);
}
export function admitP7ExactSourcePreProducer(env:NodeJS.ProcessEnv,mode:"proof"|"lane"="proof"){
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||env.GITHUB_REF!=="refs/heads/main"||
  env.GITHUB_RUN_ATTEMPT!=="1"||!C.test(env.GITHUB_SHA??"")||env.GITHUB_SHA!==env.V39_P5_APPROVED_CODE_SHA||
  (mode==="proof"?env.P6_PHASE7_PRE_PROOF_ISSUER_APPROVED!=="1":env.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_APPROVED!=="1")||env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||
  env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
  [env.AERODATABOX_API_KEY,env.RAPIDAPI_KEY,env.AERODATABOX_WEBHOOK_SECRET,env.DATABASE_URL,env.V39_DATABASE_RUNTIME_URL,
   env.P6_PRIVATE_PUBLISHER_DATABASE_URL,env.P5_V39_PRE_DATABASE_URL,env.P5_V39_PREPARE_DATABASE_URL,
   env.P5_V39_T24_WITNESS_DATABASE_URL,env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL,env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL,
   env.P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL,env.P6_PRIVATE_LATER_REVIEWER_KEY_BASE64,env.P6_PRIVATE_DAY_REVIEWER_KEY_BASE64,
   env.P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64,mode==="proof"?env.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PRIVATE_KEY_BASE64:env.P6_PHASE7_PRE_PROOF_REVIEWER_PRIVATE_KEY_BASE64].some(Boolean))hold("EXACT_NO_PROVIDER_ISSUER");
 const policy=parsePhase7ProtectedPrePolicy(env);
 const raw=env.P6_NONPAID_DAILY_POLICY_BASE64??"";
 if(raw.length>46668||!raw||!/^[A-Za-z0-9+/]+={0,2}$/.test(raw))hold("DAILY_POLICY");
 const bytes=Buffer.from(raw,"base64");
 if(bytes.toString("base64")!==raw||!digest(env.P6_NONPAID_DAILY_POLICY_SHA256)||sha(bytes)!==env.P6_NONPAID_DAILY_POLICY_SHA256)hold("DAILY_POLICY");
 const d=JSON.parse(bytes.toString("utf8")),f=d?.nativePreFeatureReview;
 if(d?.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||d.delegatedDailyPacketProductionApproved!==true||d.approvedCodeSha!==env.GITHUB_SHA||
  d.manifestSha256!==env.V39_P5_MANIFEST_SHA256||d.rightsSha256!==env.V39_P5_RIGHTS_SHA256||
  f?.approved!==true||f.rightsSha256!==d.rightsSha256||!digest(f.externalContentUseReviewSha256))hold("NATIVE_CONTENT_PURPOSE");
 let source:URL;try{source=new URL(env.V39_P5_SOURCE_DATABASE_URL??"")}catch{return hold("SOURCE_URL")}
 if(!sameP6NeonDatabaseEndpoint(source,source)||decodeURIComponent(source.username)!==P5_E_V0079_SOURCE_READONLY_LOGIN_V39||!source.password||
  source.searchParams.getAll("sslmode").length!==1||!["require","verify-full"].includes(source.searchParams.get("sslmode")??"")||
  [...source.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
  (source.searchParams.has("channel_binding")&&(source.searchParams.getAll("channel_binding").length!==1||source.searchParams.get("channel_binding")!=="require")))hold("EXISTING_RESTRICTED_SOURCE_TLS");
 source.searchParams.set("sslmode","verify-full");
 const forbidden=[d.nativeLaterReview?.laterReviewerFingerprintSha256,d.nativeLaterReview?.dayAppendPolicy?.dayReviewerFingerprintSha256,
  d.nativeLaterReview?.dayAppendPolicy?.queryReviewerFingerprintSha256,env.P6_PHASE7_POST_OUTCOME_REVIEWER_FINGERPRINT_SHA256];
 if(forbidden.some(v=>!digest(v))||new Set(forbidden).size!==4)hold("DISTINCT_PINNED_SIGNERS");
 return {policy,externalContentUseReviewSha256:f.externalContentUseReviewSha256 as string,authority:publicKey(env.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PUBLIC_KEY_BASE64),forbiddenSignerFingerprints:forbidden as string[],sourceUrl:source.toString()};
}
async function freshSourceClock(pool:P5EReadOnlyPgPool){
 const c=await pool.connect();
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");await c.query("SET LOCAL statement_timeout='12000ms'");
  const z=(await c.query("SELECT current_user actor,session_user login,current_database() db,current_setting('transaction_read_only') ro,current_setting('server_version_num')::int ver,pg_is_in_recovery() replica,clock_timestamp() at")).rows;
  const x=z[0];if(z.length!==1||x.actor!==P5_STAGE28_GROUPS.source||x.login!==P5_E_V0079_SOURCE_READONLY_LOGIN_V39||x.db!=="neondb"||x.ro!=="on"||Number(x.ver)<160000||Number(x.ver)>=170000||x.replica!==false||!(x.at instanceof Date)||!Number.isFinite(x.at.getTime()))hold("RESTRICTED_REAL_CLOCK");
  await c.query("ROLLBACK");return (x.at as Date).toISOString();
 }finally{await c.query("ROLLBACK").catch(()=>{});c.release()}
}
function decodeReceipt(w:unknown):Phase7AuthenticatedLaneReceipt{
 if(!w||typeof w!=="object"||Array.isArray(w)||Object.keys(w).sort().join("|")!=="payloadBase64|signatureBase64")return hold("AUTHORITY_WIRE");
 const v=(w as {payloadBase64:unknown}).payloadBase64;
 if(typeof v!=="string"||v.length>27000||!(/^[A-Za-z0-9+/]+={0,2}$/).test(v))return hold("AUTHORITY_WIRE");
 const b=Buffer.from(v,"base64");if(b.toString("base64")!==v||b.length>20000)hold("AUTHORITY_WIRE");
 const x=JSON.parse(b.toString("utf8"));
 if(!x||x.schema!=="v39.phase7.independent-pre-lane-readback.v1"||!Array.isArray(x.fields)||x.fields.length>16)hold("AUTHORITY_WIRE");
 return x as Phase7AuthenticatedLaneReceipt;
}
/** Independently signed receipt must agree with actual source clock and
 * exact observed source expiry. Weather is recomputed from the independently
 * reviewed public archive, not merely a field digest in the authority wire.
 * Signature verification itself is performed again by the original issuer. */
export function reconcileP7ActualSourceLaneReceipt(input:{env:NodeJS.ProcessEnv;permit:Readonly<P5Stage14SingleFlightPrePermit>;
 dispositions:ReturnType<typeof parsePhase7ProtectedPrePolicy>["dispositions"];source:Awaited<ReturnType<typeof readP7ExactSelectedFeatures>>;archive:Input}){
 const {env,permit:p,source:s,archive:a}=input;
 if(s.permitSha256!==hashPhase7DurableCandidate(p)||Object.getOwnPropertyDescriptor(s,"privateSelectedFeatures")?.enumerable!==false||
  !a||!Array.isArray(a.weatherArtifacts)||a.weatherArtifacts.length>128)hold("EXACT_ARCHIVE_INPUT");
 const receipt=decodeReceipt(a.wire);
 if(receipt.permitSha256!==s.permitSha256||receipt.sourceExpiresAtUtc!==s.sourceExpiresAtUtc||
  clock(receipt.reviewedAtUtc)>clock(s.observedDbClockUtc))hold("ACTUAL_SOURCE_EXPIRY_OR_REVIEW_CLOCK");
 const weatherNames=new Set(["origin_metar_visibility_m","origin_metar_wind_kt","origin_taf_flight_category","destination_taf_flight_category"]);
 const hasWeather=s.privateSelectedFeatures.some(f=>weatherNames.has(f.featureName)&&f.value!==null&&f.value!==undefined);
 if(hasWeather){
  const v=verifyP7NoaaExactPreLaneEvidence({env,permit:p,scope:s.privateWeatherScope,dispositions:input.dispositions,artifacts:a.weatherArtifacts});
  for(const f of v.privateWeatherFields){
   const exact=receipt.fields.filter(x=>x.field===f.field);
   if(exact.length!==1||hashPhase7DurableCandidate(exact[0])!==hashPhase7DurableCandidate(f))hold("EXACT_WEATHER_LANE_RECEIPT");
  }
  if(receipt.fields.filter(x=>weatherNames.has(x.field)).length!==v.privateWeatherFields.length)hold("WEATHER_DENOMINATOR");
 }else if(receipt.fields.some(x=>weatherNames.has(x.field)))hold("FALSE_WEATHER_PRESENCE");
 return {selectedFeatures:s.privateSelectedFeatures,wire:a.wire};
}
export function openP7ExactSourcePreProofProducer(env:NodeJS.ProcessEnv,proofSigningKey:KeyObject,archive:P7IndependentLaneArchivePort){
 const a=admitP7ExactSourcePreProducer(env);
 if(typeof archive?.readExactSignedLaneReceipt!=="function")hold("ACTUAL_INDEPENDENT_ARCHIVE");
 const underlying=new Pool({connectionString:a.sourceUrl,max:1,connectionTimeoutMillis:8000,query_timeout:25000,application_name:"p7_exact_source_pre_proof_issuer",options:"-c default_transaction_read_only=on"});
 const pool=makeP5Stage28DedicatedRolePool(underlying,{group:"source",reviewedDedicatedLogin:P5_E_V0079_SOURCE_READONLY_LOGIN_V39,forbiddenApplicationLogin:"phase5_runtime_application_login"});
 try{
  const port=createPhase7IndependentPreProofPort({env,policySha256:a.policy.reviewSha256,dispositions:a.policy.dispositions,
   evidenceAuthorityPublicKey:a.authority,proofSigningKey,forbiddenSignerFingerprints:a.forbiddenSignerFingerprints,
   reader:{
    async readExactLaneEvidence(p){
     // Authority archive first, then real source read, not the reverse:
     // a fresh DB clock bounds the separately signed review as of now.
     const receipt=await archive.readExactSignedLaneReceipt(p);
     const actual=await readP7ExactSelectedFeatures(pool,p,a.externalContentUseReviewSha256);
     return reconcileP7ActualSourceLaneReceipt({env,permit:p,dispositions:a.policy.dispositions,source:actual,archive:receipt});
    },
    readDatabaseClockUtc:()=>freshSourceClock(pool)
   }});
  return {port,close:()=>underlying.end()};
 }catch(e){void underlying.end();throw e}
}
