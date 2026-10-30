/** Phase4 Gate5: source-field feasibility ONLY, never source identity certification. */
export const P4_STATUS_PROBE_SCHEMA="v39.phase4.gate5-one-status-feasibility.v1" as const;
function rec(v:unknown):Record<string,unknown>|null{
 return v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:null;
}
function nested(root:unknown,...keys:string[]):unknown{
 let v=root;
 for(const key of keys){v=rec(v)?.[key];}
 return v;
}
function str(v:unknown):string|null{
 return typeof v==="string"&&v.trim()?v.trim():null;
}
function norm(v:unknown):string{
 return (str(v)??"").replace(/[\s-]/g,"").toUpperCase();
}
export function summarizeP4OneStatusFeasibility(
 result:unknown, candidate:{number:string;originIcao:"WSSS";destinationIcao:string}
){
 if(!Array.isArray(result)||result.length>30)throw Error("P4_STATUS_RESPONSE_SHAPE_HOLD");
 if(!/^[A-Z0-9]{3,10}$/.test(candidate.number)||
    !/^[A-Z]{4}$/.test(candidate.destinationIcao))
  throw Error("P4_STATUS_CANDIDATE_FORMAT_HOLD");
 let sameNumber=0,matchingOrigin=0,matchingDestination=0,
  runwayFieldPresent=0,scheduledFieldPresent=0,estimatedFieldPresent=0,
  revisedFieldPresent=0,aircraftIcao24Present=0,tailPresent=0,
  providerIdPresent=0,withBothAirports=0;
 for(const v of result){
  if(!rec(v))throw Error("P4_STATUS_ITEM_SHAPE_HOLD");
  if(norm(nested(v,"number"))!==candidate.number)continue;
  sameNumber++;
  const departure=norm(nested(v,"departure","airport","icao"));
  if(departure!=="WSSS")continue;
  matchingOrigin++;
  const arrival=norm(nested(v,"arrival","airport","icao"));
  if(arrival!==candidate.destinationIcao)continue;
  matchingDestination++;withBothAirports++;
  if(str(nested(v,"departure","runwayTime","utc")))runwayFieldPresent++;
  if(str(nested(v,"departure","scheduledTime","utc")))scheduledFieldPresent++;
  if(str(nested(v,"departure","predictedTime","utc")))estimatedFieldPresent++;
  if(str(nested(v,"departure","revisedTime","utc")))revisedFieldPresent++;
  if(str(nested(v,"aircraft","modeS")))aircraftIcao24Present++;
  if(str(nested(v,"aircraft","reg")))tailPresent++;
  if(str(nested(v,"id")))providerIdPresent++;
 }
 return {
  schema:P4_STATUS_PROBE_SCHEMA,
  status:"ONE_BILLABLE_STATUS_SOURCE_FIELD_FEASIBILITY_NOT_SCIENCE_PASS",
  returnedStatusRecords:result.length,
  sameFlightNumberRecords:sameNumber,
  sourceAirportOriginMatched:matchingOrigin,
  originAndDestinationMatched:matchingDestination,
  completeAirportPairObserved:withBothAirports,
  originalRunwayTimeFieldPresent:runwayFieldPresent,
  originalScheduleTimeFieldPresent:scheduledFieldPresent,
  originalPredictedTimeFieldPresent:estimatedFieldPresent,
  originalRevisedTimeFieldPresent:revisedFieldPresent,
  providerIdFieldPresent:providerIdPresent,
  aircraftIcao24FieldPresent:aircraftIcao24Present,
  aircraftRegistrationFieldPresent:tailPresent,
  originalFidsQueryOriginUnverifiedPhysicalLeg:true,
  independentPhysicalLegIdentityCertified:false,
  providerRunwayFieldActualityCertified:false,
  providerScheduledTGateOrRunwaySemanticsCertified:false,
  sourceBytesPersisted:false,
  sourceMetadataOnlyNoRawPersonOrFlightInfo:true,
  strictGate5Passed:false,
  phase6Authorized:false,
  maxPaidStatusGets:1,
  automaticRetries:0,
  noProviderAlertsOrSubscriptions:true,
  databaseWrites:0
 };
}
