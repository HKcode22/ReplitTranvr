import {createHash} from "node:crypto";
import {describe,expect,it,vi} from "vitest";
import {preparePrepaidProbeSourceV39} from "../server/lib/disruption/prepaidProbeRuntime_v39";
import {verifyGate3OriginalCustodyV39} from "../server/lib/disruption/gate3LiveOriginalCustody_v39";

const sessionId="1789c946-f0f1-4b51-a25b-3fb41d7caf97";
const icao="WSSS", subscriptionId="gate3-provider-owned-sub";
const authorizationEvidenceSha256="a".repeat(64);
const timestamp="2026-10-16T20:00:00Z";

function fixture(){
  const body={
    id:"gate3-delivery-001",timestampUtc:timestamp,
    subscription:{id:subscriptionId},
    deliveryAttempt:{seqNo:0,timestampUtc:timestamp,costCredits:1},
    flights:[{
      id:"real-fixture-flight",number:"SQ001",
      departure:{airport:{icao},scheduledTime:{utc:timestamp}},
      arrival:{airport:{icao:"EGLL"}}
    }]
  };
  const prepared=preparePrepaidProbeSourceV39(sessionId,body);
  // Mock custody must be within the seven-day retention window whenever
  // CI runs. The older fixed 2026-10-16 timestamp expired on Oct 23 and
  // falsely pre-empted the intended independent tampering assertions.
  const persistedAt=new Date(Date.now()-60*60*1000).toISOString();
  const expiresAt=new Date(Date.parse(persistedAt)+168*3600*1000).toISOString();
  const row={
    delivery_id:prepared.deliveryId,raw_body_sha256:prepared.bodySha256,
    blob_ref_id:"10000000-0000-4000-8000-000000000001",
    provider_subscription_id:subscriptionId,
    notification_items:1,delivery_attempt_cost_credits:1,
    storage_kind:"replit_app_storage",
    contract_version:"provider-blob-contract-v39@1.0.0",
    content_class:"raw_provider_content",source_kind:"webhook",
    source_record_id:`prepaid:${sessionId}:${prepared.deliveryId}`,
    object_name:"v39/provider/raw_provider_content/10/10000000-0000-4000-8000-000000000001.blob",
    content_sha256:prepared.bodySha256,content_bytes:prepared.rawBytes.length,
    persisted_at_utc:persistedAt,expires_at_utc:expiresAt,
    retention_hours:168,deletion_verified_at_utc:null
  };
  const owner={
    owner_state:"PREPARED",owner_kind:"phase3_credit_canary",
    state:"settling",icao,owner_icao:icao,
    authorization_evidence_sha256:authorizationEvidenceSha256,
    provider_subscription_id:subscriptionId,
    callback_requests_seen:1,callback_success_2xx:1,callback_failures:0
  };
  const item={delivery_id:prepared.deliveryId,item_index:0,
    raw_item_sha256:prepared.itemRawSha256s[0]};
  return {owner,row,item,stored:prepared.rawBytes};
}
const scope={sessionId,icao,authorizationEvidenceSha256,
  providerSubscriptionId:subscriptionId,creditCeiling:50};

function mock(source=fixture()){
  const query=vi.fn(async (sql:string)=>{
    if(sql.startsWith("BEGIN")||sql.startsWith("SET")||sql==="ROLLBACK")
      return {rowCount:0,rows:[]};
    if(sql.includes("transaction_read_only"))return {rowCount:1,rows:[{mode:"on"}]};
    if(sql.includes("FROM clean.phase3_gate3_canary_owner_v39 o"))
      return {rowCount:1,rows:[source.owner]};
    if(sql.includes("FROM clean.prepaid_probe_delivery_runtime d"))
      return {rowCount:1,rows:[source.row]};
    if(sql.includes("FROM clean.provider_content_blob_ref\n"))
      return {rowCount:1,rows:[{n:1}]};
    if(sql.includes("FROM clean.prepaid_probe_item_runtime"))
      return {rowCount:1,rows:[source.item]};
    throw Error("UNEXPECTED_TEST_SQL");
  });
  const release=vi.fn();
  const downloadBytes=vi.fn(async()=>new Uint8Array(source.stored));
  return {
    pool:{connect:async()=>({query,release})} as any,
    store:{downloadBytes} as any,query,release,downloadBytes
  };
}
describe("Gate3 independently checked original source custody (no provider or SQL writes)",()=>{
  it("verifies source/SQL/body/item/hash/owner/subscription binding without declaring provider authenticity",async()=>{
    const m=mock();
    const result=await verifyGate3OriginalCustodyV39(m.pool,m.store,scope);
    expect(result.status).toBe("PASS_ORIGINAL_BYTES_BOUND_NOT_PROVIDER_AUTHENTICITY");
    expect(result.internalCredits).toBe(1);
    expect(result.notificationItems).toBe(1);
    expect(result.verifiedOriginalBytes).toBeGreaterThan(20);
    expect(result.databaseWrites).toBe(0);
    expect(result.providerCalls).toBe(0);
    expect(result.independentProviderOriginSignatureVerified).toBe(false);
    expect(result.isPaidCanaryCertification).toBe(false);
    expect(m.downloadBytes).toHaveBeenCalledTimes(1);
    expect(m.query.mock.calls.map(x=>x[0])).not.toContain("COMMIT");
    expect(m.release).toHaveBeenCalledOnce();
  });
  it("rejects altered actual object bytes despite LOGGED SHA claiming success",async()=>{
    const m=mock();m.downloadBytes.mockResolvedValue(new Uint8Array(Buffer.from("tampered")));
    await expect(verifyGate3OriginalCustodyV39(m.pool,m.store,scope))
      .rejects.toThrow("GATE3_READBACK_ORIGINAL_BYTES_SHA_MISMATCH");
  });
  it("rejects a wrong subscription ID, even if hashes and items match",async()=>{
    const src=fixture();src.row.provider_subscription_id="foreign";
    const m=mock(src);
    await expect(verifyGate3OriginalCustodyV39(m.pool,m.store,scope))
      .rejects.toThrow("GATE3_READBACK_DELIVERY_REFERENCE_INVALID");
    expect(m.downloadBytes).not.toHaveBeenCalled();
  });
  it("rejects normalized item SHA mismatches",async()=>{
    const src=fixture();src.item.raw_item_sha256=createHash("sha256").update("wrong").digest("hex");
    const m=mock(src);
    await expect(verifyGate3OriginalCustodyV39(m.pool,m.store,scope))
      .rejects.toThrow("GATE3_READBACK_NORMALIZED_ITEM_SHA_MISMATCH");
  });
  it("rejects a success candidate when a callback failed",async()=>{
    const src=fixture();src.owner.callback_failures=1;
    const m=mock(src);
    await expect(verifyGate3OriginalCustodyV39(m.pool,m.store,scope))
      .rejects.toThrow("GATE3_READBACK_OWNER_OR_CALLBACK_BINDING_INVALID");
  });
  it("refuses malformed scope before connecting to PostgreSQL",async()=>{
    const m=mock();
    await expect(verifyGate3OriginalCustodyV39(m.pool,m.store,{
      ...scope,creditCeiling:101
    })).rejects.toThrow("GATE3_READBACK_SCOPE_INVALID");
    expect(m.query).not.toHaveBeenCalled();
  });
});
