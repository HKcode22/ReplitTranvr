import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
  adaptGate05LoggedJournalToCensusV39,
  type Gate05LoggedCensusInputV39
} from "../server/lib/disruption/gate05LoggedJournalCensusAdapter_v39";
import {censusGate05ObservedPilotV39}
  from "../server/lib/disruption/gate05ObservedSampleCensus_v39";
const hash=(x:Uint8Array|string)=>createHash("sha256").update(x).digest("hex");
function stable(v:unknown):string{
  if(v===null||typeof v!=="object")return JSON.stringify(v);
  if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";
  const o=v as Record<string,unknown>;
  return "{"+Object.keys(o).sort().map(k=>JSON.stringify(k)+":"+stable(o[k])).join(",")+"}";
}
const SCOPE="12345678-1111-4111-8111-123456789abc";
const BLOB="87654321-2222-4222-8222-123456789abc";
const DEL="ppd_"+"c".repeat(64);
const SUB="sub-science-live-01";
function input():Gate05LoggedCensusInputV39{
  const body={subscription:{id:SUB},flights:[
    {number:"SQ111",codeshareStatus:1,status:"EnRoute",
     location:{lat:1.3,lon:103.8,reportedAtUtc:"2026-11-01T00:10:03Z"}},
    {number:"SQ112",codeshareStatus:1,status:9}
  ]};
  const bytes=Buffer.from(stable(body));
  const sha=hash(bytes);
  const persisted="2026-11-01T00:10:12.000Z";
  return {
    expectedSessionId:SCOPE,expectedProviderSubscriptionId:SUB,
    readBackAtUtc:"2026-11-01T00:20:00.000Z",
    source:{
      blobRefId:BLOB,sourceKind:"webhook",
      sourceRecordId:"prepaid:"+SCOPE+":"+DEL,
      contentClass:"raw_provider_content",storageKind:"replit_app_storage",
      contractVersion:"provider-blob-contract-v39@1.0.0",
      contentSha256:sha,contentBytes:bytes.length,
      persistedAtUtc:persisted,expiresAtUtc:"2026-11-02T00:10:12.000Z",
      deletedAtUtc:null
    },
    originalCanonicalBytes:bytes,
    journal:{
      sessionId:SCOPE,deliveryId:DEL,blobRefId:BLOB,bodySha256:sha,
      itemCount:2,receiverAttemptAtUtc:"2026-11-01T00:10:10.000Z",
      blobPersistedAtUtc:persisted,
      committedAtUtc:"2026-11-01T00:10:13.000Z",
      rawBeforeDbCommitVerified:true,http2xxDeliveryVerified:false
    }
  };
}
describe("Future Gate05 LOGGED receipt plus exact original raw recovery",()=>{
  it("counts genuine source items in live 60m window without fabricating physical identity or ack",()=>{
    const v=adaptGate05LoggedJournalToCensusV39(input());
    expect(v.loggedItemCount).toBe(2);
    expect(v.itemFacts).toHaveLength(2);
    expect(v.itemFacts[0].receivedAtUtc).toBe("2026-11-01T00:10:10.000Z");
    expect(v.itemFacts[0].rawDurableAtUtc).toBe("2026-11-01T00:10:12.000Z");
    expect(v.itemFacts[0].http2xxAtUtc).toBeNull();
    expect(v.itemFacts[0].physicalFlightId).toBeNull();
    expect(v.itemFacts[0].flightStage).toBe("AIRBORNE");
    expect(v.itemFacts[1].flightStage).toBe("COMPLETED");
    expect(v.scientificPass).toBe(false);
    const c=censusGate05ObservedPilotV39({
      frozenAtUtc:"2026-10-31T22:00:00Z",
      observedSubscriptionStartUtc:"2026-11-01T00:00:00Z",
      plannedEndUtc:"2026-11-01T01:00:00Z",
      exactProviderDeletionVerifiedAtUtc:"2026-11-01T01:00:00Z",
      evidenceSourceReviewed:false,items:v.itemFacts
    });
    expect(c.inWindowReceivedItemCount).toBe(2);
    expect(c.missingRawAckProofItems).toBe(2);
    expect(c.rawBefore2xxItems).toBe(0);
    expect(c.sourceQualifiedPhysicalFlights).toBe(0);
    expect(c.deficits).toContain("RECEIVED_NOTIFICATION_ITEMS_LT_100");
    expect(c.integrityFindings).toContain(
      "RAW_BEFORE_2XX_ITEM_ACK_PROOF_INCOMPLETE");
    expect(c.strictSciencePassed).toBe(false);
  });
  it("rejects source hash, physical scope and item-count mismatches",()=>{
    const x=input();
    expect(()=>adaptGate05LoggedJournalToCensusV39({
      ...x,journal:{...x.journal,itemCount:3}
    })).toThrow("GATE05_JOURNAL_ITEM_COUNT_MISMATCH");
    expect(()=>adaptGate05LoggedJournalToCensusV39({
      ...x,journal:{...x.journal,bodySha256:"a".repeat(64)}
    })).toThrow("GATE05_JOURNAL_SOURCE_IDENTITY_MISMATCH");
    expect(()=>adaptGate05LoggedJournalToCensusV39({
      ...x,journal:{...x.journal,sessionId:"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"}
    })).toThrow("GATE05_JOURNAL_SOURCE_IDENTITY_MISMATCH");
  });
  it("never trusts an asserted 2xx receipt or missing atomic source proof",()=>{
    const x=input();
    expect(()=>adaptGate05LoggedJournalToCensusV39({
      ...x,journal:{...x.journal,http2xxDeliveryVerified:true as false}
    })).toThrow("GATE05_JOURNAL_SOURCE_IDENTITY_MISMATCH");
    expect(()=>adaptGate05LoggedJournalToCensusV39({
      ...x,journal:{...x.journal,rawBeforeDbCommitVerified:false as true}
    })).toThrow("GATE05_JOURNAL_SOURCE_IDENTITY_MISMATCH");
  });
  it("rejects impossible receiver/DB clocks and raw expiry",()=>{
    const x=input();
    expect(()=>adaptGate05LoggedJournalToCensusV39({
      ...x,journal:{...x.journal,
        receiverAttemptAtUtc:"2026-11-01T00:20:00.000Z"}
    })).toThrow("GATE05_JOURNAL_SOURCE_CLOCK_CONFLICT");
    expect(()=>adaptGate05LoggedJournalToCensusV39({
      ...x,journal:{...x.journal,blobPersistedAtUtc:"2026-11-01T00:10:20.000Z"}
    })).toThrow("GATE05_JOURNAL_SOURCE_CLOCK_CONFLICT");
    expect(()=>adaptGate05LoggedJournalToCensusV39({
      ...x,readBackAtUtc:"2026-11-03T00:20:00.000Z"
    })).toThrow("GATE05_RECOVERY_EXPIRED_OR_DELETED");
  });
});
