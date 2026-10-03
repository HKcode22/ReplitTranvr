import { describe, expect, it } from "vitest";
import {
  loadYssyOperatingHoursProtocolV39,
  PHASE2G_YSSY_LOCAL_OPERATING_HOURS_PROTOCOL_ARTIFACT_PATH,
  yssyStage1TimeClassStatusV39,
  yssyStage1TimeClassV39,
} from "../server/lib/disruption/yssyOperatingHours_v39";

const PROTOCOL_SHA =
  "ad6224fb7fc83de42021c9f75a705892c7130614f4a72276b47fa2c246dd4991";

describe("Phase2G YSSY local operating-hours protocol", () => {
  it("loads the exact prospective protocol", () => {
    const loaded = loadYssyOperatingHoursProtocolV39({
      expectedSha256: PROTOCOL_SHA,
      path: PHASE2G_YSSY_LOCAL_OPERATING_HOURS_PROTOCOL_ARTIFACT_PATH,
    });
    expect(loaded.fileSha256).toBe(PROTOCOL_SHA);
    expect(loaded.protocol.target_icao).toBe("YSSY");
    expect(loaded.protocol.selected_stage1_utc_slot_hour).toBe(4);
    expect(loaded.protocol.execution_authorized).toBe(false);
  });

  it("overrides only the Stage-1 slot and retains Stage-2 class", () => {
    const { protocol } = loadYssyOperatingHoursProtocolV39({
      expectedSha256: PROTOCOL_SHA,
    });
    const out = yssyStage1TimeClassV39(protocol, {
      stage1UtcSlotHour: 12,
      stage1WeekdayClass: "weekday",
      stage2UtcSlotHour: 12,
      stage2WeekdayClass: "weekday",
    });
    expect(out).toEqual({
      stage1UtcSlotHour: 4,
      stage1WeekdayClass: "weekday",
      stage2UtcSlotHour: 12,
      stage2WeekdayClass: "weekday",
    });
  });

  it("accepts the preferred Monday AEDT start", () => {
    const { protocol } = loadYssyOperatingHoursProtocolV39({
      expectedSha256: PROTOCOL_SHA,
    });
    const s = yssyStage1TimeClassStatusV39(
      new Date("2026-10-05T03:00:00.000Z"),
      protocol,
    );
    expect(s.eligible).toBe(true);
    expect(s.utcWeekdayClass).toBe("weekday");
    expect(s.localWeekdayClass).toBe("weekday");
    expect(s.targetWindowOutsideCurfew).toBe(true);
  });

  it("also accepts the frozen slot in AEST before DST", () => {
    const { protocol } = loadYssyOperatingHoursProtocolV39({
      expectedSha256: PROTOCOL_SHA,
    });
    const s = yssyStage1TimeClassStatusV39(
      new Date("2026-10-02T03:00:00.000Z"),
      protocol,
    );
    expect(s.eligible).toBe(true);
    expect(s.targetWindowOutsideCurfew).toBe(true);
  });

  it("rejects the superseded 11 UTC start near the curfew", () => {
    const { protocol } = loadYssyOperatingHoursProtocolV39({
      expectedSha256: PROTOCOL_SHA,
    });
    const s = yssyStage1TimeClassStatusV39(
      new Date("2026-10-05T11:00:00.000Z"),
      protocol,
    );
    expect(s.eligible).toBe(false);
    expect(s.utcSlotEligible).toBe(false);
    expect(s.targetWindowOutsideCurfew).toBe(false);
  });

  it("rejects weekend execution even when the UTC slot matches", () => {
    const { protocol } = loadYssyOperatingHoursProtocolV39({
      expectedSha256: PROTOCOL_SHA,
    });
    const s = yssyStage1TimeClassStatusV39(
      new Date("2026-10-04T03:00:00.000Z"),
      protocol,
    );
    expect(s.eligible).toBe(false);
    expect(s.utcWeekdayClass).toBe("weekend");
    expect(s.localWeekdayClass).toBe("weekend");
  });
});
