import {describe,it,expect,vi} from "vitest";
import {sha256HexString,type AuthRecord}
  from "../server/lib/disruption/authRecord_v39";
import {
  reviewGate3LedgerBoundPreparationV39,
  prepareGate3LedgerBoundSessionV39,
  type Gate3LedgerBoundPreparationInputV39,
} from "../server/lib/disruption/gate3LedgerBoundSessionPreparation_v39";
import type {Pool} from "pg";

const now=new Date("2026-10-16T16:00:00.000Z");
const window="WSSS/departures/2026-10-16T16:01:00Z+300s";
const record:AuthRecord={
  authorizationId:"AUTH-20261016-GATE3",
  phaseGate:"Phase 3 / Gate 3",airportFilterWindow:window,
  maxAlertCredits:12,maxRestUnitsByCategory:null,
  startNotBeforeUtc:"2026-10-16T15:59:00Z",
  expiresAtUtc:"2026-10-16T17:00:00Z",
  cleanupOwner:"reviewed human operator",
  predecessorEvidenceIds:["GATE-20261015-QUALIFIED"],
};
const raw=JSON.stringify(record);
const hash=sha256HexString(raw);
const ledger="GATE-20261015-QUALIFIED\nAUTH_ARTIFACT_SHA256:"+hash+"\n";
// In production the preparer reads the REVIEWED repository ledger path;
// never trust a ledger supplied by the caller of the reservation entrypoint.
// A local Vitest-only replacement lets the positive mock-PG case supply
// fixed synthetic approved bytes without editing the checked-in report.
vi.mock("node:fs",async (load)=>{
  const actual=await load<typeof import("node:fs")>();
  return {
    ...actual,
    readFileSync:(path:Parameters<typeof actual.readFileSync>[0],
                  encoding?:BufferEncoding)=>{
      if(String(path).endsWith("data-collection/evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md"))
        return ledger;
      return actual.readFileSync(path,encoding);
    },
  };
});
const input:Gate3LedgerBoundPreparationInputV39={
  authArtifactRaw:raw,evidenceLedgerRaw:ledger,
  expectedAuthId:"AUTH-20261016-GATE3",
  expectedAirportFilterWindow:window,
  icao:"WSSS",canaryCreditCeiling:12,
  fixedExposureSeconds:300,nowUtc:now,
};
function fakeDb(opts?:{existing?:boolean;commitLost?:boolean}){
  const sql:string[]=[];
  const releases:boolean[]=[];
  const params:unknown[][]=[];
  const pool={
    async connect(){
      return {
        async query(q:string,v?:unknown[]){
          const name=q.startsWith("SELECT pg_advisory")?"LOCK":
            q.startsWith("SELECT session_id,state")?"EXISTING":
            q.startsWith("INSERT INTO clean.phase3_gate3")?"OWNER_INSERT":
            q.startsWith("INSERT INTO clean.prepaid_probe")?"SESSION_INSERT":q;
          sql.push(name);
          params.push(v??[]);
          if(name==="EXISTING")
            return opts?.existing?
              {rowCount:1,rows:[{state:"PREPARED"}]}:
              {rowCount:0,rows:[]};
          if(name==="COMMIT"&&opts?.commitLost)throw Error("ACK_LOST");
          return {rowCount:1,rows:[]};
        },
        release(discard?:boolean){releases.push(discard===true);},
      };
    },
  } as unknown as Pick<Pool,"connect">;
  return {pool,sql,params,releases};
}
describe("Gate3 actual ledger-bound atomic PREPARED owner (NO provider)",()=>{
  it("verifies exact hash-locked AUTH, imminent ICAO/window/budget before SQL",()=>{
    const r=reviewGate3LedgerBoundPreparationV39(input,ledger);
    expect(r.authArtifactSha256).toBe(hash);
    expect(r).toMatchObject({icao:"WSSS",canaryCreditCeiling:12,
      fixedExposureSeconds:300});
  });
  it("creates one same-ID LOGGED owner and UNLOGGED runtime; never PAID GO",async()=>{
    const d=fakeDb();
    const x=await prepareGate3LedgerBoundSessionV39(d.pool,input);
    expect(d.sql).toEqual(["BEGIN","LOCK","EXISTING",
      "OWNER_INSERT","SESSION_INSERT","COMMIT"]);
    const owner=d.params[3];
    const runtime=d.params[4];
    expect(owner[0]).toBe(x.sessionId);
    expect(runtime[0]).toBe(x.sessionId);
    expect(owner[2]).toBe(hash);
    expect(x).toMatchObject({
      icao:"WSSS",canaryCreditCeiling:12,fixedExposureSeconds:300,
      state:"PREPARED",runtimeState:"armed",
      status:"SOURCE_PREPARED_LEDGER_MATCH_NOT_PAID_AUTH",
      independentLedgerHashMatched:true,
      approvalVerifiedHere:false,
      signedOperatorAuthorizationVerifiedHere:false,
      authorizedPaidProviderCalls:false,
      authorizesPaidProviderCalls:false,
      publishedHostCustodyVerifiedHere:false,
      providerAccountInventoryVerifiedHere:false,
    });
    expect(d.releases).toEqual([false]);
  });
  it("refuses forged hash, missing predecessor, changed budget/window and no AUTH expiry BEFORE pool.connect",async()=>{
    for(const patch of [
      {authArtifactRaw:raw+" "},
      {icao:"OMAA"},
      {icao:"wsss"},
      {canaryCreditCeiling:20},
      {canaryCreditCeiling:101},
      {fixedExposureSeconds:301},
      {fixedExposureSeconds:3601},
      {expectedAuthId:"AUTH-20261016-OTHER"},
      {expectedAirportFilterWindow:"WSSS/departures/2026-10-16T16:02:00Z+300s"},
      {nowUtc:new Date("2026-10-16T16:10:00Z")},
      {nowUtc:new Date("2026-10-16T15:57:00Z")},
      {authArtifactRaw:JSON.stringify({...record,expiresAtUtc:null})},
      {authArtifactRaw:JSON.stringify({...record,maxRestUnitsByCategory:{fids_base:2}})},
    ]){
      const d=fakeDb();
      await expect(prepareGate3LedgerBoundSessionV39(d.pool,{...input,...patch}))
        .rejects.toThrow();
      expect(d.sql).toEqual([]);
    }
  });
  it("independently checked-in ledger is required; caller cannot insert fake approval",()=>{
    expect(()=>reviewGate3LedgerBoundPreparationV39(input,
      "GATE-20261015-QUALIFIED")).toThrow(
      "GATE3_LEDGER_PREPARE_AUTH_NOT_INDEPENDENTLY_APPROVED_HOLD");
    expect(()=>reviewGate3LedgerBoundPreparationV39(input,
      "AUTH_ARTIFACT_SHA256:"+hash)).toThrow(
      "GATE3_LEDGER_PREPARE_AUTH_NOT_INDEPENDENTLY_APPROVED_HOLD");
  });
  it("one existing unclosed owner stops reservation, no provider call",async()=>{
    const d=fakeDb({existing:true});
    await expect(prepareGate3LedgerBoundSessionV39(d.pool,input))
      .rejects.toThrow("GATE3_PREPARE_PRIOR_UNSETTLED_OWNER_HOLD");
    expect(d.sql).toEqual(["BEGIN","LOCK","EXISTING","ROLLBACK"]);
    expect(d.releases).toEqual([false]);
  });
  it("unknown COMMIT drops connection and never retries reserved session",async()=>{
    const d=fakeDb({commitLost:true});
    await expect(prepareGate3LedgerBoundSessionV39(d.pool,input))
      .rejects.toThrow("GATE3_PREPARE_COMMIT_OUTCOME_UNKNOWN_DURABLE_AUDIT_REQUIRED");
    expect(d.sql.filter(x=>x==="OWNER_INSERT")).toHaveLength(1);
    expect(d.sql.filter(x=>x==="COMMIT")).toHaveLength(1);
    expect(d.releases).toEqual([true]);
  });
});
