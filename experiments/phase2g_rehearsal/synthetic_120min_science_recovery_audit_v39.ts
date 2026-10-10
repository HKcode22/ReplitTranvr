import {
  verifySyntheticSenderFrameV39,
  type SignedSyntheticSenderFrameV39
} from "./signed_attempt_reconciliation_v39";
import {
  verifySyntheticScienceJournalWithOriginalWireV39,
  type SignedSyntheticScienceJournalV39
} from "./disposable_logged_science_recovery_journal_v39";
import {
  compareSyntheticPhysicalItemContinuityV39,
  type SyntheticPhysicalItemWitnessV39
} from "./synthetic_physical_item_continuity_v39";

/**
 * P13: full original frozen 120-minute source-to-item disaster RECOVERY AUDIT.
 * Entirely synthetic. Two separate HMAC fixture keys and wire hashes are
 * checked, but NOT genuine AeroDataBox origin authentication or pricing.
 * No PostgreSQL writes, no provider calls, no recovery authorization.
 */
export type RecoverySourceEntryV39=Readonly<{
  signed:SignedSyntheticScienceJournalV39;
  originalWire:Uint8Array;
}>;
export type SyntheticWindowRecoveryAuditV39=Readonly<{
  testManifestConsistent:boolean;
  mandatoryScientificCensorForUnprovenLiveSource:true;
  sourceAttempts:number;
  journalAttempts:number;
  observedItems:number;
  confirmedObservationRows:number;
  uniquePhysicalOperatorFlights:number;
  sourceBuckets:readonly number[];
  sourceSyntheticCredits:number;
  journalSyntheticCredits:number;
  errors:readonly string[];
  paidLaunchAuthorized:false;
  scientificPassAuthorized:false;
  automaticRecoveryAuthorized:false;
}>;
export function auditSynthetic120MinuteScienceRecoveryV39(input:{
  signedSyntheticSender:SignedSyntheticSenderFrameV39;
  independentFixtureSenderKey:string;
  journalFixtureKey:string;
  expectedSessionId:string;
  expectedSubscriptionId:string;
  expectedOwnerFrozenRunSha256:string;
  entries:readonly RecoverySourceEntryV39[];
  observedRuntimeRows:readonly SyntheticPhysicalItemWitnessV39[];
}):SyntheticWindowRecoveryAuditV39{
  const errors=new Set<string>();
  const add=(s:string)=>errors.add(s);
  // Fatal invalid signature/owner is never downgraded to incomplete science.
  const f=verifySyntheticSenderFrameV39({
    signed:input.signedSyntheticSender,
    independentSenderKey:input.independentFixtureSenderKey,
    expectedSessionId:input.expectedSessionId,
    expectedProviderSubscriptionId:input.expectedSubscriptionId,
    expectedOwnerFrozenRunSha256:input.expectedOwnerFrozenRunSha256
  });
  if(!Array.isArray(input.entries)||
     !Array.isArray(input.observedRuntimeRows)||
     input.entries.length>10000||input.observedRuntimeRows.length>20000)
    throw new Error("P13_RECOVERY_LEDGER_UNBOUNDED");
  if(f.attempts.length!==120||input.entries.length!==120)
    add("P13_FROZEN_120_ATTEMPT_TEST_PLAN_INCOMPLETE");
  const source=new Map(f.attempts.map(a=>[a.attemptKey,a]));
  const processed=new Set<string>();
  const buckets=Array<number>(8).fill(0);
  const witnesses:SyntheticPhysicalItemWitnessV39[]=[];
  let expectedCredits=0,observedCredits=0;
  for(const attempt of f.attempts){
    expectedCredits+=attempt.syntheticCostCredits;
    if(attempt.syntheticCostCredits!==1)
      add("P13_SYNTHETIC_SENDER_PER_ATTEMPT_CREDIT_INVALID");
    if(attempt.senderResponseStatus!==200||
       attempt.senderResponseElapsedMs>10_000)
      add("P13_ORIGINAL_SENDER_ACK_NOT_TIMELY");
    const when=Date.parse(attempt.providerAttemptUtc);
    if(when<Date.parse(f.windowStartUtc)||
       when>=Date.parse(f.windowEndUtc))
      add("P13_SENDER_ATTEMPT_OUTSIDE_FROZEN_WINDOW");
  }
  for(const entry of input.entries){
    const tentative=entry?.signed?.frame;
    const key=tentative?.attemptKey;
    if(typeof key!=="string"||processed.has(key)){
      add("P13_DUPLICATE_OR_MISSING_SCIENTIFIC_JOURNAL_ATTEMPT");
      continue;
    }
    processed.add(key);
    const a=source.get(key);
    if(!a){add("P13_JOURNAL_ATTEMPT_NOT_IN_SENDER_LEDGER");continue;}
    let v;
    try{
      v=verifySyntheticScienceJournalWithOriginalWireV39({
        signed:entry.signed,fixtureKey:input.journalFixtureKey,
        expected:{
          sessionId:f.sessionId,
          providerSubscriptionId:f.providerSubscriptionId,
          ownerFrozenRunSha256:f.ownerFrozenRunSha256,
          attemptKey:a.attemptKey
        },
        originalRawBytes:entry.originalWire
      });
    }catch{
      add("P13_JOURNAL_SIGNATURE_OR_ORIGINAL_ITEM_WIRE_UNVERIFIED");
      continue;
    }
    if(v.windowStartUtc!==f.windowStartUtc||
       v.windowEndUtc!==f.windowEndUtc)
      add("P13_JOURNAL_FROZEN_WINDOW_CHANGED");
    if(v.sourceWireSha256!==a.wireSha256)
      add("P13_SENDER_VS_SCIENCE_WIRE_SHA_MISMATCH");
    if(v.syntheticCostCredits!==a.syntheticCostCredits)
      add("P13_SENDER_VS_SCIENCE_COST_GAP");
    observedCredits+=v.syntheticCostCredits;
    const ms=Date.parse(v.firstEdgeReceivedUtc);
    const from=Date.parse(f.windowStartUtc),end=Date.parse(f.windowEndUtc);
    if(ms<from||ms>=end)
      add("P13_SOURCE_FIRST_EDGE_OUTSIDE_FROZEN_WINDOW");
    else buckets[Math.floor((ms-from)/900000)]++;
    // An empty event MAY be valid provider content but this synthetic
    // 120-flight stress acceptance fixture expects actual item evidence.
    if(v.items.length===0)add("P13_EXPECTED_OPERATOR_ITEM_ABSENT");
    witnesses.push(...v.items);
  }
  for(const a of f.attempts)
    if(!processed.has(a.attemptKey))
      add("P13_SIGNED_SENDER_ATTEMPT_MISSING_FROM_SCIENCE_JOURNAL");
  if(processed.size!==source.size)
    add("P13_SENDER_JOURNAL_ATTEMPT_CARDINALITY_MISMATCH");
  if(expectedCredits!==observedCredits)
    add("P13_SENDER_JOURNAL_TOTAL_CREDIT_GAP");
  if(!buckets.every(n=>n===15))
    add("P13_ORIGINAL_EIGHT_15MIN_SOURCE_BUCKETS_INCOMPLETE");
  const continuity=compareSyntheticPhysicalItemContinuityV39({
    frozenSessionId:f.sessionId,
    windowStartUtc:f.windowStartUtc,windowEndUtc:f.windowEndUtc,
    // "true" here is only a comparison of locally signed TEST witnesses;
    // production source authority must be established separately.
    independentSourceEvidenceAuthenticated:true,
    independentOwnerFreezeAuthenticated:true,
    expectedWitnesses:witnesses,
    observedRuntimeRows:input.observedRuntimeRows
  });
  for(const error of continuity.errors)
    add("P13_ITEM_"+error);
  if(continuity.confirmedOperatorObservationRows!==witnesses.length)
    add("P13_PHYSICAL_OPERATOR_ITEMS_UNRESOLVED");
  return {
    testManifestConsistent:errors.size===0,
    mandatoryScientificCensorForUnprovenLiveSource:true,
    sourceAttempts:f.attempts.length,
    journalAttempts:processed.size,
    observedItems:input.observedRuntimeRows.length,
    confirmedObservationRows:continuity.confirmedOperatorObservationRows,
    uniquePhysicalOperatorFlights:continuity.confirmedUniqueOperatorFlightCount,
    sourceBuckets:buckets,
    sourceSyntheticCredits:expectedCredits,
    journalSyntheticCredits:observedCredits,
    errors:[...errors].sort(),
    paidLaunchAuthorized:false,
    scientificPassAuthorized:false,
    automaticRecoveryAuthorized:false
  };
}
