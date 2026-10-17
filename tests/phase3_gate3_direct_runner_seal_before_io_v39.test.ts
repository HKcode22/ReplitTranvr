/**
 * Direct Gate3 runner regression: no DB session review, provider SDK, or
 * callback IO may occur without a freshly authenticated independent watchdog
 * before-CREATE hook even if the source release switch is true.
 * Both potentially sensitive dependencies are mock-blocked in this test.
 */
import {randomUUID} from "node:crypto";
import {describe,expect,it,vi} from "vitest";
import {
  runPrepaidLiveWindowV39,GATE3_PROVIDER_EXPOSURE_RELEASED_V39,
  type PrepaidLiveWindowInputV39,
} from "../server/lib/disruption/prepaidProbeWindow_v39";

vi.mock("../server/lib/disruption/db_v39",async load=>{
 const actual=await load<typeof import("../server/lib/disruption/db_v39")>();
 return {...actual,v39Pool:{connect:()=>{throw Error("FORBIDDEN_DB_CONNECT_IN_SEALED_GATE3_TEST");}}};
});
vi.mock("../server/lib/disruption/aerodataboxLimiter_v3",async load=>{
 const actual=await load<typeof import("../server/lib/disruption/aerodataboxLimiter_v3")>();
 const forbidden=()=>{throw Error("FORBIDDEN_PROVIDER_CALL_IN_SEALED_GATE3_TEST");};
 return {...actual,
   getBalance:forbidden,createSubscription:forbidden,
   deleteSubscriptionVerifiedStrict:forbidden,
   listSubscriptionsStrictWithRetry:forbidden};
});

describe("Gate3 direct runner: mandatory independent watchdog hook before IO",()=>{
 it("rejects a syntactically valid synthetic prearmed Gate3 session before DB or provider",async()=>{
   expect(GATE3_PROVIDER_EXPOSURE_RELEASED_V39).toBe(true);
   const id=randomUUID();
   const input:PrepaidLiveWindowInputV39={
     ownerKind:"phase3_credit_canary",
     prearmedGate3:{
       sessionId:id,icao:"WSSS",fixedExposureSeconds:300,
       canaryCreditCeiling:12,authorizationEvidenceSha256:"f".repeat(64),
       authArtifactRaw:"{synthetic-only-not-approved}",
       expectedAuthId:"AUTH-20261016-MOCKONLY",
       expectedAirportFilterWindow:"WSSS/departures/2026-10-16T18:00:00Z+300s",
     },
     icao:"WSSS",ownerProbeId:null,stage:null,
     targetHours:300/3600,hardCapCredits:12,settledOtherCredits:0,
     balanceBefore:2300,
     settlement:{initialWaitSeconds:0,pollIntervalSeconds:1,
       stableReadCount:3,timeoutSeconds:30},
     deletionRunId:"synthetic-g3-seal-test",watchdogPollMs:5000,
     deferCleanup:true,
   };
   await expect(runPrepaidLiveWindowV39(input)).rejects.toThrow(
     "GATE3_FRESH_WATCHDOG_BEFORE_CREATE_REQUIRED");
 });
});
