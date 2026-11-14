/**
 * Phase 5 EXIT P0 — real private DAY-EPOCH index + V0095 SOURCE_QUERY_PACKET
 * delivered into the ORIGINAL Phase5 one-FIDS-GET child IN THE SAME
 * GitHub Actions process, without relying on gitignored checkout files.
 *
 * This is a physical execution boundary after individually reviewed
 * Phase5 FREEZE, provider Contents rights, budget, source role, original
 * release and explicit paid Day1 GO. Do not invoke for CI / synthetic
 * paid collection. Unattended future-day rollover is STILL separate.
 *
 * Reuses:
 * - restricted PG16 DAY-EPOCH signed index + original semantic reader,
 * - V0095 Ed25519 private query read-once,
 * - #653 double original signed Phase5 SOURCE admission + 0600 ephemeral
 *   per-job file pair and try/finally cleanup,
 * - original child -> one-query V0079/V0080/V0082 atomic reservation.
 * The bridge itself does no paid HTTP or DB writes. Existing paid worker
 * MAY do ONE paid GET only when all its own gates independently pass.
 */
import pg from "pg";
import {spawnSync} from "node:child_process";
import {resolve} from "node:path";
import {
 hydrateAndInspectP6DayEpochOriginalSemanticsReadOnly
} from "../server/lib/disruption/phase6DayEpochOriginalSemanticHandoff_v39.mjs";
import {
 readP6PrivateSourcePostOnce
} from "../server/lib/disruption/phase6PrivateSourcePostReadOnce_v39.mjs";
import {
 runP6OneSourceThroughExistingP5ChildAdmission
} from "./v39_phase6_private_source_existing_child_admission_v39.ts";

export const P6_REAL_PRIVATE_SOURCE_ONE_ORIGINAL_CHILD_SCHEMA=
 "v39.phase6.real-private-source-one-original-child-same-run-no-new-worker.v1";
const CODE=/^[0-9a-f]{40}$/,SHA=/^[0-9a-f]{64}$/;
const ROUTE=/^data-collection\/phase5\/frozen\/source_[A-Za-z0-9_.-]{8,125}\.json$/;
const PACK=/^data-collection\/phase5\/frozen\/sourceq_[A-Za-z0-9_.-]{8,110}\.json$/;
const LOGIN=/^phase6_private_reader_login_[a-z0-9_]{6,50}$/;
const fail=code=>{throw Error("HOLD_P6_REAL_PRIVATE_SOURCE_CHILD_"+code);};
const CONFIRM="ONE_SIGNED_SOURCE_CHILD_MAX_ONE_PAID_GET";
const ENTRY_CONFIRM="ONE_PRIVATE_SOURCE_ORIGINAL_P5_CHILD_SAME_JOB_ONE_GET";
function parseB64(s,limit,key){
 if(typeof s!=="string"||s.length<16||s.length>limit*2||
    !/^[a-zA-Z0-9+/]+={0,2}$/.test(s))
  fail("MISSING_OR_INVALID_"+key);
 const b=Buffer.from(s,"base64");
 if(b.length<16||b.length>limit||b.toString("base64")!==s)
  fail("MISSING_OR_INVALID_"+key);
 return b.toString("utf8");
}
function objectB64(s,limit,key){
 let o;
 try{o=JSON.parse(parseB64(s,limit,key));}
 catch{fail("PRIVATE_REVIEW_JSON_INVALID_"+key);}
 if(!o||typeof o!=="object"||Array.isArray(o))
  fail("PRIVATE_REVIEW_NOT_AN_OBJECT_"+key);
 return o;
}
function exactKeys(obj,keys){
 return obj&&typeof obj==="object"&&!Array.isArray(obj)&&
  Object.keys(obj).sort().join("|")===keys.slice().sort().join("|");
}
function safeReaderUrl(s,expectedLogin){
 let u;
 try{u=new URL(s);}
 catch{fail("PRIVATE_READER_DSN_MISSING");}
 const allowed=new Set(["sslmode","channel_binding"]);
 if(!["postgresql:","postgres:"].includes(u.protocol)||
    !LOGIN.test(expectedLogin??"")||
    decodeURIComponent(u.username)!==expectedLogin||
    !u.password||!u.hostname.endsWith(".neon.tech")||
    (u.port!==""&&u.port!=="5432")||
    u.pathname!=="/neondb"||u.hash||
    u.searchParams.getAll("sslmode").length!==1||
    u.searchParams.get("sslmode")!=="require"||
    (u.searchParams.has("channel_binding")&&
      (u.searchParams.getAll("channel_binding").length!==1||
       u.searchParams.get("channel_binding")!=="require"))||
    [...u.searchParams.keys()].some(x=>!allowed.has(x)))
  fail("NOT_SEPARATE_RESTRICTED_TLS_NEONDB_LOGIN");
 return s;
}
export function admitP6PrivateSourceExistingChildRuntime(env){
 if(!env||
    env.P6_PRIVATE_SOURCE_CHILD_RUNTIME_ENTRYPOINT!=="1"||
    env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(env.GITHUB_SHA??"")||
    env.GITHUB_SHA!==env.V39_P5_APPROVED_CODE_SHA||
    env.P6_PRIVATE_SOURCE_TRANSPORT_APPROVED!=="1"||
    env.P6_PRIVATE_SOURCE_CHILD_RUNTIME_CONFIRM!==ENTRY_CONFIRM||
    env.V39_P5_CHILD_CONFIRM!==CONFIRM||
    env.P5_SIGNED_DAY_SOURCE_CHILD_ENTRYPOINT!=="0"||
    env.ADB_AUTO_COLLECT!=="0"||
    env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1"||
    env.V39_P5_AUTO_SOURCE_DISPATCH_APPROVED!=="1"||
    env.V39_P5_SIGNED_DAY_REGISTRY_RELEASE!=="1"||
    env.V39_P5_SOURCE_DB_ROLE_REVIEWED!=="1"||
    env.V39_P5_SEVEN_REST_BUDGET_SIGNED!=="1"||
    env.V39_P5_REST_UNIT_PRICE_APPROVED!=="2"||
    !env.AERODATABOX_API_KEY||
    !env.V39_P5_SOURCE_DATABASE_URL||
    !SHA.test(env.P6_PRIVATE_SOURCE_ROUTING_INTENT_SHA256??"")||
    !SHA.test(env.P5_SOURCE_CHILD_EXPECTED_QUERY_DIGEST??"")||
    !SHA.test(env.V39_P5_SOURCE_BATCH_REGISTRY_SHA256??"")||
    !ROUTE.test(env.P6_PRIVATE_SOURCE_EXPECTED_REGISTRY_PATH??"")||
    !PACK.test(env.P6_PRIVATE_SOURCE_EXPECTED_QUERY_PATH??"")||
    !/^(?:[1-9]|[12][0-9]|3[01])$/.test(
      env.P5_SOURCE_BATCH_RUN_DAY_INDEX??""))
  fail("UNRELEASED_PAID_SOURCE_OR_MISSING_EXACT_PRIVATE_MAIN_INPUT");

 const indexPins=objectB64(
  env.P6_PRIVATE_DAY_EPOCH_REVIEW_PINS_BASE64,15000,"INDEX_PINS");
 const indexWire=objectB64(
  env.P6_PRIVATE_DAY_EPOCH_REVIEW_WIRE_BASE64,15000,"INDEX_WIRE");
 const indexPem=parseB64(
  env.P6_PRIVATE_DAY_EPOCH_REVIEWER_PUBLIC_KEY_PEM_BASE64,
  10000,"INDEX_PUBLIC_KEY");
 const packetPins=objectB64(
  env.P6_PRIVATE_SOURCE_QUERY_REVIEW_PINS_BASE64,
  15000,"SOURCE_QUERY_PINS");
 const packetWire=objectB64(
  env.P6_PRIVATE_SOURCE_QUERY_REVIEW_WIRE_BASE64,
  15000,"SOURCE_QUERY_WIRE");
 const packetPem=parseB64(
  env.P6_PRIVATE_SOURCE_QUERY_REVIEWER_PUBLIC_KEY_PEM_BASE64,
  10000,"SOURCE_QUERY_PUBLIC_KEY");
 if(!exactKeys(indexPins,[
  "independentExternalReviewerSignaturePinsApproved",
  "privateDayIndexReadOnlyApproved",
  "existingPaidGithubDispatchApproved",
  "expectedReaderSessionLogin","expectedRunDayIndex",
  "expectedIndexRevision",
  "expectedIndexSha256","expectedPreviousIndexSha256",
  "expectedReviewedCodeSha","expectedManifestSha256",
  "expectedCalendarSha256","expectedReleaseSha256",
  "expectedRightsSha256","expectedExternalReviewEvidenceSha256",
  "expectedReviewerPublicKeyFingerprintSha256"
 ])||
    indexPins.independentExternalReviewerSignaturePinsApproved!==true||
    indexPins.privateDayIndexReadOnlyApproved!==true||
    indexPins.existingPaidGithubDispatchApproved!==false||
    !Number.isSafeInteger(indexPins.expectedRunDayIndex)||
    indexPins.expectedRunDayIndex<1||indexPins.expectedRunDayIndex>31||
    indexPins.expectedRunDayIndex!==
      Number(env.P5_SOURCE_BATCH_RUN_DAY_INDEX)||
    indexWire.review?.runDayIndex!==indexPins.expectedRunDayIndex||
    indexWire.review?.indexRevision!==indexPins.expectedIndexRevision||
    indexPins.expectedReviewedCodeSha!==env.GITHUB_SHA||
    indexPins.expectedManifestSha256!==env.V39_P5_MANIFEST_SHA256||
    indexPins.expectedReleaseSha256!==env.V39_P5_RELEASE_SHA256||
    indexPins.expectedRightsSha256!==env.V39_P5_RIGHTS_SHA256||
    !Number.isSafeInteger(indexPins.expectedIndexRevision)||
    indexPins.expectedIndexRevision<1||
    indexPins.expectedIndexRevision>1024||
    ![
     indexPins.expectedIndexSha256,indexPins.expectedManifestSha256,
     indexPins.expectedCalendarSha256,indexPins.expectedReleaseSha256,
     indexPins.expectedRightsSha256,
     indexPins.expectedExternalReviewEvidenceSha256,
     indexPins.expectedReviewerPublicKeyFingerprintSha256
    ].every(x=>SHA.test(x??""))||
    (indexPins.expectedIndexRevision===1?
      indexPins.expectedPreviousIndexSha256!==null:
      !SHA.test(indexPins.expectedPreviousIndexSha256??""))||
    !exactKeys(indexWire,["review","signatureBase64"])||
    typeof indexWire.signatureBase64!=="string"||
    !indexPem.includes("-----BEGIN PUBLIC KEY-----")||
    !indexPem.includes("-----END PUBLIC KEY-----"))
  fail("UNSIGNED_OR_DRIFTED_PRIVATE_INDEX_GO_PINS");
 if(!packetPins||
    packetPins.privateSourcePostReadOnlyApproved!==true||
    packetPins.independentExternalReviewerSignaturePinsApproved!==true||
    packetPins.expectedPrivateSessionLogin!==
     indexPins.expectedReaderSessionLogin||
    packetPins.expectedKind!=="SOURCE_QUERY_PACKET"||
    packetPins.expectedLogicalPath!==
     env.P6_PRIVATE_SOURCE_EXPECTED_QUERY_PATH||
    packetPins.expectedReviewedMainSha!==env.GITHUB_SHA||
    packetPins.expectedManifestSha256!==env.V39_P5_MANIFEST_SHA256||
    packetPins.expectedRightsSha256!==env.V39_P5_RIGHTS_SHA256||
    !SHA.test(packetPins.expectedContentSha256??"")||
    !SHA.test(packetPins.expectedExternalReviewEvidenceSha256??"")||
    !SHA.test(packetPins.expectedReviewerPublicKeyFingerprintSha256??"")||
    packetPins.expectedRunDayIndex!==
     Number(env.P5_SOURCE_BATCH_RUN_DAY_INDEX)||
    !Number.isSafeInteger(packetPins.expectedShardIndex)||
    packetPins.expectedShardIndex<1||
    !exactKeys(packetWire,["review","signatureBase64"])||
    typeof packetWire.signatureBase64!=="string"||
    !packetPem.includes("-----BEGIN PUBLIC KEY-----")||
    !packetPem.includes("-----END PUBLIC KEY-----"))
  fail("UNSIGNED_OR_DRIFTED_PRIVATE_SOURCE_QUERY_GO_PINS");
 const url=safeReaderUrl(
  env.P6_PRIVATE_READER_DATABASE_URL,
  indexPins.expectedReaderSessionLogin);
 return Object.freeze({
  indexPins,indexWire,indexPem,packetPins,packetWire,packetPem,
  url,
  routingIntentSha256:env.P6_PRIVATE_SOURCE_ROUTING_INTENT_SHA256,
  queryDigestSha256:env.P5_SOURCE_CHILD_EXPECTED_QUERY_DIGEST,
  expectedRegistryPath:env.P6_PRIVATE_SOURCE_EXPECTED_REGISTRY_PATH,
  expectedQueryPath:env.P6_PRIVATE_SOURCE_EXPECTED_QUERY_PATH
 });
}

/**
 * The private V0096/V0095 reader exists solely in the parent. Never forward
 * its LOGIN, signed review wires or immutable route selectors to the paid
 * source GET process; the original Phase5 child needs only its OWN SOURCE
 * login/authorities and the already-admitted two ephemeral frozen files.
 */
export function isolatedP6OriginalOneGetChildEnv(parentEnv){
 if(!parentEnv||typeof parentEnv!=="object")
  fail("NO_PARENT_ENV_FOR_LEAST_PRIVILEGE_CHILD");
 const child={...parentEnv};
 for(const key of Object.keys(child)){
  if(key.startsWith("P6_PRIVATE_"))
   delete child[key];
 }
 child.P5_SIGNED_DAY_SOURCE_CHILD_ENTRYPOINT="1";
 return child;
}

/**
 * Run ONE original child, never automatically retry an ambiguous physical
 * provider GET/credit reservation or child failure. The reader is CLOSED
 * before allowing the existing paid worker to see/provider-use any bytes.
 */
export async function runP6OnePrivateSourceOriginalGHChild(
 env,options={}
){
 const gate=admitP6PrivateSourceExistingChildRuntime(env);
 const open=options.openRestrictedReader??(async url=>{
  const c=new pg.Client({
   connectionString:url,connectionTimeoutMillis:7000,
   query_timeout:25000
  });
  await c.connect();
  return c;
 });
 const hydrate=options.hydrateIndex??
  hydrateAndInspectP6DayEpochOriginalSemanticsReadOnly;
 const read=options.readSourceQuery??readP6PrivateSourcePostOnce;
 let c,index,packet;
 try{
  c=await open(gate.url);
  await c.query("SET ROLE phase6_private_frozen_reader_v39");
  index=await hydrate({
   client:c,pins:gate.indexPins,wire:gate.indexWire,
   publicKeyPem:gate.indexPem,
   scope:{privateDayRegistryReadOnlyApproved:true,
    existingPaidDispatchApproved:false}
  });
  packet=await read(c,gate.packetPins,gate.packetWire,gate.packetPem);
 }catch{
  fail("AUTHENTICATED_PRIVATE_SOURCE_AND_INDEX_READER_HOLD_REDACTED");
 }finally{
  if(c)try{await c.end();}
   catch{fail("PRIVATE_READER_CLOSE_FAILED_STOP");}
 }
 // The GH inputs are untrusted until bound to the real Ed25519-reviewed
 // single-day index, original semantic route and authenticated query bytes.
 if(index?.redactedSummary?.status!==
       "ED25519_DAY_EPOCH_ORIGINAL_SOURCE_PRE_POST_SEMANTICS_PASS_NO_GO"||
    index.redactedSummary.reviewedEd25519SourceWasOriginalDayBytes!==true||
    index.redactedSummary.phase6PaidGo!==false||
    index.redactedSummary.providerCalls!==0||
    index.redactedSummary.githubChildDispatches!==0||
    index.redactedSummary.runDayIndex!==gate.indexPins.expectedRunDayIndex||
    index.redactedSummary.externallySignedDayEpochIndexSha256!==
      gate.indexPins.expectedIndexSha256||
    !packet||index.privateRoutingCandidates?.filter(x=>
      x?.lane==="SOURCE"&&
      x?.runDayIndex===gate.indexPins.expectedRunDayIndex&&
      x?.routingIntentSha256===gate.routingIntentSha256&&
      x?.signedFrozenPath===gate.expectedRegistryPath&&
      x?.signedFrozenSha256===env.V39_P5_SOURCE_BATCH_REGISTRY_SHA256).length!==1||
    packet.privateLogicalPath!==gate.expectedQueryPath)
  fail("UNBOUND_PRIVATE_ROUTE_REGISTRY_OR_QUERY_PATH");

 const runOriginal=options.runPreviouslyAdmittedExistingChild??
  (async(paths)=>{
   // Only reviewed fixed existing executable; not a caller-selected shell.
   const child=spawnSync("./node_modules/.bin/tsx",[
    "scripts/v39_phase5_one_signed_day_source_child_github_owner_v39.ts",
    paths.queryPacketFilePath,paths.registryFilePath
   ],{
    shell:false,stdio:["ignore","pipe","pipe"],
    maxBuffer:10*1024*1024,timeout:145*60000,
    env:isolatedP6OriginalOneGetChildEnv(env)
   });
   if(child.error||child.signal||child.status!==0)
    fail("ORIGINAL_ONE_GET_CHILD_FAILED_AMBIGUOUS_NO_REPLAY");
  });
 const admission=options.runExistingAdmission??
  runP6OneSourceThroughExistingP5ChildAdmission;
 let out;
 try{
  out=await admission({
   indexHandoff:index,
   sourcePacketReceipt:packet,
   expectedRoutingIntentSha256:gate.routingIntentSha256,
   expectedQueryDigestSha256:gate.queryDigestSha256,
   env,repoRoot:resolve(process.cwd()),
   runPreviouslyAdmittedExistingChild:runOriginal
  });
 }catch{
  fail("ORIGINAL_PHASE5_PAID_GATES_OR_EPHEMERAL_CLEANUP_HOLD_NO_RETRY");
 }
 return Object.freeze({
  schema:P6_REAL_PRIVATE_SOURCE_ONE_ORIGINAL_CHILD_SCHEMA,
  status:"PRIVATE_SOURCE_TRANSPORT_AND_ORIGINAL_CHILD_RETURNED_NO_REPLAY",
  exactSourceDay:out.runDayIndex,
  sourceQueryDigestSha256:out.queryDigestSha256,
  sourcePacketSha256:out.queryPacketSha256,
  privateOriginalRegistryCleaned:out.privateSourceQueryAndRegistryCleaned,
  existingPaidWorkerMustMakeFinalPhysicalGetAndChargeDecision:true,
  providerGetOutcomeNotCertifiedByTransport:true,
  phase5ScientificFreezeCertifiedHere:false,
  phase6PaidGoCertifiedHere:false,
  newGithubDispatches:0
 });
}
if(process.env.P6_PRIVATE_SOURCE_CHILD_RUNTIME_ENTRYPOINT==="1"){
 runP6OnePrivateSourceOriginalGHChild(process.env).then(out=>{
  console.log(JSON.stringify(out));
 }).catch(()=>{
  console.error("HOLD_P6_REAL_PRIVATE_SOURCE_CHILD_NO_RETRY_NO_GO_REDACTED");
  process.exitCode=2;
 });
}
