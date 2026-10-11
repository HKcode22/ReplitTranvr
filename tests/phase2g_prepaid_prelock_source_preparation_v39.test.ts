import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {preparePrepaidProbeSourceV39} from
  "../server/lib/disruption/prepaidProbeRuntime_v39";

const SESSION="12345678-1234-4234-8234-123456789abc";
const sha=(v:string|Uint8Array)=>createHash("sha256").update(v).digest("hex");
const canonical=(v:any):string=>{
  if(v===null||typeof v!=="object")return JSON.stringify(v);
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
};
const flight=(id:string)=>({
  id,number:"QF"+id,departure:{scheduledTime:{utc:"2026-10-12T03:04:05Z"}},
  airline:{iata:"QF"}
});
const body=()=>({
  id:"notification-1",
  timestampUtc:"2026-10-12T03:00:00Z",
  deliveryAttempt:{seqNo:0,costCredits:2,timestampUtc:"2026-10-12T03:00:02Z"},
  flights:[flight("1"),flight("2")]
});
describe("P05/P06 production prepaid source prep moves deterministic SHA workload outside SQL lock",()=>{
  it("computes original canonical-body SHA and each flight item SHA independently",()=>{
    const payload=body();
    const p=preparePrepaidProbeSourceV39(SESSION,payload);
    expect(p.rawBytes).toBeInstanceOf(Buffer);
    expect(p.rawBytes.toString()).toBe(canonical(payload));
    expect(p.bodySha256).toBe(sha(p.rawBytes));
    expect(p.itemRawSha256s).toEqual(payload.flights.map(x=>sha(canonical(x))));
    expect(p.flights).toHaveLength(2);
    expect(p.evidence.costCredits).toBe(2);
    expect(p.evidence.attemptSeqNo).toBe(0);
    expect(p.deliveryId).toMatch(/^ppd_[0-9a-f]{64}$/);
  });
  it("JSON key ordering does not invent a new notification identity",()=>{
    const a=body();
    const b={flights:[{airline:{iata:"QF"},departure:{scheduledTime:{utc:"2026-10-12T03:04:05Z"}},number:"QF1",id:"1"},
      {airline:{iata:"QF"},departure:{scheduledTime:{utc:"2026-10-12T03:04:05Z"}},number:"QF2",id:"2"}],
      deliveryAttempt:{timestampUtc:"2026-10-12T03:00:02Z",costCredits:2,seqNo:0},
      timestampUtc:"2026-10-12T03:00:00Z",id:"notification-1"};
    const x=preparePrepaidProbeSourceV39(SESSION,a);
    const y=preparePrepaidProbeSourceV39(SESSION,b);
    expect(x.bodySha256).toBe(y.bodySha256);
    expect(x.deliveryId).toBe(y.deliveryId);
    expect(x.itemRawSha256s).toEqual(y.itemRawSha256s);
    expect(x.rawBytes).toEqual(y.rawBytes);
  });
  it("distinct provider attempts remain distinguishable even for same flights",()=>{
    const a=body(),b=body();
    b.deliveryAttempt.seqNo=1;
    const x=preparePrepaidProbeSourceV39(SESSION,a);
    const y=preparePrepaidProbeSourceV39(SESSION,b);
    expect(x.deliveryId).not.toBe(y.deliveryId);
    expect(x.itemRawSha256s).toEqual(y.itemRawSha256s);
  });
  it("does not fabricate physical items for an empty provider notification",()=>{
    const p=preparePrepaidProbeSourceV39(SESSION,{flights:[]});
    expect(p.flights).toEqual([]);
    expect(p.itemRawSha256s).toEqual([]);
    expect(p.evidence.costCredits).toBeNull();
  });
  it("invalid session and unsupported self-referential untrusted body fail before any SQL acquisition",()=>{
    expect(()=>preparePrepaidProbeSourceV39("invalid",body())).toThrow();
    const circular:any={id:"fake"};circular.self=circular;
    expect(()=>preparePrepaidProbeSourceV39(SESSION,circular)).toThrow();
  });
  it("protects actual paid source ordering: hashes derived before pooled connect and FOR UPDATE",()=>{
    const source=readFileSync("server/lib/disruption/prepaidProbeRuntime_v39.ts","utf8");
    const fn=source.indexOf("export async function persistPrepaidProbeWebhookV39(");
    const fragment=source.slice(fn,source.indexOf("/**\n * pg NUMERIC",fn));
    const prepared=fragment.indexOf("preparePrepaidProbeSourceV39(sessionId,input.body)");
    const connect=fragment.indexOf("pool.connect()");
    const lock=fragment.indexOf("FOR UPDATE`",connect);
    const commit=fragment.lastIndexOf('client.query("COMMIT")');
    expect(fn).toBeGreaterThan(0);
    expect(prepared).toBeGreaterThanOrEqual(0);
    expect(connect).toBeGreaterThan(prepared);
    expect(lock).toBeGreaterThan(connect);
    expect(commit).toBeGreaterThan(lock);
    // Still preserve source-before-ACK and do NOT add early 2xx or production
    // flags / synthetic auth to this preparation function.
    expect(fragment).toContain("persistProviderBlobBeforeAckV39");
    expect(fragment).toContain('final_sql_commit');
  });
});
