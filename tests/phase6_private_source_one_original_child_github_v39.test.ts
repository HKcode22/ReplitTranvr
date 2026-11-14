import {describe,it,expect} from "vitest";
import {
 admitP6PrivateSourceExistingChildRuntime,
 runP6OnePrivateSourceOriginalGHChild,
 P6_REAL_PRIVATE_SOURCE_ONE_ORIGINAL_CHILD_SCHEMA
} from "../scripts/v39_phase6_private_source_one_original_child_github_v39.mjs";

const H=(c:string)=>c.repeat(64),CODE="f".repeat(40);
const ROUTE=H("a"),Q=H("b"),REG_SHA=H("c");
const REG="data-collection/phase5/frozen/source_registry_day01.json";
const PACK="data-collection/phase5/frozen/sourceq_prospective_day01.json";
const LOGIN="phase6_private_reader_login_ci_checks";
const URL="postgresql://"+LOGIN+":synthetic-ci-only-not-production"+
 "@ep-synthetic.us-east-1.aws.neon.tech/neondb?sslmode=require";
const b64=(o:unknown)=>Buffer.from(
 typeof o==="string"?o:JSON.stringify(o),"utf8").toString("base64");
function fixture(){
 const indexPins={
  independentExternalReviewerSignaturePinsApproved:true,
  privateIndexReadOnlyApproved:true,
  existingPaidGithubDispatchApproved:false,
  expectedReaderSessionLogin:LOGIN,
  expectedIndexRevision:1,
  expectedIndexSha256:H("1"),
  expectedPreviousIndexSha256:null,
  expectedReviewedCodeSha:CODE,
  expectedManifestSha256:H("2"),
  expectedCalendarSha256:H("3"),
  expectedReleaseSha256:H("4"),
  expectedRightsSha256:H("5"),
  expectedExternalReviewEvidenceSha256:H("6"),
  expectedReviewerPublicKeyFingerprintSha256:H("7")
 };
 const packetPins={
  privateSourcePostReadOnlyApproved:true,
  independentExternalReviewerSignaturePinsApproved:true,
  expectedPrivateSessionLogin:LOGIN,
  expectedKind:"SOURCE_QUERY_PACKET",
  expectedLogicalPath:PACK,
  expectedReviewedMainSha:CODE,
  expectedManifestSha256:H("2"),
  expectedRightsSha256:H("5"),
  expectedContentSha256:H("8"),
  expectedExternalReviewEvidenceSha256:H("9"),
  expectedReviewerPublicKeyFingerprintSha256:H("0"),
  expectedRunDayIndex:1,expectedShardIndex:2
 };
 const indexWire={review:{ciOnly:true},signatureBase64:"CI_TEST_NO_SIGNED_REVIEW"};
 const packetWire={review:{ciOnly:true},signatureBase64:"CI_TEST_NO_SIGNED_REVIEW"};
 const pem="-----BEGIN PUBLIC KEY-----\nCI_SYNTHETIC_KEY_NOT_REAL\n-----END PUBLIC KEY-----";
 const env:NodeJS.ProcessEnv={
  P6_PRIVATE_SOURCE_CHILD_RUNTIME_ENTRYPOINT:"1",
  GITHUB_ACTIONS:"true",
  GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:CODE,
  V39_P5_APPROVED_CODE_SHA:CODE,
  P6_PRIVATE_SOURCE_TRANSPORT_APPROVED:"1",
  P6_PRIVATE_SOURCE_CHILD_RUNTIME_CONFIRM:
   "ONE_PRIVATE_SOURCE_ORIGINAL_P5_CHILD_SAME_JOB_ONE_GET",
  V39_P5_CHILD_CONFIRM:"ONE_SIGNED_SOURCE_CHILD_MAX_ONE_PAID_GET",
  P5_SIGNED_DAY_SOURCE_CHILD_ENTRYPOINT:"0",
  ADB_AUTO_COLLECT:"0",
  DATABASE_URL:"",V39_DATABASE_RUNTIME_URL:"",
  V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE6_PROCESS_ARMED:"1",
  V39_P5_AUTO_SOURCE_DISPATCH_APPROVED:"1",
  V39_P5_SIGNED_DAY_REGISTRY_RELEASE:"1",
  V39_P5_SOURCE_DB_ROLE_REVIEWED:"1",
  V39_P5_SEVEN_REST_BUDGET_SIGNED:"1",
  V39_P5_REST_UNIT_PRICE_APPROVED:"2",
  AERODATABOX_API_KEY:"SYNTHETIC_TEST_NOT_A_REAL_PROVIDER_KEY",
  V39_P5_SOURCE_DATABASE_URL:"SYNTHETIC_TEST_NOT_A_REAL_POSTGRES_URL",
  P6_PRIVATE_SOURCE_ROUTING_INTENT_SHA256:ROUTE,
  P5_SOURCE_CHILD_EXPECTED_QUERY_DIGEST:Q,
  V39_P5_SOURCE_BATCH_REGISTRY_SHA256:REG_SHA,
  V39_P5_MANIFEST_SHA256:H("2"),
  V39_P5_RELEASE_SHA256:H("4"),
  V39_P5_RIGHTS_SHA256:H("5"),
  P6_PRIVATE_SOURCE_EXPECTED_REGISTRY_PATH:REG,
  P6_PRIVATE_SOURCE_EXPECTED_QUERY_PATH:PACK,
  P5_SOURCE_BATCH_RUN_DAY_INDEX:"1",
  P6_PRIVATE_READER_DATABASE_URL:URL,
  P6_PRIVATE_INDEX_REVIEW_PINS_BASE64:b64(indexPins),
  P6_PRIVATE_INDEX_REVIEW_WIRE_BASE64:b64(indexWire),
  P6_PRIVATE_INDEX_REVIEWER_PUBLIC_KEY_PEM_BASE64:b64(pem),
  P6_PRIVATE_SOURCE_QUERY_REVIEW_PINS_BASE64:b64(packetPins),
  P6_PRIVATE_SOURCE_QUERY_REVIEW_WIRE_BASE64:b64(packetWire),
  P6_PRIVATE_SOURCE_QUERY_REVIEWER_PUBLIC_KEY_PEM_BASE64:b64(pem)
 };
 return {env,indexPins,packetPins,indexWire,packetWire,pem};
}
const gate=(env:NodeJS.ProcessEnv)=>admitP6PrivateSourceExistingChildRuntime(env);
describe("Phase5 exit: real SOURCE private PG16 into original paid child only after independent full GO",()=>{
 it("accepts only bounded exact pins/role and keeps private credentials out of visible receipt",()=>{
  const f=fixture(),x=gate(f.env);
  expect(x.indexPins).toEqual(f.indexPins);
  expect(x.packetPins).toEqual(f.packetPins);
  expect(x.url).toBe(URL);
  expect(x.queryDigestSha256).toBe(Q);
  expect(x.expectedRegistryPath).toBe(REG);
  expect(x.expectedQueryPath).toBe(PACK);
 });
 it("cannot convert an offline PR or non-main/manual or rerun into a physical source GET",()=>{
  for(const override of [
   {GITHUB_REF:"refs/heads/branch"},
   {GITHUB_EVENT_NAME:"schedule"},
   {GITHUB_EVENT_NAME:"pull_request"},
   {GITHUB_RUN_ATTEMPT:"2"},
   {GITHUB_SHA:"a".repeat(40)},
   {P6_PRIVATE_SOURCE_TRANSPORT_APPROVED:"0"},
   {P6_PRIVATE_SOURCE_CHILD_RUNTIME_CONFIRM:"missing"},
   {P5_SIGNED_DAY_SOURCE_CHILD_ENTRYPOINT:"1"},
   {ADB_AUTO_COLLECT:"1"}
  ]){
   const f=fixture();
   expect(()=>gate({...f.env,...override}))
    .toThrow("UNRELEASED_PAID_SOURCE_OR_MISSING_EXACT_PRIVATE_MAIN_INPUT");
  }
 });
 it("blocks absent science freeze, source-use, approved budget and paid Day1 release",()=>{
  for(const key of [
   "V39_PHASE5_FREEZE_SIGNED","V39_PHASE5_SOURCE_RIGHTS_APPROVED",
   "V39_PHASE6_PROCESS_ARMED","V39_P5_AUTO_SOURCE_DISPATCH_APPROVED",
   "V39_P5_SIGNED_DAY_REGISTRY_RELEASE",
   "V39_P5_SOURCE_DB_ROLE_REVIEWED",
   "V39_P5_SEVEN_REST_BUDGET_SIGNED"
  ]){
   const f=fixture();
   f.env[key]="0";
   expect(()=>gate(f.env)).toThrow("UNRELEASED_PAID_SOURCE_OR_MISSING_EXACT_PRIVATE_MAIN_INPUT");
  }
 });
 it("rejects wrong real DB role, alternate network host, SSL and libpq override",()=>{
  for(const value of [
   "postgresql://neondb_owner:ci@host.neon.tech/neondb?sslmode=require",
   "postgresql://"+LOGIN+":ci@evil.test/neondb?sslmode=require",
   "postgresql://"+LOGIN+":ci@host.neon.tech/neondb?sslmode=disable",
   "postgresql://"+LOGIN+":ci@host.neon.tech/other?sslmode=require",
   "postgresql://"+LOGIN+":ci@host.neon.tech/neondb?sslmode=require&host=evil.test",
   "postgresql://"+LOGIN+":ci@host.neon.tech/neondb?sslmode=require&sslmode=disable",
   "postgresql://"+LOGIN+":ci@host.neon.tech/neondb?sslmode=require&channel_binding=disable"
  ]){
   const f=fixture();
   f.env.P6_PRIVATE_READER_DATABASE_URL=value;
   expect(()=>gate(f.env)).toThrow("NOT_SEPARATE_RESTRICTED_TLS_NEONDB_LOGIN");
  }
 });
 it("refuses index/source review identity drift before any PG16 connection",async()=>{
  for(const changes of [
   {expectedReviewedCodeSha:"0".repeat(40)},
   {expectedManifestSha256:H("d")},
   {expectedRightsSha256:H("d")},
   {existingPaidGithubDispatchApproved:true},
   {expectedReaderSessionLogin:"neondb_owner"}
  ]){
   const f=fixture();
   f.env.P6_PRIVATE_INDEX_REVIEW_PINS_BASE64=
    b64({...f.indexPins,...changes});
   expect(()=>gate(f.env)).toThrow(/HOLD_P6_REAL_PRIVATE_SOURCE_CHILD_/);
  }
  const g=fixture();
  g.env.P6_PRIVATE_SOURCE_QUERY_REVIEW_PINS_BASE64=
   b64({...g.packetPins,expectedKind:"POST_PACKET"});
  expect(()=>gate(g.env)).toThrow("UNSIGNED_OR_DRIFTED_PRIVATE_SOURCE_QUERY_GO_PINS");
 });
 it("uses one reader, verifies index then exact packet, closes before original existing child",async()=>{
  const f=fixture();
  const calls:string[]=[];
  const client={
   async query(sql:string){calls.push("SQL:"+sql);return{rows:[]};},
   async end(){calls.push("PG_CLOSE");}
  };
  const out=await runP6OnePrivateSourceOriginalGHChild(f.env,{
   openRestrictedReader:async(url:string)=>{
    expect(url).toBe(URL);calls.push("PG_OPEN");return client;
   },
   hydrateIndex:async (args:any)=>{
    expect(args.reviewPins).toEqual(f.indexPins);
    calls.push("INDEX_VERIFIED");
    return {privateRoutingCandidates:[{
     routingIntentSha256:ROUTE,signedFrozenPath:REG
    }]};
   },
   readSourceQuery:async (_client:any,pins:any,wire:any)=>{
    expect(pins).toEqual(f.packetPins);
    expect(wire).toEqual(f.packetWire);
    calls.push("SOURCE_PACKET_VERIFIED");
    return {privateLogicalPath:PACK};
   },
   runPreviouslyAdmittedExistingChild:async()=>{calls.push("PAID_CHILD_CALLBACK_INJECTED");},
   runExistingAdmission:async(args:any)=>{
    expect(args.repoRoot).toBeTruthy();
    expect(args.expectedRoutingIntentSha256).toBe(ROUTE);
    expect(args.expectedQueryDigestSha256).toBe(Q);
    expect(args.runPreviouslyAdmittedExistingChild).toBeTypeOf("function");
    expect(calls.at(-1)).toBe("PG_CLOSE");
    calls.push("EXISTING_DOUBLE_ADMISSION_INJECTED_ONLY");
    await args.runPreviouslyAdmittedExistingChild({registryFilePath:REG,queryPacketFilePath:PACK},{});
    return {
     runDayIndex:1,queryDigestSha256:Q,
     queryPacketSha256:H("8"),
     privateSourceQueryAndRegistryCleaned:true
    };
   }
  });
  expect(calls).toEqual([
   "PG_OPEN","SQL:SET ROLE phase6_private_frozen_reader_v39",
   "INDEX_VERIFIED","SOURCE_PACKET_VERIFIED","PG_CLOSE",
   "EXISTING_DOUBLE_ADMISSION_INJECTED_ONLY",
   "PAID_CHILD_CALLBACK_INJECTED"
  ]);
  expect(out.schema).toBe(P6_REAL_PRIVATE_SOURCE_ONE_ORIGINAL_CHILD_SCHEMA);
  expect(out.phase6PaidGoCertifiedHere).toBe(false);
  expect(out.providerGetOutcomeNotCertifiedByTransport).toBe(true);
  expect(out.privateOriginalRegistryCleaned).toBe(true);
  expect(JSON.stringify(out)).not.toContain("SYNTHETIC_TEST_NOT_A_REAL_PROVIDER_KEY");
 });
 it("rejects changed signed registry route before original paid child callback",async()=>{
  const f=fixture(),calls:string[]=[];
  await expect(runP6OnePrivateSourceOriginalGHChild(f.env,{
   openRestrictedReader:async()=>({
    async query(sql:string){calls.push(sql);},
    async end(){calls.push("CLOSED");}
   }),
   hydrateIndex:async()=>({
    privateRoutingCandidates:[{
     routingIntentSha256:ROUTE,signedFrozenPath:"data-collection/phase5/frozen/source_wrong_route.json"
    }]
   }),
   readSourceQuery:async()=>({privateLogicalPath:PACK}),
   runExistingAdmission:async()=>{calls.push("WRONG_PAID");}
  })).rejects.toThrow("UNBOUND_PRIVATE_ROUTE_REGISTRY_OR_QUERY_PATH");
  expect(calls).toEqual(["SET ROLE phase6_private_frozen_reader_v39","CLOSED"]);
 });
 it("does not replay or leak private SQL/provider exception after failed reader or child",async()=>{
  const f=fixture(),events:string[]=[];
  await expect(runP6OnePrivateSourceOriginalGHChild(f.env,{
   openRestrictedReader:async()=>({
    async query(){events.push("SQL");},
    async end(){events.push("CLOSE");}
   }),
   hydrateIndex:async()=>{throw Error("PRIVATE_BYTES_SECRET");}
  })).rejects.toThrow("AUTHENTICATED_PRIVATE_SOURCE_AND_INDEX_READER_HOLD_REDACTED");
  expect(events).toEqual(["SQL","CLOSE"]);
  const g=fixture();
  await expect(runP6OnePrivateSourceOriginalGHChild(g.env,{
   openRestrictedReader:async()=>({
    async query(){},async end(){}
   }),
   hydrateIndex:async()=>({privateRoutingCandidates:[{
    routingIntentSha256:ROUTE,signedFrozenPath:REG
   }]}),
   readSourceQuery:async()=>({privateLogicalPath:PACK}),
   runExistingAdmission:async()=>{throw Error("original paid unknown COMMIT");}
  })).rejects.toThrow("ORIGINAL_PHASE5_PAID_GATES_OR_EPHEMERAL_CLEANUP_HOLD_NO_RETRY");
 });
});
