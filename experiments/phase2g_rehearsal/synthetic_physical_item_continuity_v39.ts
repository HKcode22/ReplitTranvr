/**
 * P13/P15 TEST ONLY: compare retained physical-flight-v2 item evidence
 * identity-by-identity following an UNLOGGED state-loss experiment.
 *
 * Expected witnesses MUST be independently durable and authenticated for
 * any real science. These tests use synthetic/pre-crash fixtures instead.
 * A matching fixture is never proof of original AeroDataBox source content.
 * No database writes, provider calls, replay, payment or release authority.
 */
export type SyntheticPhysicalItemWitnessV39=Readonly<{
  sessionId:string;
  deliveryId:string;
  itemIndex:number;
  rawItemSha256:string;
  originalEdgeReceivedUtc:string;
  identityResolutionStatus:"resolved"|"quarantined";
  codeshareResolutionStatus:"resolved_operator"|"quarantined";
  flightInstanceId:string|null;
  initialServiceDate:string|null;
  operatingCarrier:string|null;
  operatingFlightNumber:string|null;
  originIcao:string|null;
  destinationIcao:string|null;
  scheduledGateOutUtc:string|null;
}>;
export type SyntheticPhysicalItemContinuityV39=Readonly<{
  itemEvidenceConsistent:boolean;
  mandatoryCensor:boolean;
  expectedItemCount:number;
  observedItemCount:number;
  confirmedOperatorObservationRows:number;
  confirmedUniqueOperatorFlightCount:number;
  sourceBuckets:number[];
  errors:string[];
  scientificRunAuthorized:false;
  automaticRestorationAuthorized:false;
}>;
const H=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const date=(v:string)=>typeof v==="string"&&UTC.test(v)&&
  Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const valid=(r:SyntheticPhysicalItemWitnessV39)=>
  r&&UUID.test(r.sessionId)&&typeof r.deliveryId==="string"&&
  r.deliveryId.length>0&&r.deliveryId.length<=256&&
  Number.isSafeInteger(r.itemIndex)&&r.itemIndex>=0&&H.test(r.rawItemSha256)&&
  date(r.originalEdgeReceivedUtc)&&
  ["resolved","quarantined"].includes(r.identityResolutionStatus)&&
  ["resolved_operator","quarantined"].includes(r.codeshareResolutionStatus)&&
  (r.flightInstanceId===null||
    (typeof r.flightInstanceId==="string"&&r.flightInstanceId.length>0))&&
  (r.initialServiceDate===null||
    (typeof r.initialServiceDate==="string"&&
     /^\d{4}-\d\d-\d\d$/.test(r.initialServiceDate)))&&
  [r.operatingCarrier,r.operatingFlightNumber,r.originIcao,r.destinationIcao]
    .every(x=>x===null||(typeof x==="string"&&x.length>0))&&
  (r.scheduledGateOutUtc===null||date(r.scheduledGateOutUtc));
const identityKey=(r:SyntheticPhysicalItemWitnessV39)=>
  JSON.stringify([r.sessionId,r.deliveryId,r.itemIndex]);
const structuralEqual=(a:SyntheticPhysicalItemWitnessV39,
  b:SyntheticPhysicalItemWitnessV39)=>
  a.sessionId===b.sessionId&&a.deliveryId===b.deliveryId&&
  a.itemIndex===b.itemIndex&&a.rawItemSha256===b.rawItemSha256&&
  a.originalEdgeReceivedUtc===b.originalEdgeReceivedUtc&&
  a.identityResolutionStatus===b.identityResolutionStatus&&
  a.codeshareResolutionStatus===b.codeshareResolutionStatus&&
  a.flightInstanceId===b.flightInstanceId&&
  a.initialServiceDate===b.initialServiceDate&&
  a.operatingCarrier===b.operatingCarrier&&
  a.operatingFlightNumber===b.operatingFlightNumber&&
  a.originIcao===b.originIcao&&
  a.destinationIcao===b.destinationIcao&&
  a.scheduledGateOutUtc===b.scheduledGateOutUtc;
export function compareSyntheticPhysicalItemContinuityV39(input:{
  frozenSessionId:string;
  windowStartUtc:string;
  windowEndUtc:string;
  independentSourceEvidenceAuthenticated:boolean;
  independentOwnerFreezeAuthenticated:boolean;
  expectedWitnesses:readonly SyntheticPhysicalItemWitnessV39[];
  observedRuntimeRows:readonly SyntheticPhysicalItemWitnessV39[];
}):SyntheticPhysicalItemContinuityV39{
  const errors=new Set<string>(), add=(e:string)=>errors.add(e);
  if(!UUID.test(input.frozenSessionId)||!date(input.windowStartUtc)||
     !date(input.windowEndUtc)||
     Date.parse(input.windowEndUtc)-Date.parse(input.windowStartUtc)!==7200000)
    add("FROZEN_SCIENTIFIC_SESSION_OR_WINDOW_INVALID");
  if(!input.independentSourceEvidenceAuthenticated)
    add("SOURCE_ITEM_WITNESS_NOT_INDEPENDENTLY_AUTHENTICATED");
  if(!input.independentOwnerFreezeAuthenticated)
    add("OWNER_SCIENTIFIC_FREEZE_NOT_INDEPENDENTLY_AUTHENTICATED");
  if(!Array.isArray(input.expectedWitnesses)||
     !Array.isArray(input.observedRuntimeRows)||
     input.expectedWitnesses.length>20000||input.observedRuntimeRows.length>20000)
    throw new Error("SYNTHETIC_ITEM_LEDGER_UNBOUNDED_OR_INVALID");
  const expected=new Map<string,SyntheticPhysicalItemWitnessV39>();
  const observed=new Map<string,SyntheticPhysicalItemWitnessV39>();
  const bucket=new Array<number>(8).fill(0);
  const start=Date.parse(input.windowStartUtc),end=Date.parse(input.windowEndUtc);
  for(const item of input.expectedWitnesses){
    if(!valid(item)||item.sessionId!==input.frozenSessionId){
      add("EXPECTED_PHYSICAL_ITEM_SCHEMA_OR_SESSION_INVALID");continue;
    }
    const k=identityKey(item);
    if(expected.has(k))add("DUPLICATE_EXPECTED_ITEM_IDENTITY");
    expected.set(k,item);
    const when=Date.parse(item.originalEdgeReceivedUtc);
    if(when<start||when>=end)add("ITEM_OUTSIDE_FROZEN_SOURCE_WINDOW");
    else bucket[Math.floor((when-start)/900000)]++;
  }
  for(const item of input.observedRuntimeRows){
    if(!valid(item)||item.sessionId!==input.frozenSessionId){
      add("OBSERVED_PHYSICAL_ITEM_SCHEMA_OR_SESSION_INVALID");continue;
    }
    const k=identityKey(item);
    if(observed.has(k))add("DUPLICATE_OBSERVED_ITEM_IDENTITY");
    observed.set(k,item);
    const exp=expected.get(k);
    if(!exp){add("UNEXPECTED_PHYSICAL_ITEM_IDENTITY");continue;}
    if(item.rawItemSha256!==exp.rawItemSha256)
      add("ORIGINAL_FLIGHT_ITEM_HASH_MISMATCH");
    if(item.originalEdgeReceivedUtc!==exp.originalEdgeReceivedUtc)
      add("ORIGINAL_FLIGHT_ITEM_UTC_SHIFTED");
    if(!structuralEqual(item,exp))
      add("PHYSICAL_V2_IDENTITY_OR_DISPOSITION_CHANGED");
  }
  for(const k of expected.keys())
    if(!observed.has(k))add("MISSING_PHYSICAL_ITEM_AFTER_CRASH");
  if(expected.size!==observed.size)
    add("PHYSICAL_ITEM_LEDGER_COUNT_DIFFERENT");
  let confirmedRows=0;
  const distinctConfirmed=new Map<string,SyntheticPhysicalItemWitnessV39>();
  for(const item of expected.values()){
    if(item.identityResolutionStatus==="resolved"&&
       item.codeshareResolutionStatus==="resolved_operator"&&
       !!item.flightInstanceId){
      confirmedRows++;
      const old=distinctConfirmed.get(item.flightInstanceId);
      if(old&&(
        old.operatingCarrier!==item.operatingCarrier||
        old.operatingFlightNumber!==item.operatingFlightNumber||
        old.originIcao!==item.originIcao||
        old.destinationIcao!==item.destinationIcao||
        old.initialServiceDate!==item.initialServiceDate
      ))add("PHYSICAL_ID_REUSED_FOR_INCOMPATIBLE_SERVICE");
      else distinctConfirmed.set(item.flightInstanceId,item);
    }else if(item.identityResolutionStatus==="resolved"||
             item.codeshareResolutionStatus==="resolved_operator")
      add("PHYSICAL_V2_OPERATOR_PROOF_INCOMPLETE");
  }
  return {
    itemEvidenceConsistent:errors.size===0,
    mandatoryCensor:errors.size!==0,
    expectedItemCount:expected.size,observedItemCount:observed.size,
    confirmedOperatorObservationRows:confirmedRows,
    confirmedUniqueOperatorFlightCount:distinctConfirmed.size,
    sourceBuckets:bucket,errors:[...errors].sort(),
    scientificRunAuthorized:false,automaticRestorationAuthorized:false
  };
}
