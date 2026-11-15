import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {selectP6CommittedNativeSourceQuery,deriveP6CommittedNativeQueryScope,auditP6StoredCommittedNativeSource}
 from "../server/lib/disruption/phase6StoredSourceNativeCandidateAudit_v39.mjs";
const h=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex"),H=(c:string)=>c.repeat(64);
function fixture(){
 const trust={independentStudyTrustPinsApproved:true,reviewedCodeSha:"a".repeat(40),
  manifestSha256:H("a"),rightsSha256:H("b"),releaseSha256:H("c"),calendarSha256:H("d")};
 const q={schema:"v39.phase5.github-source-one-query-template.v2",manifestSha256:trust.manifestSha256,
  queryDigestSha256:H("e"),plan:{independentlyApprovedSourceAndRetention:true,githubOnlyOwnerApproved:true,
   reviewedProviderRightsSha256:trust.rightsSha256,reviewedReleaseSha256:trust.releaseSha256,
   openapiSha256:H("f"),expectedEarlyDrawSha256:H("1"),day:{scheduledStartUtc:"2027-02-10T11:00:00.000Z"},
   sourcePartition:{schema:"v39.phase5.amendment-c.source-segment-partition.v1",windowShape:"4h",segmentIndex:1,
    partitionIndex:1,verifiedProviderMaxRangeMinutes:60,reviewedProviderRangeEvidenceSha256:H("2")},
   acquisition:{runDayIndex:1,slot:"HUB",horizon:"T-6h",icao:"WSSS",providerQueryDirection:"Departure",
    apiUnitsPerAttempt:2,maxAttempts:1,serviceWindowStartUtc:"2027-02-10T11:00:00.000Z",serviceWindowEndUtc:"2027-02-10T12:00:00.000Z"}}};
 const bytes=Buffer.from(JSON.stringify(q)),path="data-collection/phase5/frozen/sourceq_synthetic_query.json";
 const registry=Buffer.from(JSON.stringify({schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:trust.manifestSha256,runDayIndex:1,entries:[{filePath:path,expectedPacketSha256:h(bytes),
   expectedQueryDigestSha256:q.queryDigestSha256}]}));
 const registryPath="data-collection/phase5/frozen/source_synthetic_registry.json";
 const parsed={schema:"v39.phase6.run-day-scoped-append-only-index.v1",runDayIndex:1,revision:1,
  manifestSha256:trust.manifestSha256,calendarSha256:trust.calendarSha256,reviewedCodeSha:trust.reviewedCodeSha,
  reviewedRightsSha256:trust.rightsSha256,reviewedReleaseSha256:trust.releaseSha256,
  entries:[{lane:"SOURCE",runDayIndex:1,shardIndex:1,filePath:registryPath,fileSha256:h(registry),
    notBeforeUtc:"2027-02-10T04:00:00.000Z",hardLatestUtc:"2027-02-10T04:30:00.000Z"}]};
 const indexBytes=Buffer.from(JSON.stringify(parsed)),selector={runDayIndex:1,indexRevision:1,indexSha256:h(indexBytes),queryDigestSha256:q.queryDigestSha256};
 const index:any={redactedSummary:{status:"SIGNED_DAY_EPOCH_FULL_REGISTRY_READONLY_NO_DISPATCH",indexSha256:h(indexBytes),
  indexRevision:1,runDayIndex:1,externalEd25519ReviewerVerified:true,restrictedPrivatePg16ReaderVerified:true,
  actualPrivateRegistryBytesRead:true,providerCalls:0,databaseWrites:0,phase6PaidGo:false,
  observedDbClockUtc:"2027-02-10T04:40:00.000Z"}};
 Object.defineProperties(index,{privateParsedIndex:{value:parsed,enumerable:false},privateCurrentIndexBytes:{value:indexBytes,enumerable:false},
  getFrozen:{value:(p:string)=>{if(p!==registryPath)throw Error("unexpected");return registry},enumerable:false}});
 const receipt:any={redactedSummary:{status:"VERIFIED_ONE_PRIVATE_PACKET_BYTE_TRANSPORT_NO_GO",kind:"SOURCE_QUERY_PACKET",
  verifiedEd25519Review:true,runDayIndex:1,shardIndex:1,contentSha256:h(bytes),providerCalls:0,databaseWrites:0,githubDispatches:0}};
 Object.defineProperties(receipt,{privateBytes:{value:bytes,enumerable:false},privateLogicalPath:{value:path,enumerable:false}});
 const policy={independentNativeCandidateReadOnlyApproved:true,maximumPopulationStalenessSeconds:3600,providerContractSha256:H("f")};
 return{trust,selector,index,receipt,policy};
}
describe("signed committed SOURCE candidate handoff",()=>{
 it("uses exact signed query after source dispatch window, not a due-source dispatch route",()=>{
  const f=fixture(),selected=selectP6CommittedNativeSourceQuery(f.index,f.selector,f.trust);
  const s=deriveP6CommittedNativeQueryScope(f.receipt,selected,f.selector,f.trust,f.policy);
  expect(s.airportIcao).toBe("WSSS");expect(s.horizon).toBe("T-6h");
  expect(s.expectedServiceWindowEndUtc).toBe("2027-02-10T12:00:00.000Z");
  expect("expectedSourceGithubRunId" in s).toBe(false);
 });
 it("rejects cross-study, absent digest, tampered packet or unapproved policy",()=>{
  const f=fixture();
  expect(()=>selectP6CommittedNativeSourceQuery(f.index,{...f.selector,queryDigestSha256:H("9")},f.trust)).toThrow("SOURCE_QUERY_NOT_UNIQUE");
  expect(()=>selectP6CommittedNativeSourceQuery(f.index,f.selector,{...f.trust,manifestSha256:H("9")})).toThrow("UNAUTHENTICATED");
  const selected=selectP6CommittedNativeSourceQuery(f.index,f.selector,f.trust);
  expect(()=>deriveP6CommittedNativeQueryScope(f.receipt,selected,f.selector,f.trust,{...f.policy,providerContractSha256:H("9")})).toThrow("CONTRACT_DRIFT");
  f.receipt.privateBytes[0]=0;
  expect(()=>deriveP6CommittedNativeQueryScope(f.receipt,selected,f.selector,f.trust,f.policy)).toThrow("UNVERIFIED_SOURCE_QUERY_RECEIPT");
 });
 it("unapproved scope stops before any SQL",async()=>{
  const f=fixture();let calls=0;
  await expect(auditP6StoredCommittedNativeSource({readerClient:{query:async()=>{calls++;throw Error("NO")}},
   sourcePool:{},trust:f.trust,selector:f.selector,policy:f.policy})).rejects.toThrow("NO_EXPLICIT");
  expect(calls).toBe(0);
 });
});
