import {describe,it,expect,vi} from "vitest";
import {createHash,generateKeyPairSync,randomUUID,sign} from "node:crypto";
import {gate05FidsQueryFingerprintV39} from "../server/lib/disruption/gate05ScopedFidsOwner_v39";
import {gate05Ed25519SigningMessageV39} from "../server/lib/disruption/gate05DetachedEd25519Approval_v39";
import {rehearseGate05BoundedExpiryStopRecoveryV39} from "../server/lib/disruption/gate05BoundedStopRecovery_v39";

/** Mock PostgreSQL, fake time, ephemeral self-pinned signer. NEVER live auth. */
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
function fixture(){
  const {publicKey,privateKey}=generateKeyPairSync("ed25519");
  const pub=Buffer.from(publicKey.export({format:"der",type:"spki"}));
  const scopeId=randomUUID(),expire="2026-10-20T01:30:00.000Z";
  const q={icao:"WSSS",fromLocal:"2026-10-20T09:00",toLocal:"2026-10-20T10:00"};
  const bytes=Buffer.from(JSON.stringify({
    schema:"v39.gate05.fids-feasibility-auth.v1",
    scopeId,authorizationId:"AUTH-20261020-G05RETRYTEST1",
    sourceCommit:"a".repeat(40),openapiSha256:"b".repeat(64),
    cycleId:"fixture-not-real-entitlement",
    providerResetUtc:"2026-11-04T02:21:21.000Z",
    airportIcao:"WSSS",ianaTimezone:"Asia/Singapore",
    fromLocal:q.fromLocal,toLocal:q.toLocal,
    startsAtUtc:"2026-10-20T00:55:00.000Z",expiresAtUtc:expire,
    noLocationQuerySha256:gate05FidsQueryFingerprintV39({...q,withLocation:false}),
    locationQuerySha256:gate05FidsQueryFingerprintV39({...q,withLocation:true}),
    maxBaseUnits:4,maxRetryUnits:8,maxTotalUnits:12,maxAlertCreates:0,
    purpose:"TWO_QUERY_FEASIBILITY_NOT_SCIENTIFIC_PILOT"
  }));
  return {scopeId,expire,authorization:{
    authorizationBytes:bytes,
    detachedSignatureBase64:sign(null,gate05Ed25519SigningMessageV39(bytes),privateKey).toString("base64"),
    signerPublicKeySpkiDerBase64:pub.toString("base64"),
    independentPins:{
      independentlyReviewedArtifactSha256:sha(bytes),
      expectedSourceCommit:"a".repeat(40),
      expectedOpenapiSha256:"b".repeat(64),
      expectedProviderResetUtc:"2026-11-04T02:21:21.000Z",
      expectedIanaTimezone:"Asia/Singapore",
      observedNowUtc:"2026-10-19T23:59:00.000Z",
      independentlyApprovedSignerSpkiSha256:sha(pub)
    }
  }};
}
const stopped=()=>({rowCount:1,rows:[{
  state:"STOPPED",reserved_attempts:"1",reserved_units:"2"
}]});
const params=(f:ReturnType<typeof fixture>,query:ReturnType<typeof vi.fn>,onUnconfirmedStop:ReturnType<typeof vi.fn>,now:()=>number,sleepMs:(n:number)=>Promise<void>)=>({
  signedAuthorization:f.authorization, db:{query} as any, onUnconfirmedStop,
  nowMs:now,sleepMs
});

describe("Gate05 bounded signed STOP recovery: MOCKS ONLY, NO operational authority",()=>{
  it("one successful STOP exactly at signed expiry, zero extra calls",async()=>{
    const f=fixture(); let clock=Date.parse(f.expire)-5000;
    const db=vi.fn(async()=>stopped()),alert=vi.fn();
    const out=await rehearseGate05BoundedExpiryStopRecoveryV39(
      params(f,db,alert,()=>clock,async(n)=>{clock+=n;})
    );
    expect(out.status).toBe("DURABLE_STOP_RECEIPT_RETURNED_NO_SUPERVISOR_PROOF");
    expect(out.attemptedStops).toBe(1);
    expect(out.receipt).toMatchObject({state:"STOPPED",reservedAttempts:1,reservedUnits:2});
    expect(out.supervisorUptimeAttested).toBe(false);
    expect(out.paidPilotAuthorized).toBe(false);
    expect(db).toHaveBeenCalledTimes(1);
    expect(alert).not.toHaveBeenCalled();
  });
  it("recovers a transient SQL exception at expiry with one bounded retry",async()=>{
    const f=fixture();let clock=Date.parse(f.expire)+1000;
    const db=vi.fn().mockRejectedValueOnce(Error("ECONNRESET")).mockResolvedValueOnce(stopped());
    const alert=vi.fn(),sleeps:number[]=[];
    const out=await rehearseGate05BoundedExpiryStopRecoveryV39(params(
      f,db,alert,()=>clock,async(n)=>{sleeps.push(n);clock+=n;}
    ));
    expect(out.attemptedStops).toBe(2);
    expect(db).toHaveBeenCalledTimes(2);
    expect(sleeps).toEqual([5000]);
    expect(alert).not.toHaveBeenCalled();
  });
  it("exhausts three transient failures; escalates and NEVER claims STOP",async()=>{
    const f=fixture();let clock=Date.parse(f.expire)+1000;
    const db=vi.fn(async()=>{throw Error("network inaccessible");});
    const alert=vi.fn(),sleeps:number[]=[];
    await expect(rehearseGate05BoundedExpiryStopRecoveryV39(params(
      f,db,alert,()=>clock,async(n)=>{sleeps.push(n);clock+=n;}
    ))).rejects.toThrow("GATE05_STOP_UNCONFIRMED_ESCALATE");
    expect(db).toHaveBeenCalledTimes(3);
    expect(sleeps).toEqual([5000,5000]);
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0][0]).toMatchObject({
      status:"STOP_UNCONFIRMED_OPERATOR_ESCALATION_REQUIRED",
      attemptedStops:3,scopeId:f.scopeId,
      noDurableStopReceiptVerified:true,paidPilotAuthorized:false
    });
  });
  it("malformed receipt cannot trigger optimistic STOP or repeated attempts",async()=>{
    const f=fixture(),alert=vi.fn();
    const db=vi.fn(async()=>({rowCount:1,rows:[{
      state:"STOPPED",reserved_attempts:"1",reserved_units:"9"
    }]}));
    await expect(rehearseGate05BoundedExpiryStopRecoveryV39(params(
      f,db,alert,()=>Date.parse(f.expire)+1000,async()=>{}
    ))).rejects.toThrow("GATE05_STOP_UNCONFIRMED_ESCALATE");
    expect(db).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledTimes(1);
  });
  it("PostgreSQL permission denial escalates once without useless retries",async()=>{
    const f=fixture(),alert=vi.fn();
    const permission=Object.assign(Error("permission denied"),{code:"42501"});
    const db=vi.fn(async()=>{throw permission;});
    await expect(rehearseGate05BoundedExpiryStopRecoveryV39(params(
      f,db,alert,()=>Date.parse(f.expire)+1000,async()=>{}
    ))).rejects.toThrow("GATE05_STOP_UNCONFIRMED_ESCALATE");
    expect(db).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0][0].attemptedStops).toBe(1);
  });
  it("sleep interruption while PRE-expiry never dispatches a premature STOP",async()=>{
    const f=fixture(),alert=vi.fn(),db=vi.fn();
    let calls=0;
    await expect(rehearseGate05BoundedExpiryStopRecoveryV39(params(
      f,db,alert,()=>Date.parse(f.expire)-10_000,async()=>{
        calls++;
        if(calls===1)throw Error("sleeper interrupted");
      }
    ))).rejects.toThrow("GATE05_STOP_UNCONFIRMED_ESCALATE");
    expect(db).not.toHaveBeenCalled();
    expect(alert.mock.calls[0][0].attemptedStops).toBe(0);
  });
  it("failed alert delivery STILL throws unconfirmed STOP, never returns success",async()=>{
    const f=fixture();const db=vi.fn(async()=>{throw Error("offline");});
    await expect(rehearseGate05BoundedExpiryStopRecoveryV39(params(
      f,db,vi.fn(async()=>{throw Error("alert delivery failed");}),
      ()=>Date.parse(f.expire)+1000,async()=>{}
    ))).rejects.toThrow("GATE05_STOP_UNCONFIRMED_ESCALATE");
    expect(db).toHaveBeenCalledTimes(3);
  });
  it("tampered signer trust pin fails before calling any SQL or notifier",async()=>{
    const f=fixture(),db=vi.fn(),alert=vi.fn();
    const changed={...f.authorization,independentPins:{
      ...f.authorization.independentPins,
      independentlyApprovedSignerSpkiSha256:"0".repeat(64)
    }};
    await expect(rehearseGate05BoundedExpiryStopRecoveryV39({
      signedAuthorization:changed,db:{query:db} as any,onUnconfirmedStop:alert,
      nowMs:()=>Date.parse(f.expire)+1000,sleepMs:async()=>{}
    })).rejects.toThrow("GATE05_SIGNER_ROOT_PIN_MISMATCH_HOLD");
    expect(db).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });
});
