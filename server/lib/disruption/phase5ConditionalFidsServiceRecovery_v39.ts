/** Prospective, separate provider-reported service candidate tier.
 * Not a physical operating-leg permit, gate-out label, or authority to publish PRE.
 * No existing native admission or historical population row is changed.
 */
import {createHash} from "node:crypto";
import {verifyStoredDecodedFidsBodyV39} from "./phase4Gate5DecodedFidsReadback_v39";
import {verifyCanonicalFidsEnvelopeV39} from "./fidsEnvelopeCanonical_v39";
const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
const hash=/^[a-f0-9]{64}$/;
const iso=(x:unknown):number=>typeof x==="string"&&Number.isFinite(Date.parse(x))?Date.parse(x):NaN;
const ICAO=/^[A-Z]{4}$/;
const fail=(s:string):never=>{throw Error("HOLD_P5_CONDITIONAL_SERVICE_"+s);};
type Scope={protocolSha256:string;ownerProspectiveSeparateTierApproved:true;
 manifestSha256:string;sourceResponseSha256:string;sourceQueryId:string;
 runDayIndex:number;
 airportIcao:string;frozenStudyStartUtc:string;policyEffectiveUtc:string;
 plannedSourceUtc:string;sourceAvailableUtc:string;sourceExpiresUtc:string;dbObservedUtc:string;
 serviceWindowStartUtc:string;serviceWindowEndUtc:string;horizon:"T-24h"|"T-6h"|"T-90m";
 maximumStalenessSeconds:number;minimumReviewLeadSeconds:number};
type Candidate={serviceKey:string;sourceIndex:number;selectedReportedDepartureUtc:string;ownCutoffUtc:string;
 originEvidence:"EXPLICIT_REPORTED_ORIGIN"|"REQUESTED_DEPARTURE_CONTEXT_ONLY";commercialScope:"EXPLICIT_CORE_FLAGS"|"QUERY_FILTERED_SCOPE_UNKNOWN";
 providerNativeIdPresent:boolean;sourceResponseSha256:string;sourceQueryId:string;
 operatorFlightNumber:string;originIcao:string;destinationIcao:string;runDayIndex:number;
 stage14ConditionalFlightInstanceId:string|null};
export function prepareP5ConditionalFidsServiceRecoveryV39(payload:unknown,s:Scope){
 if(!s||s.ownerProspectiveSeparateTierApproved!==true||![s.protocolSha256,s.manifestSha256,s.sourceResponseSha256].every(x=>hash.test(x??""))||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.sourceQueryId??"")||!ICAO.test(s.airportIcao??"")||
  !Number.isSafeInteger(s.runDayIndex)||s.runDayIndex<1||s.runDayIndex>31||
  !["T-24h","T-6h","T-90m"].includes(s.horizon)||!Number.isSafeInteger(s.maximumStalenessSeconds)||s.maximumStalenessSeconds<1||s.maximumStalenessSeconds>86400||
  !Number.isSafeInteger(s.minimumReviewLeadSeconds)||s.minimumReviewLeadSeconds<120||s.minimumReviewLeadSeconds>3600)fail("SEPARATE_PROSPECTIVE_SCOPE");
 const [frame,effective,planned,available,expires,now,start,end]=[s.frozenStudyStartUtc,s.policyEffectiveUtc,s.plannedSourceUtc,s.sourceAvailableUtc,s.sourceExpiresUtc,s.dbObservedUtc,s.serviceWindowStartUtc,s.serviceWindowEndUtc].map(iso);
 if(![frame,effective,planned,available,expires,now,start,end].every(Number.isFinite)||effective>planned||planned>available||available>now||now>=expires||start>=end||frame>start)fail("CLOCK_OR_RETROSPECTIVE_SCOPE");
 if(verifyCanonicalFidsEnvelopeV39(payload)!=="verified"||verifyStoredDecodedFidsBodyV39({payload,persisted_response_hash:s.sourceResponseSha256})!=="verified")fail("ORIGINAL_INTEGRITY");
 const p=payload as Record<string,any>,q=p.fidsRequestContract;
 if(q?.schema!=="v39.fids-request-frame.application-intent.v1"||q.direction!=="Departure"||q.airportIcao!==s.airportIcao||
  q.endpointKind!=="airport_local_fids"||q.withLeg!==true||q.withCargo!==false||q.withPrivate!==false||
  q.withCancelled!==true||q.withCodeshared!==true||q.withLocation!==false)fail("EXACT_FILTERED_REQUEST");
 // Phase5ScopedFidsSourceBridge deliberately requests codeshares. Positive
 // operator evidence below is mandatory; request filters never prove scope.
 if(!Array.isArray(p.departures)||p.departures.length>2500||!Number.isFinite(iso(p.fetchedAtUtc))||iso(p.fetchedAtUtc)>available)fail("ORIGINAL_SCOPE_OR_CAP");
 const offset=s.horizon==="T-24h"?86400000:s.horizon==="T-6h"?21600000:5400000;
 const counts={notPositiveOperator:0,knownExcluded:0,missingServiceFields:0,contraryOrigin:0,outsideWindow:0,ambiguousComposite:0,ambiguousProviderId:0,lateOrStale:0,conditionalCandidates:0};
 const provisional:{candidate:Candidate;providerId:string|null;timely:boolean}[]=[];
 const rawIdFrequency=new Map<string,number>();
 for(const f of p.departures){if(typeof f?.id==="string"&&f.id.trim())rawIdFrequency.set(f.id.trim(),(rawIdFrequency.get(f.id.trim())??0)+1);}
 for(const [i,f] of p.departures.entries()){
  if(f?.codeshareStatus!=="IsOperator"&&f?.codeshareStatus!==1){counts.notPositiveOperator++;continue;}
  if(f.isCargo===true||f.isPrivate===true||f.isGeneralAviation===true||f.isCharter===true){counts.knownExcluded++;continue;}
  const number=typeof f.number==="string"?f.number.trim().toUpperCase().match(/^([A-Z0-9]{2})[ \t]*([0-9]{1,4})$/):null;
  const origin=f.departure?.airport?.icao,dest=f.arrival?.airport?.icao,selected=iso(f.departure?.scheduledTime?.utc);
  if(origin!==undefined&&origin!==null&&origin!==""&&origin!==s.airportIcao){counts.contraryOrigin++;continue;}
  if(!number||!ICAO.test(dest??"")||dest===s.airportIcao||!Number.isFinite(selected)){counts.missingServiceFields++;continue;}
  if(selected<start||selected>=end){counts.outsideWindow++;continue;}
  // Stable only within the frozen service frame; no revised time or provider ID in the key.
  const serviceKey="leg:p5conditional:v2:"+sha(JSON.stringify([s.manifestSha256,s.protocolSha256,s.frozenStudyStartUtc,s.runDayIndex,number[1],number[2].replace(/^0+/,"")||"0",s.airportIcao,dest]));
  const providerId=typeof f.id==="string"&&f.id.trim()?f.id.trim():null,cutoff=selected-offset;
  provisional.push({providerId,timely:available<=cutoff&&cutoff-now>s.minimumReviewLeadSeconds*1000&&cutoff<expires&&cutoff-available<=s.maximumStalenessSeconds*1000,
   candidate:{serviceKey,sourceIndex:i,selectedReportedDepartureUtc:new Date(selected).toISOString(),ownCutoffUtc:new Date(cutoff).toISOString(),
    originEvidence:origin===s.airportIcao?"EXPLICIT_REPORTED_ORIGIN":"REQUESTED_DEPARTURE_CONTEXT_ONLY",
    commercialScope:f.isCargo===false&&f.isPrivate===false&&f.isCharter===false?"EXPLICIT_CORE_FLAGS":"QUERY_FILTERED_SCOPE_UNKNOWN",
    providerNativeIdPresent:providerId!==null,sourceResponseSha256:s.sourceResponseSha256,sourceQueryId:s.sourceQueryId,
    operatorFlightNumber:number[1]+(number[2].replace(/^0+/,"")||"0"),originIcao:s.airportIcao,destinationIcao:dest,runDayIndex:s.runDayIndex,
    // Existing Stage14 conditional key; only valid on a prospectively marked
    // original. This is a proposed match, not proof of DB member custody.
    stage14ConditionalFlightInstanceId:providerId===null&&
      !(f.isCargo===false&&f.isPrivate===false&&f.isCharter===false)&&
      q.phase5ConditionalService?.protocolSha256===s.protocolSha256&&
      q.phase5ConditionalService?.cohortStartUtc===s.frozenStudyStartUtc?
      "leg:g5a:"+sha(JSON.stringify({protocol:"G5A_CONDITIONAL_IDLESS_OPERATOR_V2",frozenStudyStartUtc:s.frozenStudyStartUtc,carrier:number[1],flightNumber:number[2].replace(/^0+/,"")||"0",origin:s.airportIcao,destination:dest})):null}});
 }
 const freq=new Map<string,number>();
 for(const {candidate} of provisional)freq.set(candidate.serviceKey,(freq.get(candidate.serviceKey)??0)+1);
 const candidates:Candidate[]=[];
 for(const {candidate,providerId,timely} of provisional){
  if(freq.get(candidate.serviceKey)!==1){counts.ambiguousComposite++;continue;}
  if(providerId!==null&&rawIdFrequency.get(providerId)!==1){counts.ambiguousProviderId++;continue;}
  if(!timely){counts.lateOrStale++;continue;}
  candidates.push(Object.freeze(candidate));counts.conditionalCandidates++;
 }
 const report={status:"CONDITIONAL_SERVICE_CANDIDATES_FOR_SEPARATE_REVIEW_ONLY",observedDepartures:p.departures.length,counts,
  providerNativeOperatingLegCertified:false,actualGateOutCertified:false,trainingOrPrePublicationAuthorized:false,
  crossOriginalLinkageCertified:false,providerCalls:0,databaseWrites:0};
 return Object.freeze(Object.defineProperty(report,"privateCandidates",{value:Object.freeze(candidates),enumerable:false})) as typeof report&{readonly privateCandidates:readonly Candidate[]};
}
