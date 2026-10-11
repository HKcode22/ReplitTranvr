import {describe,expect,it} from "vitest";
import {
  makeYssyZeroCreditPreparationReceiptV39 as make,
  YSSY_20261012_UTC_START_V39,
  YSSY_20261012_UTC_END_V39,
  YSSY_FROZEN_LOCAL_TIME_SHA256_V39
} from "../scripts/v39_phase2g_yssy_20261012_zero_credit_prep_v39";

const params=()=>({
  sourceHead:"a".repeat(40),branch:"phase2g-review",
  observedAtUtc:new Date("2026-10-11T12:00:00Z"),
  frozenProtocolSha256:YSSY_FROZEN_LOCAL_TIME_SHA256_V39,
  calendarEligible:true,utcWeekdayClass:"weekday",
  localWeekdayClass:"weekday",slotEligible:true,outsideCurfew:true
});
describe("P19 YSSY Oct12 UTC read-only operator preparation receipt",()=>{
  it("produces a ZERO CREDIT draft, correct frozen Monday UTC/Sydney and Sunday PDT window",()=>{
    const x=make(params());
    expect(x.window_start_utc).toBe(YSSY_20261012_UTC_START_V39);
    expect(x.window_end_utc).toBe(YSSY_20261012_UTC_END_V39);
    expect(x.california_window).toContain("Sunday");
    expect(x.sydney_window).toContain("Monday");
    expect(x.source_git_head).toBe("a".repeat(40));
    expect(x.source_is_main).toBe(false);
    expect(x.frozen_calendar_class_eligible).toBe(true);
    expect(x.provider_calls).toBe(0);
    expect(x.database_mutations).toBe(0);
    expect(x.alert_credits_spent).toBe(0);
    expect(x.paid_launch_authorized).toBe(false);
    expect(x.effective_paid_6plus6_verified).toBe(false);
    expect(x.go_no_go).toBe("HOLD_UNTIL_FRESH_AUTH_AND_LIVE_ADMISSION_EVIDENCE");
  });
  it("refuses wrong UTC/Sydney weekday or curfew result; local Sunday alone cannot veto correct Monday",()=>{
    for(const bad of [
      {calendarEligible:false},{utcWeekdayClass:"weekend"},
      {localWeekdayClass:"weekend"},{slotEligible:false},
      {outsideCurfew:false},{frozenProtocolSha256:"0".repeat(64)},
      {sourceHead:"a".repeat(39)},{observedAtUtc:new Date("bad")}
    ])expect(()=>make({...params(),...bad})).toThrow(
      "YSSY_ZERO_CREDIT_PREP_REFUSED:FROZEN_CALENDAR_OR_SOURCE"
    );
  });
  it("never fabricates a newly approved retry after three failed YSSY attempts",()=>{
    const x=make({...params(),branch:"main"});
    expect(x.source_is_main).toBe(true);
    expect(x.previously_failed_probe_ids).toEqual([16,17,18]);
    expect(x.consumed_recovery_authorizations_cannot_be_reused).toBe(true);
    expect(x.new_prospective_bounded_retry_amendment_authorized).toBe(false);
    expect(x.new_exact_stage1_auth_approved).toBe(false);
    expect(x.stage1_scientific_match_not_yet_measured).toBe(true);
  });
});
