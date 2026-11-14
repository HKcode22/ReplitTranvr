import {describe,it,expect} from "vitest";
import {
 admitP6GithubRestrictedIndexCanary,
 runP6GithubRestrictedIndexCanaryOnce,
 P6_GH_PRIVATE_READONLY_CANARY_SCHEMA
} from "../scripts/v39_phase6_private_index_github_readonly_canary_v39.mjs";

const CODE="f".repeat(40),H=v=>v.repeat(64);
const LOGIN="phase6_private_reader_login_ci_checks";
const SECRET="ci-only-not-a-real-password";
const URL_OK="postgresql://"+LOGIN+":"+SECRET+
 "@test.neon.tech/neondb?sslmode=require";
const b64=s=>Buffer.from(s,"utf8").toString("base64");
function fixture(){
 const pins={
  independentExternalReviewerSignaturePinsApproved:true,
  privateIndexReadOnlyApproved:true,
  existingPaidGithubDispatchApproved:false,
  expectedReaderSessionLogin:LOGIN,
  expectedIndexRevision:1,
  expectedIndexSha256:H("a"),
  expectedPreviousIndexSha256:null,
  expectedReviewedCodeSha:CODE,
  expectedManifestSha256:H("b"),
  expectedCalendarSha256:H("c"),
  expectedReleaseSha256:H("d"),
  expectedRightsSha256:H("e"),
  expectedExternalReviewEvidenceSha256:H("0"),
  expectedReviewerPublicKeyFingerprintSha256:H("1")
 };
 const wire={
  review:{schema:"v39.phase6.external-signed-index-revision-review-ed25519.v1"},
  signatureBase64:"synthetic-CI-only-signature-not-a-real-signer"
 };
 const pem="-----BEGIN PUBLIC KEY-----\n"+
  "CI_TEST_PUBLIC_KEY_ONLY_NOT_REAL_SIGNED_INPUT\n"+
  "-----END PUBLIC KEY-----";
 const env={
  GITHUB_ACTIONS:"true",
  GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",
  GITHUB_EVENT_NAME:"workflow_dispatch",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:CODE,
  P6_PRIVATE_INDEX_CANARY_MAIN_SHA:CODE,
  P6_PRIVATE_INDEX_GH_CANARY_CONFIRM:
   "VERIFY_RESTRICTED_PRIVATE_INDEX_READONLY_NO_PAID",
  P6_PRIVATE_INDEX_CANARY_OWNER_APPROVED:"1",
  ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",
  V39_PHASE6_OWNER_APPROVED:"0",
  AERODATABOX_API_KEY:"",RAPIDAPI_KEY:"",DATABASE_URL:"",
  V39_P5_SOURCE_DATABASE_URL:"",GITHUB_TOKEN:"",
  P6_PRIVATE_READER_DATABASE_URL:URL_OK,
  P6_PRIVATE_INDEX_REVIEW_PINS_BASE64:b64(JSON.stringify(pins)),
  P6_PRIVATE_INDEX_REVIEW_WIRE_BASE64:b64(JSON.stringify(wire)),
  P6_PRIVATE_INDEX_REVIEWER_PUBLIC_KEY_PEM_BASE64:b64(pem)
 };
 return{env,pins,wire,pem};
}
function readReceipt(pins){
 return {redactedSummary:{
  schema:"v39.phase6.private-index-and-full-registries-memory-handoff-no-dispatch.v1",
  status:"SIGNED_RESTRICTED_INMEMORY_31DAY_REGISTRY_HANDOFF_NO_DISPATCH",
  currentIndexSha256:pins.expectedIndexSha256,
  currentIndexRevision:pins.expectedIndexRevision,
  verifiedRegistryCount:3,
  phase6PaidGo:false,providerCalls:0,databaseWrites:0,
  githubChildDispatches:0,
  privateRegistryBytesWereNeverWrittenToCheckout:true,
  privateSignedPathsExcludedFromPublicJson:true,
  observedRestrictedPgClockUtc:"2026-11-14T05:44:00.000Z"
 }};
}
describe("GH private V0096 index canary: live workflow admission, offline tests",()=>{
 it("prevents accidental provider, app-role or public signed secret output",()=>{
  const f=fixture(),a=admitP6GithubRestrictedIndexCanary(f.env);
  expect(a.redactedSummary.phase6PaidGo).toBe(false);
  const printed=JSON.stringify(a);
  expect(printed).not.toContain(SECRET);
  expect(printed).not.toContain(LOGIN);
  expect(printed).not.toContain("signatureBase64");
  expect(printed).not.toContain("CI_TEST_PUBLIC_KEY");
  expect(a.privateScope.pins.expectedReviewedCodeSha).toBe(CODE);
 });
 it("only executes SET ROLE and preexisting verifier callback, never SQL write or provider",async()=>{
  const f=fixture(),queries=[];
  let closed=0,opens=0,verifications=0;
  const fake={
   async query(sql){queries.push(sql);return{rowCount:0,rows:[]};},
   async end(){closed++;}
  };
  const out=await runP6GithubRestrictedIndexCanaryOnce(f.env,{
   openRestrictedReader:async url=>{
    opens++;
    expect(url).toBe(URL_OK);
    return fake;
   },
   hydrateRestrictedIndex:async({client,reviewPins,reviewWire,reviewerPublicKeyPem})=>{
    verifications++;
    expect(client).toBe(fake);
    expect(reviewPins).toEqual(f.pins);
    expect(reviewWire).toEqual(f.wire);
    expect(reviewerPublicKeyPem).toBe(f.pem);
    return readReceipt(f.pins);
   }
  });
  expect(opens).toBe(1);
  expect(verifications).toBe(1);
  expect(queries).toEqual(["SET ROLE phase6_private_frozen_reader_v39"]);
  expect(closed).toBe(1);
  expect(out.schema).toBe(P6_GH_PRIVATE_READONLY_CANARY_SCHEMA);
  expect(out.status).toContain("VERIFIED_NO_PAID_GO");
  expect(out.providerCalls).toBe(0);
  expect(out.databaseWrites).toBe(0);
  expect(out.githubDispatches).toBe(0);
  expect(out.phase6PaidGo).toBe(false);
  expect(JSON.stringify(out)).not.toContain("test.neon.tech");
 });
 it("refuses schedule/PR/wrong main/retry/missing independent explicit canary release",()=>{
  for(const override of [
   {GITHUB_EVENT_NAME:"schedule"},
   {GITHUB_EVENT_NAME:"pull_request"},
   {GITHUB_REF:"refs/heads/feature"},
   {GITHUB_RUN_ATTEMPT:"2"},
   {GITHUB_SHA:"a".repeat(40)},
   {P6_PRIVATE_INDEX_CANARY_MAIN_SHA:"0".repeat(40)},
   {P6_PRIVATE_INDEX_CANARY_OWNER_APPROVED:"0"},
   {P6_PRIVATE_INDEX_GH_CANARY_CONFIRM:"MISSING"}
  ]){
   const f=fixture();
   expect(()=>admitP6GithubRestrictedIndexCanary({...f.env,...override}))
    .toThrow("HOLD_P6_GH_PRIVATE_READER_CANARY_NOT_MANUAL");
  }
 });
 it("refuses paid keys or old application/source/pre/rest credentials",()=>{
  for(const key of [
   "AERODATABOX_API_KEY","RAPIDAPI_KEY","DATABASE_URL",
   "V39_P5_SOURCE_DATABASE_URL","P5_V39_PRE_DATABASE_URL",
   "P5_V39_OTHER_REST_REVIEW_DATABASE_URL",
   "P5_V39_OTHER_REST_RESERVE_DATABASE_URL","GITHUB_TOKEN"
  ]){
   const f=fixture();
   f.env[key]="FORBIDDEN_IN_READ_ONLY_CANARY";
   expect(()=>admitP6GithubRestrictedIndexCanary(f.env))
    .toThrow("NOT_MANUAL_UNARMED_APPROVED_MAIN_OR_ROLE_ISOLATED");
  }
 });
 it("refuses owner/app role or SSL disable in the private scoped PG connection",()=>{
  for(const u of [
   "postgresql://neondb_owner:owner@test.neon.tech/neondb?sslmode=require",
   "postgresql://"+LOGIN+":ci@test.neon.tech/neondb?sslmode=disable",
   "postgresql://"+LOGIN+":ci@test.neon.tech/postgres?sslmode=require",
   "postgresql://"+LOGIN+":ci@test.neon.tech/neondb",
   "postgresql://"+LOGIN+":ci@test.neon.tech/neondb?sslmode=require&options=-c"
  ]){
   const f=fixture();f.env.P6_PRIVATE_READER_DATABASE_URL=u;
   expect(()=>admitP6GithubRestrictedIndexCanary(f.env))
    .toThrow("CROSS_ROLE_OR_NON_SSL_PRIVATE_NEONDB_LOGIN");
  }
 });
 it("refuses forged/replaced code SHA, private scope or signer pins",()=>{
  for(const replacement of [
   {expectedReviewedCodeSha:"0".repeat(40)},
   {privateIndexReadOnlyApproved:false},
   {existingPaidGithubDispatchApproved:true},
   {independentExternalReviewerSignaturePinsApproved:false},
   {expectedReaderSessionLogin:"neondb_owner"},
   {expectedIndexSha256:"bad"}
  ]){
   const f=fixture();
   f.env.P6_PRIVATE_INDEX_REVIEW_PINS_BASE64=
    b64(JSON.stringify({...f.pins,...replacement}));
   expect(()=>admitP6GithubRestrictedIndexCanary(f.env))
    .toThrow(/HOLD_P6_GH_PRIVATE_READER_CANARY_/);
  }
 });
 it("redacts private SQL or verifier error and closes without leaking contents",async()=>{
  const f=fixture(),events=[];
  await expect(runP6GithubRestrictedIndexCanaryOnce(f.env,{
   openRestrictedReader:async()=>({
    async query(sql){events.push(sql);return{};},
    async end(){events.push("closed");}
   }),
   hydrateRestrictedIndex:async()=>{
    throw Error("PRIVATE_PROVIDER_PACKET_DATA_SHOULD_NOT_LEAK");
   }
  })).rejects.toThrow(
   "HOLD_P6_GH_PRIVATE_READER_CANARY_RESTRICTED_PG16_AUTH_SIGNED_INDEX_OR_READ_HOLD_REDACTED");
  expect(events).toEqual(["SET ROLE phase6_private_frozen_reader_v39","closed"]);
 });
 it("fails closed on fake nonzero paid result or missing authenticated private read",async()=>{
  const f=fixture();
  for(const changed of [
   {phase6PaidGo:true},{providerCalls:1},
   {privateSignedPathsExcludedFromPublicJson:false},
   {verifiedRegistryCount:0},
   {currentIndexSha256:H("0")}
  ]){
   await expect(runP6GithubRestrictedIndexCanaryOnce(f.env,{
    openRestrictedReader:async()=>({async query(){return{};},async end(){}}),
    hydrateRestrictedIndex:async()=>({
     redactedSummary:{...readReceipt(f.pins).redactedSummary,...changed}
    })
   })).rejects.toThrow("RESTRICTED_PG16_AUTH_SIGNED_INDEX_OR_READ_HOLD_REDACTED");
  }
 });
});
