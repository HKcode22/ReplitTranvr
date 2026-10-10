import express from "express";
import {createServer} from "node:http";
import {beforeAll,afterAll,beforeEach,describe,expect,it,vi} from "vitest";
import {Pool} from "pg";

/**
 * REAL PostgreSQL integration: ACTUAL V3.9 prepaid persistence function.
 * STRICT local-only disposable database guard; simulated in-memory object
 * storage. No actual scientific database, provider, Replit or Cloudflare.
 * The UNLOGGED reset test uses TRUNCATE, NOT a real server crash.
 */
const state=vi.hoisted(()=>({
  pool:null as null|Pool,
  blobs:new Map<string,Uint8Array>(),
  failUpload:false,uploadDelayMs:0,events:[] as string[]
}));
vi.mock("../server/lib/disruption/db_v39",()=>({
  v39Pool:{
    connect:()=>{if(!state.pool)throw Error("NO_FIXTURE_POOL");return state.pool.connect()},
    query:(sql:string,params?:unknown[])=>{
      if(!state.pool)throw Error("NO_FIXTURE_POOL");
      return state.pool.query(sql,params);
    }
  }
}));
vi.mock("../server/lib/disruption/replitProviderBlobStore_v39",()=>({
  createRequiredProviderBlobStoreV39:()=>({
    uploadBytes:async(key:string,bytes:Uint8Array)=>{
      state.events.push("UPLOAD");
      if(state.failUpload)throw Error("SYNTHETIC_BLOB_FAILURE");
      if(state.uploadDelayMs>0)await new Promise(r=>setTimeout(r,state.uploadDelayMs));
      state.blobs.set(key,new Uint8Array(bytes));
    },
    exists:async(key:string)=>state.blobs.has(key),
    downloadBytes:async(key:string)=>{
      state.events.push("READBACK");
      const bytes=state.blobs.get(key);
      if(!bytes)throw Error("MISSING_FAKE_BLOB");
      return new Uint8Array(bytes);
    },
    delete:async(key:string)=>{
      state.events.push("DELETE");
      state.blobs.delete(key);
    }
  }),
  normalizeProviderBlobBucketIdV39:(s:string)=>s,
}));
import {persistPrepaidProbeWebhookV39} from "../server/lib/disruption/prepaidProbeRuntime_v39";

const SESSION="12345678-1234-4234-8234-123456789abc";
const SUB="synthetic-owned-subscription";
let localHttpServer:ReturnType<typeof createServer>|null=null;
let localOrigin="";
const sample=(additional:Record<string,unknown>={})=>({
  id:"synthetic-postgres-delivery-1",subscription:{id:SUB},
  timestampUtc:"2026-10-12T03:01:00Z",
  deliveryAttempt:{seqNo:0,costCredits:1,timestampUtc:"2026-10-12T03:01:01Z"},
  flights:[],...additional
});
const session=async()=>{
  const x=await state.pool!.query(
    "SELECT callback_requests_seen AS requests,callback_success_2xx AS successes,callback_failures AS failures FROM clean.prepaid_probe_session_runtime WHERE session_id=$1",
    [SESSION]);
  return x.rows[0]??null;
};
const count=async()=>{
  const x=await state.pool!.query(
    "SELECT (SELECT count(*)::int FROM clean.provider_content_blob_ref) AS logged,(SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime) AS unlogged");
  return x.rows[0];
};

beforeAll(async()=>{
  if(process.env.P2G_DISPOSABLE_POSTGRES!=="YES")throw Error("DISPOSABLE_ONLY_FLAG_REQUIRED");
  if(process.env.V39_DATABASE_RUNTIME_URL||process.env.AERODATABOX_API_KEY)
    throw Error("REAL_DATABASE_OR_PROVIDER_ENVIRONMENT_FORBIDDEN");
  const u=new URL(process.env.P2G_FIXTURE_POSTGRES_URL??"");
  if(u.hostname!=="127.0.0.1"||u.pathname!=="/p2g_stage1_fixture")
    throw Error("NONDISPOSABLE_DATABASE_URL_REFUSED");
  state.pool=new Pool({connectionString:u.toString(),connectionTimeoutMillis:3000,max:3});
  const id=await state.pool.query("SELECT current_database() AS db");
  if(id.rows[0].db!=="p2g_stage1_fixture")throw Error("FIXTURE_ID_MISMATCH");
  await state.pool.query("CREATE SCHEMA clean");
  await state.pool.query([
    "CREATE UNLOGGED TABLE clean.prepaid_probe_session_runtime(",
    "session_id uuid PRIMARY KEY,provider_subscription_id text,state text NOT NULL,",
    "expires_at_utc timestamptz NOT NULL,callback_requests_seen integer DEFAULT 0,",
    "callback_success_2xx integer DEFAULT 0,callback_failures integer DEFAULT 0,",
    "last_delivery_at_utc timestamptz)",
    "; CREATE TABLE clean.provider_content_blob_ref(",
    "blob_ref_id uuid PRIMARY KEY,storage_kind text,contract_version text,",
    "object_name text,content_class text,content_sha256 text,content_bytes integer,",
    "source_kind text,source_record_id text,persisted_at_utc timestamptz,",
    "retention_hours integer,expires_at_utc timestamptz)",
    "; CREATE UNLOGGED TABLE clean.prepaid_probe_delivery_runtime(",
    "session_id uuid NOT NULL,delivery_id text NOT NULL,blob_ref_id uuid NOT NULL,",
    "raw_body_sha256 text,provider_subscription_id text,received_at_utc timestamptz,",
    "provider_notification_generated_utc timestamptz,delivery_attempt_seq_no integer,",
    "delivery_attempt_utc timestamptz,",
    "delivery_attempt_cost_credits numeric CHECK(",
    "delivery_attempt_cost_credits IS NULL OR delivery_attempt_cost_credits <= 1),",
    "notification_items integer,PRIMARY KEY(session_id,delivery_id))",
    "; CREATE UNLOGGED TABLE clean.prepaid_probe_item_runtime(",
    "session_id uuid NOT NULL,delivery_id text NOT NULL,item_index integer NOT NULL,",
    "raw_item_sha256 text,flight_number text,aircraft_reg text,codeshare_status text,",
    "runtime_flight_key text,provider_flight_id text,callsign text,operating_carrier text,",
    "operating_flight_number text,origin_icao text,destination_icao text,",
    "origin_time_zone text,scheduled_gate_out_utc timestamptz,",
    "scheduled_gate_in_utc timestamptz,flight_instance_id text,",
    "initial_service_date date,provisional_identity_key text,",
    "codeshare_resolution_status text,identity_resolution_status text,",
    "received_at_utc timestamptz,PRIMARY KEY(session_id,delivery_id,item_index))"
  ].join(" "));
  const app=express();
  app.use(express.json({limit:"2mb"}));
  app.post("/__synthetic__/prepaid/:sessionId",async(req,res)=>{
    if(req.params.sessionId!==SESSION){
      res.status(404).json({error:"TEST_SESSION_NOT_FOUND"});return;
    }
    try{
      const done=await persistPrepaidProbeWebhookV39({
        sessionId:SESSION,body:req.body,receivedAtUtc:new Date()
      });
      res.status(200).json({received:true,duplicate:done.duplicate});
    }catch{
      // This is a disposable test-only HTTP wrapper, NOT the production route.
      res.status(503).json({error:"TEST_PERSISTENCE_UNAVAILABLE"});
    }
  });
  localHttpServer=createServer(app);
  await new Promise<void>(resolve=>localHttpServer!.listen(0,"127.0.0.1",resolve));
  const address=localHttpServer.address();
  if(!address||typeof address==="string")throw Error("LOCAL_HTTP_TEST_PORT_FAILED");
  localOrigin="http://127.0.0.1:"+address.port;
},20000);
beforeEach(async()=>{
  state.blobs.clear();state.failUpload=false;state.uploadDelayMs=0;state.events.length=0;
  await state.pool!.query(
    "TRUNCATE clean.provider_content_blob_ref,clean.prepaid_probe_delivery_runtime,clean.prepaid_probe_session_runtime,clean.prepaid_probe_item_runtime");
  await state.pool!.query(
    "INSERT INTO clean.prepaid_probe_session_runtime(session_id,provider_subscription_id,state,expires_at_utc) VALUES($1,$2,'active','2099-01-01T00:00:00Z')",
    [SESSION,SUB]);
});
afterAll(async()=>{
  if(localHttpServer)await new Promise<void>((resolve,reject)=>localHttpServer!.close(err=>err?reject(err):resolve()));
  if(state.pool){
    await state.pool.query("DROP SCHEMA IF EXISTS clean CASCADE").catch(()=>{});
    await state.pool.end();
  }
});
describe("actual V3.9 persistence + disposable PostgreSQL UNLOGGED/LOGGED fixtures",()=>{
  it("SQL COMMIT occurs only after real storage readback; exactly one delivery",async()=>{
    const r=await persistPrepaidProbeWebhookV39({sessionId:SESSION,body:sample()});
    expect(r.duplicate).toBe(false);
    expect(state.events.slice(0,2)).toEqual(["UPLOAD","READBACK"]);
    expect(state.blobs.size).toBe(1);
    expect(await count()).toEqual({logged:1,unlogged:1});
    expect(await session()).toEqual({requests:1,successes:1,failures:0});
    const meta=await state.pool!.query(
      "SELECT content_sha256,content_bytes,retention_hours FROM clean.provider_content_blob_ref");
    expect(meta.rows[0].retention_hours).toBe(168);
    expect(meta.rows[0].content_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(meta.rows[0].content_bytes).toBeGreaterThan(0);
  });
  it("duplicate notification is idempotent under real SQL row lock/unique primary key",async()=>{
    const first=await persistPrepaidProbeWebhookV39({sessionId:SESSION,body:sample()});
    const second=await persistPrepaidProbeWebhookV39({sessionId:SESSION,body:sample()});
    expect(second.duplicate).toBe(true);
    expect(second.deliveryId).toBe(first.deliveryId);
    expect(state.blobs.size).toBe(1);
    expect(await count()).toEqual({logged:1,unlogged:1});
    expect(await session()).toEqual({requests:2,successes:2,failures:0});
  });
  it("actual SQL constraint failure after blob upload rolls back metadata and does not ACK",async()=>{
    await expect(persistPrepaidProbeWebhookV39({sessionId:SESSION,body:sample({
      deliveryAttempt:{seqNo:0,costCredits:2,timestampUtc:"2026-10-12T03:01:01Z"}
    })})).rejects.toThrow();
    expect(state.events).toEqual(expect.arrayContaining(["UPLOAD","READBACK","DELETE"]));
    expect(state.blobs.size).toBe(0);
    expect(await count()).toEqual({logged:0,unlogged:0});
    expect(await session()).toEqual({requests:1,successes:0,failures:1});
  });
  it("synthetic blob service failure leaves no successful scientific delivery",async()=>{
    state.failUpload=true;
    await expect(persistPrepaidProbeWebhookV39({sessionId:SESSION,body:sample()}))
      .rejects.toThrow("SYNTHETIC_BLOB_FAILURE");
    expect(await count()).toEqual({logged:0,unlogged:0});
    expect(await session()).toEqual({requests:1,successes:0,failures:1});
  });
  it("provider subscription mismatch fails before blob write and no credited delivery",async()=>{
    await expect(persistPrepaidProbeWebhookV39({sessionId:SESSION,
      body:sample({subscription:{id:"foreign-synthetic-sub"}})
    })).rejects.toThrow("PREPAID_PROBE_PROVIDER_SUBSCRIPTION_MISMATCH");
    expect(await count()).toEqual({logged:0,unlogged:0});
    expect(state.blobs.size).toBe(0);
  });
  it("simulated UNLOGGED crash-reset loses runtime but NOT logged metadata and refuses false retry success",async()=>{
    await persistPrepaidProbeWebhookV39({sessionId:SESSION,body:sample()});
    expect(await count()).toEqual({logged:1,unlogged:1});
    await state.pool!.query(
      "TRUNCATE clean.prepaid_probe_delivery_runtime,clean.prepaid_probe_session_runtime");
    expect(await count()).toEqual({logged:1,unlogged:0});
    await expect(persistPrepaidProbeWebhookV39({sessionId:SESSION,body:sample()}))
      .rejects.toThrow("PREPAID_PROBE_SESSION_NOT_FOUND_OR_CRASH_RESET");
    expect(await count()).toEqual({logged:1,unlogged:0});
  });
  it("~21KB body is accepted with fake fast storage; NOT a real provider latency test",async()=>{
    await persistPrepaidProbeWebhookV39({
      sessionId:SESSION,body:sample({syntheticPadding:"x".repeat(21000)})
    });
    const q=await state.pool!.query(
      "SELECT content_bytes FROM clean.provider_content_blob_ref");
    expect(q.rows[0].content_bytes).toBeGreaterThan(21000);
    expect(await count()).toEqual({logged:1,unlogged:1});
  });
  it("real loopback HTTP 200 follows ACTUAL SQL COMMIT with YSSY-sized synthetic JSON",async()=>{
    const input=sample({syntheticPadding:"x".repeat(21_000)});
    const response=await fetch(localOrigin+"/__synthetic__/prepaid/"+SESSION,{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(input)
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({received:true,duplicate:false});
    expect(await count()).toEqual({logged:1,unlogged:1});
    expect(await session()).toEqual({requests:1,successes:1,failures:0});
    expect(state.events.slice(0,2)).toEqual(["UPLOAD","READBACK"]);
    expect(state.blobs.size).toBe(1);
  });

  it("HTTP success waits for a deliberately slow synthetic blob write",async()=>{
    state.uploadDelayMs=220;
    const started=performance.now();
    const response=await fetch(localOrigin+"/__synthetic__/prepaid/"+SESSION,{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify(sample({syntheticPadding:"x".repeat(5_500)}))
    });
    const elapsed=performance.now()-started;
    expect(elapsed).toBeGreaterThanOrEqual(190);
    expect(response.status).toBe(200);
    expect(await count()).toEqual({logged:1,unlogged:1});
    // This checks ACK ORDERING, NOT latency at real Replit storage or P99.
  });

  it("simultaneous duplicate HTTP POSTs commit one unique delivery under real SQL lock",async()=>{
    const body=JSON.stringify(sample({syntheticPadding:"x".repeat(1_700)}));
    const responses=await Promise.all([1,2].map(()=>fetch(
      localOrigin+"/__synthetic__/prepaid/"+SESSION,{
        method:"POST",headers:{"content-type":"application/json"},body
      }
    )));
    expect(responses.map(r=>r.status)).toEqual([200,200]);
    const outcomes=await Promise.all(responses.map(r=>r.json() as Promise<{duplicate:boolean}>));
    expect(outcomes.filter(v=>v.duplicate)).toHaveLength(1);
    expect(await count()).toEqual({logged:1,unlogged:1});
    expect(await session()).toEqual({requests:2,successes:2,failures:0});
    expect(state.blobs.size).toBe(1);
  });

  it("HTTP server never acknowledges a synthetic blob failure as a successful provider receipt",async()=>{
    state.failUpload=true;
    const response=await fetch(localOrigin+"/__synthetic__/prepaid/"+SESSION,{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify(sample())
    });
    expect(response.status).toBe(503);
    expect(await count()).toEqual({logged:0,unlogged:0});
    expect(await session()).toEqual({requests:1,successes:0,failures:1});
  });

  it("persists 3 nonempty fictional Sydney flight items under actual PostgreSQL; UNKNOWN remains quarantined",async()=>{
    const flights=[0,1,2].map(i=>({
      id:"sandbox-flight-"+i,number:"QF"+(400+i),
      codeshareStatus:"Unknown",
      airline:{iata:"QF",icao:"QFA"},
      departure:{airport:{icao:"YSSY",timeZone:"Australia/Sydney"},
        scheduledTime:{utc:"2026-10-12T03:40:00.000Z"}},
      arrival:{airport:{icao:"YMML"},
        scheduledTime:{utc:"2026-10-12T05:15:00.000Z"}},
      aircraft:{reg:"VH-FIK"},
      callSign:"QFA"+(400+i)
    }));
    const result=await persistPrepaidProbeWebhookV39({sessionId:SESSION,
      body:sample({flights})});
    expect(result.itemCount).toBe(3);
    const rows=await state.pool!.query(
      "SELECT item_index,origin_icao,destination_icao,identity_resolution_status,codeshare_resolution_status,flight_instance_id FROM clean.prepaid_probe_item_runtime ORDER BY item_index");
    expect(rows.rows).toHaveLength(3);
    expect(rows.rows.map(x=>x.item_index)).toEqual([0,1,2]);
    expect(rows.rows.every(x=>x.origin_icao==="YSSY"&&x.destination_icao==="YMML")).toBe(true);
    expect(rows.rows.every(x=>x.identity_resolution_status==="quarantined" && x.flight_instance_id===null)).toBe(true);
    expect(await count()).toEqual({logged:1,unlogged:1});
    expect(await session()).toEqual({requests:1,successes:1,failures:0});
    // This exercises nonempty item SQL; NOT operator physical-v2 identity.
  });

  it("demonstrates session lock HOL blocking when duplicate POST overlaps slow fake storage",async()=>{
    state.uploadDelayMs=450;
    const body=JSON.stringify(sample({syntheticPadding:"x".repeat(5_700)}));
    const firstStart=performance.now();
    const first=fetch(localOrigin+"/__synthetic__/prepaid/"+SESSION,{
      method:"POST",headers:{"content-type":"application/json"},body
    });
    // Wait until first callback owns the transaction and enters blob upload.
    const waitStart=Date.now();
    while(!state.events.includes("UPLOAD") && Date.now()-waitStart<2000)
      await new Promise(r=>setTimeout(r,5));
    expect(state.events).toContain("UPLOAD");
    const secondStart=performance.now();
    const second=fetch(localOrigin+"/__synthetic__/prepaid/"+SESSION,{
      method:"POST",headers:{"content-type":"application/json"},body
    });
    const [a,b]=await Promise.all([first,second]);
    const finish=performance.now();
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    const outputs=await Promise.all([a.json(),b.json()]);
    expect(outputs.filter(x=>x.duplicate)).toHaveLength(1);
    expect(finish-secondStart).toBeGreaterThanOrEqual(300);
    expect(finish-firstStart).toBeGreaterThanOrEqual(420);
    expect(await count()).toEqual({logged:1,unlogged:1});
    // Demonstrates head-of-line blocking. Not a measured provider SLO.
  });

  it("reveals provider-timeout exposure from burst of distinct callbacks serialized behind slow object readback",async()=>{
    // Deliberately pessimistic synthetic case: 18 distinct SENDs arriving
    // concurrently, each mock network storage readback awaiting 600ms.
    // The SAME session row is locked during external storage roundtrip.
    // This detects architectural head-of-line blocking; NOT a claim
    // that P2G24 received such a burst or that real storage takes 600ms.
    state.uploadDelayMs=600;
    const n=18;
    const started=performance.now();
    const posts=Array.from({length:n},(_,i)=>fetch(
      localOrigin+"/__synthetic__/prepaid/"+SESSION,{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify(sample({
          id:"burst-synthetic-"+i,
          deliveryAttempt:{seqNo:0,costCredits:1,timestampUtc:"2026-10-12T03:01:01Z"}
        }))
      }
    ));
    const responses=await Promise.all(posts);
    const elapsed=performance.now()-started;
    expect(responses.every(r=>r.status===200)).toBe(true);
    expect(elapsed).toBeGreaterThan(10_000);
    expect(await count()).toEqual({logged:n,unlogged:n});
    expect(await session()).toEqual({requests:n,successes:n,failures:0});
    // This successful offline test is a PROVEN SYNTHETIC >10s exposure;
    // it must NOT be interpreted as a paid-launch PASS/latency compliance.
  },25_000);

});
