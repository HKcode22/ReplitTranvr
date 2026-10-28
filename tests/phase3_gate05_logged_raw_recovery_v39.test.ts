import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {recoverGate05SourceFromLoggedRefV39,
  type Gate05RawRehydrationInputV39}
  from "../server/lib/disruption/gate05LoggedRawRecovery_v39";
const digest=(x:Uint8Array|string)=>createHash("sha256").update(x).digest("hex");
const stable=(v:unknown):string=>{
  if(v===null||typeof v!=="object")return JSON.stringify(v);
  if(Array.isArray(v))return "["+v.map(stable).join(",")+"]";
  const obj=v as Record<string,unknown>;
  return "{"+Object.keys(obj).sort().map(k=>JSON.stringify(k)+":"+stable(obj[k])).join(",")+"}";
};
const scope="12345678-1111-4111-8111-123456789abc";
const blob="87654321-2222-4222-8222-123456789abc";
const subscription="sub-prospective-00001";
const delivery="ppd_"+"a".repeat(64);
const firstFlight={status:2,codeshareStatus:1,number:"SQ100",
  location:{lat:1.4,lon:103.9,reportedAtUtc:"2026-10-29T09:00:10Z"}};
const arrivedFlight={status:"Arrived",codeshareStatus:2,number:"SQ200",
  location:null,lastUpdatedUtc:"2026-10-29T09:05:00Z"};
function sample():Gate05RawRehydrationInputV39{
  const data={flights:[firstFlight,arrivedFlight],
    subscription:{id:subscription}};
  const raw=Buffer.from(stable(data),"utf8");
  return {
    expectedSessionId:scope,expectedProviderSubscriptionId:subscription,
    source:{
      blobRefId:blob,sourceKind:"webhook",
      sourceRecordId:"prepaid:"+scope+":"+delivery,
      storageKind:"replit_app_storage",contentClass:"raw_provider_content",
      contractVersion:"provider-blob-contract-v39@1.0.0",
      contentSha256:digest(raw),contentBytes:raw.length,
      persistedAtUtc:"2026-10-29T09:05:10Z",
      expiresAtUtc:"2026-10-30T09:05:10Z",deletedAtUtc:null
    },
    originalCanonicalBytes:raw,
    readBackAtUtc:"2026-10-29T10:05:10Z"
  };
}
describe("Gate05 future source restart recovery from durable logged blob, no provider",()=>{
  it("recovers real source item/status/point candidate facts but never invents full science",()=>{
    const x=recoverGate05SourceFromLoggedRefV39(sample());
    expect(x.callbackItemCount).toBe(2);
    expect(x.airborneLocationCandidateItems).toBe(1);
    expect(x.completedStatusCandidateItems).toBe(1);
    expect(x.observations).toHaveLength(2);
    expect(x.observations[0].flightStage).toBe("AIRBORNE");
    expect(x.observations[0].codeshareRole).toBe("OPERATOR");
    expect(x.observations[0].airbornePointUtc)
      .toBe("2026-10-29T09:00:10.000Z");
    expect(x.observations[0].receivedAtUtc).toBeNull();
    expect(x.observations[0].blobPersistedAtUtc)
      .toBe("2026-10-29T09:05:10.000Z");
    expect(x.observations[0].physicalFlightId).toBeNull();
    expect(x.observations[1].flightStage).toBe("COMPLETED");
    expect(x.observations[1].codeshareRole).toBe("MARKETING");
    expect(x.observations[1].terminalStateUpdatedAtUtc).toBeNull();
    expect(x.strictGate05SciencePassed).toBe(false);
    expect(x.rawBefore2xxAckProven).toBe(false);
    expect(x.physicalOperatingLegIdentityIndependentlyVerified).toBe(false);
    expect(x.runwayActualitySourceVerified).toBe(false);
    expect(x.scheduledWheelsOffSourceVerified).toBe(false);
    expect(x.providerCalls).toBe(0);
    expect(x.dbWrites).toBe(0);
  });
  it("refuses modified bytes, untrusted hash and wrong byte length",()=>{
    const a=sample(),tampered=Buffer.from(a.originalCanonicalBytes);
    tampered[20]^=1;
    expect(()=>recoverGate05SourceFromLoggedRefV39({
      ...a,originalCanonicalBytes:tampered
    })).toThrow("GATE05_RECOVERY_RAW_BODY_INTEGRITY_ERROR");
    expect(()=>recoverGate05SourceFromLoggedRefV39({
      ...a,source:{...a.source,contentSha256:"f".repeat(64)}
    })).toThrow("GATE05_RECOVERY_RAW_BODY_INTEGRITY_ERROR");
    expect(()=>recoverGate05SourceFromLoggedRefV39({
      ...a,source:{...a.source,contentBytes:3}
    })).toThrow("GATE05_RECOVERY_RAW_BODY_INTEGRITY_ERROR");
  });
  it("refuses scope crossover and foreign provider identity",()=>{
    const a=sample();
    expect(()=>recoverGate05SourceFromLoggedRefV39({
      ...a,source:{...a.source,sourceRecordId:
        "prepaid:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee:"+delivery}
    })).toThrow("GATE05_RECOVERY_FOREIGN_OR_MALFORMED_SCOPE");
    expect(()=>recoverGate05SourceFromLoggedRefV39({
      ...a,expectedProviderSubscriptionId:"foreign_subscription"
    })).toThrow("GATE05_RECOVERY_SUBSCRIPTION_UNVERIFIED");
  });
  it("refuses expired, deleted or future source writes",()=>{
    const a=sample();
    expect(()=>recoverGate05SourceFromLoggedRefV39({
      ...a,readBackAtUtc:"2026-10-30T09:05:10Z"
    })).toThrow("GATE05_RECOVERY_EXPIRED_OR_DELETED");
    expect(()=>recoverGate05SourceFromLoggedRefV39({
      ...a,source:{...a.source,deletedAtUtc:"2026-10-29T09:30:00Z"}
    })).toThrow("GATE05_RECOVERY_EXPIRED_OR_DELETED");
    expect(()=>recoverGate05SourceFromLoggedRefV39({
      ...a,readBackAtUtc:"2026-10-29T09:01:00Z"
    })).toThrow("GATE05_RECOVERY_EXPIRED_OR_DELETED");
  });
  it("rejects unversioned or malformed App Storage source-ref metadata",()=>{
    const a=sample();
    expect(()=>recoverGate05SourceFromLoggedRefV39({
      ...a,source:{...a.source,contractVersion:"old"}
    })).toThrow("GATE05_RECOVERY_NOT_AUTHENTIC_BLOB_REF");
    expect(()=>recoverGate05SourceFromLoggedRefV39({
      ...a,source:{...a.source,sourceRecordId:"prepaid:"+scope+":bad-id"}
    })).toThrow("GATE05_RECOVERY_FOREIGN_OR_MALFORMED_SCOPE");
  });
  it("accepts missing or invalid live location as explicit missingness",()=>{
    const a=sample();
    const obj=JSON.parse(Buffer.from(a.originalCanonicalBytes).toString("utf8"));
    obj.flights[0].location.lat=200;
    const bytes=Buffer.from(stable(obj));
    const x=recoverGate05SourceFromLoggedRefV39({
      ...a,originalCanonicalBytes:bytes,
      source:{...a.source,contentSha256:digest(bytes),contentBytes:bytes.length}
    });
    expect(x.callbackItemCount).toBe(2);
    expect(x.airborneLocationCandidateItems).toBe(0);
    expect(x.observations[0].flightStage).toBe("OTHER");
    expect(x.observations[0].airbornePointUtc).toBeNull();
  });
  it("rejects malformed JSON and noncanonical source instead of undercounting",()=>{
    const a=sample();
    const noncanonical=Buffer.from('{"subscription":{"id":"'+subscription+
      '"},"flights":[] }');
    expect(()=>recoverGate05SourceFromLoggedRefV39({
      ...a,originalCanonicalBytes:noncanonical,
      source:{...a.source,contentSha256:digest(noncanonical),
        contentBytes:noncanonical.length}
    })).toThrow("GATE05_RECOVERY_SOURCE_NOT_CANONICAL");
    const invalid=Buffer.from("{missing}");
    expect(()=>recoverGate05SourceFromLoggedRefV39({
      ...a,originalCanonicalBytes:invalid,
      source:{...a.source,contentSha256:digest(invalid),
        contentBytes:invalid.length}
    })).toThrow("GATE05_RECOVERY_INVALID_JSON");
  });
  it("never treats unsupported statuses or unknown codeshare as verified",()=>{
    const a=sample(),obj=JSON.parse(Buffer.from(a.originalCanonicalBytes).toString("utf8"));
    obj.flights[0].status=11;obj.flights[0].codeshareStatus=0;
    const bytes=Buffer.from(stable(obj));
    const x=recoverGate05SourceFromLoggedRefV39({
      ...a,originalCanonicalBytes:bytes,
      source:{...a.source,contentSha256:digest(bytes),contentBytes:bytes.length}
    });
    expect(x.observations[0].flightStage).toBe("OTHER");
    expect(x.observations[0].codeshareRole).toBe("UNKNOWN");
    expect(x.observations[0].identityBasis).toBe("UNKNOWN");
    expect(x.strictGate05SciencePassed).toBe(false);
  });
});
