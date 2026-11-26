import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {addCanonicalFidsEnvelopeHashV39} from "../server/lib/disruption/fidsEnvelopeCanonical_v39";
import {prepareP5ConditionalFidsServiceRecoveryV39 as prepare} from "../server/lib/disruption/phase5ConditionalFidsServiceRecovery_v39";
const stamp=(h:string)=>"2035-11-25T"+h+":00.000Z",sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const scope={protocolSha256:"a".repeat(64),ownerProspectiveSeparateTierApproved:true as const,runDayIndex:2,manifestSha256:"b".repeat(64),sourceResponseSha256:"c".repeat(64),sourceQueryId:"c23e4567-e89b-42d3-a456-426614174013",airportIcao:"WSSS",frozenStudyStartUtc:stamp("00:00"),policyEffectiveUtc:stamp("04:00"),plannedSourceUtc:stamp("05:00"),sourceAvailableUtc:stamp("05:02"),sourceExpiresUtc:stamp("23:00"),dbObservedUtc:stamp("05:03"),serviceWindowStartUtc:stamp("11:00"),serviceWindowEndUtc:stamp("15:00"),horizon:"T-6h" as const,maximumStalenessSeconds:3600,minimumReviewLeadSeconds:900};
const flight=()=>({number:"SQ 0078",codeshareStatus:"IsOperator",isCargo:false,departure:{scheduledTime:{utc:stamp("12:00")}},arrival:{airport:{icao:"YSSY"}}});
function original(departures:any[]){
 const bytes=Buffer.from(JSON.stringify({departures,arrivals:[]}));
 return addCanonicalFidsEnvelopeHashV39({fidsRequestContract:{schema:"v39.fids-request-frame.application-intent.v1",direction:"Departure",airportIcao:"WSSS",endpointKind:"airport_local_fids",withLeg:true,withCargo:false,withPrivate:false,withCodeshared:true,withCancelled:true,withLocation:false},payloadRepresentation:"RECONSTRUCTED_RESPONSE_JSON_NOT_VERBATIM_HTTP_BYTES",originalHttpWireBytesPreserved:false,originalDecodedEntityBodyPreserved:true,originalDecodedEntityBodyEvidence:{schema:"v39.fids-fetch-decoded-source-body.v1",representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",bodySha256:sha(bytes),bodyLengthBytes:bytes.length,bodyBase64:bytes.toString("base64")},departures,arrivals:[],fetchedAtUtc:stamp("05:01")});
}
describe("prospective conditional service recovery, separate from physical native PRE",()=>{
 it("recovers real-contract-shaped id-less operator without fabricating origin, scope or actual event",()=>{
  const r=prepare(original([flight()]),scope);
  expect(r.counts.conditionalCandidates).toBe(1);
  expect(r.privateCandidates[0]).toMatchObject({originEvidence:"REQUESTED_DEPARTURE_CONTEXT_ONLY",commercialScope:"QUERY_FILTERED_SCOPE_UNKNOWN",providerNativeIdPresent:false});
  expect(r.trainingOrPrePublicationAuthorized).toBe(false);
  expect(r.providerNativeOperatingLegCertified).toBe(false);
  expect(JSON.stringify(r)).not.toMatch(/SQ 0078|YSSY|privateCandidates|leg:p5conditional/);
 });
 it("retains only positive operators in the real Phase5 codeshare-inclusive request frame",()=>{
  const r=prepare(original([flight(),{...flight(),codeshareStatus:"IsCodeshared"},{...flight(),codeshareStatus:2}]),scope);
  expect(r.counts.conditionalCandidates).toBe(1);
  expect(r.counts.notPositiveOperator).toBe(2);
  expect(r.trainingOrPrePublicationAuthorized).toBe(false);
 });
 it("does not substitute a different request policy",()=>{
  const x=original([flight()]) as any;
  const {canonicalEnvelopeSha256,canonicalEnvelopeHashSchema,...bare}=x;
  const wrong=addCanonicalFidsEnvelopeHashV39({...bare,fidsRequestContract:{...bare.fidsRequestContract,withCodeshared:false}});
  expect(()=>prepare(wrong,scope)).toThrow(/EXACT_FILTERED_REQUEST/);
 });
 it("rejects marketing, unknown, known cargo and contrary origin",()=>{
  const r=prepare(original([{...flight(),codeshareStatus:"IsCodeshared"},{...flight(),codeshareStatus:"Unknown"},{...flight(),isCargo:true},{...flight(),departure:{...flight().departure,airport:{icao:"OMAA"}}}]),scope);
  expect(r.counts).toMatchObject({conditionalCandidates:0,notPositiveOperator:2,knownExcluded:1,contraryOrigin:1});
 });
 it("does not choose among duplicate service observations, even when one is late",()=>{
  const r=prepare(original([flight(),{...flight(),departure:{scheduledTime:{utc:stamp("11:10")}}}]),scope);
  expect(r.counts.ambiguousComposite).toBe(2);expect(r.privateCandidates).toHaveLength(0);
 });
 it("does not select a positive operator when a second same-service appearance is outside the window or has no schedule",()=>{
  for(const departure of [{scheduledTime:{utc:stamp("16:00")}},{scheduledTime:{}}]){
   const r=prepare(original([flight(),{...flight(),departure}]),scope);
   expect(r.counts.ambiguousComposite).toBe(1);
   expect(r.privateCandidates).toHaveLength(0);
  }
 });
 it("separates identical daily services by signed cohort day, not by revised schedule",()=>{
  const first=prepare(original([flight()]),scope).privateCandidates[0];
  const revised=prepare(original([{...flight(),departure:{scheduledTime:{utc:stamp("12:15")}}}]),{...scope,maximumStalenessSeconds:7200}).privateCandidates[0];
  const other=prepare(original([flight()]),{...scope,runDayIndex:3}).privateCandidates[0];
  expect(first.serviceKey).toBe(revised.serviceKey);
  expect(first.serviceKey).not.toBe(other.serviceKey);
  expect(first.operatorFlightNumber).toBe("SQ78");
  expect(()=>prepare(original([flight()]),{...scope,runDayIndex:0})).toThrow(/SCOPE/);
 });
 it("rejects duplicate provider IDs even on otherwise distinct services",()=>{
  const r=prepare(original([{...flight(),id:"same"},{...flight(),number:"SQ 0080",id:"same"}]),scope);
  expect(r.counts.ambiguousProviderId).toBe(2);
 });
 it("rejects late, stale, expired and retrospective review",()=>{
  expect(prepare(original([flight()]),{...scope,dbObservedUtc:stamp("05:50")}).counts.lateOrStale).toBe(1);
  expect(()=>prepare(original([flight()]),{...scope,policyEffectiveUtc:stamp("05:01")})).toThrow(/RETROSPECTIVE/);
  expect(()=>prepare(original([flight()]),{...scope,sourceExpiresUtc:stamp("05:02")})).toThrow(/CLOCK/);
 });
 it("uses original availability rather than a later binding to measure staleness",()=>{
  const bound={...scope,sourceAvailableUtc:stamp("05:10"),dbObservedUtc:stamp("05:11"),maximumStalenessSeconds:55*60};
  expect(prepare(original([flight()]),bound).counts.conditionalCandidates).toBe(1);
  const real={...bound,originalSourceAvailableUtc:stamp("05:02")};
  expect(prepare(original([flight()]),real).counts.lateOrStale).toBe(1);
  expect(()=>prepare(original([flight()]),{...real,originalSourceAvailableUtc:stamp("05:12")})).toThrow(/ORIGINAL_AVAILABLE_CLOCK/);
 });
 it("rejects mutated body or separate approval absent",()=>{
  const x=original([flight()]);(x as any).departures[0].number="CHANGED";
  expect(()=>prepare(x,scope)).toThrow(/INTEGRITY/);
  expect(()=>prepare(original([flight()]),{...scope,ownerProspectiveSeparateTierApproved:false as any})).toThrow(/SCOPE/);
 });
});

it("matches conditional normalization of case/whitespace, marketing context and rejects malformed nonempty IDs",()=>{
 const mark=(rows:any[])=>{
  const x=original(rows) as any,{canonicalEnvelopeSha256,canonicalEnvelopeHashSchema,...bare}=x;
  return addCanonicalFidsEnvelopeHashV39({...bare,fidsRequestContract:{...bare.fidsRequestContract,phase5ConditionalService:{protocolSha256:scope.protocolSha256,cohortStartUtc:scope.frozenStudyStartUtc}}});
 };
 const row={...flight(),number:"sq 0078",departure:{airport:{icao:" wsss "},scheduledTime:{utc:stamp("12:00")}},arrival:{airport:{icao:" yssy "}}};
 const x=prepare(mark([row,{...row,codeshareStatus:"IsCodeshared"}]),scope);
 expect(x.privateCandidates[0]).toMatchObject({stage14ConditionalFlightInstanceId:expect.stringMatching(/^leg:g5a:/),originEvidence:"EXPLICIT_REPORTED_ORIGIN",operatorFlightNumber:"SQ78"});
 expect(prepare(mark([row,{...row,departure:{airport:{icao:"WSSS"},scheduledTime:{utc:stamp("16:00")}}}]),scope).privateCandidates).toHaveLength(0);
 expect(prepare(mark([{...row,id:123}]),scope).privateCandidates[0].stage14ConditionalFlightInstanceId).toBeNull();
 expect(prepare(mark([{...row,departure:{airport:{icao:" "},scheduledTime:{utc:stamp("12:00")}}}]),scope).counts.contraryOrigin).toBe(1);
});
