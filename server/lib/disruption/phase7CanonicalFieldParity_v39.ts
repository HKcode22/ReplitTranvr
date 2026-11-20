/** Full-field parity check for Amendment E before bounded source custody ends.
 * This is an audit of a supplied authenticated source/derived cohort, not a
 * replacement for external provenance, contract review or actual model parity.
 * Only aggregate counters leave the function; no identifiers/source values.
 */
import {P5_E_ALLOWED_PRE_FEATURES,type P5EPreField} from "./phase5AmendmentEAsOfFeatureSelectionOffline_v39";
import {assessP5AmendmentEGateOutDelayCandidate,type P5EGateOutFirstCycleInput} from "./phase5AmendmentEGateOutDelayLabel_v39";
import type {Phase7DerivedReleaseContract,Phase6ReleaseHorizon} from "./phase6DerivedTrainingReleaseContract_v39";
import type {Phase7DurableDerivedBundle} from "./phase7DurableDerivedBundleCandidate_v39";
import {serializePhase7DerivedReleasePacket} from "./phase6DerivedTrainingReleasePacket_v39";
import {createHash} from "node:crypto";
const H=/^[a-f0-9]{64}$/;
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const fail=(s:string):never=>{throw Error("PHASE7_CANONICAL_PARITY_REJECTED:"+s)};
const need=(v:unknown,s:string)=>{if(!v)fail(s)};
const clock=(x:string)=>{const t=Date.parse(x);need(Number.isFinite(t)&&new Date(t).toISOString()===x,"clock");return t};
const horizons=["T-24h","T-6h","T-90m"] as const;
type FieldDisposition="REVIEWED_DERIVED_BUCKET"|"INDEPENDENT_SOURCE_EXACT_LANE"|"PURPOSE_BOUND_REFERENCE_LANE"|"LONG_TERM_RIGHTS_REQUIRED";
export interface Phase7CanonicalFieldDisposition{
 field:P5EPreField;disposition:FieldDisposition; outputField:string|null; reviewSha256:string;
}
export interface Phase7CanonicalParityInput{
 // Only in-memory during source custody. The source/row association must
 // already be authentically established by the actual operational reader.
 releaseRowId:string;flightInstanceId:string;horizon:Phase6ReleaseHorizon;
 issuedAtUtc:string;sourceExpiresAtUtc:string;
 sourceFields:readonly {field:P5EPreField;availableAtUtc:string|null;present:boolean}[];
 // For independent/reference lanes this is an authenticated, purpose-specific
 // evidence decision, not a second copy of the source value.
 separatelyVerifiedFields:readonly P5EPreField[];
 gateOut:P5EGateOutFirstCycleInput|null;
}
export function auditCanonicalPhase7FieldParity(contract:Phase7DerivedReleaseContract,bundle:Phase7DurableDerivedBundle,dispositions:readonly Phase7CanonicalFieldDisposition[],inputs:readonly Phase7CanonicalParityInput[],nowUtc:string){
 const now=clock(nowUtc);
 const bytes=serializePhase7DerivedReleasePacket(contract,bundle.packet);
 need(bundle.paired.packetSha256===hash(bytes)&&bundle.continuous.derivedPacketSha256===hash(bytes),"packet-hash");
 const expected=new Set<string>(P5_E_ALLOWED_PRE_FEATURES);
 need(Array.isArray(dispositions)&&dispositions.length===expected.size&&new Set(dispositions.map(x=>x.field)).size===expected.size&&dispositions.every(x=>expected.has(x.field)&&H.test(x.reviewSha256)&&["REVIEWED_DERIVED_BUCKET","INDEPENDENT_SOURCE_EXACT_LANE","PURPOSE_BOUND_REFERENCE_LANE","LONG_TERM_RIGHTS_REQUIRED"].includes(x.disposition)),"complete-field-inventory");
 const byField=new Map(dispositions.map(x=>[x.field,x]));
 const used=new Set<string>();
 for(const x of dispositions){
  if(x.disposition==="REVIEWED_DERIVED_BUCKET"){
   need(typeof x.outputField==="string"&&contract.features.some(f=>f.name===x.outputField)&&!used.has(x.outputField),"unique-derived-output");used.add(x.outputField!);
  }else need(x.outputField===null,"separate-lane-not-bucket");
 }
 // No silent unmapped outputs from a second dictionary.
 need(used.size===contract.features.length,"unmapped-output");
 const rows=new Map(bundle.packet.rows.map(x=>[x.releaseRowId,x])),targets=new Map(bundle.continuous.rows.map(x=>[x.releaseRowId,x]));
 need(rows.size===bundle.packet.rows.length&&targets.size===bundle.continuous.rows.length&&inputs.length===rows.size&&inputs.length>0&&inputs.length<=100000,"denominator");
 const sourceByRow=new Map<string,Phase7CanonicalParityInput>(),seenFlightHorizon=new Set<string>();
 const counters=Object.fromEntries(horizons.map(h=>[h,Object.fromEntries(P5_E_ALLOWED_PRE_FEATURES.map(f=>[f,{sourcePresent:0,outputPresent:0,sourceMissingOutputPresent:0,presentLost:0}]))])) as Record<Phase6ReleaseHorizon,Record<P5EPreField,{sourcePresent:number;outputPresent:number;sourceMissingOutputPresent:number;presentLost:number}>>;
 let labelObserved=0,labelMissing=0,labelMismatch=0;
 for(const x of inputs){
  const row=rows.get(x.releaseRowId),key=JSON.stringify([x.flightInstanceId,x.horizon]);
  need(row&&row.horizon===x.horizon&&typeof x.flightInstanceId==="string"&&x.flightInstanceId.length>=5&&!sourceByRow.has(x.releaseRowId)&&!seenFlightHorizon.has(key),"source-membership");
  sourceByRow.set(x.releaseRowId,x);seenFlightHorizon.add(key);
  const issued=clock(x.issuedAtUtc);need(issued<=now&&now<clock(x.sourceExpiresAtUtc),"source-custody-expired");
  need(x.sourceFields.length===expected.size&&new Set(x.sourceFields.map(f=>f.field)).size===expected.size&&x.sourceFields.every(f=>expected.has(f.field)&&typeof f.present==="boolean"),"explicit-source-denominator");
  need(new Set(x.separatelyVerifiedFields).size===x.separatelyVerifiedFields.length&&x.separatelyVerifiedFields.every(f=>expected.has(f)&&["INDEPENDENT_SOURCE_EXACT_LANE","PURPOSE_BOUND_REFERENCE_LANE"].includes(byField.get(f)!.disposition)),"separate-lane-scope");
  for(const f of x.sourceFields){
   const disposition=byField.get(f.field)!;
   const present=f.present&&f.availableAtUtc!==null&&clock(f.availableAtUtc)<=issued;
   // Explicitly reject leakage rather than count it as lawful coverage.
   need(!f.present||present,"source-late-or-unclocked");
   const out=disposition.disposition==="REVIEWED_DERIVED_BUCKET"?row!.featureBuckets[disposition.outputField!]!==null&&row!.featureBuckets[disposition.outputField!]!==undefined:
     disposition.disposition==="LONG_TERM_RIGHTS_REQUIRED"?false:x.separatelyVerifiedFields.includes(f.field);
   const c=counters[x.horizon][f.field];if(present)c.sourcePresent++;if(out)c.outputPresent++;
   if(present&&!out)c.presentLost++;if(!present&&out)c.sourceMissingOutputPresent++;
  }
  if(x.horizon==="T-6h"){
   const t=targets.get(x.releaseRowId);need(t&&t.censoring===row!.censoring,"continuous-denominator");
   if(x.gateOut){
    need(x.gateOut.flightInstanceId===x.flightInstanceId&&x.gateOut.horizon==="T-6h"&&clock(x.gateOut.preIssuedAtUtc)===issued,"label-leg-and-issued-binding");
    if(x.gateOut.outcome.firstAvailableAtUtc!==null)need(clock(x.gateOut.outcome.firstAvailableAtUtc)<=now,"label-after-release");
    const label=assessP5AmendmentEGateOutDelayCandidate(x.gateOut);
    if(label.hasNumericalCandidate){labelObserved++;if(t!.censoring!=="observed"||t!.value===null||Math.abs(t!.value-label.candidateDelayMinutes!)>0.0000005)labelMismatch++}
    else{labelMissing++;if(t!.censoring==="observed"||t!.value!==null)labelMismatch++}
   }else{labelMissing++;if(t!.censoring==="observed"||t!.value!==null)labelMismatch++}
  }else need(x.gateOut===null,"primary-target-only");
 }
 const seenPair=new Set<string>(),seenLeg=new Set<string>();
 for(const g of bundle.paired.groups){
  need(g.rows.length===3&&new Set(g.rows.map(x=>x.horizon)).size===3&&horizons.every(h=>g.rows.some(x=>x.horizon===h)),"paired-horizons");
  const sameLeg=new Set(g.rows.map(x=>sourceByRow.get(x.releaseRowId)?.flightInstanceId));
  need(sameLeg.size===1&&!sameLeg.has(undefined)&&!seenLeg.has([...sameLeg][0]!),"same-leg-unique-group");
  seenLeg.add([...sameLeg][0]!);
  for(const x of g.rows){need(!seenPair.has(x.releaseRowId)&&sourceByRow.get(x.releaseRowId)?.horizon===x.horizon&&rows.get(x.releaseRowId)?.split===g.split,"pair-membership");seenPair.add(x.releaseRowId)}
 }
 need(seenPair.size===rows.size&&targets.size===labelObserved+labelMissing,"all-horizon-and-primary-denominator");
 const fieldsRequiringRights=dispositions.filter(x=>x.disposition==="LONG_TERM_RIGHTS_REQUIRED").map(x=>x.field);
 const losses=Object.values(counters).flatMap(x=>Object.values(x)).reduce((a,x)=>a+x.presentLost,0);
 const falsePresence=Object.values(counters).flatMap(x=>Object.values(x)).reduce((a,x)=>a+x.sourceMissingOutputPresent,0);
 return {schema:"v39.phase7.canonical-field-parity-audit.v1",rows:rows.size,groups:seenLeg.size,fields:expected.size,byHorizon:counters,fieldsRequiringRights,sourcePresentLost:losses,sourceMissingPromoted:falsePresence,continuousObserved:labelObserved,continuousMissing:labelMissing,continuousMismatch:labelMismatch,structuralCoverageParity:losses===0&&falsePresence===0&&labelMismatch===0&&fieldsRequiringRights.length===0,actualPredictiveModelParityCertified:false,reconstructionRiskCertified:false,sourceMembershipAuthenticatedHere:false,sourceValuesPersisted:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
}
