import {describe,expect,it} from "vitest";
import {executeGate3WatchdogSidecarV39,
  GATE3_WATCHDOG_LIVE_RELEASED_V39}
  from "../scripts/v39_gate3_independent_watchdog_v39";

describe("manual GitHub independent sidecar remains sealed before all provider/SQL IO",()=>{
  it("has a source-level immutable FALSE paid/recovery IO release switch",()=>{
    expect(GATE3_WATCHDOG_LIVE_RELEASED_V39).toBe(false);
  });
  it("refuses the live sidecar BEFORE it reads env, SQL or provider",async()=>{
    await expect(executeGate3WatchdogSidecarV39({
      authId:"AUTH-20261017-G3WSSS",
      authFile:"data-collection/authorizations/unissued.json",
      authSha:"a".repeat(64),
      sessionId:"1789c946-f0f1-4b51-a25b-3fb41d7caf97",
      expectedGitHead:"b".repeat(40),
      startUtc:"2026-10-17T13:00:00Z",
      callbackBase:"https://replit-tranvr--hk84164.replit.app",
      confirmed:"WATCH_G3_WSSS_EXACT_NO_CREATE",
    })).rejects.toThrow("GATE3_SIDECAR_SOURCE_NOT_RELEASED_BEFORE_ANY_IO");
  });
});
