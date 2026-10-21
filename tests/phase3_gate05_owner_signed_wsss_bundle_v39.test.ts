import {describe,it,expect} from "vitest";
import {planGate05WsssSignedWindowV39} from
  "../scripts/v39_gate05_owner_signed_wsss_bundle_v39";
describe("Gate05 approved 90-minute owner signing window (NO provider IO)",()=>{
  it("binds an exact reviewed WSSS 40-minute execution window",()=>{
    const x=planGate05WsssSignedWindowV39(
      Date.parse("2026-10-21T00:00:00.000Z"),
      "2026-10-21T03:00:00.000Z"
    );
    expect(x).toEqual({
      startsAtUtc:"2026-10-21T03:00:00.000Z",
      expiresAtUtc:"2026-10-21T03:40:00.000Z",
      fromLocal:"2026-10-21T11:05",
      toLocal:"2026-10-21T11:15"
    });
    expect(Date.parse(x.expiresAtUtc)-Date.parse(x.startsAtUtc))
      .toBe(40*60000);
  });
  it("accepts exact 90-minute lead and rejects 1ms less",()=>{
    const start="2026-10-21T13:45:00.000Z";
    const instant=Date.parse(start)-90*60000;
    expect(planGate05WsssSignedWindowV39(instant,start).startsAtUtc)
      .toBe(start);
    expect(()=>planGate05WsssSignedWindowV39(instant+1,start))
      .toThrow("GATE05_AUTH_BUILDER_HOLD_START_LEAD_90M_TO_20H");
  });
  it("handles midnight rollover in Singapore correctly",()=>{
    const x=planGate05WsssSignedWindowV39(
      Date.parse("2026-10-20T15:40:01.000Z"),
      "2026-10-20T18:00:00.000Z"
    );
    expect(x).toEqual({
      startsAtUtc:"2026-10-20T18:00:00.000Z",
      expiresAtUtc:"2026-10-20T18:40:00.000Z",
      fromLocal:"2026-10-21T02:05",
      toLocal:"2026-10-21T02:15"
    });
  });
  it("rejects arbitrary past and near-expiry start",()=>{
    const now=Date.parse("2026-10-20T15:40:01.000Z");
    for(const proposed of [
      "2026-10-20T15:45:00.000Z",
      "2026-10-20T17:00:00.000Z",
      "2026-10-21T15:45:00.000Z",
      "2026-10-20T18:01:00.000Z"
    ])expect(()=>planGate05WsssSignedWindowV39(now,proposed))
      .toThrow("GATE05_AUTH_BUILDER_HOLD_START_LEAD_90M_TO_20H");
  });
  it("rejects missing, malformed or non-canonical UTC",()=>{
    const now=Date.parse("2026-10-20T15:40:01.000Z");
    for(const invalid of [
      "", "2026-10-20T18:00Z","2026-10-20T18:00:00-07:00",
      "2026-10-20T18:00:00.000+00:00",
      "2026-10-20T18:00:00.050Z",
      "2026-02-30T18:00:00.000Z"
    ])expect(()=>planGate05WsssSignedWindowV39(now,invalid))
      .toThrow(/^GATE05_AUTH_BUILDER_HOLD_/);
  });
  it("rejects invalid clock independently of source or owner confirmation",()=>{
    expect(()=>planGate05WsssSignedWindowV39(
      NaN,"2026-10-21T03:00:00.000Z"
    )).toThrow("GATE05_AUTH_BUILDER_HOLD_CLOCK");
    expect(()=>planGate05WsssSignedWindowV39(
      Date.parse("2024-01-01T00:00:00Z"),
      "2026-10-21T03:00:00.000Z"
    )).toThrow("GATE05_AUTH_BUILDER_HOLD_CLOCK");
  });
});