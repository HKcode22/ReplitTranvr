/**
 * DRAFT only: externally injected, in-memory crash/restart rehearsal.
 * No deployment, provider, network or database client is invoked here.
 */
import {describe,it,expect,vi} from "vitest";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {
  gate4CustodyRecordDigestV39,
  executeGate4SignedStopWithCustodyReviewV39,
  type Gate4CustodyRecordV39,
  type Gate4CustodyEntryV39,
  type Gate4CustodyStateV39,
  type Gate4CustodyExternalAnchorV39
} from "../server/lib/disruption/gate4DurableCustodyReview_v39";
import {gate4StopTicketSigningMessageV39} from
  "../server/lib/disruption/gate4SignedStopCustody_v39";
import type {WebhookSubscription} from
  "../server/lib/disruption/aerodataboxLimiter_v3";

const source="a".repeat(40),auth="b".repeat(64),receipt="c".repeat(64);
const scopeId="11111111-2222-3333-4444-555555555555";
const id="exactID99";
const ownerSub:WebhookSubscription={
  id,isActive:true,billingType:"CreditBased",
  subject:{type:"FlightByAirportIcao",id:"WSSS"}
};
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const pair=generateKeyPairSync("ed25519");
const spki=Buffer.from(pair.publicKey.export({format:"der",type:"spki"}));
const authorization={
  schema:"v39.gate4.independent-stop-ticket.v1",
  sourceCommit:source,scopeId,authorizationSha256:auth,
  subscriptionId:id,subjectType:"FlightByAirportIcao",subjectId:"WSSS",
  startAtUtc:"2026-10-22T20:00:00.000Z",
  stopAtUtc:"2026-10-22T20:10:00.000Z"
};
function signed(){
  const ticketBytes=Buffer.from(JSON.stringify(authorization));
  return {
    ticketBytes,
    detachedSignatureBase64:sign(
      null,gate4StopTicketSigningMessageV39(ticketBytes),pair.privateKey
    ).toString("base64"),
    signerSpkiDerBase64:spki.toString("base64"),
    independentPins:{
      independentlyReviewedTicketSha256:sha(ticketBytes),
      independentlyReviewedSignerSpkiSha256:sha(spki),
      expectedSourceCommit:source,expectedScopeId:scopeId,
      expectedAuthorizationSha256:auth,
      expectedSubscriptionId:id,expectedSubjectId:"WSSS",
      expectedStartAtUtc:authorization.startAtUtc,
      expectedStopAtUtc:authorization.stopAtUtc
    }
  };
}
const owned=(state:Gate4CustodyStateV39)=>state!=="PREPARED"&&
  state!=="CREATE_AMBIGUOUS";
function custody(states:Gate4CustodyStateV39[]){
  const start=Date.parse("2026-10-22T20:00:00.000Z");
  let prior="0".repeat(64);
  const entries:Gate4CustodyEntryV39[]=states.map((state,i)=>{
    const record:Gate4CustodyRecordV39={
      schema:"v39.gate4.custody-record.v1",
      revision:i+1,previousDigestSha256:prior,
      sourceCommit:source,scopeId,authorizationSha256:auth,
      subjectId:"WSSS",subscriptionId:owned(state)?id:null,
      reviewedCreateReceiptSha256:owned(state)?receipt:null,
      state,observedAtUtc:new Date(start+i*1000).toISOString()
    };
    const digestSha256=gate4CustodyRecordDigestV39(record);
    prior=digestSha256;
    return {record,digestSha256};
  });
  const anchor:Gate4CustodyExternalAnchorV39={
    schema:"v39.gate4.custody-anchor.v1",
    sourceCommit:source,scopeId,authorizationSha256:auth,
    subjectId:"WSSS",exactOwnedSubscriptionId:states.some(owned)?id:null,
    independentlyReviewedCreateReceiptSha256:states.some(owned)?receipt:null,
    anchoredRevision:entries.length,
    anchoredHeadDigestSha256:prior
  };
  return {entries,externalAnchor:anchor};
}
const pending=()=>custody([
  "PREPARED","OWNED_ACTIVE","STOP_ATTEMPTED","STOP_UNCONFIRMED"
]);
const nowUtc="2026-10-22T20:11:00.000Z";
const run=(q:ReturnType<typeof custody>,deps:{
  listStrict:()=>Promise<WebhookSubscription[]>;
  deleteExactVerified:(subscriptionId:string)=>Promise<boolean>;
},args:{override?:ReturnType<typeof signed>}={})=>
  executeGate4SignedStopWithCustodyReviewV39({
    ...q,signedStop:args.override??signed(),nowUtc,
    heartbeatEvidence:null,deps
  });

describe("Gate4 offline independent STOP crash/restart rehearsal",()=>{
  it("re-reads independently pinned owner and retries exact STOP after prior failed DELETE",async()=>{
    const q=pending();
    const deleteExactVerified=vi.fn()
      .mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const first=await run(q,{
      listStrict:async()=>[ownerSub],deleteExactVerified
    });
    expect(first.stopResult.stopResult?.status).toBe("HOLD_UNCONFIRMED");
    // Simulated process is destroyed. A new reader rehydrates the same
    // separately pinned STOP_UNCONFIRMED journal and verifies signature again.
    const listStrict=vi.fn().mockResolvedValueOnce([ownerSub])
      .mockResolvedValueOnce([]);
    const second=await run(custody([
      "PREPARED","OWNED_ACTIVE","STOP_ATTEMPTED","STOP_UNCONFIRMED"
    ]),{listStrict,deleteExactVerified});
    expect(deleteExactVerified).toHaveBeenCalledTimes(2);
    expect(deleteExactVerified).toHaveBeenNthCalledWith(1,id);
    expect(deleteExactVerified).toHaveBeenNthCalledWith(2,id);
    expect(second.stopResult.stopResult?.status)
      .toBe("DELETE_VERIFIED_PENDING_SETTLEMENT");
    expect(second.stopResult.creditSettlementVerified).toBe(false);
    expect(second.stopResult.independentSupervisorArmed).toBe(false);
  });
  it("on lost DELETE ACK, reboot sees zero active and does not DELETE again",async()=>{
    const q=pending();
    let live=true;
    const deleteExactVerified=vi.fn(async()=>{
      live=false;return false; // provider may have deleted before lost ACK
    });
    const deps={
      listStrict:async()=>live?[ownerSub]:[],
      deleteExactVerified
    };
    const first=await run(q,deps);
    expect(first.stopResult.stopResult?.status).toBe("HOLD_UNCONFIRMED");
    const second=await run(q,deps);
    expect(second.stopResult.stopResult?.status).toBe("NO_ACTIVE_OWNED");
    expect(deleteExactVerified).toHaveBeenCalledTimes(1);
    expect(second.stopResult.creditSettlementVerified).toBe(false);
  });
  it("unknown remote CREATE outcome cannot infer an ID on restart",async()=>{
    const q=custody(["PREPARED","CREATE_AMBIGUOUS"]);
    const listStrict=vi.fn(),deleteExactVerified=vi.fn();
    const result=await run(q,{listStrict,deleteExactVerified});
    expect(result.status).toBe("CUSTODY_NOT_ELIGIBLE_HOLD");
    expect(listStrict).not.toHaveBeenCalled();
    expect(deleteExactVerified).not.toHaveBeenCalled();
  });
  it("rolled-back custody history must never trigger provider STOP",async()=>{
    const q=pending();
    const {entries}=q;
    const listStrict=vi.fn(),deleteExactVerified=vi.fn();
    await expect(run({...q,entries:entries.slice(0,-1)},
      {listStrict,deleteExactVerified}))
      .rejects.toThrow("GATE4_CUSTODY_MISSING_OR_ROLLED_BACK_REVISION_HOLD");
    expect(listStrict).not.toHaveBeenCalled();
    expect(deleteExactVerified).not.toHaveBeenCalled();
  });
  it("a forged anchor with wrong exact owner cannot prompt DELETE",async()=>{
    const q=pending();
    const listStrict=vi.fn(),deleteExactVerified=vi.fn();
    await expect(run({...q,externalAnchor:{
      ...q.externalAnchor,exactOwnedSubscriptionId:"foreignID"
    }},{listStrict,deleteExactVerified}))
      .rejects.toThrow("GATE4_CUSTODY_EXACT_OWNERSHIP_NOT_EXTERNALLY_PINNED_HOLD");
    expect(listStrict).not.toHaveBeenCalled();
    expect(deleteExactVerified).not.toHaveBeenCalled();
  });
  it("signature substitution on recovery is rejected before provider calls",async()=>{
    const q=pending(),listStrict=vi.fn(),deleteExactVerified=vi.fn();
    await expect(run(q,{listStrict,deleteExactVerified},{
      override:{...signed(),detachedSignatureBase64:"invalid"}
    })).rejects.toThrow("GATE4_STOP_TICKET_BASE64_HOLD");
    expect(listStrict).not.toHaveBeenCalled();
    expect(deleteExactVerified).not.toHaveBeenCalled();
  });
  it("provider LIST outage after reboot is unresolved, not a zero-subscription PASS",async()=>{
    const q=pending(),deleteExactVerified=vi.fn();
    const result=await run(q,{
      listStrict:async()=>{throw Error("private endpoint and token");},
      deleteExactVerified
    });
    expect(result.stopResult.stopResult?.status).toBe("HOLD_UNCONFIRMED");
    expect(JSON.stringify(result)).not.toContain("private endpoint");
    expect(deleteExactVerified).not.toHaveBeenCalled();
  });
  it("foreign active resource does not prevent exact owned STOP but blocks account clear",async()=>{
    const q=pending(),deleteExactVerified=vi.fn(async()=>true);
    const foreign:WebhookSubscription={
      ...ownerSub,id:"foreignID",subject:{type:"FlightByAirportIcao",id:"KLAX"}
    };
    let count=0;
    const result=await run(q,{
      listStrict:async()=>++count===1?[ownerSub,foreign]:[foreign],
      deleteExactVerified
    });
    expect(deleteExactVerified).toHaveBeenCalledExactlyOnceWith(id);
    expect(result.stopResult.stopResult?.status).toBe("HOLD_UNCONFIRMED");
    expect(result.stopResult.creditSettlementVerified).toBe(false);
  });
});
