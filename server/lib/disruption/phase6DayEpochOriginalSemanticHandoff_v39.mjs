/**
 * Phase5 P0: reuse ORIGINAL Phase5 SOURCE/LATER_PRE/POST per-registry semantic
 * and due-shard validators after NEW day-epoch Ed25519 + restricted PG16 bytes.
 * Nonpaid, no dispatcher. Explicitly does not call old GLOBAL V0096 storage.
 */
import {createHash} from "node:crypto";
import {hydrateP6DayEpochFullRegistriesReadOnly}
 from "./phase6DayEpochFullRegistryReadOnce_v39.mjs";
import {planP6ThirtyOneDaySignedShardHandoffs}
 from "./phase6SignedThirtyOneDayShardHandoff_v39.ts";

export const P6_DAY_EPOCH_EXISTING_SEMANTICS_SCHEMA=
 "v39.phase6.day-epoch-exact-source-pre-post-original-semantics-no-go.v1";
const SHA=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
const hash=b=>createHash("sha256").update(b).digest("hex");
const hold=x=>{throw Error("HOLD_P6_DAY_EPOCH_ORIGINAL_SEMANTICS_"+x);};
const shaField=(x,name)=>{if(typeof x!=="string"||!SHA.test(x))hold(name);return x;};
function legacyProjection(signed,previousProjectedSha=null){
 if(!signed||signed.schema!==
   "v39.phase6.run-day-scoped-append-only-index.v1"||
   !Number.isSafeInteger(signed.runDayIndex)||
   signed.runDayIndex<1||signed.runDayIndex>31||
   !Number.isSafeInteger(signed.revision)||
   signed.revision<1||signed.revision>1024||
   !Array.isArray(signed.entries)||signed.entries.length<1||
   signed.entries.length>1024||
   signed.entries.some(e=>e?.runDayIndex!==signed.runDayIndex))
  hold("UNVERIFIED_SINGLE_STUDY_DAY_INDEX");
 if(signed.revision===1&&signed.previousIndexSha256!==null)
  hold("GENESIS_HAS_PARENT");
 if(signed.revision>1){
  shaField(signed.previousIndexSha256,"NON_SHA_SIGNED_PREVIOUS_INDEX");
  if(previousProjectedSha!==null)shaField(previousProjectedSha,"NON_SHA_PROJECTED_PREVIOUS");
 }
 return {
  schema:"v39.phase5.phase6-append-only-day-shard-index.v1",
  manifestSha256:signed.manifestSha256,
  calendarSha256:signed.calendarSha256,
  reviewedCodeSha:signed.reviewedCodeSha,
  reviewedReleaseSha256:signed.reviewedReleaseSha256,
  reviewedRightsSha256:signed.reviewedRightsSha256,
  revision:signed.revision,
  // The OLD validator accepts a same-revision deterministic projection; it
  // does NOT read a global V0096 SHA or database table. The real signature
  // was verified upstream against the ORIGINAL day-epoch bytes and SHA.
  previousIndexSha256:signed.revision===1?null:
   (previousProjectedSha??signed.previousIndexSha256),
  entries:signed.entries
 };
}
function parsePrior(bytes,current){
 if(!Buffer.isBuffer(bytes)||bytes.length<100||bytes.length>1048576)
  hold("MISSING_SIGNED_DAY_PREDECESSOR");
 let p;
 try{p=JSON.parse(bytes.toString("utf8"));}
 catch{hold("INVALID_SIGNED_PREDECESSOR_JSON");}
 if(!p||p.schema!=="v39.phase6.run-day-scoped-append-only-index.v1"||
    p.runDayIndex!==current.runDayIndex||
    p.revision!==current.revision-1||
    hash(bytes)!==current.previousIndexSha256||
    !Array.isArray(p.entries)||p.entries.length>=current.entries.length||
    p.entries.some((x,i)=>JSON.stringify(x)!==
      JSON.stringify(current.entries[i])))
  hold("CHANGED_OR_CROSS_DAY_SIGNED_PREDECESSOR");
 return p;
}

/**
 * Pure *secondary* compatibility/semantic calculation.
 * This function does NOT authenticate caller-provided receipts, and MUST NOT
 * be used as a paid admission. Runtime MUST call the wrapper below, which
 * actually retrieves and Ed25519-verifies the day-epoch index in PostgreSQL.
 */
export function inspectP6DayEpochExistingShardSemanticsNoGo(verified){
 const sum=verified?.redactedSummary;
 const current=verified?.privateParsedIndex;
 const bytes=verified?.privateCurrentIndexBytes;
 const priorBytes=verified?.privatePreviousIndexBytes;
 if(sum?.status!=="SIGNED_DAY_EPOCH_FULL_REGISTRY_READONLY_NO_DISPATCH"||
    sum.externalEd25519ReviewerVerified!==true||
    sum.restrictedPrivatePg16ReaderVerified!==true||
    sum.actualPrivateRegistryBytesRead!==true||
    sum.authoritativeFlightSemanticAdmissionDone!==false||
    sum.providerCalls!==0||sum.databaseWrites!==0||
    sum.githubChildDispatches!==0||sum.phase6PaidGo!==false||
    !Buffer.isBuffer(bytes)||!current||
    !SHA.test(sum.indexSha256??"")||
    hash(bytes)!==sum.indexSha256||
    current.runDayIndex!==sum.runDayIndex||
    current.revision!==sum.indexRevision||
    typeof verified?.getFrozen!=="function")
  hold("NOT_AN_VERIFIED_READONLY_DAY_REGISTRY_BUNDLE");
 let parsed;
 try{parsed=JSON.parse(bytes.toString("utf8"));}
 catch{hold("SIGNED_INDEX_JSON_INVALID");}
 if(JSON.stringify(parsed)!==JSON.stringify(current)||
    !SHA.test(current.manifestSha256??"")||
    !SHA.test(current.calendarSha256??"")||
    !CODE.test(current.reviewedCodeSha??"")||
    !SHA.test(current.reviewedReleaseSha256??"")||
    !SHA.test(current.reviewedRightsSha256??""))
  hold("SIGNED_DAY_INDEX_BYTES_OR_IDENTITIES_DRIFT");
 const prior=current.revision>1?parsePrior(priorBytes,current):null;
 if(current.revision===1&&priorBytes!==null)
  hold("SIGNED_DAY_GENESIS_HAS_UNEXPECTED_PRIOR");
 const previous=prior?legacyProjection(prior):null;
 const previousBytes=previous?Buffer.from(JSON.stringify(previous)):null;
 const projected=legacyProjection(current,
  previousBytes?hash(previousBytes):null);
 const projectedBytes=Buffer.from(JSON.stringify(projected));
 const projectionSha=hash(projectedBytes);
 const oldPins={
  expectedIndexSha256:projectionSha,
  // Compatibility-only digest derived from upstream independently signed
  // day bytes. Never claim this DERIVED digest was itself Ed25519 signed.
  exactExternallyReviewedIndexSha256:projectionSha,
  expectedManifestSha256:current.manifestSha256,
  expectedCalendarSha256:current.calendarSha256,
  expectedCodeSha:current.reviewedCodeSha,
  expectedReleaseSha256:current.reviewedReleaseSha256,
  expectedRightsSha256:current.reviewedRightsSha256,
  observedDbClockUtc:sum.observedDbClockUtc
 };
 // Reuse the actual existing source-query, per-flight horizon, V0083 POST,
 // cutoff/duplicate/censor and max-four-due-shards code, not a new copy.
 const routed=planP6ThirtyOneDaySignedShardHandoffs(
  projectedBytes,projected,oldPins,verified.getFrozen,
  previousBytes,previous
 );
 if(routed?.operatorSummary?.providerCalls!==0||
    routed.operatorSummary.githubChildDispatches!==0||
    routed.operatorSummary.phase6PaidGo!==false||
    routed.operatorSummary.selectedRouteCount>12)
  hold("OLD_SEMANTICS_ATTEMPTED_PAID_OR_UNBOUNDED_ADMISSION");
 const output={redactedSummary:Object.freeze({
  ...routed.operatorSummary,
  schema:P6_DAY_EPOCH_EXISTING_SEMANTICS_SCHEMA,
  status:"ED25519_DAY_EPOCH_ORIGINAL_SOURCE_PRE_POST_SEMANTICS_PASS_NO_GO",
  runDayIndex:sum.runDayIndex,
  externallySignedDayEpochIndexSha256:sum.indexSha256,
  internalUnsignedSemanticProjectionSha256:projectionSha,
  originalV0096GlobalChainNotUsed:true,
  reviewedEd25519SourceWasOriginalDayBytes:true,
  derivedProjectionIsNotAnAdditionalReviewerSignature:true,
  actualIndividualChildPaidReleaseDone:false,
  actualOperatingFlightMembershipEstablishedHere:false,
  individualUnderlyingFlightPacketsVerifiedHere:false,
  providerContentsLicenseCertifiedHere:false,
  licensedDataPurgePitrCertifiedHere:false,
  paidPhase6Go:false,
  providerCalls:0,databaseWrites:0,githubChildDispatches:0,
  phase6PaidGo:false
 })};
 Object.defineProperties(output,{
  privateRoutingCandidates:{enumerable:false,
   value:routed.privateRoutingCandidates},
  getFrozen:{enumerable:false,value:verified.getFrozen}
 });
 return Object.freeze(output);
}

/** Only this wrapper is suitable for future restricted GH read-only use. */
export async function hydrateAndInspectP6DayEpochOriginalSemanticsReadOnly(input){
 const verified=await hydrateP6DayEpochFullRegistriesReadOnly(input);
 return inspectP6DayEpochExistingShardSemanticsNoGo(verified);
}
