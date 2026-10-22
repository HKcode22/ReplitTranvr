import {describe,it,expect,vi} from "vitest";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {
  gate4CustodyRecordDigestV39,
  reviewGate4CustodySnapshotV39,
  executeGate4SignedStopWithCustodyReviewV39,
  type Gate4CustodyRecordV39,
  type Gate4CustodyEntryV39,
  type Gate4CustodyExternalAnchorV39,
  type Gate4CustodyStateV39
} from "../server/lib/disruption/gate4DurableCustodyReview_v39";
import {
  gate4StopTicketSigningMessageV39
} from "../server/lib/disruption/gate4SignedStopCustody_v39";
import type {WebhookSubscription} from
  "../server/lib/disruption/aerodataboxLimiter_v3";

const source="a".repeat(40),auth="b".repeat(64),receipt="c".repeat(64);
const scope="11111111-2222-3333-4444-555555555555",id="exactID99";
const clock=(n:number)=>new Date(Date.parse(
  "2026-10-22T20:00:00.000Z")+1000*n).toISOString();
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const owned=(s:Gate4CustodyStateV39)=>
  !["PREPARED","CREATE_AMBIGUOUS"].includes(s);

function chain(states:Gate4CustodyStateV39[]){
  let previous="0".repeat(64);
  const entries:Gate4CustodyEntryV39[]=states.map((state,i)=>{
    const record:Gate4CustodyRecordV39={
      schema:"v39.gate4.custody-record.v1",
      revision:i+1,previousDigestSha256:previous,
      sourceCommit:source,scopeId:scope,authorizationSha256:auth,
      subjectId:"WSSS",
      subscriptionId:owned(state)?id:null,
      reviewedCreateReceiptSha256:owned(state)?receipt:null,
      state,observedAtUtc:clock(i)
    };
    const digestSha256=gate4CustodyRecordDigestV39(record);
    previous=digestSha256;
    return {record,digestSha256};
  });
  const anchor:Gate4CustodyExternalAnchorV39={
    schema:"v39.gate4.custody-anchor.v1",
    sourceCommit:source,scopeId:scope,authorizationSha256:auth,
    subjectId:"WSSS",
    exactOwnedSubscriptionId:states.some(owned)?id:null,
    independentlyReviewedCreateReceiptSha256:states.some(owned)?receipt:null,
    anchoredRevision:entries.length,
    anchoredHeadDigestSha256:previous
  };
  return {entries,anchor};
}
const prepared=()=>chain(["PREPARED"]);
const ready=()=>chain(["PREPARED","OWNED_ACTIVE"]);
const requested=()=>chain(["PREPARED","OWNED_ACTIVE","STOP_ATTEMPTED"]);
const sub=():WebhookSubscription=>({
  id,isActive:true,billingType:"CreditBased",
  subject:{type:"FlightByAirportIcao",id:"WSSS"}
});
const deps=()=>{
  const listStrict=vi.fn(async():Promise<WebhookSubscription[]>=>[]);
  const deleteExactVerified=vi.fn(async(_x:string)=>true);
  return {listStrict,deleteExactVerified};
};
const keys=generateKeyPairSync("ed25519");
const publicDer=Buffer.from(keys.publicKey.export({format:"der",type:"spki"}));
const stopTicket={
  schema:"v39.gate4.independent-stop-ticket.v1",
  sourceCommit:source,scopeId:scope,authorizationSha256:auth,
  subscriptionId:id,subjectType:"FlightByAirportIcao",subjectId:"WSSS",
  startAtUtc:"2026-10-22T20:00:00.000Z",
  stopAtUtc:"2026-10-22T20:10:00.000Z"
};
const signed=()=>{
  const ticketBytes=Buffer.from(JSON.stringify(stopTicket));
  return {
    ticketBytes,
    signerSpkiDerBase64:publicDer.toString("base64"),
    detachedSignatureBase64:sign(null,
      gate4StopTicketSigningMessageV39(ticketBytes),
      keys.privateKey).toString("base64"),
    independentPins:{
      independentlyReviewedTicketSha256:sha(ticketBytes),
      independentlyReviewedSignerSpkiSha256:sha(publicDer),
      expectedSourceCommit:source,
      expectedScopeId:scope,expectedAuthorizationSha256:auth,
      expectedSubscriptionId:id,expectedSubjectId:"WSSS",
      expectedStartAtUtc:stopTicket.startAtUtc,
      expectedStopAtUtc:stopTicket.stopAtUtc
    }
  };
};

describe("Gate4 independent anchored custody review — offline only",()=>{
  it("PREPARED has zero claimed ownership or DELETE eligibility",()=>{
    expect(reviewGate4CustodySnapshotV39(
      ...Object.values(prepared()) as [Gate4CustodyEntryV39[],
        Gate4CustodyExternalAnchorV39]
    )).toMatchObject({
      status:"NO_POSITIVE_OWNED_ID_HOLD",allowExactOwnedStop:false,
      durableSourceCustodyVerified:false,
      rollbackResistantExternalAnchorAttested:false,
      paidAuthorization:false
    });
  });
  it("positive ID/receipt plus exact head enables review of owned STOP, not authorization",()=>{
    const p=ready();
    expect(reviewGate4CustodySnapshotV39(p.entries,p.anchor)).toMatchObject({
      status:"OWNED_STOP_CUSTODY_REVIEW_ONLY",state:"OWNED_ACTIVE",
      revision:2,allowExactOwnedStop:true,
      creditSettlementVerified:false,independentSupervisorArmed:false
    });
  });
  it("unknown CREATE response locks into HOLD and cannot invent ownership",()=>{
    const p=chain(["PREPARED","CREATE_AMBIGUOUS"]);
    expect(reviewGate4CustodySnapshotV39(p.entries,p.anchor))
      .toMatchObject({allowExactOwnedStop:false,state:"CREATE_AMBIGUOUS"});
    const forged=chain(["PREPARED","CREATE_AMBIGUOUS","OWNED_ACTIVE"]);
    expect(()=>reviewGate4CustodySnapshotV39(
      forged.entries,forged.anchor)).toThrow(
        "GATE4_CUSTODY_ILLEGAL_STATE_TRANSITION_HOLD");
  });
  it("rejects a truncated journal against independently retained tip",()=>{
    const p=requested();
    expect(()=>reviewGate4CustodySnapshotV39(
      p.entries.slice(0,-1),p.anchor)).toThrow(
        "GATE4_CUSTODY_MISSING_OR_ROLLED_BACK_REVISION_HOLD");
  });
  it("rejects a same-revision fork even when attacker rehashes the local record",()=>{
    const p=ready();
    const modified:Gate4CustodyRecordV39={
      ...p.entries[1].record,observedAtUtc:clock(20)
    };
    const fork=[p.entries[0],{
      record:modified,digestSha256:gate4CustodyRecordDigestV39(modified)
    }];
    expect(()=>reviewGate4CustodySnapshotV39(fork,p.anchor)).toThrow(
      "GATE4_CUSTODY_ANCHOR_HEAD_MISMATCH_HOLD");
  });
  it("rejects intermediate chain hash tampering and local hash corruption",()=>{
    const p=requested();
    expect(()=>reviewGate4CustodySnapshotV39([
      p.entries[0],{...p.entries[1],digestSha256:"f".repeat(64)},
      p.entries[2]],p.anchor)).toThrow(
        "GATE4_CUSTODY_RECORD_DIGEST_MISMATCH_HOLD");
    const rewritten={
      ...p.entries[2].record,previousDigestSha256:"e".repeat(64)
    };
    expect(()=>reviewGate4CustodySnapshotV39([
      p.entries[0],p.entries[1],{
        record:rewritten,digestSha256:gate4CustodyRecordDigestV39(rewritten)
      }],p.anchor)).toThrow("GATE4_CUSTODY_CHAIN_OR_SCOPE_MISMATCH_HOLD");
  });
  it("rejects forged missing receipt or foreign ID against external ownership pins",()=>{
    const p=ready();
    for(const changed of [
      {subscriptionId:"foreignID"},
      {reviewedCreateReceiptSha256:"e".repeat(64)},
      {reviewedCreateReceiptSha256:null}
    ]){
      const record={...p.entries[1].record,...changed};
      expect(()=>reviewGate4CustodySnapshotV39([
        p.entries[0],{record,digestSha256:gate4CustodyRecordDigestV39(record)}
      ],p.anchor)).toThrow(
        "GATE4_CUSTODY_EXACT_OWNERSHIP_NOT_EXTERNALLY_PINNED_HOLD");
    }
  });
  it("rejects cross-scope and nonmonotonic event times",()=>{
    const p=ready();
    const wrongAuth={...p.entries[1].record,authorizationSha256:"d".repeat(64)};
    expect(()=>reviewGate4CustodySnapshotV39([
      p.entries[0],{record:wrongAuth,
        digestSha256:gate4CustodyRecordDigestV39(wrongAuth)}
    ],p.anchor)).toThrow("GATE4_CUSTODY_CHAIN_OR_SCOPE_MISMATCH_HOLD");
    const backwards={...p.entries[1].record,observedAtUtc:clock(-1)};
    expect(()=>reviewGate4CustodySnapshotV39([
      p.entries[0],{record:backwards,
        digestSha256:gate4CustodyRecordDigestV39(backwards)}
    ],p.anchor)).toThrow("GATE4_CUSTODY_EVENT_CLOCK_NONMONOTONIC_HOLD");
  });
  it("rejects impossible transitions, gaps and duplicate revision numbers",()=>{
    const p=chain(["PREPARED","OWNED_ACTIVE","STOP_ATTEMPTED",
      "LIST_CLEARED_UNSETTLED"]);
    expect(reviewGate4CustodySnapshotV39(p.entries,p.anchor))
      .toMatchObject({status:"INACTIVE_PENDING_SETTLEMENT",
        creditSettlementVerified:false,allowExactOwnedStop:false});
    const bad=chain(["PREPARED","OWNED_ACTIVE",
      "LIST_CLEARED_UNSETTLED"]);
    expect(()=>reviewGate4CustodySnapshotV39(
      bad.entries,bad.anchor)).toThrow(
        "GATE4_CUSTODY_ILLEGAL_STATE_TRANSITION_HOLD");
    const wrong=ready();
    const r={...wrong.entries[1].record,revision:1};
    expect(()=>reviewGate4CustodySnapshotV39([
      wrong.entries[0],{record:r,
        digestSha256:gate4CustodyRecordDigestV39(r)}
    ],wrong.anchor)).toThrow("GATE4_CUSTODY_CHAIN_OR_SCOPE_MISMATCH_HOLD");
  });
  it("rejects missing anchor and claiming a newer tip without an anchored revision",()=>{
    const p=ready();
    expect(()=>reviewGate4CustodySnapshotV39(p.entries,null!))
      .toThrow("GATE4_CUSTODY_ANCHOR_OR_SNAPSHOT_INVALID_HOLD");
    expect(()=>reviewGate4CustodySnapshotV39(p.entries,{
      ...p.anchor,anchoredRevision:1
    })).toThrow("GATE4_CUSTODY_MISSING_OR_ROLLED_BACK_REVISION_HOLD");
  });
});
describe("Gate4 signed STOP gated by independent custody snapshot",()=>{
  it("does not call provider on PREPARED or unknown CREATE custody",async()=>{
    for(const q of [prepared(),chain(["PREPARED","CREATE_AMBIGUOUS"])]){
      const d=deps();
      const result=await executeGate4SignedStopWithCustodyReviewV39({
        entries:q.entries,externalAnchor:q.anchor,signedStop:signed(),
        nowUtc:"2026-10-22T20:10:00.000Z",
        heartbeatEvidence:null,deps:d
      });
      expect(result).toMatchObject({
        status:"CUSTODY_NOT_ELIGIBLE_HOLD",paidAuthorization:false
      });
      expect(d.listStrict).not.toHaveBeenCalled();
      expect(d.deleteExactVerified).not.toHaveBeenCalled();
    }
  });
  it("refuses signed STOP whose independent pins differ from journal anchor",async()=>{
    const q=ready(),d=deps();
    await expect(executeGate4SignedStopWithCustodyReviewV39({
      entries:q.entries,externalAnchor:q.anchor,
      signedStop:{...signed(),independentPins:{
        ...signed().independentPins,expectedSubscriptionId:"foreignID"
      }},
      nowUtc:"2026-10-22T20:10:00.000Z",
      heartbeatEvidence:null,deps:d
    })).rejects.toThrow("GATE4_CUSTODY_SIGNED_STOP_ANCHOR_DIVERGENCE_HOLD");
    expect(d.listStrict).not.toHaveBeenCalled();
    expect(d.deleteExactVerified).not.toHaveBeenCalled();
  });
  it("valid offline owner+signature permits mock exact-STOP only; no settlement claim",async()=>{
    const q=ready(),d=deps();
    d.listStrict.mockResolvedValueOnce([sub()]).mockResolvedValueOnce([]);
    const result=await executeGate4SignedStopWithCustodyReviewV39({
      entries:q.entries,externalAnchor:q.anchor,
      signedStop:signed(),nowUtc:"2026-10-22T20:10:00.000Z",
      heartbeatEvidence:null,deps:d
    });
    expect(d.deleteExactVerified).toHaveBeenCalledExactlyOnceWith(id);
    expect(d.listStrict).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      status:"SIGNED_STOP_CUSTODY_REVIEW_ONLY",
      stopResult:{
        stopResult:{status:"DELETE_VERIFIED_PENDING_SETTLEMENT"},
        paidAuthorization:false,
        independentSupervisorArmed:false
      },
      custody:{creditSettlementVerified:false,
        rollbackResistantExternalAnchorAttested:false}
    });
    expect(JSON.stringify(result)).not.toContain(id);
  });
  it("tampered signature does not reach provider even with correct custody",async()=>{
    const q=ready(),d=deps();
    await expect(executeGate4SignedStopWithCustodyReviewV39({
      entries:q.entries,externalAnchor:q.anchor,
      signedStop:{...signed(),detachedSignatureBase64:"invalid"},
      nowUtc:"2026-10-22T20:10:00.000Z",
      heartbeatEvidence:null,deps:d
    })).rejects.toThrow("GATE4_STOP_TICKET_BASE64_HOLD");
    expect(d.listStrict).not.toHaveBeenCalled();
    expect(d.deleteExactVerified).not.toHaveBeenCalled();
  });
});
