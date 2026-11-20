import {describe,it,expect} from "vitest";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {verifyP7IndependentPublicNoaaArtifact,mergeP7VerifiedNoaaIntoBoundPreBundle,enrichP7NativeFeatureReviewWithNoaa,verifyP7NoaaExactPreLaneEvidence,type P7PublicNoaaArtifactReceipt} from "../server/lib/disruption/phase7IndependentNoaaReceipt_v39";
const sha=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const now="2026-11-25T00:00:00.000Z",t="2026-11-25T06:15:00.000Z",scope={flightInstanceId:"leg:fixture:001",originIcao:"WSSS",destinationIcao:"YSSY",selectedNativeTUtc:t,ownCutoffUtc:"2026-11-25T00:15:00.000Z",observedDbClockUtc:now};
const key=generateKeyPairSync("ed25519"),env={P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64:Buffer.from(key.publicKey.export({format:"pem",type:"spki"})).toString("base64"),P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256:sha(key.publicKey.export({format:"der",type:"spki"})),P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256:sha("synthetic policy"),V39_P5_MANIFEST_SHA256:sha("synthetic manifest"),V39_P5_RIGHTS_SHA256:sha("synthetic rights")};
const fixture=(kind:"METAR"|"TAF",rows:unknown[],change:Partial<P7PublicNoaaArtifactReceipt>={})=>{
 const sourceJsonText=JSON.stringify(rows),r:P7PublicNoaaArtifactReceipt={schema:"v39.phase7.independent-public-noaa-artifact-receipt.v1",kind,manifestSha256:env.V39_P5_MANIFEST_SHA256,rightsSha256:env.V39_P5_RIGHTS_SHA256,policySha256:env.P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256,sourcePurposeSha256:sha("synthetic NOAA review"),sourceBodySha256:sha(sourceJsonText),artifactArchiveSha256:sha("synthetic artifact"),githubRunId:"1000000",githubArtifactId:"2000000",requestedAirports:["WSSS","YSSY"],fetchedAtUtc:"2026-11-24T23:30:00.000Z",artifactCreatedAtUtc:"2026-11-24T23:31:00.000Z",durableReadAtUtc:"2026-11-24T23:32:00.000Z",reviewedAtUtc:"2026-11-24T23:33:00.000Z",validUntilUtc:"2026-11-25T06:00:00.000Z",...change};
 const b=Buffer.from(JSON.stringify(r));return {receiptBase64:b.toString("base64"),signatureBase64:sign(null,b,key.privateKey).toString("base64"),sourceJsonText};
};
const sec=(s:string)=>Date.parse(s)/1000;
const metar={icaoId:"WSSS",obsTime:sec("2026-11-24T23:00:00.000Z"),reportTime:"2026-11-24 23:05:00.000Z",visib:5,wspd:10};
const taf={icaoId:"YSSY",issueTime:"2026-11-24 23:00:00.000Z",validTimeFrom:sec("2026-11-25T00:00:00.000Z"),validTimeTo:sec("2026-11-25T12:00:00.000Z"),fcsts:[{timeFrom:sec("2026-11-25T00:00:00.000Z"),timeTo:sec("2026-11-25T12:00:00.000Z"),fcstChange:null,visib:6,clouds:[{cover:"SCT",base:4000}]}]};
const bundle=()=>{const observations=[{flightInstanceId:scope.flightInstanceId,field:"operating_carrier" as const,value:"SIA",source:"AERODATABOX_FIDS" as const,sourceRecordId:sha("original"),observedAtUtc:"2026-11-24T23:00:00.000Z",availableAtUtc:"2026-11-24T23:10:00.000Z",rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW" as const}];return {schema:"v39.phase5.e-signed-source-supplement.v1" as const,flightInstanceId:scope.flightInstanceId,populationQueryId:"synthetic-query",originalResponseSha256:sha("original"),observationsSha256:sha(JSON.stringify(observations)),externalSourceAndContentsReviewReceiptSha256:sha("whole packet"),fields:["operating_carrier" as const],observations}};
describe("independent public NOAA artifact to actual source-bound PRE supplement",()=>{
 it("uses exact signed source bytes and real durable clock, preserves FIDS field, explicit missing TAF origin",()=>{
  const a=verifyP7IndependentPublicNoaaArtifact(env,fixture("METAR",[metar]),now),b=verifyP7IndependentPublicNoaaArtifact(env,fixture("TAF",[taf]),now);
  const x=mergeP7VerifiedNoaaIntoBoundPreBundle(bundle(),scope,[a,b]);
  expect(x).toMatchObject({weatherFieldsPresent:3,weatherFieldsMissing:1,providerCalls:0,databaseWrites:0});
  expect(x.privateBundle.observations.map(v=>[v.field,v.value])).toEqual([["operating_carrier","SIA"],["origin_metar_visibility_m",8047],["origin_metar_wind_kt",10],["destination_taf_flight_category","VFR"]]);
  expect(JSON.stringify(x)).not.toContain("leg:fixture");
  expect(JSON.stringify(a)).not.toContain("WSSS");
 });
 it("refuses altered bytes, mismatched study, late readback, wrong station and expired artifact",()=>{
  const verifyOne=(wire:any)=>verifyP7IndependentPublicNoaaArtifact(env,wire,now);
  const a=fixture("METAR",[metar]);
  expect(()=>verifyOne({...a,sourceJsonText:"[]"})).toThrow("EXACT_ARTIFACT_SCOPE");
  expect(()=>verifyOne(fixture("METAR",[metar],{manifestSha256:sha("other")}))).toThrow("EXACT_ARTIFACT_SCOPE");
  expect(()=>verifyOne(fixture("METAR",[metar],{durableReadAtUtc:"2026-11-25T00:01:00.000Z"}))).toThrow("DURABLE_AS_OF_CLOCK");
  expect(()=>verifyOne(fixture("METAR",[{...metar,icaoId:"KJFK"}]))).toThrow("PUBLIC_STATION_SCOPE");
  expect(()=>verifyOne(fixture("METAR",[metar],{validUntilUtc:now}))).toThrow("DURABLE_AS_OF_CLOCK");
 });
 it("treats equal-observation conflicting weather sources as missing and never crosses cutoff or flight identity",()=>{
  const a=verifyP7IndependentPublicNoaaArtifact(env,fixture("METAR",[metar]),now),b=verifyP7IndependentPublicNoaaArtifact(env,fixture("METAR",[{...metar,wspd:15}]),now);
  const x=mergeP7VerifiedNoaaIntoBoundPreBundle(bundle(),scope,[a,b]);expect(x).toMatchObject({weatherFieldsPresent:0,ambiguousFields:2,weatherFieldsMissing:4});
  expect(()=>mergeP7VerifiedNoaaIntoBoundPreBundle(bundle(),{...scope,ownCutoffUtc:now},[a])).toThrow("BOUND_PRE_SCOPE");
  expect(()=>mergeP7VerifiedNoaaIntoBoundPreBundle(bundle(),{...scope,flightInstanceId:"leg:other"},[a])).toThrow("BOUND_PRE_SCOPE");
 });
});

it("native publisher handoff requests only public stations, keeps private FIDS bytes and cohort denominator",async()=>{
 const b=bundle(),s={flightInstanceId:scope.flightInstanceId,expectedSourcePopulationQueryId:b.populationQueryId,expectedSourceResponseSha256:b.originalResponseSha256,airportIcao:scope.originIcao,selectedTNativeUtc:t,ownPreCutoffUtc:scope.ownCutoffUtc,sourceMemberAvailableAtUtc:"2026-11-24T23:10:00.000Z"};
 const h=Object.defineProperty({status:"UNSIGNED_PRE_REVIEW_HANDOFF_NOT_AUTHORIZED",runDayIndex:1,horizon:"T-6h"},"privateReviewEntries",{value:[{source:s}]});
 const d=Object.defineProperty({flightInstanceId:scope.flightInstanceId,status:"MATCHED_NATIVE_ORIGINAL",compiled:{bundle:b,sourceBodyAndCanonicalEnvelopeIntegrityVerified:true,sameOriginalNativeOperatingLegBoundOnly:true}},"privateWeatherJoinScope",{value:{originIcao:scope.originIcao,destinationIcao:scope.destinationIcao,selectedNativeTUtc:t,memberAvailableAtUtc:s.sourceMemberAvailableAtUtc}});
 const f=Object.defineProperty({status:"EXACT_BOUND_ORIGINAL_NATIVE_FEATURE_BATCH_NOT_SIGNED",runDayIndex:1,horizon:"T-6h",providerCalls:0,dbWrites:0,phase6PaidGo:false,observedDbClockUtc:now,matchedCount:1},"privateDecisions",{value:[d]});
 const port={readReviewedWeatherArtifacts:async(x:any)=>{expect(x).toEqual({airports:["WSSS","YSSY"],observedDbClockUtc:now});expect(JSON.stringify(x)).not.toContain("leg:");return [fixture("METAR",[metar])]}};
 const x=await enrichP7NativeFeatureReviewWithNoaa({env,handoff:h,featureReview:f,port,forbiddenSignerFingerprints:[]});
 expect(x).toMatchObject({matchedCount:1,weatherPresentFields:2,weatherMissingFields:2});
 expect(JSON.stringify(x)).not.toContain("leg:fixture");
 expect(x.privateDecisions[0].compiled.bundle.observations).toHaveLength(3);
 expect(b.observations).toHaveLength(1);
 await expect(enrichP7NativeFeatureReviewWithNoaa({env,handoff:h,featureReview:f,port,forbiddenSignerFingerprints:[env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256]})).rejects.toThrow("NATIVE_REVIEW_HANDOFF");
});

it("recomputes the exact present weather fields from signed source bytes for the independent lane, never a claimed value or missing archive",()=>{
 const m=fixture("METAR",[metar]),t0=fixture("TAF",[taf]),verified=[m,t0].map(w=>verifyP7IndependentPublicNoaaArtifact(env,w,now));
 const b=mergeP7VerifiedNoaaIntoBoundPreBundle(bundle(),scope,verified).privateBundle;
 const p={manifestSha256:env.V39_P5_MANIFEST_SHA256,expectedReviewedSourceRightsSha256:env.V39_P5_RIGHTS_SHA256,
  flightInstanceId:scope.flightInstanceId,airportIcao:scope.originIcao,expectedDestinationIcao:scope.destinationIcao,selectedTNativeUtc:scope.selectedNativeTUtc,horizon:"T-6h",
  expectedSourceResponseSha256:b.originalResponseSha256,expectedSourcePopulationQueryId:b.populationQueryId,reviewedSupplementalFeatureBundle:b};
 const scoped={flightInstanceId:scope.flightInstanceId,originIcao:scope.originIcao,destinationIcao:scope.destinationIcao,observedDbClockUtc:now,memberAvailableAtUtc:"2026-11-24T23:10:00.000Z"};
 const dispositions=["origin_metar_visibility_m","origin_metar_wind_kt","origin_taf_flight_category","destination_taf_flight_category"].map(field=>({field,disposition:"INDEPENDENT_SOURCE_EXACT_LANE",outputField:null,reviewSha256:sha(field)}));
 const args={env:{...env,P6_PHASE7_NOAA_SOURCE_PURPOSE_SHA256:sha("synthetic NOAA review")},permit:p as any,scope:scoped,dispositions:dispositions as any,artifacts:[m,t0]};
 const r=verifyP7NoaaExactPreLaneEvidence(args);
 expect(r).toMatchObject({presentWeatherFields:3,weatherFieldsMissing:1,separateWeatherLaneFields:3,completePreLaneEvidence:false});
 expect(JSON.stringify(r)).not.toContain("sourceBodySha256");expect(r.privateWeatherFields.map(x=>x.field).sort()).toEqual(["destination_taf_flight_category","origin_metar_visibility_m","origin_metar_wind_kt"]);
 const changed=b.observations.map(o=>o.field==="origin_metar_wind_kt"?{...o,value:1}:o);
 expect(()=>verifyP7NoaaExactPreLaneEvidence({...args,permit:{...args.permit,reviewedSupplementalFeatureBundle:{...b,observations:changed,observationsSha256:sha(JSON.stringify(changed))}}})).toThrow("EXACT_SOURCE_OBSERVATION_NOT_REPRODUCED");
 expect(()=>verifyP7NoaaExactPreLaneEvidence({...args,artifacts:[t0]})).toThrow("EXACT_SOURCE_OBSERVATION_NOT_REPRODUCED");
 expect(()=>verifyP7NoaaExactPreLaneEvidence({...args,env:{...args.env,P6_PHASE7_NOAA_SOURCE_PURPOSE_SHA256:sha("other purpose")}})).toThrow("WEATHER_LANE_PURPOSE_OR_ARTIFACT_SET");
 expect(()=>verifyP7NoaaExactPreLaneEvidence({...args,scope:{...scoped,destinationIcao:"OMAA"}})).toThrow("EXACT_WEATHER_LANE_SCOPE");
});
