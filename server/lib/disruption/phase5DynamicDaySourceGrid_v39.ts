/**
 * Phase5 Stage6: materialize a SINGLE DAY's signed-source candidates from
 * the actual four-slot immutable early-draw readback.
 *
 * Pure/no provider/no database/no GitHub workflow. A 31-day static schedule
 * cannot preselect adaptive REGIONAL airports before the earlier selection
 * transaction. This adapter never guesses future airports or uses candidate
 * simulation as evidence of live committed selection.
 *
 * Results require a separate reviewed V0079/V0080 query preparation,
 * permissions, source-use rights, REST/Alert budgets and independent PRE
 * certification BEFORE any physical GET or Phase6 activation.
 */
import { createHash } from "node:crypto";
import {
  verifyPreparedDailyDraw,
  type PreparedDayForReadback,
  type PreparedDrawRow,
} from "./phase5EarlyPreselectionReadback_v39";
import type {
  P5FidsAcquisition, P5Slot, P5FidsHorizon,
} from "./phase5FidsFreezeGridAdmission_v39";

export const P5_DYNAMIC_DAY_GRID_SCHEMA =
  "v39.phase5.early-draw-to-12-source-candidates.v1" as const;
const HASH=/^[a-f0-9]{64}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const SLOTS:P5Slot[]=["HUB","MID_A","MID_B","REGIONAL"];
const HORIZONS:P5FidsHorizon[]=["T-24h","T-6h","T-90m"];
const MIN_EARLY= (24*60+45)*60_000;
const MAX_EARLY=72*3_600_000;
const MAX_LATENCY=3_600;
type WithoutUnknownIcao=Omit<P5FidsAcquisition,"icao"|"plannedAirportSelectionUtc">;

export interface P5DynamicDayGridInput {
  schema:typeof P5_DYNAMIC_DAY_GRID_SCHEMA;
  /** Same frozen protocol scope as the eventual V0079 signed query set. */
  reviewedCalendarSha256:string;
  reviewedConfigSha256:string;
  reviewedFrameSha256:string;
  providerContractSha256:string;
  day:PreparedDayForReadback;
  /** Source rows must be read from actual committed DB transaction elsewhere. */
  committedEarlyDrawRows:PreparedDrawRow[];
  /** Independent readback evidence, not caller-invented future airport names. */
  expectedCommittedEarlyDrawSha256:string;
  /** Templates intentionally do NOT contain selected airport ICAOs. */
  templates:WithoutUnknownIcao[];
}
export interface P5DynamicDayGridResult {
  schema:"v39.phase5.early-draw-to-12-source-candidates-result.v1";
  status:"DYNAMIC_DAY_CANDIDATES_MATCH_COMMITTED_DRAW_NOT_RELEASED";
  runDayIndex:number;
  selectedAtUtc:string;
  committedDrawSha256:string;
  dynamicTemplateSha256:string;
  sourceCandidateDigestSha256:string;
  acquisitionCount:12;
  plannedPhysicalGetCount:12;
  candidateFidsApiUnits:24;
  actualChargeDayUtcCounts:{day:string;physicalRequests:number;candidateApiUnits:number}[];
  acquisitions:P5FidsAcquisition[];
  actualGithubRunPrearmVerified:false;
  actualSourceOriginalCommitted:false;
  actualFlightLevelPreCertified:false;
  authorizedSourceRights:false;
  authorizesPaidGet:false;
  phase5FreezePassed:false;
  phase6Go:false;
}
function hold(code:string):never{throw Error("REFUSED_P5_DYNAMIC_DAY_GRID_"+code);}
function time(v:unknown,label:string):number{
 if(typeof v!=="string"||!ISO.test(v))hold(label+"_FORMAT");
 const t=Date.parse(v);
 if(!Number.isFinite(t)||new Date(t).toISOString()!==v)hold(label+"_UTC");
 return t;
}
function digest(o:unknown):string{
 return createHash("sha256").update(JSON.stringify(o)).digest("hex");
}
/**
 * Candidate producer for a previously committed adaptive selection.
 * No database access: the calling release must independently verify these
 * four rows actually came from the frozen committed DB draw, not a fixture.
 */
export function materializeP5DynamicDaySourceGrid(input:P5DynamicDayGridInput):P5DynamicDayGridResult {
 if(!input||input.schema!==P5_DYNAMIC_DAY_GRID_SCHEMA)hold("SCHEMA");
 const day=input.day;
 if(!day||!Number.isInteger(day.runDayIndex)||
   day.runDayIndex<1||day.runDayIndex>31)hold("RUN_DAY");
 if(![input.reviewedCalendarSha256,input.reviewedConfigSha256,
   input.reviewedFrameSha256,input.providerContractSha256,
   input.expectedCommittedEarlyDrawSha256].every(x=>typeof x==="string"&&HASH.test(x)))
   hold("MISSING_SIGNED_PINS");
 if(day.calendarHash!==input.reviewedCalendarSha256||
    day.configHash!==input.reviewedConfigSha256||
    day.frameHash!==input.reviewedFrameSha256)
   hold("FROZEN_CALENDAR_CONFIG_FRAME_CONFLICT");
 const draw=verifyPreparedDailyDraw(day,input.committedEarlyDrawRows);
 if(draw.stateHash!==input.expectedCommittedEarlyDrawSha256)
   hold("UNVERIFIED_EARLY_DRAW_READBACK");
 const start=day.scheduledStartUtc.getTime();
 if(!Number.isFinite(start))hold("FROZEN_SERVICE_START");
 const selected=time(draw.selectedAtUtc,"SELECTED_AT");
 const advance=start-selected;
 if(advance<=MIN_EARLY||advance>MAX_EARLY)
   hold("REAL_EARLY_OWNER_WINDOW");
 if(!Array.isArray(input.templates)||input.templates.length!==12)
   hold("MISSING_OR_EXTRA_SLOT_HORIZON_TEMPLATE");
 const seen=new Set<string>();
 const keys=new Set<string>();
 const requests:P5FidsAcquisition[]=[];
 const byCharge=new Map<string,number>();
 const earliestBySlot=new Map<P5Slot,Record<P5FidsHorizon,number>>();
 for(const candidate of input.templates){
  if(!candidate || Object.hasOwn(candidate,"icao") ||
      Object.hasOwn(candidate,"plannedAirportSelectionUtc"))
    hold("UNAPPROVED_DYNAMIC_AIRPORT_IN_TEMPLATE");
  const slot=candidate.slot,horizon=candidate.horizon;
  if(!SLOTS.includes(slot)||!HORIZONS.includes(horizon))
    hold("UNKNOWN_SLOT_OR_HORIZON");
  if(candidate.runDayIndex!==day.runDayIndex||
     candidate.budgetDayUtc!==day.scheduledStartUtc.toISOString().slice(0,10)||
     candidate.providerQueryDirection!=="Departure")
    hold("SERVICE_DAY_OR_DIRECTION_CHANGED");
  const one=draw.selections.find(v=>v.slotId===slot);
  if(!one)hold("MISSING_COMMITTED_SLOT");
  const group=slot+"|"+horizon;
  if(seen.has(group))hold("DUPLICATE_SLOT_HORIZON");
  seen.add(group);
  if(typeof candidate.queryKey!=="string"||
     !/^[a-zA-Z0-9_.:-]{8,150}$/.test(candidate.queryKey)||
     keys.has(candidate.queryKey))
    hold("DUPLICATE_OR_UNSAFE_QUERY_KEY");
  keys.add(candidate.queryKey);
  const dayWindow=time(candidate.serviceWindowStartUtc,"WINDOW_START");
  const end=time(candidate.serviceWindowEndUtc,"WINDOW_END");
  const request=time(candidate.scheduledRequestUtc,"REQUEST");
  const cutoff=time(candidate.earliestPlannedCutoffUtc,"CUTOFF");
  if(dayWindow!==start||end<=dayWindow||end>dayWindow+4*3_600_000)
    hold("UNFROZEN_SERVICE_WINDOW");
  if(selected>=request||request>=cutoff)
    hold("EARLY_DRAW_OR_QUERY_AFTER_CUTOFF");
  if(!Number.isSafeInteger(candidate.maxResponseAndPersistSeconds)||
     candidate.maxResponseAndPersistSeconds<1||
     candidate.maxResponseAndPersistSeconds>MAX_LATENCY||
     request+candidate.maxResponseAndPersistSeconds*1000>cutoff)
    hold("SOURCE_COMMIT_MARGIN");
  if(candidate.maxAttempts!==1||candidate.apiUnitsPerAttempt!==2)
    hold("UNREVIEWED_REQUEST_UNIT_PRICE_OR_RETRY");
  const chargeDate=new Date(request).toISOString().slice(0,10);
  if(chargeDate!==candidate.physicalChargeDayUtc)
    hold("ACTUAL_UTC_CHARGE_DAY_MISMATCH");
  const row=earliestBySlot.get(slot)??{
   "T-24h":Number.NaN,"T-6h":Number.NaN,"T-90m":Number.NaN
  };
  row[horizon]=cutoff;
  earliestBySlot.set(slot,row);
  byCharge.set(chargeDate,(byCharge.get(chargeDate)??0)+1);
  requests.push({...candidate,icao:one.icao,
    plannedAirportSelectionUtc:draw.selectedAtUtc});
 }
 if(seen.size!==12||keys.size!==12)hold("INCOMPLETE_SIGNED_QUERY_SLOTS");
 for(const slot of SLOTS){
  const v=earliestBySlot.get(slot);
  if(!v||!(v["T-24h"]<v["T-6h"]&&v["T-6h"]<v["T-90m"]))
    hold("INCONSISTENT_T24_T6_T90_HORIZONS");
 }
 requests.sort((a,b)=>SLOTS.indexOf(a.slot)-SLOTS.indexOf(b.slot)||
   HORIZONS.indexOf(a.horizon)-HORIZONS.indexOf(b.horizon));
 const charges=[...byCharge.entries()].sort((a,b)=>a[0].localeCompare(b[0]))
  .map(([day,physicalRequests])=>({day,physicalRequests,candidateApiUnits:physicalRequests*2}));
 return {
  schema:"v39.phase5.early-draw-to-12-source-candidates-result.v1",
  status:"DYNAMIC_DAY_CANDIDATES_MATCH_COMMITTED_DRAW_NOT_RELEASED",
  runDayIndex:day.runDayIndex,selectedAtUtc:draw.selectedAtUtc,
  committedDrawSha256:draw.stateHash,
  dynamicTemplateSha256:digest({
    schema:input.schema,day:day.runDayIndex,calendar:day.calendarHash,
    config:day.configHash,frame:day.frameHash,
    contract:input.providerContractSha256,
    templates:requests.map(r=>({...r,icao:undefined,plannedAirportSelectionUtc:undefined}))
  }),
  sourceCandidateDigestSha256:digest({
    day:day.runDayIndex,earlyDraw:draw.stateHash,requests
  }),
  acquisitionCount:12,plannedPhysicalGetCount:12,candidateFidsApiUnits:24,
  actualChargeDayUtcCounts:charges,acquisitions:requests,
  actualGithubRunPrearmVerified:false,actualSourceOriginalCommitted:false,
  actualFlightLevelPreCertified:false,authorizedSourceRights:false,
  authorizesPaidGet:false,phase5FreezePassed:false,phase6Go:false
 };
}
