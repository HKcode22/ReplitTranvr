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

  it('rejects extra source decision keys before transformation', () => {
    const unsafe = decisions(); unsafe[0] = {...unsafe[0], flightNumber: 'SQ001'};
    expect(() => transformPhase7ReviewedSourceDecisions(
      profile(), contract(), unsafe as unknown as Phase7SourceDecision[], context,
    )).toThrow('PHASE7_TRANSFORM_REJECTED_DECISIONS');
  });
});
