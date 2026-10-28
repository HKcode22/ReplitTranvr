import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {auditGate05SourceMetadataV39}
  from "../scripts/v39_gate05_source_metadata_readonly_v39";

const scope="e69ffa34-d8a6-456f-a49c-9dd459e6d294";
const digest="a".repeat(64);
function fakeDb(config:{
  session?:boolean;deliveries?:boolean;items?:boolean;
  foreign?:boolean;expired?:boolean;hashDrift?:boolean;logged?:boolean;
}={}){
  const SQL:string[]=[];
  const db={async query(sql:string,params?:any[]){
    SQL.push(sql);
    expect(params).toEqual(sql.includes("FROM clean.provider_content_blob_ref")?
      ["prepaid:"+scope+":%"]:[scope]);
    let rows:any[]=[];
    if(sql.includes("FROM clean.phase3_gate05_science_owner_v39")){
      rows=[{session_id:scope,state:"STOPPED",
        provider_subscription_id:"sub_authentic_01",terminal_evidence_sha256:digest}];
    }else if(sql.includes("FROM clean.prepaid_probe_session_runtime")){
      if(config.session!==false)rows=[{session_id:scope,
        owner_kind:"phase3_gate05_science",
        provider_subscription_id:config.foreign?"foreign":"sub_authentic_01"}];
    }else if(sql.includes("FROM clean.prepaid_probe_delivery_runtime")){
      if(config.deliveries!==false)rows=[{
        delivery_id:"ppd_"+"b".repeat(64),
        blob_ref_id:"a0000000-1111-4222-8333-1234567890ab",
        logged_blob_ref_id:"a0000000-1111-4222-8333-1234567890ab",
        raw_body_sha256:digest,content_sha256:config.hashDrift?"b".repeat(64):digest,
        notification_items:1,source_kind:"webhook",
        source_record_id:"prepaid:"+scope+":"+"ppd_"+"b".repeat(64),
        persisted_at_utc:"2026-10-28T10:15:20Z",
        expires_at_utc:config.expired?"2026-10-28T10:16:00Z":"2026-10-31T10:16:00Z",
        deleted_at_utc:null
      }];
    }else if(sql.includes("FROM clean.prepaid_probe_item_runtime")){
      if(config.items!==false)rows=[{
        delivery_id:"ppd_"+"b".repeat(64),item_index:0,
        raw_item_sha256:digest,
        flight_instance_id:"operating_leg_0",
        identity_resolution_status:"resolved",
        codeshare_resolution_status:"resolved_operator"
      }];
    }else if(sql.includes("FROM clean.provider_content_blob_ref")){
      if(config.logged!==false)rows=[{
        blob_ref_id:"a0000000-1111-4222-8333-1234567890ab",
        source_record_id:"prepaid:"+scope+":ppd_"+"b".repeat(64),
        content_sha256:digest,content_bytes:123,
        storage_kind:"replit_app_storage",
        content_class:"raw_provider_content",source_kind:"webhook",
        persisted_at_utc:"2026-10-28T10:15:20Z",
        expires_at_utc:config.expired?"2026-10-28T10:16:00Z":"2026-10-31T10:16:00Z",
        deleted_at_utc:null
      }];
    }else throw Error("Unexpected query");
    return {rows,rowCount:rows.length};
  }};
  return {db,SQL};
}
describe("Gate05 live read-only metadata audit",()=>{
  const at="2026-10-28T11:00:00.000Z";
  it("reports authentic source presence but never promotes raw-free metadata to science",async()=>{
    const {db,SQL}=fakeDb();
    const x=await auditGate05SourceMetadataV39(db,at);
    expect(x.status).toBe("SOURCE_METADATA_AVAILABLE_NOT_RAW_CERTIFIED");
    expect(x.loggedRawRefs).toBe(1);
    expect(x.validUnexpiredRawRefs).toBe(1);
    expect(x.deliveryRows).toBe(1);
    expect(x.itemRows).toBe(1);
    expect(x.rawFlightStatusMeasured).toBe(false);
    expect(x.gate05ScientificPass).toBe(false);
    expect(x.dbWrites).toBe(0);
    expect(SQL).toHaveLength(5);
    expect(x.independentLoggedRefs).toBe(1);
    expect(x.independentUnexpiredLedgerRefs).toBe(1);
    expect(x.objectBytesIndependentlyReadBack).toBe(false);
    expect(SQL.every(s=>s.trim().toUpperCase().startsWith("SELECT"))).toBe(true);
  });
  it("lost UNLOGGED rows are missing evidence, not proof of zero callbacks",async()=>{
    const {db}=fakeDb({session:false,deliveries:false,items:false});
    const x=await auditGate05SourceMetadataV39(db,at);
    expect(x.unloggedSessionRetained).toBe(false);
    expect(x.status).toBe("LOGGED_UNEXPIRED_REFERENCES_BYTES_UNVERIFIED");
    expect(x.independentLoggedRefs).toBe(1);
    expect(x.independentUnexpiredLedgerRefs).toBe(1);
    expect(x.loggedRefCountWithNoUnloggedDelivery).toBe(1);
    expect(x.gate05ScientificPass).toBe(false);
  });
  it("rejects conflicting runtime owner binding and partial item ledger",async()=>{
    await expect(auditGate05SourceMetadataV39(
      fakeDb({foreign:true}).db,at
    )).rejects.toThrow("GATE05_SOURCE_AUDIT_RUNTIME_IDENTITY_MISMATCH");
    await expect(auditGate05SourceMetadataV39(
      fakeDb({items:false}).db,at
    )).rejects.toThrow("GATE05_SOURCE_AUDIT_INCOMPLETE_ITEM_LEDGER");
  });
  it("detects expired or mismatched LOGGED refs without calling provider",async()=>{
    const a=await auditGate05SourceMetadataV39(fakeDb({expired:true}).db,at);
    expect(a.validUnexpiredRawRefs).toBe(0);
    expect(a.missingOrExpiredRawRefs).toBe(1);
    expect(a.status).toBe("LOGGED_REFERENCES_EXPIRED_OR_INVALID");
    expect(a.independentExpiredOrDeletedLedgerRefs).toBe(1);
    const b=await auditGate05SourceMetadataV39(fakeDb({hashDrift:true}).db,at);
    expect(b.sourceHashDisagreements).toBe(1);
    expect(b.validUnexpiredRawRefs).toBe(0);
  });
  it("no original logged refs is an unknown-source result, never zero callbacks",async()=>{
    const x=await auditGate05SourceMetadataV39(
      fakeDb({logged:false,session:false,deliveries:false,items:false}).db,at);
    expect(x.status).toBe("NO_LOGGED_SOURCE_REFS_AVAILABLE");
    expect(x.deliveryRows).toBe(0);
    expect(x.gate05ScientificPass).toBe(false);
  });
  it("retains protected read-only SQL and inactive provider semantics in workflow",()=>{
    const script=readFileSync("scripts/v39_gate05_source_metadata_readonly_v39.ts","utf8");
    const workflow=readFileSync(
      ".github/workflows/phase3-gate05-old-source-metadata-readonly.yml","utf8");
    expect(script).toContain("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    expect(script).toContain("GATE05_SOURCE_AUDIT_UNAUTHORIZED_DISPATCH");
    expect(workflow).toContain("environment: phase2g-paid");
    expect(workflow).toContain("AUDIT_OLD_GATE05_SOURCE_METADATA_ONLY_NO_PROVIDER");
    expect(workflow).toContain("branches: [main]");
    expect(workflow).toContain("group: gate05-old-source-readonly");
    expect(script).toContain("AUTO_POSTMERGE_READONLY");
    expect(workflow).toContain("AUTO_POSTMERGE_READONLY");
    expect(workflow).not.toContain("AERODATABOX_API_KEY");
    expect(script).not.toMatch(/INSERT INTO|UPDATE clean\.|DELETE FROM|listSubscriptionsStrict|createGate4Single/i);
  });
});
