import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Offline behavioral tests of the actual prepaid persistence function.
 * No external fetch, Replit Object Storage client or scientific PostgreSQL pool.
 * Empty-flight fixture intentionally limits scope to delivery, blob and
 * callback accounting; physical-flight instance tests live elsewhere.
 */
const fake = vi.hoisted(() => ({
  connect: vi.fn(),
  poolQuery: vi.fn(),
  uploads: new Map<string, Uint8Array>(),
  events: [] as string[],
  injected: { deliveryInsertError: false, uploadError: false, corruptRead: false },
  session: { requests: 0, successes: 0, failures: 0 },
  deliveries: new Map<string, {blob:string,sha:string}>(),
  savedMetadata: 0,
  deleteCalls: 0,
}));

vi.mock("../server/lib/disruption/db_v39", () => ({
  v39Pool: { connect: fake.connect, query: fake.poolQuery },
}));

const objectStore = {
  async uploadBytes(key:string, bytes:Uint8Array) {
    fake.events.push("OBJECT_UPLOAD");
    if (fake.injected.uploadError) throw new Error("OFFLINE_UPLOAD_FAILURE");
    fake.uploads.set(key, new Uint8Array(bytes));
  },
  async exists(key:string) {
    fake.events.push("OBJECT_EXISTS");
    return fake.uploads.has(key);
  },
  async downloadBytes(key:string) {
    fake.events.push("OBJECT_ROUNDTRIP_READ");
    const bytes=fake.uploads.get(key);
    if(!bytes) throw new Error("OFFLINE_NO_OBJECT");
    if(fake.injected.corruptRead) return new Uint8Array([77,88]);
    return new Uint8Array(bytes);
  },
  async delete(key:string) {
    fake.events.push("OBJECT_DELETE");
    fake.deleteCalls++;
    fake.uploads.delete(key);
  },
};

vi.mock("../server/lib/disruption/replitProviderBlobStore_v39", () => ({
  createRequiredProviderBlobStoreV39: () => objectStore,
  normalizeProviderBlobBucketIdV39: (s:string) => s,
}));

import { persistPrepaidProbeWebhookV39 } from "../server/lib/disruption/prepaidProbeRuntime_v39";

const SESSION="12345678-1234-4234-8234-123456789abc";
const baseBody={ id:"offline-notification-1", subscription:{id:"offline-sub"}, flights:[], deliveryAttempt:{costCredits:1,seqNo:0} };

function setupDb() {
  const client={
    release: vi.fn(() => fake.events.push("RELEASE")),
    query: vi.fn(async (sql:string,params:any[]=[]) => {
      const q=sql.replace(/\s+/g," ").trim();
      const ok={rowCount:1,rows:[]};
      if(q==="BEGIN") {fake.events.push("BEGIN");return ok;}
      if(q==="COMMIT") {fake.events.push("COMMIT");return ok;}
      if(q==="ROLLBACK") {fake.events.push("ROLLBACK");return ok;}
      if(q==="SAVEPOINT phase2g_callback_payload") {fake.events.push("SAVEPOINT");return ok;}
      if(q==="ROLLBACK TO SAVEPOINT phase2g_callback_payload"){fake.events.push("PAYLOAD_ROLLBACK");return ok;}
      if(q.includes("FROM clean.prepaid_probe_session_runtime")&&q.includes("FOR UPDATE")) {
        fake.events.push("SESSION_LOCK");
        return {rowCount:1,rows:[{state:"active",provider_subscription_id:"offline-sub",expires_at_utc:"2099-01-01T00:00:00Z"}]};
      }
      if(q.includes("SET callback_requests_seen=callback_requests_seen+1")){
        fake.events.push("REQUEST_COUNTED");fake.session.requests++;return ok;
      }
      if(q.includes("FROM clean.prepaid_probe_delivery_runtime")&&q.includes("delivery_id=$2")){
        fake.events.push("DUPLICATE_LOOKUP");
        const d=fake.deliveries.get(String(params[1]));
        return d?{rowCount:1,rows:[{blob_ref_id:d.blob,raw_body_sha256:d.sha}]}:{rowCount:0,rows:[]};
      }
      if(q.startsWith("INSERT INTO clean.provider_content_blob_ref")){
        fake.events.push("LOGGED_BLOB_METADATA_INSERT");
        fake.savedMetadata++;return ok;
      }
      if(q.startsWith("INSERT INTO clean.prepaid_probe_delivery_runtime")){
        fake.events.push("UNLOGGED_DELIVERY_INSERT");
        if(fake.injected.deliveryInsertError)throw new Error("OFFLINE_INJECTED_DELIVERY_INSERT_ERROR");
        fake.deliveries.set(String(params[1]),{blob:String(params[2]),sha:String(params[3])});
        return ok;
      }
      if(q.includes("SET provider_subscription_id=COALESCE")||q.includes("provider_subscription_id=COALESCE")){
        fake.events.push("SUBSCRIPTION_BIND");return {rowCount:1,rows:[{session_id:SESSION}]};
      }
      if(q.includes("SET last_delivery_at_utc")){
        fake.events.push("LAST_DELIVERY");return ok;
      }
      if(q.includes("SET callback_success_2xx=callback_success_2xx+1")){
        fake.events.push("SUCCESS_COUNTED");fake.session.successes++;return ok;
      }
      if(q.includes("SET callback_failures=callback_failures+1")){
        fake.events.push("FAILURE_COUNTED");fake.session.failures++;return {rowCount:1,rows:[{session_id:SESSION}]};
      }
      throw new Error("UNEXPECTED_OFFLINE_SQL:"+q.slice(0,130));
    })
  };
  fake.connect.mockResolvedValue(client);
  return client;
}

beforeEach(()=>{
  vi.clearAllMocks();
  fake.uploads.clear();
  fake.events.length=0;
  fake.deliveries.clear();
  fake.savedMetadata=0;
  fake.deleteCalls=0;
  fake.injected={deliveryInsertError:false,uploadError:false,corruptRead:false};
  fake.session={requests:0,successes:0,failures:0};
  setupDb();
});

describe("P2G24 offline actual prepaid persistence failure injection",()=>{
  it("commits 2xx accounting only after storage roundtrip and delivery INSERT",async()=>{
    const result=await persistPrepaidProbeWebhookV39({sessionId:SESSION,body:baseBody});
    expect(result.duplicate).toBe(false);
    expect(result.itemCount).toBe(0);
    expect(fake.uploads.size).toBe(1);
    expect(fake.deliveries.size).toBe(1);
    expect(fake.savedMetadata).toBe(1);
    expect(fake.session).toEqual({requests:1,successes:1,failures:0});
    const ev=fake.events;
    const positions=["OBJECT_UPLOAD","OBJECT_EXISTS","OBJECT_ROUNDTRIP_READ","LOGGED_BLOB_METADATA_INSERT","UNLOGGED_DELIVERY_INSERT","SUCCESS_COUNTED","COMMIT"].map(x=>ev.indexOf(x));
    expect(positions.every(x=>x>=0)).toBe(true);
    expect(positions.every((x,i)=>i===0 || x>positions[i-1])).toBe(true);
    expect(fake.poolQuery).not.toHaveBeenCalled();
  });

  it("duplicate retry returns same delivery ID with no second upload or billed ledger row",async()=>{
    const first=await persistPrepaidProbeWebhookV39({sessionId:SESSION,body:baseBody});
    const repeat=await persistPrepaidProbeWebhookV39({sessionId:SESSION,body:baseBody});
    expect(repeat.deliveryId).toBe(first.deliveryId);
    expect(repeat.blobRefId).toBe(first.blobRefId);
    expect(repeat.duplicate).toBe(true);
    expect(fake.events.filter(x=>x==="OBJECT_UPLOAD")).toHaveLength(1);
    expect(fake.deliveries.size).toBe(1);
    expect(fake.savedMetadata).toBe(1);
    expect(fake.session).toEqual({requests:2,successes:2,failures:0});
    expect(fake.poolQuery).not.toHaveBeenCalled();
  });

  it("injected object upload failure never increments callback_success_2xx",async()=>{
    fake.injected.uploadError=true;
    await expect(persistPrepaidProbeWebhookV39({sessionId:SESSION,body:baseBody})).rejects.toThrow("OFFLINE_UPLOAD_FAILURE");
    expect(fake.session.successes).toBe(0);
    expect(fake.session.failures).toBe(1);
    expect(fake.deliveries.size).toBe(0);
    expect(fake.savedMetadata).toBe(0);
    expect(fake.events).toContain("PAYLOAD_ROLLBACK");
    expect(fake.events).toContain("FAILURE_COUNTED");
    expect(fake.events).toContain("COMMIT");
    expect(fake.poolQuery).not.toHaveBeenCalled();
  });

  it("injected object roundtrip corruption rejects before 2xx and deletes failed object",async()=>{
    fake.injected.corruptRead=true;
    await expect(persistPrepaidProbeWebhookV39({sessionId:SESSION,body:baseBody})).rejects.toThrow("PROVIDER_BLOB_ROUNDTRIP_MISMATCH");
    expect(fake.session.successes).toBe(0);
    expect(fake.session.failures).toBe(1);
    expect(fake.deliveries.size).toBe(0);
    expect(fake.uploads.size).toBe(0);
    expect(fake.deleteCalls).toBe(1);
    expect(fake.poolQuery).not.toHaveBeenCalled();
  });

  it("injected DB delivery INSERT failure rolls back, does not ack and deletes uploaded object",async()=>{
    fake.injected.deliveryInsertError=true;
    await expect(persistPrepaidProbeWebhookV39({sessionId:SESSION,body:baseBody})).rejects.toThrow("OFFLINE_INJECTED_DELIVERY_INSERT_ERROR");
    expect(fake.session.successes).toBe(0);
    expect(fake.session.failures).toBe(1);
    expect(fake.deliveries.size).toBe(0);
    expect(fake.uploads.size).toBe(0);
    expect(fake.deleteCalls).toBe(1);
    expect(fake.events.indexOf("PAYLOAD_ROLLBACK")).toBeGreaterThan(fake.events.indexOf("UNLOGGED_DELIVERY_INSERT"));
    expect(fake.events.indexOf("OBJECT_DELETE")).toBeGreaterThan(fake.events.indexOf("FAILURE_COUNTED"));
    expect(fake.poolQuery).not.toHaveBeenCalled();
  });
});