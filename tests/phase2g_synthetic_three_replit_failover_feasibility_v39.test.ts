import {describe,it,expect} from "vitest";
import {assessThreeReplitFailoverV39 as assess,
  type ThreeReplitPlanV39}
 from "../experiments/phase2g_rehearsal/synthetic_three_replit_failover_feasibility_v39";

const MAIN="https://replit-tranvr--hk84164.replit.app";
const ALMAD="https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev";
const THIRD="https://synthetic-uncreated-third-receiver.invalid";
const receiver=(origin:string,purpose:"primary"|"backup")=>({
  origin,purpose,sourceRevisionExact:true,publishedDeployment:true,
  ownedOrPublishedWithExplicitPermission:true,
  independentEndpointReachabilityVerified:true,
  sameScientificDbBindingVerified:true,
  originalProviderBlobReadbackAcrossInstancesVerified:true,
  singleOwnerSubscriptionAndDedupVerified:true
});
const base=():ThreeReplitPlanV39=>({
  mode:"synthetic-only",
  layout:"one-frontdoor-to-three-verified-receivers",
  providerCallbackOrigin:"https://synthetic-pinned-frontdoor.invalid",
  providerSubscriptionCount:1,
  originalSubscriptionRemainsOneContinuousOwner:true,
  pinnedFrontdoorOrigin:"https://synthetic-pinned-frontdoor.invalid",
  frontdoorRoutingAvailableWithoutPrimaryApp:true,
  routingAndFailoverTestedBeforeCollection:true,
  senderAckMaxMilliseconds:10000,
  worstCaseFailoverAckMilliseconds:3000,
  backups:[receiver(MAIN,"primary"),receiver(ALMAD,"backup"),receiver(THIRD,"backup")],
  historicalOriginalRawSourceWitnessIndependentOfReplit:true
});
const score=(patch:Partial<ThreeReplitPlanV39>={})=>assess({...base(),...patch});

describe("P09/P15 3 Replit POST FAILOVER without duplication or paid provider mutation",()=>{
  it("three direct domains cannot reroute existing Aerodatabox paid POST from pinned hk84164",()=>{
    const r=score({layout:"direct-three-domain-list",
      providerCallbackOrigin:MAIN,pinnedFrontdoorOrigin:null,
      frontdoorRoutingAvailableWithoutPrimaryApp:false});
    expect(r.topology).toBe("NOT_A_WEBHOOK_FAILOVER");
    expect(r.reasons).toContain("PROVIDER_SUBSCRIPTION_IS_PINNED_TO_ONLY_ONE_DESTINATION");
    expect(r.providerWebhookAutoRedirectSupported).toBe(false);
    expect(r.paidOwnerLaunchAuthorized).toBe(false);
  });
  it("three separate subscription URLs introduce duplicate billable sends, not free 3x redundancy",()=>{
    const r=score({layout:"multiple-paid-subscriptions",providerSubscriptionCount:3});
    expect(r.topology).toBe("DUPLICATE_BILLING_RISK");
    expect(r.reasons).toContain("THREE_PARALLEL_ALERT_SUBSCRIPTIONS_MULTIPLY_SENDER_CREDITS");
  });
  it("DELETE+re-create paid subscription midflight changes owner and introduces unknown handover gap",()=>{
    const r=score({layout:"delete-recreate-during-run"});
    expect(r.topology).toBe("DESTROYS_FROZEN_EXPERIMENT_CONTINUITY");
    expect(r.safeOriginalF8PassAuthorized).toBe(false);
  });
  it("frontdoor hosted INSIDE primary Replit cannot fail over when primary Replit ingress itself down",()=>{
    const r=score({frontdoorRoutingAvailableWithoutPrimaryApp:false});
    expect(r.topology).toBe("UNVERIFIED_FRONTDOOR_CONTRACT");
    expect(r.reasons).toContain("NO_INDEPENDENT_FIXED_HTTP_FRONTDOOR");
  });
  it("backups needing unpublishable development workspace explicitly fail deployment parity",()=>{
    const receivers=[...base().backups];
    receivers[1]={...receivers[1],publishedDeployment:false,
      ownedOrPublishedWithExplicitPermission:false};
    const r=score({backups:receivers});
    expect(r.topology).toBe("UNVERIFIED_FRONTDOOR_CONTRACT");
    expect(r.reasons).toContain("BACKUP_RECEIVER_PARITY_STORAGE_OR_OWNER_UNVERIFIED");
  });
  it("shared PostgreSQL but separate original Replit buckets cannot reconstruct old receipt",()=>{
    const receivers=[...base().backups];
    receivers[1]={...receivers[1],originalProviderBlobReadbackAcrossInstancesVerified:false};
    const r=score({backups:receivers});
    expect(r.topology).toBe("UNVERIFIED_FRONTDOOR_CONTRACT");
    expect(r.reasons).toContain("BACKUP_RECEIVER_PARITY_STORAGE_OR_OWNER_UNVERIFIED");
  });
  it("Replit-wide failure correlation means three apps are not independent sources",()=>{
    const r=score({historicalOriginalRawSourceWitnessIndependentOfReplit:false});
    expect(r.topology).toBe("UNVERIFIED_FRONTDOOR_CONTRACT");
    expect(r.reasons).toContain("REPLIT_CORRELATED_FAILURE_AND_SOURCE_INDEPENDENCE_UNPROVEN");
  });
  it("standby must be fast enough for original ~10s sender ACK, not just eventually succeed",()=>{
    const r=score({worstCaseFailoverAckMilliseconds:11000});
    expect(r.topology).toBe("UNVERIFIED_FRONTDOOR_CONTRACT");
    expect(r.reasons).toContain("BACKUP_ACK_CANNOT_BE_PROVEN_INSIDE_10_SECONDS");
  });
  it("even fully verified hypothetical frontdoor only becomes ZERO-CREDIT REHEARSAL candidate",()=>{
    const r=score();
    expect(r.topology).toBe("ELIGIBLE_FOR_ZERO_PROVIDER_CREDIT_REHEARSAL");
    expect(r.reasons).toEqual([]);
    expect(r.currentLiveSixPlusSixPermitted).toBe(false);
    expect(r.paidOwnerLaunchAuthorized).toBe(false);
    expect(r.thirdReplitAccountCreated).toBe(false);
  });
  it("secrets and path tokens must never be placed into public route origin evidence",()=>{
    const r={...base(),providerCallbackOrigin:"https://host.invalid/api/v1/webhooks/key",
      pinnedFrontdoorOrigin:"https://host.invalid/api/v1/webhooks/key"};
    expect(()=>assess(r)).toThrow("THREE_REPLIT_CALLBACK_OR_FRONTDOOR_ORIGIN_INVALID");
  });
  it("second account must be explicit HTTPS identity, not a fabricated deployed placeholder credential",()=>{
    const receivers=[...base().backups];
    receivers[2]={...receivers[2],origin:"postgresql://user:secret@host.invalid/db"};
    expect(()=>score({backups:receivers})).toThrow("THREE_REPLIT_THREE_DISTINCT_HTTPS_ORIGINS_REQUIRED");
  });
  it("backup receiver same-DB identity is not enough when signed cross-instance dedup has not been proved",()=>{
    const receivers=[...base().backups];
    receivers[2]={...receivers[2],singleOwnerSubscriptionAndDedupVerified:false};
    const r=score({backups:receivers});
    expect(r.topology).toBe("UNVERIFIED_FRONTDOOR_CONTRACT");
  });
});
