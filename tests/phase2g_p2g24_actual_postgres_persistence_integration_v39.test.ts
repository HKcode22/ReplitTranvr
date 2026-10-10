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
  failUpload:false,events:[] as string[]
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
    "notification_items integer,PRIMARY KEY(session_id,delivery_id))"
  ].join(" "));
},20000);
beforeEach(async()=>{
  state.blobs.clear();state.failUpload=false;state.events.length=0;
  await state.pool!.query(
    "TRUNCATE clean.provider_content_blob_ref,clean.prepaid_probe_delivery_runtime,clean.prepaid_probe_session_runtime");
  await state.pool!.query(
    "INSERT INTO clean.prepaid_probe_session_runtime(session_id,provider_subscription_id,state,expires_at_utc) VALUES($1,$2,'active','2099-01-01T00:00:00Z')",
    [SESSION,SUB]);
});
afterAll(async()=>{
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
});
