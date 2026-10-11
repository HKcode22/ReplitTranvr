import {describe,it,expect} from "vitest";
import {assessReplitOnlyBackupV39,adjudicateDbOnlyGapV39,
  type ReplitOnlyBackupInputV39}
  from "../experiments/phase2g_rehearsal/replit_only_postgres_failover_gate_v39";
const hypothetical=():ReplitOnlyBackupInputV39=>({
  mode:"zero-provider-synthetic-only",
  operatorApprovedNoCreditHostedRehearsal:true,
  noCloudflareAndNoNewPaidSubscription:true,
  originalProviderCallbackPinnedToPrimary:true,
  primaryWebhooksCannotRerouteAutomatically:true,
  standbyDevelopmentUrlGetReachable:true,
  standbyIsolatedSyntheticPostRoutePresent:true,
  standbySyntheticStorageSeparatedFromLiveScientificDbAndBlob:true,
  standbyTestSecretsSeparatedFromLiveProviderSecrets:true,
  standbyExactRunningCodeRevisionVerified:true,
  standbyPhysicalFlightInstanceV2Verified:true,
  temporaryStandbyIndependentOfPrimaryRuntime:true,
  independentSqlObserverCanReadCommittedRows:true,
  independentSqlObserverReadOnlyVerified:true,
  originalBeforeAckSourceIsDurableOutsidePrimaryFailureDomain:true,
  originalRawWireReadbackVerified:true,
  originalSourceRetentionHours:168,
  authenticatedProviderSentItemCreditLedgerAvailable:true,
  independentFirstHopReceivesNewProviderPostsDuringPrimaryOutage:true,
  hostedFullPostWallclock120MinutesPassed:true
});
describe("Replit-only temporary receiver + independent Postgres is NOT automatically durable ingress",()=>{
  it("real observed Travnr dev 502 / stopped; no synthetic isolated DB; authorized C is still blocked",()=>{
    const a=assessReplitOnlyBackupV39({...hypothetical(),
      standbyDevelopmentUrlGetReachable:false,
      standbyIsolatedSyntheticPostRoutePresent:false,
      standbySyntheticStorageSeparatedFromLiveScientificDbAndBlob:false,
      standbyTestSecretsSeparatedFromLiveProviderSecrets:false,
      standbyExactRunningCodeRevisionVerified:false,
      standbyPhysicalFlightInstanceV2Verified:false
    });
    expect(a.readyToAttemptIsolatedNoCreditHostedRehearsal).toBe(false);
    expect(a.failedHostedRehearsalChecks).toEqual(expect.arrayContaining([
      "STANDBY_DEVELOPMENT_URL_NOT_SERVING","ISOLATED_SYNTHETIC_POST_HANDLER_MISSING",
      "DISPOSABLE_STORAGE_ISOLATION_UNPROVEN"
    ]));
    expect(a.paidYssyAuthorized).toBe(false);
  });
  it("working dev GET plus independently reachable Postgres does not redirect never-delivered provider POSTs",()=>{
    const a=assessReplitOnlyBackupV39({...hypothetical(),
      originalBeforeAckSourceIsDurableOutsidePrimaryFailureDomain:false,
      independentFirstHopReceivesNewProviderPostsDuringPrimaryOutage:false,
      authenticatedProviderSentItemCreditLedgerAvailable:false
    });
    expect(a.readyToAttemptIsolatedNoCreditHostedRehearsal).toBe(true);
    expect(a.postgresObserverCanProvideIndependentCommittedRowEvidence).toBe(true);
    expect(a.postgresObserverCanReceiveProviderPosts).toBe(false);
    expect(a.temporaryReplitUrlAutomaticallyReceivesOriginalProviderPosts).toBe(false);
    expect(a.failedPaidContinuityChecks).toEqual(expect.arrayContaining([
      "INDEPENDENT_ORIGINAL_BEFORE_ACK_CUSTODY_MISSING",
      "NO_FIRST_HOP_FOR_NEW_POSTS_WHEN_PRIMARY_IS_DOWN",
      "PROVIDER_SENT_FLIGHT_ITEM_LEDGER_NOT_AUTHENTICATED"
    ]));
    expect(a.liveSixPlusSixEnabled).toBe(false);
  });
  it("completely green hypothetical synthetic preflight still never enables paid 6+6",()=>{
    const a=assessReplitOnlyBackupV39(hypothetical());
    expect(a.failedHostedRehearsalChecks).toHaveLength(0);
    expect(a.failedPaidContinuityChecks).toHaveLength(0);
    expect(a.readyToAttemptIsolatedNoCreditHostedRehearsal).toBe(true);
    expect(a.liveSixPlusSixEnabled).toBe(false);
    expect(a.paidYssyAuthorized).toBe(false);
    expect(a.directPgObserverGuaranteesOriginalSourceCompleteness).toBe(false);
  });
  it.each([
    ["dev unreachable",{standbyDevelopmentUrlGetReachable:false},"STANDBY_DEVELOPMENT_URL_NOT_SERVING"],
    ["production DB shared",{standbySyntheticStorageSeparatedFromLiveScientificDbAndBlob:false},"DISPOSABLE_STORAGE_ISOLATION_UNPROVEN"],
    ["provider secret reused",{standbyTestSecretsSeparatedFromLiveProviderSecrets:false},"SYNTHETIC_TEST_SECRET_ISOLATION_UNPROVEN"],
    ["published revision not test revision",{standbyExactRunningCodeRevisionVerified:false},"CURRENT_STANDBY_DEVELOPMENT_BUILD_SHA_UNVERIFIED"],
    ["physical-v2 not running",{standbyPhysicalFlightInstanceV2Verified:false},"STANDBY_RUNTIME_PHYSICAL_V2_UNVERIFIED"]
  ] as const)("synthetic rehearsal veto: %s",(_,p,reason)=>{
    const a=assessReplitOnlyBackupV39({...hypothetical(),...p});
    expect(a.readyToAttemptIsolatedNoCreditHostedRehearsal).toBe(false);
    expect(a.failedHostedRehearsalChecks).toContain(reason);
  });
  it("missing unreceived provider-send ledger is UNKNOWN, not zero missing",()=>{
    expect(adjudicateDbOnlyGapV39({
      localCommittedFlightItems:259,
      independentlyAuthenticatedProviderSentFlightItems:null
    })).toMatchObject({
      exactItemGap:null,sourceComplete:false,
      sourceUncertainty:"UNKNOWN_PROVIDER_SENDS",scientificPassAuthorized:false
    });
  });
  it("historical external 260 versus internal 259 is never falsely reconciled",()=>{
    expect(adjudicateDbOnlyGapV39({
      localCommittedFlightItems:259,
      independentlyAuthenticatedProviderSentFlightItems:260
    })).toMatchObject({exactItemGap:1,sourceComplete:false,
      sourceUncertainty:"MISMATCH"});
  });
  it("even equal item totals do not prove immutable per-attempt identity or complete original wire",()=>{
    expect(adjudicateDbOnlyGapV39({
      localCommittedFlightItems:260,
      independentlyAuthenticatedProviderSentFlightItems:260
    })).toMatchObject({exactItemGap:0,sourceComplete:false,
      sourceUncertainty:"EXACT_COUNT_ONLY_IDENTITY_STILL_UNVERIFIED"});
  });
  it("rejects fractional and impossible source item counts, preventing silent numeric coercion",()=>{
    for(const n of [-1,0.5,Number.MAX_SAFE_INTEGER+1]){
      expect(()=>adjudicateDbOnlyGapV39({
        localCommittedFlightItems:n,independentlyAuthenticatedProviderSentFlightItems:null
      })).toThrow("P14_SOURCE_LOCAL_ITEM_COUNT_INVALID");
    }
  });
});
