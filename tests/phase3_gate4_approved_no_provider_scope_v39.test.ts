import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {
 reviewGate4ApprovedManifestV39,
 GATE4_SETUP_APPROVED_UUID_V39,
 GATE4_SETUP_APPROVED_RECEIVER_SOURCE_V39,
 GATE4_SETUP_APPROVED_RECEIVER_ROLE_V39,
 GATE4_SETUP_APPROVED_WRITER_ROLE_V39
} from "../scripts/v39_gate4_approved_no_provider_scope_v39";

const base={
 schema:"v39.gate4.next-scope-setup.v1",
 scopeId:GATE4_SETUP_APPROVED_UUID_V39,
 airportIcao:"WSSS",
 reviewedMainSha:GATE4_SETUP_APPROVED_RECEIVER_SOURCE_V39,
 proposedPublishedSourceSha:GATE4_SETUP_APPROVED_RECEIVER_SOURCE_V39,
 receiverRole:GATE4_SETUP_APPROVED_RECEIVER_ROLE_V39,
 writerRole:GATE4_SETUP_APPROVED_WRITER_ROLE_V39,
 permission:"ONE_TIME_PRODUCTION_SETUP_NO_PROVIDER",
 paidSubscriptionAuthorized:false,
 providerRequestsAuthorized:false,
 nonce:"b".repeat(64)
};
function signFixture(x:Record<string,unknown>){
 return {...x,authorizationSha256:createHash("sha256")
  .update(JSON.stringify(x)).digest("hex")};
}
describe("Gate4 approved no-provider scope — pure strict private manifest verifier",()=>{
 it("accepts the exact fresh UUID, roles, frozen compiled source and SHA digest",()=>{
  const m=reviewGate4ApprovedManifestV39(signFixture(base));
  expect(m).not.toBeNull();
  expect(m?.scopeId).toBe("d6c0fcac-798e-4913-bfd1-a561adb3dd82");
  expect(m?.providerRequestsAuthorized).toBe(false);
  expect(m?.paidSubscriptionAuthorized).toBe(false);
 });
 it("rejects old/replayed/new UUID and any changed published receiver source",()=>{
  for(const field of [
   {scopeId:"498dccd7-5da3-4687-a6ea-e0dc03b54398"},
   {scopeId:"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"},
   {proposedPublishedSourceSha:"a".repeat(40)},
   {reviewedMainSha:"a".repeat(40)},
   {receiverRole:"gate4_receiver_20261022"},
   {writerRole:"gate4_owner_writer_20261023"}
  ])expect(reviewGate4ApprovedManifestV39(
    signFixture({...base,...field}))).toBeNull();
 });
 it("rejects tampering, altered auth, extra keys, and unapproved provider authority",()=>{
  const ok=signFixture(base);
  expect(reviewGate4ApprovedManifestV39({...ok,authorizationSha256:"0".repeat(64)}))
   .toBeNull();
  expect(reviewGate4ApprovedManifestV39({...ok,nonce:"c".repeat(64)}))
   .toBeNull();
  expect(reviewGate4ApprovedManifestV39({...ok,extra:"x"})).toBeNull();
  expect(reviewGate4ApprovedManifestV39(signFixture({
   ...base,paidSubscriptionAuthorized:true
  }))).toBeNull();
  expect(reviewGate4ApprovedManifestV39(signFixture({
   ...base,providerRequestsAuthorized:true
  }))).toBeNull();
  expect(reviewGate4ApprovedManifestV39(signFixture({
   ...base,permission:"RUN_ONE_PAID_CREATE"
  }))).toBeNull();
  expect(reviewGate4ApprovedManifestV39(null)).toBeNull();
 });
});
