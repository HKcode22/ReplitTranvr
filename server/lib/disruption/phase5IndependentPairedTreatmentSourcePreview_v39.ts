/**
 * Phase 5 — paired crossover treatment order and EXACT active segment
 * cutoffs under a SEPARATELY SUPPLIED external seed commitment.
 *
 * Uses immutable corrected real airport pairs and the provisional, date-only
 * 40-window review packet. Does not create/verify a genuine random seed,
 * externally witness the commitment, determine flight-specific T, contact a
 * provider, issue source requests, certify rights or enable Phase 6.
 *
 * The 31-day schedule and 21 ordinary-day adaptive airport draws must pass
 * their separate release gates; only ten known paired days are materialized.
 */
import {createHash} from "node:crypto";
import type {P5Crossover40ReviewResult} from "./phase5Crossover40WindowEvidenceReview_v39";

const DAY=86_400_000,HOUR=3_600_000,MIN=60_000;
const SHA=/^[0-9a-f]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"] as const;
const PAIRS=["pair-1","pair-2","pair-3","pair-4","pair-5"] as const;
const EXPECTED_SELECTION="f5112a9ca432d9d3fede96a9805030d68e05ced5a19d029aa896805746c21592";
const OLD_SEEDS=new Set([
 "71c2e5b845c8fce696c5371e05c3b5f06a43e2378a4a308867eb9a0a5f4be1e0",
 "0490ed38116b3951b2cb5be213e3266938bcb5dbf18979b5aca4cf9d29b45a0d",
 "20a8aa4420d301673e7ff2fe472387578cf943772b5ada9e5208facd8984e182"
]);
const HORIZONS=[
 {name:"T-24h" as const,ms:24*HOUR},
 {name:"T-6h" as const,ms:6*HOUR},
 {name:"T-90m" as const,ms:90*MIN}
];
const refuse=(code:string):never=>{
 throw Error("REFUSED_P5_TREATMENT_SOURCE_PREVIEW_"+code);
};
const hashString=(s:string)=>createHash("sha256").update(s).digest("hex");
const digest=(o:unknown)=>hashString(JSON.stringify(o));
const dateMs=(s:string,label:string)=>{
 if(!UTC.test(s)||!Number.isFinite(Date.parse(s))||
    new Date(Date.parse(s)).toISOString()!==s)
  refuse(label+"_INVALID_UTC");
 return Date.parse(s);
};
const iso=(x:number)=>new Date(x).toISOString();
export const P5_TREATMENT_SOURCE_PREVIEW_SCHEMA=
 "v39.phase5.paired-external-seed-active-segments-preview.v1" as const;
export const p5TreatmentCommitmentForSeed=(seedHex:string)=>{
 if(!SHA.test(seedHex))refuse("BAD_SEED_HEX");
 return hashString("V39_P5_INDEPENDENT_CROSSOVER_ORDER_V1|"+seedHex);
};
export interface P5ExternalSeedClaim {
 /**
  * Supplied by a distinct authorized randomization process, NOT B0062
  * airport seed, HUB anchor seed or calendar-region seed.
  * This function cannot establish entropy, independence or chain of custody.
  */
 treatmentSeedHex:string;
 /** Domain-separated pre-commitment SHA256, supplied separately for review. */
 announcedCommitmentSha256:string;
 /** Self-attested timestamp only; independent immutable witness required. */
 claimedCommitmentObservedAtUtc:string;
}
export type P5WindowShape="4h"|"2x2h"|"up-to-6h";
export interface P5PairedWindowTreatment {
 pairId:string;
 period:1|2;
 runDayIndex:number;
 treatment:"control"|"alternative";
 windowShape:P5WindowShape;
 startUtc:string;
 endUtc:string;
 airportIcaos:Record<(typeof SLOTS)[number],string>;
 activeSegments:{segmentIndex:number;startUtc:string;endUtc:string}[];
 excludedSplitGap:{startUtc:string;endUtc:string}|null;
}
export interface P5PairedHorizonCutoffGroup {
 pairId:string;period:1|2;runDayIndex:number;
 slot:(typeof SLOTS)[number];airportIcao:string;
 segmentIndex:number;horizon:"T-24h"|"T-6h"|"T-90m";
 serviceIntervalStartUtc:string;serviceIntervalEndUtc:string;
 cutoffSpanStartUtc:string;cutoffSpanExclusiveEndUtc:string;
 groupSha256:string;
 flightLevelTAndNativeOriginalVerified:false;
 providerRequestAndRangeApproved:false;
}
export interface P5TreatmentSourcePreviewResult {
 schema:typeof P5_TREATMENT_SOURCE_PREVIEW_SCHEMA;
 status:"PROVISIONAL_EXACT_PAIRED_SEGMENTS_NOT_RELEASE";
 correctedSelectedAirportSha256:typeof EXPECTED_SELECTION;
 candidateDateMapSha256:string;
 reviewWindowIdentitySha256:string;
 announcedCommitmentSha256:string;
 claimedCommitmentObservedAtUtc:string;
 assignmentSha256:string;activeSegmentSha256:string;
 earliestPossibleT24CutoffUtc:string;
 pairedRunDays:10;uniqueKnownAirports:19;
 fourHourControls:5;split2x2Alternatives:3;upTo6hAlternatives:2;
 activeExposedSegments:13;
 airportSegmentInstances:52;
 airportSegmentHorizonCutoffGroups:156;
 pairTreatments:P5PairedWindowTreatment[];
 horizonCutoffGroups:P5PairedHorizonCutoffGroup[];
 externallyWitnessedSeedIndependence:false;
 externalCommitmentTimestampAuthenticated:false;
 all31OrdinaryAirportDrawsVerified:false;
 actualProviderMaxRangeAndRequestsVerified:false;
 threeHorizonOriginalSourceBindingVerified:false;
 current7CategoryPhysicalUtcBudgetVerified:false;
 lawfulSourceContentsUseVerified:false;
 sourcePREPOSTReceiverAndSTOPVerified:false;
 phase5ScientificFreezePassed:false;phase6PaidGo:false;
 providerCalls:0;databaseWrites:0;paidAlertCreates:0;
}
type Row=P5Crossover40ReviewResult["reviewRows"][number];
function verifiedReview(review:P5Crossover40ReviewResult):{
 rows:Row[],firstRunStartMs:number
}{
 if(!review||review.schema!=="v39.phase5.crossover-40-conservative-window-review.v1"||
    review.status!=="HOLD_ALL_40_PROVIDER_NATIVE_WINDOWS_UNVERIFIED"||
    review.correctedOwnerSelectedIcaosSha256!==EXPECTED_SELECTION||
    !SHA.test(review.candidateDateMapSha256)||
    !SHA.test(review.windowIdentitySha256)||
    review.reviewRows?.length!==40||
    review.pairedRunDays!==10||review.uniquePhysicalAirports!==19||
    review.nativeVerifiedWindows!==0||review.unknownPopulationWindows!==40||
    review.independentPhase5FreezePassed!==false||review.phase6PaidGo!==false||
    review.providerCalls!==0||review.databaseWrites!==0||review.paidAlertCreates!==0)
  refuse("NOT_AN_AUTHENTIC_UNRELEASED_FORTY_WINDOW_REVIEW");
 const rows=review.reviewRows;
 const seen=new Set<string>();
 const basic=rows.map((r,i)=>{
  if(!r||!SLOTS.includes(r.slot)||!PAIRS.includes(r.pairId as typeof PAIRS[number])||
     ![1,2].includes(r.crossoverPeriod)||!Number.isSafeInteger(r.runDayIndex)||
     (r.crossoverPeriod===1?r.runDayIndex:r.runDayIndex-6)!==
       Number(r.pairId.slice(5))||
     !/^[A-Z]{4}$/.test(r.airportIcao)||!SHA.test(r.reviewKeySha256)||
     r.providerNativeWindowSourceVerified!==false||
     r.scheduledPassengerPopulation!=="UNKNOWN"||
     r.uniquePhysicalOperatingLegCount!==null||
     r.directedRouteSupportCount!==null||
     r.cutoffSafeSourceAvailableAtUtc!==null||
     r.intervalKind!=="MAX_SIX_HOUR_REVIEW_ENVELOPE_NOT_ACTIVE_EXPOSURE")
   refuse("REVIEW_ROW_STATUS_OR_IDENTITY_CHANGED");
  const from=dateMs(r.startUtc,"REVIEW_START");
  const to=dateMs(r.conservativeEndUtc,"REVIEW_END");
  if(to-from!==6*HOUR||r.dateUtc!==r.startUtc.slice(0,10)||
     seen.has(r.reviewKeySha256))
   refuse("REVIEW_ENVELOPE_OR_DUPLICATED_KEY");
  seen.add(r.reviewKeySha256);
  const signature={dateMapSha256:review.candidateDateMapSha256,
   pairId:r.pairId,crossoverPeriod:r.crossoverPeriod,
   runDayIndex:r.runDayIndex,slot:r.slot,airportIcao:r.airportIcao,
   startUtc:r.startUtc,conservativeEndUtc:r.conservativeEndUtc};
  if(digest(signature)!==r.reviewKeySha256)refuse("REVIEW_KEY_DRIFT");
  const expectedSlot=SLOTS[i%4];
  if(r.slot!==expectedSlot)refuse("REVIEW_ROW_ORDER_DRIFT");
  return {reviewKeySha256:r.reviewKeySha256,
   pairId:r.pairId,crossoverPeriod:r.crossoverPeriod,
   runDayIndex:r.runDayIndex,slot:r.slot,airportIcao:r.airportIcao,
   startUtc:r.startUtc,conservativeEndUtc:r.conservativeEndUtc,
   dateUtc:r.dateUtc,weekdayClass:r.weekdayClass};
 });
 if(digest(basic)!==review.windowIdentitySha256)
  refuse("REVIEW_40_IDENTITY_DIGEST_DRIFT");
 const selected=PAIRS.map(pairId=>{
  const first=rows.filter(r=>r.pairId===pairId&&r.crossoverPeriod===1);
  const second=rows.filter(r=>r.pairId===pairId&&r.crossoverPeriod===2);
  if(first.length!==4||second.length!==4||
     SLOTS.some((s,i)=>first[i].slot!==s||second[i].slot!==s||
       first[i].airportIcao!==second[i].airportIcao||
       first[i].runDayIndex!==Number(pairId.slice(5))||
       second[i].runDayIndex!==Number(pairId.slice(5))+6||
       first[i].startUtc>=second[i].startUtc))
   refuse("PAIR_REPLAY_OR_DATED_IDENTITY_DRIFT");
  return {pairId,icaos:first.map(r=>r.airportIcao)};
 });
 if(digest(selected)!==EXPECTED_SELECTION)refuse("REAL_PAIR_SELECTION_CHANGED");
 const unique=new Set(rows.map(r=>r.airportIcao));
 if(unique.size!==19)refuse("NINETEEN_DISTINCT_AIRPORTS_REQUIRED");
 return {rows,firstRunStartMs:dateMs(rows[0].startUtc,"FIRST_RUN")};
}

/**
 * Mirrors the Stage21 rank formula, with an independent external seed
 * injected via a separately reviewable precommitment. Parity is protected
 * by regression tests against deriveP5F8SeededPairRoles.
 */
export function previewP5IndependentTreatmentActiveSegments(
 review:P5Crossover40ReviewResult,claim:P5ExternalSeedClaim
):P5TreatmentSourcePreviewResult {
 const {rows,firstRunStartMs}=verifiedReview(review);
 if(!claim||!SHA.test(claim.treatmentSeedHex)||
    OLD_SEEDS.has(claim.treatmentSeedHex)||
    !SHA.test(claim.announcedCommitmentSha256)||
    p5TreatmentCommitmentForSeed(claim.treatmentSeedHex)!==
      claim.announcedCommitmentSha256)
  refuse("EXTERNAL_TREATMENT_COMMITMENT_INVALID_OR_REUSED");
 const observed=dateMs(claim.claimedCommitmentObservedAtUtc,"SEED_CLAIM");
 const firstT24=firstRunStartMs-DAY;
 if(observed>=firstT24)
  refuse("COMMITMENT_NOT_CLAIMED_BEFORE_EARLIEST_T24");
 // These ranked assignments are balanced on purpose: 3 control-first,
 // 2 alternative-first. They are a proposal, NOT witnessed independent RNG.
 const templates=PAIRS.map(pairId=>{
  const x=rows.filter(r=>r.pairId===pairId&&r.crossoverPeriod===1);
  const canonicalId="pair_"+String(Number(pairId.slice(5))).padStart(3,"0");
  const airportIcaos=Object.fromEntries(x.map(r=>[r.slot,r.airportIcao]));
  return {pairId,canonicalId,
   templateHash:digest({pairId:canonicalId,airports:airportIcaos})};
 });
 const ranked=templates.map(t=>({
  ...t,rank:hashString(claim.treatmentSeedHex+"|"+t.canonicalId+"|"+t.templateHash)
 })).sort((a,b)=>a.rank.localeCompare(b.rank)||a.canonicalId.localeCompare(b.canonicalId));
 const period1Roles=new Map(ranked.map((x,i)=>[
  x.pairId,(i<3?"control":"alternative") as "control"|"alternative"
 ]));
 const assignments:Array<{
  pairId:string;period1Role:"control"|"alternative";
  period2Role:"control"|"alternative";
  alternativeShape:"2x2h"|"up-to-6h"
 }>=PAIRS.map(pairId=>({
  pairId,
  period1Role:period1Roles.get(pairId)!,
  period2Role:period1Roles.get(pairId)==="control"?"alternative":"control",
  alternativeShape:Number(pairId.slice(5))<=3?"2x2h":"up-to-6h"
 }));
 const windows:P5PairedWindowTreatment[]=[];
 for(const r of assignments){
  for(const period of [1,2] as const){
   const dayRows=rows.filter(x=>x.pairId===r.pairId&&x.crossoverPeriod===period);
   const t=dateMs(dayRows[0].startUtc,"TREATMENT_WINDOW");
   if(dayRows.some(x=>x.startUtc!==dayRows[0].startUtc))
    refuse("SAME_DAY_AIRPORT_START_MISMATCH");
   const role=period===1?r.period1Role:r.period2Role;
   const shape:P5WindowShape=role==="control"?"4h":r.alternativeShape;
   const active=shape==="2x2h"?
    [{segmentIndex:1,startUtc:iso(t),endUtc:iso(t+2*HOUR)},
     {segmentIndex:2,startUtc:iso(t+3*HOUR),endUtc:iso(t+5*HOUR)}]:
    [{segmentIndex:1,startUtc:iso(t),
      endUtc:iso(t+(shape==="4h"?4:6)*HOUR)}];
   const end=shape==="2x2h"?t+5*HOUR:
     t+(shape==="4h"?4:6)*HOUR;
   if(end>dateMs(dayRows[0].conservativeEndUtc,"REVIEW_BOUND"))
    refuse("ACTIVE_TREATMENT_EXCEEDS_REVIEW_ENVELOPE");
   const slotAirports=Object.fromEntries(dayRows.map(x=>[x.slot,x.airportIcao]))
     as P5PairedWindowTreatment["airportIcaos"];
   windows.push({
    pairId:r.pairId,period,runDayIndex:dayRows[0].runDayIndex,
    treatment:role,windowShape:shape,startUtc:iso(t),
    endUtc:iso(end),airportIcaos:slotAirports,
    activeSegments:active,
    excludedSplitGap:shape==="2x2h"?{
      startUtc:iso(t+2*HOUR),endUtc:iso(t+3*HOUR)}:null
   });
  }
 }
 windows.sort((a,b)=>a.runDayIndex-b.runDayIndex);
 const seen=new Map<string,number>();
 for(const window of windows){
  const start=dateMs(window.startUtc,"REAL_ACTIVE_START");
  const end=dateMs(window.endUtc,"REAL_ACTIVE_END");
  for(const airport of Object.values(window.airportIcaos)){
   const prev=seen.get(airport);
   if(prev!==undefined&&start-prev<DAY)
    refuse("GLOBAL_KNOWN_AIRPORT_WASHOUT_VIOLATION");
   seen.set(airport,end);
  }
 }
 if(windows.length!==10||
    windows.filter(x=>x.windowShape==="4h").length!==5||
    windows.filter(x=>x.windowShape==="2x2h").length!==3||
    windows.filter(x=>x.windowShape==="up-to-6h").length!==2||
    windows.reduce((n,w)=>n+w.activeSegments.length,0)!==13)
  refuse("WRONG_F8_PAIRED_TREATMENT_SHAPES");
 const cutoffs:P5PairedHorizonCutoffGroup[]=[];
 for(const window of windows)for(const slot of SLOTS){
  for(const seg of window.activeSegments)for(const h of HORIZONS){
   const begin=dateMs(seg.startUtc,"SEGMENT")-h.ms;
   const exclusiveEnd=dateMs(seg.endUtc,"SEGMENT")-h.ms;
   const payload={
    pairId:window.pairId,period:window.period,
    runDayIndex:window.runDayIndex,slot,
    airportIcao:window.airportIcaos[slot],
    segmentIndex:seg.segmentIndex,horizon:h.name,
    serviceIntervalStartUtc:seg.startUtc,
    serviceIntervalEndUtc:seg.endUtc,
    cutoffSpanStartUtc:iso(begin),
    cutoffSpanExclusiveEndUtc:iso(exclusiveEnd)
   };
   cutoffs.push({
    ...payload,groupSha256:digest(payload),
    flightLevelTAndNativeOriginalVerified:false,
    providerRequestAndRangeApproved:false
   });
  }
 }
 if(cutoffs.length!==156||new Set(cutoffs.map(x=>x.groupSha256)).size!==156)
  refuse("P5_CUTOFF_GROUP_DUPLICATE_OR_MISSING");
 return {
  schema:P5_TREATMENT_SOURCE_PREVIEW_SCHEMA,
  status:"PROVISIONAL_EXACT_PAIRED_SEGMENTS_NOT_RELEASE",
  correctedSelectedAirportSha256:EXPECTED_SELECTION,
  candidateDateMapSha256:review.candidateDateMapSha256,
  reviewWindowIdentitySha256:review.windowIdentitySha256,
  announcedCommitmentSha256:claim.announcedCommitmentSha256,
  claimedCommitmentObservedAtUtc:claim.claimedCommitmentObservedAtUtc,
  assignmentSha256:digest(assignments),activeSegmentSha256:digest(windows),
  earliestPossibleT24CutoffUtc:iso(firstT24),
  pairedRunDays:10,uniqueKnownAirports:19,
  fourHourControls:5,split2x2Alternatives:3,upTo6hAlternatives:2,
  activeExposedSegments:13,airportSegmentInstances:52,
  airportSegmentHorizonCutoffGroups:156,
  pairTreatments:windows,horizonCutoffGroups:cutoffs,
  externallyWitnessedSeedIndependence:false,
  externalCommitmentTimestampAuthenticated:false,
  all31OrdinaryAirportDrawsVerified:false,
  actualProviderMaxRangeAndRequestsVerified:false,
  threeHorizonOriginalSourceBindingVerified:false,
  current7CategoryPhysicalUtcBudgetVerified:false,
  lawfulSourceContentsUseVerified:false,
  sourcePREPOSTReceiverAndSTOPVerified:false,
  phase5ScientificFreezePassed:false,phase6PaidGo:false,
  providerCalls:0,databaseWrites:0,paidAlertCreates:0
 };
}
