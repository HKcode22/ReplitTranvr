/**
 * Phase4 Gate5 – pure, offline, aggregate-only AeroDataBox FIDS source
 * lineage/semantic ambiguity audit. NOT provider data, a paid endpoint,
 * evidence of actual wheels-off, confirmed physical flight identity, or a
 * certified first selected T. Binding V3.9-f.8 §§5.1, 5.2, 6.0, 7.1, 16.
 *
 * OpenAPI FlightAirportMovementContract v1.15.4.0:
 *   scheduledTime = generic scheduled departure / arrival;
 *   revisedTime = actual OR estimated (sometimes gate/runway ambiguous);
 *   runwayTime = actual OR estimated runway time;
 *   quality Basic/Live/Approximate does NOT identify per-field actuality.
 * The caller must not treat this summary as independently authenticated
 * source bytes or legal-retention evidence.
 */
export const P4_NATIVE_SEMANTICS_AUDIT_V39=
  "v39.phase4.gate5-provider-native-lineage-candidates.v1" as const;
export type P4NativeHorizonV39="T-24h"|"T-6h"|"T-90m";
const HORIZONS:[P4NativeHorizonV39,number][]=[
  ["T-24h",24*60],["T-6h",6*60],["T-90m",90]
];
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const SHA=/^[a-f0-9]{64}$/;
const ICAO=/^[A-Z]{4}$/;

export interface P4ProviderNativeObservationV39{
  analyticIdentityId:string;
  populationQueryId:string;
  sourceAirportIcao:string;
  populationRole:"requested_airport_primary"|"opposite_movement_context"|"unknown";
  codeshareStatus:"IsOperator"|"IsCodeshared"|"Unknown";
  scopeClassification:"confirmed_core"|"unknown"|"auxiliary";
  responseSha256:string;
  memberResponseSha256:string;
  sourceReceiptAvailableUtc:string;
  memberAvailableUtc:string;
  departureScheduledUtc:string|null;
  departureRevisedUtc:string|null;
  departureRunwayUtc:string|null;
  departureQuality:readonly ("Basic"|"Live"|"Approximate")[];
  explicitDepartureAirportIcao:string|null;
  providerFlightId:string|null;
  originalRawRetained:boolean;
}

export interface P4NativeSemanticAuditScopeV39{
  airportIcao:string;
  serviceWindowStartUtc:string;
  serviceWindowEndUtc:string;
  auditUtc:string;
}

function millis(s:string,why:string):number{
  if(!UTC.test(s))throw Error("P4_NATIVE_INVALID_UTC:"+why);
  const v=Date.parse(s);
  if(!Number.isFinite(v)||new Date(v).toISOString()!==s)
    throw Error("P4_NATIVE_INVALID_UTC:"+why);
  return v;
}
function optionalMillis(s:string|null,why:string):number|null{
  return s===null?null:millis(s,why);
}
function safeId(s:string):boolean{
  return typeof s==="string"&&s.length>0&&s.length<=180;
}
type Eligible={id:string;queryId:string;firstReceipt:number;sourceAt:number;
  schedule:number|null;role:"requested_airport_primary";codeshare:string;
  quality:readonly string[];revised:number|null;runway:number|null;
  scope:string;explicitOrigin:string|null};
export interface P4NativeSemanticAuditResultV39{
  schema:typeof P4_NATIVE_SEMANTICS_AUDIT_V39;
  status:"CANDIDATE_LINEAGE_ONLY_SELECTED_T_AND_ACTUALITY_UNPROVEN";
  sourceAirportIcao:string;
  originalObservationsSupplied:number;
  validOriginalSourceObservations:number;
  rejectedMissingRawOrHashOrClock:number;
  rejectedFutureAtAudit:number;
  oppositeOrUnknownContextObservations:number;
  primaryDepartureObservations:number;
  primaryIsOperatorTagged:number;
  primaryMarketingTagged:number;
  primaryUnknownCodeshare:number;
  primaryExplicitOriginAgreements:number;
  primaryOriginMissing:number;
  primaryOriginConflicts:number;
  primaryWithGenericScheduledTime:number;
  primaryWithRunwayTime:number;
  primaryWithRevisedTime:number;
  primaryWithLiveQuality:number;
  distinctProvisionalAnalyticsIdentities:number;
  earliestScheduleVersionRetimedIdentities:number;
  firstScheduleOutsideFrozenWindow:number;
  sourceAsOfByNominalHorizon:readonly {
    horizon:P4NativeHorizonV39;
    candidateProvisionalIdentities:number;
    observedSourceAtNominalCutoff:number;
    unobservedSourceAtNominalCutoff:number;
  }[];
  // These values may not be guessed from FIDS fields alone.
  confirmedPhysicalOperatingFlightCount:null;
  independentlyCertifiedFirstSelectedTCount:null;
  independentlyActualWheelsOffCount:null;
  actualDepartureLabelCaptureRate:null;
  providerOriginProvenanceAuthenticityVerified:false;
  fullSourceDenominatorCertified:false;
  originalHttpWireBytesAuthenticated:false;
  certifiedPreSnapshotsWritten:false;
  scientificGate5Passed:false;
  phase5FreezeAuthorized:false;
  phase6Authorized:false;
  providerCalls:0;
  databaseWrites:0;
}

export function auditP4ProviderNativeLineageV39(
 rows:readonly P4ProviderNativeObservationV39[],
 scope:P4NativeSemanticAuditScopeV39
):P4NativeSemanticAuditResultV39{
 if(!Array.isArray(rows)||rows.length>20000)
  throw Error("P4_NATIVE_SOURCE_BOUNDED_ROWS_HOLD");
 if(!scope||!ICAO.test(scope.airportIcao))
  throw Error("P4_NATIVE_BAD_AIRPORT");
 const start=millis(scope.serviceWindowStartUtc,"start");
 const end=millis(scope.serviceWindowEndUtc,"end");
 const at=millis(scope.auditUtc,"audit");
 if(start>=end||end-start>24*3600_000||at<start-48*3600_000)
  throw Error("P4_NATIVE_SCOPE_WINDOW_HOLD");
 let valid=0,rejected=0,future=0,context=0,
  primary=0,operators=0,marketing=0,unknown=0,
  originAgree=0,originMissing=0,originConflict=0,
  withSchedule=0,withRunway=0,withRevised=0,withLive=0;
 const seen=new Set<string>();
 const records:Eligible[]=[];
 for(const r of rows){
  if(!r||!safeId(r.analyticIdentityId)||!safeId(r.populationQueryId)||
     !ICAO.test(r.sourceAirportIcao)||r.sourceAirportIcao!==scope.airportIcao||
     !["requested_airport_primary","opposite_movement_context","unknown"].includes(r.populationRole)||
     !["IsOperator","IsCodeshared","Unknown"].includes(r.codeshareStatus)||
     !["confirmed_core","unknown","auxiliary"].includes(r.scopeClassification)||
     !Array.isArray(r.departureQuality)||
     r.departureQuality.some((q:unknown)=>typeof q!=="string"||!["Basic","Live","Approximate"].includes(q))||
     !(r.explicitDepartureAirportIcao===null||ICAO.test(r.explicitDepartureAirportIcao))||
     !(r.providerFlightId===null||safeId(r.providerFlightId)))
    throw Error("P4_NATIVE_INVALID_SOURCE_RECORD");
  const key=r.populationQueryId+"|"+r.analyticIdentityId+"|"+r.populationRole;
  if(seen.has(key))throw Error("P4_NATIVE_DUPLICATE_QUERY_IDENTITY_ROLE");
  seen.add(key);
  const receipt=millis(r.sourceReceiptAvailableUtc,"receipt");
  const member=millis(r.memberAvailableUtc,"member");
  const scheduled=optionalMillis(r.departureScheduledUtc,"scheduled");
  const revised=optionalMillis(r.departureRevisedUtc,"revised");
  const runway=optionalMillis(r.departureRunwayUtc,"runway");
  // Strict: preserve any sub-ms source-clock issues for independent DB
  // exact-precision adjudication; NEVER move the member time backward.
  if(!r.originalRawRetained||!SHA.test(r.responseSha256)||
    r.responseSha256!==r.memberResponseSha256||member<receipt){
    rejected++;continue;
  }
  const sourceAt=Math.max(receipt,member);
  if(sourceAt>at){future++;continue;}
  valid++;
  if(r.populationRole!=="requested_airport_primary"){context++;continue;}
  primary++;
  if(r.codeshareStatus==="IsOperator")operators++;
  else if(r.codeshareStatus==="IsCodeshared")marketing++;
  else unknown++;
  if(r.explicitDepartureAirportIcao===scope.airportIcao)originAgree++;
  else if(r.explicitDepartureAirportIcao===null)originMissing++;
  else originConflict++;
  if(scheduled!==null)withSchedule++;
  if(revised!==null)withRevised++;
  if(runway!==null)withRunway++;
  if(r.departureQuality.includes("Live"))withLive++;
  records.push({
    id:r.analyticIdentityId,queryId:r.populationQueryId,
    firstReceipt:receipt,sourceAt,schedule:scheduled,
    role:"requested_airport_primary",codeshare:r.codeshareStatus,
    quality:r.departureQuality,revised,runway,
    scope:r.scopeClassification,explicitOrigin:r.explicitDepartureAirportIcao
  });
 }
 const byIdentity=new Map<string,Eligible[]>();
 for(const r of records){
  const a=byIdentity.get(r.id)??[];
  a.push(r);byIdentity.set(r.id,a);
 }
 let retimed=0,outside=0;
 const resultH=HORIZONS.map(([horizon])=>({
  horizon,candidateProvisionalIdentities:0,
  observedSourceAtNominalCutoff:0,unobservedSourceAtNominalCutoff:0
 }));
 for(const candidates of byIdentity.values()){
  candidates.sort((a,b)=>a.sourceAt-b.sourceAt||
    a.queryId.localeCompare(b.queryId));
  // First OBSERVED generic schedule (not first physical scheduled T).
  const first=candidates.find(c=>c.schedule!==null);
  if(!first||first.schedule===null)continue;
  if(first.schedule<start||first.schedule>=end){outside++;continue;}
  const versions=new Set(candidates.filter(x=>x.schedule!==null)
    .map(x=>x.schedule));
  if(versions.size>1)retimed++;
  for(let h=0;h<HORIZONS.length;h++){
   const cutoff=first.schedule-HORIZONS[h][1]*60000;
   const a=resultH[h];
   a.candidateProvisionalIdentities++;
   // Count only original provider observations actually durable by a
   // cutoff, not the current/last revised schedule or future webhooks.
   const observed=candidates.some(c=>c.sourceAt<=cutoff);
   if(observed)a.observedSourceAtNominalCutoff++;
   else a.unobservedSourceAtNominalCutoff++;
  }
 }
 return {
  schema:P4_NATIVE_SEMANTICS_AUDIT_V39,
  status:"CANDIDATE_LINEAGE_ONLY_SELECTED_T_AND_ACTUALITY_UNPROVEN",
  sourceAirportIcao:scope.airportIcao,
  originalObservationsSupplied:rows.length,
  validOriginalSourceObservations:valid,
  rejectedMissingRawOrHashOrClock:rejected,
  rejectedFutureAtAudit:future,
  oppositeOrUnknownContextObservations:context,
  primaryDepartureObservations:primary,
  primaryIsOperatorTagged:operators,
  primaryMarketingTagged:marketing,
  primaryUnknownCodeshare:unknown,
  primaryExplicitOriginAgreements:originAgree,
  primaryOriginMissing:originMissing,
  primaryOriginConflicts:originConflict,
  primaryWithGenericScheduledTime:withSchedule,
  primaryWithRunwayTime:withRunway,
  primaryWithRevisedTime:withRevised,
  primaryWithLiveQuality:withLive,
  distinctProvisionalAnalyticsIdentities:byIdentity.size,
  earliestScheduleVersionRetimedIdentities:retimed,
  firstScheduleOutsideFrozenWindow:outside,
  sourceAsOfByNominalHorizon:resultH,
  confirmedPhysicalOperatingFlightCount:null,
  independentlyCertifiedFirstSelectedTCount:null,
  independentlyActualWheelsOffCount:null,
  actualDepartureLabelCaptureRate:null,
  providerOriginProvenanceAuthenticityVerified:false,
  fullSourceDenominatorCertified:false,
  originalHttpWireBytesAuthenticated:false,
  certifiedPreSnapshotsWritten:false,
  scientificGate5Passed:false,
  phase5FreezeAuthorized:false,
  phase6Authorized:false,
  providerCalls:0,databaseWrites:0
 };
}
