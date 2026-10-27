/**
 * Gate05 f.8 §6/7 candidate SECOND source review — Cirium flight status.
 *
 * Vendor documentation advertises separate operationalTimes fields:
 * scheduledRunwayDeparture / estimatedRunwayDeparture / actualRunwayDeparture.
 * The fields are OPTIONAL; this pure offline reviewer DOES NOT authenticate
 * provider origin, timestamp source, retention rights, aircraft identity,
 * prediction cutoff T, or match these rows to existing AeroDataBox records.
 * No I/O, no secrets, no provider calls, no response persistence.
 *
 * https://developer.cirium.com/apis/data/Cirium-flight-status
 * https://developer.cirium.com/apis/flightstats-apis/flight-status
 */
export interface Gate05CiriumAdmittedShapeV39 {
  schema:"v39.gate05.cirium-runway-source-admission.v1";
  sourceContract:"CIRIUM_FLIGHT_STATUS_CANDIDATE_NOT_LICENSED_OR_INDEPENDENTLY_VERIFIED";
  sampleRows:number;
  malformedRows:number;
  scheduledRunwayUtcValid:number;
  actualRunwayUtcValid:number;
  estimatedRunwayUtcValid:number;
  independentlyNamedRunwayPairPresent:number;
  estimatedOnlyInsteadOfActual:number;
  invalidNonemptyUtc:number;
  providerFlightIdPresent:number;
  providerFlightIdMissing:number;
  provisionalDistinctProviderIds:number;
  noRunwayActualAndSchedulePair:number;
  departureGateTimesDoNotSubstituteRunway:true;
  nullableMissingTargetsAreAllowed:true;
  independentSourceSemanticReviewRequired:true;
  crossProviderOperatingLegJoinProven:false;
  providerSourceAuthenticityProven:false;
  prospectiveFeatureAsOfTProven:false;
  actualPrimaryLabelApproved:false;
  sourceLicensingChecked:false;
  providerCalls:0;
  databaseWrites:0;
}
function record(x:unknown):Record<string,unknown>|null {
  return x !== null && typeof x==="object" && !Array.isArray(x)
    ? x as Record<string,unknown>:null;
}
function utc(value:unknown):{valid:boolean,nonempty:boolean} {
  if(typeof value!=="string"||!value.trim()) return {valid:false,nonempty:false};
  // RFC3339 UTC, no nonzero-offset acceptance for .dateUtc. Reject
  // rollover dates rather than relying on permissive Date.parse alone.
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))
    return {valid:false,nonempty:true};
  const ms=Date.parse(value);
  if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,19)!==value.slice(0,19))
    return {valid:false,nonempty:true};
  return {valid:true,nonempty:true};
}
function runwayTime(o:Record<string,unknown>,kind:string) {
  return utc(record(o[kind])?.dateUtc);
}
/** Safe aggregated source-shape review of a *provided* in-memory array. */
export function inspectGate05CiriumRunwayShapeV39(
  input:unknown
):Gate05CiriumAdmittedShapeV39 {
  if(!Array.isArray(input)||input.length>2000)
    throw Error("GATE05_CIRIUM_SOURCE_ARRAY_INVALID");
  const x:Gate05CiriumAdmittedShapeV39={
    schema:"v39.gate05.cirium-runway-source-admission.v1",
    sourceContract:"CIRIUM_FLIGHT_STATUS_CANDIDATE_NOT_LICENSED_OR_INDEPENDENTLY_VERIFIED",
    sampleRows:input.length,malformedRows:0,
    scheduledRunwayUtcValid:0,actualRunwayUtcValid:0,
    estimatedRunwayUtcValid:0,independentlyNamedRunwayPairPresent:0,
    estimatedOnlyInsteadOfActual:0,invalidNonemptyUtc:0,
    providerFlightIdPresent:0,providerFlightIdMissing:0,
    provisionalDistinctProviderIds:0,noRunwayActualAndSchedulePair:0,
    departureGateTimesDoNotSubstituteRunway:true,
    nullableMissingTargetsAreAllowed:true,
    independentSourceSemanticReviewRequired:true,
    crossProviderOperatingLegJoinProven:false,
    providerSourceAuthenticityProven:false,prospectiveFeatureAsOfTProven:false,
    actualPrimaryLabelApproved:false,sourceLicensingChecked:false,
    providerCalls:0,databaseWrites:0
  };
  const ids=new Set<string>();
  for(const item of input){
    const f=record(item);
    const times=record(f?.operationalTimes);
    if(!f||!times){x.malformedRows++;continue;}
    const s=runwayTime(times,"scheduledRunwayDeparture");
    const a=runwayTime(times,"actualRunwayDeparture");
    const e=runwayTime(times,"estimatedRunwayDeparture");
    x.scheduledRunwayUtcValid+=Number(s.valid);
    x.actualRunwayUtcValid+=Number(a.valid);
    x.estimatedRunwayUtcValid+=Number(e.valid);
    x.independentlyNamedRunwayPairPresent+=Number(s.valid&&a.valid);
    x.estimatedOnlyInsteadOfActual+=Number(e.valid&&!a.valid);
    x.noRunwayActualAndSchedulePair+=Number(!(s.valid&&a.valid));
    x.invalidNonemptyUtc+=[s,a,e].filter(t=>t.nonempty&&!t.valid).length;
    const id=f.flightId;
    if((typeof id==="number"&&Number.isSafeInteger(id)&&id>0)||
       (typeof id==="string"&&/^[A-Za-z0-9_-]{1,80}$/.test(id))){
      x.providerFlightIdPresent++;
      ids.add(String(id));
    } else x.providerFlightIdMissing++;
  }
  x.provisionalDistinctProviderIds=ids.size;
  return x;
}
