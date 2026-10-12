import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
  summarizePreservedOriginalItemEvidenceV39,
  summarizeCurrentRuntimeLinksForPreservedSourcesV39
} from "../scripts/v39_p2g24_saved_original_item_evidence_v39";
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
  it("P14 real LOGGED saved originals and PRESENT UNLOGGED receipts match only on exact blob reference and SHA",()=>{
    const a={blobRefId:"synthetic-blob-ref-A",contentSha256:"a".repeat(64)};
    const b={blobRefId:"synthetic-blob-ref-B",contentSha256:"b".repeat(64)};
    const x=summarizeCurrentRuntimeLinksForPreservedSourcesV39([a,b],[
      {blobRefId:a.blobRefId,rawBodySha256:a.contentSha256,
        notificationItems:5,deliveryAttemptCostCredits:"5"}
    ]);
    expect(x).toMatchObject({
      savedLoggedOriginalReferences:2,currentUnloggedDeliveryRows:1,
      exactCurrentOriginalRefAndShaMatches:1,
      savedLoggedRefsWithoutCurrentUnloggedDelivery:1,
      currentUnloggedDeliveriesWithoutSavedLoggedRef:0,
      currentUnloggedDeliveriesWithSourceShaConflict:0,
      currentUnloggedDeliveriesInvalidItemCount:0,
      currentUnloggedDeliveriesInvalidCostClaim:0,
      missingCurrentUnloggedRowsDoNotProveMissingUpstreamSends:true,
      afterCrashHistoricalRuntimeCannotBeInferred:true,
      independentProviderAttemptAndBillLedgerPresent:false,
      actualHistorical260259CauseKnown:false,canAuthorizePaidLaunch:false
    });
    expect(JSON.stringify(x)).not.toContain(a.blobRefId);
  });
  it("P14 UNLOGGED crash reset may leave zero current runtime rows without implying zero original provider deliveries",()=>{
    const result=summarizeCurrentRuntimeLinksForPreservedSourcesV39([
      {blobRefId:"synthetic-LOGGED-survives",contentSha256:"a".repeat(64)}
    ],[]);
    expect(result).toMatchObject({
      savedLoggedOriginalReferences:1,currentUnloggedDeliveryRows:0,
      savedLoggedRefsWithoutCurrentUnloggedDelivery:1,
      exactCurrentOriginalRefAndShaMatches:0,
      missingCurrentUnloggedRowsDoNotProveMissingUpstreamSends:true
    });
  });
  it("P14 orphan UNLOGGED record, SHA conflict and item-credit mismatch remain distinct",()=>{
    const result=summarizeCurrentRuntimeLinksForPreservedSourcesV39([
      {blobRefId:"A",contentSha256:"a".repeat(64)}
    ],[
      {blobRefId:"A",rawBodySha256:"b".repeat(64),
        notificationItems:5,deliveryAttemptCostCredits:"4"},
      {blobRefId:"OTHER",rawBodySha256:"c".repeat(64),
        notificationItems:-1,deliveryAttemptCostCredits:"0.5"}
    ]);
    expect(result).toMatchObject({
      exactCurrentOriginalRefAndShaMatches:0,
      currentUnloggedDeliveriesWithoutSavedLoggedRef:1,
      currentUnloggedDeliveriesWithSourceShaConflict:1,
      currentUnloggedDeliveriesWithItemCreditDisagreement:1,
      currentUnloggedDeliveriesInvalidItemCount:1,
      currentUnloggedDeliveriesInvalidCostClaim:1,
      actualHistorical260259CauseKnown:false
    });
  });
  it("P14 refuses duplicated saved refs or duplicated runtime identity rather than double-counting",()=>{
    const a={blobRefId:"synthetic-A",contentSha256:"a".repeat(64)};
    const row={blobRefId:"synthetic-A",rawBodySha256:"a".repeat(64),
      notificationItems:1,deliveryAttemptCostCredits:"1"};
    expect(()=>summarizeCurrentRuntimeLinksForPreservedSourcesV39([a,a],[row]))
      .toThrow("P14_RUNTIME_LINK_SAVED_REF_DUPLICATE_OR_INVALID");
    expect(()=>summarizeCurrentRuntimeLinksForPreservedSourcesV39([a],[row,row]))
      .toThrow("P14_RUNTIME_LINK_RUNTIME_DUPLICATE_OR_INVALID");
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
