import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
 compileP5AlreadyDurableNoaaTafAsOfV39,
 type P5ENoaaTafAlreadyDurableReviewInput
} from "../server/lib/disruption/phase5AmendmentEExistingNoaaTafReceipt_v39";
import {draftP5ECombinedExistingSourcesPacket}
 from "../server/lib/disruption/phase5AmendmentENoaaHistoricalReceiptCompiler_v39";
import {selectP5EReviewedSupplementalFeatures,
 type P5EReviewedSupplementalBundle}
 from "../server/lib/disruption/phase5AmendmentESignedSupplementalFeatures_v39";
const sha=(v:string)=>createHash("sha256").update(v,"utf8").digest("hex");
const hex=(c:string)=>c.repeat(64);
const fid="leg:ci:real-taf-original:001";
const qid="c23e4567-e89b-42d3-a456-426614174013";
const native="2035-11-25T12:00:00.000Z";
const issue="2035-11-25T06:00:00.000Z";
const fetched="2035-11-25T05:10:00.000Z";
const durable="2035-11-25T05:15:00.000Z";
const unix=(s:string)=>Math.floor(new Date(s).getTime()/1000);
const from=unix("2035-11-25T00:00:00.000Z"),
 to=unix("2035-11-26T00:00:00.000Z");
interface TafTestRow{
 icaoId:string;issueTime:string;validTimeFrom:number;validTimeTo:number;
 fcsts:Array<{timeFrom:number;timeTo:number;fcstChange:string|null;
  visib:string|number;clouds:Array<{cover:string;base:number}>}>;
}
function tafRows():TafTestRow[]{
 return [
  {icaoId:"WSSS",issueTime:"2035-11-25 04:00:00.000Z",
   validTimeFrom:from,validTimeTo:to,
   fcsts:[{timeFrom:from,timeTo:to,fcstChange:null,
    visib:2,clouds:[{cover:"BKN",base:800}]}]},
  {icaoId:"YSSY",issueTime:"2035-11-25 04:20:00.000Z",
   validTimeFrom:from,validTimeTo:to,
   fcsts:[{timeFrom:from,timeTo:to,fcstChange:"FM",
    visib:"6+",clouds:[{cover:"SCT",base:6000}]}]}
 ];
}
function input(rows=tafRows()):P5ENoaaTafAlreadyDurableReviewInput{
 const sourceJsonText=JSON.stringify(rows);
 return {
  flightInstanceId:fid,
  originAirportIcao:"WSSS",destinationAirportIcao:"YSSY",
  originalSelectedNativeDepartureUtc:native,
  actualPredictionIssuedAtUtc:issue,
  sourceJsonText,fetchedAtUtc:fetched,durableArtifactReadAtUtc:durable,
  independentlyReviewedResponseBytesSha256:sha(sourceJsonText),
  independentlyReviewedPurposeSha256:hex("c")
 };
}
function read(rows=tafRows(),change:Partial<P5ENoaaTafAlreadyDurableReviewInput>={}){
 const base=input(rows);
 const next={...base,...change};
 if(change.sourceJsonText!==undefined&&
     change.independentlyReviewedResponseBytesSha256===undefined)
  next.independentlyReviewedResponseBytesSha256=sha(next.sourceJsonText);
 return compileP5AlreadyDurableNoaaTafAsOfV39(next);
}
function fids():P5EReviewedSupplementalBundle{
 const observations=[{
  flightInstanceId:fid,field:"operating_carrier" as const,
  value:"SIA",source:"AERODATABOX_FIDS" as const,
  sourceRecordId:hex("a"),
  observedAtUtc:"2035-11-25T05:01:00.000Z",
  availableAtUtc:"2035-11-25T05:02:00.000Z",
  rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW" as const
 }];
 return {
  schema:"v39.phase5.e-signed-source-supplement.v1",
  flightInstanceId:fid,populationQueryId:qid,
  originalResponseSha256:hex("a"),
  externalSourceAndContentsReviewReceiptSha256:hex("b"),
  fields:["operating_carrier"],
  observations,
  observationsSha256:sha(JSON.stringify(observations))
 };
}
describe("ONE Amendment E: original NOAA TAF JSON forecast as-of actual PRE issue",()=>{
 it("extracts source-verified native-T IFR origin and VFR destination with clocks",()=>{
  const r=read();
  expect(r.observations.map(x=>[x.field,x.value])).toEqual([
   ["origin_taf_flight_category","IFR"],
   ["destination_taf_flight_category","VFR"]
  ]);
  expect(r.missingFields).toEqual([]);
  expect(r.observations.every(x=>x.source==="NOAA_TAF"&&
   x.availableAtUtc===durable&&
   x.validFromUtc===new Date(from*1000).toISOString()&&
   x.validToUtc===new Date(to*1000).toISOString())).toBe(true);
  expect(r.providerCalls).toBe(0);
  expect(r.sourceRightsCertifiedHere).toBe(false);
  expect(r.durableArtifactAuthenticityCertifiedHere).toBe(false);
 });
 it("keeps missing if no actual durable artifact by prediction issue",()=>{
  expect(read(tafRows(),{durableArtifactReadAtUtc:null}).missingFields)
   .toHaveLength(2);
  const late=read(tafRows(),{
   durableArtifactReadAtUtc:"2035-11-25T06:10:00.000Z"
  });
  expect(late.observations).toHaveLength(0);
  expect(late.missingReasons.origin_taf_flight_category)
   .toBe("NOT_DURABLY_AVAILABLE_AT_PREDICTION_ISSUE");
 });
 it("rejects altered saved source bytes, not just metadata assertions",()=>{
  const x=input();
  x.sourceJsonText=x.sourceJsonText.replace("BKN","OVC");
  expect(()=>compileP5AlreadyDurableNoaaTafAsOfV39(x))
   .toThrow("PRESERVED_TAF_SOURCE_BYTES_SHA_MISMATCH");
 });
 it("rejects impossible report-issued-after-fetch and reversed durable clocks",()=>{
  const rows=tafRows();
  rows[0].issueTime="2035-11-25 06:10:00.000Z";
  expect(()=>read(rows)).toThrow("TAF_VALIDITY_OR_ISSUE_AFTER_FETCH");
  expect(()=>read(tafRows(),{durableArtifactReadAtUtc:
   "2035-11-25T05:00:00.000Z"}))
   .toThrow("NONPROSPECTIVE_OR_INVALID_DURABLE_SOURCE_CLOCK");
 });
 it("refuses to choose prevailing forecast when TEMPO overlaps native T",()=>{
  const rows=tafRows();
  rows[0].fcsts.push({timeFrom:from,timeTo:to,
   fcstChange:"TEMPO",visib:2,clouds:[{cover:"BKN",base:800}]});
  const r=read(rows);
  expect(r.missingReasons.origin_taf_flight_category)
   .toBe("AMBIGUOUS_TEMPO_OR_OVERLAPPING_TAF");
  expect(r.missingFields).toContain("origin_taf_flight_category");
  expect(r.observations.find(x=>x.field==="destination_taf_flight_category")?.value)
   .toBe("VFR");
 });
 it("rejects ambiguous two TAFs with same valid issue time",()=>{
  const rows=tafRows();
  rows.push({...rows[0]});
  const r=read(rows);
  expect(r.missingReasons.origin_taf_flight_category)
   .toBe("AMBIGUOUS_SAME_ISSUE_TAF");
 });
 it("does not hallucinate ceiling or visibility from missing data",()=>{
  const rows=tafRows();
  rows[1].fcsts[0].clouds=[];
  const r=read(rows);
  expect(r.missingReasons.destination_taf_flight_category)
   .toBe("INSUFFICIENT_FORECAST_CEILING_OR_VISIBILITY");
  const unknown=tafRows();
  unknown[0].fcsts[0].visib="UNKNOWN" as unknown as number;
  expect(read(unknown).missingFields).toContain("origin_taf_flight_category");
 });
 it("requires forecast validity at selected original T and not just at issue",()=>{
  const rows=tafRows();rows[0].fcsts[0].timeTo=unix("2035-11-25T11:00:00.000Z");
  const r=read(rows);
  expect(r.missingReasons.origin_taf_flight_category)
   .toBe("AMBIGUOUS_TEMPO_OR_OVERLAPPING_TAF");
  const expired=tafRows();
  expired[0].validTimeTo=unix("2035-11-25T11:00:00.000Z");
  expect(read(expired).missingReasons.origin_taf_flight_category)
   .toBe("NO_ISSUED_TAF_VALID_FOR_NATIVE_T");
 });
 it("supports genuine same-flight 12-field signed packet draft and original Stage14 as-of",()=>{
  const weather=read();
  const merged=draftP5ECombinedExistingSourcesPacket({
   existingV0079FidsBundle:fids(),weather:[],
   historical:[],taf:weather.observations,
   externallyReviewedWholePacketUseSha256:hex("d")
  });
  expect(merged.tafFeaturesAvailableFromThisAdapter).toBe(true);
  expect(merged.bundle.fields).toHaveLength(12);
  expect(merged.bundle.observations).toHaveLength(3);
  const selected=selectP5EReviewedSupplementalFeatures({
   flightInstanceId:fid,horizon:"T-6h",selectedNativeTUtc:native,
   cutoffUtc:issue,issuedAtUtc:issue,
   sourceOriginalSha256:hex("a"),sourcePopulationQueryId:qid,
   memberAvailableAtUtc:"2035-11-25T05:02:00.000Z",
   originIcao:"WSSS",destinationIcao:"YSSY",bundle:merged.bundle
  });
  expect(selected.features.find(x=>x.featureName==="origin_taf_flight_category")?.value)
   .toBe("IFR");
  expect(selected.features.find(x=>x.featureName==="destination_taf_flight_category")?.value)
   .toBe("VFR");
  expect(merged.phase6PaidGo).toBe(false);
 });
 it("source/airport class cannot be substituted across flights",()=>{
  const x=read();
  x.observations[1].airportIcao="OMAA";
  const merged=draftP5ECombinedExistingSourcesPacket({
   existingV0079FidsBundle:fids(),weather:[],historical:[],
   taf:x.observations,externallyReviewedWholePacketUseSha256:hex("d")
  });
  expect(()=>selectP5EReviewedSupplementalFeatures({
   flightInstanceId:fid,horizon:"T-6h",selectedNativeTUtc:native,
   cutoffUtc:issue,issuedAtUtc:issue,
   sourceOriginalSha256:hex("a"),sourcePopulationQueryId:qid,
   memberAvailableAtUtc:"2035-11-25T05:02:00.000Z",
   originIcao:"WSSS",destinationIcao:"YSSY",bundle:merged.bundle
  })).toThrow("WEATHER_AIRPORT_OR_SOURCE_MISMATCH");
 });
});
