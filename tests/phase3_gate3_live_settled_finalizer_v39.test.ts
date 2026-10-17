import {createHash} from "node:crypto";
import {beforeEach,describe,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {verifyGate3PublishedPrepaidHostV39}
  from "../server/lib/disruption/gate3OwnedPreExposure_v39";
import {getBalanceEvidenceStrict,listSubscriptionsStrictWithRetry}
  from "../server/lib/disruption/aerodataboxLimiter_v3";
import {verifyGate3OriginalCustodyV39}
  from "../server/lib/disruption/gate3LiveOriginalCustody_v39";
import {commitGate3TerminalDispositionV39}
  from "../server/lib/disruption/gate3CanaryTerminalOwner_v39";
import {finalizeGate3LiveSettledCandidateV39}
  from "../server/lib/disruption/gate3LiveSettledFinalizer_v39";

vi.mock("node:fs",()=>({readFileSync:vi.fn()}));
vi.mock("node:child_process",()=>({execFileSync:vi.fn()}));
vi.mock("../server/lib/disruption/gate3OwnedPreExposure_v39",()=>({
  verifyGate3PublishedPrepaidHostV39:vi.fn()
}));
vi.mock("../server/lib/disruption/aerodataboxLimiter_v3",()=>({
  getBalanceEvidenceStrict:vi.fn(),
  listSubscriptionsStrictWithRetry:vi.fn()
}));
vi.mock("../server/lib/disruption/gate3LiveOriginalCustody_v39",()=>({
  verifyGate3OriginalCustodyV39:vi.fn()
}));
vi.mock("../server/lib/disruption/gate3CanaryTerminalOwner_v39",()=>({
  commitGate3TerminalDispositionV39:vi.fn()
}));
vi.mock("../server/lib/disruption/replitProviderBlobStore_v39",()=>({
  createRequiredProviderBlobStoreV39:vi.fn(()=>({
    downloadBytes:vi.fn()
  }))
}));

const PIN="5ddf44ffb9a1667271e56304ee865b95400c63d6";
const SID="1789c946-f0f1-4b51-a25b-3fb41d7caf97";
const WINDOW="WSSS/departures/2026-10-16T20:00:00Z+600s";
const AUTH="AUTH-20261016-G3C1";
const auth={
  authorizationId:AUTH,phaseGate:"Phase 3 / Gate 3",
  airportFilterWindow:WINDOW,maxAlertCredits:50,
  maxRestUnitsByCategory:null,
  startNotBeforeUtc:"2026-10-16T19:55:00Z",
  expiresAtUtc:"2030-10-17T00:00:00Z",
  cleanupOwner:"Gate3 exact owner",
  predecessorEvidenceIds:["RUN-20261016-G3PRE"]
};
const raw=JSON.stringify(auth);
const hash=createHash("sha256").update(raw).digest("hex");

const makeInput=()=>({
  expectedPublishedGitHead:PIN,
  plan:{
    ownerKind:"phase3_credit_canary",icao:"WSSS",
    deferCleanup:true,
    hardCapCredits:50,balanceBefore:1610,
    targetHours:600/3600,
    prearmedGate3:{
      sessionId:SID,icao:"WSSS",
      authorizationEvidenceSha256:hash,
      authArtifactRaw:raw,expectedAuthId:AUTH,
      expectedAirportFilterWindow:WINDOW,
      canaryCreditCeiling:50,fixedExposureSeconds:600
    }
  },
  result:{
    status:"settling",runtimeSessionId:SID,
    subscriptionDeleted:true,
    reconciliationStatus:"MATCH",
    durationCensored:false,stopReason:null,
    externalCredits:1,internalSendCredits:1,
    settlementReads:3,
    metrics:{
      internalSendCredits:1,notificationItemsReceived:1,
      deliveryCount:1,callbackFailures:0,costItemDisagreementCount:0
    }
  }
}) as any;

function database(){
  const query=vi.fn(async (sql:string)=>{
    if(sql.startsWith("BEGIN")||sql==="ROLLBACK")return {rows:[],rowCount:0};
    if(sql.includes("FROM clean.prepaid_probe_session_runtime"))
      return {rows:[{
        provider_subscription_id:"provider-exact-123",
        owner_kind:"phase3_credit_canary",
        state:"settling",icao:"WSSS"
      }],rowCount:1};
    throw Error("UNEXPECTED_TEST_SQL");
  });
  const release=vi.fn();
  return {pool:{connect:async()=>({query,release})} as any,query,release};
}

beforeEach(()=>{
  vi.clearAllMocks();
  vi.mocked(readFileSync).mockReturnValue(
    `RUN-20261016-G3PRE\nAUTH_ARTIFACT_SHA256:${hash}\n`
  );
  vi.mocked(execFileSync).mockReturnValue("source-identical-tree");
  vi.mocked(verifyGate3PublishedPrepaidHostV39)
    .mockResolvedValue(undefined);
  vi.mocked(listSubscriptionsStrictWithRetry)
    .mockResolvedValue([]);
  vi.mocked(getBalanceEvidenceStrict)
    .mockResolvedValue({balance:{creditsRemaining:1609},quota:{}} as any);
  vi.mocked(verifyGate3OriginalCustodyV39)
    .mockResolvedValue({
      deliveries:1,notificationItems:1,internalCredits:1,
      evidenceSha256:"e".repeat(64)
    } as any);
  vi.mocked(commitGate3TerminalDispositionV39)
    .mockResolvedValue({
      disposition:"SETTLED_CANDIDATE_DURABLY_RECORDED"
    } as any);
});

describe("Gate3 actual post-provider owner finalizer without caller authenticity booleans",()=>{
  it("commits ONLY a source + provider-checked immutable candidate, not a certified pass",async()=>{
    const d=database();
    const receipt=await finalizeGate3LiveSettledCandidateV39(d.pool,makeInput());
    expect(receipt.status).toBe("SETTLED_CANDIDATE_RECORDED_NOT_CRYPTOGRAPHIC_ORIGIN_PASS");
    expect(receipt.liveGate3Certified).toBe(false);
    expect(receipt.verifiedReceivedCredits).toBe(1);
    expect(commitGate3TerminalDispositionV39).toHaveBeenCalledOnce();
    const input=vi.mocked(commitGate3TerminalDispositionV39).mock.calls[0][1];
    expect(input.sourceReadbackVerified).toBe(true);
    expect(input.publishedReceiverParityVerified).toBe(true);
    expect(input.foreignActiveBillableCount).toBe(0);
    expect(d.query.mock.calls.map(x=>x[0])).toEqual([
      "BEGIN TRANSACTION READ ONLY",expect.stringContaining("provider_subscription_id"),
      "ROLLBACK"
    ]);
  });
  it("refuses an unapproved human AUTH hash before public/provider IO",async()=>{
    vi.mocked(readFileSync).mockReturnValue("RUN-20261016-G3PRE\n");
    const d=database();
    await expect(finalizeGate3LiveSettledCandidateV39(d.pool,makeInput()))
      .rejects.toThrow("GATE3_FINALIZER_AUTH_OR_WINDOW_MISMATCH");
    expect(d.query).not.toHaveBeenCalled();
    expect(verifyGate3PublishedPrepaidHostV39).not.toHaveBeenCalled();
  });
  it("refuses provider active subscriptions and never terminalizes",async()=>{
    vi.mocked(listSubscriptionsStrictWithRetry).mockResolvedValue([{
      id:"foreign",isActive:true,billingType:"CreditBased"
    }] as any);
    const d=database();
    await expect(finalizeGate3LiveSettledCandidateV39(d.pool,makeInput()))
      .rejects.toThrow("GATE3_FINALIZER_ACTIVE_BILLABLE_SUBSCRIPTION_HOLD");
    expect(commitGate3TerminalDispositionV39).not.toHaveBeenCalled();
  });
  it("refuses post-run credit delta drift without writing SETTLED",async()=>{
    vi.mocked(getBalanceEvidenceStrict)
      .mockResolvedValue({balance:{creditsRemaining:1608},quota:{}} as any);
    const d=database();
    await expect(finalizeGate3LiveSettledCandidateV39(d.pool,makeInput()))
      .rejects.toThrow("GATE3_FINALIZER_AUTHORITATIVE_SPEND_NOT_MATCHED");
    expect(commitGate3TerminalDispositionV39).not.toHaveBeenCalled();
  });
  it("refuses missing real-original source proof",async()=>{
    vi.mocked(verifyGate3OriginalCustodyV39).mockRejectedValue(Error("MISSING_BLOB"));
    const d=database();
    await expect(finalizeGate3LiveSettledCandidateV39(d.pool,makeInput()))
      .rejects.toThrow("MISSING_BLOB");
    expect(commitGate3TerminalDispositionV39).not.toHaveBeenCalled();
  });
  it("never examines the account after censored/uncertain deletion",async()=>{
    const d=database(),input=makeInput();
    input.result.subscriptionDeleted=false;
    await expect(finalizeGate3LiveSettledCandidateV39(d.pool,input))
      .rejects.toThrow("GATE3_FINALIZER_UNSETTLED_OR_SCOPE_INVALID");
    expect(getBalanceEvidenceStrict).not.toHaveBeenCalled();
    expect(commitGate3TerminalDispositionV39).not.toHaveBeenCalled();
  });
});
