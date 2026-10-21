import {describe,it,expect} from "vitest";
import {
  planGate05SafetyCredentialRotationV39
} from "../scripts/v39_gate05_provision_safety_credential_once_v39";
const HEAD="a".repeat(40);
const CONFIRM="PROVISION_G05_STOP_ONLY_NO_PROVIDER";
const now=Date.parse("2026-10-22T00:00:00.000Z");

describe("Gate05 safety-only one-session rotation timing (NO I/O)",()=>{
  it("accepts a 3h future target, guarantees STOP coverage",()=>{
    const x=planGate05SafetyCredentialRotationV39(
      now,"2026-10-22T03:00:00.000Z",HEAD,CONFIRM
    );
    expect(x).toEqual({
      expectedHead:HEAD,
      startUtc:"2026-10-22T03:00:00.000Z",
      expiresUtc:"2026-10-22T06:00:00.000Z",
      maximumProviderRequests:0,
      automaticActivation:false,
      environment:"gate05-safety"
    });
  });
  it("rejects before the 2h lead and after the 5h credential window",()=>{
    for(const date of [
      "2026-10-22T01:45:00.000Z","2026-10-22T05:15:00.000Z"
    ])expect(()=>planGate05SafetyCredentialRotationV39(
      now,date,HEAD,CONFIRM
    )).toThrow("GATE05_SAFETY_PROVISION_HOLD_ROTATION_TIME_WINDOW_2_TO_5_HOURS");
  });
  it("refuses near matches, malformed clocks and unauthorized source",()=>{
    for(const bad of [
      "2026-10-22T03:00Z","2026-10-22T03:00:00-07:00",
      "2026-10-22T03:00:00.020Z","2026-10-22T03:01:00.000Z",
      "2026-02-30T03:00:00.000Z"
    ])expect(()=>planGate05SafetyCredentialRotationV39(
      now,bad,HEAD,CONFIRM
    )).toThrow(/^GATE05_SAFETY_PROVISION_HOLD_/);
    expect(()=>planGate05SafetyCredentialRotationV39(
      now,"2026-10-22T03:00:00.000Z","wrong",CONFIRM
    )).toThrow("GATE05_SAFETY_PROVISION_HOLD_SOURCE_OR_CONFIRM");
    expect(()=>planGate05SafetyCredentialRotationV39(
      now,"2026-10-22T03:00:00.000Z",HEAD,"PLEASE_RUN"
    )).toThrow("GATE05_SAFETY_PROVISION_HOLD_SOURCE_OR_CONFIRM");
  });
});
