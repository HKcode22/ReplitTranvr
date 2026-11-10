/**
 * Phase5 unattended SOURCE child: authenticate a concrete per-day registry
 * entry BEFORE deriving dynamic per-query pins for the existing manual
 * one-GET owner. The old paid owner and all V0080/V0079/V0082 SQL remain
 * unchanged; it still runs as workflow_dispatch with the REAL GH run ID.
 *
 * No provider, GitHub dispatch, credential read, SQL or file I/O here.
 */
import {createHash} from "node:crypto";
import type {P5SignedSourceBatchRegistry}
 from "./phase5SignedPerDaySourceBatchReadonly_v39";
import type {P5GitHubOneQueryReleaseEnvelope}
 from "./phase5GitHubOneQueryReleaseAdmission_v39";

const H=/^[0-9a-f]{64}$/;
const CODE=/^[0-9a-f]{40}$/;
const FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const sha=(x:Buffer)=>createHash("sha256").update(x).digest("hex");
function fail(s:string):never{
 throw Error("REFUSED_P5_SIGNED_SOURCE_CHILD_"+s);
}
export interface P5ChildRegistryAdmitted{
 schema:"v39.phase5.signed-day-source-child-entry.v1";
 frozenPacketPath:string;registryFilePath:string;
 selectedQueryDigestSha256:string;selectedPacketSha256:string;
 pinnedManifestSha256:string;runDayIndex:number;
 dynamicOneGetEnv:{
  V39_P5_QUERY_DIGEST:string;V39_P5_SIGNED_QUERY_JSON_SHA256:string;
 };
 physicalFidsGetLimit:1;physicalUnitLimit:2;
 reservationAndSevenRestUtcEnforcedByV0079V0082:true;
 sourceRightsCertifiedByThisCode:false;
 phase6PaidGoGrantedByThisCode:false;
}
export function admitP5SignedDaySourceChild(
 env:NodeJS.ProcessEnv,
 registryBytes:Buffer,registry:P5SignedSourceBatchRegistry,
 packetBytes:Buffer,packet:P5GitHubOneQueryReleaseEnvelope,
 packetPath:string,registryPath:string
):P5ChildRegistryAdmitted{
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(env.GITHUB_SHA??"")||
    env.GITHUB_SHA!==env.V39_P5_APPROVED_CODE_SHA||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_P5_CHILD_CONFIRM!=="ONE_SIGNED_SOURCE_CHILD_MAX_ONE_PAID_GET"||
    env.V39_P5_AUTO_SOURCE_DISPATCH_APPROVED!=="1"||
    env.V39_P5_SIGNED_DAY_REGISTRY_RELEASE!=="1"||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1"||
    env.V39_P5_SOURCE_DB_ROLE_REVIEWED!=="1"||
    env.V39_P5_SEVEN_REST_BUDGET_SIGNED!=="1"||
    env.V39_P5_REST_UNIT_PRICE_APPROVED!=="2")
  fail("INDEPENDENT_PAID_SOURCE_GO_NOT_SIGNED");
 const day=Number(env.P5_SOURCE_BATCH_RUN_DAY_INDEX??"");
 if(!Number.isSafeInteger(day)||day<1||day>31||
    !FILE.test(packetPath)||!FILE.test(registryPath)||
    packetPath===registryPath||
    !H.test(env.V39_P5_SOURCE_BATCH_REGISTRY_SHA256??"")||
    !Buffer.isBuffer(registryBytes)||registryBytes.length<100||
    registryBytes.length>100000||
    sha(registryBytes)!==env.V39_P5_SOURCE_BATCH_REGISTRY_SHA256)
  fail("FROZEN_PER_DAY_REGISTRY_BYTES_OR_FILE_UNVERIFIED");
 if(!registry||
    registry.schema!=="v39.phase5.signed-per-day-source-batch-readonly.v1"||
    registry.runDayIndex!==day||
    registry.manifestSha256!==env.V39_P5_MANIFEST_SHA256||
    !H.test(registry.manifestSha256??"")||
    !Array.isArray(registry.entries)||
    registry.entries.length<1||registry.entries.length>96)
  fail("DAY_REGISTRY_DOES_NOT_MATCH_APPROVED_MANIFEST");
 if(!Buffer.isBuffer(packetBytes)||packetBytes.length<100||
    packetBytes.length>200000)
  fail("CHILD_PACKET_INVALID_BYTES");
 const uniquePath=new Set<string>(),uniqueDigest=new Set<string>();
 let selected:{expectedPacketSha256:string;expectedQueryDigestSha256:string}|null=null;
 for(const entry of registry.entries){
  if(!entry||!FILE.test(entry.filePath??"")||
     !H.test(entry.expectedPacketSha256??"")||
     !H.test(entry.expectedQueryDigestSha256??"")||
     entry.filePath===registryPath||
     uniquePath.has(entry.filePath)||
     uniqueDigest.has(entry.expectedQueryDigestSha256))
   fail("DUPLICATE_OR_MALFORMED_REGISTRY_ENTRY");
  uniquePath.add(entry.filePath);uniqueDigest.add(entry.expectedQueryDigestSha256);
  if(entry.filePath===packetPath)
   selected={
    expectedPacketSha256:entry.expectedPacketSha256,
    expectedQueryDigestSha256:entry.expectedQueryDigestSha256
   };
 }
 if(!selected||sha(packetBytes)!==selected.expectedPacketSha256)
  fail("QUERY_NOT_IN_SIGNED_REGISTRY_OR_CHANGED_RAW_BYTES");
 if(!packet||
    packet.schema!=="v39.phase5.github-source-one-query-template.v2"||
    packet.manifestSha256!==registry.manifestSha256||
    packet.queryDigestSha256!==selected.expectedQueryDigestSha256||
    packet.queryDigestSha256!==env.P5_SOURCE_CHILD_EXPECTED_QUERY_DIGEST||
    packet.plan?.acquisition?.runDayIndex!==day||
    !H.test(packet.plan?.expectedEarlyDrawSha256??"")||
    packet.plan?.reviewedReleaseSha256!==env.V39_P5_RELEASE_SHA256||
    packet.plan?.reviewedProviderRightsSha256!==env.V39_P5_RIGHTS_SHA256||
    packet.plan?.openapiSha256!==env.V39_P5_PROVIDER_CONTRACT_SHA256||
    packet.plan?.sourcePartition?.reviewedProviderRangeEvidenceSha256!==
      env.V39_P5_VERIFIED_PROVIDER_RANGE_EVIDENCE_SHA256||
    packet.plan?.independentlyApprovedSourceAndRetention!==true||
    packet.plan?.githubOnlyOwnerApproved!==true||
    packet.plan?.acquisition?.apiUnitsPerAttempt!==2||
    packet.plan?.acquisition?.maxAttempts!==1||
    packet.plan?.acquisition?.providerQueryDirection!=="Departure"||
    Object.hasOwn(packet,"githubRunId")||
    Object.hasOwn(packet,"approvedCodeSha"))
  fail("SIGNED_SOURCE_RELEASE_SCOPE_OR_QUERY_CHANGED");
 return{
  schema:"v39.phase5.signed-day-source-child-entry.v1",
  frozenPacketPath:packetPath,registryFilePath:registryPath,
  selectedQueryDigestSha256:packet.queryDigestSha256,
  selectedPacketSha256:selected.expectedPacketSha256,
  pinnedManifestSha256:packet.manifestSha256,
  runDayIndex:day,
  dynamicOneGetEnv:{
   V39_P5_QUERY_DIGEST:selected.expectedQueryDigestSha256,
   V39_P5_SIGNED_QUERY_JSON_SHA256:selected.expectedPacketSha256
  },
  physicalFidsGetLimit:1,physicalUnitLimit:2,
  reservationAndSevenRestUtcEnforcedByV0079V0082:true,
  sourceRightsCertifiedByThisCode:false,
  phase6PaidGoGrantedByThisCode:false
 };
}
