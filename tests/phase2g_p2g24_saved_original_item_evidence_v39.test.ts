import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {summarizePreservedOriginalItemEvidenceV39} from
  "../scripts/v39_p2g24_saved_original_item_evidence_v39";
const sha=(v:Uint8Array)=>createHash("sha256").update(v).digest("hex");
const canon=(v:any):string=>v===null||typeof v!=="object"?
  JSON.stringify(v):Array.isArray(v)?
  "["+v.map(canon).join(",")+"]":
  "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canon(v[k])).join(",")+"}";
const source=(body:any)=>{
  const storedBytes=new TextEncoder().encode(canon(body));
  return {storedBytes,contentBytes:storedBytes.length,contentSha256:sha(storedBytes)};
};
const obj=(items:number,cost:number|null,secret="SYNTHETIC_UNKNOWN")=>({
  id:secret,
  timestampUtc:"2026-10-12T03:00:00Z",
  subscription:{id:"SYNTHETIC_ONLY_NEVER_OUTPUT"},
  deliveryAttempt:cost===null?{seqNo:0}:{seqNo:0,costCredits:cost},
  flights:Array.from({length:items},(_,i)=>({
    id:secret+"-"+i,number:"QF"+i,codeshareStatus:"Unknown"
  }))
});
describe("P14 real-stored canonical original item/credit evidence safety",()=>{
  it("independently counts saved FLIGHT ITEMS, not HTTP notifications or authenticated provider attempts",()=>{
    const seen=summarizePreservedOriginalItemEvidenceV39([
      source(obj(5,5,"PRIVATE_A")),source(obj(2,2,"PRIVATE_B")),
      source(obj(0,0,"PRIVATE_C"))
    ]);
    expect(seen).toMatchObject({
      originalStorageReferencesVerified:3,uniqueCanonicalSourceObjects:3,
      duplicateCanonicalSourceObjectReferences:0,
      notificationItemsInSavedObjects:7,
      explicitCostCreditClaimTotal:7,
      sourceObjectsWithExplicitCostClaim:3,
      sourceObjectsWithoutExplicitCostClaim:0,
      sourceObjectsWithItemCostDisagreement:0,
      sourceObjectsWithInvalidCostClaim:0,
      independentUpstreamSenderAttemptCount:null,
      independentUpstreamBilledFlightItemCredits:null,
      upstreamProviderAttemptsNotSeen:null,
      providerBillingVersusInternalExactMatch:null,
      actualProvider260Versus259CauseResolved:false,
      externalOriginalWireBytesAuthenticated:false,
      canDeclareF8Complete:false,canAuthorizePaidLaunch:false,
      providerCalls:0,databaseReads:0,databaseMutations:0,storageMutations:0
    });
    const text=JSON.stringify(seen);
    expect(text).not.toContain("PRIVATE_A");
    expect(text).not.toContain("SYNTHETIC_ONLY_NEVER_OUTPUT");
    expect(text).not.toContain("QF0");
  });
  it("zero/missing cost is distinct from a source-provided missing claim and exact item mismatch",()=>{
    const a=summarizePreservedOriginalItemEvidenceV39([
      source(obj(5,null)),source(obj(3,2)),source(obj(0,0))
    ]);
    expect(a).toMatchObject({
      notificationItemsInSavedObjects:8,
      explicitCostCreditClaimTotal:2,
      sourceObjectsWithExplicitCostClaim:2,
      sourceObjectsWithoutExplicitCostClaim:1,
      sourceObjectsWithItemCostDisagreement:1
    });
    expect(a.providerBillingVersusInternalExactMatch).toBeNull();
  });
  it("duplicate SAVED content references are explicitly counted and never assumed to be separate billed attempts",()=>{
    const original=source(obj(1,1,"SYNTHETIC_DUPLICATE"));
    const x=summarizePreservedOriginalItemEvidenceV39([original,original]);
    expect(x).toMatchObject({
      originalStorageReferencesVerified:2,
      uniqueCanonicalSourceObjects:1,
      duplicateCanonicalSourceObjectReferences:1,
      notificationItemsInSavedObjects:2,
      explicitCostCreditClaimTotal:2,
      independentUpstreamSenderAttemptCount:null,
      actualProvider260Versus259CauseResolved:false
    });
  });
  it("rejects mismatched SHA or size and cannot partially declare a passed 30-object sample",()=>{
    const a=source(obj(1,1));
    expect(()=>summarizePreservedOriginalItemEvidenceV39([
      a,{...a,contentSha256:"f".repeat(64)}
    ])).toThrow("P14_PRESERVED_ORIGINAL_SHA_OR_BYTES_INVALID");
    expect(()=>summarizePreservedOriginalItemEvidenceV39([
      {...a,contentBytes:a.contentBytes+1}
    ])).toThrow("P14_PRESERVED_ORIGINAL_SHA_OR_BYTES_INVALID");
  });
  it("rejects duplicate/escaped nested cost JSON key EVEN when stored SHA matches",()=>{
    const storedBytes=new TextEncoder().encode(
      '{"deliveryAttempt":{"costCredits":1,"\\u0063ostCredits":2},"flights":[]}'
    );
    expect(()=>summarizePreservedOriginalItemEvidenceV39([{
      contentSha256:sha(storedBytes),contentBytes:storedBytes.length,storedBytes
    }])).toThrow("PREPAID_ORIGINAL_DUPLICATE_JSON_KEY");
  });
  it("never treats pretty printed or original-wire byte representation as current canonical saved original",()=>{
    const storedBytes=new TextEncoder().encode('{"flights": [], "id": "not canonical"}');
    expect(()=>summarizePreservedOriginalItemEvidenceV39([{
      storedBytes,contentBytes:storedBytes.length,contentSha256:sha(storedBytes)
    }])).toThrow("P14_PRESERVED_ORIGINAL_NOT_CANONICAL");
  });
  it("rejects invalid claimed credits without coercing 0.5, numeric strings or huge numbers to real billed items",()=>{
    for(const wrong of [0.5,-1,"5",Number.MAX_SAFE_INTEGER+1]){
      const x=summarizePreservedOriginalItemEvidenceV39([
        source(obj(1,wrong as number))
      ]);
      expect(x.sourceObjectsWithInvalidCostClaim).toBe(1);
      expect(x.explicitCostCreditClaimTotal).toBe(0);
      expect(x.canAuthorizePaidLaunch).toBe(false);
    }
  });
  it("handles an array of original flight items without inventing an envelope's provider credit metadata",()=>{
    const x=summarizePreservedOriginalItemEvidenceV39([
      source([{id:"SYNTHETIC_A"},{id:"SYNTHETIC_B"}])
    ]);
    expect(x).toMatchObject({
      notificationItemsInSavedObjects:2,
      explicitCostCreditClaimTotal:0,
      sourceObjectsWithoutExplicitCostClaim:1,
      independentUpstreamBilledFlightItemCredits:null
    });
  });
  it("does not allow missing/empty or non-object original records",()=>{
    expect(()=>summarizePreservedOriginalItemEvidenceV39([]))
      .toThrow("P14_PRESERVED_ORIGINAL_REFERENCE_COUNT_INVALID");
    expect(()=>summarizePreservedOriginalItemEvidenceV39([
      source({id:"SYNTHETIC_NO_FLIGHTS"})
    ])).toThrow("P14_PRESERVED_ORIGINAL_FLIGHT_ENVELOPE_INVALID");
    expect(()=>summarizePreservedOriginalItemEvidenceV39([
      source({flights:[null]})
    ])).toThrow("P14_PRESERVED_ORIGINAL_FLIGHT_ITEM_INVALID");
  });
});
