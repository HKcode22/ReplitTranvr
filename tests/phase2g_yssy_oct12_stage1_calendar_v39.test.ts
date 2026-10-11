import {describe,it,expect} from "vitest";
import {
  loadYssyOperatingHoursProtocolV39,
  yssyStage1TimeClassStatusV39
} from "../server/lib/disruption/yssyOperatingHours_v39";

const FREEZE_SHA="ad6224fb7fc83de42021c9f75a705892c7130614f4a72276b47fa2c246dd4991";

describe("Phase2G YSSY Oct 11/12 calendar boundary (offline, no provider)",()=>{
  const getProtocol=()=>loadYssyOperatingHoursProtocolV39({expectedSha256:FREEZE_SHA}).protocol;

  it("refuses Sunday Oct 11 UTC 03:00 because both Sydney and UTC are weekend",()=>{
    const p=getProtocol();
    const result=yssyStage1TimeClassStatusV39(new Date("2026-10-11T03:00:00.000Z"),p);
    expect(result.eligible).toBe(false);
    expect(result.utcWeekdayClass).toBe("weekend");
    expect(result.localWeekdayClass).toBe("weekend");
    expect(result.utcSlotEligible).toBe(true);
    expect(result.targetWindowOutsideCurfew).toBe(true);
  });

  it("accepts the FROZEN date/time class Mon Oct 12 03:00 UTC = Sun Oct 11 20 PDT = Mon 14 AEDT",()=>{
    const p=getProtocol();
    const t=new Date("2026-10-12T03:00:00.000Z");
    const s=yssyStage1TimeClassStatusV39(t,p);
    expect(s.eligible).toBe(true);
    expect(s.utcWeekdayClass).toBe("weekday");
    expect(s.localWeekdayClass).toBe("weekday");
    expect(s.utcSlotEligible).toBe(true);
    expect(s.targetWindowOutsideCurfew).toBe(true);
    expect(p.target_minutes).toBe(120);
    expect(p.execution_authorized).toBe(false);
    const f=(tz:string)=>new Intl.DateTimeFormat("en-GB",{
      timeZone:tz,weekday:"short",year:"numeric",month:"2-digit",day:"2-digit",
      hour:"2-digit",minute:"2-digit",hourCycle:"h23"
    }).format(t);
    expect(f("America/Los_Angeles")).toContain("Sun");
    expect(f("America/Los_Angeles")).toContain("20:00");
    expect(f("Australia/Sydney")).toContain("Mon");
    expect(f("Australia/Sydney")).toContain("14:00");
  });

  it("accepts the next Tue Oct 13 03:00 UTC after any nonauthorized Monday slot is skipped",()=>{
    const s=yssyStage1TimeClassStatusV39(new Date("2026-10-13T03:00:00.000Z"),getProtocol());
    expect(s.eligible).toBe(true);
    expect(s.localWeekdayClass).toBe("weekday");
  });

  it("still refuses unauthorized early start Oct 12 02:59 UTC despite weekday",()=>{
    const s=yssyStage1TimeClassStatusV39(new Date("2026-10-12T02:59:00.000Z"),getProtocol());
    expect(s.eligible).toBe(false);
    expect(s.utcSlotEligible).toBe(false);
  });
});
