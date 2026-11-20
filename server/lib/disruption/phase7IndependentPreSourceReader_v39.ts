/** Independently recompute the exact Stage14 selected inputs against the
 * existing restricted V0079 SOURCE reader. No provider calls, new roles,
 * source writes, or trust in selected feature values supplied by the native
 * publisher. This reads a genuine current original; it does not certify
 * that a separate archive has retained a field. That authority is distinct.
 */
import {compileP5EOneBoundOriginalReadonly,type P5EReadOnlyPgPool} from "./phase5AmendmentEOriginalFidsReadonlyCompiler_v39";
import {selectP5EStage14BoundRouteFeatures} from "./phase5AmendmentEStage14BoundRouteFeatures_v39";
import {selectP5EReviewedSupplementalFeatures,type P5EReviewedSupplementalBundle} from "./phase5AmendmentESignedSupplementalFeatures_v39";
import {phase7SelectedFeatureDigest} from "./phase7SignedPreFieldProof_v39";
import {hashPhase7DurableCandidate} from "./phase7DurableDerivedBundleCandidate_v39";
import type {P5Stage14SingleFlightPrePermit} from "./phase5V0079SingleBoundFlightPreWriter_v39";
import type {PreFeatureInput} from "./preSnapshotBuilder_v3";
const FIDS=["operating_carrier","scheduled_arrival_utc","provider_revised_departure_utc","reported_pre_departure_status"] as const;
const H=/^[a-f0-9]{64}$/;
const hold=(s:string):never=>{throw Error("HOLD_P7_INDEPENDENT_PRE_SOURCE_"+s);};
const clock=(x:string)=>{const n=Date.parse(x);if(!Number.isFinite(n)||new Date(n).toISOString()!==x)hold("CLOCK");return n};
const offset={"T-24h":86400000,"T-6h":21600000,"T-90m":5400000} as const;
const signature=(f:PreFeatureInput|undefined)=>f?.value===null||f?.value===undefined?null:phase7SelectedFeatureDigest(f);
type Readback={normalizedMember:Record<string,unknown>;observedDbClockUtc:string;sourceExpiresAtUtc:string};
export function recomputeP7ExactSelectedFeatures(p:Readonly<P5Stage14SingleFlightPrePermit>,original:P5EReviewedSupplementalBundle,read:Readonly<Readback>,externalContentUseReviewSha256:string){
 if(!p||!read||!Object.hasOwn(offset,p.horizon)||!H.test(externalContentUseReviewSha256)||
  original.externalSourceAndContentsReviewReceiptSha256!==externalContentUseReviewSha256||
  original.flightInstanceId!==p.flightInstanceId||original.populationQueryId!==p.expectedSourcePopulationQueryId||
  original.originalResponseSha256!==p.expectedSourceResponseSha256||
  !p.reviewedSupplementalFeatureBundle||
  p.reviewedSupplementalFeatureBundle.externalSourceAndContentsReviewReceiptSha256!==externalContentUseReviewSha256)hold("BOUND_ORIGINAL_OR_REVIEW_POLICY");
 const n=clock(read.observedDbClockUtc),expiry=clock(read.sourceExpiresAtUtc),cutoff=clock(p.selectedTNativeUtc)-offset[p.horizon];
 const m=read.normalizedMember,available=m.available_at instanceof Date?m.available_at.toISOString():typeof m.available_at==="string"?new Date(m.available_at).toISOString():hold("MEMBER_CLOCK");
 if(n>=cutoff||expiry<=cutoff||clock(available)>n||m.dep_airport_icao!==p.airportIcao||
  (p.expectedDestinationIcao!==undefined&&p.expectedDestinationIcao!==m.arr_airport_icao))hold("LIVE_EXACT_ROUTE");
 const ownCutoff=new Date(cutoff).toISOString(),destination=typeof m.arr_airport_icao==="string"?m.arr_airport_icao:null;
 const route=selectP5EStage14BoundRouteFeatures({flightInstanceId:p.flightInstanceId,horizon:p.horizon,selectedNativeTUtc:p.selectedTNativeUtc,cutoffUtc:ownCutoff,issuedAtUtc:read.observedDbClockUtc,
  expectedOriginalResponseSha256:p.expectedSourceResponseSha256,expectedPopulationQueryId:p.expectedSourcePopulationQueryId,originalSourceUseIndependentlyReviewedOutsideThisFunction:true,
  normalizedMember:{analytic_identity_id:m.analytic_identity_id,population_query_id:m.population_query_id,response_hash:m.response_hash,dep_airport_icao:m.dep_airport_icao,arr_airport_icao:m.arr_airport_icao,available_at:m.available_at,fids_retrieval_utc:m.fids_retrieval_utc}}).features;
 const args={flightInstanceId:p.flightInstanceId,horizon:p.horizon,selectedNativeTUtc:p.selectedTNativeUtc,cutoffUtc:ownCutoff,issuedAtUtc:read.observedDbClockUtc,sourceOriginalSha256:p.expectedSourceResponseSha256,sourcePopulationQueryId:p.expectedSourcePopulationQueryId,memberAvailableAtUtc:available,originIcao:p.airportIcao,destinationIcao:destination};
 const actual=selectP5EReviewedSupplementalFeatures({...args,bundle:original}).features;
 const frozen=selectP5EReviewedSupplementalFeatures({...args,bundle:p.reviewedSupplementalFeatureBundle!}).features;
 // Every actual FIDS field must be present with its exact value, availability
 // and provenance; a permit cannot omit or change a real present original.
 for(const f of FIDS)if(signature(actual.find(x=>x.featureName===f))!==signature(frozen.find(x=>x.featureName===f)))hold("FIDS_FEATURE_DRIFT");
 const selected=[...route,...frozen];
 if(new Set(selected.map(x=>x.featureName)).size!==selected.length||selected.length>16)hold("SELECTED_DENOMINATOR");
 const out={observedDbClockUtc:read.observedDbClockUtc,sourceExpiresAtUtc:read.sourceExpiresAtUtc,permitSha256:hashPhase7DurableCandidate(p),
  selectedCount:selected.filter(x=>x.value!==null&&x.value!==undefined).length,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 return Object.freeze(Object.defineProperties(out,{privateSelectedFeatures:{value:Object.freeze(selected),enumerable:false},
  privateWeatherScope:{value:Object.freeze({flightInstanceId:p.flightInstanceId,originIcao:p.airportIcao,destinationIcao:destination,memberAvailableAtUtc:available,observedDbClockUtc:read.observedDbClockUtc}),enumerable:false}})) as typeof out&{readonly privateSelectedFeatures:readonly PreFeatureInput[];readonly privateWeatherScope:Readonly<{flightInstanceId:string;originIcao:string;destinationIcao:string|null;memberAvailableAtUtc:string;observedDbClockUtc:string}>};
}
const actualSourceReadbacks=new WeakSet<object>();
export function requireP7ActualSourceReadback(x:object){if(!actualSourceReadbacks.has(x))hold("ACTUAL_SOURCE_READBACK_REQUIRED");}
export async function readP7ExactSelectedFeatures(pool:P5EReadOnlyPgPool,p:Readonly<P5Stage14SingleFlightPrePermit>,externalContentUseReviewSha256:string){
 if(!p||!Object.hasOwn(offset,p.horizon)||!H.test(externalContentUseReviewSha256))hold("PERMIT");
 const cutoff=new Date(clock(p.selectedTNativeUtc)-offset[p.horizon]).toISOString();
 const a=await compileP5EOneBoundOriginalReadonly(pool,{manifestSha256:p.manifestSha256,queryDigestSha256:p.queryDigestSha256,flightInstanceId:p.flightInstanceId,
  expectedPopulationQueryId:p.expectedSourcePopulationQueryId,expectedResponseSha256:p.expectedSourceResponseSha256,expectedRightsReviewSha256:p.expectedReviewedSourceRightsSha256,expectedSelectedNativeTUtc:p.selectedTNativeUtc,
  expectedForecastCutoffUtc:cutoff,expectedOriginIcao:p.airportIcao,externalContentUseReviewSha256,
  prospectivePermit:p});
 if(a.status!=="EXACT_SOURCE_COVERED_FEATURE_PACKET_DRAFT_NOT_SIGNED"||!a.privateReadback||Object.getOwnPropertyDescriptor(a,"privateReadback")?.enumerable!==false||a.providerCalls!==0||a.dbWrites!==0)hold("ACTUAL_SOURCE_READBACK");
 const out=recomputeP7ExactSelectedFeatures(p,a.bundle,a.privateReadback!,externalContentUseReviewSha256);
 actualSourceReadbacks.add(out);return out;
}
