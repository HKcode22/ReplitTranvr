import {randomUUID} from "node:crypto";
import {describe,expect,it} from "vitest";
import {sha256HexString,type AuthRecord} from
  "../server/lib/disruption/authRecord_v39";
import {reviewGate3OwnerPreflightV39,type Gate3OwnerPreflightInputV39}
  from "../server/lib/disruption/gate3OwnerAuthorizationPreflight_v39";

const now=new Date("2026-10-20T16:00:00.000Z");
const spec=(sha:string)=>({
  sessionId:randomUUID(),icao:"YSSY",authorizationEvidenceSha256:sha,
  canaryCreditCeiling:15,fixedExposureSeconds:300,
});
const scope="YSSY/departures/2026-10-20T16:00:00Z+300s";
function factory(overrides:Partial<AuthRecord>={}) {
  const record:AuthRecord={
    authorizationId:"AUTH-20261020-G3TEST",
    phaseGate:"Phase 3 / Gate 3",
    airportFilterWindow:scope,maxAlertCredits:15,
    maxRestUnitsByCategory:null,
    startNotBeforeUtc:"2026-10-20T15:00:00Z",
    expiresAtUtc:"2026-10-20T18:00:00Z",
    cleanupOwner:"operator_exact_owned_cleanup",
    predecessorEvidenceIds:["GATE-20261020-P2QUAL"],
    ...overrides,
  };
  const raw=JSON.stringify(record);
  const hash=sha256HexString(raw);
  const input:Gate3OwnerPreflightInputV39={
    authArtifactRaw:raw,
    evidenceLedgerRaw:
      "GATE-20261020-P2QUAL\nAUTH_ARTIFACT_SHA256:"+hash+"\n",
    expectedAuthId:"AUTH-20261020-G3TEST",
    expectedAirportFilterWindow:scope,
    expectedSession:spec(hash),nowUtc:now,
  };
  return input;
}
function syntheticDB(input:Gate3OwnerPreflightInputV39,
  patch:Record<string,unknown>={}) {
  let calls=0;
  const query=async()=>{
    calls++;
    return {rowCount:1,rows:[{
      session_id:input.expectedSession.sessionId,icao:"YSSY",
      authorization_evidence_sha256:input.expectedSession.authorizationEvidenceSha256,
      canary_credit_ceiling:15,fixed_exposure_seconds:300,
      durable_state:"PREPARED",durable_expires:new Date(now.getTime()+3600_000),
      owner_kind:"phase3_credit_canary",owner_probe_id:null,stage:null,
      session_icao:"YSSY",runtime_state:"armed",
      runtime_expires:new Date(now.getTime()+1800_000),
      subscription_bound:false,callback_requests_seen:0,callback_success_2xx:0,
      callback_failures:0,prepared_owner_count:1,
      ...patch,
    }]};
  };
  return {query,get calls(){return calls;}};
}
describe("Gate3 independent ledger-bound AUTH and read-only prepaid session gate",()=>{
  it("valid hash-ledger and exact session is still NEVER authorization to spend",async()=>{
    const input=factory(),db=syntheticDB(input);
    const r=await reviewGate3OwnerPreflightV39(db as any,input);
    expect(r).toMatchObject({
      status:"OFFLINE_AUTH_SESSION_CONSISTENT",reasons:[],
      approvalEvidenceInLedger:true,preparedSessionShapeVerified:true,
      paidCanaryAuthorized:false,providerCalls:0,databaseMutations:0,
      publishedReceiverVerified:false,realProviderBalanceVerified:false,
    });
    expect(db.calls).toBe(1);
  });
  it("no independently approved hash cannot even query owner DB",async()=>{
    const input=factory();
    input.evidenceLedgerRaw="GATE-20261020-P2QUAL";
    const db=syntheticDB(input);
    const r=await reviewGate3OwnerPreflightV39(db as any,input);
    expect(r).toMatchObject({status:"HOLD",paidCanaryAuthorized:false});
    expect(r.reasons).toContain("AUTH_RECORD_OR_LEDGER_NOT_VERIFIED");
    expect(db.calls).toBe(0);
  });
  it("rejects a hand-edited artifact even if old hash remains in ledger",async()=>{
    const input=factory();
    input.authArtifactRaw=input.authArtifactRaw.replace('"maxAlertCredits":15','"maxAlertCredits":17');
    const db=syntheticDB(input);
    const r=await reviewGate3OwnerPreflightV39(db as any,input);
    expect(r.reasons).toContain("AUTH_RECORD_OR_LEDGER_NOT_VERIFIED");
    expect(r.reasons).toContain("AUTH_CREDIT_CEILING_NOT_EXACT");
    expect(db.calls).toBe(0);
  });
  it("refuses another airport, duration, or unowned cleanup",async()=>{
    for(const input of [
      factory({airportFilterWindow:"SKBO/departures/2026-10-20T16:00:00Z+300s"}),
      factory({airportFilterWindow:"YSSY/departures/2026-10-20T16:00:00Z+60s"}),
      factory({cleanupOwner:null}),
      factory({maxRestUnitsByCategory:{fids:1}}),
      factory({predecessorEvidenceIds:[]}),
    ]){
      const db=syntheticDB(input);
      const r=await reviewGate3OwnerPreflightV39(db as any,input);
      expect(r.status).toBe("HOLD");
      expect(db.calls).toBe(0);
      expect(r.paidCanaryAuthorized).toBe(false);
    }
  });
  it("refuses wrong phase gate and expired AUTH",async()=>{
    for(const changed of [
      {phaseGate:"Phase 6"},
      {expiresAtUtc:"2026-10-19T12:00:00Z"},
    ]){
      const input=factory(changed);
      const db=syntheticDB(input);
      expect((await reviewGate3OwnerPreflightV39(db as any,input)).status).toBe("HOLD");
      expect(db.calls).toBe(0);
    }
  });
  it("does not mistake an already-bound or missing UNLOGGED session for ready",async()=>{
    for(const patch of [
      {subscription_bound:true},
      {owner_kind:null,runtime_state:null,runtime_expires:null},
      {prepared_owner_count:2},
    ]){
      const input=factory(),db=syntheticDB(input,patch);
      const r=await reviewGate3OwnerPreflightV39(db as any,input);
      expect(r.status).toBe("HOLD");
      expect(r.paidCanaryAuthorized).toBe(false);
      expect(db.calls).toBe(1);
    }
  });
  it("malformed inputs and JSON refuse before any source query",async()=>{
    const input=factory();
    for(const item of [
      {...input,authArtifactRaw:"broken"},
      {...input,authArtifactRaw:"[]"},
      {...input,authArtifactRaw:"{}"},
    ]){
      const db=syntheticDB(input);
      const r=await reviewGate3OwnerPreflightV39(db as any,item);
      expect(r.status).toBe("HOLD");
      expect(db.calls).toBe(0);
    }
    const db=syntheticDB(input);
    await expect(reviewGate3OwnerPreflightV39(db as any,{
      ...input,expectedAuthId:"INVALID",
    })).rejects.toThrow("GATE3_OWNER_PREFLIGHT_INPUT_INVALID");
    expect(db.calls).toBe(0);
  });
});
