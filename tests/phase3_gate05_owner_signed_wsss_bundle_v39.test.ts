import {describe,it,expect} from "vitest";
import {planGate05WsssSignedWindowV39} from
  "../scripts/v39_gate05_owner_signed_wsss_bundle_v39";
describe("Gate05 source-free owner signing window (NO provider IO)",()=>{
  it("calculates one exact 40 minute window and two 10min WSSS local queries",()=>{
    const x=planGate05WsssSignedWindowV39(
      Date.parse("2026-10-20T03:07:01.000Z")
    );
    expect(x).toEqual({
      startsAtUtc:"2026-10-20T03:45:00.000Z",
      expiresAtUtc:"2026-10-20T04:25:00.000Z",
      fromLocal:"2026-10-20T11:50",
      toLocal:"2026-10-20T12:00"
    });
    expect(Date.parse(x.expiresAtUtc)-Date.parse(x.startsAtUtc))
      .toBe(40*60000);
  });
  it("handles midnight rollover in Singapore correctly",()=>{
    const x=planGate05WsssSignedWindowV39(
      Date.parse("2026-10-20T15:40:01.000Z")
    );
    expect(x).toEqual({
      startsAtUtc:"2026-10-20T16:15:00.000Z",
      expiresAtUtc:"2026-10-20T16:55:00.000Z",
      fromLocal:"2026-10-21T00:20",
      toLocal:"2026-10-21T00:30"
    });
  });
  it("never makes an arbitrary past timestamp a valid authorization",()=>{
    expect(()=>planGate05WsssSignedWindowV39(NaN))
      .toThrow("GATE05_AUTH_BUILDER_HOLD_CLOCK");
    expect(()=>planGate05WsssSignedWindowV39(Date.parse(
      "2024-01-01T00:00:00Z"
    ))).toThrow("GATE05_AUTH_BUILDER_HOLD_CLOCK");
  });
});