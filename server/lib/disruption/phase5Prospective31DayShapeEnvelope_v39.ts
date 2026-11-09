/**
 * Phase5: 31-parent-day DATE/SHAPE-ONLY scientific envelope. The five fixed
 * crossover pair candidates can be named; 21 adaptive ordinary-day selected
 * airports CANNOT be named before each prospective DB-clock early draw.
 *
 * Reuses real corrected B0062 packet, reviewed 40-window identity derivation,
 * and Stage21-compatible externally CLAIMED pair treatment assignment.
 * This is NOT a frozen 31-day source request grid or Phase6 GO.
 */
import {createHash} from "node:crypto";
import {verifyPreparedDailyDraw,
 type PreparedDayForReadback,type PreparedDrawRow
} from "./phase5EarlyPreselectionReadback_v39";
import {
 proposeP5RealCorrectedPairDateGeometry
} from "./phase5CorrectedPairDateGeometryProposal_v39";
import {
 buildP5Crossover40WindowReview
} from "./phase5Crossover40WindowEvidenceReview_v39";
import {
 previewP5IndependentTreatmentActiveSegments,
 type P5ExternalSeedClaim,type P5WindowShape
} from "./phase5IndependentPairedTreatmentSourcePreview_v39";
import {
 P5_EARLY_DRAW_MIN_STRICT_LEAD_MS,
 P5_EARLY_DRAW_MAX_INCLUSIVE_LEAD_MS
} from "./phase5ProspectiveEarlyDrawClockContract_v39";

const HOUR=3_600_000,DAY=86_400_000;
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"] as const;
const SHA=/^[a-f0-9]{64}$/;
const hash=(o:unknown)=>createHash("sha256")
 .update(JSON.stringify(o)).digest("hex");
const refuse=(s:string):never=>{
 throw Error("REFUSED_P5_ADAPTIVE_31_SHAPE_ENVELOPE_"+s);
};
const iso=(n:number)=>new Date(n).toISOString();

export interface P5Adaptive31ShapeEnvelopeInput {
 ownerCorrectedReadback:unknown;
 firstRunDateUtc:string;
 /** The seed is only CLAIMED; independent commitment witness is separate. */
 claimedTreatment:P5ExternalSeedClaim;
}
export interface P5Adaptive31ShapeDay {
 runDayIndex:number;
 partition:"train"|"validation"|"test";
 dateUtc:string;
 utcSlot:string;
 startUtc:string;
 endUtc:string;
 windowShape:P5WindowShape;
 activeSegments:{segmentIndex:number;startUtc:string;endUtc:string}[];
 excludedSplitGap:{startUtc:string;endUtc:string}|null;
 pairId:string|null;
 crossoverPeriod:1|2|null;
 pairRole:"control"|"alternative"|null;
 /** Actual corrected owner *candidate* known only for the ten paired days. */
 pairedAirportCandidates:Record<typeof SLOTS[number],string>|null;
 selectionState:"PAIRED_CANDIDATE_NOT_SIGNED"|
  "ORDINARY_AIRPORT_IDENTITIES_PENDING_PROSPECTIVE_DB_DRAW";
 earliestPermittedEarlyDrawUtc:string;
 latestPermittedEarlyDrawUtcInclusive:string;
 earliestPossibleSourceT24SpanUtc:string;
 fourSelectedAirportsDurablyBound:false;
 actualSourceOriginalAtT24Verified:false;
}
export interface P5Adaptive31ShapeEnvelope {
 schema:"v39.phase5.31day-shape-with-prospective-adaptive-draws.v1";
 status:"PROVISIONAL_SHAPE_ENVELOPE_ONLY_21_ADAPTIVE_DRAWS_PENDING";
 actualCorrectedB0062SelectionSha256:
  "f5112a9ca432d9d3fede96a9805030d68e05ced5a19d029aa896805746c21592";
 dateMapSha256:string;
 crossoverReview40Sha256:string;
 claimedTreatmentAssignmentSha256:string;
 claimedTreatmentCommitmentSha256:string;
 shapeEnvelopeSha256:string;
 plannedBatchDays:31;
 knownPairParentDays:10;
 ordinaryAdaptiveParentDays:21;
 pairedAirportReviewWindows:40;
 knownUniquePairedAirports:19;
 allExperimentExposureHoursAtMaximum:128;
 activeChildExposureSegments:34;
 unpartitionedAirportSegmentTargets:136;
 unpartitionedThreeHorizonCutoffGroups:408;
 frozenAirportsForFutureOrdinaryDays:0;
 futureOrdinaryDaysStillRequireRealSelection:21;
 days:P5Adaptive31ShapeDay[];
 all31DateAndWindowShapesStructurallyProposed:true;
 /** These cannot be inferred from a purely synthetic date+shape packet. */
 all21AdaptiveDrawsAuthentic:false;
 allKnownPairCandidatesIndependentlySigned:false;
 seedIndependentlyWitnessed:false;
 actualFrameRegionAnchorPlanVerified:false;
 sourceProviderRangeAndQueryGridVerified:false;
 sevenCategoryPhysicalUtcChargeBudgetsVerified:false;
 currentProviderCreditsAndRightsVerified:false;
 phase5ScientificFreezePassed:false;
 phase6PaidGo:false;
 providerCalls:0;databaseWrites:0;paidAlertCreates:0;
}

/**
 * This function does not guess future airports or use mock DB rows.
 * 408 unpartitioned cutoff groups is not a count of physical GETs: the provider's
 * range partitions and refreshes can expand that target count.
 */
export function proposeP5Adaptive31ShapeEnvelope(
 input:P5Adaptive31ShapeEnvelopeInput
):P5Adaptive31ShapeEnvelope {
 if(!input||typeof input!=="object")refuse("MISSING_INPUT");
 const candidate=proposeP5RealCorrectedPairDateGeometry({
  ownerCorrectedReadback:input.ownerCorrectedReadback,
  firstRunDateUtc:input.firstRunDateUtc
 });
 if(candidate.status!=="DATE_GEOMETRY_CANDIDATE_ONLY_NOT_SCIENCE_FREEZE"||
    candidate.days.length!==31||
    !candidate.dateMapSha256||!SHA.test(candidate.dateMapSha256))
  refuse("CORRECTED_31_DATE_GEOMETRY_NOT_SAT");
 const review=buildP5Crossover40WindowReview({
  ownerCorrectedReadback:input.ownerCorrectedReadback,
  firstRunDateUtc:input.firstRunDateUtc
 });
 const treatment=previewP5IndependentTreatmentActiveSegments(
  review,input.claimedTreatment
 );
 if(treatment.candidateDateMapSha256!==candidate.dateMapSha256||
    treatment.reviewWindowIdentitySha256!==review.windowIdentitySha256||
    treatment.pairedRunDays!==10||
    treatment.activeExposedSegments!==13||
    treatment.horizonCutoffGroups.length!==156||
    treatment.pairTreatments.length!==10||
    treatment.phase6PaidGo!==false)
  refuse("PAIRED_TREATMENT_PREVIEW_DIVERGED");
 const windows=new Map(treatment.pairTreatments.map(x=>[x.runDayIndex,x]));
 if(windows.size!==10)refuse("DUPLICATED_CROSSOVER_WINDOW");
 const days:P5Adaptive31ShapeDay[]=[];
 const shapeCount={"4h":0,"2x2h":0,"up-to-6h":0};
 let ordinary=0,paired=0,segments=0,exposedMs=0;
 let previousEnd=-Infinity;
 const knownAirports=new Set<string>();
 const lastKnownEnd=new Map<string,number>();
 for(let i=0;i<31;i++){
  const date=candidate.days[i];
  if(date.runDayIndex!==i+1)
   refuse("NONINCREASING_BATCH_INDEX");
  const pairedWindow=windows.get(i+1);
  const isPair=date.pairId!==null;
  if(isPair!==Boolean(pairedWindow))refuse("PAIR_WINDOW_OR_DATE_MISMATCH");
  const startMs=Date.parse(date.conservativeStartUtc);
  const maxEnd=Date.parse(date.conservativeEndUtc);
  if(!Number.isFinite(startMs)||!Number.isFinite(maxEnd)||
     maxEnd-startMs!==6*HOUR||startMs<previousEnd)
   refuse("CHRONOLOGICAL_OR_CONSERVATIVE_MAX_BOUND");
  const shape:P5WindowShape=pairedWindow?.windowShape??"4h";
  const endUtc=pairedWindow?.endUtc??iso(startMs+4*HOUR);
  const endMs=Date.parse(endUtc);
  const active=pairedWindow?.activeSegments??[{
   segmentIndex:1,startUtc:iso(startMs),endUtc
  }];
  const gap=pairedWindow?.excludedSplitGap??null;
  if(!Number.isFinite(endMs)||endMs<=startMs||endMs>maxEnd||
     active.length!==(shape==="2x2h"?2:1)||
     active.some((s,j)=>s.segmentIndex!==j+1||
       Date.parse(s.endUtc)<=Date.parse(s.startUtc))||
     (shape==="2x2h"&&(!gap||
        Date.parse(active[0].endUtc)!==Date.parse(gap.startUtc)||
        Date.parse(active[1].startUtc)!==Date.parse(gap.endUtc)))||
     (shape!=="2x2h"&&gap!==null))
   refuse("ACTIVE_INTERVAL_OR_SPLIT_GAP_MISMATCH");
  if(pairedWindow){
   paired++;
   if(pairedWindow.startUtc!==date.conservativeStartUtc||
      pairedWindow.period!==date.crossoverPeriod||
      pairedWindow.pairId!==date.pairId||!date.airportsIfKnown||
      SLOTS.some(s=>pairedWindow.airportIcaos[s]!==date.airportsIfKnown?.[s]))
    refuse("REPLAY_OR_SELECTED_AIRPORT_DRIFT");
   for(const icao of Object.values(pairedWindow.airportIcaos)){
    knownAirports.add(icao);
    const prev=lastKnownEnd.get(icao);
    if(prev!==undefined&&startMs-prev<DAY)
     refuse("KNOWN_AIRPORT_END_TO_START_WASHOUT");
    lastKnownEnd.set(icao,endMs);
   }
  }else{
   ordinary++;
   if(date.airportsIfKnown!==null||date.crossoverPeriod!==null)
    refuse("FUTURE_ADAPTIVE_AIRPORTS_FABRICATED");
  }
  shapeCount[shape]++;
  segments+=active.length;
  exposedMs+=active.reduce((n,s)=>n+Date.parse(s.endUtc)-Date.parse(s.startUtc),0);
  const earlyOpen=iso(startMs-P5_EARLY_DRAW_MAX_INCLUSIVE_LEAD_MS);
  const earlyLast=iso(startMs-P5_EARLY_DRAW_MIN_STRICT_LEAD_MS-1);
  const partition=i+1<=20?"train":i+1<=25?"validation":"test";
  days.push({
   runDayIndex:i+1,partition,
   dateUtc:date.dateUtc,utcSlot:date.utcSlot,
   startUtc:date.conservativeStartUtc,endUtc,
   windowShape:shape,activeSegments:active,excludedSplitGap:gap,
   pairId:date.pairId,crossoverPeriod:date.crossoverPeriod,
   pairRole:pairedWindow?.treatment??null,
   pairedAirportCandidates:pairedWindow?.airportIcaos??null,
   selectionState:pairedWindow?
    "PAIRED_CANDIDATE_NOT_SIGNED":
    "ORDINARY_AIRPORT_IDENTITIES_PENDING_PROSPECTIVE_DB_DRAW",
   earliestPermittedEarlyDrawUtc:earlyOpen,
   latestPermittedEarlyDrawUtcInclusive:earlyLast,
   earliestPossibleSourceT24SpanUtc:iso(startMs-DAY),
   fourSelectedAirportsDurablyBound:false,
   actualSourceOriginalAtT24Verified:false
  });
  previousEnd=endMs;
 }
 if(ordinary!==21||paired!==10||
    shapeCount["4h"]!==26||shapeCount["2x2h"]!==3||
    shapeCount["up-to-6h"]!==2||
    segments!==34||exposedMs!==128*HOUR||
    knownAirports.size!==19||
    days.filter(x=>x.pairedAirportCandidates!==null).length!==10||
    days.filter(x=>x.pairedAirportCandidates===null).length!==21||
    days.filter(x=>x.partition==="train").length!==20||
    days.filter(x=>x.partition==="validation").length!==5||
    days.filter(x=>x.partition==="test").length!==6)
  refuse("F8_ENVELOPE_COUNTS_OR_EVALUATION_SPLITS");
 // Persist exactly these shape identities if and only if later independently
 // reviewed: the SHA is a fingerprint, NOT a release or a source receipt.
 return {
  schema:"v39.phase5.31day-shape-with-prospective-adaptive-draws.v1",
  status:"PROVISIONAL_SHAPE_ENVELOPE_ONLY_21_ADAPTIVE_DRAWS_PENDING",
  actualCorrectedB0062SelectionSha256:
   "f5112a9ca432d9d3fede96a9805030d68e05ced5a19d029aa896805746c21592",
  dateMapSha256:candidate.dateMapSha256,
  crossoverReview40Sha256:review.windowIdentitySha256,
  claimedTreatmentAssignmentSha256:treatment.assignmentSha256,
  claimedTreatmentCommitmentSha256:treatment.announcedCommitmentSha256,
  shapeEnvelopeSha256:hash(days),
  plannedBatchDays:31,knownPairParentDays:10,ordinaryAdaptiveParentDays:21,
  pairedAirportReviewWindows:40,knownUniquePairedAirports:19,
  allExperimentExposureHoursAtMaximum:128,
  activeChildExposureSegments:34,
  unpartitionedAirportSegmentTargets:34*4,
  unpartitionedThreeHorizonCutoffGroups:34*4*3,
  frozenAirportsForFutureOrdinaryDays:0,
  futureOrdinaryDaysStillRequireRealSelection:21,
  days,
  all31DateAndWindowShapesStructurallyProposed:true,
  all21AdaptiveDrawsAuthentic:false,
  allKnownPairCandidatesIndependentlySigned:false,
  seedIndependentlyWitnessed:false,
  actualFrameRegionAnchorPlanVerified:false,
  sourceProviderRangeAndQueryGridVerified:false,
  sevenCategoryPhysicalUtcChargeBudgetsVerified:false,
  currentProviderCreditsAndRightsVerified:false,
  phase5ScientificFreezePassed:false,phase6PaidGo:false,
  providerCalls:0,databaseWrites:0,paidAlertCreates:0
 };
}


/**
 * Later step: purely recheck one submitted ordinary-day readback against
 * the shape/clock envelope. Rows are UNTRUSTED until a separate restricted
 * PostgreSQL read-only transaction proves their identity and DB clock.
 * This function cannot certify global previously drawn airport washout,
 * source originals, rights, budgets, flight T or a collection release.
 */
export interface P5OrdinaryDayCandidateBindingInput {
 envelope:P5Adaptive31ShapeEnvelope;
 independentlyReviewedShapeEnvelopeSha256:string;
 independentlyReviewedSignedCalendarSha256:string;
 preparedDay:PreparedDayForReadback;
 submittedDrawRows:PreparedDrawRow[];
}
export interface P5OrdinaryDayCandidateBinding {
 schema:"v39.phase5.ordinary-day-provisional-shape-to-draw-binding.v1";
 status:"FOUR_SUBMITTED_EARLY_DRAW_ROWS_MATCH_SHAPE_NOT_DB_CUSTODY";
 runDayIndex:number;
 sourceShapeEnvelopeSha256:string;
 expectedCalendarSha256:string;
 submittedDrawStateSha256:string;
 candidateBindingSha256:string;
 selectedAtUtc:string;
 selectedIcaos:Record<typeof SLOTS[number],string>;
 dateAndShapeMatched:true;
 realRestrictedPostgresReadbackAuthenticated:false;
 fullPriorDaySiteWashoutVerified:false;
 actualSourceAndPerFlightTVerified:false;
 sevenCategoryChargeDayBudgetVerified:false;
 phase5ScientificFreezePassed:false;phase6PaidGo:false;
 providerCalls:0;databaseWrites:0;
}
export function inspectP5OrdinaryDayCandidateBinding(
 input:P5OrdinaryDayCandidateBindingInput
):P5OrdinaryDayCandidateBinding {
 const e=input?.envelope;
 if(!e||e.schema!=="v39.phase5.31day-shape-with-prospective-adaptive-draws.v1"||
    e.status!=="PROVISIONAL_SHAPE_ENVELOPE_ONLY_21_ADAPTIVE_DRAWS_PENDING"||
    !SHA.test(input.independentlyReviewedShapeEnvelopeSha256)||
    input.independentlyReviewedShapeEnvelopeSha256!==e.shapeEnvelopeSha256||
    hash(e.days)!==e.shapeEnvelopeSha256||e.days.length!==31||
    e.ordinaryAdaptiveParentDays!==21||
    e.all21AdaptiveDrawsAuthentic!==false||e.phase6PaidGo!==false||
    e.providerCalls!==0||e.databaseWrites!==0||
    !SHA.test(input.independentlyReviewedSignedCalendarSha256))
  refuse("UNREVIEWED_OR_TAMPERED_31_SHAPE");
 const day=input.preparedDay;
 if(!day||!Number.isInteger(day.runDayIndex)||day.runDayIndex<1||
    day.runDayIndex>31||!(day.scheduledStartUtc instanceof Date)||
    !Number.isFinite(day.scheduledStartUtc.getTime())||
    day.calendarHash!==input.independentlyReviewedSignedCalendarSha256)
  refuse("SIGNED_DAY_OR_CALENDAR_NOT_MATCHED");
 const proposed=e.days[day.runDayIndex-1];
 if(proposed.runDayIndex!==day.runDayIndex||
    proposed.pairId!==null||proposed.pairedAirportCandidates!==null||
    proposed.selectionState!==
     "ORDINARY_AIRPORT_IDENTITIES_PENDING_PROSPECTIVE_DB_DRAW"||
    proposed.windowShape!=="4h"||proposed.activeSegments.length!==1||
    day.scheduledStartUtc.toISOString()!==proposed.startUtc||
    day.drawType!=="NEW_TEMPLATE"||day.pairAirportSet!==null)
  refuse("ADAPTIVE_DAY_OR_EXPOSURE_REDRAW");
 const checked=verifyPreparedDailyDraw(day,input.submittedDrawRows);
 const selected=Date.parse(checked.selectedAtUtc);
 if(selected<Date.parse(proposed.earliestPermittedEarlyDrawUtc)||
    selected>Date.parse(proposed.latestPermittedEarlyDrawUtcInclusive))
  refuse("DRAW_NOT_WITHIN_REAL_PROSPECTIVE_EARLY_WINDOW");
 const icaos=Object.fromEntries(checked.selections.map(
  row=>[row.slotId,row.icao]
 )) as Record<typeof SLOTS[number],string>;
 if(SLOTS.some(s=>!/^[A-Z]{4}$/.test(icaos[s]??""))||
    new Set(Object.values(icaos)).size!==4)
  refuse("REAL_FOUR_SLOT_BINDING_MISSING");
 const identity={shapeEnvelopeSha256:e.shapeEnvelopeSha256,
  calendarSha256:input.independentlyReviewedSignedCalendarSha256,
  runDayIndex:day.runDayIndex,drawSha256:checked.stateHash,
  selectedAtUtc:checked.selectedAtUtc,selectedIcaos:icaos};
 return {
  schema:"v39.phase5.ordinary-day-provisional-shape-to-draw-binding.v1",
  status:"FOUR_SUBMITTED_EARLY_DRAW_ROWS_MATCH_SHAPE_NOT_DB_CUSTODY",
  runDayIndex:day.runDayIndex,
  sourceShapeEnvelopeSha256:e.shapeEnvelopeSha256,
  expectedCalendarSha256:input.independentlyReviewedSignedCalendarSha256,
  submittedDrawStateSha256:checked.stateHash,
  candidateBindingSha256:hash(identity),
  selectedAtUtc:checked.selectedAtUtc,
  selectedIcaos:icaos,dateAndShapeMatched:true,
  realRestrictedPostgresReadbackAuthenticated:false,
  fullPriorDaySiteWashoutVerified:false,
  actualSourceAndPerFlightTVerified:false,
  sevenCategoryChargeDayBudgetVerified:false,
  phase5ScientificFreezePassed:false,phase6PaidGo:false,
  providerCalls:0,databaseWrites:0
 };
}
