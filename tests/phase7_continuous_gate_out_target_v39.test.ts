import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import type {Phase7DerivedReleasePacket} from "../server/lib/disruption/phase6DerivedTrainingReleasePacket_v39";
import {
  buildPhase7ContinuousGateOutTargetV39,
  hashPhase7ContinuousGateOutTargetPacketV39,
  validatePhase7ContinuousGateOutTargetProfileV39,
  PHASE7_CONTINUOUS_GATEOUT_BOUNDARY_V39,
  type Phase7ContinuousGateOutObservationInputV39,
  type Phase7ContinuousGateOutTargetProfileV39,
} from "../server/lib/disruption/phase7ContinuousGateOutTarget_v39";

const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
const id1="11111111-1111-4111-8111-111111111111";
const id2="22222222-2222-4222-8222-222222222222";

const packet=():Phase7DerivedReleasePacket=>({
  schema:"v39.phase6.phase7-derived-release-packet.v1",
  packetId:"33333333-3333-4333-8333-333333333333",
  contractVersion:"v01",
  featureDictionarySha256:sha("dictionary"),
  rows:[
    {releaseRowId:id1,horizon:"T-6h",cohortBucket:1,split:"train",featureBuckets:{x:1},labelBuckets:{y:1},missingness:{x:false,y:false},qualityFlags:0,censoring:"observed"},
    {releaseRowId:id2,horizon:"T-6h",cohortBucket:2,split:"validation",featureBuckets:{x:0},labelBuckets:{y:null},missingness:{x:false,y:true},qualityFlags:16,censoring:"censored"},
  ],
});

const profile=():Phase7ContinuousGateOutTargetProfileV39=>({
  schema:"v39.phase7.continuous-gate-out-target-profile.v1",
  version:"amendment_e_v1",
  termsReviewSha256:sha("terms"),
  boundedSourceUseReviewSha256:sha("bounded-source"),
  fieldInventoryReviewSha256:sha("field-inventory"),
  derivedWorkReviewSha256:sha("derived-work"),
  transformReviewSha256:sha("transform"),
  primaryHorizon:"T-6h",
  unit:"minutes",
  mappingExpiryHours:24,
  minValue:-360,
  maxValue:2880,
  approvedForUse:true,
  requiresSeparateObservations:true,
  temporaryMappingMustExpire:true,
  sourceIdentityOutput:false,
  sourceTimestampOutput:false,
  sourceRecordOutput:false,
  providerValueOutput:false,
});

const observed=():Phase7ContinuousGateOutObservationInputV39=>({
  releaseRowId:id1,
  scheduledGateOutUtc:"2026-11-22T10:00:00.000Z",
  actualGateOutUtc:"2026-11-22T10:37:15.000Z",
  scheduleObservedAtUtc:"2026-11-22T04:00:00.000Z",
  actualObservedAtUtc:"2026-11-22T10:38:00.000Z",
  scheduleObservationEvidenceSha256:sha("schedule-observation"),
  actualObservationEvidenceSha256:sha("actual-observation"),
  sourceObservationCount:2,
  mappingCreatedAtUtc:"2026-11-22T10:38:00.000Z",
  mappingExpiresAtUtc:"2026-11-23T10:38:00.000Z",
  derivedAtUtc:"2026-11-22T10:39:00.000Z",
  censoring:"observed",
});

const censored=():Phase7ContinuousGateOutObservationInputV39=>({
  releaseRowId:id2,
  scheduledGateOutUtc:"2026-11-22T11:00:00.000Z",
  actualGateOutUtc:null,
  scheduleObservedAtUtc:"2026-11-22T05:00:00.000Z",
  actualObservedAtUtc:null,
  scheduleObservationEvidenceSha256:sha("schedule-observation-2"),
  actualObservationEvidenceSha256:null,
  sourceObservationCount:1,
  mappingCreatedAtUtc:"2026-11-22T12:00:00.000Z",
  mappingExpiresAtUtc:"2026-11-23T12:00:00.000Z",
  derivedAtUtc:"2026-11-22T12:01:00.000Z",
  censoring:"censored",
});

describe("Phase 7 Amendment E continuous gate-out target",()=>{
  it("computes the continuous signed T-6 target from two distinct observations without source fields in the long-lived packet",()=>{
    expect(validatePhase7ContinuousGateOutTargetProfileV39(profile())).toEqual({pass:true,failures:[]});
    const result=buildPhase7ContinuousGateOutTargetV39(
      profile(),packet(),[observed(),censored()],"44444444-4444-4444-8444-444444444444",
    );
    expect(result.packet.rows).toEqual([
      {releaseRowId:id1,value:37.25,censoring:"observed"},
      {releaseRowId:id2,value:null,censoring:"censored"},
    ]);
    const serialized=JSON.stringify(result.packet);
    expect(serialized).not.toContain("2026-11-22T10:00:00.000Z");
    expect(serialized).not.toContain("2026-11-22T10:37:15.000Z");
    expect(serialized).not.toContain(sha("schedule-observation"));
    expect(serialized).not.toContain(sha("actual-observation"));
    expect(serialized).not.toMatch(/scheduledGateOut|actualGateOut|observedAt|provider|flightNumber|airport|registration|icao|iata/i);
    expect(result.ephemeralReceipts[0].deleteNoLaterThanUtc).toBe(observed().mappingExpiresAtUtc);
    expect(result.receipt).toMatchObject({
      rowCount:2,sourceValuesPersisted:false,sourceTimestampsPersisted:false,
      sourceIdentityPersisted:false,sourceRecordsPersisted:false,
      providerCalls:0,databaseWrites:0,authorizationEnabled:false,phase6PaidGo:false,
    });
    expect(hashPhase7ContinuousGateOutTargetPacketV39(result.packet)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects a caller-supplied target instead of recomputing from reviewed observations",()=>{
    const unsafe={...observed(),value:37.25} as unknown as Phase7ContinuousGateOutObservationInputV39;
    expect(()=>buildPhase7ContinuousGateOutTargetV39(profile(),packet(),[unsafe]))
      .toThrow(/input-extra-or-missing-keys/);
  });

  it("requires distinct schedule and actual observations for an observed target",()=>{
    const one={...observed(),actualObservationEvidenceSha256:observed().scheduleObservationEvidenceSha256,sourceObservationCount:1};
    expect(()=>buildPhase7ContinuousGateOutTargetV39(profile(),packet(),[one]))
      .toThrow(/observed-evidence-must-be-distinct|observed-requires-multiple-observations/);
  });

  it("requires the temporary source-to-release mapping to expire within the reviewed window",()=>{
    const tooLong={...observed(),mappingExpiresAtUtc:"2026-11-24T10:38:00.000Z"};
    expect(()=>buildPhase7ContinuousGateOutTargetV39(profile(),packet(),[tooLong]))
      .toThrow(/mapping-expiry-exceeds-profile/);
    const late={...observed(),derivedAtUtc:"2026-11-23T10:38:00.000Z"};
    expect(()=>buildPhase7ContinuousGateOutTargetV39(profile(),packet(),[late]))
      .toThrow(/derived-outside-temporary-mapping-window/);
  });

  it("does not allow actual source values on censored/missing/not-due rows",()=>{
    const unsafe={...censored(),actualGateOutUtc:"2026-11-22T11:30:00.000Z"};
    expect(()=>buildPhase7ContinuousGateOutTargetV39(profile(),packet(),[unsafe]))
      .toThrow(/nonobserved-must-not-carry-actual-source-values/);
  });

  it("binds only to a T-6 Packet-B row with matching censoring",()=>{
    const wrongPacket=packet();
    wrongPacket.rows[0]={...wrongPacket.rows[0],horizon:"T-90m"};
    expect(()=>buildPhase7ContinuousGateOutTargetV39(profile(),wrongPacket,[observed()]))
      .toThrow(/release-row-not-t6/);
    expect(()=>buildPhase7ContinuousGateOutTargetV39(profile(),packet(),[{...observed(),censoring:"missing"}]))
      .toThrow(/release-row-censoring-mismatch/);
  });

  it("fails closed unless the reviewed profile forbids long-lived source-shaped output",()=>{
    const unsafe={...profile(),sourceTimestampOutput:true as false};
    expect(validatePhase7ContinuousGateOutTargetProfileV39(unsafe).pass).toBe(false);
    expect(PHASE7_CONTINUOUS_GATEOUT_BOUNDARY_V39).toEqual({
      packetAChanged:false,packetBOnly:true,sourceRetentionExtension:false,
      temporaryMappingMustExpire:true,providerCalls:0,databaseWrites:0,
      authorizationEnabled:false,phase6PaidGo:false,
    });
  });
});
