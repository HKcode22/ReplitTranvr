import {describe,it,expect,vi} from "vitest";
import {randomUUID} from "node:crypto";
import {fetchGate05ScopedFidsV39,gate05FidsQueryFingerprintV39}
  from "../server/lib/disruption/gate05ScopedFidsOwner_v39";
import {stopGate05ScopedFidsV39,stopGate05IndependentlyV39,runGate05ExpiryGuardV39}
  from "../server/lib/disruption/gate05ScopedFidsStop_v39";
const query={icao:"WSSS",fromLocal:"2026-10-19T09:00",toLocal:"2026-10-19T10:00",withLocation:false};
const identity=()=>({
  scopeId:randomUUID(),authorizationId:"AUTH-20261019-G05SCOPED001",
  authorizationSha256:"a".repeat(64),
  cycleId:"test-cycle-2026-10-04-to-11-04",icao:"WSSS",
  querySha256:gate05FidsQueryFingerprintV39(query)
});
describe("Gate05 local abort and separate durable terminal stop",()=>{
  it("aborted before reserve: zero SQL debits and zero HTTP",async()=>{
    const controller=new AbortController();controller.abort();
    const db={query:vi.fn()},http=vi.fn();
    const out=await fetchGate05ScopedFidsV39({
      db:db as any,owner:identity(),query,signal:controller.signal,
      fetchImpl:http as any
    });
    expect(out).toBeNull();
    expect(db.query).not.toHaveBeenCalled();
    expect(http).not.toHaveBeenCalled();
  });
  it("abort DURING DB reservation: one reserved attempt, no HTTP, no refund",async()=>{
    const ctrl=new AbortController(),http=vi.fn();
    const db={query:vi.fn(async()=>{ctrl.abort();return {rowCount:1,rows:[{reserved:true}]}})};
    const out=await fetchGate05ScopedFidsV39({
      db:db as any,owner:identity(),query,signal:ctrl.signal,
      fetchImpl:http as any
    });
    expect(out).toBeNull();
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(http).not.toHaveBeenCalled();
  });
  it("abort signal is passed to the mocked provider request",async()=>{
    const ctrl=new AbortController();
    const db={query:vi.fn(async()=>({rowCount:1,rows:[{reserved:true}]}))};
    const http=vi.fn(async(_url:any,opts:any)=>{
      expect(opts.signal).toBeInstanceOf(AbortSignal);
      expect(opts.signal.aborted).toBe(false);
      ctrl.abort();
      expect(opts.signal.aborted).toBe(true);
      return new Response(JSON.stringify({departures:[],arrivals:[]}),{status:200});
    });
    const out=await fetchGate05ScopedFidsV39({
      db:db as any,owner:identity(),query,signal:ctrl.signal,
      fetchImpl:http as any,sleepImpl:async()=>{}
    });
    expect(out).toEqual({departures:[],arrivals:[]});
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(http).toHaveBeenCalledTimes(1);
  });
  it("local cancellation precedes terminal scoped SQL stop and returns receipt",async()=>{
    const controller=new AbortController(),scopeId=randomUUID();
    const db={query:vi.fn(async(s:string,p:unknown[])=>{
      expect(controller.signal.aborted).toBe(true);
      expect(s).toContain("stop_gate05_fids_pilot_v39");
      expect(p).toEqual([scopeId,"SAFETY_ABORT"]);
      return {rowCount:1,rows:[{
        state:"STOPPED",reserved_attempts:"2",reserved_units:"4"
      }]};
    })};
    const res=await stopGate05ScopedFidsV39({
      db:db as any,scopeId,reason:"SAFETY_ABORT",controller
    });
    expect(res).toMatchObject({
      state:"STOPPED",reservedAttempts:2,reservedUnits:4,
      localAbortRequested:true,providerRequestAlreadySentMayBeBilled:true
    });
  });
  it("stop refuses invalid scope and inconsistent SQL response",async()=>{
    const controller=new AbortController(),db={query:vi.fn()};
    await expect(stopGate05ScopedFidsV39({
      db:db as any,scopeId:"not-a-uuid",reason:"OPERATOR_STOP",controller
    })).rejects.toThrow("GATE05_STOP_SCOPE_OR_REASON_HOLD");
    expect(controller.signal.aborted).toBe(false);
    expect(db.query).not.toHaveBeenCalled();
    const id=randomUUID();
    db.query.mockResolvedValue({rowCount:1,rows:[{
      state:"STOPPED",reserved_attempts:"2",reserved_units:"1"
    }]});
    await expect(stopGate05ScopedFidsV39({
      db:db as any,scopeId:id,reason:"OPERATOR_STOP",controller
    })).rejects.toThrow("GATE05_STOP_ACCOUNTING_HOLD");
    expect(controller.signal.aborted).toBe(true);
  });
});

describe("Gate05 independently operable safety STOP — no shared dispatcher controller",()=>{
  it("durably stops through only the scoped SQL safety function",async()=>{
    const id=randomUUID(),calls:string[]=[];
    const db={query:vi.fn(async(sql:string,args:unknown[])=>{
      calls.push("sql-stop");
      expect(sql).toContain("clean.stop_gate05_fids_pilot_v39");
      expect(args).toEqual([id,"EXPIRED"]);
      return {rowCount:1,rows:[{
        state:"STOPPED",reserved_attempts:"3",reserved_units:"6"
      }]};
    })};
    const receipt=await stopGate05IndependentlyV39({
      db:db as any,scopeId:id,reason:"EXPIRED"
    });
    expect(receipt).toEqual({
      state:"STOPPED",reservedAttempts:3,reservedUnits:6,
      localAbortRequested:false,
      providerRequestAlreadySentMayBeBilled:true,
      paidProviderMutationByStop:0
    });
    expect(calls).toEqual(["sql-stop"]);
    expect(db.query).toHaveBeenCalledTimes(1);
  });
  it("refuses invalid scope or reason without touching database",async()=>{
    const db={query:vi.fn()};
    await expect(stopGate05IndependentlyV39({
      db:db as any,scopeId:"unreviewed",reason:"SAFETY_ABORT"
    })).rejects.toThrow("GATE05_STOP_SCOPE_OR_REASON_HOLD");
    await expect(stopGate05IndependentlyV39({
      db:db as any,scopeId:randomUUID(),reason:"CLEAR" as any
    })).rejects.toThrow("GATE05_STOP_SCOPE_OR_REASON_HOLD");
    expect(db.query).not.toHaveBeenCalled();
  });
  it("rejects forged or inconsistent receipts; cannot assert terminal stop",async()=>{
    const db={query:vi.fn(async()=>({rowCount:1,rows:[{
      state:"ACTIVE",reserved_attempts:"0",reserved_units:"0"
    }]}))};
    await expect(stopGate05IndependentlyV39({
      db:db as any,scopeId:randomUUID(),reason:"OPERATOR_STOP"
    })).rejects.toThrow("GATE05_STOP_DURABLE_RECEIPT_HOLD");
    db.query.mockResolvedValueOnce({rowCount:1,rows:[{
      state:"STOPPED",reserved_attempts:"7",reserved_units:"14"
    }]});
    await expect(stopGate05IndependentlyV39({
      db:db as any,scopeId:randomUUID(),reason:"SAFETY_ABORT"
    })).rejects.toThrow("GATE05_STOP_ACCOUNTING_HOLD");
  });
  it("propagates SQL denial: no fabricated STOP receipt or fallback",async()=>{
    const db={query:vi.fn(async()=>{throw Error("permission denied for function")})};
    await expect(stopGate05IndependentlyV39({
      db:db as any,scopeId:randomUUID(),reason:"SAFETY_ABORT"
    })).rejects.toThrow("permission denied");
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});


describe("Gate05 STOP receipt shape rejects lossy numeric coercion",()=>{
  it.each([null,undefined,""," ","00"," 0","0.0","-1","1e0",NaN,1.5])(
    "refuses malformed reserved attempts: %s",
    async (invalid)=>{
      const db={query:vi.fn(async()=>({rowCount:1,rows:[{
        state:"STOPPED",reserved_attempts:invalid,reserved_units:"0"
      }]}))};
      await expect(stopGate05IndependentlyV39({
        db:db as any,scopeId:randomUUID(),reason:"EXPIRED"
      })).rejects.toThrow("GATE05_STOP_ACCOUNTING_HOLD");
    }
  );
  it.each([null,undefined,""," ","00"," 0","2.0","-1","2e0",NaN,1.5])(
    "refuses malformed reserved units: %s",
    async(invalid)=>{
      const db={query:vi.fn(async()=>({rowCount:1,rows:[{
        state:"STOPPED",reserved_attempts:"1",reserved_units:invalid
      }]}))};
      await expect(stopGate05IndependentlyV39({
        db:db as any,scopeId:randomUUID(),reason:"SAFETY_ABORT"
      })).rejects.toThrow("GATE05_STOP_ACCOUNTING_HOLD");
    }
  );
  it("rejects conflicting result size and accepts exact zero receipt",async()=>{
    const db={query:vi.fn(async()=>({rowCount:1,rows:[]}))};
    await expect(stopGate05IndependentlyV39({
      db:db as any,scopeId:randomUUID(),reason:"OPERATOR_STOP"
    })).rejects.toThrow("GATE05_STOP_DURABLE_RECEIPT_HOLD");
    db.query.mockResolvedValueOnce({rowCount:1,rows:[{
      state:"STOPPED",reserved_attempts:"0",reserved_units:"0"
    }]});
    await expect(stopGate05IndependentlyV39({
      db:db as any,scopeId:randomUUID(),reason:"OPERATOR_STOP"
    })).resolves.toMatchObject({state:"STOPPED",reservedAttempts:0,reservedUnits:0});
  });
});


describe("Gate05 independent expiry guard is bounded and cannot authorize a pilot",()=>{
  const scope=()=>randomUUID();
  it("never issues STOP before expiry; uses independent safety DB only at expiry",async()=>{
    let clock=Date.parse("2026-10-21T01:00:00Z");
    const expiration="2026-10-21T01:01:05Z";
    const sleeps:number[]=[];
    const db={query:vi.fn(async(sql:string,params:unknown[])=>{
      expect(clock).toBe(Date.parse(expiration));
      expect(sql).toContain("stop_gate05_fids_pilot_v39");
      expect(params[1]).toBe("EXPIRED");
      return {rowCount:1,rows:[{
        state:"STOPPED",reserved_attempts:"0",reserved_units:"0"
      }]};
    })};
    const receipt=await runGate05ExpiryGuardV39({
      db:db as any,scopeId:scope(),expiresAtUtc:expiration,
      nowMs:()=>clock,sleepMs:async(ms:number)=>{
        expect(db.query).not.toHaveBeenCalled();
        sleeps.push(ms);
        clock+=ms;
      }
    });
    expect(sleeps).toEqual([30000,30000,5000]);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(receipt).toMatchObject({
      state:"STOPPED",reservedAttempts:0,reservedUnits:0,
      localAbortRequested:false
    });
  });
  it("overdue scope invokes terminal STOP immediately without sleeping",async()=>{
    const sleep=vi.fn(),db={query:vi.fn(async()=>({
      rowCount:1,rows:[{
        state:"STOPPED",reserved_attempts:"2",reserved_units:"4"
      }]
    }))};
    const receipt=await runGate05ExpiryGuardV39({
      db:db as any,scopeId:scope(),expiresAtUtc:"2026-10-21T02:00:00Z",
      nowMs:()=>Date.parse("2026-10-21T02:00:01Z"),sleepMs:sleep
    });
    expect(sleep).not.toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(receipt.reservedUnits).toBe(4);
  });
  it("rejects malformed dates, invalid scope and >24h horizon without SQL",async()=>{
    const db={query:vi.fn()},sleep=vi.fn();
    for(const expiry of [
      "2026-10-21T01:00:00+00:00","2026-10-21T01:00:00",
      "invalid","2026-10-21T01:00:00.1234Z"
    ]){
      await expect(runGate05ExpiryGuardV39({
        db:db as any,scopeId:scope(),expiresAtUtc:expiry,
        nowMs:()=>Date.parse("2026-10-21T00:00:00Z"),sleepMs:sleep
      })).rejects.toThrow("GATE05_EXPIRY_GUARD_INPUT_HOLD");
    }
    await expect(runGate05ExpiryGuardV39({
      db:db as any,scopeId:"bad-uuid",expiresAtUtc:"2026-10-21T01:00:00Z",
      nowMs:()=>Date.parse("2026-10-21T00:00:00Z"),sleepMs:sleep
    })).rejects.toThrow("GATE05_EXPIRY_GUARD_INPUT_HOLD");
    await expect(runGate05ExpiryGuardV39({
      db:db as any,scopeId:scope(),expiresAtUtc:"2026-10-23T01:00:00Z",
      nowMs:()=>Date.parse("2026-10-21T00:00:00Z"),sleepMs:sleep
    })).rejects.toThrow("GATE05_EXPIRY_GUARD_CLOCK_HOLD");
    expect(db.query).not.toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
  });
  it("fails closed on clock regression or stalled sleeper",async()=>{
    let clock=Date.parse("2026-10-21T00:00:00Z");
    const db={query:vi.fn()},sleep=vi.fn(async()=>{
      clock=Date.parse("2026-10-20T23:57:00Z");
    });
    await expect(runGate05ExpiryGuardV39({
      db:db as any,scopeId:scope(),expiresAtUtc:"2026-10-21T00:01:00Z",
      nowMs:()=>clock,sleepMs:sleep
    })).rejects.toThrow("GATE05_EXPIRY_GUARD_CLOCK_HOLD");
    expect(db.query).not.toHaveBeenCalled();
  });
  it("propagates safety SQL denial and cannot claim STOP",async()=>{
    const db={query:vi.fn(async()=>{throw Error("permission denied")})};
    await expect(runGate05ExpiryGuardV39({
      db:db as any,scopeId:scope(),expiresAtUtc:"2026-10-21T00:00:00Z",
      nowMs:()=>Date.parse("2026-10-21T00:00:01Z"),sleepMs:async()=>{}
    })).rejects.toThrow("permission denied");
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});
