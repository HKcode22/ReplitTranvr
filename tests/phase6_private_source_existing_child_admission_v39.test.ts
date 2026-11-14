import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {
 mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync
} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {
 runP6OneSourceThroughExistingP5ChildAdmission,
 P6_SOURCE_EXISTING_CHILD_ADMISSION_SCHEMA
} from "../scripts/v39_phase6_private_source_existing_child_admission_v39";
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const H=(s:string)=>s.repeat(64);
const SH="f".repeat(40),QUERY=H("f"),ROUTE=H("9");
const REG="data-collection/phase5/frozen/source_day001_reviewed_test.json";
const PACK="data-collection/phase5/frozen/sourceq_day001_reviewed_test.json";
const at="2026-11-14T05:00:30.000Z";
function fixture(){
 const packet={
  schema:"v39.phase5.github-source-one-query-template.v2",
  manifestSha256:H("a"),queryDigestSha256:QUERY,
  plan:{
   acquisition:{
    runDayIndex:1,slot:"HUB",horizon:"T-24h",icao:"WSSS",
    queryKey:"P6_D01_WSSS_T24_PART01",
    apiUnitsPerAttempt:2,maxAttempts:1,providerQueryDirection:"Departure"
   },
   expectedEarlyDrawSha256:H("9"),
   reviewedReleaseSha256:H("b"),
   reviewedProviderRightsSha256:H("c"),
   openapiSha256:H("d"),
   sourcePartition:{reviewedProviderRangeEvidenceSha256:H("e")},
   independentlyApprovedSourceAndRetention:true,
   githubOnlyOwnerApproved:true
  }
 };
 const packetBytes=Buffer.from(JSON.stringify(packet));
 const registry={
  schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:H("a"),runDayIndex:1,
  entries:[{filePath:PACK,expectedPacketSha256:sha(packetBytes),
   expectedQueryDigestSha256:QUERY}]
 };
 const registryBytes=Buffer.from(JSON.stringify(registry));
 const candidate={
  lane:"SOURCE",runDayIndex:1,shardIndex:1,
  signedFrozenPath:REG,signedFrozenSha256:sha(registryBytes),
  boundSourceRegistryPath:null,boundSourceRegistrySha256:null,
  routingIntentSha256:ROUTE,
  newPaidDispatchAuthorizedHere:false,
  privateBytesOnlyFromRestrictedReader:true,
  independentlyAuthenticatedGHHistoryRequired:true,
  notBeforeUtc:"2026-11-14T04:59:00.000Z",
  hardLatestUtc:"2026-11-14T05:30:00.000Z"
 };
 const indexHandoff:any={redactedSummary:{
  schema:"v39.phase6.private-index-and-full-registries-memory-handoff-no-dispatch.v1",
  status:"SIGNED_RESTRICTED_INMEMORY_31DAY_REGISTRY_HANDOFF_NO_DISPATCH",
  observedRestrictedPgClockUtc:"2026-11-14T05:00:00.000Z",
  phase6PaidGo:false,githubChildDispatches:0,providerCalls:0,
  databaseWrites:0,underlyingPerFlightPacketsNotHydratedHere:true
 }};
 Object.defineProperties(indexHandoff,{
  privateRoutingCandidates:{value:[candidate],writable:false,enumerable:false},
  privateRegistryBytes:{
   value:new Map([[REG,registryBytes]]),writable:false,enumerable:false
  }
 });
 const sourcePacketReceipt:any={redactedSummary:{
  schema:"v39.phase6.private-source-post-packet-restricted-read-once.v1",
  status:"VERIFIED_ONE_PRIVATE_PACKET_BYTE_TRANSPORT_NO_GO",
  kind:"SOURCE_QUERY_PACKET",runDayIndex:1,shardIndex:1,
  contentSha256:sha(packetBytes),verifiedEd25519Review:true,
  actualPhase6PaidGoCertified:false,
  independentlyAuthorizedProviderUseCertified:false,
  contentsWereCopiedToPublicLogs:false,providerCalls:0,databaseWrites:0,
  observedDatabaseClockUtc:at
 }};
 Object.defineProperties(sourcePacketReceipt,{
  privateBytes:{value:packetBytes,enumerable:false,writable:false},
  privateLogicalPath:{value:PACK,enumerable:false,writable:false}
 });
 const env:NodeJS.ProcessEnv={
  GITHUB_ACTIONS:"true",
  GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",
  GITHUB_EVENT_NAME:"workflow_dispatch",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:SH,
  V39_P5_APPROVED_CODE_SHA:SH,ADB_AUTO_COLLECT:"0",
  V39_P5_CHILD_CONFIRM:"ONE_SIGNED_SOURCE_CHILD_MAX_ONE_PAID_GET",
  V39_P5_AUTO_SOURCE_DISPATCH_APPROVED:"1",
  V39_P5_SIGNED_DAY_REGISTRY_RELEASE:"1",
  V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE6_PROCESS_ARMED:"1",
  V39_P5_SOURCE_DB_ROLE_REVIEWED:"1",
  V39_P5_SEVEN_REST_BUDGET_SIGNED:"1",
  V39_P5_REST_UNIT_PRICE_APPROVED:"2",
  P5_SOURCE_BATCH_RUN_DAY_INDEX:"1",
  V39_P5_MANIFEST_SHA256:H("a"),
  V39_P5_RELEASE_SHA256:H("b"),
  V39_P5_RIGHTS_SHA256:H("c"),
  V39_P5_PROVIDER_CONTRACT_SHA256:H("d"),
  V39_P5_VERIFIED_PROVIDER_RANGE_EVIDENCE_SHA256:H("e"),
  P5_SOURCE_CHILD_EXPECTED_QUERY_DIGEST:QUERY,
  V39_P5_SOURCE_BATCH_REGISTRY_SHA256:sha(registryBytes)
 };
 const root=mkdtempSync(join(tmpdir(),"p6-original-p5-child-offline-"));
 mkdirSync(join(root,"data-collection","phase5"),{recursive:true});
 writeFileSync(join(root,".gitignore"),"/data-collection/phase5/frozen/\n");
 let calls=0;
 const args:any={
  indexHandoff,sourcePacketReceipt,
  expectedRoutingIntentSha256:ROUTE,
  expectedQueryDigestSha256:QUERY,env,repoRoot:root,
  runPreviouslyAdmittedExistingChild:async(paths:any)=>{
   calls++;
   expect(paths.registryFilePath).toBe(REG);
   expect(paths.queryPacketFilePath).toBe(PACK);
   expect(readFileSync(join(root,REG))).toEqual(registryBytes);
   expect(readFileSync(join(root,PACK))).toEqual(packetBytes);
  }
 };
 return {args,root,getCalls:()=>calls};
}
async function withFixture(action:(f:ReturnType<typeof fixture>)=>Promise<void>){
 const f=fixture();
 try{await action(f);}
 finally{rmSync(f.root,{recursive:true,force:true});}
}
describe("Phase6 private SOURCE uses exact original Phase5 signed child admission",()=>{
 it("binds exact private packet and original P5 one-get gate before ephemeral child callback",async()=>{
  await withFixture(async f=>{
   const out=await runP6OneSourceThroughExistingP5ChildAdmission(f.args);
   expect(out.schema).toBe(P6_SOURCE_EXISTING_CHILD_ADMISSION_SCHEMA);
   expect(out.originalPhase5SignedChildAdmissionRechecked).toBe(true);
   expect(out.originalPhase5PerGetTwoUnitMaximumPreserved).toBe(true);
   expect(out.phase6PaidGoCertifiedHere).toBe(false);
   expect(out.providerCallsDirectlyFromThisBridge).toBe(0);
   expect(f.getCalls()).toBe(1);
   expect(existsSync(join(f.root,REG))).toBe(false);
   expect(existsSync(join(f.root,PACK))).toBe(false);
  });
 });
 it("rejects absent paid/rights/REST review without exposing or materializing files",async()=>{
  for(const field of ["V39_PHASE5_FREEZE_SIGNED",
   "V39_PHASE5_SOURCE_RIGHTS_APPROVED",
   "V39_P5_SEVEN_REST_BUDGET_SIGNED",
   "V39_PHASE6_PROCESS_ARMED",
   "V39_P5_SOURCE_DB_ROLE_REVIEWED",
   "V39_P5_AUTO_SOURCE_DISPATCH_APPROVED"]){
   await withFixture(async f=>{
    f.args.env[field]="0";
    await expect(runP6OneSourceThroughExistingP5ChildAdmission(f.args))
     .rejects.toThrow("EXISTING_PHASE5_SOURCE_CHILD_SIGNED_RELEASE_REJECTED");
    expect(f.getCalls()).toBe(0);
    expect(existsSync(join(f.root,REG))).toBe(false);
    expect(existsSync(join(f.root,PACK))).toBe(false);
   });
  }
 });
 it("rejects new GH attempt or wrong main SHA before reading or running provider child",async()=>{
  await withFixture(async f=>{
   f.args.env.GITHUB_RUN_ATTEMPT="2";
   await expect(runP6OneSourceThroughExistingP5ChildAdmission(f.args))
    .rejects.toThrow("NO_REAL_GH_CHILD_IDENTITY");
   expect(f.getCalls()).toBe(0);
  });
  await withFixture(async f=>{
   f.args.env.V39_P5_APPROVED_CODE_SHA="a".repeat(40);
   await expect(runP6OneSourceThroughExistingP5ChildAdmission(f.args))
    .rejects.toThrow("NO_REAL_GH_CHILD_IDENTITY");
   expect(f.getCalls()).toBe(0);
  });
 });
 it("rejects swapped approved query, day and registry SHA",async()=>{
  for(const [k,v] of [
   ["P5_SOURCE_CHILD_EXPECTED_QUERY_DIGEST",H("0")],
   ["P5_SOURCE_BATCH_RUN_DAY_INDEX","2"],
   ["V39_P5_SOURCE_BATCH_REGISTRY_SHA256",H("0")]
  ]){
   await withFixture(async f=>{
    f.args.env[k]=v;
    await expect(runP6OneSourceThroughExistingP5ChildAdmission(f.args))
     .rejects.toThrow("CHILD_ENV_QUERY_DAY_REGISTRY_OR_GO_DRIFT");
    expect(f.getCalls()).toBe(0);
   });
  }
 });
 it("preserves actual original Phase5 source-template release fields and pricing",async()=>{
  await withFixture(async f=>{
   f.args.env.V39_P5_RELEASE_SHA256=H("0");
   await expect(runP6OneSourceThroughExistingP5ChildAdmission(f.args))
    .rejects.toThrow("EXISTING_PHASE5_SOURCE_CHILD_SIGNED_RELEASE_REJECTED");
   expect(f.getCalls()).toBe(0);
  });
 });
 it("scrubs both private files after a child exception, no arbitrary error leak",async()=>{
  await withFixture(async f=>{
   f.args.runPreviouslyAdmittedExistingChild=async()=>{
    throw Error("SYNTHETIC_PRIVATE_PROVIDER_CONTENT_MUST_NEVER_APPEAR");
   };
   let err="";
   try{await runP6OneSourceThroughExistingP5ChildAdmission(f.args);}
   catch(e){err=String(e);}
   expect(err).toContain("EXISTING_CHILD_FAILED_OR_PRIVATE_FILES_NOT_CLEANED");
   expect(err).not.toContain("SYNTHETIC_PRIVATE_PROVIDER_CONTENT");
   expect(existsSync(join(f.root,REG))).toBe(false);
   expect(existsSync(join(f.root,PACK))).toBe(false);
  });
 });
});
