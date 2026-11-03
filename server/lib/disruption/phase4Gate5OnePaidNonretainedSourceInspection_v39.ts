/**
 * In-memory single-request AeroDataBox FIDS data-shape investigation.
 * NO original bytes, per-flight identifiers, times, schedules or body are
 * returned or persisted. Attribute presence is NOT scientific actuality.
 * This is a real prospective feasibility expenditure, not a Gate5 cohort.
 */
const MAX=900;
const obj=(v:unknown):Record<string,unknown>|null=>
  v!==null&&typeof v==="object"&&!Array.isArray(v)?
   v as Record<string,unknown>:null;
const text=(v:unknown):string=>
  typeof v==="string"?v:"";
export function inspectP4OnePaidNonretainedFidsV39(body:unknown){
 const r=obj(body),flights=r?.departures;
 if(!Array.isArray(flights)||flights.length>MAX)
  throw Error("P4_G5_NONRETAINED_FIDS_SHAPE_OR_TRUNCATION_HOLD");
 let explicitOperator=0,explicitMarketing=0,unknownCodeshare=0;
 let scheduled=0,revised=0,runway=0,quality=0;
 let runwayQualityPresent=0,runwayWithLiveQuality=0;
 // OpenAPI AirportFlightContract: withLeg=true expands to departure/arrival,
 // NOT a top-level "leg" object. For requested-airport departures, the
 // departure.airport property may be omitted *by design*. Count the real
 // contract paths separately; missing fields are never proof of nonoperation.
 let departureObject=0,arrivalObject=0,expandedPair=0,movementOnly=0;
 let departureAirportIcao=0,oppositeArrivalAirportIcao=0;
 let requestedAirportDepartureOmitted=0;
 let malformed=0;
 for(const raw of flights){
  const f=obj(raw);
  if(!f){malformed++;continue;}
  const code=f.codeshareStatus;
  if(code==="IsOperator"||code===1||code==="1")explicitOperator++;
  else if(code==="IsCodeshared"||code===2||code==="2")explicitMarketing++;
  else unknownCodeshare++;
  const dep=obj(f.departure);
  const arr=obj(f.arrival);
  const movement=obj(f.movement);
  if(dep)departureObject++;
  if(arr)arrivalObject++;
  if(dep&&arr&&!movement)expandedPair++;
  if(movement&&!dep&&!arr)movementOnly++;
  // departure.airport is optional/omitted when equal to requested airport.
  const departureAirport=obj(dep?.airport);
  if(dep&&!departureAirport)requestedAirportDepartureOmitted++;
  if(text(departureAirport?.icao).length===4)departureAirportIcao++;
  if(text(obj(arr?.airport)?.icao).length===4)oppositeArrivalAirportIcao++;
  const times=dep&&obj(dep.scheduledTime);
  const revisedTime=dep&&obj(dep.revisedTime);
  const runwayTime=dep&&obj(dep.runwayTime);
  const qualityValue=dep?.quality;
  const validTime=(v:Record<string,unknown>|null|undefined)=>
    v&&typeof v.utc==="string"&&Number.isFinite(Date.parse(v.utc));
  if(validTime(times))scheduled++;
  if(validTime(revisedTime))revised++;
  if(validTime(runwayTime))runway++;
  const hasQuality=qualityValue!==null&&qualityValue!==undefined;
  if(hasQuality)quality++;
  if(validTime(runwayTime)&&hasQuality){
   runwayQualityPresent++;
   if(qualityValue==="Live"||
      (Array.isArray(qualityValue)&&qualityValue.includes("Live")))
    runwayWithLiveQuality++;
  }
 }
 const n=flights.length;
 if(malformed!==0||explicitOperator+explicitMarketing+unknownCodeshare!==n||
    scheduled>n||revised>n||runway>n||quality>n||
    runwayQualityPresent>runway||runwayWithLiveQuality>runwayQualityPresent||
    expandedPair>departureObject||expandedPair>arrivalObject||
    requestedAirportDepartureOmitted>departureObject||
    movementOnly+expandedPair>n)
  throw Error("P4_G5_NONRETAINED_FIDS_COUNTER_INTEGRITY_HOLD");
 return {
  schema:"v39.phase4.gate5-single-paid-fids-ephemeral-source-shape.v1" as const,
  status:"PROVIDER_FIELDS_OBSERVED_SEMANTICS_UNCERTIFIED" as const,
  observedDepartureRecords:n,
  providerOperatorTaggedObservations:explicitOperator,
  providerMarketingTaggedObservations:explicitMarketing,
  codeshareUnresolvedObservations:unknownCodeshare,
  scheduledTimeFieldPresent:scheduled,
  revisedTimeFieldPresent:revised,
  runwayTimeFieldPresent:runway,
  qualityFieldPresent:quality,
  runwayTimeWithAnyQuality:runwayQualityPresent,
  runwayTimeWithLiveQuality:runwayWithLiveQuality,
  // Contract-correct source-shape diagnostics. None prove operating identity.
  departureMovementObjectPresent:departureObject,
  arrivalMovementObjectPresent:arrivalObject,
  withLegExpandedMovementPairPresent:expandedPair,
  movementOnlyFidsShapePresent:movementOnly,
  departureAirportIcaoFieldPresent:departureAirportIcao,
  oppositeArrivalAirportIcaoFieldPresent:oppositeArrivalAirportIcao,
  requestedAirportDepartureObjectWithAirportOmitted:
    requestedAirportDepartureOmitted,
  requestedAirportOmissionAllowedByOpenApi:true as const,
  withLegIsDepartureArrivalNotTopLevelLeg:true as const,
  firstProviderNativeSelectedTCertified:false as const,
  runwayActualOnlyPerRecordCertified:false as const,
  confirmedOperatingLegPopulation:false as const,
  retainedSourceForFutureCohort:false as const,
  certifiedPersistedPreCount:null,
  strictGate5Passed:false as const,
  phase5FreezeAuthorized:false as const,phase6Authorized:false as const
 };
}
