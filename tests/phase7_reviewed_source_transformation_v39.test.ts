import {preparePhase7BoundPrePreservation,type Phase7BoundPrePreservationRequest} from "../server/lib/disruption/phase7BoundPrePreservation_v39";
import {P5_E_ALLOWED_PRE_FEATURES} from "../server/lib/disruption/phase5AmendmentEAsOfFeatureSelectionOffline_v39";
import {selectP5EStage14BoundRouteFeatures} from "../server/lib/disruption/phase5AmendmentEStage14BoundRouteFeatures_v39";
import {createHash} from 'node:crypto';
import {describe, expect, it} from 'vitest';
import {
  transformPhase7ReviewedSourceDecisions,
  validatePhase7ReviewedTransformationProfile,
  type Phase7ReviewedTransformationProfile,
  type Phase7SourceDecision,
} from '../server/lib/disruption/phase7ReviewedSourceTransformation_v39';
import type {Phase7DerivedReleaseContract} from '../server/lib/disruption/phase6DerivedTrainingReleaseContract_v39';
import {buildPhase7DerivedReleasePacket} from '../server/lib/disruption/phase7DerivedReleaseWriter_v39';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');

const contract = (): Phase7DerivedReleaseContract => ({
  schema: 'v39.phase6.phase7-derived-release-contract.v2',
  version: 'v01',
  featureDictionarySha256: sha('dictionary'),
  termsReviewSha256: sha('terms'),
  derivedWorkReviewSha256: sha('derived'),
  sourceToReleaseMappingExpiryHours: 24,
  researchExpiryUtc: '2027-12-31T00:00:00.000Z',
  cohortBucketCount: 4,
  features: [{
    name: 'congestion_bin',
    bucketCount: 3,
    fieldClass: 'approved_derived',
    transformEvidenceSha256: sha('feature'),
    nonReconstructable: true,
  }],
  labels: [{
    name: 'delay_bin',
    bucketCount: 4,
    fieldClass: 'approved_derived',
    transformEvidenceSha256: sha('label'),
    nonReconstructable: true,
  }],
  allowedHorizons: ['T-24h', 'T-6h', 'T-90m'],
});

const profile = (): Phase7ReviewedTransformationProfile => ({
  schema: 'v39.phase7.reviewed-source-transformation.v1',
  version: 'v01',
  featureDictionarySha256: sha('dictionary'),
  termsReviewSha256: sha('terms'),
  derivedWorkReviewSha256: sha('derived'),
  mappingExpiryHours: 24,
  approvedForUse: true,
  fields: [
    {
      sourceField: 'airport_congestion_1h',
      outputField: 'congestion_bin',
      role: 'feature',
      kind: 'numeric_threshold_bucket',
      bucketCount: 3,
      boundaries: [1, 4],
      categories: null,
      transformEvidenceSha256: sha('feature'),
      nonReconstructable: true,
    },
    {
      sourceField: 'gate_out_delay_minutes',
      outputField: 'delay_bin',
      role: 'label',
      kind: 'numeric_threshold_bucket',
      bucketCount: 4,
      boundaries: [0, 15, 60],
      categories: null,
      transformEvidenceSha256: sha('label'),
      nonReconstructable: true,
    },
  ],
});

const decisions = (rightsDisposition: Phase7SourceDecision['rightsDisposition'] = 'EXTERNALLY_REVIEWED_ALLOW'): Phase7SourceDecision[] => [
  {
    sourceField: 'airport_congestion_1h',
    value: 3.5,
    availableAtUtc: '2026-11-19T00:00:00.000Z',
    missingReason: null,
    rightsDisposition,
  },
  {
    sourceField: 'gate_out_delay_minutes',
    value: 42,
    availableAtUtc: '2026-11-19T00:00:00.000Z',
    missingReason: null,
    rightsDisposition,
  },
];

const context = {
  horizon: 'T-6h' as const,
  cohortBucket: 1,
  split: 'train' as const,
  censoring: 'observed' as const,
  issuedAtUtc: '2026-11-19T00:30:00.000Z',
  releasedAtUtc: '2026-11-19T12:00:00.000Z',
};

describe('Phase 7 reviewed source transformation boundary', () => {
  it('maps reviewed source decisions to exact approved buckets only', () => {
    const result = transformPhase7ReviewedSourceDecisions(profile(), contract(), decisions(), context);
    expect(result.input).toMatchObject({
      horizon: 'T-6h',
      cohortBucket: 1,
      split: 'train',
      featureBuckets: {congestion_bin: 1},
      labelBuckets: {delay_bin: 2},
      missingness: {congestion_bin: false, delay_bin: false},
      censoring: 'observed',
    });
    expect(result.sourceValuesPersisted).toBe(false);
    expect(result.providerCalls).toBe(0);
    expect(result.databaseWrites).toBe(0);
    expect(result.authorizationEnabled).toBe(false);
    expect(result.phase6PaidGo).toBe(false);

    const packet = buildPhase7DerivedReleasePacket(contract(), [result.input]);
    const serialized = JSON.stringify(packet);
    expect(serialized).not.toContain('airport_congestion_1h');
    expect(serialized).not.toContain('gate_out_delay_minutes');
    expect(serialized).not.toMatch(/sourceField|sourceId|availableAtUtc|rawValue|flightNumber/i);
  });

  it('turns held source decisions into null values with an unapproved-quality bit', () => {
    const result = transformPhase7ReviewedSourceDecisions(
      profile(), contract(), decisions('HOLD_UNVERIFIED'), context,
    );
    expect(result.input.featureBuckets).toEqual({congestion_bin: null});
    expect(result.input.labelBuckets).toEqual({delay_bin: null});
    expect(result.input.missingness).toEqual({congestion_bin: true, delay_bin: true});
    expect(result.input.qualityFlags & 2).toBe(2);
  });

  it('censors labels without inventing negatives', () => {
    const result = transformPhase7ReviewedSourceDecisions(
      profile(), contract(), decisions(), {...context, censoring: 'censored'},
    );
    expect(result.input.featureBuckets).toEqual({congestion_bin: 1});
    expect(result.input.labelBuckets).toEqual({delay_bin: null});
    expect(result.input.missingness).toEqual({congestion_bin: false, delay_bin: true});
    expect(result.input.qualityFlags & 16).toBe(16);
  });

  it('rejects an unapproved profile and source-shaped output field', () => {
    const unapproved = {...profile(), approvedForUse: false as const};
    expect(validatePhase7ReviewedTransformationProfile(unapproved).pass).toBe(false);
    expect(() => transformPhase7ReviewedSourceDecisions(
      unapproved as unknown as Phase7ReviewedTransformationProfile, contract(), decisions(), context,
    )).toThrow('PHASE7_TRANSFORM_REJECTED_PROFILE');

    const unsafe = {
      ...profile(),
      fields: [{...profile().fields[0], outputField: 'airport_code'}, profile().fields[1]],
    };
    expect(validatePhase7ReviewedTransformationProfile(unsafe).pass).toBe(false);
  });

  it('never admits future PRE features or POST labels unavailable at release', () => {
    const input = decisions();
    input[0] = {...input[0], availableAtUtc: '2026-11-19T00:30:00.001Z'};
    input[1] = {...input[1], availableAtUtc: '2026-11-19T12:00:00.001Z'};
    const result = transformPhase7ReviewedSourceDecisions(profile(), contract(), input, context);
    expect(result.input.featureBuckets).toEqual({congestion_bin: null});
    expect(result.input.labelBuckets).toEqual({delay_bin: null});
    expect(result.input.qualityFlags & 32).toBe(32);
    input[0] = {...input[0], availableAtUtc: context.issuedAtUtc};
    input[1] = {...input[1], availableAtUtc: context.releasedAtUtc};
    const exact = transformPhase7ReviewedSourceDecisions(profile(), contract(), input, context);
    expect(exact.input.featureBuckets).toEqual({congestion_bin: 1});
    expect(exact.input.labelBuckets).toEqual({delay_bin: 2});
  });

  it('rejects reversed clocks and mismatched review hashes or retention windows', () => {
    expect(() => transformPhase7ReviewedSourceDecisions(profile(), contract(), decisions(), {...context, releasedAtUtc: '2026-11-18T12:00:00.000Z'})).toThrow(/context-clock-invalid/);
    for (const changed of [
      {...profile(), termsReviewSha256: sha('different terms')},
      {...profile(), featureDictionarySha256: sha('different dictionary')},
      {...profile(), derivedWorkReviewSha256: sha('different derived review')},
      {...profile(), mappingExpiryHours: 12},
    ]) expect(() => transformPhase7ReviewedSourceDecisions(changed, contract(), decisions(), context)).toThrow(/REVIEW_BINDING_MISMATCH/);
    const p = profile();
    const changed = {...p, fields: [{...p.fields[0], transformEvidenceSha256: sha('different field review')}, p.fields[1]]};
    expect(() => transformPhase7ReviewedSourceDecisions(changed, contract(), decisions(), context)).toThrow(/FIELD_REVIEW_BINDING_MISMATCH/);
  });

  it('rejects extra source decision keys before transformation', () => {
    const unsafe = decisions(); unsafe[0] = {...unsafe[0], flightNumber: 'SQ001'} as unknown as Phase7SourceDecision;
    expect(() => transformPhase7ReviewedSourceDecisions(
      profile(), contract(), unsafe as unknown as Phase7SourceDecision[], context,
    )).toThrow('PHASE7_TRANSFORM_REJECTED_DECISIONS');
  });
});

describe("handoff from actual Stage14 source selectors before original expiry",()=>{
 const fixture=():Phase7BoundPrePreservationRequest=>{
  const issuedAtUtc="2026-11-21T05:59:00.000Z",selectedNativeTUtc="2026-11-22T06:00:00.000Z",cutoffUtc="2026-11-21T06:00:00.000Z",sourceHash=sha("synthetic original"),queryId="bfffffa0-0999-4999-8999-099999999999",flightInstanceId="synthetic-leg";
  const route=selectP5EStage14BoundRouteFeatures({flightInstanceId,horizon:"T-24h",selectedNativeTUtc,cutoffUtc,issuedAtUtc,expectedOriginalResponseSha256:sourceHash,expectedPopulationQueryId:queryId,originalSourceUseIndependentlyReviewedOutsideThisFunction:true,normalizedMember:{analytic_identity_id:flightInstanceId,population_query_id:queryId,response_hash:sourceHash,dep_airport_icao:"KSFO",arr_airport_icao:"KLAX",available_at:"2026-11-21T05:30:00.000Z",fids_retrieval_utc:"2026-11-21T05:29:00.000Z"}});
  return {horizon:"T-24h",selectedNativeTUtc,cutoffUtc,issuedAtUtc,transformedAtUtc:"2026-11-21T05:59:01.000Z",sourceExpiresAtUtc:"2026-11-22T05:30:00.000Z",split:"train",cohortBucket:1,features:[...route.features,{featureName:"airport_congestion_1h",value:3.5,informationAvailableAt:new Date("2026-11-21T05:45:00.000Z"),source:"REVIEWED_HISTORIC_CONTEXT",sourceVersion:sha("history")},{featureName:"operating_carrier",value:null,informationAvailableAt:new Date("2026-11-21T05:30:00.000Z"),source:"AERODATABOX_FIDS",sourceVersion:sourceHash}],dispositions:P5_E_ALLOWED_PRE_FEATURES.map(field=>({field,disposition:field==="airport_congestion_1h"?"REVIEWED_DERIVED_BUCKET":"LONG_TERM_RIGHTS_REQUIRED",outputField:field==="airport_congestion_1h"?"congestion_bin":null,reviewSha256:field==="airport_congestion_1h"?sha("feature"):sha(field)})),separatelyVerifiedFields:[]};
 };
 it("uses real route selector outputs, keeps all 16 field dispositions, never exposes source values or creates labels",()=>{
  const req=fixture(),out=preparePhase7BoundPrePreservation(contract(),profile(),req);
  expect(out.input.featureBuckets).toEqual({congestion_bin:1});
  expect(out.input.labelBuckets).toEqual({delay_bin:null});
  expect(out.input.censoring).toBe("not_due");
  expect(out.audit.fields).toBe(16);
  expect(out.audit.counts.origin_icao).toMatchObject({present:1,lost:1,preserved:0});
  expect(out.audit.counts.destination_icao).toMatchObject({present:1,lost:1,preserved:0});
  expect(out.audit.counts.operating_carrier).toMatchObject({present:0,lost:0,preserved:0});
  expect(out.audit.counts.airport_congestion_1h).toMatchObject({present:1,lost:0,preserved:1});
  expect(JSON.stringify(out)).not.toMatch(/KSFO|KLAX|2026-11-21|synthetic-leg|synthetic original|availableAtUtc/);
  expect(out.durableWriteCompleted).toBe(false);
 });
 it("rejects post-issue source, expired original, missing field review and source family mismatch",()=>{
  const req=fixture(),hist=req.features[2];
  for(const changed of [
   {...req,features:[...req.features.slice(0,2),{...hist,informationAvailableAt:new Date("2026-11-21T05:59:00.001Z")},req.features[3]]},
   {...req,transformedAtUtc:req.sourceExpiresAtUtc},
   {...req,dispositions:req.dispositions.slice(1)},
   {...req,features:[...req.features.slice(0,2),{...hist,source:"AERODATABOX_FIDS"},req.features[3]]},
   {...req,dispositions:req.dispositions.map(d=>d.field==="airport_congestion_1h"?{...d,reviewSha256:sha("different review")}:d)},
  ])expect(()=>preparePhase7BoundPrePreservation(contract(),profile(),changed)).toThrow(/PHASE7_BOUND_PRE_PRESERVATION_REJECTED/);
 });
});

describe("explicit frozen-native clock difference candidate (synthetic review only)",()=>{
 const make=()=>{
  const c=contract(),p=profile(),evidence=sha("synthetic duration review"),revision=sha("synthetic revision review");
  c.features=[...c.features,{name:"duration_bin",bucketCount:3,fieldClass:"approved_derived",transformEvidenceSha256:evidence,nonReconstructable:true},{name:"revision_bin",bucketCount:3,fieldClass:"approved_derived",transformEvidenceSha256:revision,nonReconstructable:true}];
  p.fields=[...p.fields,{sourceField:"scheduled_arrival_utc",outputField:"duration_bin",role:"feature",kind:"frozen_native_t_delta_bucket",bucketCount:3,boundaries:[60,180],categories:null,transformEvidenceSha256:evidence,nonReconstructable:true},{sourceField:"provider_revised_departure_utc",outputField:"revision_bin",role:"feature",kind:"frozen_native_t_delta_bucket",bucketCount:3,boundaries:[0,15],categories:null,transformEvidenceSha256:revision,nonReconstructable:true}];
  const clock={selectedNativeTUtc:"2026-11-19T06:30:00.000Z",cutoffUtc:context.issuedAtUtc};
  const d:Phase7SourceDecision[]=[...decisions(),{sourceField:"scheduled_arrival_utc",value:"2026-11-19T09:00:00.000Z",availableAtUtc:context.issuedAtUtc,missingReason:null,rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW"},{sourceField:"provider_revised_departure_utc",value:"2026-11-19T06:20:00.000Z",availableAtUtc:context.issuedAtUtc,missingReason:null,rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW"}];
  return {c,p,clock,d};
 };
 it("derives only the reviewed buckets from a genuine frozen PRE clock; no exact timestamp or delta emitted",()=>{
  const {c,p,clock,d}=make();
  const out=transformPhase7ReviewedSourceDecisions(p,c,d,context,clock);
  expect(out.input.featureBuckets).toEqual({congestion_bin:1,duration_bin:1,revision_bin:0});
  expect(JSON.stringify(out)).not.toMatch(/2026-11-19|scheduled_arrival_utc|provider_revised_departure_utc/);
  expect(out.phase6PaidGo).toBe(false);
  const v=d.map(x=>x.sourceField==="scheduled_arrival_utc"?{...x,value:"2026-11-19T06:29:00.000Z"}:x);
  expect(transformPhase7ReviewedSourceDecisions(p,c,v,context,clock).input.featureBuckets.duration_bin).toBeNull();
 });
 it("refuses an unbound or retimed anchor and never admits post-issue evidence",()=>{
  const {c,p,clock,d}=make();
  expect(()=>transformPhase7ReviewedSourceDecisions(p,c,d,context)).toThrow("NATIVE_DELTA_ANCHOR_REQUIRED");
  expect(()=>transformPhase7ReviewedSourceDecisions(p,c,d,context,{...clock,selectedNativeTUtc:"2026-11-19T06:31:00.000Z"})).toThrow("NATIVE_DELTA_ANCHOR");
  const late=d.map(x=>x.sourceField==="provider_revised_departure_utc"?{...x,availableAtUtc:"2026-11-19T00:30:00.001Z"}:x);
  expect(transformPhase7ReviewedSourceDecisions(p,c,late,context,clock).input.featureBuckets.revision_bin).toBeNull();
  const invalid={...p,fields:p.fields.map(f=>f.outputField==="duration_bin"?{...f,sourceField:"operating_carrier"}:f)};
  expect(validatePhase7ReviewedTransformationProfile(invalid).failures).toContain("native-delta-source-scope-invalid:duration_bin");
 });
 it("does not require ephemeral PRE time again for POST-only label transform",()=>{
  const {c,p,d}=make();
  const out=transformPhase7ReviewedSourceDecisions(p,c,d.filter(x=>x.sourceField==="gate_out_delay_minutes"),context);
  expect(out.input.featureBuckets).toEqual({congestion_bin:null,duration_bin:null,revision_bin:null});
  expect(out.input.labelBuckets.delay_bin).toBe(2);
 });
});
