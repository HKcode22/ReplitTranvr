import {describe,it,expect} from "vitest";
import {
 reviewGate4ProspectivePaidReadinessV39,
 illustrationAllDeliveredExact95LowerBoundV39,
 GATE4_CURRENT_VERIFIED_RECEIVER_SHA_V39,
 type Gate4ProspectiveOwnerReadinessV39
} from "../server/lib/disruption/gate4ProspectivePaidReadiness_v39";

const pinned=GATE4_CURRENT_VERIFIED_RECEIVER_SHA_V39;
const prospective=():Gate4ProspectiveOwnerReadinessV39=>({
 newScopeId:"11111111-2222-4333-8444-555555555555",
 reviewedReceiverSha:pinned,publishedReceiverSha:pinned,
 reviewedStopRunnerSha:"a".repeat(40),
 reviewedPaidOperatorSha:"b".repeat(40),
 airportIcao:"WSSS",
 startingCredits:1991,activeSubscriptions:0,
 softCreditTarget:5,protectedFloor:1900,
 providerMaxDeliveryRetries:0,
 schedulesStatus:"OK",liveStatus:"OK",adsbStatus:"OKPartial",
 exactNewScopeReceiverMounted:false,
 exactNewScopeScopedRlsInstalled:false,
 exactNewScopePositiveOwnerBinderReady:false,
 exactNewScopeRawOriginalReadbackReady:false,
 independentProtectedStopArmed:false,
 independentProtectedStopHeartbeatFresh:false,
 liveSixPlusSixCallbackObserverAttached:false,
 freshExplicitOwnerPaidAuthorization:false,
 explicitBurstOvershootRiskAccepted:false
});
describe("Gate4 authentic paid readiness with scientific 6+6 health",()=>{
 it("reports REAL blockers after already successful NEXT2 synthetic HTTP->V0071",()=>{
  const result=reviewGate4ProspectivePaidReadinessV39(prospective());
  expect(result.status).toBe("NEEDS_PREPARATION");
  expect(result.missing).toContain("NEW_PAID_SCOPE_RECEIVER_NOT_MOUNTED");
  expect(result.missing).toContain("NEW_V0072_PROVENANCE_BINDER_NOT_READY");
  expect(result.missing).toContain("LIVE_6PLUS6_OBSERVER_NOT_YET_ATTACHED");
  expect(result.missing).toContain("GITHUB_STOP_NOT_INDEPENDENTLY_ARMED");
  expect(result.missing).toContain("FRESH_ONE_CREATE_OWNER_PERMISSION_MISSING");
  expect(result.watchdogPolicy).toEqual({
   primaryChecks:6,backupChecks:6,pollMilliseconds:15000,
   maximumOutageMilliseconds:180000
  });
  expect(result.providerCalls).toBe(0);
  expect(result.databaseWrites).toBe(0);
  expect(result.liveCreateAuthorized).toBe(false);
 });
 it("never reuses historic NEXT1 paid or NEXT2 synthetic scope",()=>{
  for(const id of [
   "d6c0fcac-798e-4913-bfd1-a561adb3dd82",
   "16f819c6-7c68-4d5a-82cf-3820e9294dc7",
   "invalid"
  ]){
   const c={...prospective(),newScopeId:id};
   expect(reviewGate4ProspectivePaidReadinessV39(c).missing)
    .toContain("NEW_UNSPENT_SCOPE_REQUIRED");
  }
 });
 it("protects live reviewed source SHA separately from operator SHA",()=>{
  const c={...prospective(),publishedReceiverSha:"c".repeat(40)};
  expect(reviewGate4ProspectivePaidReadinessV39(c).missing)
   .toContain("EXACT_REVIEWED_RECEIVER_SOURCE_NOT_VERIFIED");
 });
 it("recognizes ADS-B partial as allowed when schedules/live are healthy",()=>{
  expect(reviewGate4ProspectivePaidReadinessV39(prospective()).missing)
   .not.toContain("WSSS_FEED_HEALTH_NOT_ESTABLISHED");
  expect(reviewGate4ProspectivePaidReadinessV39({
   ...prospective(),liveStatus:"Degraded"}).missing)
   .toContain("WSSS_FEED_HEALTH_NOT_ESTABLISHED");
 });
 it("rejects 12 retries and separate unapproved 1-2 paid retries",()=>{
  for(const n of [1,2,12]){
   const x=reviewGate4ProspectivePaidReadinessV39({
    ...prospective(),providerMaxDeliveryRetries:n});
   if(n===12)expect(x.missing)
    .toContain("INVALID_PROVIDER_RETRY_SETTING_NOT_6PLUS6");
   expect(x.missing).toContain("PAID_PROVIDER_RETRIES_NOT_SEPARATELY_AUTHORIZED");
  }
 });
 it("allows current 1991 with a proposed reserve only as planning input",()=>{
  expect(reviewGate4ProspectivePaidReadinessV39(prospective()).missing)
   .not.toContain("CREDIT_SOFT_POLICY_EXCEEDS_STARTING_BALANCE");
  const c={...prospective(),protectedFloor:2000};
  expect(reviewGate4ProspectivePaidReadinessV39(c).missing)
   .toContain("CREDIT_SOFT_POLICY_EXCEEDS_STARTING_BALANCE");
 });
 it("even all asserted checks cannot trigger CREATE or Phase4",()=>{
  const c:Gate4ProspectiveOwnerReadinessV39={
   ...prospective(),
   exactNewScopeReceiverMounted:true,
   exactNewScopeScopedRlsInstalled:true,
   exactNewScopePositiveOwnerBinderReady:true,
   exactNewScopeRawOriginalReadbackReady:true,
   independentProtectedStopArmed:true,
   independentProtectedStopHeartbeatFresh:true,
   liveSixPlusSixCallbackObserverAttached:true,
   freshExplicitOwnerPaidAuthorization:true,
   explicitBurstOvershootRiskAccepted:true
  };
  expect(reviewGate4ProspectivePaidReadinessV39(c)).toMatchObject({
   status:"READY_FOR_EXTERNAL_VERIFICATION_ONLY",
   missing:[],liveCreateAuthorized:false,phase4Authorized:false,
   genuineProviderOriginalsProven:false,softStopIsHardCreditCap:false
  });
 });
 it("small n: 1 of 1 successes is feasibility, not 100% reliable delivery",()=>{
  expect(illustrationAllDeliveredExact95LowerBoundV39(0)).toBeNull();
  expect(illustrationAllDeliveredExact95LowerBoundV39(1))
   .toBeCloseTo(0.025,12);
  expect(illustrationAllDeliveredExact95LowerBoundV39(36))
   .toBeGreaterThan(0.9);
  expect(illustrationAllDeliveredExact95LowerBoundV39(36))
   .toBeLessThan(0.91);
 });
});
