/**
 * Phase 7 review-gated source-to-derived transformation boundary.
 *
 * This module is a pure adapter contract. It does not read provider rows,
 * persist source values, call a provider, change retention, or enable paid GO.
 * A concrete profile must carry independently reviewed hashes and an explicit
 * approval marker before any source decision can become a bucketed value.
 */
import type {Phase7ApprovedDerivedInput} from './phase7DerivedReleaseWriter_v39';
import {
  type Phase7DerivedReleaseContract,
  type Phase7ReleaseCensoring,
  type Phase7ReleaseHorizon,
  type Phase7ReleaseSplit,
  validatePhase7DerivedReleaseContract,
} from './phase6DerivedTrainingReleaseContract_v39';

const SHA256 = /^[a-f0-9]{64}$/i;
const SAFE_OUTPUT = /^[a-z][a-z0-9_]{2,80}$/;
const FORBIDDEN_OUTPUT = /(flight|carrier|callsign|tail|registration|airport|icao|iata|route|provider|adb|raw|payload|response|query|hash|timestamp|time|date|schedule|identity|origin|destination|latitude|longitude|coordinate|serial|record|instance)/i;
const SOURCE_FIELD = /^[a-zA-Z][a-zA-Z0-9_.-]{0,160}$/;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export type Phase7ReviewedTransformationKind =
  | 'numeric_threshold_bucket'
  | 'boolean_bucket'
  | 'categorical_dictionary';

export type Phase7ReviewedTransformationRole = 'feature' | 'label';
export type Phase7ReviewedRightsDisposition =
  | 'EXTERNALLY_REVIEWED_ALLOW'
  | 'HOLD_UNVERIFIED';

export interface Phase7ReviewedTransformationField {
  sourceField: string;
  outputField: string;
  role: Phase7ReviewedTransformationRole;
  kind: Phase7ReviewedTransformationKind;
  bucketCount: number;
  boundaries: readonly number[] | null;
  categories: readonly string[] | null;
  transformEvidenceSha256: string;
  nonReconstructable: true;
}

export interface Phase7ReviewedTransformationProfile {
  schema: 'v39.phase7.reviewed-source-transformation.v1';
  version: string;
  featureDictionarySha256: string;
  termsReviewSha256: string;
  derivedWorkReviewSha256: string;
  mappingExpiryHours: number;
  approvedForUse: true;
  fields: readonly Phase7ReviewedTransformationField[];
}

export interface Phase7SourceDecision {
  sourceField: string;
  value: unknown;
  availableAtUtc: string | null;
  missingReason: string | null;
  rightsDisposition: Phase7ReviewedRightsDisposition;
}

export interface Phase7TransformationContext {
  horizon: Phase7ReleaseHorizon;
  cohortBucket: number;
  split: Phase7ReleaseSplit;
  censoring: Phase7ReleaseCensoring;
}

export interface Phase7TransformationVerdict {
  pass: boolean;
  failures: string[];
}

export interface Phase7ApprovedTransformationResult {
  input: Phase7ApprovedDerivedInput;
  sourceDecisionsConsumed: number;
  sourceValuesPersisted: false;
  providerCalls: 0;
  databaseWrites: 0;
  authorizationEnabled: false;
  phase6PaidGo: false;
}

const PROFILE_KEYS = [
  'schema', 'version', 'featureDictionarySha256', 'termsReviewSha256',
  'derivedWorkReviewSha256', 'mappingExpiryHours', 'approvedForUse', 'fields',
] as const;
const FIELD_KEYS = [
  'sourceField', 'outputField', 'role', 'kind', 'bucketCount', 'boundaries',
  'categories', 'transformEvidenceSha256', 'nonReconstructable',
] as const;
const DECISION_KEYS = [
  'sourceField', 'value', 'availableAtUtc', 'missingReason', 'rightsDisposition',
] as const;
const CONTEXT_KEYS = ['horizon', 'cohortBucket', 'split', 'censoring'] as const;
const SOURCE_RIGHTS_ALLOW = 'EXTERNALLY_REVIEWED_ALLOW' as const;
const QUALITY_MISSING = 1;
const QUALITY_UNAPPROVED = 2;
const QUALITY_INVALID_VALUE = 4;
const QUALITY_NO_AS_OF_TIME = 8;
const QUALITY_CENSORED_LABEL = 16;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function isSha(value: unknown): value is string {
  return typeof value === 'string' && SHA256.test(value) && !/^([a-f0-9])\1{63}$/i.test(value);
}

function isUtc(value: unknown): value is string {
  return typeof value === 'string' && UTC.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

function fail(verdict: Phase7TransformationVerdict): Phase7TransformationVerdict {
  return {pass: verdict.failures.length === 0, failures: [...new Set(verdict.failures)].sort()};
}

function requireValid(verdict: Phase7TransformationVerdict, prefix: string): void {
  if (!verdict.pass) throw new Error(prefix + ':' + verdict.failures.join(','));
}

/** Structural validation never grants source rights or paid collection. */
export function validatePhase7ReviewedTransformationProfile(
  profile: unknown,
): Phase7TransformationVerdict {
  const failures: string[] = [];
  if (!isPlainRecord(profile)) return {pass: false, failures: ['profile-not-object']};
  if (!hasExactKeys(profile, PROFILE_KEYS)) failures.push('profile-extra-or-missing-keys');
  if (profile.schema !== 'v39.phase7.reviewed-source-transformation.v1') failures.push('schema-invalid');
  if (typeof profile.version !== 'string' || !/^[a-z][a-z0-9_.-]{2,80}$/.test(profile.version)) failures.push('version-invalid');
  for (const key of ['featureDictionarySha256', 'termsReviewSha256', 'derivedWorkReviewSha256'] as const) {
    if (!isSha(profile[key])) failures.push(key + '-invalid');
  }
  if (!Number.isInteger(profile.mappingExpiryHours) || profile.mappingExpiryHours < 1 || profile.mappingExpiryHours > 24) {
    failures.push('mapping-expiry-invalid');
  }
  if (profile.approvedForUse !== true) failures.push('independent-approval-required');
  if (!Array.isArray(profile.fields) || profile.fields.length < 1 || profile.fields.length > 31) {
    failures.push('fields-count-invalid');
    return fail({pass: false, failures});
  }

  const sourceNames = new Set<string>();
  const outputNames = new Set<string>();
  let featureCount = 0;
  let labelCount = 0;
  for (const raw of profile.fields) {
    if (!isPlainRecord(raw)) {
      failures.push('field-not-object');
      continue;
    }
    if (!hasExactKeys(raw, FIELD_KEYS)) failures.push('field-extra-or-missing-keys');
    const field = raw as Partial<Phase7ReviewedTransformationField>;
    if (typeof field.sourceField !== 'string' || !SOURCE_FIELD.test(field.sourceField)) failures.push('source-field-invalid');
    if (typeof field.outputField !== 'string' || !SAFE_OUTPUT.test(field.outputField) || FORBIDDEN_OUTPUT.test(field.outputField)) {
      failures.push('output-field-forbidden');
    }
    if (typeof field.sourceField === 'string') {
      if (sourceNames.has(field.sourceField)) failures.push('source-field-duplicate:' + field.sourceField);
      sourceNames.add(field.sourceField);
    }
    if (typeof field.outputField === 'string') {
      if (outputNames.has(field.outputField)) failures.push('output-field-duplicate:' + field.outputField);
      outputNames.add(field.outputField);
    }
    if (field.role !== 'feature' && field.role !== 'label') failures.push('field-role-invalid');
    if (field.role === 'feature') featureCount++;
    if (field.role === 'label') labelCount++;
    if (field.kind !== 'numeric_threshold_bucket' && field.kind !== 'boolean_bucket' && field.kind !== 'categorical_dictionary') {
      failures.push('field-kind-invalid');
    }
    if (typeof field.bucketCount !== 'number' || !Number.isInteger(field.bucketCount) || field.bucketCount < 2 || field.bucketCount > 4096) {
      failures.push('field-bucket-count-invalid');
    }
    if (!isSha(field.transformEvidenceSha256)) failures.push('field-transform-evidence-invalid');
    if (field.nonReconstructable !== true) failures.push('field-reconstruction-review-required');

    if (field.kind === 'numeric_threshold_bucket') {
      if (!Array.isArray(field.boundaries) || field.boundaries.length !== (field.bucketCount as number) - 1 ||
          field.boundaries.some(value => typeof value !== 'number' || !Number.isFinite(value)) ||
          field.boundaries.some((value, index, values) => index > 0 && value <= values[index - 1])) {
        failures.push('numeric-boundaries-invalid:' + String(field.outputField));
      }
      if (field.categories !== null) failures.push('numeric-categories-must-be-null:' + String(field.outputField));
    } else if (field.kind === 'boolean_bucket') {
      if (field.bucketCount !== 2 || field.boundaries !== null ||
          !Array.isArray(field.categories) || field.categories.length !== 2 ||
          field.categories[0] !== 'false' || field.categories[1] !== 'true') {
        failures.push('boolean-definition-invalid:' + String(field.outputField));
      }
    } else if (field.kind === 'categorical_dictionary') {
      if (field.boundaries !== null || !Array.isArray(field.categories) ||
          field.categories.length !== field.bucketCount ||
          field.categories.some(value => typeof value !== 'string' || value.length === 0) ||
          new Set(field.categories).size !== field.categories.length) {
        failures.push('categorical-definition-invalid:' + String(field.outputField));
      }
    }
  }
  if (featureCount < 1) failures.push('feature-fields-required');
  if (labelCount < 1) failures.push('label-fields-required');
  return fail({pass: false, failures});
}

function validateDecisions(decisions: readonly Phase7SourceDecision[]): Phase7TransformationVerdict {
  const failures: string[] = [];
  if (!Array.isArray(decisions)) return {pass: false, failures: ['decisions-not-array']};
  const seen = new Set<string>();
  for (const raw of decisions) {
    if (!isPlainRecord(raw) || !hasExactKeys(raw, DECISION_KEYS)) {
      failures.push('decision-extra-or-missing-keys');
      continue;
    }
    const decision = raw as Phase7SourceDecision;
    if (!SOURCE_FIELD.test(decision.sourceField)) failures.push('decision-source-field-invalid');
    if (seen.has(decision.sourceField)) failures.push('decision-source-field-duplicate:' + decision.sourceField);
    seen.add(decision.sourceField);
    if (decision.availableAtUtc !== null && !isUtc(decision.availableAtUtc)) failures.push('decision-time-invalid:' + decision.sourceField);
    if (decision.missingReason !== null && (typeof decision.missingReason !== 'string' || decision.missingReason.length > 160)) {
      failures.push('decision-missing-reason-invalid:' + decision.sourceField);
    }
    if (decision.rightsDisposition !== SOURCE_RIGHTS_ALLOW && decision.rightsDisposition !== 'HOLD_UNVERIFIED') {
      failures.push('decision-rights-invalid:' + decision.sourceField);
    }
  }
  return fail({pass: false, failures});
}

function validateContext(context: unknown): Phase7TransformationVerdict {
  const failures: string[] = [];
  if (!isPlainRecord(context) || !hasExactKeys(context, CONTEXT_KEYS)) return {pass: false, failures: ['context-extra-or-missing-keys']};
  if (context.horizon !== 'T-24h' && context.horizon !== 'T-6h' && context.horizon !== 'T-90m') failures.push('context-horizon-invalid');
  if (!Number.isInteger(context.cohortBucket) || context.cohortBucket < 0) failures.push('context-cohort-invalid');
  if (context.split !== 'train' && context.split !== 'validation' && context.split !== 'test') failures.push('context-split-invalid');
  if (context.censoring !== 'observed' && context.censoring !== 'censored' && context.censoring !== 'missing' && context.censoring !== 'not_due') failures.push('context-censoring-invalid');
  return fail({pass: false, failures});
}

function fieldBucket(field: Phase7ReviewedTransformationField, value: unknown): number | null {
  if (field.kind === 'numeric_threshold_bucket') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return (field.boundaries as readonly number[]).reduce((bucket, boundary) => bucket + (value >= boundary ? 1 : 0), 0);
  }
  if (field.kind === 'boolean_bucket') {
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (value === 'true') return 1;
    if (value === 'false') return 0;
    return null;
  }
  if (typeof value !== 'string') return null;
  const index = (field.categories as readonly string[]).indexOf(value);
  return index < 0 ? null : index;
}

function contractFieldNames(contract: Phase7DerivedReleaseContract): {features: string[]; labels: string[]} {
  return {
    features: contract.features.map(field => field.name),
    labels: contract.labels.map(field => field.name),
  };
}

/**
 * Convert reviewed source decisions into the exact input accepted by the
 * fail-closed derived-release writer. No source field, source value, ID, or
 * timestamp is returned.
 */
export function transformPhase7ReviewedSourceDecisions(
  profile: Phase7ReviewedTransformationProfile,
  contract: Phase7DerivedReleaseContract,
  decisions: readonly Phase7SourceDecision[],
  context: Phase7TransformationContext,
): Phase7ApprovedTransformationResult {
  requireValid(validatePhase7ReviewedTransformationProfile(profile), 'PHASE7_TRANSFORM_REJECTED_PROFILE');
  requireValid(validatePhase7DerivedReleaseContract(contract), 'PHASE7_TRANSFORM_REJECTED_CONTRACT');
  requireValid(validateDecisions(decisions), 'PHASE7_TRANSFORM_REJECTED_DECISIONS');
  requireValid(validateContext(context), 'PHASE7_TRANSFORM_REJECTED_CONTEXT');

  if (!contract.allowedHorizons.includes(context.horizon)) throw new Error('PHASE7_TRANSFORM_REJECTED_HORIZON');
  if (context.cohortBucket >= contract.cohortBucketCount) throw new Error('PHASE7_TRANSFORM_REJECTED_COHORT');
  const names = contractFieldNames(contract);
  const profileFields = new Map(profile.fields.map(field => [field.outputField, field]));
  const expectedOutputs = [...names.features, ...names.labels].sort();
  const actualOutputs = [...profileFields.keys()].sort();
  if (expectedOutputs.length !== actualOutputs.length || expectedOutputs.some((name, index) => name !== actualOutputs[index])) {
    throw new Error('PHASE7_TRANSFORM_REJECTED_CONTRACT_FIELD_MISMATCH');
  }
  for (const field of profile.fields) {
    if (field.role === 'feature' && !names.features.includes(field.outputField)) throw new Error('PHASE7_TRANSFORM_REJECTED_FEATURE_FIELD_MISMATCH');
    if (field.role === 'label' && !names.labels.includes(field.outputField)) throw new Error('PHASE7_TRANSFORM_REJECTED_LABEL_FIELD_MISMATCH');
    const contractField = [...contract.features, ...contract.labels].find(candidate => candidate.name === field.outputField);
    if (contractField?.bucketCount !== field.bucketCount) throw new Error('PHASE7_TRANSFORM_REJECTED_BUCKET_COUNT_MISMATCH');
  }

  const bySource = new Map(decisions.map(decision => [decision.sourceField, decision]));
  const featureBuckets: Record<string, number | null> = {};
  const labelBuckets: Record<string, number | null> = {};
  const missingness: Record<string, boolean> = {};
  let qualityFlags = 0;
  for (const field of profile.fields) {
    const decision = bySource.get(field.sourceField);
    let bucket: number | null = null;
    let missing = false;
    if (!decision || decision.rightsDisposition !== SOURCE_RIGHTS_ALLOW) {
      missing = true;
      qualityFlags |= decision ? QUALITY_UNAPPROVED : QUALITY_MISSING;
      if (decision && decision.rightsDisposition !== SOURCE_RIGHTS_ALLOW) qualityFlags |= QUALITY_UNAPPROVED;
    } else if (decision.availableAtUtc === null) {
      missing = true;
      qualityFlags |= QUALITY_NO_AS_OF_TIME;
    } else if (decision.missingReason !== null || decision.value === null || decision.value === undefined) {
      missing = true;
      qualityFlags |= QUALITY_MISSING;
    } else {
      bucket = fieldBucket(field, decision.value);
      if (bucket === null) {
        missing = true;
        qualityFlags |= QUALITY_INVALID_VALUE;
      }
    }
    if (field.role === 'label' && context.censoring !== 'observed') {
      bucket = null;
      missing = true;
      qualityFlags |= QUALITY_CENSORED_LABEL;
    }
    missingness[field.outputField] = missing;
    if (field.role === 'feature') featureBuckets[field.outputField] = bucket;
    else labelBuckets[field.outputField] = bucket;
  }

  const input: Phase7ApprovedDerivedInput = {
    horizon: context.horizon,
    cohortBucket: context.cohortBucket,
    split: context.split,
    featureBuckets,
    labelBuckets,
    missingness,
    qualityFlags,
    censoring: context.censoring,
  };
  return {
    input,
    sourceDecisionsConsumed: decisions.length,
    sourceValuesPersisted: false,
    providerCalls: 0,
    databaseWrites: 0,
    authorizationEnabled: false,
    phase6PaidGo: false,
  };
}
