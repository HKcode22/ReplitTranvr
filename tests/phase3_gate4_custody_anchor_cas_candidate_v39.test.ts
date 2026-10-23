import {describe,it,expect,vi} from "vitest";
import {
  gate4CustodyRecordDigestV39,
  type Gate4CustodyRecordV39,
  type Gate4CustodyEntryV39,
  type Gate4CustodyExternalAnchorV39
} from "../server/lib/disruption/gate4DurableCustodyReview_v39";
import {
  previewGate4CustodyAnchorCasV39,
  type Gate4CustodyAnchorStoreCandidateV39,
  type Gate4CustodyCasOutcomeV39
} from "../server/lib/disruption/gate4CustodyAnchorCasCandidate_v39";

const origin="0".repeat(64),sha40="a".repeat(40),hash="b".repeat(64);
const receipt="c".repeat(64),scope="11111111-2222-3333-4444-555555555555";
const first:Gate4CustodyRecordV39={
  schema:"v39.gate4.custody-record.v1",revision:1,
  previousDigestSha256:origin,
  sourceCommit:sha40,scopeId:scope,authorizationSha256:hash,
  subjectId:"WSSS",subscriptionId:null,
  reviewedCreateReceiptSha256:null,
  state:"PREPARED",observedAtUtc:"2026-10-22T20:00:00.000Z"
};
const baseDigest=gate4CustodyRecordDigestV39(first);
const entries:readonly Gate4CustodyEntryV39[]=[{
  record:first,digestSha256:baseDigest
}];
const baseAnchor:Gate4CustodyExternalAnchorV39={
  schema:"v39.gate4.custody-anchor.v1",sourceCommit:sha40,
  scopeId:scope,authorizationSha256:hash,subjectId:"WSSS",
  exactOwnedSubscriptionId:null,
  independentlyReviewedCreateReceiptSha256:null,
  anchoredRevision:1,anchoredHeadDigestSha256:baseDigest
};
const nextRecord:Gate4CustodyRecordV39={
  ...first,revision:2,previousDigestSha256:baseDigest,
  state:"OWNED_ACTIVE",subscriptionId:"exactID99",
  reviewedCreateReceiptSha256:receipt,
  observedAtUtc:"2026-10-22T20:00:01.000Z"
};
const nextAnchor:Gate4CustodyExternalAnchorV39={
  ...baseAnchor,anchoredRevision:2,
  exactOwnedSubscriptionId:"exactID99",
  independentlyReviewedCreateReceiptSha256:receipt,
  anchoredHeadDigestSha256:gate4CustodyRecordDigestV39(nextRecord)
};
function store(initial=baseAnchor){
  let current=initial;
  const readCurrentAnchor=vi.fn(async()=>({...current}));
  const compareAndSwap=vi.fn(async(
    before:Gate4CustodyExternalAnchorV39,
    after:Gate4CustodyExternalAnchorV39
  ):Promise<Gate4CustodyCasOutcomeV39>=>{
    if(current.anchoredRevision!==before.anchoredRevision||
      current.anchoredHeadDigestSha256!==before.anchoredHeadDigestSha256)
      return "CONFLICT";
    current={...after};
    return "COMMITTED";
  });
  return {
    readCurrentAnchor,compareAndSwap,
    getCurrent:()=>current,
    setCurrent:(v:Gate4CustodyExternalAnchorV39)=>{current=v;}
  };
}
const args=(s:Pick<Gate4CustodyAnchorStoreCandidateV39,
  "readCurrentAnchor"|"compareAndSwap">)=>({
  priorEntries:entries,expectedAnchor:baseAnchor,
  nextRecord,nextAnchor,store:s
});

describe("Gate4 draft external CAS contract — mocked, never a real durable store",()=>{
  it("accepts mock CAS with readback without certifying live durability",async()=>{
    const s=store(),r=await previewGate4CustodyAnchorCasV39(args(s));
    expect(r).toMatchObject({
      status:"MOCK_CAS_READBACK_MATCH_NOT_LIVE",revision:2,
      externallyAuthenticatedStoreVerified:false,
      rollbackResistantAnchorAttested:false,
      durableSourceCustodyVerified:false,
      independentSupervisorArmed:false,paidAuthorization:false,
      providerRequests:0
    });
    expect(s.compareAndSwap).toHaveBeenCalledTimes(1);
    expect(s.readCurrentAnchor).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(r)).not.toContain("exactID99");
  });
  it("rejects stale independent baseline without attempting an overwrite",async()=>{
    const s=store(nextAnchor);
    const r=await previewGate4CustodyAnchorCasV39(args(s));
    expect(r.status).toBe("HOLD_STALE_OR_FOREIGN_ANCHOR");
    expect(s.compareAndSwap).not.toHaveBeenCalled();
  });
  it("forked current anchor cannot be overwritten by stale candidate",async()=>{
    const s=store({...baseAnchor,anchoredHeadDigestSha256:"f".repeat(64)});
    expect((await previewGate4CustodyAnchorCasV39(args(s))).status)
      .toBe("HOLD_STALE_OR_FOREIGN_ANCHOR");
    expect(s.compareAndSwap).not.toHaveBeenCalled();
  });
  it("two competing writers cannot both pass a truly atomic mocked CAS",async()=>{
    const s=store();
    const [a,b]=await Promise.all([
      previewGate4CustodyAnchorCasV39(args(s)),
      previewGate4CustodyAnchorCasV39(args(s))
    ]);
    expect([a.status,b.status].filter(
      x=>x==="MOCK_CAS_READBACK_MATCH_NOT_LIVE"
    )).toHaveLength(1);
    expect([a.status,b.status].some(x=>
      x==="HOLD_STALE_OR_FOREIGN_ANCHOR"||
      x==="HOLD_CAS_CONFLICT"
    )).toBe(true);
    expect(s.getCurrent()).toMatchObject({
      anchoredRevision:2,anchoredHeadDigestSha256:nextAnchor.anchoredHeadDigestSha256
    });
  });
  it("lost CAS acknowledgment stays HOLD, never silently retries",async()=>{
    const s=store();
    const bad={
      readCurrentAnchor:s.readCurrentAnchor,
      compareAndSwap:vi.fn(async(
        previous:Gate4CustodyExternalAnchorV39,
        next:Gate4CustodyExternalAnchorV39
      )=>{
        await s.compareAndSwap(previous,next);
        throw Error("secret write reply lost");
      })
    };
    const r=await previewGate4CustodyAnchorCasV39(args(bad));
    expect(r.status).toBe("HOLD_CAS_UNKNOWN_OUTCOME");
    expect(bad.compareAndSwap).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(r)).not.toContain("secret");
  });
  it("provider-free CAS CONFLICT/UNKNOWN never counts as confirmed update",async()=>{
    for(const code of ["CONFLICT","UNKNOWN"] as const){
      const s=store();
      const result=await previewGate4CustodyAnchorCasV39(args({
        readCurrentAnchor:s.readCurrentAnchor,
        compareAndSwap:async()=>code
      }));
      expect(result.status).toBe(code==="CONFLICT"?
        "HOLD_CAS_CONFLICT":"HOLD_CAS_UNKNOWN_OUTCOME");
      expect(result.revision).toBeNull();
    }
  });
  it("post-write readback unavailable or inconsistent remains HOLD",async()=>{
    const s=store();
    let count=0;
    const result=await previewGate4CustodyAnchorCasV39(args({
      readCurrentAnchor:async()=>{
        count++;
        if(count===2)throw Error("readback unavailable");
        return s.getCurrent();
      },
      compareAndSwap:s.compareAndSwap
    }));
    expect(result.status).toBe("HOLD_READBACK_NOT_VERIFIED");
    const s2=store();
    const mismatch=await previewGate4CustodyAnchorCasV39(args({
      readCurrentAnchor:async()=>baseAnchor,
      compareAndSwap:s2.compareAndSwap
    }));
    expect(mismatch.status).toBe("HOLD_READBACK_NOT_VERIFIED");
  });
  it("invalid parent, source, receipt or new revision rejected before CAS",async()=>{
    for(const change of [
      {nextRecord:{...nextRecord,revision:3}},
      {nextRecord:{...nextRecord,previousDigestSha256:"e".repeat(64)}},
      {nextAnchor:{...nextAnchor,
        independentlyReviewedCreateReceiptSha256:"e".repeat(64)}},
      {nextRecord:{...nextRecord,subscriptionId:"foreignID"}},
      {nextRecord:{...nextRecord,
        observedAtUtc:"2026-10-21T20:00:00.000Z"}}
    ]){
      const s=store();
      await expect(previewGate4CustodyAnchorCasV39({
        ...args(s),...change
      })).rejects.toThrow(/GATE4_CUSTODY_/);
      expect(s.readCurrentAnchor).not.toHaveBeenCalled();
      expect(s.compareAndSwap).not.toHaveBeenCalled();
    }
  });
});
