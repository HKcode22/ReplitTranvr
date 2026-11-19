import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {
  rebindPhase6ScheduleForReviewOnly,
  verifyPhase6ScheduleRebind,
} from "../server/lib/disruption/phase6ScheduleRebindReview_v39";

function readPlan(name:string):Record<string,unknown>{
  return JSON.parse(readFileSync(new URL(
    \`../data-collection/phase5/planning/\${name}\`,
    import.meta.url,
  ),"utf8")) as Record<string,unknown>;
}

describe("Phase 6 review-only schedule rebind",()=>{
  it("shifts the existing Day 1 geometry by exactly one UTC day",()=>{
    const original=readPlan("phase6-source-day-01.json");
    const candidate=rebindPhase6ScheduleForReviewOnly(original,24);
    const verdict=verifyPhase6ScheduleRebind(original,candidate,24);
    expect(verdict.pass).toBe(true);
    expect(verdict.templateCount).toBe(192);
    expect(candidate.runDayIndex).toBe(1);
    expect(candidate.expectedServiceStartUtc).toBe("2026-11-22T00:00:00.000Z");
    const rows=candidate.templates as Array<Record<string,unknown>>;
    expect(rows[0].scheduledRequestUtc).toBe("2026-11-20T23:45:00.000Z");
    expect(rows.map(row=>row.queryKey)).toEqual(
      (original.templates as Array<Record<string,unknown>>).map(row=>row.queryKey),
    );
    expect(original.expectedServiceStartUtc).toBe("2026-11-21T00:00:00.000Z");
  });

  it("shifts the final service day to Dec 25 without changing its 192-row shape",()=>{
    const original=readPlan("phase6-source-day-31.json");
    const candidate=rebindPhase6ScheduleForReviewOnly(original,24);
    const verdict=verifyPhase6ScheduleRebind(original,candidate,24);
    expect(verdict.pass).toBe(true);
    expect(verdict.templateCount).toBe(192);
    expect(candidate.expectedServiceStartUtc).toBe("2026-12-25T00:00:00.000Z");
  });

  it("rejects partial-day and excessive review offsets",()=>{
    const original=readPlan("phase6-source-day-01.json");
    expect(()=>rebindPhase6ScheduleForReviewOnly(original,12)).toThrow(
      "review-rebind-offset-must-be-positive-whole-days",
    );
    expect(()=>rebindPhase6ScheduleForReviewOnly(original,192)).toThrow(
      "review-rebind-offset-must-be-positive-whole-days",
    );
  });

  it("does not create authorization or alter non-UTC content",()=>{
    const original=readPlan("phase6-source-day-01.json");
    const candidate=rebindPhase6ScheduleForReviewOnly(original,24);
    expect(candidate.schema).toBe(original.schema);
    expect(candidate.expectedDrawType).toBe(original.expectedDrawType);
    expect(candidate.reviewedRefreshTiming).toEqual(original.reviewedRefreshTiming);
    expect(candidate.reviewedSegmentedSource).toEqual(original.reviewedSegmentedSource);
  });
});
