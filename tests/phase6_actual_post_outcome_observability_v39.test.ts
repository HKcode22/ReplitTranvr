import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {addCanonicalFidsEnvelopeHashV39} from "../server/lib/disruption/fidsEnvelopeCanonical_v39";
import {p5V0083FuturePostReservationSha256,type P5ReviewedFuturePostOneGet} from "../server/lib/disruption/phase5V0083FuturePostOriginalDb_v39";
import {auditP6ActualPostOutcomeObservability,readP6CommittedPostOutcomeObservability,P6_POST_PARTITION_PRE_SQL} from "../server/lib/disruption/phase6ActualPostOutcomeObservability_v39";
const H=(x:string)=>x.repeat(64),sha=(x:Buffer|string)=>createHash("sha256").update(x).digest("hex");
function fixture(){
 const p:P5ReviewedFuturePostOneGet={
  schema:"v39.phase5.future-post-reviewed-outcome-one-get.v1",manifestSha256:H("a"),requestSha256:H("b"),
  githubRunId:"1234567890",reviewedSourceRightsSha256:H("c"),reviewedProviderPriceSha256:H("d"),reviewedCategoryBudgetSha256:H("e"),
  reviewedRequestContextSha256:H("f"),reviewedProviderContractSha256:H("9"),reviewedFrameSha256:H("8"),
  runDayIndex:1,slot:"HUB",airportIcao:"WSSS",flightInstanceId:"leg:synthetic:001",
  expectedSelectedTNativeUtc:"2027-02-02T10:00:00.000Z",plannedSourceFromUtc:"2027-02-02T09:00:00.000Z",plannedSourceToUtc:"2027-02-02T11:00:00.000Z",
  fromLocal:"2027-02-02T17:00",toLocal:"2027-02-02T19:00",airportIanaTimezone:"Asia/Singapore",
  postDispatchEarliestUtc:"2027-02-02T12:00:00.000Z",postDispatchHardLatestUtc:"2027-02-02T12:20:00.000Z",
  expectedApiUnitsPerGet:2,independentFuturePostRequestAndRightsReview:true};
 const reservationSha256=p5V0083FuturePostReservationSha256(p),
  populationQueryId="c23e4567-e89b-42d3-a456-426614174013",ret="2027-02-02T12:02:00.000Z",available="2027-02-02T12:02:30.000Z",
  clock="2027-02-02T12:03:00.000Z";
 const move=(id:string,status="Departed",native=p.expectedSelectedTNativeUtc)=>({id,number:"SQ 0078",codeshareStatus:"IsOperator",
  departure:{airport:{icao:"WSSS"},scheduledTime:{utc:native},revisedTime:{utc:"2027-02-02T10:31:00.000Z"},
   runwayTime:{utc:"2027-02-02T10:42:00.000Z"},quality:["Live"]},arrival:{airport:{icao:"YSSY"}},status});
 const flight=move("native-001");
 function original(departures:unknown[]=[flight]){
  const body=Buffer.from(JSON.stringify({departures,arrivals:[]}));
  const raw_payload=addCanonicalFidsEnvelopeHashV39({airport:p.airportIcao,fromLocal:p.fromLocal,toLocal:p.toLocal,ianaTimezone:p.airportIanaTimezone,
   fidsRequestContract:{schema:"v39.fids-request-frame.application-intent.v1",airportIcao:p.airportIcao,direction:"Departure",
    fromLocal:p.fromLocal,toLocal:p.toLocal,openapiSha256:p.reviewedProviderContractSha256,phase5PostReservationSha256:reservationSha256},
   phase5PostReservationSha256:reservationSha256,phase5PostPurpose:"FUTURE_POST_SOURCE_OBSERVATION_NOT_AN_ACTUAL_PHYSICAL_LABEL",
   payloadRepresentation:"RECONSTRUCTED_RESPONSE_JSON_NOT_VERBATIM_HTTP_BYTES",originalHttpWireBytesPreserved:false,originalDecodedEntityBodyPreserved:true,
   originalDecodedEntityBodyEvidence:{schema:"v39.fids-fetch-decoded-source-body.v1",representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",
    bodySha256:sha(body),bodyLengthBytes:body.length,bodyBase64:body.toString("base64")},departures,arrivals:[],fetchedAtUtc:ret});
  const responseSha256=sha(JSON.stringify(raw_payload));
  const s={packet:p,populationQueryId,responseSha256,normalizedMembers:departures.length,reservationSha256};
  const row={population_query_id:populationQueryId,response_hash:responseSha256,source_airport_icao:p.airportIcao,query_direction:"Departure",
   service_window_start_utc:p.plannedSourceFromUtc,service_window_end_utc:p.plannedSourceToUtc,from_local:p.fromLocal,to_local:p.toLocal,
   airport_iana_timezone:p.airportIanaTimezone,openapi_sha256:p.reviewedProviderContractSha256,fids_retrieval_utc:ret,
   available_at:available,raw_persisted_at_utc:available,raw_expired_at_utc:null,raw_payload,members:departures.length};
  return {s,row};
 }
 function pre(horizon:"T-24h"|"T-6h"|"T-90m"="T-6h",idx=1,key="native-001",flightId=p.flightInstanceId){
  const offsets={"T-24h":24*3600000,"T-6h":6*3600000,"T-90m":90*60000},t=Date.parse(p.expectedSelectedTNativeUtc),
   cutoff=t-offsets[horizon],iso=(n:number)=>new Date(n).toISOString();
  return {flight_instance_id:flightId,snapshot_id:String(idx),horizon,query_digest:H("1"),provider_record_key:key,
   flight_number:"SQ78",dep_airport_icao:"WSSS",arr_airport_icao:"YSSY",dep_scheduled_utc:p.expectedSelectedTNativeUtc,
   selected_t_milestone_utc:p.expectedSelectedTNativeUtc,selected_t_version:"ci-native",prediction_cutoff_utc:iso(cutoff),created_at:iso(cutoff-1000),
   original_available_at:iso(cutoff-5000),member_available_at:iso(cutoff-4000),source_expires_at_utc:"2027-02-03T09:00:00.000Z",
   fids_response_hash:H("2"),binding_response_hash:H("2")};
 }
 return {p,clock,flight,move,original,pre,...original()};
}
describe("actual POST outcome observability, original cutoff-safe retained PRE partition",()=>{
 it("matches each retained horizon without declaring revised or runway time actual gate-out",()=>{
  const f=fixture(),a=auditP6ActualPostOutcomeObservability(f.s,f.row,[f.pre(),f.pre("T-90m",2)],f.clock);
  expect(a).toMatchObject({uniqueRetainedPreFlights:1,actualGateOutNumericCandidates:0,physicalGateOutLabels:0,physicalRunwayLabels:0,
   fullStudyDenominatorCertified:false,providerCalls:0,databaseWrites:0});
  expect(a.byHorizon["T-6h"]).toMatchObject({retainedCutoffSafePre:1,matchedNativePost:1,reportedRevisedTime:1,
   reportedRunwayTime:1,reportedDistinctGateRunwayTimes:1,reportedGateBeforeRunway:1,reportedGateAfterRunway:0,labelEvidenceUnverified:1,actualGateOutNumericCandidates:0});
  expect(a.byHorizon["T-90m"].matchedNativePost).toBe(1);
  expect(a.pairedHorizonObservability).toMatchObject({retainedUniqueFlightCandidates:1,retainedT6UniquePre:1,retainedT90UniquePre:1,retainedConsistentT6T90Pairs:1,sameNativeReportedPostT6T90PairsAfterScheduledT:1,actualPhysicalLabelPairsCertified:0,fullStudyDenominatorCertified:false});
  expect(a.privateDecisions[0].draft.scheduled).toMatchObject({milestone:"GENERAL_SCHEDULED_DEPARTURE",externallyVerifiedGateOutMeaning:false});
  expect(a.privateDecisions[0].draft.outcome).toMatchObject({event:"NO_EVENT",actualUtc:null,externallyVerifiedActualOnly:false});
  expect(JSON.stringify(a)).not.toContain("native-001");expect(JSON.stringify(a)).not.toContain("leg:synthetic:001");
 });
 it("missing POST, absent native id, late/expired PRE, duplicate/ambiguous IDs are local not cancellation",()=>{
  const f=fixture();
  const a=auditP6ActualPostOutcomeObservability(f.s,f.row,[
   f.pre("T-6h",1,"native-missing","leg:synthetic:002"),
   f.pre("T-6h",2,"fidsrec:unknown","leg:synthetic:003"),
   f.pre("T-6h",3,"native-001","leg:synthetic:004"),
   f.pre("T-6h",4,"native-001","leg:synthetic:005"),
   f.pre("T-90m",5,"native-005","leg:synthetic:006"),
   f.pre("T-90m",6,"native-005","leg:synthetic:006"),
   {...f.pre("T-24h",7),source_expires_at_utc:"2027-02-02T09:59:00.000Z"},
   {...f.pre("T-6h",8),created_at:"2027-02-02T04:01:00.000Z"}],f.clock);
  expect(a.byHorizon["T-6h"]).toMatchObject({retainedCutoffSafePre:4,postAbsent:1,missingNativeId:1,ambiguousIdentity:2,reportedCancelled:0});
  expect(a.byHorizon["T-90m"].duplicatePre).toBe(1);expect(a.invalidPreRows).toBe(2);
  expect(a.confirmedCancellationLabels).toBe(0);
 });
 it("does not equate separate horizon counts with paired observations; duplicate and native version conflicts are local",()=>{
  const f=fixture();
  const a=auditP6ActualPostOutcomeObservability(f.s,f.row,[
   f.pre("T-6h",1,"native-a","leg:synthetic:010"),f.pre("T-90m",2,"native-b","leg:synthetic:011"),
   f.pre("T-6h",3,"native-c","leg:synthetic:012"),{...f.pre("T-90m",4,"native-c","leg:synthetic:012"),selected_t_version:"other"},
   f.pre("T-6h",5,"native-d","leg:synthetic:013"),f.pre("T-6h",6,"native-d","leg:synthetic:013"),f.pre("T-90m",7,"native-d","leg:synthetic:013"),
   f.pre("T-6h",8,"native-001"),f.pre("T-90m",9,"native-001"),f.pre("T-24h",10,"native-001")
  ],f.clock);
  expect(a.pairedHorizonObservability).toMatchObject({retainedUniqueFlightCandidates:5,flightsWithDuplicateHorizon:1,
   flightsWithCrossHorizonTOrIdentityConflict:1,retainedT6UniquePre:3,retainedT90UniquePre:4,retainedConsistentT6T90Pairs:1,
   retainedConsistentT6T24Pairs:1,retainedConsistentAllThree:1,sameNativeReportedPostT6T90PairsAfterScheduledT:1,
   t24OriginalExpiryCanRemoveEvidence:true,actualPhysicalLabelPairsCertified:0});
  expect(JSON.stringify(a.pairedHorizonObservability)).not.toContain("native-001");
 });
 it("counts an expired T24 as unavailable retained evidence, not absent original collection or fake pair",()=>{
  const f=fixture(),a=auditP6ActualPostOutcomeObservability(f.s,f.row,[f.pre(),{
   ...f.pre("T-24h",2),source_expires_at_utc:"2027-02-02T09:59:00.000Z"}],f.clock);
  expect(a.invalidPreRows).toBe(1);
  expect(a.pairedHorizonObservability).toMatchObject({retainedT6UniquePre:1,retainedT24UniquePre:0,retainedConsistentT6T24Pairs:0,t6OnlyAmongRetainedHorizons:1,fullStudyDenominatorCertified:false});
 });
 it("reports documented ID-less scheduled services separately from native-ID and physical labels",()=>{
  const f=fixture(),{id:_id,...flight}=f.flight,pre=f.pre("T-6h",1,"fidsrec:provisional");
  const run=(movements:unknown[],rows=[pre])=>{
   const original=f.original(movements);
   return auditP6ActualPostOutcomeObservability(original.s,original.row,rows,f.clock);
  };
  const exact=run([flight]);
  expect(exact.byHorizon["T-6h"]).toMatchObject({missingNativeId:1,matchedNativePost:0,idlessExactReportedService:1,
   idlessDepartureQueryContextService:0,idlessServiceReportedRevised:1,idlessServiceReportedRunway:1});
  const context=run([{...flight,departure:{...flight.departure,airport:null}}]);
  expect(context.byHorizon["T-6h"]).toMatchObject({idlessExactReportedService:0,idlessDepartureQueryContextService:1,matchedNativePost:0});
  expect(run([flight,flight]).byHorizon["T-6h"].idlessServiceAmbiguous).toBe(1);
  expect(run([{...flight,codeshareStatus:"IsCodeshared"}]).byHorizon["T-6h"].idlessServiceAmbiguous).toBe(1);
  expect(run([flight],[pre,{...pre,flight_instance_id:"leg:synthetic:002",snapshot_id:"2"}]).byHorizon["T-6h"].idlessServiceAmbiguous).toBe(2);
  expect(run([{...flight,departure:{...flight.departure,airport:{icao:"YSSY"}}}]).byHorizon["T-6h"].idlessServiceNotObserved).toBe(1);
  expect(run([{...flight,departure:{...flight.departure,scheduledTime:{utc:"2027-02-02T10:01:00.000Z"}}}]).byHorizon["T-6h"].idlessServiceNotObserved).toBe(1);
  expect(run([{...flight,status:"Canceled"}]).byHorizon["T-6h"].idlessServiceReportedCancelled).toBe(1);
  expect(exact.actualGateOutNumericCandidates).toBe(0);expect(exact.confirmedCancellationLabels).toBe(0);
  expect(exact.privateDecisions).toHaveLength(0);expect(JSON.stringify(exact)).not.toContain("leg:synthetic");
 });
 it("measures distinct reported gate/runway field values but never promotes them to actual",()=>{
  const f=fixture(),run=(dep:unknown)=>{
   const original=f.original([{...f.flight,departure:dep}]);
   return auditP6ActualPostOutcomeObservability(original.s,original.row,[f.pre()],f.clock);
  };
  const equal=run({...f.flight.departure,runwayTime:f.flight.departure.revisedTime});
  expect(equal.byHorizon["T-6h"]).toMatchObject({reportedDistinctGateRunwayTimes:0,reportedRevisedWithoutDistinctRunway:1,actualGateOutNumericCandidates:0});
  const absent=run({...f.flight.departure,runwayTime:null});
  expect(absent.byHorizon["T-6h"].reportedRevisedWithoutDistinctRunway).toBe(1);
  const reversed=run({...f.flight.departure,runwayTime:{utc:"2027-02-02T10:25:00.000Z"}});
  expect(reversed.byHorizon["T-6h"]).toMatchObject({reportedDistinctGateRunwayTimes:1,reportedGateAfterRunway:1,reportedGateBeforeRunway:0,actualGateOutNumericCandidates:0});
  expect(reversed.physicalGateOutLabels).toBe(0);
 });
 it("censors prospective cross-key retimes even when provider IDs change, preserving unrelated positive diagnostics",()=>{
  const f=fixture(),aKey="leg:p5v1:"+H("a"),bKey="leg:p5v1:"+H("b"),cKey="leg:p5v1:"+H("c");
  const retimed=f.pre("T-90m",3,"native-002",bKey);
  const shifted={...retimed};
  for(const k of ["dep_scheduled_utc","selected_t_milestone_utc","prediction_cutoff_utc","created_at",
   "original_available_at","member_available_at"] as const)
   shifted[k]=new Date(Date.parse(retimed[k])+15*60000).toISOString();
  const other={...f.pre("T-6h",4,"native-003",cKey),flight_number:"SQ79"};
  const r=f.original([f.flight,f.move("native-002","Departed",shifted.selected_t_milestone_utc),
   {...f.move("native-003"),number:"SQ79"}]);
  const out=auditP6ActualPostOutcomeObservability(r.s,r.row,
   [f.pre("T-6h",1,"native-001",aKey),f.pre("T-90m",2,"native-001",aKey),shifted,other],f.clock);
  expect(out.uniqueRetainedPreFlights).toBe(3);
  expect(out.byHorizon["T-6h"]).toMatchObject({retainedCutoffSafePre:2,potentialCrossKeyServiceAlias:1,ambiguousIdentity:1,matchedNativePost:1});
  expect(out.byHorizon["T-90m"]).toMatchObject({retainedCutoffSafePre:2,potentialCrossKeyServiceAlias:2,ambiguousIdentity:2,matchedNativePost:0});
  expect(out.pairedHorizonObservability).toMatchObject({retainedUniqueFlightCandidates:3,retainedKeysWithPotentialCrossKeyServiceAlias:2,
   retainedT6UniquePre:2,retainedT90UniquePre:2,retainedConsistentT6T90Pairs:0,sameNativeReportedPostT6T90PairsAfterScheduledT:0,actualPhysicalLabelPairsCertified:0});
  expect(out.privateDecisions).toHaveLength(1);
  expect(JSON.stringify(out)).not.toContain(aKey);
  expect(JSON.stringify(out)).not.toContain("native-002");
 });
 it("preserves a same-key prospective pair, while repeated provider IDs on different prospective keys are ambiguous",()=>{
  const f=fixture(),aKey="leg:p5v1:"+H("a"),bKey="leg:p5v1:"+H("b");
  const pair=[f.pre("T-6h",1,"native-001",aKey),f.pre("T-90m",2,"native-001",aKey)];
  const complete=auditP6ActualPostOutcomeObservability(f.s,f.row,pair,f.clock);
  expect(complete.pairedHorizonObservability).toMatchObject({retainedKeysWithPotentialCrossKeyServiceAlias:0,retainedConsistentT6T90Pairs:1,sameNativeReportedPostT6T90PairsAfterScheduledT:1});
  const ambiguous=auditP6ActualPostOutcomeObservability(f.s,f.row,
   [...pair,{...f.pre("T-6h",3,"native-001",bKey),flight_number:"SQ79"}],f.clock);
  expect(ambiguous.pairedHorizonObservability).toMatchObject({retainedKeysWithPotentialCrossKeyServiceAlias:2,retainedConsistentT6T90Pairs:0});
  expect(ambiguous.byHorizon["T-6h"]).toMatchObject({potentialCrossKeyServiceAlias:2,ambiguousIdentity:2,matchedNativePost:0});
  expect(ambiguous.privateDecisions).toHaveLength(0);
 });
 it("keeps retimed reported schedule and cancellation separate; never changes original T",()=>{
  const f=fixture(),r=f.original([f.move("native-001","Canceled","2027-02-02T10:15:00.000Z")]);
  const a=auditP6ActualPostOutcomeObservability(r.s,r.row,[f.pre()],f.clock);
  expect(a.byHorizon["T-6h"]).toMatchObject({changedGenericSchedule:1,reportedCancelled:1,actualGateOutNumericCandidates:0});
  expect(a.confirmedCancellationLabels).toBe(0);
  expect(a.privateDecisions[0].draft.selectedNativeTUtc).toBe(f.p.expectedSelectedTNativeUtc);
 });
 it("rejects changed body, exact source scope drift, and stale observations",()=>{
  const f=fixture();
  expect(()=>auditP6ActualPostOutcomeObservability(f.s,{...f.row,source_airport_icao:"YSSY"},[f.pre()],f.clock)).toThrow();
  expect(()=>auditP6ActualPostOutcomeObservability(f.s,{...f.row,raw_payload:{...f.row.raw_payload,departures:[]}},[f.pre()],f.clock)).toThrow("POST_BODY_RECEIPT_OR_FRESHNESS_DRIFT");
  expect(()=>auditP6ActualPostOutcomeObservability(f.s,f.row,[f.pre()],"2027-02-02T12:20:00.000Z")).toThrow("POST_BODY_RECEIPT_OR_FRESHNESS_DRIFT");
 });
 it("reads exact original and whole partition via current restricted read-only role, not anchor alone",async()=>{
  const f=fixture(),sqls:string[]=[];
  const pool={connect:async()=>({query:async(sql:string,args?:unknown[])=>{
   sqls.push(sql);
   if(sql.startsWith("SELECT current_user"))return {rowCount:1,rows:[{role:"phase5_fids_source_prod_20261107",
    login:"phase5_p5_source_login_20261108",db:"neondb",ro:"on",version:160016,replica:false,now:f.clock}]};
   if(sql.startsWith("SELECT r.population_query_id")){expect(args?.slice(0,3)).toEqual([f.s.populationQueryId,f.s.reservationSha256,f.s.responseSha256]);return {rowCount:1,rows:[f.row]};}
   if(sql===P6_POST_PARTITION_PRE_SQL){expect(args?.[3]).toBe(f.p.plannedSourceFromUtc);expect(sql).not.toContain("s.flight_instance_id=$4");return {rowCount:2,rows:[f.pre(),f.pre("T-6h",2,"native-other","leg:synthetic:002")]};}
   return {rowCount:0,rows:[]};},release:()=>sqls.push("released")})};
  const a=await readP6CommittedPostOutcomeObservability(pool as any,f.s);
  expect(a.byHorizon["T-6h"]).toMatchObject({matchedNativePost:1,postAbsent:1,retainedCutoffSafePre:2});
  expect(sqls).toContain("ROLLBACK");expect(sqls.every(x=>!/^INSERT|^UPDATE|^DELETE|^COMMIT/.test(x))).toBe(true);
 });
});
