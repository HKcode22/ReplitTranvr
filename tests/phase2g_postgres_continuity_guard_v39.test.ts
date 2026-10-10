import {describe,expect,it} from "vitest";
import {
  assessSyntheticPostgresContinuityV39,
  type FrozenSyntheticContinuityBaselineV39,
  type SyntheticPostgresContinuitySnapshotV39
} from "../experiments/phase2g_rehearsal/postgres_continuity_guard_v39";

const postmaster="2026-10-12T00:00:00.000Z";
const frozen=():FrozenSyntheticContinuityBaselineV39=>({
  frozenPostmasterStartUtc:postmaster,expectedDeliveryRows:4,expectedItemRows:3,
  independentOwnerSessionBindingVerified:true,
  independentAttemptAccountingVerified:true
});
const observed=():SyntheticPostgresContinuitySnapshotV39=>({
  postmasterStartUtc:postmaster,sessionRows:1,deliveryRows:4,itemRows:3,
  loggedRawBlobRefs:4,linkedDeliveryBlobRefs:4
});
const refusal=(actual:SyntheticPostgresContinuitySnapshotV39,
  baseline:FrozenSyntheticContinuityBaselineV39,reason:string)=>{
  const outcome=assessSyntheticPostgresContinuityV39(actual,baseline);
  expect(outcome).toMatchObject({
    continuityPreflightPassed:false,mandatoryCensor:true,
    scientificRunAuthorized:false,automaticRestoreAllowed:false
  });
  expect(outcome.reasons).toContain(reason);
};

describe("P13 test-only Postgres continuity and fail-closed recovery gate",()=>{
  it("reports preflight candidate only for unchanged, fully matched evidence; never authorizes science",()=>{
    const r=assessSyntheticPostgresContinuityV39(observed(),frozen());
    expect(r).toEqual({
      continuityPreflightPassed:true,mandatoryCensor:false,reasons:[],
      scientificRunAuthorized:false,automaticRestoreAllowed:false
    });
  });
  it("a postmaster restart forbids automatic resume EVEN IF all runtime rows are recreated",()=>{
    const a=observed();a.postmasterStartUtc="2026-10-12T01:02:03.000Z";
    refusal(a,frozen(),"DATABASE_LIFECYCLE_CHANGED_NO_AUTO_RESTORE");
  });
  it("a retained LOGGED blob ledger cannot replace vanished UNLOGGED runtime tables",()=>{
    const a=observed();a.sessionRows=0;a.deliveryRows=0;a.itemRows=0;
    a.linkedDeliveryBlobRefs=0;
    const r=assessSyntheticPostgresContinuityV39(a,frozen());
    expect(r.reasons).toEqual(expect.arrayContaining([
      "UNLOGGED_SESSION_UNAVAILABLE","DELIVERY_LEDGER_INCOMPLETE",
      "PHYSICAL_ITEM_LEDGER_INCOMPLETE"
    ]));
    expect(r.mandatoryCensor).toBe(true);
  });
  it("refuses a lone missing delivery, even when the four raw LOGGED refs survive",()=>{
    const a=observed();a.deliveryRows=3;a.linkedDeliveryBlobRefs=3;
    refusal(a,frozen(),"DELIVERY_LEDGER_INCOMPLETE");
  });
  it("refuses a missing confirmed physical item even when deliveries are complete",()=>{
    const a=observed();a.itemRows=2;
    refusal(a,frozen(),"PHYSICAL_ITEM_LEDGER_INCOMPLETE");
  });
  it("refuses a missing blob even when all UNLOGGED deliveries remain",()=>{
    const a=observed();a.loggedRawBlobRefs=3;a.linkedDeliveryBlobRefs=3;
    const r=assessSyntheticPostgresContinuityV39(a,frozen());
    expect(r.reasons).toEqual(expect.arrayContaining([
      "RAW_BLOB_METADATA_COUNT_MISMATCH","RAW_BLOB_LINKAGE_INCOMPLETE"
    ]));
    expect(r.mandatoryCensor).toBe(true);
  });
  it("refuses unmatched logged references even when total counts align",()=>{
    const a=observed();a.linkedDeliveryBlobRefs=3;
    refusal(a,frozen(),"RAW_BLOB_LINKAGE_INCOMPLETE");
  });
  it("refuses missing independently frozen owner/session or billable attempt proof",()=>{
    const b=frozen();b.independentOwnerSessionBindingVerified=false;
    refusal(observed(),b,"OWNER_SESSION_BINDING_UNVERIFIED");
    const c=frozen();c.independentAttemptAccountingVerified=false;
    refusal(observed(),c,"ATTEMPT_ACCOUNTING_UNVERIFIED");
  });
  it("does not call a zero-evidence or malformed-baseline session continuable",()=>{
    const b=frozen();b.expectedDeliveryRows=0;
    refusal(observed(),b,"DELIVERY_LEDGER_INCOMPLETE");
    const c=frozen();c.frozenPostmasterStartUtc="unknown";
    refusal(observed(),c,"DATABASE_LIFECYCLE_UNVERIFIABLE");
  });
});
