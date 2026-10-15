import {randomUUID} from "node:crypto";
import {describe,it,expect} from "vitest";
import {sha256HexString,type AuthRecord} from
  "../server/lib/disruption/authRecord_v39";
import {inspectGate3OwnerReadonly,parseGate3ReadOnlyArgs,
  type Gate3ReadOnlyDeps}
  from "../scripts/v39_gate3_owner_readonly_v39";

const now=new Date("2026-10-20T16:00:00.000Z");
const sessionId=randomUUID();
const window="WSSS/departures/2026-10-20T16:00:00Z+300s";
const record:AuthRecord={
  authorizationId:"AUTH-20261020-G3VERIFY",
  phaseGate:"Phase 3 / Gate 3",
  airportFilterWindow:window,
  maxAlertCredits:12,
  maxRestUnitsByCategory:null,
  startNotBeforeUtc:"2026-10-20T15:00:00Z",
  expiresAtUtc:"2026-10-20T18:00:00Z",
  cleanupOwner:"reviewed_operator",
  predecessorEvidenceIds:["GATE-20261020-P2QUAL"],
};
const raw=JSON.stringify(record);
const sha=sha256HexString(raw);
const argv=[
  "--auth-id","AUTH-20261020-G3VERIFY",
  "--auth-file","/tmp/only-in-ci-g3.json",
  "--session-id",sessionId,
  "--icao","WSSS",
  "--credits","12",
  "--seconds","300",
  "--airport-filter-window",window,
];
function make(approved=true,fault:"none"|"begin"|"select"|"rollback"|"connect"="none"){
  const statements:string[]=[];
  const releases:boolean[]=[];
  let count=0;
  const client={
    async query(sql:string){
      statements.push(sql);
      if((fault==="begin"&&sql==="BEGIN TRANSACTION READ ONLY")||
         (fault==="rollback"&&sql==="ROLLBACK"))
        throw Error("SIMULATED_TRANSACTION_ACK_LOST");
      if(sql.startsWith("SELECT a.session_id")){
        count++;
        if(fault==="select")throw Error("SIMULATED_QUERY_FAILED");
        return {rowCount:1,rows:[{
          session_id:sessionId,icao:"WSSS",
          authorization_evidence_sha256:sha,canary_credit_ceiling:12,
          fixed_exposure_seconds:300,durable_state:"PREPARED",
          durable_expires:new Date(now.getTime()+30*60_000),
          owner_kind:"phase3_credit_canary",
          owner_probe_id:null,stage:null,session_icao:"WSSS",
          runtime_state:"armed",runtime_expires:new Date(now.getTime()+20*60_000),
          subscription_bound:false,callback_requests_seen:0,callback_success_2xx:0,
          callback_failures:0,prepared_owner_count:1,
        }]};
      }
      return {rowCount:0,rows:[]};
    },
    release(discard?:boolean){releases.push(discard===true);},
  };
  return {
    deps:{
      nowUtc:now,
      loadText:(path:string)=>path.endsWith(".json")?raw:
        "GATE-20261020-P2QUAL\n"+(approved?"AUTH_ARTIFACT_SHA256:"+sha+"\n":""),
      connect:async()=>{
        if(fault==="connect")throw Error("NO_DB");
        return client;
      },
    } as Gate3ReadOnlyDeps,
    statements,releases,get selects(){return count;},
  };
}
describe("actual Gate3 owner inspection CLI is READ ONLY, never a paid launch",()=>{
  it("validates one exact signed-artifact scope without any database action",()=>{
    expect(parseGate3ReadOnlyArgs(argv)).toMatchObject({
      icao:"WSSS",credits:12,seconds:300,sessionId,
    });
    for(const args of [
      [],argv.slice(0,-2),[...argv,"--paid","true"],
      argv.map(v=>v==="12"?"1000":v),
      argv.map(v=>v==="WSSS"?"WSS1":v),
      argv.map(v=>v==="300"?"3601":v),
      argv.map(v=>v==="--auth-file"?"--provider-key":v),
    ]){
      expect(()=>parseGate3ReadOnlyArgs(args)).toThrow();
    }
  });
  it("matches REAL preflight AUTH ledger + joined prepared owner but returns no paid authorization",async()=>{
    const f=make();
    const r=await inspectGate3OwnerReadonly(argv,f.deps);
    expect(r).toMatchObject({
      status:"READONLY_AUTH_SESSION_MATCH_NOT_PAID_AUTH",
      sessionId,ledgerHashApproved:true,preparedSessionChecked:true,
      providerCalls:0,databaseWrites:0,hostedPostCalls:0,
      paidCanaryAuthorized:false,
    });
    expect(f.selects).toBe(1);
    expect(f.statements).toHaveLength(3);
    expect(f.statements[0]).toBe("BEGIN TRANSACTION READ ONLY");
    expect(f.statements[2]).toBe("ROLLBACK");
    expect(f.releases).toEqual([false]);
    expect(JSON.stringify(r)).not.toContain("reviewed_operator");
    expect(JSON.stringify(r)).not.toContain("maxRestUnitsByCategory");
  });
  it("missing independently pinned approval never queries durable session",async()=>{
    const f=make(false);
    const r=await inspectGate3OwnerReadonly(argv,f.deps);
    expect(r).toMatchObject({status:"HOLD",paidCanaryAuthorized:false});
    expect(r.reasons).toContain("AUTH_RECORD_OR_LEDGER_NOT_VERIFIED");
    expect(f.selects).toBe(0);
    expect(f.statements).toEqual(["BEGIN TRANSACTION READ ONLY","ROLLBACK"]);
  });
  it("bad options refuse before reading and even opening DB",async()=>{
    const f=make();
    const r=await inspectGate3OwnerReadonly([...argv,"--live","yes"],f.deps);
    expect(r.status).toBe("HOLD");
    expect(r.reasons).toContain("GATE3_READONLY_ARGS_INVALID");
    expect(f.statements).toEqual([]);
  });
  it("failed DB connect and failed session SELECT both HOLD; no provider",async()=>{
    for(const fault of ["connect","select"] as const){
      const f=make(true,fault);
      const r=await inspectGate3OwnerReadonly(argv,f.deps);
      expect(r).toMatchObject({status:"HOLD",paidCanaryAuthorized:false,providerCalls:0});
      if(fault==="select")
        expect(f.statements.at(-1)).toBe("ROLLBACK");
    }
  });
  it("unknown BEGIN/ROLLBACK ACK discards pooled connection rather than reusing it",async()=>{
    for(const fault of ["begin","rollback"] as const){
      const f=make(true,fault);
      const r=await inspectGate3OwnerReadonly(argv,f.deps);
      expect(r.status).toBe("HOLD");
      expect(f.releases).toEqual([true]);
      expect(f.statements.filter(s=>s==="BEGIN TRANSACTION READ ONLY")).toHaveLength(1);
      expect(f.statements.filter(s=>s==="ROLLBACK").length).toBe(fault==="begin"?0:1);
    }
  });
});
