import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
  auditSynthetic120MinuteScienceRecoveryV39,
  type RecoverySourceEntryV39
} from "../experiments/phase2g_rehearsal/synthetic_120min_science_recovery_audit_v39";
import {
  signSyntheticSenderFrameV39,
  type SignedSyntheticSenderFrameV39
} from "../experiments/phase2g_rehearsal/signed_attempt_reconciliation_v39";
import {
  signSyntheticScienceRecoveryFrameV39,
  type SyntheticScienceJournalFrameV39
} from "../experiments/phase2g_rehearsal/disposable_logged_science_recovery_journal_v39";
import type {
  SyntheticPhysicalItemWitnessV39
} from "../experiments/phase2g_rehearsal/synthetic_physical_item_continuity_v39";
const SESSION="12345678-1234-4234-8234-123456789abc";
const SUB="synthetic-yssy-journal-run-120";
const OWNER="a".repeat(64);
const SENDER_KEY="synthetic-source-independent-"+"s".repeat(64);
const JOURNAL_KEY="synthetic-recovery-journal-"+"j".repeat(64);
const START=Date.parse("2026-10-12T03:00:00.000Z");
const at=(i:number)=>new Date(START+i*60000).toISOString();
const digest=(v:string|Uint8Array)=>createHash("sha256").update(v).digest("hex");
const canonical=(v:any):string=>{
  if(v===null||typeof v!=="object")return JSON.stringify(v);
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
};
function makeFixture(){
  const sent:SignedSyntheticSenderFrameV39["frame"]["attempts"][number][]=[];
  const entries:RecoverySourceEntryV39[]=[];
  const observed:SyntheticPhysicalItemWitnessV39[]=[];
  for(let i=0;i<120;i++){
    const flight={
      id:"synthetic-flight-"+i,number:"QF"+(700+i),
      codeshareStatus:"IsOperator",
      airline:{iata:"QF",icao:"QFA"},
      departure:{airport:{icao:"YSSY",timeZone:"Australia/Sydney"},
        scheduledTime:{utc:at(i)}},
      arrival:{airport:{icao:"YMEL"},
        scheduledTime:{utc:at(i+100)}}
    };
    const message={
      id:"synthetic-delivery-"+i,subscription:{id:SUB},
      timestampUtc:at(i),
      flights:[flight],
      deliveryAttempt:{seqNo:0,costCredits:1,timestampUtc:at(i)}
    };
    const rawWire=new TextEncoder().encode(JSON.stringify(message));
    const attemptKey=digest("synthetic-attempt-id-"+i);
    const wireSha=digest(rawWire);
    const item:SyntheticPhysicalItemWitnessV39={
      sessionId:SESSION,deliveryId:message.id,
      itemIndex:0,rawItemSha256:digest(canonical(flight)),
      originalEdgeReceivedUtc:at(i),
      identityResolutionStatus:"resolved",
      codeshareResolutionStatus:"resolved_operator",
      flightInstanceId:"synthetic-phys-"+i,
      initialServiceDate:"2026-10-12",
      operatingCarrier:"QF",operatingFlightNumber:String(700+i),
      originIcao:"YSSY",destinationIcao:"YMEL",
      scheduledGateOutUtc:at(i)
    };
    const frame:SyntheticScienceJournalFrameV39={
      schema:"v39.synthetic-logged-science-recovery.v1",
      sessionId:SESSION,providerSubscriptionId:SUB,
      ownerFrozenRunSha256:OWNER,
      windowStartUtc:at(0),windowEndUtc:at(120),
      attemptKey,sourceWireSha256:wireSha,
      firstEdgeReceivedUtc:at(i),syntheticCostCredits:1,
      items:[item]
    };
    entries.push({
      signed:signSyntheticScienceRecoveryFrameV39(frame,JOURNAL_KEY),
      originalWire:rawWire
    });
    observed.push(item);
    sent.push({
      attemptKey,notificationId:message.id,attemptSeqNo:0,
      providerAttemptUtc:at(i),providerGeneratedUtc:at(i),
      wireSha256:wireSha,
      canonicalSha256:digest(canonical(message)),
      syntheticCostCredits:1,senderResponseStatus:200,
      senderResponseElapsedMs:230
    });
  }
  return {
    signedSyntheticSender:signSyntheticSenderFrameV39({
      schema:"v39.phase2g-synthetic-independent-sender.v1",
      mode:"synthetic-only",sessionId:SESSION,
      providerSubscriptionId:SUB,ownerFrozenRunSha256:OWNER,
      windowStartUtc:at(0),windowEndUtc:at(120),
      attempts:sent
    },SENDER_KEY),
    independentFixtureSenderKey:SENDER_KEY,
    journalFixtureKey:JOURNAL_KEY,
    expectedSessionId:SESSION,expectedSubscriptionId:SUB,
    expectedOwnerFrozenRunSha256:OWNER,
    entries,observedRuntimeRows:observed
  };
}
type Fixture=ReturnType<typeof makeFixture>;
const audit=(f:Fixture)=>auditSynthetic120MinuteScienceRecoveryV39(f);
function resign(f:Fixture,i:number,frame:
  SyntheticScienceJournalFrameV39):void{
  f.entries[i]={
    ...f.entries[i],
    signed:signSyntheticScienceRecoveryFrameV39(frame,JOURNAL_KEY)
  };
}
describe("P13 signed synthetic TWO-HOUR all-eight-bin source-to-recovery truth audit",()=>{
  it("120 independent synthetic sender attempts, exact 8x15 bins, source wires, physical items and credits agree: TEST ONLY",()=>{
    const r=audit(makeFixture());
    expect(r).toMatchObject({
      testManifestConsistent:true,
      mandatoryScientificCensorForUnprovenLiveSource:true,
      sourceAttempts:120,journalAttempts:120,
      observedItems:120,confirmedObservationRows:120,
      uniquePhysicalOperatorFlights:120,
      sourceBuckets:[15,15,15,15,15,15,15,15],
      sourceSyntheticCredits:120,journalSyntheticCredits:120,
      errors:[],paidLaunchAuthorized:false,
      scientificPassAuthorized:false,automaticRecoveryAuthorized:false
    });
  });
  it("exact sender attempt 119 of 120 is NOT rescued by 120 signed journal and 120 SQL items",()=>{
    const f=makeFixture();
    f.signedSyntheticSender=signSyntheticSenderFrameV39({
      ...f.signedSyntheticSender.frame,
      attempts:f.signedSyntheticSender.frame.attempts.slice(0,119)
    },SENDER_KEY);
    const r=audit(f);
    expect(r.testManifestConsistent).toBe(false);
    expect(r.errors).toEqual(expect.arrayContaining([
      "P13_FROZEN_120_ATTEMPT_TEST_PLAN_INCOMPLETE",
      "P13_JOURNAL_ATTEMPT_NOT_IN_SENDER_LEDGER",
      "P13_SENDER_JOURNAL_ATTEMPT_CARDINALITY_MISMATCH",
      "P13_ORIGINAL_EIGHT_15MIN_SOURCE_BUCKETS_INCOMPLETE"
    ]));
  });
  it("one missing durable journal receipt yields a signed-sender gap and incomplete source bucket",()=>{
    const f=makeFixture();f.entries.splice(46,1);
    const r=audit(f);
    expect(r).toMatchObject({testManifestConsistent:false,journalAttempts:119});
    expect(r.errors).toEqual(expect.arrayContaining([
      "P13_SIGNED_SENDER_ATTEMPT_MISSING_FROM_SCIENCE_JOURNAL",
      "P13_ORIGINAL_EIGHT_15MIN_SOURCE_BUCKETS_INCOMPLETE"
    ]));
  });
  it("a duplicated attempt cannot take the place of a missing attempt",()=>{
    const f=makeFixture();f.entries[46]=f.entries[45];
    expect(audit(f).errors).toContain("P13_DUPLICATE_OR_MISSING_SCIENTIFIC_JOURNAL_ATTEMPT");
  });
  it("one missing SQL flight item after UNLOGGED reset still forbids consistency even when all signed source receipts survive",()=>{
    const f=makeFixture();f.observedRuntimeRows.splice(77,1);
    const r=audit(f);
    expect(r).toMatchObject({
      testManifestConsistent:false,sourceAttempts:120,
      journalAttempts:120,observedItems:119
    });
    expect(r.errors).toContain("P13_ITEM_MISSING_PHYSICAL_ITEM_AFTER_CRASH");
  });
  it("a process-generated replay UTC instead of original independent edge UTC is a hard scientific difference",()=>{
    const f=makeFixture();
    f.observedRuntimeRows[20]={
      ...f.observedRuntimeRows[20],
      originalEdgeReceivedUtc:at(75)
    };
    const r=audit(f);
    expect(r.errors).toContain("P13_ITEM_ORIGINAL_FLIGHT_ITEM_UTC_SHIFTED");
    expect(r.scientificPassAuthorized).toBe(false);
  });
  it("a signed but shifted original source timestamp destroys original 8x15 bucket evidence",()=>{
    const f=makeFixture();
    const e=f.entries[14].signed.frame;
    resign(f,14,{
      ...e,firstEdgeReceivedUtc:at(15),
      items:e.items.map(x=>({...x,originalEdgeReceivedUtc:at(15)}))
    });
    const r=audit(f);
    expect(r.errors).toContain("P13_ORIGINAL_EIGHT_15MIN_SOURCE_BUCKETS_INCOMPLETE");
    expect(r.sourceBuckets.slice(0,2)).toEqual([14,16]);
  });
  it("a genuine source wire SHA cannot be replaced by a merely valid journal HMAC",()=>{
    const f=makeFixture();
    f.entries[2]={...f.entries[2],
      originalWire:new TextEncoder().encode("modified-original-wire")};
    const r=audit(f);
    expect(r.errors).toContain("P13_JOURNAL_SIGNATURE_OR_ORIGINAL_ITEM_WIRE_UNVERIFIED");
    expect(r.scientificPassAuthorized).toBe(false);
  });
  it("a signed invented flight SHA is rejected even if every sender attempt is present",()=>{
    const f=makeFixture(),frame=f.entries[90].signed.frame;
    resign(f,90,{
      ...frame,items:frame.items.map(x=>({...x,rawItemSha256:"0".repeat(64)}))
    });
    expect(audit(f).errors)
      .toContain("P13_JOURNAL_SIGNATURE_OR_ORIGINAL_ITEM_WIRE_UNVERIFIED");
  });
  it("a signed journal with the wrong frozen owner is not counted as recovery evidence",()=>{
    const f=makeFixture(),frame=f.entries[40].signed.frame;
    resign(f,40,{...frame,ownerFrozenRunSha256:"b".repeat(64)});
    expect(audit(f).errors).toContain("P13_JOURNAL_SIGNATURE_OR_ORIGINAL_ITEM_WIRE_UNVERIFIED");
  });
  it("a valid, signed journal item with reused physical-v2 ID for a DIFFERENT flight is scientifically ambiguous",()=>{
    const f=makeFixture(),old=f.entries[10].signed.frame;
    const duplicated="synthetic-phys-9";
    resign(f,10,{
      ...old,items:old.items.map(x=>({...x,flightInstanceId:duplicated}))
    });
    f.observedRuntimeRows[10]={
      ...f.observedRuntimeRows[10],flightInstanceId:duplicated
    };
    expect(audit(f).errors).toContain("P13_ITEM_PHYSICAL_ID_REUSED_FOR_INCOMPATIBLE_SERVICE");
  });
  it("a mismatched signed sender billing credit must never be hidden by matching 120 item count",()=>{
    const f=makeFixture();
    const a=f.signedSyntheticSender.frame.attempts.map((x,i)=>
      i===83?{...x,syntheticCostCredits:0}:x
    );
    f.signedSyntheticSender=signSyntheticSenderFrameV39({
      ...f.signedSyntheticSender.frame,attempts:a
    },SENDER_KEY);
    const r=audit(f);
    expect(r.errors).toEqual(expect.arrayContaining([
      "P13_SENDER_VS_SCIENCE_COST_GAP",
      "P13_SENDER_JOURNAL_TOTAL_CREDIT_GAP"
    ]));
  });
  it("invalid synthetic sender HMAC cannot be dismissed as merely missing an item",()=>{
    const f=makeFixture();f.signedSyntheticSender={
      ...f.signedSyntheticSender,signature:"0".repeat(64)
    };
    expect(()=>audit(f)).toThrow("INDEPENDENT_SENDER_SIGNATURE_INVALID");
  });
  it("source response 503 or >10s is separately recorded as upstream ACK failure",()=>{
    for(const field of [
      {senderResponseStatus:503},
      {senderResponseElapsedMs:10_001}
    ]){
      const f=makeFixture();
      const attempts=f.signedSyntheticSender.frame.attempts.map((a,i)=>
        i===40?{...a,...field}:a
      );
      f.signedSyntheticSender=signSyntheticSenderFrameV39({
        ...f.signedSyntheticSender.frame,attempts
      },SENDER_KEY);
      expect(audit(f).errors).toContain("P13_ORIGINAL_SENDER_ACK_NOT_TIMELY");
    }
  });
  it("even zero errors in synthetic audit never authorizes a real paid YSSY run",()=>{
    const r=audit(makeFixture());
    expect(r.testManifestConsistent).toBe(true);
    expect(r.mandatoryScientificCensorForUnprovenLiveSource).toBe(true);
    expect(r.paidLaunchAuthorized).toBe(false);
    expect(r.scientificPassAuthorized).toBe(false);
    expect(r.automaticRecoveryAuthorized).toBe(false);
  });
});