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
 let explicitDepartureAirport=0,flightLegPresent=0;
 let malformed=0;
 for(const raw of flights){
  const f=obj(raw);
  if(!f){malformed++;continue;}
  const code=f.codeshareStatus;
  if(code==="IsOperator"||code===1||code==="1")explicitOperator++;
  else if(code==="IsCodeshared"||code===2||code==="2")explicitMarketing++;
  else unknownCodeshare++;
  const dep=obj(f.departure);
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
  if(text(obj(dep?.airport)?.icao).length===4)explicitDepartureAirport++;
  if(obj(f.leg))flightLegPresent++;
 }
 const n=flights.length;
 if(malformed!==0||explicitOperator+explicitMarketing+unknownCodeshare!==n||
    scheduled>n||revised>n||runway>n||quality>n||
    runwayQualityPresent>runway||runwayWithLiveQuality>runwayQualityPresent)
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
  originIcaoFieldPresent:explicitDepartureAirport,
  flightLegObjectPresent:flightLegPresent,
  firstProviderNativeSelectedTCertified:false as const,
  runwayActualOnlyPerRecordCertified:false as const,
  confirmedOperatingLegPopulation:false as const,
  retainedSourceForFutureCohort:false as const,
  certifiedPersistedPreCount:null,
  strictGate5Passed:false as const,
  phase5FreezeAuthorized:false as const,phase6Authorized:false as const
 };
}
