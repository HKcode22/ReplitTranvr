import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {
  adaptGate05CustodyBytesV39,type Gate05CustodySourceV39
} from "../server/lib/disruption/gate05RawCustodyEvidenceAdapter_v39";
import {censusGate05ObservedPilotV39}
  from "../server/lib/disruption/gate05ObservedSampleCensus_v39";

const sha=(s:Uint8Array|string)=>createHash("sha256").update(s).digest("hex");
function canonical(v:unknown):string{
  if(v===null||typeof v!=="object")return JSON.stringify(v);
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  const o=v as Record<string,unknown>;
  return "{"+Object.keys(o).sort().map(k=>JSON.stringify(k)+":"+canonical(o[k])).join(",")+"}";
}
const SESSION="f1234567-1111-4222-8333-1234567890ab";
const BLOB="a1234567-1111-4222-8333-1234567890ab";
const DEL="ppd_"+ "b".repeat(64);
const AT="2026-10-29T00:01:00.000Z";
const flight=(n:number,marketing=false)=>({
  number:marketing?"PX200":"PX100",
  status:n,
  location:{lat:1.0,lon:103.0,reportedAtUtc:"2026-10-29T00:00:55.000Z"}
});
function sample():Gate05CustodySourceV39{
  const body={flights:[flight(2),flight(9)]};
  const bytes=Buffer.from(canonical(body),"utf8");
  const hash=sha(bytes);
  return {
    sessionId:SESSION,expectedProviderSubscriptionId:"provider_real_scoped_01",
    auditAtUtc:"2026-10-29T00:20:00.000Z",
    blob:{
      blobRefId:BLOB,storageKind:"replit_app_storage",
      contentClass:"raw_provider_content",sourceKind:"webhook",
      sourceRecordId:"prepaid:"+SESSION+":"+DEL,
      contentSha256:hash,contentBytes:bytes.byteLength,
      persistedAtUtc:"2026-10-29T00:01:01.000Z",
      expiresAtUtc:"2026-10-30T00:01:01.000Z",
      deletedAtUtc:null
    },
    delivery:{
      sessionId:SESSION,deliveryId:DEL,blobRefId:BLOB,
      rawBodySha256:hash,notificationItems:2,receivedAtUtc:AT,
      providerSubscriptionId:"provider_real_scoped_01"
    },
    rows:body.flights.map((f,i)=>({
      deliveryId:DEL,itemIndex:i,rawItemSha256:sha(canonical(f)),
      receivedAtUtc:AT,flightInstanceId:"operating_leg_"+i,
      identityResolutionStatus:"resolved",
      codeshareResolutionStatus:"resolved_operator"
    })),
    originalCanonicalBytes:bytes
  };
}
describe("Gate05 authentic raw-backed observation source (no provider/SQL)",()=>{
  it("verifies both envelope and per-item hashes and maps v3 statuses",()=>{
    const a=adaptGate05CustodyBytesV39(sample());
    expect(a.schema).toBe("v39.gate05.raw-custody-adapter.v1");
    expect(a.verifiedSourceHashes).toBe(true);
    expect(a.sampleItems).toHaveLength(2);
    expect(a.sampleItems[0].flightStage).toBe("AIRBORNE");
    expect(a.sampleItems[1].flightStage).toBe("COMPLETED");
    expect(a.sampleItems[0].airbornePointUtc)
      .toBe("2026-10-29T00:00:55.000Z");
    expect(a.sampleItems[0].physicalFlightId).toBe("operating_leg_0");
    expect(a.sampleItems[0].http2xxAtUtc).toBeNull();
    expect(a.sampleItems[1].terminalStateUpdatedAtUtc).toBeNull();
    expect(a.scientificPass).toBe(false);
    expect(a.runwayActualityCertified).toBe(false);
    expect(a.providerCalls).toBe(0);
    const census=censusGate05ObservedPilotV39({
      frozenAtUtc:"2026-10-28T23:00:00Z",
      observedSubscriptionStartUtc:"2026-10-29T00:00:00Z",
      exactProviderDeletionVerifiedAtUtc:"2026-10-29T01:00:00Z",
      plannedEndUtc:"2026-10-29T01:00:00Z",
      evidenceSourceReviewed:false,items:a.sampleItems
    });
    expect(census.sourceQualifiedPhysicalFlights).toBe(2);
    expect(census.sourceQualifiedCompletedFlights).toBe(1);
    expect(census.sourceQualifiedAirborneFlights).toBe(1);
    expect(census.uniqueUsableAirbornePoints).toBe(1);
    expect(census.rawBefore2xxItems).toBe(0); // no fabricated ACK clock
    expect(census.strictSciencePassed).toBe(false);
  });
  it("rejects tampered bytes even when metadata is unchanged",()=>{
    const x=sample();const bytes=Buffer.from(x.originalCanonicalBytes);
    bytes[15]^=1;
    expect(()=>adaptGate05CustodyBytesV39({...x,originalCanonicalBytes:bytes}))
      .toThrow("GATE05_CUSTODY_ORIGINAL_HASH_MISMATCH");
  });
  it("rejects malicious/incorrect per-item hash and index mapping",()=>{
    const x=sample();
    const rows=[...x.rows];
    rows[0]={...rows[0],rawItemSha256:"f".repeat(64)};
    expect(()=>adaptGate05CustodyBytesV39({...x,rows}))
      .toThrow("GATE05_CUSTODY_ITEM_HASH_MISMATCH");
    rows[0]={...x.rows[0]};
    rows[1]={...x.rows[1],itemIndex:0}; // genuine duplicate ordinal
    expect(()=>adaptGate05CustodyBytesV39({...x,rows}))
      .toThrow("GATE05_CUSTODY_ITEM_IDENTITY_MISMATCH");
  });
  it("rejects missing runtime rows rather than interpreting empty as zero observations",()=>{
    const x=sample();
    expect(()=>adaptGate05CustodyBytesV39({...x,rows:[]}))
      .toThrow("GATE05_CUSTODY_ITEM_COUNT_MISMATCH");
  });
  it("refuses expired or deleted raw without fabricated recovery",()=>{
    const x=sample();
    expect(()=>adaptGate05CustodyBytesV39({
      ...x,auditAtUtc:"2026-10-31T00:00:00.000Z"
    })).toThrow("GATE05_CUSTODY_EXPIRED_OR_IMPOSSIBLE_CLOCK");
    expect(()=>adaptGate05CustodyBytesV39({
      ...x,blob:{...x.blob,deletedAtUtc:"2026-10-29T00:03:00.000Z"}
    })).toThrow("GATE05_CUSTODY_EXPIRED_OR_IMPOSSIBLE_CLOCK");
  });
  it("fails on foreign provider subscription and mismatched LOGGED source identity",()=>{
    const x=sample();
    expect(()=>adaptGate05CustodyBytesV39({
      ...x,delivery:{...x.delivery,providerSubscriptionId:"another_provider"}
    })).toThrow("GATE05_CUSTODY_SOURCE_IDENTITY_MISMATCH");
    expect(()=>adaptGate05CustodyBytesV39({
      ...x,blob:{...x.blob,sourceRecordId:"prepaid:"+SESSION+":OTHER"}
    })).toThrow("GATE05_CUSTODY_SOURCE_IDENTITY_MISMATCH");
  });
  it("quarantined/misclassified marketing records never count as physical operators",()=>{
    const x=sample();
    const rows=[...x.rows];
    rows[0]={...rows[0],identityResolutionStatus:"quarantined",
      codeshareResolutionStatus:"resolved_marketing"};
    const y=adaptGate05CustodyBytesV39({...x,rows});
    expect(y.sampleItems[0].physicalFlightId).toBeNull();
    expect(y.sampleItems[0].identityBasis).toBe("UNKNOWN");
    expect(y.sampleItems[0].codeshareRole).toBe("MARKETING");
  });
  it("doesn't count location without valid geometry or airborne status",()=>{
    const x=sample();
    const data=JSON.parse(Buffer.from(x.originalCanonicalBytes).toString("utf8"));
    data.flights[0].location.lat=400;
    const bytes=Buffer.from(canonical(data));
    const rows=x.rows.map((r,i)=>i? r:
      {...r,rawItemSha256:sha(canonical(data.flights[0]))});
    const y=adaptGate05CustodyBytesV39({
      ...x,originalCanonicalBytes:bytes,
      blob:{...x.blob,contentSha256:sha(bytes),contentBytes:bytes.byteLength},
      delivery:{...x.delivery,rawBodySha256:sha(bytes)},rows
    });
    expect(y.sampleItems[0].flightStage).toBe("OTHER");
    expect(y.sampleItems[0].airbornePointUtc).toBeNull();
  });
});
