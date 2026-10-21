import {describe,it,expect,vi} from "vitest";
import {createHash,generateKeyPairSync,randomUUID,sign} from "node:crypto";
import {
  gate05Ed25519SigningMessageV39
} from "../server/lib/disruption/gate05DetachedEd25519Approval_v39";
import {
  gate05FidsQueryFingerprintV39
} from "../server/lib/disruption/gate05ScopedFidsOwner_v39";
import {
  previewGate05SignedExpiryGuardPlanV39
} from "../server/lib/disruption/gate05SignedExpiryGuardPlan_v39";
import {
  runGate05ExpiryGuardV39
} from "../server/lib/disruption/gate05ScopedFidsStop_v39";

/**
 * OFFLINE ONLY: exercises a signed AUTH -> exact scope/expiry -> safety SQL
 * composition with MOCK query, FAKE time and an ephemeral UNTRUSTED signer.
 * It does not run a daemon, connect to PostgreSQL, deploy or authorize spend.
 */
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const makeFixture=()=>{
  const {privateKey,publicKey}=generateKeyPairSync("ed25519");
  const pub=Buffer.from(publicKey.export({format:"der",type:"spki"}));
  const q={icao:"WSSS",fromLocal:"2026-10-20T09:00",toLocal:"2026-10-20T10:00"};
  const scopeId=randomUUID();
  const expiresAtUtc="2026-10-20T01:30:00.000Z";
  const bytes=Buffer.from(JSON.stringify({
    schema:"v39.gate05.fids-feasibility-auth.v1",
    scopeId,authorizationId:"AUTH-20261020-G05STOPTEST01",
    sourceCommit:"a".repeat(40),openapiSha256:"b".repeat(64),
    cycleId:"fixture-cycle-not-real-provider-proof",
    providerResetUtc:"2026-11-04T02:21:21.000Z",
    airportIcao:"WSSS",ianaTimezone:"Asia/Singapore",
    fromLocal:q.fromLocal,toLocal:q.toLocal,
    startsAtUtc:"2026-10-20T00:55:00.000Z",expiresAtUtc,
    noLocationQuerySha256:gate05FidsQueryFingerprintV39({...q,withLocation:false}),
    locationQuerySha256:gate05FidsQueryFingerprintV39({...q,withLocation:true}),
    maxBaseUnits:4,maxRetryUnits:8,maxTotalUnits:12,
    maxAlertCreates:0,purpose:"TWO_QUERY_FEASIBILITY_NOT_SCIENTIFIC_PILOT"
  }));
  return {
    scopeId,expiresAtUtc,
    args:{
      authorizationBytes:bytes,
      detachedSignatureBase64:sign(
        null,gate05Ed25519SigningMessageV39(bytes),privateKey
      ).toString("base64"),
      signerPublicKeySpkiDerBase64:pub.toString("base64"),
      independentPins:{
        independentlyReviewedArtifactSha256:hash(bytes),
        expectedSourceCommit:"a".repeat(40),
        expectedOpenapiSha256:"b".repeat(64),
        expectedProviderResetUtc:"2026-11-04T02:21:21.000Z",
        expectedIanaTimezone:"Asia/Singapore",
        observedNowUtc:"2026-10-19T23:59:00.000Z",
        independentlyApprovedSignerSpkiSha256:hash(pub)
      }
    }
  };
};
const dbStop=()=>vi.fn(async(sql:string,params:unknown[])=>{
  expect(sql).toContain("clean.stop_gate05_fids_pilot_v39");
  expect(params[1]).toBe("EXPIRED");
  return {rowCount:1,rows:[{
    state:"STOPPED",reserved_attempts:"0",reserved_units:"0"
  }]};
});

describe("Gate05 signed expiration -> independent STOP, mock-only offline rehearsal",()=>{
  it("does not send SQL before exact signed expiry; stops once at deadline",async()=>{
    const fixture=makeFixture();
    const plan=previewGate05SignedExpiryGuardPlanV39(fixture.args);
    let now=Date.parse("2026-10-20T01:29:05.000Z");
    const sql=dbStop(),sleep=vi.fn(async(ms:number)=>{now+=ms;});
    const receipt=await runGate05ExpiryGuardV39({
      db:{query:sql} as any,scopeId:plan.scopeId,
      expiresAtUtc:plan.expiresAtUtc,
      nowMs:()=>now,
      sleepMs:async(ms:number)=>{
        expect(sql).not.toHaveBeenCalled();
        await sleep(ms);
      }
    });
    expect(sql).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("clean.stop_gate05_fids_pilot_v39"),
      [fixture.scopeId,"EXPIRED"]
    );
    expect(sleep.mock.calls.map(call=>call[0])).toEqual([30000,25000]);
    expect(receipt).toMatchObject({
      state:"STOPPED",reservedAttempts:0,reservedUnits:0,
      localAbortRequested:false,providerRequestAlreadySentMayBeBilled:true
    });
  });

  it("after simulated process restart, an overdue signed scope STOPs immediately",async()=>{
    const fixture=makeFixture();
    const plan=previewGate05SignedExpiryGuardPlanV39(fixture.args);
    const sql=dbStop(),sleep=vi.fn();
    const receipt=await runGate05ExpiryGuardV39({
      db:{query:sql} as any,scopeId:plan.scopeId,
      expiresAtUtc:plan.expiresAtUtc,
      nowMs:()=>Date.parse("2026-10-20T01:31:00.000Z"),
      sleepMs:sleep
    });
    expect(sleep).not.toHaveBeenCalled();
    expect(sql).toHaveBeenCalledTimes(1);
    expect(receipt.state).toBe("STOPPED");
  });

  it("tampered signed expiry cannot produce any STOP SQL side effect",()=>{
    const fixture=makeFixture();
    const changed=Buffer.from(fixture.args.authorizationBytes.toString("utf8")
      .replace(fixture.expiresAtUtc,"2026-10-20T01:45:00.000Z"));
    const sql=vi.fn();
    expect(()=>previewGate05SignedExpiryGuardPlanV39({
      ...fixture.args,authorizationBytes:changed
    })).toThrow("GATE05_AUTH_REVIEWED_DIGEST_MISMATCH_HOLD");
    expect(sql).not.toHaveBeenCalled();
  });

  it("network/SQL denial never creates a false successful STOP receipt",async()=>{
    const fixture=makeFixture();
    const plan=previewGate05SignedExpiryGuardPlanV39(fixture.args);
    const db={query:vi.fn(async()=>{throw Error("network connection failed");})};
    await expect(runGate05ExpiryGuardV39({
      db:db as any,scopeId:plan.scopeId,expiresAtUtc:plan.expiresAtUtc,
      nowMs:()=>Date.parse("2026-10-20T01:31:00.000Z"),
      sleepMs:async()=>{}
    })).rejects.toThrow("network connection failed");
    expect(db.query).toHaveBeenCalledTimes(1);
    // A future *operating* supervisor must alert/retry after such failure.
    // A thrown error must never be interpreted as durable STOP.
  });

  it("clock regression fails closed without claiming remote STOP",async()=>{
    const fixture=makeFixture();
    const plan=previewGate05SignedExpiryGuardPlanV39(fixture.args);
    const sql=vi.fn();
    let now=Date.parse("2026-10-20T01:20:00.000Z");
    await expect(runGate05ExpiryGuardV39({
      db:{query:sql} as any,scopeId:plan.scopeId,
      expiresAtUtc:plan.expiresAtUtc,
      nowMs:()=>now,
      sleepMs:async()=>{now-=180_000;}
    })).rejects.toThrow("GATE05_EXPIRY_GUARD_CLOCK_HOLD");
    expect(sql).not.toHaveBeenCalled();
  });
});
