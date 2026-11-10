import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {admitP5SignedDaySourceChild}
 from "../server/lib/disruption/phase5SignedDaySourceChildRelease_v39";
import type {P5SignedSourceBatchRegistry}
 from "../server/lib/disruption/phase5SignedPerDaySourceBatchReadonly_v39";
import type {P5GitHubOneQueryReleaseEnvelope}
 from "../server/lib/disruption/phase5GitHubOneQueryReleaseAdmission_v39";
const h=(v:string)=>v.repeat(64);
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const path="data-collection/phase5/frozen/day01_wsss_t24_signed.json";
const registryPath="data-collection/phase5/frozen/day01_registry_signed.json";
const envBase:NodeJS.ProcessEnv={
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"f".repeat(40),
 V39_P5_APPROVED_CODE_SHA:"f".repeat(40),ADB_AUTO_COLLECT:"0",
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
 V39_P5_MANIFEST_SHA256:h("a"),
 V39_P5_RELEASE_SHA256:h("b"),
 V39_P5_RIGHTS_SHA256:h("c"),
 V39_P5_PROVIDER_CONTRACT_SHA256:h("d"),
 V39_P5_VERIFIED_PROVIDER_RANGE_EVIDENCE_SHA256:h("e"),
 P5_SOURCE_CHILD_EXPECTED_QUERY_DIGEST:h("f")
};
function fixture(){
 const packet={
  schema:"v39.phase5.github-source-one-query-template.v2",
  manifestSha256:h("a"),queryDigestSha256:h("f"),
  plan:{
   acquisition:{
    runDayIndex:1,slot:"HUB",horizon:"T-24h",icao:"WSSS",
    queryKey:"P5_D01_WSSS_T24_PART01",
    apiUnitsPerAttempt:2,maxAttempts:1,providerQueryDirection:"Departure"
   },
   expectedEarlyDrawSha256:h("9"),
   reviewedReleaseSha256:h("b"),
   reviewedProviderRightsSha256:h("c"),
   openapiSha256:h("d"),
   sourcePartition:{reviewedProviderRangeEvidenceSha256:h("e")},
   independentlyApprovedSourceAndRetention:true,githubOnlyOwnerApproved:true
  }
 } as unknown as P5GitHubOneQueryReleaseEnvelope;
 const packetBytes=Buffer.from(JSON.stringify(packet));
 const registry:P5SignedSourceBatchRegistry={
  schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:h("a"),runDayIndex:1,
  entries:[{filePath:path,expectedPacketSha256:sha(packetBytes),
   expectedQueryDigestSha256:h("f")}]
 };
 const registryBytes=Buffer.from(JSON.stringify(registry));
 const env={...envBase,V39_P5_SOURCE_BATCH_REGISTRY_SHA256:sha(registryBytes)};
 const fields={packet,packetBytes,registry,registryBytes,env};
 const run=()=>admitP5SignedDaySourceChild(
  fields.env,fields.registryBytes,fields.registry,
  fields.packetBytes,fields.packet,path,registryPath);
 return Object.assign(fields,{run});
}
describe("Phase5 per-day signed GitHub child admission never signs rights or runs provider",()=>{
 it("extracts exact immutable query SHA/identity only from externally pinned day registry",()=>{
  const f=fixture(),r=f.run();
  expect(r.selectedQueryDigestSha256).toBe(h("f"));
  expect(r.selectedPacketSha256).toBe(sha(f.packetBytes));
  expect(r.dynamicOneGetEnv.V39_P5_QUERY_DIGEST).toBe(h("f"));
  expect(r.dynamicOneGetEnv.V39_P5_SIGNED_QUERY_JSON_SHA256).toBe(sha(f.packetBytes));
  expect(r.physicalFidsGetLimit).toBe(1);
  expect(r.sourceRightsCertifiedByThisCode).toBe(false);
  expect(r.phase6PaidGoGrantedByThisCode).toBe(false);
 });
 it("fails closed for missing GO, source rights, seven REST review, signed day registry or code SHA",()=>{
  for(const [key,value] of [
   ["V39_PHASE6_PROCESS_ARMED","0"],
   ["V39_PHASE5_SOURCE_RIGHTS_APPROVED","0"],
   ["V39_P5_SEVEN_REST_BUDGET_SIGNED","0"],
   ["V39_P5_SIGNED_DAY_REGISTRY_RELEASE","0"],
   ["V39_P5_AUTO_SOURCE_DISPATCH_APPROVED","0"],
   ["GITHUB_EVENT_NAME","schedule"],
   ["GITHUB_RUN_ATTEMPT","2"],
   ["V39_P5_APPROVED_CODE_SHA","a".repeat(40)],
   ["V39_P5_CHILD_CONFIRM",""]
  ]){
   const f=fixture();f.env[key]=value;
   expect(()=>f.run()).toThrow("INDEPENDENT_PAID_SOURCE_GO_NOT_SIGNED");
  }
 });
 it("rejects changed manifest, wrong signed day and query substitution",()=>{
  const a=fixture();a.env.V39_P5_MANIFEST_SHA256=h("0");
  expect(()=>a.run()).toThrow("DAY_REGISTRY_DOES_NOT_MATCH_APPROVED_MANIFEST");
  const b=fixture();b.env.P5_SOURCE_BATCH_RUN_DAY_INDEX="2";
  expect(()=>b.run()).toThrow("DAY_REGISTRY_DOES_NOT_MATCH_APPROVED_MANIFEST");
  const c=fixture();c.env.P5_SOURCE_CHILD_EXPECTED_QUERY_DIGEST=h("0");
  expect(()=>c.run()).toThrow("SIGNED_SOURCE_RELEASE_SCOPE_OR_QUERY_CHANGED");
 });
 it("rejects packet tampering, unsigned registry and a missing signed packet",()=>{
  const a=fixture();a.packetBytes=Buffer.concat([a.packetBytes,Buffer.from(" ")]);
  expect(()=>a.run()).toThrow("QUERY_NOT_IN_SIGNED_REGISTRY_OR_CHANGED_RAW_BYTES");
  const b=fixture();b.env.V39_P5_SOURCE_BATCH_REGISTRY_SHA256=h("0");
  expect(()=>b.run()).toThrow("FROZEN_PER_DAY_REGISTRY_BYTES_OR_FILE_UNVERIFIED");
  const c=fixture();
  expect(()=>admitP5SignedDaySourceChild(
   c.env,c.registryBytes,c.registry,c.packetBytes,c.packet,
   "data-collection/phase5/frozen/unknownpacket.json",registryPath
  )).toThrow("QUERY_NOT_IN_SIGNED_REGISTRY_OR_CHANGED_RAW_BYTES");
 });
 it("rejects unsafe second physical GET, altered provider source contract and forged registry duplicates",()=>{
  const a=fixture();(a.packet.plan.acquisition as any).maxAttempts=2;
  a.packetBytes=Buffer.from(JSON.stringify(a.packet));
  a.registry.entries[0].expectedPacketSha256=sha(a.packetBytes);
  a.registryBytes=Buffer.from(JSON.stringify(a.registry));
  a.env.V39_P5_SOURCE_BATCH_REGISTRY_SHA256=sha(a.registryBytes);
  expect(()=>a.run()).toThrow("SIGNED_SOURCE_RELEASE_SCOPE_OR_QUERY_CHANGED");
  const b=fixture();b.env.V39_P5_PROVIDER_CONTRACT_SHA256=h("0");
  expect(()=>b.run()).toThrow("SIGNED_SOURCE_RELEASE_SCOPE_OR_QUERY_CHANGED");
  const c=fixture();c.registry.entries.push({...c.registry.entries[0]});
  c.registryBytes=Buffer.from(JSON.stringify(c.registry));
  c.env.V39_P5_SOURCE_BATCH_REGISTRY_SHA256=sha(c.registryBytes);
  expect(()=>c.run()).toThrow("DUPLICATE_OR_MALFORMED_REGISTRY_ENTRY");
 });
});
