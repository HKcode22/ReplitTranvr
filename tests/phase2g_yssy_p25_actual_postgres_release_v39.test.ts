import express from "express";
import {createServer,request as httpRequest} from "node:http";
import {beforeAll,afterAll,beforeEach,describe,expect,it,vi} from "vitest";
import {Pool,type PoolClient} from "pg";
import {readFileSync} from "node:fs";
import {join} from "node:path";

/**
 * REAL PostgreSQL integration: ACTUAL V3.9 prepaid persistence function.
 * STRICT local-only disposable database guard; simulated in-memory object
 * storage. No actual scientific database, provider, Replit or Cloudflare.
 * The UNLOGGED reset test uses TRUNCATE, NOT a real server crash.
 */
const state=vi.hoisted(()=>({
  pool:null as null|Pool,
  blobs:new Map<string,Uint8Array>(),
  failUpload:false,failStoreInitialization:false,failDownloadOnce:false,failUploadAfterWriteOnce:false,
  uploadDelayMs:0,downloadDelayMs:0,
  commitAckLost:"none" as "none"|"before"|"after",events:[] as string[]
}));
vi.mock("../server/lib/disruption/db_v39",()=>({
  v39Pool:{
    connect:async()=>{
      if(!state.pool)throw Error("NO_FIXTURE_POOL");
      const client=await state.pool.connect();
      if(state.commitAckLost==="none")return client;
      // Disposable PostgreSQL executes a REAL COMMIT, then the test
      // suppresses its successful response: an ambiguous wire outcome.
      const originalQuery=client.query.bind(client);
      client.query=((...args:any[])=>{
        if(args[0]==="COMMIT"&&state.commitAckLost!=="none"){
          const mode=state.commitAckLost;
          state.commitAckLost="none";
          if(mode==="before")
            return Promise.reject(Error("P04_SIMULATED_LOST_COMMIT_BEFORE_EXECUTION"));
          const result=(originalQuery as any)(...args);
          return Promise.resolve(result).then(()=>{
            throw Error("P04_SIMULATED_LOST_COMMIT_RESPONSE");
          });
        }
        return (originalQuery as any)(...args);
      }) as typeof client.query;
      return client;
    },
    query:(sql:string,params?:unknown[])=>{
      if(!state.pool)throw Error("NO_FIXTURE_POOL");
      return state.pool.query(sql,params);
    }
  }
}));
vi.mock("../server/lib/disruption/replitProviderBlobStore_v39",()=>({
  createRequiredProviderBlobStoreV39:()=>{
    if(state.failStoreInitialization)
      throw Error("P06_SYNTHETIC_STORE_INITIALIZATION_FAILED");
    return {
    uploadBytes:async(key:string,bytes:Uint8Array)=>{
      state.events.push("UPLOAD");
      if(state.failUpload)throw Error("SYNTHETIC_BLOB_FAILURE");
      if(state.uploadDelayMs>0)await new Promise(r=>setTimeout(r,state.uploadDelayMs));
      state.blobs.set(key,new Uint8Array(bytes));
      if(state.failUploadAfterWriteOnce){
        state.failUploadAfterWriteOnce=false;
        throw Error("P06_SYNTHETIC_LOST_UPLOAD_RESPONSE_AFTER_BYTES_SAVED");
      }
    },
    exists:async(key:string)=>state.blobs.has(key),
    downloadBytes:async(key:string)=>{
      state.events.push("READBACK");
      if(state.failDownloadOnce){
        state.failDownloadOnce=false;
        throw Error("P06_SYNTHETIC_LOST_DOWNLOAD_RESPONSE_AFTER_UPLOAD");
      }
      if(state.downloadDelayMs>0)await new Promise(r=>setTimeout(r,state.downloadDelayMs));
      const bytes=state.blobs.get(key);
      if(!bytes)throw Error("MISSING_FAKE_BLOB");
      return new Uint8Array(bytes);
    },
    delete:async(key:string)=>{
      state.events.push("DELETE");
      state.blobs.delete(key);
    }
    };
  },
  normalizeProviderBlobBucketIdV39:(s:string)=>s,
}));
import {persistPrepaidProbeWebhookV39} from "../server/lib/disruption/prepaidProbeRuntime_v39";
import {registerV3Routes} from "../server/routes_v3";
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
  if(process.env.P2G_DISPOSABLE_POSTGRES!=="YES")return;
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
    "session_id uuid PRIMARY KEY,owner_kind text NOT NULL DEFAULT 'anchor_probe',",
    "provider_subscription_id text,state text NOT NULL,",
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
    // Match the real B0062 baseline: an airport webhook may bill for
    // several flight items in one attempted delivery, NOT 0-or-1 only.
    "delivery_attempt_cost_credits numeric CHECK(",
    "delivery_attempt_cost_credits IS NULL OR delivery_attempt_cost_credits >= 0),",
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
  // EXACT draft migration is executed ONLY on disposable PostgreSQL 16.
  // Production/live migrations are NEVER invoked by this test process.
  await state.pool.query(readFileSync(join(process.cwd(),
    "migrations/current/V0064__phase2g_prepaid_source_pending_intent_v39.sql"),"utf8"));
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
  if(process.env.P2G_DISPOSABLE_POSTGRES!=="YES")return;
  state.blobs.clear();state.failUpload=false;state.failStoreInitialization=false;
  state.failDownloadOnce=false;state.failUploadAfterWriteOnce=false;
  state.uploadDelayMs=0;
  state.downloadDelayMs=0;state.commitAckLost="none";
  state.events.length=0;
  await state.pool!.query(
    "TRUNCATE clean.provider_content_blob_ref,clean.prepaid_probe_delivery_runtime,clean.prepaid_probe_session_runtime,clean.prepaid_probe_item_runtime,clean.phase2g_prepaid_source_intent_v39");
  await state.pool!.query(
    "INSERT INTO clean.prepaid_probe_session_runtime(session_id,provider_subscription_id,state,expires_at_utc) VALUES($1,$2,'active','2099-01-01T00:00:00Z')",
    [SESSION,SUB]);
});
afterAll(async()=>{
  if(process.env.P2G_DISPOSABLE_POSTGRES!=="YES")return;
  if(localHttpServer)await new Promise<void>((resolve,reject)=>localHttpServer!.close(err=>err?reject(err):resolve()));
  delete process.env.AERODATABOX_WEBHOOK_SECRET;
  if(state.pool){
    await state.pool.query("DROP SCHEMA IF EXISTS clean CASCADE").catch(()=>{});
    await state.pool.end();
  }
});


describe.skipIf(process.env.P2G_DISPOSABLE_POSTGRES!=="YES")("YSSY P25 real receiver + real PostgreSQL 16, strictly disposable",()=>{
  const flags=[
    "V39_CALLBACK_ONLY_RUNTIME",
    "V39_PREPAID_FAILED_SOURCE_JOURNAL_APPROVED",
    "V39_PREPAID_SOURCE_PENDING_INTENT_APPROVED",
    "V39_PREPAID_SOURCE_OUTSIDE_SESSION_LOCK_APPROVED"
  ] as const;
  const withFlags=async(fn:()=>Promise<void>)=>{
    const prev=flags.map(k=>process.env[k]);
    flags.forEach(k=>{process.env[k]="1";});
    try{await fn();}finally{
      flags.forEach((k,i)=>prev[i]===undefined?delete process.env[k]:process.env[k]=prev[i]);
    }
  };
  it("real V0064 trigger is enabled; an accidentally disabled immutability guard fails the catalog gate",async()=>{
    const check=async()=>{
      const q=await state.pool!.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_trigger tg
          WHERE tg.tgrelid=to_regclass('clean.phase2g_prepaid_source_intent_v39')
            AND tg.tgname='trg_p2g_prepaid_source_intent_v39'
            AND tg.tgfoid=to_regprocedure('clean.guard_p2g_prepaid_source_intent_v39()')
            AND tg.tgenabled='O'
        ) AS source_intent_v0064_guard_trigger
      `);
      return q.rows[0]?.source_intent_v0064_guard_trigger;
    };
    expect(await check()).toBe(true);
    // This database is an isolated throwaway PG16 fixture, not production.
    await state.pool!.query(
      "ALTER TABLE clean.phase2g_prepaid_source_intent_v39 DISABLE TRIGGER trg_p2g_prepaid_source_intent_v39"
    );
    try{
      expect(await check()).toBe(false);
    }finally{
      await state.pool!.query(
        "ALTER TABLE clean.phase2g_prepaid_source_intent_v39 ENABLE TRIGGER trg_p2g_prepaid_source_intent_v39"
      );
    }
    expect(await check()).toBe(true);
  });
  it("P03 production resolver gives confirmed YSSY IsOperator a physical-flight-v2 instance",async()=>{
    const leg={
      id:"synthetic-provider-leg-210",number:"QF421",
      codeshareStatus:"IsOperator",airline:{iata:"QF",icao:"QFA"},
      departure:{airport:{icao:"YSSY",timeZone:"Australia/Sydney"},
        scheduledTime:{utc:"2026-10-12T03:40:00.000Z"}},
      arrival:{airport:{icao:"YMEL"},
        scheduledTime:{utc:"2026-10-12T05:15:00.000Z"}},
      aircraft:{reg:"VH-SYN"},callSign:"QFA421"
    };
    const receipt=await persistPrepaidProbeWebhookV39({
      sessionId:SESSION,body:sample({id:"operator-initial",flights:[leg]})
    });
    expect(receipt.itemCount).toBe(1);
    const rows=await state.pool!.query(
      "SELECT flight_instance_id,initial_service_date::text,codeshare_resolution_status,identity_resolution_status,origin_icao FROM clean.prepaid_probe_item_runtime"
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]).toMatchObject({
      codeshare_resolution_status:"resolved_operator",
      identity_resolution_status:"resolved",origin_icao:"YSSY",
      initial_service_date:"2026-10-12"
    });
    expect(rows.rows[0].flight_instance_id).toMatch(/^.+$/);
    expect(await count()).toEqual({logged:1,unlogged:1});
  });
  it("P03 retiming the same exact operator provider leg retains one physical identity",async()=>{
    const leg=(outUtc:string,inUtc:string)=>({
      id:"synthetic-provider-leg-520",number:"QF520",
      codeshareStatus:"IsOperator",airline:{iata:"QF"},
      departure:{airport:{icao:"YSSY",timeZone:"Australia/Sydney"},
        scheduledTime:{utc:outUtc}},
      arrival:{airport:{icao:"YMML"},scheduledTime:{utc:inUtc}},
      callSign:"QFA520"
    });
    await persistPrepaidProbeWebhookV39({
      sessionId:SESSION,body:sample({id:"operator-original",flights:[
        leg("2026-10-12T03:40:00Z","2026-10-12T05:10:00Z")
      ]})
    });
    await persistPrepaidProbeWebhookV39({
      sessionId:SESSION,body:sample({
        id:"operator-retimed",timestampUtc:"2026-10-12T03:09:00Z",
        flights:[leg("2026-10-12T04:20:00Z","2026-10-12T05:50:00Z")]
      })
    });
    const q=await state.pool!.query(
      "SELECT flight_instance_id,initial_service_date::text,identity_resolution_status FROM clean.prepaid_probe_item_runtime ORDER BY scheduled_gate_out_utc"
    );
    expect(q.rows).toHaveLength(2);
    expect(q.rows.every(x=>x.identity_resolution_status==="resolved")).toBe(true);
    expect(q.rows[0].flight_instance_id).toBe(q.rows[1].flight_instance_id);
    expect(q.rows[0].initial_service_date).toBe(q.rows[1].initial_service_date);
    expect(await count()).toEqual({logged:2,unlogged:2});
  });
  it("P03 marketing codeshare is stored but quarantined without a physical leg",async()=>{
    const marketing={
      id:"synthetic-marketing-leg",number:"AA555",codeshareStatus:"IsCodeshared",
      airline:{iata:"AA"},
      departure:{airport:{icao:"YSSY",timeZone:"Australia/Sydney"},
        scheduledTime:{utc:"2026-10-12T03:40:00Z"}},
      arrival:{airport:{icao:"YMML"},scheduledTime:{utc:"2026-10-12T05:10:00Z"}}
    };
    await persistPrepaidProbeWebhookV39({
      sessionId:SESSION,body:sample({id:"marketing-only",flights:[marketing]})
    });
    const q=await state.pool!.query(
      "SELECT codeshare_resolution_status,identity_resolution_status,flight_instance_id FROM clean.prepaid_probe_item_runtime"
    );
    expect(q.rows).toHaveLength(1);
    expect(q.rows[0]).toMatchObject({
      codeshare_resolution_status:"resolved_marketing",
      identity_resolution_status:"quarantined",flight_instance_id:null
    });
  });
  it("P03 reused provider flight ID with different operating number is quarantined, not merged",async()=>{
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
    const later=await persistPrepaidProbeWebhookV39({
      sessionId:SESSION,body:sample({id:"conflicting-leg",flights:[leg("QF701")]})
    });
    expect(later.duplicate).toBe(false);
    const q=await state.pool!.query(
      "SELECT flight_number,flight_instance_id,identity_resolution_status,codeshare_resolution_status FROM clean.prepaid_probe_item_runtime ORDER BY flight_number"
    );
    expect(q.rows).toHaveLength(2);
    expect(q.rows[0].flight_number).toBe("QF700");
    expect(q.rows[0].identity_resolution_status).toBe("resolved");
    expect(q.rows[0].flight_instance_id).toMatch(/^.+$/);
    expect(q.rows[1].flight_number).toBe("QF701");
    expect(q.rows[1]).toMatchObject({
      identity_resolution_status:"quarantined",
      flight_instance_id:null,codeshare_resolution_status:"resolved_operator"
    });
    expect(await count()).toEqual({logged:2,unlogged:2});
  });
  it("ACTUAL SQL baseline records one verified original and safely ACKs a same-content duplicate",async()=>{
    const body=sample({id:"p25-release-baseline"});
    const a=await persistPrepaidProbeWebhookV39({sessionId:SESSION,body});
    expect(a.duplicate).toBe(false);
    const b=await persistPrepaidProbeWebhookV39({sessionId:SESSION,body});
    expect(b.duplicate).toBe(true);
    expect(b.blobRefId).toBe(a.blobRefId);
    expect(state.events.filter(x=>x==="UPLOAD")).toHaveLength(1);
    expect(await count()).toEqual({logged:1,unlogged:1});
    expect(await session()).toEqual({requests:2,successes:2,failures:0});
  });
  it("P03/P04 actual signed prepaid parser persists nonempty operator v2 and idempotent HTTP repeat",async()=>{
    const leg={
      id:"synthetic-http-operator-871",number:"QF871",
      codeshareStatus:"IsOperator",airline:{iata:"QF"},
      departure:{airport:{icao:"YSSY",timeZone:"Australia/Sydney"},
        scheduledTime:{utc:"2026-10-12T03:40:00Z"}},
      arrival:{airport:{icao:"YMML"},
        scheduledTime:{utc:"2026-10-12T05:10:00Z"}}
    };
    const body=JSON.stringify(sample({
      id:"p25-http-nonempty-physical-v2",flights:[leg]
    }));
    const send=()=>fetch(localOrigin+actualPath,{
      method:"POST",headers:{"content-type":"application/json"},body
    });
    const first=await send();
    expect(first.status).toBe(200);
    const second=await send();
    expect(second.status).toBe(200);
    const q=await state.pool!.query(
      "SELECT flight_instance_id,identity_resolution_status FROM clean.prepaid_probe_item_runtime"
    );
    expect(q.rows).toHaveLength(1);
    expect(q.rows[0].identity_resolution_status).toBe("resolved");
    expect(q.rows[0].flight_instance_id).toMatch(/^.+$/);
    expect(await count()).toEqual({logged:1,unlogged:1});
    expect(await session()).toEqual({requests:2,successes:2,failures:0});
    expect(state.events.filter(x=>x==="UPLOAD")).toHaveLength(1);
  });
  it("ACTUAL HTTP route refuses a missing original rather than acknowledging a duplicate",async()=>{
    const body=sample({id:"p25-release-missing-original"});
    await persistPrepaidProbeWebhookV39({sessionId:SESSION,body});
    state.blobs.clear();
    const resp=await fetch(localOrigin+actualPath,{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify(body)
    });
    expect(resp.status).toBe(500);
    expect(await count()).toEqual({logged:1,unlogged:1});
    expect(await session()).toEqual({requests:2,successes:1,failures:1});
  });
  it("P06 post-COMMIT lost admission reply: unique LOGGED pending, one counted request, no false HTTP 2xx",async()=>{
    await withFlags(async()=>{
      state.commitAckLost="after";
      const resp=await fetch(localOrigin+actualPath,{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify(sample({id:"p25-release-commit-ack-lost"}))
      });
      expect(resp.status).toBe(500);
      expect(await session()).toEqual({requests:1,successes:0,failures:1});
      expect(await count()).toEqual({logged:0,unlogged:0});
      expect(state.events).not.toContain("UPLOAD");
      const q=await state.pool!.query(
        "SELECT state,count(*)::int AS n FROM clean.phase2g_prepaid_source_intent_v39 GROUP BY state"
      );
      expect(q.rows).toEqual([{state:"PENDING",n:1}]);
    });
  });
  it("P06 before-COMMIT failure: unresolved accounting rather than invented counted callback",async()=>{
    await withFlags(async()=>{
      state.commitAckLost="before";
      await expect(persistPrepaidProbeWebhookV39({
        sessionId:SESSION,
        body:sample({id:"p25-release-commit-before-failed"})
      })).rejects.toMatchObject({
        message:"P06_OUTSIDE_ADMISSION_COMMIT_OUTCOME_UNKNOWN_NO_ACK",
        phase2gCallbackAccountingUncertain:true
      });
      expect(await session()).toEqual({requests:0,successes:0,failures:0});
      expect(await count()).toEqual({logged:0,unlogged:0});
      expect(state.blobs.size).toBe(0);
    });
  });
  it("P06 outside-lock constructor failure retains LOGGED original intent; no invisible upload",async()=>{
    await withFlags(async()=>{
      state.failStoreInitialization=true;
      await expect(persistPrepaidProbeWebhookV39({
        sessionId:SESSION,
        body:sample({id:"p25-release-store-constructor-fails"})
      })).rejects.toThrow("P06_SYNTHETIC_STORE_INITIALIZATION_FAILED");
      expect(await session()).toEqual({requests:1,successes:0,failures:1});
      expect(state.blobs.size).toBe(0);
      expect(await count()).toEqual({logged:0,unlogged:0});
      const q=await state.pool!.query("SELECT count(*)::int AS n FROM clean.phase2g_prepaid_source_intent_v39 WHERE state='PENDING'");
      expect(q.rows[0].n).toBe(1);
    });
  });
});
