/**
 * Phase 6: exact one due native T6/T90 packet from the AUTHENTICATED V0094
 * restricted PG16 later PRE hydrator, cross-bound to the V0096 signed
 * SOURCE/PRE/POST index, then REUSE original Phase5 later PRE admission.
 *
 * Pure no-I/O reviewer. No provider HTTP, DB write, automatic GitHub
 * dispatch, signer, impersonated native operating leg or paid GO.
 * Caller must supply real prior restricted PG16 readers and separately
 * approved code/calendar/rights pins; the signed index is not itself a
 * lawful-use grant. Existing runP5SignedWitnessedLaterPre/Stage14 is the
 * only future write path and must validate PRE-only login and real clock.
 */
import {createHash} from "node:crypto";
import {
 admitP5LaterRegistryChildEnv
} from "../../../scripts/v39_phase5_later_pre_registry_child_v39";
import {
 admitP5SignedWitnessedLaterPre
} from "../../../scripts/v39_phase5_one_signed_witnessed_later_pre_github_owner_v39";
import type {
 P5PrivateFrozenHydrationOutput
} from "./phase5Phase6Pg16PrivateLaterPreHydrator_v39";

export const P6_PRIVATE_LATER_PRE_STAGE14_BRIDGE_SCHEMA=
 "v39.phase6.private-native-later-pre-existing-stage14-admission-no-go.v1";
const SHA=/^[0-9a-f]{64}$/;
const PATH=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const SOURCE=/^data-collection\/phase5\/frozen\/source_[A-Za-z0-9_.-]{8,125}\.json$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const fail=(s:string):never=>{
 throw Error("HOLD_P6_PRIVATE_LATER_PRE_STAGE14_"+s);
};
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
function utc(value:unknown){
 if(typeof value!=="string")
  fail("UNVERIFIED_ACTUAL_DB_CLOCK_OR_NATIVE_T");
 const exact=value as string;
 if(!ISO.test(exact)||!Number.isFinite(Date.parse(exact))||
    new Date(exact).toISOString()!==exact)
  fail("UNVERIFIED_ACTUAL_DB_CLOCK_OR_NATIVE_T");
 return Date.parse(exact);
}
function hidden(obj:unknown,name:string){
 if(!obj||typeof obj!=="object")return false;
 const d=Object.getOwnPropertyDescriptor(obj,name);
 return Boolean(d&&d.enumerable===false&&d.writable===false);
}
export interface P6OnePrivateLaterPrePins{
 expectedRoutingIntentSha256:string;
 expectedLaterPacketPath:string;
 expectedLaterPacketSha256:string;
 expectedQueryDigestSha256:string;
 expectedSourceRegistryPath:string;
 expectedFlightInstanceId:string;
 expectedHorizon:"T-6h"|"T-90m";
}
export function admitP6OneVerifiedPrivateLaterPreToExistingStage14({
 indexHandoff,hydrated,env,pins
}:{
 indexHandoff:any;
 hydrated:P5PrivateFrozenHydrationOutput;
 env:NodeJS.ProcessEnv;
 pins:P6OnePrivateLaterPrePins;
}){
 if(!pins||
    ![pins.expectedRoutingIntentSha256,
      pins.expectedLaterPacketSha256,
      pins.expectedQueryDigestSha256].every(x=>SHA.test(x??""))||
    !PATH.test(pins.expectedLaterPacketPath??"")||
    !SOURCE.test(pins.expectedSourceRegistryPath??"")||
    typeof pins.expectedFlightInstanceId!=="string"||
    pins.expectedFlightInstanceId.length<5||
    !["T-6h","T-90m"].includes(pins.expectedHorizon))
  fail("MISSING_EXACT_LATER_PRE_FLIGHT_AND_ROUTE_PINS");

 const z=indexHandoff?.redactedSummary;
 if(z?.schema!==
      "v39.phase6.private-index-and-full-registries-memory-handoff-no-dispatch.v1"||
    z.status!=="SIGNED_RESTRICTED_INMEMORY_31DAY_REGISTRY_HANDOFF_NO_DISPATCH"||
    z.phase6PaidGo!==false||z.providerCalls!==0||
    z.databaseWrites!==0||z.githubChildDispatches!==0||
    z.underlyingPerFlightPacketsNotHydratedHere!==true||
    !hidden(indexHandoff,"privateRoutingCandidates")||
    !hidden(indexHandoff,"privateRegistryBytes")||
    !Array.isArray(indexHandoff.privateRoutingCandidates)||
    !(indexHandoff.privateRegistryBytes instanceof Map))
  fail("UNVERIFIED_SIGNED_PRIVATE_INDEX_HANDOFF");
 const routes=indexHandoff.privateRoutingCandidates.filter((c:any)=>
  c?.routingIntentSha256===pins.expectedRoutingIntentSha256);
 if(routes.length!==1)fail("NO_UNIQUE_EXACT_SIGNED_LATER_ROUTE");
 const route=routes[0];
 if(route.lane!=="LATER_PRE"||
    route.newPaidDispatchAuthorizedHere!==false||
    route.independentlyAuthenticatedGHHistoryRequired!==true||
    route.privateBytesOnlyFromRestrictedReader!==true||
    route.signedFrozenPath!==hydrated?.verified?.registryFilePath||
    route.signedFrozenSha256!==hydrated?.verified?.registrySha256||
    route.boundSourceRegistryPath!==pins.expectedSourceRegistryPath||
    route.boundSourceRegistrySha256!==hydrated?.verified?.sourceDayRegistrySha256||
    route.runDayIndex!==hydrated?.verified?.runDayIndex||
    route.shardIndex!==hydrated?.verified?.shardIndex)
  fail("SOURCE_REGISTRY_DAY_SHARD_OR_SIGNED_ROUTE_DRIFT");
 const laterRaw=indexHandoff.privateRegistryBytes.get(route.signedFrozenPath);
 const sourceRaw=indexHandoff.privateRegistryBytes.get(route.boundSourceRegistryPath);
 if(!Buffer.isBuffer(laterRaw)||!Buffer.isBuffer(sourceRaw)||
    hash(laterRaw)!==route.signedFrozenSha256||
    hash(sourceRaw)!==route.boundSourceRegistrySha256)
  fail("PRIVATE_SOURCE_OR_LATER_REGISTRY_SHA_CHANGED");

 const r=hydrated?.redactedSummary,v=hydrated?.verified,due=hydrated?.due;
 if(hydrated?.schema!=="v39.phase5.phase6-pg16-private-later-hydration.v1"||
    v?.schema!=="v39.phase5.verified-later-pre-day-registry.v1"||
    due?.schema!=="v39.phase5.later-pre-registry-clock-due-selection.v1"||
    r?.privateReaderRoleVerified!==true||
    r?.phase6PaidGoGranted!==false||
    r?.phase5ScientificFreezeGranted!==false||
    r?.providerCalls!==0||r?.databaseWrites!==0||
    r?.githubDispatches!==0||r?.publicCheckoutContentsEmitted!==false||
    r?.laterRegistrySha256!==v.registrySha256||
    r?.sourceRegistrySha256!==v.sourceDayRegistrySha256||
    r?.runDayIndex!==v.runDayIndex||
    r?.shardIndex!==v.shardIndex||
    v.providerCalls!==0||v.databaseWrites!==0||
    v.githubChildDispatches!==0||
    v.phase6PaidGoGrantedByRegistry!==false||
    v.phase5ScientificFreezeCertifiedByRegistry!==false||
    due.phase6PaidGoGrantedHere!==false||
    due.providerCalls!==0||due.databaseWrites!==0||
    due.githubChildDispatches!==0||
    !Array.isArray(v.entries)||!Array.isArray(due.selectedForActualPgReadback)||
    due.selectedForActualPgReadback.length>4||
    due.totalSignedFlightHorizons!==v.entries.length||
    r.signedNativeFlightHorizons!==v.entries.length||
    hydrated.observedDbClockUtc!==due.observedDbClockUtc)
  fail("NOT_AUTHENTICATED_V0094_LATER_HYDRATION_AND_DUE_RECEIPT");

 const indexTime=utc(z.observedRestrictedPgClockUtc);
 const preTime=utc(hydrated.observedDbClockUtc);
 if(preTime<indexTime||preTime-indexTime>120000||
    indexTime<utc(route.notBeforeUtc)||
    preTime>=utc(route.hardLatestUtc))
  fail("SIGNED_SHARD_WINDOW_OR_PG_READER_CLOCK_EXPIRED");

 const selected=due.selectedForActualPgReadback.filter(e=>
  e.filePath===pins.expectedLaterPacketPath);
 if(selected.length!==1)fail("NO_UNIQUE_DUE_SIGNED_LATER_FLIGHT");
 const entry=selected[0];
 if(v.entries.filter(e=>e.filePath===entry.filePath).length!==1||
    v.entries.find(e=>e.filePath===entry.filePath)!==entry||
    entry.packetSha256!==pins.expectedLaterPacketSha256||
    entry.queryDigestSha256!==pins.expectedQueryDigestSha256||
    entry.flightInstanceId!==pins.expectedFlightInstanceId||
    entry.horizon!==pins.expectedHorizon||
    !Buffer.isBuffer(entry.bytes)||entry.bytes.length<100||
    entry.bytes.length>200000||
    hash(entry.bytes)!==pins.expectedLaterPacketSha256||
    entry.packet?.prePermit?.flightInstanceId!==pins.expectedFlightInstanceId||
    entry.packet?.prePermit?.queryDigestSha256!==pins.expectedQueryDigestSha256)
  fail("UNSIGNED_OR_SWAPPED_NATIVE_FLIGHT_HORIZON_PACKET");
 const cutoff=utc(entry.selectedTNativeUtc)-
  (entry.horizon==="T-6h"?21600000:5400000);
 const remaining=cutoff-preTime;
 if(remaining<=15*60000||remaining>90*60000)
  fail("ACTUAL_PG_CUTOFF_TOO_CLOSE_OR_NOT_DUE");

 // Run the original Phase5 delegated signed-day GO check; no injection
 // of computed approvals, code SHA, query identity or provider license.
 const day=(()=>{
  try{return admitP5LaterRegistryChildEnv(env);}
  catch{return fail("EXISTING_DAY_REGISTRY_CHILD_RELEASE_REFUSED");}
 })();
 if(day!==v.runDayIndex||
    env.V39_P5_LATER_PRE_DAY_REGISTRY_SHA256!==v.registrySha256||
    env.V39_P5_SOURCE_BATCH_REGISTRY_SHA256!==v.sourceDayRegistrySha256||
    env.V39_P5_MANIFEST_SHA256!==v.manifestSha256||
    env.V39_P5_LATER_PRE_APPROVED_CODE_SHA!==v.approvedCodeSha)
  fail("ORIGINAL_DAY_SOURCE_MANIFEST_CODE_PINS_CHANGED");

 // Only immutable per-flight SHA/query/T24 receipt are derived from the
 // already-verified registry; all other approvals remain independently set.
 const delegated:NodeJS.ProcessEnv={
  ...env,
  V39_P5_LATER_PRE_SIGNED_PACKET_SHA256:entry.packetSha256,
  V39_P5_QUERY_DIGEST:entry.queryDigestSha256,
  V39_P5_LATER_PRE_T24_RECEIPT_SHA256:entry.t24ReceiptSha256??""
 };
 const approved=(()=>{
  try{return admitP5SignedWitnessedLaterPre(
   delegated,entry.bytes,entry.packet,entry.filePath);}
  catch{return fail("EXISTING_STAGE14_NATIVE_T_WITNESS_OR_PRE_ROLE_REFUSED");}
 })();
 if(approved.prePermit.horizon!==pins.expectedHorizon||
    approved.prePermit.flightInstanceId!==pins.expectedFlightInstanceId||
    approved.cutoffMs!==cutoff||
    approved.reviewedPacketSha256!==pins.expectedLaterPacketSha256)
  fail("EXISTING_STAGE14_CUTOFF_AND_PACKET_REVIEW_DRIFT");

 const out={
  redactedSummary:Object.freeze({
   schema:P6_PRIVATE_LATER_PRE_STAGE14_BRIDGE_SCHEMA,
   status:"ONE_PRIVATE_DUE_LATER_PRE_PASSED_ORIGINAL_STAGE14_ADMISSION_NO_EXECUTION",
   runDayIndex:v.runDayIndex,shardIndex:v.shardIndex,
   horizon:entry.horizon,
   routingIntentSha256:route.routingIntentSha256,
   packetSha256:entry.packetSha256,
   sourceRegistrySha256:v.sourceDayRegistrySha256,
   laterRegistrySha256:v.registrySha256,
   actualRestrictedPgClockUtc:hydrated.observedDbClockUtc,
   nativeCutoffUtc:new Date(cutoff).toISOString(),
   remainingToCutoffMinutes:remaining/60000,
   originalPhase5SignedRegistryAndStage14GatesUsed:true,
   originalPREWriterStillMustRecheckRealOriginalAndClock:true,
   separatePREOnlyLoginRequired:true,
   notAPaidSourceOrIndependentRightsCertification:true,
   providerCalls:0,sqlWrites:0,githubChildDispatches:0,
   phase5ScientificFreezeGranted:false,phase6PaidGo:false
  })
 };
 // Private flight/credential inputs are NEVER enumerable, persisted to
 // checkout, sent to provider or returned by JSON.stringify.
 Object.defineProperties(out,{
  privatePacketBytes:{
   value:Buffer.from(entry.bytes),enumerable:false,writable:false
  },
  privatePacket:{
   value:entry.packet,enumerable:false,writable:false
  },
  privatePacketPath:{
   value:entry.filePath,enumerable:false,writable:false
  },
  delegatedOriginalStage14Env:{
   value:Object.freeze(delegated),enumerable:false,writable:false
  }
 });
 return Object.freeze(out);
}
