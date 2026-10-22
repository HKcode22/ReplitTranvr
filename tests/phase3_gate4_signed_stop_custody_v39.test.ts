import {describe,it,expect,vi} from "vitest";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {
  gate4StopTicketSigningMessageV39,
  inspectGate4SignedStopCustodyV39,
  executeGate4SignedStopCandidateV39,
  type Gate4SignedStopTicketInputV39,
  type Gate4StopIndependentReviewPinsV39
} from "../server/lib/disruption/gate4SignedStopCustody_v39";
import type {WebhookSubscription} from "../server/lib/disruption/aerodataboxLimiter_v3";

const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const pair=generateKeyPairSync("ed25519");
const signerSpki=Buffer.from(pair.publicKey.export({format:"der",type:"spki"}));
const source="a".repeat(40),auth="b".repeat(64);
const scope="11111111-2222-3333-4444-555555555555";
const ticket={
  schema:"v39.gate4.independent-stop-ticket.v1",
  sourceCommit:source,scopeId:scope,authorizationSha256:auth,
  subscriptionId:"exactID99",
  subjectType:"FlightByAirportIcao",subjectId:"WSSS",
  startAtUtc:"2026-10-22T20:00:00.000Z",
  stopAtUtc:"2026-10-22T20:10:00.000Z"
};
const bytes=(data:unknown)=>Buffer.from(JSON.stringify(data),"utf8");
const pin=(b:Buffer):Gate4StopIndependentReviewPinsV39=>({
  independentlyReviewedTicketSha256:sha(b),
  independentlyReviewedSignerSpkiSha256:sha(signerSpki),
  expectedSourceCommit:source,expectedScopeId:scope,
  expectedAuthorizationSha256:auth,
  expectedSubscriptionId:"exactID99",
  expectedSubjectId:"WSSS",
  expectedStartAtUtc:ticket.startAtUtc,
  expectedStopAtUtc:ticket.stopAtUtc
});
function fixture(b:Buffer=bytes(ticket),pins=pin(b)):Gate4SignedStopTicketInputV39{
  return {
    ticketBytes:b,independentPins:pins,
    signerSpkiDerBase64:signerSpki.toString("base64"),
    detachedSignatureBase64:sign(null,gate4StopTicketSigningMessageV39(b),
      pair.privateKey).toString("base64")
  };
}
const sub=():WebhookSubscription=>({
  id:"exactID99",isActive:true,billingType:"CreditBased",
  subject:{type:"FlightByAirportIcao",id:"WSSS"}
});
const deps=()=>{
  const listStrict=vi.fn(async():Promise<WebhookSubscription[]>=>[]);
  const deleteExactVerified=vi.fn(async(_id:string)=>true);
  return {listStrict,deleteExactVerified};
};
const now="2026-10-22T20:10:00.000Z";

describe("Gate4 signed STOP custody: offline ED25519 and external pin checks",()=>{
  it("accepts canonical exact JSON and a real synthetic Ed25519 signature only as a review",()=>{
    expect(inspectGate4SignedStopCustodyV39(fixture())).toMatchObject({
      status:"CRYPTO_AND_PIN_BINDING_ONLY_NOT_ARMED",
      cryptographicSignatureVerified:true,
      independentSignerIdentityAttested:false,
      durableSourceCustodyVerified:false,
      independentClockAndWorkerVerified:false,
      paidAuthorization:false,providerRequests:0,databaseWrites:0
    });
  });
  it("rejects mutated signed bytes, even when the original signature remains",()=>{
    const original=fixture();
    const tampered=bytes({...ticket,subjectId:"KLAX"});
    expect(()=>inspectGate4SignedStopCustodyV39({
      ...original,ticketBytes:tampered
    })).toThrow("GATE4_STOP_TICKET_EXACT_BYTES_DIGEST_HOLD");
  });
  it("rejects a different signer even if the new signature is valid",()=>{
    const bad=generateKeyPairSync("ed25519");
    const attackerSpki=Buffer.from(bad.publicKey.export({format:"der",type:"spki"}));
    const valid=fixture();
    expect(()=>inspectGate4SignedStopCustodyV39({
      ...valid,signerSpkiDerBase64:attackerSpki.toString("base64"),
      detachedSignatureBase64:sign(null,gate4StopTicketSigningMessageV39(
        valid.ticketBytes),bad.privateKey).toString("base64")
    })).toThrow("GATE4_STOP_TICKET_SIGNER_FINGERPRINT_HOLD");
  });
  it("rejects tampered signatures using same pinned key",()=>{
    const valid=fixture();
    const corrupted=Buffer.from(valid.detachedSignatureBase64,"base64");
    corrupted[12]^=0x01;
    expect(()=>inspectGate4SignedStopCustodyV39({
      ...valid,detachedSignatureBase64:corrupted.toString("base64")
    })).toThrow("GATE4_STOP_TICKET_BAD_SIGNATURE_HOLD");
  });
  it("cannot self-repin a signed but wrong provider ID or authorization",()=>{
    const wrongId=bytes({...ticket,subscriptionId:"otherID99"});
    expect(()=>inspectGate4SignedStopCustodyV39(fixture(wrongId)))
      .toThrow("GATE4_STOP_TICKET_SCOPE_MISMATCH_HOLD");
    const wrongScope=bytes({...ticket,authorizationSha256:"c".repeat(64)});
    expect(()=>inspectGate4SignedStopCustodyV39(fixture(wrongScope)))
      .toThrow("GATE4_STOP_TICKET_SCOPE_MISMATCH_HOLD");
  });
  it("requires independently pinned start/stop window and source commit",()=>{
    const changedStop=bytes({...ticket,stopAtUtc:"2026-10-22T20:12:00.000Z"});
    expect(()=>inspectGate4SignedStopCustodyV39(fixture(changedStop)))
      .toThrow("GATE4_STOP_TICKET_SCOPE_MISMATCH_HOLD");
    const changedSource=bytes({...ticket,sourceCommit:"c".repeat(40)});
    expect(()=>inspectGate4SignedStopCustodyV39(fixture(changedSource)))
      .toThrow("GATE4_STOP_TICKET_SCOPE_MISMATCH_HOLD");
  });
  it("rejects replay with an invalid/noncanonical exact JSON wire format",()=>{
    const raw=Buffer.from(JSON.stringify(ticket).replace(
      '"subjectId":"WSSS"','"subjectId":"KLAX","subjectId":"WSSS"'),"utf8");
    expect(()=>inspectGate4SignedStopCustodyV39(fixture(raw)))
      .toThrow("GATE4_STOP_TICKET_NONCANONICAL_HOLD");
    const pretty=Buffer.from(JSON.stringify(ticket,null,2));
    expect(()=>inspectGate4SignedStopCustodyV39(fixture(pretty)))
      .toThrow("GATE4_STOP_TICKET_NONCANONICAL_HOLD");
  });
  it("rejects an invalid key algorithm, malformed base64, and missing trust roots",()=>{
    const v=fixture();
    expect(()=>inspectGate4SignedStopCustodyV39({
      ...v,detachedSignatureBase64:"!!!"
    })).toThrow("GATE4_STOP_TICKET_BASE64_HOLD");
    expect(()=>inspectGate4SignedStopCustodyV39({
      ...v,independentPins:{...v.independentPins,
        independentlyReviewedSignerSpkiSha256:"c".repeat(64)}
    })).toThrow("GATE4_STOP_TICKET_SIGNER_FINGERPRINT_HOLD");
    expect(()=>inspectGate4SignedStopCustodyV39({
      ...v,independentPins:undefined!
    })).toThrow("GATE4_STOP_TICKET_TRUST_ROOT_HOLD");
  });
});
describe("Gate4 signed STOP integration — mocked remote only",()=>{
  it("refuses every provider operation before signature verification",async()=>{
    const d=deps();
    const valid=fixture();
    await expect(executeGate4SignedStopCandidateV39({
      ...valid,detachedSignatureBase64:"spoofed"
    },now,null,d)).rejects.toThrow("GATE4_STOP_TICKET_BASE64_HOLD");
    expect(d.listStrict).not.toHaveBeenCalled();
    expect(d.deleteExactVerified).not.toHaveBeenCalled();
  });
  it("healthy signed ticket WATCH uses no provider call",async()=>{
    const d=deps();
    const result=await executeGate4SignedStopCandidateV39(fixture(),
      "2026-10-22T20:03:00.000Z",{
        scopeId:scope,authorizationSha256:auth,
        observedAtUtc:"2026-10-22T20:03:00.000Z",
        controllerHeartbeatUtc:"2026-10-22T20:02:55.000Z"
      },d);
    expect(result.decision.action).toBe("WATCH");
    expect(result.stopResult).toBeNull();
    expect(d.listStrict).not.toHaveBeenCalled();
    expect(d.deleteExactVerified).not.toHaveBeenCalled();
  });
  it("deadline triggers only owned-ID STOP, requiring exact LIST before and after",async()=>{
    const d=deps();
    d.listStrict.mockResolvedValueOnce([sub()])
      .mockResolvedValueOnce([]);
    const result=await executeGate4SignedStopCandidateV39(fixture(),now,null,d);
    expect(d.listStrict).toHaveBeenCalledTimes(2);
    expect(d.deleteExactVerified).toHaveBeenCalledExactlyOnceWith("exactID99");
    expect(result).toMatchObject({
      decision:{action:"STOP"},
      stopResult:{status:"DELETE_VERIFIED_PENDING_SETTLEMENT"},
      cryptographicSignatureVerified:true,
      independentSupervisorArmed:false,
      creditSettlementVerified:false,
      paidAuthorization:false,liveGate4Certified:false,
      durableSourceCustodyVerified:false
    });
    expect(JSON.stringify(result)).not.toContain("exactID99");
  });
  it("unknown provider CREATE custody, inventory failure, or foreign subject never deletes",async()=>{
    const x=deps();
    x.listStrict.mockRejectedValueOnce(new Error("sensitive network details"));
    const v=await executeGate4SignedStopCandidateV39(fixture(),now,null,x);
    expect(v.stopResult?.status).toBe("HOLD_UNCONFIRMED");
    expect(x.deleteExactVerified).not.toHaveBeenCalled();
    expect(JSON.stringify(v)).not.toContain("sensitive network");
    const y=deps();
    y.listStrict.mockResolvedValueOnce([{
      ...sub(),subject:{type:"FlightByAirportIcao",id:"KLAX"}
    }]);
    const w=await executeGate4SignedStopCandidateV39(fixture(),now,null,y);
    expect(w.stopResult?.status).toBe("HOLD_UNCONFIRMED");
    expect(y.deleteExactVerified).not.toHaveBeenCalled();
  });
});
