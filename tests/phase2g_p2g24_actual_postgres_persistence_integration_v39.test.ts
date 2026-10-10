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
import {registerV3Routes} from "../server/routes_v3";
import {createSyntheticDualSourceMessageV2,verifySyntheticDualSourceMessageV2} from "../experiments/phase2g_rehearsal/dual_source_wire_canonical_receipt_v39";
import {recordSyntheticSignedReceiptMetadataV2} from "../experiments/phase2g_rehearsal/disposable_logged_source_receipt_v39";

const SESSION="12345678-1234-4234-8234-123456789abc";
const SUB="synthetic-owned-subscription";
const TEST_ONLY_CALLBACK_SECRET="p2g-fixture-"+ "x".repeat(40);
const actualPath="/api/v1/webhooks/aerodatabox/"+TEST_ONLY_CALLBACK_SECRET+"/prepaid/"+SESSION;
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
  process.env.AERODATABOX_WEBHOOK_SECRET=TEST_ONLY_CALLBACK_SECRET;
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
    "received_at_utc timestamptz,PRIMARY KEY(session_id,delivery_id,item_index))",
    "; CREATE TABLE clean.adb_incident_stop (cause text NOT NULL, occurred_at_utc timestamptz NOT NULL, detail jsonb, resolved boolean NOT NULL)"
  ].join(" "));
  const app=express();
  // Same prepaid parser bypass as server/phase2gCallbackOnly.ts. This allows
  // registerV3Routes() to execute its ACTUAL strict 2MB parser and error guard.
  const ordinaryJson=express.json({limit:"2mb"});
  app.use((req,res,next)=>{
    if(/^\/api\/v1\/webhooks\/aerodatabox\/[^/]+\/prepaid\/[^/]+\/?$/.test(req.path)){
      next();return;
    }
    ordinaryJson(req,res,next);
  });
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
  // Attaches the EXACT production V3.9 prepaid parser, ingress and incident
  // failure handlers to our isolated loopback-only fixture app.
  registerV3Routes(app);
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
  delete process.env.AERODATABOX_WEBHOOK_SECRET;
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

  it("confirmed IsOperator YSSY physical flight persists a real flight-instance-v2 ID",async()=>{
    const leg={
      id:"synthetic-provider-leg-210",number:"QF421",
      codeshareStatus:"IsOperator",
      airline:{iata:"QF",icao:"QFA"},
      departure:{airport:{icao:"YSSY",timeZone:"Australia/Sydney"},
        scheduledTime:{utc:"2026-10-12T03:40:00.000Z"}},
      arrival:{airport:{icao:"YMEL"},
        scheduledTime:{utc:"2026-10-12T05:15:00.000Z"}},
      aircraft:{reg:"VH-SYN"},callSign:"QFA421"
    };
    const r=await persistPrepaidProbeWebhookV39({
      sessionId:SESSION,body:sample({id:"operator-initial",flights:[leg]})
    });
    expect(r.itemCount).toBe(1);
    const rows=await state.pool!.query(
      "SELECT flight_instance_id,initial_service_date::text,codeshare_resolution_status,identity_resolution_status,origin_icao FROM clean.prepaid_probe_item_runtime"
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]).toMatchObject({
      codeshare_resolution_status:"resolved_operator",
      identity_resolution_status:"resolved",
      origin_icao:"YSSY",
      initial_service_date:"2026-10-12"
    });
    expect(rows.rows[0].flight_instance_id).toMatch(/^.+$/);
    expect(await count()).toEqual({logged:1,unlogged:1});
  });

  it("retimed update of the same operator provider leg preserves original physical identity",async()=>{
    const leg=(at:string,arrival:string)=>({
      id:"synthetic-provider-leg-520",number:"QF520",
      codeshareStatus:"IsOperator",airline:{iata:"QF"},
      departure:{airport:{icao:"YSSY",timeZone:"Australia/Sydney"},
        scheduledTime:{utc:at}},
      arrival:{airport:{icao:"YMML"},scheduledTime:{utc:arrival}},
      callSign:"QFA520"
    });
    await persistPrepaidProbeWebhookV39({
      sessionId:SESSION,body:sample({
        id:"operator-original",flights:[leg("2026-10-12T03:40:00Z","2026-10-12T05:10:00Z")]
      })
    });
    await persistPrepaidProbeWebhookV39({
      sessionId:SESSION,body:sample({
        id:"operator-retimed",timestampUtc:"2026-10-12T03:09:00Z",
        flights:[leg("2026-10-12T04:20:00Z","2026-10-12T05:50:00Z")]
      })
    });
    const rows=await state.pool!.query(
      "SELECT flight_instance_id,initial_service_date::text,identity_resolution_status,scheduled_gate_out_utc FROM clean.prepaid_probe_item_runtime ORDER BY scheduled_gate_out_utc"
    );
    expect(rows.rows).toHaveLength(2);
    expect(rows.rows[0].identity_resolution_status).toBe("resolved");
    expect(rows.rows[1].identity_resolution_status).toBe("resolved");
    expect(rows.rows[0].flight_instance_id).toBe(rows.rows[1].flight_instance_id);
    expect(rows.rows[0].initial_service_date).toBe(rows.rows[1].initial_service_date);
    expect(await count()).toEqual({logged:2,unlogged:2});
  });

  it("marketing codeshare cannot create a second confirmed physical leg",async()=>{
    const leg={
      id:"fictional-marketing-leg",number:"AA555",
      codeshareStatus:"IsCodeshared",
      airline:{iata:"AA"},
      departure:{airport:{icao:"YSSY",timeZone:"Australia/Sydney"},
        scheduledTime:{utc:"2026-10-12T03:40:00Z"}},
      arrival:{airport:{icao:"YMML"},scheduledTime:{utc:"2026-10-12T05:10:00Z"}}
    };
    await persistPrepaidProbeWebhookV39({
      sessionId:SESSION,body:sample({id:"marketing-only",flights:[leg]})
    });
    const q=await state.pool!.query(
      "SELECT codeshare_resolution_status,identity_resolution_status,flight_instance_id FROM clean.prepaid_probe_item_runtime"
    );
    expect(q.rows).toHaveLength(1);
    expect(q.rows[0]).toMatchObject({
      codeshare_resolution_status:"resolved_marketing",
      identity_resolution_status:"quarantined",
      flight_instance_id:null
    });
  });

  it("conflicting provider ID is persisted as evidence but quarantined, never merged as physical ID",async()=>{
    const leg=(number:string)=>({
      id:"synthetic-reused-provider-id",number,
      codeshareStatus:"IsOperator",airline:{iata:"QF"},
      departure:{airport:{icao:"YSSY",timeZone:"Australia/Sydney"},
        scheduledTime:{utc:"2026-10-12T03:40:00Z"}},
      arrival:{airport:{icao:"YMML"},scheduledTime:{utc:"2026-10-12T05:10:00Z"}}
    });
    await persistPrepaidProbeWebhookV39({
      sessionId:SESSION,body:sample({id:"first-leg",flights:[leg("QF700")]})
    });
    // V3.9 intentionally persists the raw notification but quarantines its
    // conflicting item. That is safer than silently merging two physical
    // flights AND preserves evidence for later review.
    const second=await persistPrepaidProbeWebhookV39({
      sessionId:SESSION,body:sample({id:"conflicting-leg",flights:[leg("QF701")]})
    });
    expect(second.duplicate).toBe(false);
    expect(await count()).toEqual({logged:2,unlogged:2});
    const q=await state.pool!.query(
      "SELECT flight_number,flight_instance_id,identity_resolution_status,codeshare_resolution_status FROM clean.prepaid_probe_item_runtime ORDER BY flight_number"
    );
    expect(q.rows).toHaveLength(2);
    expect(q.rows[0].flight_number).toBe("QF700");
    expect(q.rows[0].identity_resolution_status).toBe("resolved");
    expect(q.rows[0].flight_instance_id).toMatch(/^.+$/);
    expect(q.rows[1].flight_number).toBe("QF701");
    expect(q.rows[1].identity_resolution_status).toBe("quarantined");
    expect(q.rows[1].flight_instance_id).toBeNull();
    expect(q.rows[1].codeshare_resolution_status).toBe("resolved_operator");
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

  it("PROVES short DB pool wait produces 503 and unrecorded provider attempts under a burst",async()=>{
    // Negative result, not a readiness PASS: the disposable PostgreSQL pool
    // currently has max=3 and acquisition timeout=3s. Queueing 18 distinct
    // SENDs behind 600ms fake storage creates a mix of HTTP 200 and 503.
    // 503 provider attempts would be billable but NOT observed internally
    // when maxDeliveryRetries=0.
    state.uploadDelayMs=600;
    const n=18;
    const responses=await Promise.all(Array.from({length:n},(_,i)=>fetch(
      localOrigin+"/__synthetic__/prepaid/"+SESSION,{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify(sample({id:"burst-short-timeout-"+i}))
      }
    )));
    const good=responses.filter(r=>r.status===200).length;
    const unavailable=responses.filter(r=>r.status===503).length;
    expect(good).toBeGreaterThan(0);
    expect(unavailable).toBeGreaterThan(0);
    expect(good+unavailable).toBe(n);
    expect(await count()).toEqual({logged:good,unlogged:good});
    const metrics=await session();
    expect(metrics.successes).toBe(good);
    expect(metrics.requests).toBe(good);
    // Fail-fast is useful to bound resource stalls, not a substitute
    // for independent durable ingress or provider retry.
  },25_000);

  it("PROVES long DB acquisition wait can return 200 AFTER a ~10s sender deadline",async()=>{
    // Contrasting synthetic experiment: allow full pool waits, while holding
    // per-session row lock across 600ms simulated object-store upload.
    // Every callback eventually commits, but the last ACK arrives too late
    // for an upstream sender with a ~10s response deadline.
    const original=state.pool!;
    const slowPool=new Pool({
      connectionString:process.env.P2G_FIXTURE_POSTGRES_URL!,
      connectionTimeoutMillis:20_000,max:3
    });
    state.pool=slowPool;
    try {
      state.uploadDelayMs=600;
      const n=18;
      const started=performance.now();
      const responses=await Promise.all(Array.from({length:n},(_,i)=>fetch(
        localOrigin+"/__synthetic__/prepaid/"+SESSION,{
          method:"POST",headers:{"content-type":"application/json"},
          body:JSON.stringify(sample({id:"burst-long-timeout-"+i}))
        }
      )));
      const elapsed=performance.now()-started;
      expect(responses.every(r=>r.status===200)).toBe(true);
      expect(elapsed).toBeGreaterThan(10_000);
      expect(await count()).toEqual({logged:n,unlogged:n});
      expect(await session()).toEqual({requests:n,successes:n,failures:0});
    } finally {
      state.pool=original;
      await slowPool.end();
    }
  },30_000);

  it("ACTUAL V3.9 secret-gated prepaid HTTP parser ACKs only committed bytes/SQL",async()=>{
    const r=await fetch(localOrigin+actualPath,{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify(sample({id:"real-route-success",syntheticPadding:"x".repeat(5_500)}))
    });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({received:true,items:0,duplicate:false});
    expect(await count()).toEqual({logged:1,unlogged:1});
    expect(await session()).toEqual({requests:1,successes:1,failures:0});
    expect(state.events.slice(0,2)).toEqual(["UPLOAD","READBACK"]);
  });
  it("ACTUAL route returns 404 on wrong path secret without poisoning session counter",async()=>{
    const r=await fetch(localOrigin+actualPath.replace(TEST_ONLY_CALLBACK_SECRET,"incorrect-secret"),{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify(sample({id:"bad-secret"}))
    });
    expect(r.status).toBe(404);
    expect(await count()).toEqual({logged:0,unlogged:0});
    expect(await session()).toEqual({requests:0,successes:0,failures:0});
  });
  it("ACTUAL route rejects wrong-secret malformed JSON BEFORE parser; no DB counters poisoned",async()=>{
    const response=await fetch(localOrigin+actualPath.replace(TEST_ONLY_CALLBACK_SECRET,"wrong-credential"),{
      method:"POST",headers:{"content-type":"application/json"},
      body:'{"intentionally": "malformed",'
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({error:"Not found"});
    expect(await count()).toEqual({logged:0,unlogged:0});
    expect(await session()).toEqual({requests:0,successes:0,failures:0});
  });
  it("ACTUAL parser rejects malformed JSON with 400, counts ingress failure and never ACKs",async()=>{
    const r=await fetch(localOrigin+actualPath,{
      method:"POST",headers:{"content-type":"application/json"},
      body:'{"notification":"malformed",'
    });
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({error:"Prepaid probe JSON invalid"});
    expect(await count()).toEqual({logged:0,unlogged:0});
    expect(await session()).toEqual({requests:1,successes:0,failures:1});
  });
  it("ACTUAL parser rejects excessive 2MB body with HTTP 413 before persistence",async()=>{
    const r=await fetch(localOrigin+actualPath,{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({body:"x".repeat(2_200_000)})
    });
    expect(r.status).toBe(413);
    expect(await count()).toEqual({logged:0,unlogged:0});
    expect(await session()).toEqual({requests:1,successes:0,failures:1});
  });
  it("ACTUAL route invalid content-type is HTTP 415 and counted as failure",async()=>{
    const r=await fetch(localOrigin+actualPath,{
      method:"POST",headers:{"content-type":"text/plain"},body:"not-json"
    });
    expect(r.status).toBe(415);
    expect(await count()).toEqual({logged:0,unlogged:0});
    expect(await session()).toEqual({requests:1,successes:0,failures:1});
  });
  it("ACTUAL route storage failure returns HTTP 500 with no false credit or blob",async()=>{
    state.failUpload=true;
    const r=await fetch(localOrigin+actualPath,{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify(sample({id:"real-route-storage-fail"}))
    });
    expect(r.status).toBe(500);
    expect(await count()).toEqual({logged:0,unlogged:0});
    expect(await session()).toEqual({requests:1,successes:0,failures:1});
  });
  it("detects CURRENT byte-fidelity gap: accepted wire JSON differs from stored canonicalized bytes",async()=>{
    // This is a forensic/scientific contract characterization, not permission
    // to change historical P2G raw blob hashes or deduplication material.
    const wire='{\n  "flights": [],  "subscription": {"id":"'+SUB+
      '"}, "timestampUtc":"2026-10-12T03:01:00Z", '+
      '"id":"noncanonical-wire-001", "deliveryAttempt":{"seqNo":0,"costCredits":1}\n}';
    const response=await fetch(localOrigin+actualPath,{
      method:"POST",headers:{"content-type":"application/json"},body:wire
    });
    expect(response.status).toBe(200);
    expect(await count()).toEqual({logged:1,unlogged:1});
    expect(state.blobs.size).toBe(1);
    const stored=[...state.blobs.values()][0];
    expect(new TextDecoder().decode(stored)).not.toBe(wire);
    const {createHash}=await import("node:crypto");
    const originalSha=createHash("sha256").update(wire).digest("hex");
    const storedSha=createHash("sha256").update(stored).digest("hex");
    const meta=await state.pool!.query("SELECT content_sha256 FROM clean.provider_content_blob_ref");
    expect(meta.rows[0].content_sha256).toBe(storedSha);
    expect(meta.rows[0].content_sha256).not.toBe(originalSha);
    // The *semantic* JSON is preserved, but exact source bytes are not.
    // A future independently durable edge backup must explicitly bind
    // both source-wire SHA and historical canonical-JSON SHA if approved.
  });
  it("ACTUAL route simultaneous duplicate delivery ACKs twice but stores once",async()=>{
    const body=JSON.stringify(sample({id:"real-route-duplicate"}));
    const responses=await Promise.all([1,2].map(()=>fetch(localOrigin+actualPath,{
      method:"POST",headers:{"content-type":"application/json"},body
    })));
    expect(responses.map(r=>r.status)).toEqual([200,200]);
    const answers=await Promise.all(responses.map(r=>r.json()));
    expect(answers.filter(x=>x.duplicate)).toHaveLength(1);
    expect(await count()).toEqual({logged:1,unlogged:1});
    expect(await session()).toEqual({requests:2,successes:2,failures:0});
  });

  it("ACTUAL route: 10s independent sender timeouts can precede later durable SQL commits",async()=>{
    // Stress envelope is intentionally artificial: 22 distinct prepaid
    // notifications arrive concurrently; each fake object upload takes
    // 550ms while V3.9 holds the session row lock. This is not evidence
    // P2G24 saw this traffic, and no real sender/provider is contacted.
    const original=state.pool!;
    const stressPool=new Pool({
      connectionString:process.env.P2G_FIXTURE_POSTGRES_URL!,
      connectionTimeoutMillis:22_000,max:3
    });
    state.pool=stressPool;
    try {
      state.uploadDelayMs=550;
      const n=22;
      const start=performance.now();
      const senderResults=await Promise.all(Array.from({length:n},async(_,i)=>{
        try {
          const response=await fetch(localOrigin+actualPath,{
            method:"POST",headers:{"content-type":"application/json"},
            body:JSON.stringify(sample({id:"actual-route-sender-deadline-"+i})),
            signal:AbortSignal.timeout(10_000)
          });
          return {ack:response.status===200,status:response.status};
        }catch{
          return {ack:false,status:0};
        }
      }));
      const ackedBySyntheticSender=senderResults.filter(x=>x.ack).length;
      expect(ackedBySyntheticSender).toBeGreaterThan(0);
      expect(ackedBySyntheticSender).toBeLessThan(n);
      // The server does not automatically reverse an already committed
      // transaction merely because the external HTTP caller timed out.
      let internal=0;
      const deadline=Date.now()+17_000;
      while(Date.now()<deadline){
        const x=await count();
        internal=x.unlogged;
        if(internal===n)break;
        await new Promise(r=>setTimeout(r,80));
      }
      expect(internal).toBe(n);
      expect(await count()).toEqual({logged:n,unlogged:n});
      const metrics=await session();
      expect(metrics.successes).toBe(n);
      expect(metrics.requests).toBe(n);
      console.log("SYNTHETIC_ACTUAL_ROUTE_SENDS="+n);
      console.log("SYNTHETIC_SENDER_OBSERVED_200="+ackedBySyntheticSender);
      console.log("SYNTHETIC_INTERNAL_COMMITTED="+internal);
      console.log("EXTERNAL_PROVIDER_CALLS=0");
      console.log("STORAGE_BACKEND=in_memory_fake");
      console.log("REAL_REPLIT_LATENCY_PROVEN=false");
      console.log("SENDER_SERVER_ACK_DIVERGENCE_EXPOSED="+(ackedBySyntheticSender!==internal));
      expect(performance.now()-start).toBeGreaterThan(10_000);
    }finally{
      state.pool=original;
      await stressPool.end();
    }
  },40_000);

  it("actual V3.9 stored blob SHA exactly matches signed V2 canonical SHA while wire SHA remains distinct",async()=>{
    const sourceBody='{\n  "flights":[],"subscription":{"id":"'+SUB+'"}, '+
      '"timestampUtc":"2026-10-12T03:01:00.000Z", "id":"cross-layer-dual-001",'+
      '"deliveryAttempt":{"seqNo":0,"costCredits":1,"timestampUtc":"2026-10-12T03:01:01.000Z"}\n}';
    const signing="synthetic-test-edge-key-"+ "h".repeat(60);
    const dual=await createSyntheticDualSourceMessageV2({
      rawBytes:new TextEncoder().encode(sourceBody),
      sessionId:SESSION,expectedProviderSubscriptionId:SUB,
      trustedReceivedAtUtc:"2026-10-12T03:01:02.000Z",
      privateEdgeSigningKey:signing
    });
    const attested=await verifySyntheticDualSourceMessageV2({
      message:dual,privateEdgeSigningKey:signing,
      expectedSessionId:SESSION,expectedProviderSubscriptionId:SUB,
      trustedNowUtc:"2026-10-12T03:01:03.000Z"
    });
    expect(attested.verified).toBe(true);
    const response=await fetch(localOrigin+actualPath,{
      method:"POST",headers:{"content-type":"application/json"},
      body:sourceBody
    });
    expect(response.status).toBe(200);
    expect(await count()).toEqual({logged:1,unlogged:1});
    const result=await state.pool!.query(
      "SELECT content_sha256, content_bytes FROM clean.provider_content_blob_ref"
    );
    expect(result.rows[0].content_sha256).toBe(dual.receipt.canonicalSha256);
    expect(result.rows[0].content_sha256).not.toBe(dual.receipt.wireSha256);
    // This proves data-digest compatibility but NOT live signed-edge ingress:
    // actual V3.9 handler currently has no authenticated V2 envelope.
    expect(new TextDecoder().decode([...state.blobs.values()][0])).not.toBe(sourceBody);
  });

  it("synthetic signed first-edge receipt survives durable SQL insert, duplicate/restart conflict and original time freeze",async()=>{
    // THIS table is disposable and LOGGED; it contains only HMAC-blinded
    // attempt ID + cryptographic hashes + first trusted UTC, NO raw body or
    // plaintext provider subscription/notification IDs.
    await state.pool!.query("CREATE SCHEMA IF NOT EXISTS p2g_dual_receipt_crash_fixture");
    await state.pool!.query(
      "CREATE TABLE IF NOT EXISTS p2g_dual_receipt_crash_fixture.receipt_metadata("+
      "attempt_hmac text PRIMARY KEY,wire_sha256 text NOT NULL,"+
      "canonical_sha256 text NOT NULL,first_edge_received_utc timestamptz NOT NULL,"+
      "receipt_sha256 text NOT NULL)"
    );
    const syntheticBody=JSON.stringify(sample({id:"offline-signed-control-001"}));
    const edgeKey="fixture-edge-key-"+ "a".repeat(64);
    const blindKey="fixture-blinding-key-"+ "b".repeat(64);
    const base={
      rawBytes:new TextEncoder().encode(syntheticBody),sessionId:SESSION,
      expectedProviderSubscriptionId:SUB,
      privateEdgeSigningKey:edgeKey,
      trustedReceivedAtUtc:"2026-10-12T03:01:02.000Z"
    };
    const msg=await createSyntheticDualSourceMessageV2(base);
    const client=await state.pool!.connect();
    try{
      const options={
        client,message:msg,privateEdgeSigningKey:edgeKey,
        persistentAttemptBlindKey:blindKey,
        sessionId:SESSION,providerSubscriptionId:SUB,
        trustedNowUtc:"2026-10-12T03:03:00.000Z",queueAccepted:true
      };
      const first=await recordSyntheticSignedReceiptMetadataV2(options);
      expect(first).toMatchObject({
        savedFirstEdgeUtc:"2026-10-12T03:01:02.000Z",
        duplicate:false,wireSha256:msg.receipt.wireSha256,
        canonicalSha256:msg.receipt.canonicalSha256
      });
      const later=await createSyntheticDualSourceMessageV2({
        ...base,trustedReceivedAtUtc:"2026-10-12T03:02:10.000Z"
      });
      const replay=await recordSyntheticSignedReceiptMetadataV2({
        ...options,message:later
      });
      expect(replay.duplicate).toBe(true);
      expect(replay.savedFirstEdgeUtc).toBe(first.savedFirstEdgeUtc);
      const modified=await createSyntheticDualSourceMessageV2({
        ...base,rawBytes:new TextEncoder().encode(JSON.stringify(JSON.parse(syntheticBody),null,2))
      });
      await expect(recordSyntheticSignedReceiptMetadataV2({
        ...options,message:modified
      })).rejects.toThrow("DURABLE_SOURCE_ATTEMPT_CONFLICT");
      await expect(recordSyntheticSignedReceiptMetadataV2({
        ...options,queueAccepted:false
      })).rejects.toThrow("DURABLE_QUEUE_ADMISSION_NOT_PROVEN");
      const rows=await state.pool!.query(
        "SELECT attempt_hmac,wire_sha256,canonical_sha256,first_edge_received_utc,"+
        "receipt_sha256 FROM p2g_dual_receipt_crash_fixture.receipt_metadata"
      );
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0].attempt_hmac).toMatch(/^[a-f0-9]{64}$/);
      expect(rows.rows[0].wire_sha256).toBe(first.wireSha256);
      expect(new Date(rows.rows[0].first_edge_received_utc).toISOString())
        .toBe(first.savedFirstEdgeUtc);
      const stored=JSON.stringify(rows.rows[0]);
      expect(stored).not.toContain(SUB);
      expect(stored).not.toContain("offline-signed-control-001");
    }finally{client.release();}
    // Deliberately leave this non-provider synthetic metadata row for the
    // following disposable PostgreSQL SIGKILL/restart CI step to verify.
  });

});
