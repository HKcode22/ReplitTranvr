import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {describe,it,expect,vi} from "vitest";
import {addCanonicalFidsEnvelopeHashV39} from "../server/lib/disruption/fidsEnvelopeCanonical_v39";
import {p5V0083FuturePostReservationSha256,type P5ReviewedFuturePostOneGet} from "../server/lib/disruption/phase5V0083FuturePostOriginalDb_v39";
import {auditP6ActualPostOutcomeObservability,readP6CommittedPostOutcomeObservability,P6_POST_PARTITION_PRE_SQL} from "../server/lib/disruption/phase6ActualPostOutcomeObservability_v39";
const H=(x:string)=>x.repeat(64),sha=(x:Buffer|string)=>createHash("sha256").update(x).digest("hex");
function fixture(realDigestShape=false){
 const D=(x:string)=>realDigestShape?sha('synthetic-post-pin:'+x):H(x);
 const p:P5ReviewedFuturePostOneGet={
  schema:"v39.phase5.future-post-reviewed-outcome-one-get.v1",manifestSha256:D("a"),requestSha256:D("b"),
  githubRunId:"1234567890",reviewedSourceRightsSha256:D("c"),reviewedProviderPriceSha256:D("d"),reviewedCategoryBudgetSha256:D("e"),
  reviewedRequestContextSha256:D("f"),reviewedProviderContractSha256:D("9"),reviewedFrameSha256:D("8"),
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
 it("hands off exact live PRE scopes including unmatched POST without serializing source identities",()=>{
  const f=fixture(),a=auditP6ActualPostOutcomeObservability(f.s,f.row,[f.pre(),f.pre("T-90m",2,"other-native","leg:synthetic:002")],f.clock);
  expect(a.privatePreservationAnchors).toHaveLength(2);
  expect(a.privatePreservationAnchors[0]).toMatchObject({snapshotId:"1",manifestSha256:f.p.manifestSha256,
   rightsSha256:f.p.reviewedSourceRightsSha256,queryDigestSha256:H("1"),horizon:"T-6h"});
  expect(a.privatePreservationAnchors[1]).toMatchObject({snapshotId:"2",horizon:"T-90m"});
  expect(Object.getOwnPropertyDescriptor(a,"privatePreservationAnchors")?.enumerable).toBe(false);
  expect(JSON.stringify(a)).not.toContain("leg:synthetic");
  expect(JSON.stringify(a)).not.toContain("snapshotId");
 });
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
  expect(new Set(ambiguous.privateAmbiguousPreservationFlightIds)).toEqual(new Set([aKey,bKey]));
  expect(ambiguous.privatePreservationAnchors.every(h=>h.ambiguousIdentity)).toBe(true);
  expect(Object.getOwnPropertyDescriptor(ambiguous,"privateAmbiguousPreservationFlightIds")?.enumerable).toBe(false);
  expect(JSON.stringify(ambiguous)).not.toContain(aKey);
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

import {recoverPhase7CommittedPost,phase7CommittedPostAuditIdentity,discoverPhase7CommittedPostScope,issuePhase7CommittedPostRecoveryReceipt,recoverPhase7PostByOriginalReservation,requirePhase7RecoveryReceiptBeforeSettlement} from "../server/lib/disruption/phase7CommittedPostRecovery_v39";
import {hashPhase7DurableCandidate} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
describe("read-only committed POST recovery candidate",()=>{
 function recoveryFixture(){
  const f=fixture(),keys=generateKeyPairSync("ed25519");
  const policy="ae".repeat(32),fp=sha(keys.publicKey.export({type:"spki",format:"der"}));
  const env={V39_P5_MANIFEST_SHA256:f.p.manifestSha256,V39_P5_RIGHTS_SHA256:f.p.reviewedSourceRightsSha256,
   P6_PHASE7_POST_PRESERVATION_POLICY_SHA256:policy,P6_PHASE7_POST_OUTCOME_REVIEWER_FINGERPRINT_SHA256:fp,
   P6_PHASE7_POST_OUTCOME_REVIEWER_PUBLIC_KEY_BASE64:Buffer.from(keys.publicKey.export({type:"spki",format:"pem"})).toString("base64")};
  const prior=auditP6ActualPostOutcomeObservability(f.s,f.row,[f.pre()],f.clock);
  const receipt={schema:"v39.phase7.committed-post-recovery-receipt.v2",policySha256:policy,originalAvailableAtUtc:f.row.available_at,
   committedScopeSha256:hashPhase7DurableCandidate(f.s),originalAuditSha256:phase7CommittedPostAuditIdentity(prior),
   originalAuditAtUtc:f.clock,reviewedAtUtc:"2027-02-02T12:03:01.000Z",validUntilUtc:"2027-02-02T12:05:01.000Z"};
  const wire=(patch:Record<string,unknown>={})=>{const b=Buffer.from(JSON.stringify({...receipt,...patch}));return {payloadBase64:b.toString("base64"),signatureBase64:sign(null,b,keys.privateKey).toString("base64")};};
  const consumer={policySha256:policy,preflight:vi.fn().mockResolvedValue(undefined),
   preserveCommitted:vi.fn().mockResolvedValue({independentlyReadBack:true,sourceMappingPersisted:false,providerCalls:0,
    verifiedGroupCount:1,heldGroupCount:0,excludedAmbiguousGroupCount:0,accountedRetainedFlightCount:1})};
  const sqls:string[]=[];
  const pool=(rows=[f.pre()],now="2027-02-02T12:04:00.000Z")=>({connect:vi.fn(async()=>({query:async(sql:string)=>{
   sqls.push(sql);
   if(sql.startsWith("SELECT current_user"))return {rowCount:1,rows:[{role:"phase5_fids_source_prod_20261107",login:"phase5_p5_source_login_20261108",db:"neondb",ro:"on",version:160016,replica:false,now:new Date(now)}]};
   if(sql.startsWith("SELECT r.population_query_id::text AS id"))return {rowCount:1,rows:[{id:f.s.populationQueryId,response_hash:f.s.responseSha256,members:f.s.normalizedMembers}]};
   if(sql.startsWith("SELECT r.population_query_id"))return {rowCount:1,rows:[f.row]};
   if(sql===P6_POST_PARTITION_PRE_SQL)return {rowCount:rows.length,rows};
   return {rowCount:0,rows:[]};},release:()=>sqls.push("released")}))});
  return {f,env,consumer,wire,pool,sqls,prior,keys};
 }
 it("recovers an exact prior committed scope, with no paid capability or private fields in the receipt",async()=>{
  const x=recoveryFixture(),source=x.pool();
  const out=await recoverPhase7CommittedPost({env:x.env,scope:x.f.s,wire:x.wire(),source:source as any,consumer:x.consumer});
  expect(out).toMatchObject({status:"COMMITTED_POST_RECOVERY_INDEPENDENT_READBACK_NO_GET",verifiedGroupCount:1,paidReservations:0,providerCalls:0,phase6PaidGo:false});
  expect(x.consumer.preflight).toHaveBeenCalledOnce();expect(x.consumer.preserveCommitted).toHaveBeenCalledOnce();
  expect(x.sqls.every(s=>!/^INSERT|^UPDATE|^DELETE|^COMMIT/.test(s))).toBe(true);
  expect(JSON.stringify(out)).not.toContain(x.f.p.flightInstanceId);
  expect(JSON.stringify(x.prior)).not.toContain("privateObservedDbClockUtc");
 });
 it("holds a changed private denominator even when the total count is unchanged",async()=>{
  const x=recoveryFixture(),source=x.pool([x.f.pre("T-6h",2)]);
  await expect(recoverPhase7CommittedPost({env:x.env,scope:x.f.s,wire:x.wire(),source:source as any,consumer:x.consumer})).rejects.toThrow("LIVE_AUDIT_DRIFT");
  expect(x.consumer.preserveCommitted).not.toHaveBeenCalled();
 });
 it("refuses a paid credential, forged wire, prior run drift and expired review",async()=>{
  const x=recoveryFixture(),source=x.pool();
  const base={env:x.env,scope:x.f.s,wire:x.wire(),source:source as any,consumer:x.consumer};
  await expect(recoverPhase7CommittedPost({...base,env:{...x.env,AERODATABOX_API_KEY:"synthetic"}})).rejects.toThrow("RECOVERY_ONLY");
  await expect(recoverPhase7CommittedPost({...base,wire:{...x.wire(),signatureBase64:Buffer.alloc(64).toString("base64")}})).rejects.toThrow("SIGNATURE");
  await expect(recoverPhase7CommittedPost({...base,wire:x.wire({committedScopeSha256:"ba".repeat(32)})})).rejects.toThrow("EXACT_SCOPE");
  expect(source.connect).not.toHaveBeenCalled();
  await expect(recoverPhase7CommittedPost({...base,source:x.pool(undefined,"2027-02-02T12:08:00.000Z") as any})).rejects.toThrow("LIVE_AUDIT_DRIFT");
  expect(x.consumer.preserveCommitted).not.toHaveBeenCalled();
 });
 it("discovers original committed scope by the original run reservation, not the restart run ID",async()=>{
  const x=recoveryFixture(),source=x.pool();
  const found=await discoverPhase7CommittedPostScope(source as any,x.f.p);
  expect(found).toEqual(x.f.s);
  const out=await recoverPhase7PostByOriginalReservation({env:x.env,source:source as any,packet:x.f.p,wire:x.wire(),consumer:x.consumer});
  expect(out).toMatchObject({verifiedGroupCount:1,providerCalls:0,paidReservations:0});
  expect(x.sqls.every(s=>!/^INSERT|^UPDATE|^DELETE|^COMMIT/.test(s))).toBe(true);
  const other={...x.f.p,githubRunId:"1234567899"};
  await expect(recoverPhase7PostByOriginalReservation({env:x.env,source:source as any,packet:other,wire:x.wire(),consumer:x.consumer})).rejects.toThrow("EXACT_SCOPE");
  expect(x.consumer.preserveCommitted).toHaveBeenCalledOnce();
 });
 it("issued recovery wire requires fresh actual audit, pinned independent key and issuer-only credentials",async()=>{
  const x=recoveryFixture(),source=x.pool();
  const env={...x.env,P6_PHASE7_POST_RECOVERY_REVIEWER_APPROVED:"1"};
  const priorAudit={sha256:phase7CommittedPostAuditIdentity(x.prior),observedAtUtc:x.f.clock};
  const args={env,source:source as any,scope:x.f.s,priorAudit,signer:x.keys.privateKey};
  const receipt=await issuePhase7CommittedPostRecoveryReceipt(args);
  expect(receipt.status).toBe("INDEPENDENT_COMMITTED_POST_RECOVERY_RECEIPT_ISSUED_NO_GO");
  expect(JSON.stringify(receipt)).not.toContain("payloadBase64");
  const signed=JSON.parse(Buffer.from(receipt.privateWire.payloadBase64,"base64").toString("utf8"));
  expect(signed.originalAvailableAtUtc).toBe(x.f.row.available_at);
  expect(Date.parse(signed.validUntilUtc)).toBeLessThanOrEqual(Date.parse(signed.originalAvailableAtUtc)+600000);
  await expect(recoverPhase7CommittedPost({env:x.env,scope:x.f.s,wire:x.wire({originalAvailableAtUtc:"2027-02-02T12:02:29.000Z"}),source:source as any,consumer:x.consumer})).rejects.toThrow("LIVE_AUDIT_DRIFT");
  const out=await recoverPhase7PostByOriginalReservation({env:x.env,source:source as any,packet:x.f.p,wire:receipt.privateWire,consumer:x.consumer});
  expect(out.verifiedGroupCount).toBe(1);
  await expect(issuePhase7CommittedPostRecoveryReceipt({...args,env:{...env,P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL:"synthetic"}})).rejects.toThrow("INDEPENDENT_RECOVERY_ISSUER_SCOPE");
  await expect(issuePhase7CommittedPostRecoveryReceipt({...args,signer:generateKeyPairSync("ed25519").privateKey})).rejects.toThrow("ISSUER_PIN");
  await expect(issuePhase7CommittedPostRecoveryReceipt({...args,source:x.pool([x.f.pre("T-6h",2)]) as any})).rejects.toThrow("ISSUER_PRIOR_AUDIT_DRIFT");
 });
 it("requires signed exact custody readback before settlement",async()=>{
  const x=recoveryFixture(),wire=x.wire(),now="2027-02-02T12:04:00.000Z";
  const record=vi.fn().mockResolvedValue(wire),read=vi.fn().mockResolvedValue({...wire}),clock=vi.fn().mockResolvedValue(now);
  const args={env:x.env,scope:x.f.s,audit:x.prior,custody:{readOrRecordExactRecoveryReceipt:record,readExactRecoveryReceipt:read},readRestrictedClock:clock};
  const out=await requirePhase7RecoveryReceiptBeforeSettlement(args);
  expect(out).toEqual({status:"EXACT_SIGNED_RECOVERY_RECEIPT_READBACK_BEFORE_SETTLEMENT",providerCalls:0});
  expect(record).toHaveBeenCalledOnce();expect(read).toHaveBeenCalledOnce();expect(clock).toHaveBeenCalledTimes(2);
  expect(record.mock.calls[0][0].priorAudit).toEqual({sha256:phase7CommittedPostAuditIdentity(x.prior),observedAtUtc:x.f.clock});
  await expect(requirePhase7RecoveryReceiptBeforeSettlement({...args,custody:{...args.custody,readExactRecoveryReceipt:async()=>x.wire({validUntilUtc:"2027-02-02T12:05:00.000Z"})}})).rejects.toThrow("RECOVERY_CUSTODY_READBACK_DRIFT");
  await expect(requirePhase7RecoveryReceiptBeforeSettlement({...args,readRestrictedClock:async()=>"2027-02-02T12:08:00.000Z"})).rejects.toThrow("LIVE_AUDIT_DRIFT");
  await expect(requirePhase7RecoveryReceiptBeforeSettlement({...args,custody:{...args.custody,readOrRecordExactRecoveryReceipt:async()=>({})}})).rejects.toThrow("WIRE");
  await expect(requirePhase7RecoveryReceiptBeforeSettlement({...args,custody:{...args.custody,readExactRecoveryReceipt:async()=>{throw Error("readback unavailable")}}})).rejects.toThrow("readback unavailable");
 });
 it("does not substitute a missing or duplicate source original after a process interruption",async()=>{
  const x=recoveryFixture();
  for(const n of [0,2]){
   const source={connect:async()=>({query:async(sql:string)=>{
    if(sql.startsWith("SELECT current_user"))return {rowCount:1,rows:[{role:"phase5_fids_source_prod_20261107",login:"phase5_p5_source_login_20261108",db:"neondb",ro:"on",version:160016,replica:false,now:new Date(x.f.clock)}]};
    if(sql.startsWith("SELECT r.population_query_id::text AS id"))return {rowCount:n,rows:Array.from({length:n},()=>({id:x.f.s.populationQueryId,response_hash:x.f.s.responseSha256,members:1}))};
    return {rowCount:0,rows:[]};},release:()=>{}})};
   await expect(recoverPhase7PostByOriginalReservation({env:x.env,source:source as any,packet:x.f.p,wire:x.wire(),consumer:x.consumer})).rejects.toThrow("DISCOVERY_NO_UNIQUE_LIVE_ORIGINAL_NO_REPLAY");
  }
  expect(x.consumer.preserveCommitted).not.toHaveBeenCalled();
 });

});

import {createP7IndependentPostSettlementIssuer} from "../server/lib/disruption/phase7IndependentPostSettlementIssuer_v39";
import {P7_POST_SCOPED_GROUP_SQL} from "../server/lib/disruption/phase7PostScopedGroup_v39";
import {buildPhase7DerivedReleasePacket} from "../server/lib/disruption/phase7DerivedReleaseWriter_v39";
import {serializePhase7DerivedReleasePacket} from "../server/lib/disruption/phase6DerivedTrainingReleasePacket_v39";
import {verifyPhase7SignedPostSettlement} from "../server/lib/disruption/phase7SignedPostReview_v39";
import type {Phase7DerivedReleaseContract} from "../server/lib/disruption/phase6DerivedTrainingReleaseContract_v39";
import type {Phase7ReviewedTransformationProfile} from "../server/lib/disruption/phase7ReviewedSourceTransformation_v39";
describe("independent committed POST unverified-label settlement issuer",()=>{
 function make(){
  const f=fixture(true),keys=generateKeyPairSync("ed25519"),now="2027-02-02T12:04:00.000Z",code="c".repeat(40),role="phase7_post_scoped_prod20261120";
  const h=(s:string)=>sha("post-fixture:"+s);
  const shared={version:"v01",featureDictionarySha256:h("dictionary"),termsReviewSha256:h("terms"),derivedWorkReviewSha256:h("derived")};
  const contract:Phase7DerivedReleaseContract={schema:"v39.phase6.phase7-derived-release-contract.v2",...shared,sourceToReleaseMappingExpiryHours:24,researchExpiryUtc:"2027-12-31T00:00:00.000Z",cohortBucketCount:31,features:[{name:"context_bin",bucketCount:3,fieldClass:"approved_derived",transformEvidenceSha256:h("feature"),nonReconstructable:true}],labels:[{name:"delay_bin",bucketCount:4,fieldClass:"approved_derived",transformEvidenceSha256:h("label"),nonReconstructable:true}],allowedHorizons:["T-24h","T-6h","T-90m"]};
  const profile:Phase7ReviewedTransformationProfile={schema:"v39.phase7.reviewed-source-transformation.v1",...shared,mappingExpiryHours:24,approvedForUse:true,fields:[{sourceField:"origin_metar_wind_kt",outputField:"context_bin",role:"feature",kind:"numeric_threshold_bucket",bucketCount:3,boundaries:[5,15],categories:null,transformEvidenceSha256:h("feature"),nonReconstructable:true},{sourceField:"gate_out_delay_minutes",outputField:"delay_bin",role:"label",kind:"numeric_threshold_bucket",bucketCount:4,boundaries:[0,15,60],categories:null,transformEvidenceSha256:h("label"),nonReconstructable:true}]};
  const native=Buffer.from(JSON.stringify({schema:"v39.phase6.native-post-physical-window-policy.v1",independentPostRequestGeometryApproved:true,manifestSha256:f.p.manifestSha256,rightsSha256:f.p.reviewedSourceRightsSha256,reviewedCodeSha:code,followupAfterPartitionEndSeconds:3600,dispatchWindowSeconds:1200,expectedApiUnitsPerGet:2,reviewedFrameSha256:f.p.reviewedFrameSha256,reviewedProviderContractSha256:f.p.reviewedProviderContractSha256,reviewedProviderPriceSha256:f.p.reviewedProviderPriceSha256,reviewedCategoryBudgetSha256:f.p.reviewedCategoryBudgetSha256}));
  const policy=Buffer.from(JSON.stringify({schema:"v39.phase7.independent-post-settlement-policy.v1",manifestSha256:f.p.manifestSha256,rightsSha256:f.p.reviewedSourceRightsSha256,prePolicySha256:h("pre-policy"),contractSha256:hashPhase7DurableCandidate(contract),profileSha256:hashPhase7DurableCandidate(profile),nativePostPolicySha256:sha(native),validFromUtc:"2027-02-01T00:00:00.000Z",validUntilUtc:"2027-02-04T00:00:00.000Z",unverifiedLabelDisposition:"CENSOR_AFTER_REVIEWED_POST_OBSERVATION",independentBoundedSettlementApproved:true,sourceParityReviewSha256:h("parity"),reconstructionReviewSha256:h("reconstruction"),fieldReviewSha256:h("field"),associationReviewSha256:h("association"),continuousTargetReviewSha256:h("continuous"),minTargetMinutes:-120,maxTargetMinutes:2880}));
  const env={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,V39_P5_POST_APPROVED_CODE_SHA:code,ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",P6_PHASE7_POST_RECOVERY_REVIEWER_APPROVED:"1",P6_PHASE7_POST_STORAGE_APPROVED:"1",V39_P5_MANIFEST_SHA256:f.p.manifestSha256,V39_P5_RIGHTS_SHA256:f.p.reviewedSourceRightsSha256,P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256:h("pre-policy"),P6_PHASE7_POST_PRESERVATION_POLICY_BASE64:policy.toString("base64"),P6_PHASE7_POST_PRESERVATION_POLICY_SHA256:sha(policy),P6_PHASE7_POST_CONTRACT_SHA256:hashPhase7DurableCandidate(contract),P6_PHASE7_POST_PROFILE_SHA256:hashPhase7DurableCandidate(profile),P6_NATIVE_POST_POLICY_BASE64:native.toString("base64"),P6_NATIVE_POST_POLICY_SHA256:sha(native),P6_PHASE7_POST_OUTCOME_REVIEWER_PUBLIC_KEY_BASE64:Buffer.from(keys.publicKey.export({type:"spki",format:"pem"})).toString("base64"),P6_PHASE7_POST_OUTCOME_REVIEWER_FINGERPRINT_SHA256:sha(keys.publicKey.export({type:"spki",format:"der"}))};
  const prior=auditP6ActualPostOutcomeObservability(f.s,f.row,[f.pre()],f.clock),anchor=prior.privatePreservationAnchors[0],packet=buildPhase7DerivedReleasePacket(contract,[{horizon:"T-6h",cohortBucket:0,split:"train",featureBuckets:{context_bin:1},labelBuckets:{delay_bin:null},missingness:{context_bin:false,delay_bin:true},qualityFlags:0,censoring:"not_due"}]),bytes=Buffer.from(serializePhase7DerivedReleasePacket(contract,packet));
  const fragment={groupId:"12345678-1234-4123-8123-123456789abc",contractSha256:hashPhase7DurableCandidate(contract),profileSha256:hashPhase7DurableCandidate(profile),packetSha256:sha(bytes),packet};
  const statements:string[]=[];
  const source={connect:async()=>({query:async(sql:string)=>{
   statements.push(sql);if(sql.startsWith("SELECT current_user"))return {rowCount:1,rows:[{role:"phase5_fids_source_prod_20261107",login:"phase5_p5_source_login_20261108",db:"neondb",ro:"on",version:160016,replica:false,now:new Date(now)}]};
   if(sql.startsWith("SELECT r.population_query_id"))return {rowCount:1,rows:[f.row]};
   if(sql===P6_POST_PARTITION_PRE_SQL)return {rowCount:1,rows:[f.pre()]};return {rows:[]};},release:()=>{}})};
  const scopedReader={connect:async()=>({query:async(sql:string)=>{
   statements.push(sql);if(sql.startsWith("SELECT current_user"))return {rows:[{actor:role,login:role,db:"neondb",ro:"on",version:160016,replica:false,at:new Date(now),rolsuper:false,rolcreaterole:false,rolcreatedb:false,rolbypassrls:false,rolreplication:false,member:false,can_use:true,can_scope:true,can_create:false,can_direct:false}]};
   if(sql===P7_POST_SCOPED_GROUP_SQL)return {rowCount:1,rows:[{group_id:fragment.groupId,contract_sha256:fragment.contractSha256,profile_sha256:fragment.profileSha256,packet_sha256:fragment.packetSha256,packet_bytes:bytes}]};
   if(sql.startsWith("SELECT clock_timestamp"))return {rows:[{at:new Date(now)}]};return {rows:[]};},release:()=>{}})};
  const receipt=Buffer.from(JSON.stringify({schema:"v39.phase7.committed-post-recovery-receipt.v2",policySha256:env.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256,originalAvailableAtUtc:f.row.available_at,committedScopeSha256:hashPhase7DurableCandidate(f.s),originalAuditSha256:phase7CommittedPostAuditIdentity(prior),originalAuditAtUtc:f.clock,reviewedAtUtc:"2027-02-02T12:03:01.000Z",validUntilUtc:"2027-02-02T12:05:01.000Z"}));
  const wire={payloadBase64:receipt.toString("base64"),signatureBase64:sign(null,receipt,keys.privateKey).toString("base64")};
  const deps={env,signer:keys.privateKey,source:source as any,scopedReader:scopedReader as any,scopedReaderRole:role,contract,profile,readExactRecoveryReceipt:async()=>wire};
  return {f,env,anchor,fragment,now,statements,contract,profile,deps};
 }
 it("rereads the real-shaped committed original and exact group before issuing a censored-only wire",async()=>{
  const x=make(),r=createP7IndependentPostSettlementIssuer(x.deps);
  await r.preflight();expect(await r.prepare(x.f.s)).toEqual({providerCalls:0,databaseWrites:0,eligibleGroups:1});
  const input={committed:x.f.s,anchor:x.anchor,fragments:[x.fragment],observedDbClockUtc:x.now};
  const signed=await r.issue(input);
  expect(signed.numericalGateOutLabels).toBe(0);expect(JSON.stringify(signed)).not.toContain("payloadBase64");
  const v=verifyPhase7SignedPostSettlement({env:x.env,wire:signed.privateWire,anchor:x.anchor,committed:x.f.s,fragments:[x.fragment],contract:x.contract,profile:x.profile,observedDbClockUtc:x.now});
  expect(v.bundle.continuous.rows[0]).toMatchObject({value:null,censoring:"censored"});
  expect(v.bundle.packet.rows.find(z=>z.horizon==="T-6h")?.featureBuckets).toEqual({context_bin:1});
  expect(x.statements.some(s=>s===P6_POST_PARTITION_PRE_SQL)).toBe(true);expect(x.statements.some(s=>s===P7_POST_SCOPED_GROUP_SQL)).toBe(true);
  expect(x.statements.every(s=>!/^INSERT|^UPDATE|^DELETE|^COMMIT/.test(s))).toBe(true);
  await expect(r.issue(input)).rejects.toThrow("GROUP_ALREADY_ISSUED_NO_REPLAY");
 });
 it("rejects policy drift, paid credentials, caller anchor drift and forged recovery receipt",async()=>{
  const x=make();
  expect(()=>createP7IndependentPostSettlementIssuer({...x.deps,env:{...x.env,AERODATABOX_API_KEY:"fixture"}})).toThrow("PROTECTED_NO_PROVIDER_SCOPE");
  expect(()=>createP7IndependentPostSettlementIssuer({...x.deps,env:{...x.env,P6_PHASE7_POST_PRESERVATION_POLICY_SHA256:sha("wrong")}})).toThrow("REVIEW_BYTES");
  const bad=createP7IndependentPostSettlementIssuer({...x.deps,readExactRecoveryReceipt:async()=>({})});await expect(bad.prepare(x.f.s)).rejects.toThrow("WIRE");
  const r=createP7IndependentPostSettlementIssuer(x.deps);await r.prepare(x.f.s);
  const input={committed:x.f.s,anchor:{...x.anchor,snapshotId:"2"},fragments:[x.fragment],observedDbClockUtc:x.now};
  await expect(r.issue(input)).rejects.toThrow("EXACT_LIVE_ANCHOR");
 });
});
