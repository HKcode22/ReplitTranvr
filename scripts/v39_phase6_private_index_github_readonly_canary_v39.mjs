/**
 * Phase6 real GitHub-hosted V0096 signed current/prior index + full private
 * SOURCE/PRE/POST registry READ ONLY canary, NOT a provider data collector.
 *
 * Uses the existing restricted PG16 reader + independent external Ed25519
 * verification/handoff. No migration, schema install, worker dispatch,
 * source/provider API key, source/pre/post REST login, token or paid GO.
 * It is explicitly manual-only before production commissioning, with
 * redacted JSON output; never echo secrets or raw signed private paths.
 */
import pg from "pg";
import {
 hydrateP6SignedIndexAndFullRegistryHandoffsReadOnly
} from "../server/lib/disruption/phase6PrivateSignedIndexRegistryInMemoryHandoff_v39.mjs";

export const P6_GH_PRIVATE_READONLY_CANARY_SCHEMA=
 "v39.phase6.github-restricted-private-index-full-registry-readonly-canary-no-go.v1";
const CODE=/^[a-f0-9]{40}$/;
const H=/^[a-f0-9]{64}$/;
const LOGIN=/^phase6_private_reader_login_[a-z0-9_]{6,50}$/;
const READER_GROUP="phase6_private_frozen_reader_v39";
const fail=code=>{throw Error("HOLD_P6_GH_PRIVATE_READER_CANARY_"+code);};
function strictBase64(raw,maxBytes,what){
 if(typeof raw!=="string"||raw.length<16||raw.length>maxBytes*2||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(raw))
  fail("MISSING_OR_INVALID_"+what);
 const bytes=Buffer.from(raw,"base64");
 if(bytes.length<16||bytes.length>maxBytes||
    bytes.toString("base64")!==raw)
  fail("MISSING_OR_INVALID_"+what);
 return bytes.toString("utf8");
}
function strictObject(b64,limit,what){
 let value;
 try{value=JSON.parse(strictBase64(b64,limit,what));}
 catch{return fail("UNPARSEABLE_"+what);}
 if(!value||typeof value!=="object"||Array.isArray(value))
  fail("NOT_OBJECT_"+what);
 return value;
}
function exactOwnKeys(obj,keys){
 return obj&&typeof obj==="object"&&!Array.isArray(obj)&&
  Object.keys(obj).sort().join("|")===keys.slice().sort().join("|");
}
function notSecret(obj,hidden){
 const result={redactedSummary:Object.freeze(obj)};
 Object.defineProperty(result,"privateScope",{
  enumerable:false,writable:false,value:Object.freeze(hidden)
 });
 return Object.freeze(result);
}
export function admitP6GithubRestrictedIndexCanary(env){
 if(!env||
    env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(env.GITHUB_SHA??"")||
    env.GITHUB_SHA!==env.P6_PRIVATE_INDEX_CANARY_MAIN_SHA||
    env.P6_PRIVATE_INDEX_GH_CANARY_CONFIRM!==
      "VERIFY_RESTRICTED_PRIVATE_INDEX_READONLY_NO_PAID"||
    env.P6_PRIVATE_INDEX_CANARY_OWNER_APPROVED!=="1"||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED!=="0"||
    [
     env.AERODATABOX_API_KEY,
     env.AERODATABOX_WEBHOOK_SECRET,
     env.RAPIDAPI_KEY,
     env.DATABASE_URL,
     env.V39_DATABASE_RUNTIME_URL,
     env.V39_P5_SOURCE_DATABASE_URL,
     env.P5_V39_PRE_DATABASE_URL,
     env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL,
     env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL,
     env.GITHUB_TOKEN
    ].some(x=>x!==undefined&&x!==""))
  fail("NOT_MANUAL_UNARMED_APPROVED_MAIN_OR_ROLE_ISOLATED");

 const pins=strictObject(env.P6_PRIVATE_INDEX_REVIEW_PINS_BASE64,
   15000,"EXTERNALLY_PINNED_INDEX_REVIEW");
 const wire=strictObject(env.P6_PRIVATE_INDEX_REVIEW_WIRE_BASE64,
   15000,"EXTERNALLY_SIGNED_INDEX_REVIEW");
 const pem=strictBase64(
   env.P6_PRIVATE_INDEX_REVIEWER_PUBLIC_KEY_PEM_BASE64,
   10000,"INDEPENDENT_REVIEW_PUBLIC_KEY");
 if(!exactOwnKeys(pins,[
   "independentExternalReviewerSignaturePinsApproved",
   "privateIndexReadOnlyApproved",
   "existingPaidGithubDispatchApproved",
   "expectedReaderSessionLogin",
   "expectedIndexRevision","expectedIndexSha256",
   "expectedPreviousIndexSha256","expectedReviewedCodeSha",
   "expectedManifestSha256","expectedCalendarSha256",
   "expectedReleaseSha256","expectedRightsSha256",
   "expectedExternalReviewEvidenceSha256",
   "expectedReviewerPublicKeyFingerprintSha256"
 ])||
    pins.independentExternalReviewerSignaturePinsApproved!==true||
    pins.privateIndexReadOnlyApproved!==true||
    pins.existingPaidGithubDispatchApproved!==false||
    !LOGIN.test(pins.expectedReaderSessionLogin??"")||
    pins.expectedReviewedCodeSha!==env.GITHUB_SHA||
    !Number.isSafeInteger(pins.expectedIndexRevision)||
    pins.expectedIndexRevision<1||pins.expectedIndexRevision>1024||
    ![
     pins.expectedIndexSha256,
     pins.expectedManifestSha256,pins.expectedCalendarSha256,
     pins.expectedReleaseSha256,pins.expectedRightsSha256,
     pins.expectedExternalReviewEvidenceSha256,
     pins.expectedReviewerPublicKeyFingerprintSha256
    ].every(v=>H.test(v??""))||
    (pins.expectedIndexRevision===1?
      pins.expectedPreviousIndexSha256!==null:
      !H.test(pins.expectedPreviousIndexSha256??""))||
    !exactOwnKeys(wire,["review","signatureBase64"])||
    typeof wire.signatureBase64!=="string"||
    !pem.includes("-----BEGIN PUBLIC KEY-----")||
    !pem.includes("-----END PUBLIC KEY-----"))
  fail("NOT_INDEPENDENTLY_PINNED_SIGNED_INDEX_OR_READER");
 let u;
 try{u=new URL(env.P6_PRIVATE_READER_DATABASE_URL??"");}
 catch{return fail("SCOPED_PRIVATE_PG16_READER_URL_ABSENT");}
 const allowedParams=new Set(["sslmode","channel_binding"]);
 if(!["postgresql:","postgres:"].includes(u.protocol)||
    decodeURIComponent(u.username)!==pins.expectedReaderSessionLogin||
    !u.password||!u.hostname.endsWith(".neon.tech")||
    (u.port!==""&&u.port!=="5432")||
    u.pathname!=="/neondb"||u.hash||
    u.searchParams.getAll("sslmode").length!==1||
    u.searchParams.get("sslmode")!=="require"||
    (u.searchParams.has("channel_binding")&&
      (u.searchParams.getAll("channel_binding").length!==1||
       u.searchParams.get("channel_binding")!=="require"))||
    [...u.searchParams.keys()].some(k=>!allowedParams.has(k)))
  fail("CROSS_ROLE_OR_NON_SSL_PRIVATE_NEONDB_LOGIN");
 return notSecret({
  schema:P6_GH_PRIVATE_READONLY_CANARY_SCHEMA,
  status:"EXACT_MAIN_MANUAL_PRIVATE_INDEX_READ_ADMITTED_NO_SQL_YET",
  reviewerAndCodeExternallyPinned:true,
  onlyScopedPrivateLogin:true,
  noProviderRestOrGithubDispatch:true,
  phase5ScientificFreezeGranted:false,
  phase6PaidGo:false,
  providerCalls:0,databaseWrites:0
 },{
  connectionString:env.P6_PRIVATE_READER_DATABASE_URL,
  pins,wire,publicKeyPem:pem
 });
}

/**
 * Production uses fixed PG client; tests can inject an offline reader. The
 * adapter cannot promote a test stub into paid authorization or modify GO.
 */
export async function runP6GithubRestrictedIndexCanaryOnce(
 env,{openRestrictedReader,hydrateRestrictedIndex}={}
){
 const admission=admitP6GithubRestrictedIndexCanary(env);
 const secret=admission.privateScope;
 const read=hydrateRestrictedIndex??
    hydrateP6SignedIndexAndFullRegistryHandoffsReadOnly;
 const open=openRestrictedReader??(async url=>{
  const c=new pg.Client({
   connectionString:url,
   connectionTimeoutMillis:7000,
   query_timeout:25000
  });
  await c.connect();
  return c;
 });
 let client;
 try{
  client=await open(secret.connectionString);
  if(!client||typeof client.query!=="function"||
     typeof client.end!=="function")
   fail("NO_RESTRICTED_PG16_SESSION");
  // Real PG16 NOINHERIT LOGIN must be explicitly allowed to SET this
  // specific NOLOGIN reader group. The existing full read checks both
  // current_user and session_user in READ ONLY transactions.
  await client.query("SET ROLE "+READER_GROUP);
  const out=await read({
   client,reviewPins:secret.pins,reviewWire:secret.wire,
   reviewerPublicKeyPem:secret.publicKeyPem
  });
  const s=out?.redactedSummary;
  if(s?.schema!==
     "v39.phase6.private-index-and-full-registries-memory-handoff-no-dispatch.v1"||
    s.status!=="SIGNED_RESTRICTED_INMEMORY_31DAY_REGISTRY_HANDOFF_NO_DISPATCH"||
    s.currentIndexSha256!==secret.pins.expectedIndexSha256||
    s.currentIndexRevision!==secret.pins.expectedIndexRevision||
    !Number.isSafeInteger(s.verifiedRegistryCount)||
    s.verifiedRegistryCount<1||s.verifiedRegistryCount>1024||
    s.phase6PaidGo!==false||s.providerCalls!==0||
    s.databaseWrites!==0||s.githubChildDispatches!==0||
    s.privateRegistryBytesWereNeverWrittenToCheckout!==true||
    s.privateSignedPathsExcludedFromPublicJson!==true)
   fail("RESTRICTED_INDEX_AND_ALL_REGISTRIES_READ_NOT_VERIFIED");
  // This ONLY reports non-sensitive counts and SHA, not public snapshots
  // or provider bytes. No child gets invoked from this diagnostic.
  return Object.freeze({
   schema:P6_GH_PRIVATE_READONLY_CANARY_SCHEMA,
   status:"RESTRICTED_PRIVATE_INDEX_AND_REGISTRIES_READ_VERIFIED_NO_PAID_GO",
   currentIndexRevision:s.currentIndexRevision,
   signedRegistryCount:s.verifiedRegistryCount,
   indexSha256:s.currentIndexSha256,
   actualRestrictedPgClockUtc:s.observedRestrictedPgClockUtc,
   privateContentsInGithubOutput:false,
   existingWorkerDispatched:false,
   phase5ScientificFreezeGranted:false,
   phase6PaidGo:false,
   providerCalls:0,databaseWrites:0,githubDispatches:0
  });
 }catch{
  fail("RESTRICTED_PG16_AUTH_SIGNED_INDEX_OR_READ_HOLD_REDACTED");
 }finally{
  if(client)try{await client.end();}catch{
   fail("RESTRICTED_PRIVATE_READER_CONNECTION_CLOSE_HOLD");
  }
 }
}

if(process.env.P6_PRIVATE_INDEX_GH_READONLY_ENTRYPOINT==="1"){
 runP6GithubRestrictedIndexCanaryOnce(process.env)
  .then(s=>console.log(JSON.stringify(s)))
  .catch(()=>{
   console.error("HOLD_P6_GH_PRIVATE_READER_CANARY_NO_GO_REDACTED");
   process.exitCode=2;
  });
}
