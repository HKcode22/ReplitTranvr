/**
 * DRAFT Gate4 custody snapshot + independently pinned monotonic chain review.
 * Pure/no I/O. Not a durable store, trusted CAS writer, production receipt,
 * signer attestation, live independent STOP service or spending permission.
 *
 * An adversary able to rewrite BOTH the journal and the purported independent
 * anchor can fool this review: the future safety service MUST obtain anchors
 * from an externally permissioned, authenticated, rollback-resistant store.
 * Never derive the anchor or independently reviewed CREATE receipt from these
 * untrusted records. Keep raw IDs, keys and receipts out of logs.
 */
import {createHash} from "node:crypto";
import {
  executeGate4SignedStopCandidateV39,
  type Gate4SignedStopTicketInputV39
} from "./gate4SignedStopCustody_v39";
import type {Gate4IndependentHeartbeatEvidenceV39} from
  "./gate4IndependentStopCandidate_v39";
import type {Gate4ExactOwnedStopDepsV39} from "./gate4StandaloneSafety_v39";

export type Gate4CustodyStateV39=
  "PREPARED"|"CREATE_AMBIGUOUS"|"OWNED_ACTIVE"|
  "STOP_ATTEMPTED"|"STOP_UNCONFIRMED"|"LIST_CLEARED_UNSETTLED";

export type Gate4CustodyRecordV39=Readonly<{
  schema:"v39.gate4.custody-record.v1";
  revision:number;
  previousDigestSha256:string;
  sourceCommit:string;
  scopeId:string;
  authorizationSha256:string;
  subjectId:string;
  subscriptionId:string|null;
  reviewedCreateReceiptSha256:string|null;
  state:Gate4CustodyStateV39;
  observedAtUtc:string;
}>;

export type Gate4CustodyEntryV39=Readonly<{
  record:Gate4CustodyRecordV39;
  digestSha256:string;
}>;

export type Gate4CustodyExternalAnchorV39=Readonly<{
  schema:"v39.gate4.custody-anchor.v1";
  sourceCommit:string;
  scopeId:string;
  authorizationSha256:string;
  subjectId:string;
  exactOwnedSubscriptionId:string|null;
  independentlyReviewedCreateReceiptSha256:string|null;
  anchoredRevision:number;
  anchoredHeadDigestSha256:string;
}>;

const SHA40=/^[a-f0-9]{40}$/;
const HEX=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const ID=/^[A-Za-z0-9_-]{6,128}$/;
const ICAO=/^[A-Z]{4}$/;
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const DOMAIN="ReplitTranvr:V39:GATE4:CUSTODY_CHAIN:V1\0";
const RECORD_FIELDS=[
  "schema","revision","previousDigestSha256","sourceCommit",
  "scopeId","authorizationSha256","subjectId","subscriptionId",
  "reviewedCreateReceiptSha256","state","observedAtUtc"
];
const STATES:readonly Gate4CustodyStateV39[]=[
  "PREPARED","CREATE_AMBIGUOUS","OWNED_ACTIVE","STOP_ATTEMPTED",
  "STOP_UNCONFIRMED","LIST_CLEARED_UNSETTLED"
];
const FOLLOW:Readonly<Record<Gate4CustodyStateV39,
  readonly Gate4CustodyStateV39[]>>={
  PREPARED:["CREATE_AMBIGUOUS","OWNED_ACTIVE"],
  CREATE_AMBIGUOUS:[],
  OWNED_ACTIVE:["STOP_ATTEMPTED"],
  STOP_ATTEMPTED:["STOP_UNCONFIRMED","LIST_CLEARED_UNSETTLED"],
  STOP_UNCONFIRMED:["STOP_ATTEMPTED"],
  LIST_CLEARED_UNSETTLED:[]
};
const fail=(code:string):never=>{throw Error("GATE4_CUSTODY_"+code+"_HOLD");};
const instant=(s:unknown):number|null=>{
  if(typeof s!=="string"||!UTC.test(s))return null;
  const d=Date.parse(s);
  return Number.isFinite(d)&&new Date(d).toISOString()===s?d:null;
};
/**
 * Content hash is a tamper-indicator, NOT authentication.
 * The independently protected (revision, digest) anchor is essential.
 */
export function gate4CustodyRecordDigestV39(record:Gate4CustodyRecordV39):string{
  if(!record||Object.keys(record).join("|")!==RECORD_FIELDS.join("|"))
    return fail("RECORD_SHAPE");
  return createHash("sha256").update(DOMAIN+JSON.stringify(record))
    .digest("hex");
}

export type Gate4CustodyReviewV39=Readonly<{
  status:"OWNED_STOP_CUSTODY_REVIEW_ONLY"|
    "NO_POSITIVE_OWNED_ID_HOLD"|"INACTIVE_PENDING_SETTLEMENT";
  state:Gate4CustodyStateV39;
  revision:number;
  allowExactOwnedStop:boolean;
  durableSourceCustodyVerified:false;
  rollbackResistantExternalAnchorAttested:false;
  creditSettlementVerified:false;
  independentSupervisorArmed:false;
  paidAuthorization:false;
}>;

/**
 * Reject absent/stale anchor, rollback/fork, gaps, duplicated revision, missing
 * ID, changed subject/source/auth, unknown CREATE, fabricated transitions.
 * No implicit successful DELETE, no guessed orphan ownership, no SETTLED.
 */
export function reviewGate4CustodySnapshotV39(
  entries:readonly Gate4CustodyEntryV39[],
  anchor:Gate4CustodyExternalAnchorV39
):Gate4CustodyReviewV39{
  if(!Array.isArray(entries)||entries.length<1||entries.length>64||
    !anchor||anchor.schema!=="v39.gate4.custody-anchor.v1"||
    !SHA40.test(anchor.sourceCommit)||!UUID.test(anchor.scopeId)||
    !HEX.test(anchor.authorizationSha256)||!ICAO.test(anchor.subjectId)||
    !(anchor.exactOwnedSubscriptionId===null||
      ID.test(anchor.exactOwnedSubscriptionId))||
    !(anchor.independentlyReviewedCreateReceiptSha256===null||
      HEX.test(anchor.independentlyReviewedCreateReceiptSha256))||
    !Number.isSafeInteger(anchor.anchoredRevision)||
    anchor.anchoredRevision<1||!HEX.test(anchor.anchoredHeadDigestSha256))
    return fail("ANCHOR_OR_SNAPSHOT_INVALID");
  if(anchor.anchoredRevision!==entries.length)
    return fail("MISSING_OR_ROLLED_BACK_REVISION");
  let previous="0".repeat(64),state:Gate4CustodyStateV39|null=null;
  let lastTime=-1;
  for(let i=0;i<entries.length;i++){
    const entry=entries[i],r=entry?.record;
    if(!r || r.schema!=="v39.gate4.custody-record.v1"||
      !Number.isSafeInteger(r.revision)||r.revision!==i+1||
      !STATES.includes(r.state)||r.previousDigestSha256!==previous||
      r.sourceCommit!==anchor.sourceCommit||r.scopeId!==anchor.scopeId||
      r.authorizationSha256!==anchor.authorizationSha256||
      r.subjectId!==anchor.subjectId||
      !(r.subscriptionId===null||ID.test(r.subscriptionId))||
      !(r.reviewedCreateReceiptSha256===null||
        HEX.test(r.reviewedCreateReceiptSha256)))
      return fail("CHAIN_OR_SCOPE_MISMATCH");
    const time=instant(r.observedAtUtc);
    if(time===null||time<lastTime)
      return fail("EVENT_CLOCK_NONMONOTONIC");
    if(i===0&&r.state!=="PREPARED")
      return fail("FIRST_EVENT_NOT_PREPARED");
    if(i>0 && (!state||!FOLLOW[state].includes(r.state)))
      return fail("ILLEGAL_STATE_TRANSITION");
    const beforeOwned=r.state==="PREPARED"||
      r.state==="CREATE_AMBIGUOUS";
    if(beforeOwned){
      if(r.subscriptionId!==null||r.reviewedCreateReceiptSha256!==null)
        return fail("UNCONFIRMED_CREATE_CANNOT_OWN_ID");
    }else{
      if(anchor.exactOwnedSubscriptionId===null||
        anchor.independentlyReviewedCreateReceiptSha256===null||
        r.subscriptionId!==anchor.exactOwnedSubscriptionId||
        r.reviewedCreateReceiptSha256!==
          anchor.independentlyReviewedCreateReceiptSha256)
        return fail("EXACT_OWNERSHIP_NOT_EXTERNALLY_PINNED");
    }
    const digest=gate4CustodyRecordDigestV39(r);
    if(entry.digestSha256!==digest)
      return fail("RECORD_DIGEST_MISMATCH");
    previous=digest;state=r.state;lastTime=time;
  }
  if(previous!==anchor.anchoredHeadDigestSha256)
    return fail("ANCHOR_HEAD_MISMATCH");
  if(!state)return fail("EMPTY_STATE");
  // An unknown CREATE response is an incident, not permission to infer ID.
  const allowExactOwnedStop=state==="OWNED_ACTIVE"||
    state==="STOP_ATTEMPTED"||state==="STOP_UNCONFIRMED";
  return {
    status:allowExactOwnedStop?"OWNED_STOP_CUSTODY_REVIEW_ONLY":
      state==="LIST_CLEARED_UNSETTLED"?
      "INACTIVE_PENDING_SETTLEMENT":"NO_POSITIVE_OWNED_ID_HOLD",
    state,revision:entries.length,allowExactOwnedStop,
    durableSourceCustodyVerified:false,
    rollbackResistantExternalAnchorAttested:false,
    creditSettlementVerified:false,
    independentSupervisorArmed:false,paidAuthorization:false
  };
}

/**
 * Offline integration contract only. The same *externally verified* exact ID,
 * source/auth/scope/airport must bind chain anchor AND signed stop-ticket pins
 * before provider LIST / exact DELETE can be invoked through injections.
 * No journaling of STOP result or anchor CAS exists in this module.
 */
export async function executeGate4SignedStopWithCustodyReviewV39(args:{
  entries:readonly Gate4CustodyEntryV39[];
  externalAnchor:Gate4CustodyExternalAnchorV39;
  signedStop:Gate4SignedStopTicketInputV39;
  nowUtc:string;
  heartbeatEvidence:Gate4IndependentHeartbeatEvidenceV39|null;
  deps:Gate4ExactOwnedStopDepsV39;
}){
  const custody=reviewGate4CustodySnapshotV39(
    args.entries,args.externalAnchor
  );
  if(!custody.allowExactOwnedStop)
    return {status:"CUSTODY_NOT_ELIGIBLE_HOLD" as const,
      custody,stopResult:null,paidAuthorization:false as const};
  const a=args.externalAnchor,p=args.signedStop?.independentPins;
  if(!p||a.exactOwnedSubscriptionId===null||
    p.expectedSubscriptionId!==a.exactOwnedSubscriptionId||
    p.expectedSourceCommit!==a.sourceCommit||
    p.expectedScopeId!==a.scopeId||
    p.expectedAuthorizationSha256!==a.authorizationSha256||
    p.expectedSubjectId!==a.subjectId)
    return fail("SIGNED_STOP_ANCHOR_DIVERGENCE");
  const stop=await executeGate4SignedStopCandidateV39(
    args.signedStop,args.nowUtc,args.heartbeatEvidence,args.deps
  );
  return {status:"SIGNED_STOP_CUSTODY_REVIEW_ONLY" as const,
    custody,stopResult:stop,paidAuthorization:false as const};
}
