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
import {readDisposablePostgresContinuitySnapshotV39,assessSyntheticPostgresContinuityV39} from "../experiments/phase2g_rehearsal/postgres_continuity_guard_v39";
import {signSyntheticSenderFrameV39,reconcileSyntheticSignedAttemptsV39} from "../experiments/phase2g_rehearsal/signed_attempt_reconciliation_v39";
import {signSyntheticOwnerFreezeV39,verifySyntheticOwnerFreezeV39,syntheticOwnerPublicKeyFingerprintV39} from "../experiments/phase2g_rehearsal/synthetic_owner_freeze_signature_v39";
import {makeSyntheticTwoStageOwnerV39} from "../experiments/phase2g_rehearsal/synthetic_two_stage_owner_protocol_v39";
import {recordSyntheticTwoStageOwnerBindingV39} from "../experiments/phase2g_rehearsal/disposable_two_stage_owner_journal_v39";
import {compareSyntheticPhysicalItemContinuityV39,type SyntheticPhysicalItemWitnessV39} from "../experiments/phase2g_rehearsal/synthetic_physical_item_continuity_v39";
import {ingest as syntheticEdgeIngest,consume as syntheticEdgeConsume,type Env as SyntheticEdgeEnv} from "../experiments/phase2g_cf_sandbox_ingress/worker";
import {verifyEdgeProvenanceV1} from "../experiments/phase2g_cf_sandbox_ingress/provenance";
import {createHash as offlineShaHash} from "node:crypto";
import {signSyntheticScienceRecoveryFrameV39,writeSyntheticLoggedScienceJournalV39,reviewSyntheticLoggedScienceJournalV39,type SyntheticScienceJournalFrameV39} from "../experiments/phase2g_rehearsal/disposable_logged_science_recovery_journal_v39";

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

  it("P13 read-only continuity guard refuses synthetic UNLOGGED loss while LOGGED raw refs survive",async()=>{
    const body=sample({id:"preflight-postgres-reset-001"});
    const response=await fetch(localOrigin+actualPath,{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify(body)
    });
    expect(response.status).toBe(200);
    const client=await state.pool!.connect();
    try{
      const healthy=await readDisposablePostgresContinuitySnapshotV39(client,SESSION);
      expect(healthy).toMatchObject({
        sessionRows:1,deliveryRows:1,itemRows:0,
        loggedRawBlobRefs:1,linkedDeliveryBlobRefs:1
      });
      const baseline={
        frozenPostmasterStartUtc:healthy.postmasterStartUtc,
        expectedDeliveryRows:1,expectedItemRows:0,
        independentOwnerSessionBindingVerified:true,
        independentAttemptAccountingVerified:true
      };
      const early=assessSyntheticPostgresContinuityV39(healthy,baseline);
      expect(early.continuityPreflightPassed).toBe(true);
      expect(early.scientificRunAuthorized).toBe(false);
      // Disposable-only simulated UNLOGGED reset; a separate CI step does an
      // actual isolated postgres SIGKILL/restart, never touching production.
      await client.query("TRUNCATE clean.prepaid_probe_item_runtime,clean.prepaid_probe_delivery_runtime,clean.prepaid_probe_session_runtime");
      const after=await readDisposablePostgresContinuitySnapshotV39(client,SESSION);
      expect(after).toMatchObject({
        sessionRows:0,deliveryRows:0,itemRows:0,
        loggedRawBlobRefs:1,linkedDeliveryBlobRefs:0
      });
      const decision=assessSyntheticPostgresContinuityV39(after,baseline);
      expect(decision).toMatchObject({
        continuityPreflightPassed:false,mandatoryCensor:true,
        scientificRunAuthorized:false,automaticRestoreAllowed:false
      });
      expect(decision.reasons).toEqual(expect.arrayContaining([
        "UNLOGGED_SESSION_UNAVAILABLE","DELIVERY_LEDGER_INCOMPLETE",
        "RAW_BLOB_LINKAGE_INCOMPLETE"
      ]));
      // Even an apparently reconstructed ledger is NOT enough after a
      // changed server lifecycle; it requires a prospectively signed recovery.
      const recreated=assessSyntheticPostgresContinuityV39({
        ...healthy,postmasterStartUtc:"2026-10-12T02:00:00.000Z"
      },baseline);
      expect(recreated.reasons).toContain("DATABASE_LIFECYCLE_CHANGED_NO_AUTO_RESTORE");
      console.log("P13_SYNTHETIC_POSTGRES_UNLOGGED_LOSS_CENSORED=true");
      console.log("P13_PRODUCTION_RECOVERY_AUTHORIZED=false");
    }finally{client.release();}
  });

  it("P13/P14 actual V3.9 route cannot claim original independent edge UTC from Replit processing time",async()=>{
    // Synthetic signed source arrives at the edge one minute earlier than the
    // actual local HTTP processing. Real V3.9 currently stores the REPLIT
    // processing time; its SQL row does not have the signed first-edge UTC.
    // A valid object SHA and identical credits must NOT pass source provenance.
    const now=Date.now();
    const srcUtc=new Date(now-90_000).toISOString();
    const fakeAttemptUtc=new Date(now-91_000).toISOString();
    const windowStart=new Date(now-3_600_000).toISOString();
    const windowEnd=new Date(now+3_600_000).toISOString();
    const body=sample({
      id:"v39-edge-clock-gap-001",
      timestampUtc:fakeAttemptUtc,
      deliveryAttempt:{seqNo:0,costCredits:1,timestampUtc:fakeAttemptUtc}
    });
    const wire=JSON.stringify(body);
    const source=await createSyntheticDualSourceMessageV2({
      rawBytes:new TextEncoder().encode(wire),
      sessionId:SESSION,expectedProviderSubscriptionId:SUB,
      trustedReceivedAtUtc:srcUtc,
      privateEdgeSigningKey:"offline-edge-".padEnd(64,"e")
    });
    const t0=performance.now();
    const response=await fetch(localOrigin+actualPath,{
      method:"POST",headers:{"content-type":"application/json"},body:wire
    });
    const sendDurationMs=performance.now()-t0;
    expect(response.status).toBe(200);
    const rows=await state.pool!.query(
      "SELECT d.raw_body_sha256,d.received_at_utc,"+
      " d.delivery_attempt_cost_credits,b.content_sha256,b.object_name "+
      "FROM clean.prepaid_probe_delivery_runtime d "+
      "JOIN clean.provider_content_blob_ref b ON b.blob_ref_id=d.blob_ref_id "+
      "WHERE d.session_id=$1",[SESSION]
    );
    expect(rows.rows).toHaveLength(1);
    const row=rows.rows[0];
    const bytes=state.blobs.get(row.object_name);
    expect(bytes).toBeDefined();
    const {createHash}=await import("node:crypto");
    const verifiedCanonicalSha=createHash("sha256").update(bytes!).digest("hex");
    expect(row.raw_body_sha256).toBe(source.receipt.canonicalSha256);
    expect(row.content_sha256).toBe(verifiedCanonicalSha);
    expect(row.content_sha256).toBe(source.receipt.canonicalSha256);
    const signedSender=signSyntheticSenderFrameV39({
      schema:"v39.phase2g-synthetic-independent-sender.v1",
      mode:"synthetic-only",
      sessionId:SESSION,providerSubscriptionId:SUB,
      ownerFrozenRunSha256:"a".repeat(64),
      windowStartUtc:windowStart,windowEndUtc:windowEnd,
      attempts:[{
        attemptKey:source.receipt.attemptKey,
        notificationId:source.receipt.notificationId,
        attemptSeqNo:source.receipt.attemptSeqNo,
        providerAttemptUtc:source.receipt.providerAttemptUtc,
        providerGeneratedUtc:source.receipt.providerGeneratedUtc,
        wireSha256:source.receipt.wireSha256,
        canonicalSha256:source.receipt.canonicalSha256,
        syntheticCostCredits:source.receipt.syntheticCostCredits,
        senderResponseStatus:response.status,
        senderResponseElapsedMs:sendDurationMs
      }]
    },"offline-sender-".padEnd(64,"s"));
    const result=await reconcileSyntheticSignedAttemptsV39({
      signedSender,independentSenderKey:"offline-sender-".padEnd(64,"s"),
      edgeSigningKey:"offline-edge-".padEnd(64,"e"),
      expectedSessionId:SESSION,expectedProviderSubscriptionId:SUB,
      expectedOwnerFrozenRunSha256:"a".repeat(64),
      trustedAuditUtc:new Date().toISOString(),
      signedEdgeReceipts:[source],
      committedInternal:[{
        attemptKey:source.receipt.attemptKey,
        canonicalSha256:row.raw_body_sha256,
        rawObjectReadbackSha256:verifiedCanonicalSha,
        // Use the ACTUAL SQL timestamp, not source's independently
        // signed edge time, to expose today's scientific provenance gap.
        originalEdgeReceivedUtc:new Date(row.received_at_utc).toISOString(),
        syntheticCostCredits:Number(row.delivery_attempt_cost_credits)
      }]
    });
    expect(result).toMatchObject({
      attemptedCredits:1,edgeCredits:1,internallyCommittedCredits:1,
      attemptEvidenceConsistent:false,scientificCompletionAuthorized:false,
      automaticRecoveryAuthorized:false
    });
    expect(result.errors).toContain("INTERNAL_ORIGINAL_SOURCE_UTC_SHIFTED");
    console.log("ACTUAL_V39_ORIGINAL_EDGE_UTC_IN_SQL=false");
    console.log("P13_P14_EXACT_CREDITS_WITH_TIMESTAMP_DIVERGENCE_CENSORED=true");
    console.log("PAID_PROVIDER_CALLS=0");
  });

  it("P13 signed owner freeze cannot turn surviving raw metadata into a valid recovered session",async()=>{
    // All keys, data and tables are ephemeral test-only; no real signed
    // owner authority and no provider-signed delivery evidence.
    const {generateKeyPairSync}=await import("node:crypto");
    const keys=generateKeyPairSync("ed25519");
    const publicKey=keys.publicKey.export({type:"spki",format:"pem"}).toString();
    const pin=syntheticOwnerPublicKeyFingerprintV39(publicKey);
    const response=await fetch(localOrigin+actualPath,{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify(sample({id:"signed-owner-v39-local-sql-only"}))
    });
    expect(response.status).toBe(200);
    const client=await state.pool!.connect();
    try{
      const before=await readDisposablePostgresContinuitySnapshotV39(client,SESSION);
      expect(before).toMatchObject({
        sessionRows:1,deliveryRows:1,loggedRawBlobRefs:1,
        linkedDeliveryBlobRefs:1
      });
      const now=Date.now(),start=new Date(now+60_000).toISOString();
      const owner={
        schema:"v39.phase2g.synthetic-owner-freeze.v1" as const,
        mode:"synthetic-only" as const,
        owner:"github-actions-emulator" as const,
        stage:"Phase2G-Stage1" as const,
        sessionId:SESSION,providerSubscriptionId:SUB,
        frozenPlanSha256:"a".repeat(64),
        frozenImplementationSha256:"b".repeat(64),
        ownerCommitSha:"c".repeat(40),receiverCommitSha:"d".repeat(40),
        databasePostmasterStartUtc:before.postmasterStartUtc,
        signedAtUtc:new Date(now).toISOString(),
        windowStartUtc:start,
        windowEndUtc:new Date(Date.parse(start)+7_200_000).toISOString(),
        airportIcao:"YSSY" as const,
        physicalFlightContract:"v39-physical-flight-instance-v2" as const,
        sampleBucketMinutes:15 as const,maxDeliveryRetries:0 as const,
        providerCreditCeiling:500 as const,stage1ReserveCredits:450 as const,
        protectedAccountFloorCredits:1000 as const,
        providerEmulatorOnly:true as const
      };
      const signed=signSyntheticOwnerFreezeV39(owner,keys.privateKey);
      const valid=verifySyntheticOwnerFreezeV39({
        signed,trustedOwnerPublicKeyPem:publicKey,
        pinnedOwnerPublicKeySha256:pin,expectedIndependentFreeze:owner
      });
      expect(valid.ownerSignatureVerified).toBe(true);
      expect(valid.productionOwnerAuthority).toBe(false);
      expect(valid.scientificRecoveryAuthorized).toBe(false);
      const safeBefore=assessSyntheticPostgresContinuityV39(before,{
        frozenPostmasterStartUtc:valid.freeze.databasePostmasterStartUtc,
        expectedDeliveryRows:1,expectedItemRows:0,
        independentOwnerSessionBindingVerified:valid.ownerSignatureVerified,
        independentAttemptAccountingVerified:false
      });
      expect(safeBefore.reasons).toContain("ATTEMPT_ACCOUNTING_UNVERIFIED");
      expect(safeBefore.mandatoryCensor).toBe(true);
      // Actual PostgreSQL disposable UNLOGGED reset; the LOGGED raw evidence
      // persists, and a correctly signed owner fixture is NOT enough.
      await client.query(
        "TRUNCATE clean.prepaid_probe_item_runtime,clean.prepaid_probe_delivery_runtime,clean.prepaid_probe_session_runtime"
      );
      const after=await readDisposablePostgresContinuitySnapshotV39(client,SESSION);
      expect(after).toMatchObject({
        sessionRows:0,deliveryRows:0,loggedRawBlobRefs:1,
        linkedDeliveryBlobRefs:0
      });
      const decision=assessSyntheticPostgresContinuityV39(after,{
        frozenPostmasterStartUtc:valid.freeze.databasePostmasterStartUtc,
        expectedDeliveryRows:1,expectedItemRows:0,
        independentOwnerSessionBindingVerified:valid.ownerSignatureVerified,
        independentAttemptAccountingVerified:false
      });
      expect(decision).toMatchObject({
        mandatoryCensor:true,scientificRunAuthorized:false,
        automaticRestoreAllowed:false
      });
      expect(decision.reasons).toEqual(expect.arrayContaining([
        "UNLOGGED_SESSION_UNAVAILABLE","DELIVERY_LEDGER_INCOMPLETE",
        "RAW_BLOB_LINKAGE_INCOMPLETE","ATTEMPT_ACCOUNTING_UNVERIFIED"
      ]));
      console.log("SIGNED_OWNER_FIXTURE_CANNOT_AUTHORIZE_RECOVERY=true");
      console.log("P13_LOGGED_BLOBS_WITH_MISSING_UNLOGGED_LEDGER_CENSORED=true");
      console.log("REAL_PROVIDER_CALLS=0");
    }finally{client.release();}
  });

  it("P13 two-stage LOGGED journal rejects re-binding one frozen plan to a second subscription and survives future crash",async()=>{
    const {generateKeyPairSync}=await import("node:crypto");
    const pair=generateKeyPairSync("ed25519");
    const pem=pair.publicKey.export({format:"pem",type:"spki"}).toString();
    const pin=syntheticOwnerPublicKeyFingerprintV39(pem);
    await state.pool!.query(
      "CREATE SCHEMA IF NOT EXISTS p2g_two_stage_fixture"
    );
    await state.pool!.query(
      "CREATE TABLE IF NOT EXISTS p2g_two_stage_fixture.owner_bindings("+
      "plan_sha256 text PRIMARY KEY,subscription_id text UNIQUE NOT NULL,"+
      "create_attempt_sha256 text UNIQUE NOT NULL,"+
      "post_freeze_sha256 text NOT NULL,signed_binding_sha256 text NOT NULL,"+
      "bound_at_utc timestamptz NOT NULL)"
    );
    const plan={
      schema:"v39.phase2g.synthetic-owner-freeze.v1" as const,
      mode:"synthetic-only" as const,
      owner:"github-actions-emulator" as const,
      stage:"Phase2G-Stage1" as const,
      sessionId:SESSION,
      providerSubscriptionId:null,
      phase:"pre_subscription" as const,
      frozenAtUtc:"2026-10-12T02:54:00.000Z",
      frozenPlanSha256:"a".repeat(64),
      frozenImplementationSha256:"b".repeat(64),
      ownerCommitSha:"c".repeat(40),
      receiverCommitSha:"d".repeat(40),
      databasePostmasterStartUtc:"2026-10-10T01:00:00.000Z",
      windowStartUtc:"2026-10-12T03:00:00.000Z",
      windowEndUtc:"2026-10-12T05:00:00.000Z",
      airportIcao:"YSSY" as const,
      physicalFlightContract:"v39-physical-flight-instance-v2" as const,
      sampleBucketMinutes:15 as const,
      maxDeliveryRetries:0 as const,
      providerCreditCeiling:500 as const,
      stage1ReserveCredits:450 as const,
      protectedAccountFloorCredits:1000 as const,
      providerEmulatorOnly:true as const
    };
    const created="2026-10-12T02:56:00.000Z";
    const bound="2026-10-12T02:57:00.000Z";
    const attemptSha="6".repeat(64);
    const sub="synthetic-unique-journal-sub-001";
    const signed=makeSyntheticTwoStageOwnerV39({
      plan,subscriptionId:sub,providerCreatedAtUtc:created,
      boundAtUtc:bound,createAttemptSha256:attemptSha,
      ownerPrivateKey:pair.privateKey
    });
    const verification={
      ...signed,
      trustedOwnerPublicKeyPem:pem,pinnedOwnerPublicKeySha256:pin,
      independentlyExpectedPlan:plan,
      independentlyReportedSubscriptionId:sub,
      independentlyReportedCreateAttemptSha256:attemptSha,
      independentlyReportedCreatedAtUtc:created
    };
    const clients=await Promise.all([state.pool!.connect(),state.pool!.connect()]);
    try{
      // Duplicate concurrent journals must collapse to one LOGGED row.
      const accepted=await Promise.all(clients.map(client=>
        recordSyntheticTwoStageOwnerBindingV39({client,verification})
      ));
      expect(accepted.map(x=>x.duplicate).sort()).toEqual([false,true]);
      expect(accepted.every(x=>x.paidLaunchAuthorized===false&&
        x.productionSubscriptionUniquenessProven===false)).toBe(true);
      const afterFirst=await clients[0].query(
        "SELECT count(*)::int AS total FROM p2g_two_stage_fixture.owner_bindings"
      );
      expect(afterFirst.rows[0].total).toBe(1);
      const conflict=makeSyntheticTwoStageOwnerV39({
        plan,subscriptionId:"synthetic-unexpected-second-sub",
        providerCreatedAtUtc:created,boundAtUtc:bound,
        createAttemptSha256:"7".repeat(64),ownerPrivateKey:pair.privateKey
      });
      const badVerification={
        ...conflict,trustedOwnerPublicKeyPem:pem,pinnedOwnerPublicKeySha256:pin,
        independentlyExpectedPlan:plan,
        independentlyReportedSubscriptionId:"synthetic-unexpected-second-sub",
        independentlyReportedCreateAttemptSha256:"7".repeat(64),
        independentlyReportedCreatedAtUtc:created
      };
      await expect(recordSyntheticTwoStageOwnerBindingV39({
        client:clients[0],verification:badVerification
      })).rejects.toThrow("TWO_STAGE_IMMUTABLE_JOURNAL_CONFLICT");
      const afterConflict=await clients[0].query(
        "SELECT count(*)::int AS total, min(subscription_id) AS sub "+
        "FROM p2g_two_stage_fixture.owner_bindings"
      );
      expect(afterConflict.rows[0]).toMatchObject({total:1,sub});
      console.log("TWO_STAGE_LOGGED_SINGLE_PLAN_BINDING=1");
      console.log("TWO_STAGE_SECOND_SUBSCRIPTION_REFUSED=true");
      console.log("TWO_STAGE_REAL_PROVIDER_CREATE_NOT_PROVEN=true");
    }finally{
      for(const client of clients)client.release();
    }
    // Intentionally leave this FICTIONAL fixture row in the disposable CI
    // Postgres service for the real SIGKILL/restart step to query.
  });

  it("P15 physical-v2 item loss after disposable UNLOGGED reset mandates scientific censor",async()=>{
    const leg={
      id:"synthetic-provider-leg-crash-001",number:"QF702",
      codeshareStatus:"IsOperator",
      airline:{iata:"QF",icao:"QFA"},
      departure:{airport:{icao:"YSSY",timeZone:"Australia/Sydney"},
        scheduledTime:{utc:"2026-10-12T03:40:00.000Z"}},
      arrival:{airport:{icao:"YMEL"},
        scheduledTime:{utc:"2026-10-12T05:15:00.000Z"}},
      aircraft:{reg:"VH-CRS"},callSign:"QFA702"
    };
    const response=await fetch(localOrigin+actualPath,{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify(sample({id:"synthetic-operator-physical-crash-001",flights:[leg]}))
    });
    expect(response.status).toBe(200);
    const sql="SELECT session_id::text,delivery_id,item_index,raw_item_sha256,"+
      "received_at_utc,identity_resolution_status,codeshare_resolution_status,"+
      "flight_instance_id,initial_service_date::text,operating_carrier,"+
      "operating_flight_number,origin_icao,destination_icao,scheduled_gate_out_utc "+
      "FROM clean.prepaid_probe_item_runtime WHERE session_id=$1";
    const before=await state.pool!.query(sql,[SESSION]);
    expect(before.rowCount).toBe(1);
    const row=before.rows[0];
    expect(row).toMatchObject({
      identity_resolution_status:"resolved",
      codeshare_resolution_status:"resolved_operator",
      operating_carrier:"QF",origin_icao:"YSSY",
      destination_icao:"YMEL",initial_service_date:"2026-10-12"
    });
    expect(row.flight_instance_id).toEqual(expect.any(String));
    const item:SyntheticPhysicalItemWitnessV39={
      sessionId:row.session_id,deliveryId:row.delivery_id,
      itemIndex:Number(row.item_index),rawItemSha256:row.raw_item_sha256,
      // Replit SQL processing UTC, NOT authenticated original edge UTC.
      originalEdgeReceivedUtc:new Date(row.received_at_utc).toISOString(),
      identityResolutionStatus:row.identity_resolution_status,
      codeshareResolutionStatus:row.codeshare_resolution_status,
      flightInstanceId:row.flight_instance_id,
      initialServiceDate:row.initial_service_date,
      operatingCarrier:row.operating_carrier,
      operatingFlightNumber:row.operating_flight_number,
      originIcao:row.origin_icao,destinationIcao:row.destination_icao,
      scheduledGateOutUtc:row.scheduled_gate_out_utc?
        new Date(row.scheduled_gate_out_utc).toISOString():null
    };
    const start=new Date(Date.parse(item.originalEdgeReceivedUtc)-60000).toISOString();
    const endUtc=new Date(Date.parse(start)+7200000).toISOString();
    const input={
      frozenSessionId:SESSION,windowStartUtc:start,windowEndUtc:endUtc,
      independentSourceEvidenceAuthenticated:false,
      independentOwnerFreezeAuthenticated:false,
      expectedWitnesses:[item],observedRuntimeRows:[item]
    };
    const beforeDecision=compareSyntheticPhysicalItemContinuityV39(input);
    expect(beforeDecision).toMatchObject({
      expectedItemCount:1,observedItemCount:1,
      confirmedOperatorObservationRows:1,
      confirmedUniqueOperatorFlightCount:1,
      mandatoryCensor:true,scientificRunAuthorized:false
    });
    expect(beforeDecision.errors).toContain(
      "SOURCE_ITEM_WITNESS_NOT_INDEPENDENTLY_AUTHENTICATED"
    );
    // Disposable state removal; this test is NOT an actual DB SIGKILL.
    await state.pool!.query(
      "TRUNCATE clean.prepaid_probe_item_runtime,clean.prepaid_probe_delivery_runtime,clean.prepaid_probe_session_runtime"
    );
    const after=await state.pool!.query(sql,[SESSION]);
    expect(after.rowCount).toBe(0);
    const logged=await state.pool!.query(
      "SELECT count(*)::int AS n FROM clean.provider_content_blob_ref"
    );
    expect(logged.rows[0].n).toBe(1);
    const result=compareSyntheticPhysicalItemContinuityV39({
      ...input,observedRuntimeRows:[]
    });
    expect(result).toMatchObject({
      expectedItemCount:1,observedItemCount:0,mandatoryCensor:true,
      scientificRunAuthorized:false,automaticRestorationAuthorized:false
    });
    expect(result.errors).toEqual(expect.arrayContaining([
      "MISSING_PHYSICAL_ITEM_AFTER_CRASH",
      "PHYSICAL_ITEM_LEDGER_COUNT_DIFFERENT",
      "SOURCE_ITEM_WITNESS_NOT_INDEPENDENTLY_AUTHENTICATED"
    ]));
    console.log("P15_ACTUAL_OPERATOR_PHYSICAL_V2_ITEM_LOST_AFTER_UNLOGGED_RESET=true");
    console.log("P15_REAL_SOURCE_ITEMS_INDEPENDENTLY_ATTESTED=false");
    console.log("P15_PAID_RECOVERY_AUTHORIZED=false");
  });

  it("P09-P13 synthetic R2 edge -> real V3.9 disposable SQL -> UNLOGGED loss: receipt survives but science MUST censor",async()=>{
    const secret="synthetic-bridge-"+"q".repeat(40);
    const signing="synthetic-bridge-signing-"+"k".repeat(48);
    const rawPayload=JSON.stringify(sample({
      id:"synthetic-edge-real-v39-bridge-001",
      flights:[{
        id:"synthetic-yssy-flight-bridge-001",number:"QF709",
        codeshareStatus:"IsOperator",
        airline:{iata:"QF",icao:"QFA"},
        departure:{airport:{icao:"YSSY",timeZone:"Australia/Sydney"},
          scheduledTime:{utc:"2026-10-12T03:45:00.000Z"}},
        arrival:{airport:{icao:"YMEL"},
          scheduledTime:{utc:"2026-10-12T05:15:00.000Z"}}
      }]
    }),null,2);
    const sourceBytes=new TextEncoder().encode(rawPayload);
    const sourceSha=offlineShaHash("sha256").update(sourceBytes).digest("hex");
    const rawMap=new Map<string,{bytes:Uint8Array;etag:string}>();
    const queued:{receiptKey:string}[]=[];
    const env:SyntheticEdgeEnv={
      EDGE_EXECUTION_MODE:"synthetic-only",
      EDGE_TEST_SECRET:secret,
      EDGE_ALLOW_SYNTHETIC_RELAY:"1",
      EDGE_SANDBOX_RECEIVER_ORIGIN:"https://sandbox.bridge.invalid",
      EDGE_TEST_RECEIVER_PATH_SECRET:"p".repeat(40),
      EDGE_PROVENANCE_SIGNING_KEY:signing,
      RAW:{
        async put(key,value,options){
          if(options?.onlyIf?.etagDoesNotMatch==="*"&&rawMap.has(key))
            return null;
          if(options?.onlyIf?.etagMatches&&
             rawMap.get(key)?.etag!==options.onlyIf.etagMatches)
            return null;
          const bytes=typeof value==="string"?
            new TextEncoder().encode(value):
            new Uint8Array(value);
          const etag=offlineShaHash("sha256").update(bytes).digest("hex");
          rawMap.set(key,{bytes:new Uint8Array(bytes),etag});
          return {key,etag,size:bytes.length};
        },
        async get(key){
          const entry=rawMap.get(key);
          if(!entry)return null;
          return {
            key,etag:entry.etag,size:entry.bytes.length,
            text:async()=>new TextDecoder().decode(entry.bytes),
            arrayBuffer:async()=>entry.bytes.slice().buffer
          };
        },
        async head(key){
          const entry=rawMap.get(key);
          return entry?{key,etag:entry.etag,size:entry.bytes.length}:null;
        },
        async list(){
          return {objects:[],truncated:false};
        }
      },
      DELIVERY_QUEUE:{async send(msg){queued.push(msg)}}
    };
    const edgeUrl="https://sandbox.edge.invalid/api/v1/webhooks/aerodatabox/"+
      secret+"/prepaid/"+SESSION;
    const sourceAck=await syntheticEdgeIngest(new Request(edgeUrl,{
      method:"POST",headers:{
        "content-type":"application/json",
        "x-p2g-synthetic-attempt-id":"bridge:1"
      },body:rawPayload
    }),env);
    expect(sourceAck.status).toBe(200);
    expect(queued).toHaveLength(1);
    const receiptKey=queued[0].receiptKey;
    const receiptRaw=rawMap.get(receiptKey)!;
    const receipt=JSON.parse(new TextDecoder().decode(receiptRaw.bytes));
    expect(receipt.sourceSha256).toBe(sourceSha);
    expect(rawMap.get(receipt.rawKey)?.bytes).toEqual(sourceBytes);
    const firstEdgeUtc=receipt.firstEdgeReceivedAtUtc;
    const originalFetch=globalThis.fetch;
    let bridgeCalls=0;
    globalThis.fetch=(async(url,options)=>{
      if(String(url)!=="https://sandbox.bridge.invalid/__p2g-sandbox-verify")
        throw new Error("SYNTHETIC_BRIDGE_EXTERNAL_NETWORK_REFUSED");
      bridgeCalls++;
      const headers=options?.headers as Record<string,string>;
      const proof=await verifyEdgeProvenanceV1({
        v:1,sessionId:SESSION,
        receiptId:receipt.id,providerAttemptId:"bridge:1",
        sourceSha256:sourceSha,edgeReceivedAtUtc:firstEdgeUtc
      },signing,headers["x-p2g-edge-provenance-hmac"],{
        sessionId:SESSION,receiptId:receipt.id,sourceSha256:sourceSha
      });
      expect(proof).toBe(true);
      expect(headers["x-p2g-edge-received-at"]).toBe(firstEdgeUtc);
      const posted=await originalFetch(localOrigin+actualPath,{
        method:"POST",headers:{"content-type":"application/json"},
        body:options?.body as BodyInit
      });
      const success=posted.status===200&&(await count()).unlogged===1;
      return new Response(JSON.stringify({
        persisted:success,sourceSha256:sourceSha
      }),{status:success?200:503});
    }) as typeof fetch;
    const ack=vi.fn(),retry=vi.fn();
    const batch={messages:[{body:queued[0],ack,retry}]};
    try{
      await syntheticEdgeConsume(batch,env);
      expect(ack).toHaveBeenCalledTimes(1);
      expect(retry).not.toHaveBeenCalled();
      expect(bridgeCalls).toBe(1);
      const before=await count();
      expect(before).toMatchObject({logged:1,unlogged:1});
      const items=await state.pool!.query(
        "SELECT flight_instance_id,operating_carrier,origin_icao,"+
        "destination_icao FROM clean.prepaid_probe_item_runtime WHERE session_id=$1",
        [SESSION]
      );
      expect(items.rowCount).toBe(1);
      expect(items.rows[0]).toMatchObject({
        operating_carrier:"QF",origin_icao:"YSSY",destination_icao:"YMEL"
      });
      expect(items.rows[0].flight_instance_id).toEqual(expect.any(String));
      const processedKey=receiptKey.replace("/index/","/processed/");
      expect(rawMap.has(processedKey)).toBe(true);
      const sourceReadback=rawMap.get(receipt.rawKey)!;
      expect(offlineShaHash("sha256").update(sourceReadback.bytes)
        .digest("hex")).toBe(sourceSha);
      // A disposable UNLOGGED reset simulates the relevant part of a
      // PostgreSQL crash, NOT actual Replit, Cloudflare or provider failure.
      await state.pool!.query(
        "TRUNCATE clean.prepaid_probe_item_runtime,"+
        "clean.prepaid_probe_delivery_runtime,"+
        "clean.prepaid_probe_session_runtime"
      );
      const lost=await count();
      expect(lost).toMatchObject({logged:1,unlogged:0});
      // The signed edge record AND "processed" marker still exist. Replaying
      // this Queue entry alone ACKs, but DOES NOT recreate PostgreSQL items.
      await syntheticEdgeConsume(batch,env);
      expect(ack).toHaveBeenCalledTimes(2);
      expect(bridgeCalls).toBe(1);
      const scienceRows=await state.pool!.query(
        "SELECT count(*)::int AS n FROM clean.prepaid_probe_item_runtime "+
        "WHERE session_id=$1",[SESSION]
      );
      expect(scienceRows.rows[0].n).toBe(0);
      expect(firstEdgeUtc).toMatch(/Z$/);
      console.log("P13_EDGE_SOURCE_BYTES_SURVIVED_DB_RESET=true");
      console.log("P13_PROCESSED_EDGE_MARKER_NOT_SUFFICIENT_FOR_SQL_RECOVERY=true");
      console.log("P13_REAL_PROVIDER_SOURCE_VERIFIED=false");
      console.log("P13_SCIENTIFIC_RECOVERY_AUTHORIZED=false");
    }finally{globalThis.fetch=originalFetch;}
  });

  it("P13 LOGGED signed physical-v2 science journal survives UNLOGGED loss, detects missing items, rejects owner/source tamper",async()=>{
    await state.pool!.query(
      "CREATE SCHEMA IF NOT EXISTS p2g_science_recovery_fixture"
    );
    await state.pool!.query(
      "CREATE TABLE IF NOT EXISTS p2g_science_recovery_fixture.signed_source_item_journal("+
      "session_id uuid NOT NULL,attempt_key text NOT NULL,signed_record jsonb NOT NULL,"+
      "PRIMARY KEY(session_id,attempt_key))"
    );
    const wire=JSON.stringify(sample({
      id:"synthetic-logged-science-physical-yssy-001",
      flights:[{
        id:"p13-journal-operator-flight-001",number:"QF710",
        codeshareStatus:"IsOperator",
        airline:{iata:"QF",icao:"QFA"},
        departure:{airport:{icao:"YSSY",timeZone:"Australia/Sydney"},
          scheduledTime:{utc:"2026-10-12T03:55:00.000Z"}},
        arrival:{airport:{icao:"YMEL"},
          scheduledTime:{utc:"2026-10-12T05:20:00.000Z"}}
      }]
    }),null,2);
    const originalRawBytes=new TextEncoder().encode(wire);
    const sourceWireSha256=offlineShaHash("sha256")
      .update(originalRawBytes).digest("hex");
    const sent=await fetch(localOrigin+actualPath,{
      method:"POST",headers:{"content-type":"application/json"},
      body:wire
    });
    expect(sent.status).toBe(200);
    const query=
      "SELECT session_id::text,delivery_id,item_index,raw_item_sha256,"+
      "identity_resolution_status,codeshare_resolution_status,"+
      "flight_instance_id,initial_service_date::text,operating_carrier,"+
      "operating_flight_number,origin_icao,destination_icao,scheduled_gate_out_utc "+
      "FROM clean.prepaid_probe_item_runtime WHERE session_id=$1";
    const result=await state.pool!.query(query,[SESSION]);
    expect(result.rowCount).toBe(1);
    const p=result.rows[0];
    const firstEdgeReceivedUtc="2026-10-12T03:02:14.000Z";
    const item:SyntheticPhysicalItemWitnessV39={
      sessionId:p.session_id,deliveryId:p.delivery_id,itemIndex:Number(p.item_index),
      rawItemSha256:p.raw_item_sha256,
      // Authenticated original edge time NOT captured by live V3.9.
      // This is a synthetic independent frozen fixture timestamp ONLY.
      originalEdgeReceivedUtc:firstEdgeReceivedUtc,
      identityResolutionStatus:p.identity_resolution_status,
      codeshareResolutionStatus:p.codeshare_resolution_status,
      flightInstanceId:p.flight_instance_id,
      initialServiceDate:p.initial_service_date,
      operatingCarrier:p.operating_carrier,
      operatingFlightNumber:p.operating_flight_number,
      originIcao:p.origin_icao,destinationIcao:p.destination_icao,
      scheduledGateOutUtc:p.scheduled_gate_out_utc?
        new Date(p.scheduled_gate_out_utc).toISOString():null
    };
    expect(item.flightInstanceId).toEqual(expect.any(String));
    expect(item.identityResolutionStatus).toBe("resolved");
    expect(item.codeshareResolutionStatus).toBe("resolved_operator");
    const ownerFrozenRunSha256="1".repeat(64);
    const frame:SyntheticScienceJournalFrameV39={
      schema:"v39.synthetic-logged-science-recovery.v1",
      sessionId:SESSION,providerSubscriptionId:SUB,
      ownerFrozenRunSha256,
      windowStartUtc:"2026-10-12T03:00:00.000Z",
      windowEndUtc:"2026-10-12T05:00:00.000Z",
      attemptKey:"journal:operator:1",
      sourceWireSha256,firstEdgeReceivedUtc,
      syntheticCostCredits:1,items:[item]
    };
    const expected={
      sessionId:SESSION,providerSubscriptionId:SUB,
      ownerFrozenRunSha256,attemptKey:frame.attemptKey
    };
    const fixtureKey="p13-test-only-recovery-signing-key-"+"k".repeat(64);
    const signed=signSyntheticScienceRecoveryFrameV39(frame,fixtureKey);
    const sql=await state.pool!.connect();
    try{
      const options={client:sql,signed,fixtureKey,originalRawBytes,expected};
      const first=await writeSyntheticLoggedScienceJournalV39(options);
      expect(first).toMatchObject({
        inserted:true,sourceWireSha256,
        originalEdgeUtc:firstEdgeReceivedUtc
      });
      const duplicate=await writeSyntheticLoggedScienceJournalV39(options);
      expect(duplicate.inserted).toBe(false);
      const verified=await reviewSyntheticLoggedScienceJournalV39({
        client:sql,fixtureKey,expected,originalRawBytes,observedRuntimeRows:[item]
      });
      expect(verified).toMatchObject({
        journalCryptographicallyConsistent:true,
        originalWireBytesMatched:true,
        sourceAndItemContinuityConsistent:false,
        expectedItems:1,runtimeItems:1,
        uniquePhysicalOperatorFlights:1,
        scientificallyCertified:false,paidRunAuthorized:false,
        automaticReplayAuthorized:false
      });
      expect(verified.errors).toContain(
        "SOURCE_ITEM_WITNESS_NOT_INDEPENDENTLY_AUTHENTICATED"
      );
      // Exact same attempt cannot bind to a different flight/service.
      const altered=signSyntheticScienceRecoveryFrameV39({
        ...frame,items:[{...item,operatingFlightNumber:"QF999"}]
      },fixtureKey);
      await expect(writeSyntheticLoggedScienceJournalV39({
        ...options,signed:altered
      })).rejects.toThrow("P13_LOGGED_SCIENCE_ATTEMPT_IDENTITY_CONFLICT");
      // Even the correct signed journal cannot prove bytes that vanished.
      const missingWire=await reviewSyntheticLoggedScienceJournalV39({
        client:sql,fixtureKey,expected,
        originalRawBytes:new TextEncoder().encode("damaged original"),
        observedRuntimeRows:[item]
      });
      expect(missingWire.originalWireBytesMatched).toBe(false);
      expect(missingWire.errors).toContain(
        "P13_RECOVERY_WIRE_SOURCE_UNAVAILABLE_OR_CHANGED"
      );
      await sql.query(
        "TRUNCATE clean.prepaid_probe_session_runtime,"+
        "clean.prepaid_probe_delivery_runtime,"+
        "clean.prepaid_probe_item_runtime"
      );
      const lostRuntime=await sql.query(query,[SESSION]);
      expect(lostRuntime.rowCount).toBe(0);
      const journalSurvival=await sql.query(
        "SELECT count(*)::int AS n FROM "+
        "p2g_science_recovery_fixture.signed_source_item_journal "+
        "WHERE session_id=$1",[SESSION]
      );
      expect(journalSurvival.rows[0].n).toBe(1);
      const after=await reviewSyntheticLoggedScienceJournalV39({
        client:sql,fixtureKey,expected,originalRawBytes,observedRuntimeRows:[]
      });
      expect(after).toMatchObject({
        journalCryptographicallyConsistent:true,
        originalWireBytesMatched:true,sourceAndItemContinuityConsistent:false,
        expectedItems:1,runtimeItems:0,
        uniquePhysicalOperatorFlights:1,
        scientificallyCertified:false,paidRunAuthorized:false,
        automaticReplayAuthorized:false
      });
      expect(after.errors).toEqual(expect.arrayContaining([
        "MISSING_PHYSICAL_ITEM_AFTER_CRASH",
        "PHYSICAL_ITEM_LEDGER_COUNT_DIFFERENT",
        "P13_REAL_PROVIDER_ATTEMPT_ACCOUNTING_NOT_ATTESTED"
      ]));
      // Invalid signature/owner binding is independently rejected.
      await expect(reviewSyntheticLoggedScienceJournalV39({
        client:sql,fixtureKey,expected:{
          ...expected,ownerFrozenRunSha256:"0".repeat(64)
        },originalRawBytes,observedRuntimeRows:[]
      })).rejects.toThrow("P13_LOGGED_SCIENCE_JOURNAL_TAMPERED_OR_WRONG_OWNER");
      await sql.query(
        "UPDATE p2g_science_recovery_fixture.signed_source_item_journal "+
        "SET signed_record=jsonb_set(signed_record,'{frame,items,0,rawItemSha256}',"+
        "to_jsonb($1::text)) WHERE session_id=$2 AND attempt_key=$3",
        ["f".repeat(64),SESSION,frame.attemptKey]
      );
      await expect(reviewSyntheticLoggedScienceJournalV39({
        client:sql,fixtureKey,expected,originalRawBytes,observedRuntimeRows:[]
      })).rejects.toThrow("P13_LOGGED_SCIENCE_JOURNAL_TAMPERED_OR_WRONG_OWNER");
      console.log("P13_LOGGED_SIGNED_PHYSICAL_V2_JOURNAL_AFTER_UNLOGGED_RESET=1");
      console.log("P13_ORIGINAL_WIRE_SHA_AND_FIRST_EDGE_UTC_PRESERVED_TEST_ONLY=true");
      console.log("P13_TAMPER_AND_OWNER_BINDING_DETECTED=true");
      console.log("P13_REAL_SCIENTIFIC_RECONSTRUCTION_PROVEN=false");
      console.log("P13_REAL_PROVIDER_ATTEMPTS_INDEPENDENTLY_VERIFIED=false");
      console.log("P13_PAID_AUTO_RECOVERY_AUTHORIZED=false");
    }finally{sql.release();}
  });

});
