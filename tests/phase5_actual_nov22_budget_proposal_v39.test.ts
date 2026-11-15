import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {buildP5ProspectiveSeedCalendarPreview} from "../scripts/v39_phase5_prospective_seed_to_calendar_preview_v39.mjs";
import {proposeP5ActualNov22Budget} from "../server/lib/disruption/phase5ActualNov22BudgetProposal_v39";
const seedBytes=readFileSync("data-collection/phase5/planning/2026-11-15_actual_first_seed_43700154416.json");
const seedBundle=JSON.parse(seedBytes.toString("utf8"));
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const ownerEvidenceBytes=readFileSync("data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json");
const dateCandidateBytes=readFileSync("data-collection/phase5/planning/2026-11-15_nov22_service_start_date_only_candidate.json");
function actual(){
 expect(hash(seedBytes)).toBe("66e523802a513b9ce57ca1130ad282577ff53fa7522c78364ba5ef72f72f0d93");
 const x=buildP5ProspectiveSeedCalendarPreview({seedBundle,expected:{
  bundleCommitmentSha256:"925b94cbb236d0a981637eeccae985a2924cc3f11afcb47727b3acf93e792bcf",
  reviewedCodeSha:"09b80926caae24ba07a1f8a20c819090d8f2528c",workflowRunId:"43700154416",
  dateCandidateBytesSha256:"9be154ce8ac2d897643558ff0c575a83a33bc8a4f77768d68fdd791a73c12311",
  firstRunDateUtc:"2026-11-22"},ownerEvidenceBytes,dateCandidateBytes});
 expect(x.sha256).toBe("003885e93f3a3daa1098f648502c5a7dd3beb6e317e906ffe281760aaba763af");
 return x.result.calendarDraft;
}
describe("original actual first randomization and seven-category cap PROPOSAL",()=>{
 it("reproduces the expired-artifact-independent exact preview, no new seed",()=>{
  const x=actual();expect(x.calendarDays).toHaveLength(31);expect(x.futureOrdinaryAirportsSelected).toBe(0);
 });
 it("allocates exact real-calendar UTC caps and conservatively accounts for the reset day",()=>{
  const b=proposeP5ActualNov22Budget(actual());
  expect(b.totals).toEqual({FIDS_BASE_UNITS:11904,FIDS_SPLIT_UNITS:384,FIDS_RETRY_UNIT_BUDGET:1280,
   VALIDATION_UNIT_BUDGET:496,OUTCOME_REST_UNIT_BUDGET:27520,HISTORY_BOOTSTRAP_UNIT_BUDGET:0,DIAGNOSTIC_UNIT_BUDGET:376});
  expect(b.explicitOtherOnlyChargeDates).toEqual(["2026-11-29","2026-11-30","2026-12-01","2027-01-05","2027-01-06"]);
  expect(b.physicalUtcRows).toHaveLength(47);expect(b.peakDailyUnits).toBe(1228);
  expect(b.totalReservedUnits).toBe(41960);expect(b.unallocatedUnits).toBe(7040);
  expect(b.renewal.conservativePriorCycleMax).toBe(9708);expect(b.renewal.conservativeNextCycleMax).toBe(32596);
  expect(b.alert.currentUnbufferedHeadroom).toBe(830);expect(b.phase6PaidGo).toBe(false);
  expect(b.providerCalls).toBe(0);expect(b.databaseWrites).toBe(0);
 });
 it("refuses a revised calendar rather than silently redrawing",()=>{
  const d=actual();d.calendarDays[0].startUtc="2026-11-23T00:00:00.000Z";
  expect(()=>proposeP5ActualNov22Budget(d)).toThrow("FIRST_REAL_CALENDAR_BYTES_REQUIRED");
 });
});
