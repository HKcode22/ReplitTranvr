import {createHash,generateKeyPairSync,sign,type KeyObject} from "node:crypto";
import {describe,it,expect} from "vitest";
import {digestP5Stage24ReviewedReceipt,type P5Stage24ReviewedT24Receipt} from "../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39";
import {matchP5PreservedPreToSeparatedPostOutcomes,type P5PreservedPreOutcomeAnchor,type P5OutcomeEvidence} from "../server/lib/disruption/phase5ConditionalPostOutcomeMatcher_v39";
import {measureP5ConditionalSignedSchedulePair as pair} from "../server/lib/disruption/phase5ConditionalSignedSchedulePair_v39";
const h=(x:string)=>x.repeat(64),t=(s:string)=>"2035-11-25T"+s+":00.000Z";
const sha=(x:Buffer)=>createHash("sha256").update(x).digest("hex");
const spki=(k:KeyObject)=>sha(k.export({type:"spki",format:"der"}) as Buffer);
function fixture(){
 const a=generateKeyPairSync("ed25519"),b=generateKeyPairSync("ed25519");
 const policy={schema:"v39.phase5.conditional-schedule-pair-policy.v1",manifestSha256:h("a"),protocolSha256:h("b"),rightsSha256:h("c"),effectiveUtc:t("04:00"),expiresUtc:t("23:59"),preSignerSpkiSha256:spki(a.publicKey),postSignerSpkiSha256:spki(b.publicKey),endpoint:"PROVIDER_SCHEDULE_REVISION_ABS_GE_15_MIN",approvedSeparateTier:true};
 const policyBytes=Buffer.from(JSON.stringify(policy)),trust={policyBytes,expectedPolicySha256:sha(policyBytes),preSignerPublicKeyPem:a.publicKey.export({type:"spki",format:"pem"}).toString(),postSignerPublicKeyPem:b.publicKey.export({type:"spki",format:"pem"}).toString()};
 const pre={schema:"v39.phase5.conditional-schedule-receipt.v1",lane:"PRE",manifestSha256:h("a"),protocolSha256:h("b"),rightsSha256:h("c"),runDayIndex:2,serviceKey:"leg:g5a:"+h("d"),operatorFlightNumber:"SQ78",originIcao:"WSSS",destinationIcao:"YSSY",sourceQueryId:"c23e4567-e89b-42d3-a456-426614174013",sourceResponseSha256:h("e"),sourceBodySha256:h("f"),sourcePlannedUtc:t("05:00"),sourceAvailableUtc:t("05:02"),sourceExpiresUtc:t("23:00"),reviewedAtUtc:t("05:04"),scheduledDepartureUtc:t("12:00"),firstScheduledDepartureUtc:t("12:00"),horizon:"T-6h",preIssueReceiptSha256:h("1"),preIssuedUtc:t("05:05"),postReservationSha256:null as string|null,positiveOperatorUnique:true,nativeOperatingLegCertified:false};
 const post={...pre,lane:"POST",sourceQueryId:"c23e4567-e89b-42d3-a456-426614174014",sourceResponseSha256:h("2"),sourceBodySha256:h("3"),sourcePlannedUtc:t("12:30"),sourceAvailableUtc:t("12:35"),sourceExpiresUtc:"2035-11-26T11:00:00.000Z",reviewedAtUtc:t("14:00"),scheduledDepartureUtc:t("12:25"),postReservationSha256:h("4")};
 const wire=(x:unknown,k:KeyObject)=>{const body=Buffer.from(JSON.stringify(x));return {bodyBase64:body.toString("base64"),signatureBase64:sign(null,body,k).toString("base64")};};
 return {trust,pre,post,a,b,wire};
}
describe("separate prospective signed schedule-revision pairing",()=>{
 it("measures a matched schedule revision only with distinct signed receipts and actual pre-issue clock",()=>{
  const f=fixture(),x=pair(f.trust,f.wire(f.pre,f.a.privateKey),f.wire(f.post,f.b.privateKey),t("14:01"));
  expect(x.status).toBe("OBSERVED_REVISION_GE_15_MIN");
  expect(x.privateCandidate).toMatchObject({scheduledRevisionMinutes:25,primaryBinaryOutcome:1,physicalDepartureDelayLabel:false});
  expect(x.trainingPublicationAuthorized).toBe(false);
  expect(JSON.stringify(x)).not.toMatch(/SQ78|scheduledRevisionMinutes|privateCandidate/);
 });
 it("refuses mismatched service/day, policy, source or fabricated PRE issue",()=>{
  const f=fixture(),pre=f.wire(f.pre,f.a.privateKey);
  for(const patch of [{runDayIndex:3},{sourceQueryId:f.pre.sourceQueryId},{preIssueReceiptSha256:h("9")},{serviceKey:"leg:g5a:"+h("0")}])
   expect(()=>pair(f.trust,pre,f.wire({...f.post,...patch},f.b.privateKey),t("14:01"))).toThrow(/PAIR_BINDING/);
  expect(()=>pair({...f.trust,expectedPolicySha256:h("0")},pre,f.wire(f.post,f.b.privateKey),t("14:01"))).toThrow(/PINNED_POLICY/);
  expect(()=>pair(f.trust,f.wire({...f.pre,preIssuedUtc:t("06:01")},f.a.privateKey),f.wire({...f.post,preIssuedUtc:t("06:01")},f.b.privateKey),t("14:01"))).toThrow(/PROSPECTIVE/);
 });
 it("rejects wrong signer, expired PRE, late POST and forged bytes",()=>{
  const f=fixture(),pre=f.wire(f.pre,f.a.privateKey),post=f.wire(f.post,f.b.privateKey);
  expect(()=>pair(f.trust,pre,f.wire(f.post,f.a.privateKey),t("14:01"))).toThrow(/SIGNATURE/);
  expect(()=>pair(f.trust,pre,post,t("13:59"))).toThrow(/PROSPECTIVE/);
  expect(()=>pair(f.trust,pre,post,t("23:01"))).toThrow(/RETENTION/);
  expect(()=>pair(f.trust,pre,f.wire({...f.post,sourceAvailableUtc:t("14:01"),reviewedAtUtc:t("14:02")},f.b.privateKey),t("14:03"))).toThrow(/PROSPECTIVE/);
  expect(()=>pair(f.trust,pre,{...post,bodyBase64:f.wire({...f.post,scheduledDepartureUtc:t("13:00")},f.b.privateKey).bodyBase64},t("14:01"))).toThrow(/SIGNATURE/);
 });
});
describe("T075 conditional service comparison stays distinct from physical labels",()=>{
 it.each([["12:00",0,0],["11:44",-16,1],["12:14",14,0]] as const)("observed %s revision is not a physical delay", (scheduled,minutes,binary)=>{
  const f=fixture(),p={...f.post,scheduledDepartureUtc:t(scheduled)};
  const out=pair(f.trust,f.wire(f.pre,f.a.privateKey),f.wire(p,f.b.privateKey),t("14:01"));
  expect(out.privateCandidate).toMatchObject({scheduledRevisionMinutes:minutes,primaryBinaryOutcome:binary,physicalDepartureDelayLabel:false});
  expect(out.physicalGateOutCertified).toBe(false);
  expect(out.trainingPublicationAuthorized).toBe(false);
 });
 it("no distinct POST receipt cannot become a zero schedule revision",()=>{
  const f=fixture(),pre=f.wire(f.pre,f.a.privateKey);
  expect(()=>pair(f.trust,pre,f.wire({...f.post,sourceResponseSha256:f.pre.sourceResponseSha256},f.b.privateKey),t("14:01"))).toThrow(/PAIR_BINDING/);
 });
});


describe("T075 runtime signed receipt digest identity",()=>{
 it("rejects validly signed malformed receipt digests and same query aliases",()=>{
  const f=fixture(),pre=f.wire(f.pre,f.a.privateKey);
  for(const patch of [
   {sourceResponseSha256:[f.pre.sourceResponseSha256]},
   {sourceResponseSha256:f.pre.sourceResponseSha256+"\n"},
   {sourceBodySha256:[f.post.sourceBodySha256]},
   {postReservationSha256:[f.post.postReservationSha256]}
  ])expect(()=>pair(f.trust,pre,f.wire({...f.post,...patch},f.b.privateKey),t("14:01"))).toThrow(/HOLD_P5_CONDITIONAL_PAIR_(RECEIPT|PAIR_BINDING)/);
  expect(()=>pair(f.trust,pre,f.wire({...f.post,sourceQueryId:f.pre.sourceQueryId.toUpperCase()},f.b.privateKey),t("14:01"))).toThrow(/PAIR_BINDING/);
 });
 it("preserves a genuine zero revision when distinct response receipts have identical body digests",()=>{
  const f=fixture(),post={...f.post,sourceBodySha256:f.pre.sourceBodySha256,scheduledDepartureUtc:f.pre.scheduledDepartureUtc};
  const out=pair(f.trust,f.wire(f.pre,f.a.privateKey),f.wire(post,f.b.privateKey),t("14:01"));
  expect(out.privateCandidate).toMatchObject({scheduledRevisionMinutes:0,primaryBinaryOutcome:0,physicalDepartureDelayLabel:false});
  expect(out.physicalGateOutCertified).toBe(false);
  expect(out.trainingPublicationAuthorized).toBe(false);
 });
});

describe("T142 independently witnessed frozen T survives a retimed T6 schedule at POST",()=>{
 function witnessed(){
  const f=fixture(),T=f.pre.firstScheduledDepartureUtc;
  const base:Omit<P5Stage24ReviewedT24Receipt,"receiptSha256">={
   schema:"v39.phase5.stage24.externally-reviewed-stage17-receipt.v1",
   snapshotId:"9001",flightInstanceId:f.pre.serviceKey,selectedTNativeUtc:T,
   frozenT24CutoffUtc:"2035-11-24T12:00:00.000Z",expectedSelectedTVersion:"reviewed-frozen-t24-v39",
   t24OriginalFidsSha256:h("8"),t24SourceQueryDigestSha256:h("9"),
   t24FrameSha256:h("a"),t24ConfigSha256:h("b"),
   witnessDbObservedAtUtc:"2035-11-24T11:58:00.000Z",stage17PostCommitReadbackAtUtc:"2035-11-24T11:58:30.000Z"
  };
  const receipt={...base,receiptSha256:digestP5Stage24ReviewedReceipt(base)};
  const witnessRow={snapshot_id:"9001",joined_snapshot_id:"9001",flight_instance_id:base.flightInstanceId,
   selected_t_version:base.expectedSelectedTVersion,fids_response_hash:base.t24OriginalFidsSha256,
   source_query_digest:base.t24SourceQueryDigestSha256,frame_hash:base.t24FrameSha256,config_hash:base.t24ConfigSha256,
   source_t24_population_query_id:"c23e4567-e89b-42d3-a456-426614174012",snapshot_prediction_state:"PRE_DEPARTURE",
   snapshot_horizon:"T-24h",selected_t_native_utc:T,t24_cutoff_utc:base.frozenT24CutoffUtc,
   post_pre_commit_db_observed_at_utc:base.witnessDbObservedAtUtc};
  const expected={flightInstanceId:base.flightInstanceId,selectedTNativeUtc:T,expectedSelectedTVersion:base.expectedSelectedTVersion,
   expectedFrameSha256:base.t24FrameSha256,expectedConfigSha256:base.t24ConfigSha256,cutoffUtc:t("06:00"),horizon:"T-6h" as const};
  const policyBytes=Buffer.from(JSON.stringify({...JSON.parse(f.trust.policyBytes.toString()),witnessedFrozenT24RetimeApproved:true}));
  const trust={...f.trust,policyBytes,expectedPolicySha256:sha(policyBytes)};
  const pre={...f.pre,scheduledDepartureUtc:t("12:15"),t24WitnessReceiptSha256:receipt.receiptSha256};
  const post={...f.post,t24WitnessReceiptSha256:receipt.receiptSha256};
  return {...f,trust,legacyTrust:f.trust,pre,post,witness:{receipt,witnessRow,expected}};
 }
 it.each([["12:25",10,0],["12:30",15,1],["12:00",-15,1],["12:15",0,0]] as const)("compares retimed T6 against %s while keeping original T and W",(reported,minutes,binary)=>{
  const f=witnessed(),post={...f.post,scheduledDepartureUtc:t(reported)};
  const out=pair(f.trust,f.wire(f.pre,f.a.privateKey),f.wire(post,f.b.privateKey),t("14:01"),f.witness);
  expect(out.privateCandidate).toMatchObject({scheduledRevisionMinutes:minutes,primaryBinaryOutcome:binary,
   predictionCutoffUtc:t("06:00"),fixedAssessmentWatermarkUtc:t("14:00"),physicalDepartureDelayLabel:false});
  expect(out.physicalGateOutCertified).toBe(false);
  expect(out.trainingPublicationAuthorized).toBe(false);
  expect(JSON.stringify(out)).not.toMatch(/scheduledRevisionMinutes|receiptSha256|privateCandidate/);
 });
 it("refuses retiming without the reviewed policy, both signed bindings, exact witness, and distinct original",()=>{
  const f=witnessed(),pre=f.wire(f.pre,f.a.privateKey),post=f.wire(f.post,f.b.privateKey);
  expect(()=>pair(f.trust,pre,post,t("14:01"))).toThrow(/WITNESSED_REFERENCE_REQUIRED/);
  expect(()=>pair(f.legacyTrust,pre,post,t("14:01"),f.witness)).toThrow(/WITNESSED_REFERENCE_BINDING/);
  expect(()=>pair(f.trust,pre,f.wire({...f.post,t24WitnessReceiptSha256:h("0")},f.b.privateKey),t("14:01"),f.witness)).toThrow(/WITNESSED_REFERENCE_BINDING/);
  expect(()=>pair(f.trust,pre,post,t("14:01"),{...f.witness,witnessRow:{...f.witness.witnessRow,selected_t_native_utc:t("12:15")}})).toThrow(/PERSISTED_T24_WITNESS_ORIGINAL_T_CHANGED/);
  expect(()=>pair(f.trust,pre,post,t("14:01"),{...f.witness,expected:{...f.witness.expected,cutoffUtc:t("06:15")}})).toThrow(/WITNESSED_REFERENCE_SCOPE/);
  expect(()=>pair(f.trust,pre,post,t("14:01"),{...f.witness,witnessRow:{...f.witness.witnessRow,source_t24_population_query_id:f.pre.sourceQueryId}})).toThrow(/WITNESSED_REFERENCE_NOT_DISTINCT_FROM_LATER_SOURCE/);
 });
 it("requires the witnessed T24 and current T6 anchors in the same preserved group",()=>{
  const f=witnessed(),w=f.witness,r=w.receipt;
  const t6:P5PreservedPreOutcomeAnchor={flightInstanceId:f.pre.serviceKey,identityTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",runDayIndex:f.pre.runDayIndex,slot:"HUB",horizon:"T-6h",preSnapshotId:"9002",
   phase7FragmentRowId:"11111111-1111-4111-8111-111111111102",phase7GroupId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",preIssuedAtUtc:f.pre.preIssuedUtc,predictionCutoffUtc:t("06:00"),manifestSha256:f.pre.manifestSha256,preIssueReceiptSha256:f.pre.preIssueReceiptSha256,originalSourceQueryId:f.pre.sourceQueryId,originalSourceResponseSha256:f.pre.sourceResponseSha256,originalSourceAvailableAtUtc:f.pre.sourceAvailableUtc,selectedScheduledDepartureUtc:f.pre.firstScheduledDepartureUtc,t24WitnessReceiptSha256:r.receiptSha256};
  const t24:P5PreservedPreOutcomeAnchor={...t6,horizon:"T-24h",preSnapshotId:r.snapshotId,phase7FragmentRowId:"11111111-1111-4111-8111-111111111101",preIssuedAtUtc:"2035-11-24T11:57:00.000Z",predictionCutoffUtc:r.frozenT24CutoffUtc,originalSourceQueryId:w.witnessRow.source_t24_population_query_id,originalSourceResponseSha256:r.t24OriginalFidsSha256,originalSourceAvailableAtUtc:"2035-11-24T11:55:00.000Z",preIssueReceiptSha256:undefined,t24WitnessReceiptSha256:undefined};
  const o:P5OutcomeEvidence={tier:"CONDITIONAL_QUERY_FILTERED_SERVICE",flightInstanceId:t6.flightInstanceId,runDayIndex:t6.runDayIndex,trust:f.trust,preWire:f.wire(f.pre,f.a.privateKey),postWire:f.wire(f.post,f.b.privateKey),dbObservedUtc:t("14:01"),witnessedT24:w};
  expect(matchP5PreservedPreToSeparatedPostOutcomes([t24,t6],[o]).coverage.signedConditionalRevisionCandidatesUnverifiedAnchor).toBe(1);
  for(const a of [[t6],[{...t24,originalSourceResponseSha256:h("0")},t6],[t24,{...t6,t24WitnessReceiptSha256:h("0")}]])
   expect(()=>matchP5PreservedPreToSeparatedPostOutcomes(a,[o])).toThrow(/CONDITIONAL_WITNESS_NOT_BOUND/);
 });
});
