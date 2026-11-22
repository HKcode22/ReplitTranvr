/**
 * Phase 7 review-gated source-to-derived transformation boundary.
 *
 * This module is Packet B only: the Phase 7 long-term derived-release lane.
 * Packet A remains the full Phase 6 operational/source-custody lane and keeps
 * the flight/leg, airport, carrier, route, PRE/POST, and exact-time fields
 * required to build and audit the study. This module must never be used to
 * delete, reject, or redefine Packet A operational fields.
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
  type Phase6ReleaseHorizon,
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
  | 'frozen_native_t_delta_bucket'
  | 'boolean_bucket'
  | 'categorical_dictionary'
  | 'categorical_group_dictionary';

/** Exact public OpenAPI RapidAPI FlightStatus enum, v1.15.4.0.
 * Owner recovered and SHA256-verified 2026-11-21:
 * Enum metadata is not flight Contents,
 * nor a provider grant or scientific approval of any particular grouping. */
export const P7_NATIVE_STATUS_CONTRACT_SHA256 = "63b8daf194858a27ea487308f34839def760aadda2acd9f81c82c466f9de7f09";
export const P7_NATIVE_STATUS_DOMAIN = Object.freeze([
  "Unknown","Expected","EnRoute","CheckIn","Boarding","GateClosed","Departed",
  "Delayed","Approaching","Arrived","Canceled","Diverted","CanceledUncertain"
] as const);

/** Canonical invariant INV-NO-MERGE (server/lib/disruption/canonicalRules.ts,
 * required): "CanceledUncertain not merged with Canceled". A grouped
 * dictionary is a coarsening, so it must not silently erase a frozen canonical
 * distinction. This is a structural guard only; it is not a rights,
 * reconstruction or scientific determination about any admitted grouping. */
export const P7_FORBIDDEN_STATUS_MERGES = Object.freeze([
  Object.freeze(["Canceled","CanceledUncertain"] as const),
] as const);

/** States that must stay distinguishable even when every other token in the
 * domain is coarsened. They may therefore appear as an explicit singleton
 * group. Every other singleton group stays rejected: one value per bucket is a
 * reversible copy of the native status, not a derived work. */
export const P7_CANONICAL_SINGLETON_TOKENS = Object.freeze(["Canceled","CanceledUncertain"] as const);

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
  /** Nested groups are allowed only for the reviewed native status transform.
   * A group is a many-to-one candidate, not proof of rights or joint non-reconstruction. */
  categories: readonly string[] | readonly (readonly string[])[] | null;
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

/** Exact in-memory clock context supplied by the already-bound PRE writer.
 * Only the resulting reviewed bucket may enter the downstream packet. */
export interface Phase7FrozenNativeDeltaAnchor {
  selectedNativeTUtc: string;
  cutoffUtc: string;
}

export interface Phase7TransformationContext {
  horizon: Phase6ReleaseHorizon;
  cohortBucket: number;
  split: Phase7ReleaseSplit;
  censoring: Phase7ReleaseCensoring;
  /** Actual PRE issuance, not a later processing or export time. */
  issuedAtUtc: string;
  /** Time at which the bounded custody transformation is performed. */
  releasedAtUtc: string;
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
const CONTEXT_KEYS = ['horizon', 'cohortBucket', 'split', 'censoring', 'issuedAtUtc', 'releasedAtUtc'] as const;
const SOURCE_RIGHTS_ALLOW = 'EXTERNALLY_REVIEWED_ALLOW' as const;
const QUALITY_MISSING = 1;
const QUALITY_UNAPPROVED = 2;
const QUALITY_INVALID_VALUE = 4;
const QUALITY_NO_AS_OF_TIME = 8;
const QUALITY_CENSORED_LABEL = 16;
const QUALITY_NOT_AVAILABLE_AS_OF = 32;

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
  const profileRecord = profile as unknown as Partial<Phase7ReviewedTransformationProfile>;
  if (!Number.isInteger(profileRecord.mappingExpiryHours) || (profileRecord.mappingExpiryHours as number) < 1 || (profileRecord.mappingExpiryHours as number) > 24) {
    failures.push('mapping-expiry-invalid');
  }
  if (profileRecord.approvedForUse !== true) failures.push('independent-approval-required');
  const fields = profileRecord.fields;
  if (!Array.isArray(fields) || fields.length < 1 || fields.length > 31) {
    failures.push('fields-count-invalid');
    return fail({pass: false, failures});
  }

  const sourceNames = new Set<string>();
  const outputNames = new Set<string>();
  let featureCount = 0;
  let labelCount = 0;
  for (const raw of fields) {
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
    if (field.kind !== 'numeric_threshold_bucket' && field.kind !== 'frozen_native_t_delta_bucket' && field.kind !== 'boolean_bucket' && field.kind !== 'categorical_dictionary' && field.kind !== 'categorical_group_dictionary') {
      failures.push('field-kind-invalid');
    }
    if (typeof field.bucketCount !== 'number' || !Number.isInteger(field.bucketCount) || field.bucketCount < 2 || field.bucketCount > 4096) {
      failures.push('field-bucket-count-invalid');
    }
    if (!isSha(field.transformEvidenceSha256)) failures.push('field-transform-evidence-invalid');
    if (field.nonReconstructable !== true) failures.push('field-reconstruction-review-required');

    if (field.kind === 'frozen_native_t_delta_bucket' && (field.role !== 'feature' || !['scheduled_arrival_utc','provider_revised_departure_utc'].includes(String(field.sourceField)))) {
      failures.push('native-delta-source-scope-invalid:' + String(field.outputField));
    }
    if (field.kind === 'numeric_threshold_bucket' || field.kind === 'frozen_native_t_delta_bucket') {
      if (!Array.isArray(field.boundaries) || field.boundaries.length !== (field.bucketCount as number) - 1 ||
          field.boundaries.some(value => typeof value !== 'number' || !Number.isFinite(value)) ||
          field.boundaries.some((value, index, values) => index > 0 && value <= values[index - 1])) {
        failures.push('numeric-boundaries-invalid:' + String(field.outputField));
      }
      if (field.categories !== null) failures.push('numeric-categories-must-be-null:' + String(field.outputField));
    } else if (field.kind === 'boolean_bucket') {
      // A two-value bucket reproduces the original boolean exactly. The
      // nonReconstructable marker is evidence metadata, not a transformation.
      failures.push('boolean-bucket-reconstructible:' + String(field.outputField));
    } else if (field.kind === 'categorical_group_dictionary') {
      // A distinct integer per original status is an invertible code. For the
      // native FIDS status only, accept a strictly many-to-one, explicit closed
      // dictionary; reject singleton groups and duplicate/mixed inputs, except
      // the canonically protected cancellation states that INV-NO-MERGE forbids
      // merging into any other bucket. A structural pass is NOT a legal or
      // joint-reconstruction determination.
      const groups = field.categories;
      const names = new Set<string>();
      if (field.sourceField !== 'reported_pre_departure_status' || field.role !== 'feature' ||
          field.boundaries !== null || !Array.isArray(groups) || groups.length !== field.bucketCount ||
          groups.length < 2 || groups.length > 32 ||
          !groups.every(group => {
            if (!Array.isArray(group) || group.length > 64) return false;
            if (group.length < 2 &&
                (group.length !== 1 ||
                 !(P7_CANONICAL_SINGLETON_TOKENS as readonly unknown[]).includes(group[0]))) return false;
            return group.every(value => {
              if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(value) || names.has(value)) return false;
              names.add(value); return true;
            });
          }) || names.size !== P7_NATIVE_STATUS_DOMAIN.length ||
          !P7_NATIVE_STATUS_DOMAIN.every(value => names.has(value))) {
        failures.push('categorical-group-definition-invalid:' + String(field.outputField));
      }
      // Structural validity is not enough: a fully covered, many-to-one
      // grouping can still merge the two canonical cancellation states.
      if (Array.isArray(groups) && groups.some(group =>
          Array.isArray(group) &&
          P7_FORBIDDEN_STATUS_MERGES.some(pair => pair.every(name => group.includes(name))))) {
        failures.push('categorical-group-canonical-merge-forbidden:' + String(field.outputField));
      }
    } else if (field.kind === 'categorical_dictionary') {
      // A distinct output for each input category is reversible. Packet B
      // accepts categorical fields only through an explicit many-to-one group.
      failures.push('categorical-dictionary-reconstructible:' + String(field.outputField));
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
    const decision = raw as unknown as Phase7SourceDecision;
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
  const contextRecord = context as unknown as Partial<Phase7TransformationContext>;
  if (contextRecord.horizon !== 'T-24h' && contextRecord.horizon !== 'T-6h' && contextRecord.horizon !== 'T-90m') failures.push('context-horizon-invalid');
  if (!Number.isInteger(contextRecord.cohortBucket) || (contextRecord.cohortBucket as number) < 0) failures.push('context-cohort-invalid');
  if (contextRecord.split !== 'train' && contextRecord.split !== 'validation' && contextRecord.split !== 'test') failures.push('context-split-invalid');
  if (contextRecord.censoring !== 'observed' && contextRecord.censoring !== 'censored' && contextRecord.censoring !== 'missing' && contextRecord.censoring !== 'not_due') failures.push('context-censoring-invalid');
  if (!isUtc(contextRecord.issuedAtUtc) || !isUtc(contextRecord.releasedAtUtc) ||
      Date.parse(contextRecord.issuedAtUtc as string) > Date.parse(contextRecord.releasedAtUtc as string)) failures.push('context-clock-invalid');
  return fail({pass: false, failures});
}

function fieldBucket(field: Phase7ReviewedTransformationField, value: unknown, native?: Phase7FrozenNativeDeltaAnchor): number | null {
  if (field.kind === 'frozen_native_t_delta_bucket') {
    if (!native || !isUtc(value)) return null;
    const minutes=(Date.parse(value)-Date.parse(native.selectedNativeTUtc))/60000;
    if (!Number.isFinite(minutes) || (field.sourceField === 'scheduled_arrival_utc' && minutes<=0)) return null;
    return (field.boundaries as readonly number[]).reduce((bucket,boundary)=>bucket+(minutes>=boundary?1:0),0);
  }
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
  if (field.kind === 'categorical_group_dictionary') {
    const index = (field.categories as readonly (readonly string[])[]).findIndex(group => group.includes(value));
    return index < 0 ? null : index;
  }
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
  native?: Phase7FrozenNativeDeltaAnchor,
): Phase7ApprovedTransformationResult {
  requireValid(validatePhase7ReviewedTransformationProfile(profile), 'PHASE7_TRANSFORM_REJECTED_PROFILE');
  requireValid(validatePhase7DerivedReleaseContract(contract), 'PHASE7_TRANSFORM_REJECTED_CONTRACT');
  requireValid(validateDecisions(decisions), 'PHASE7_TRANSFORM_REJECTED_DECISIONS');
  requireValid(validateContext(context), 'PHASE7_TRANSFORM_REJECTED_CONTEXT');
  if (native !== undefined) {
    const offset = {'T-24h':1440,'T-6h':360,'T-90m':90}[context.horizon]*60000;
    if (!isPlainRecord(native) || !hasExactKeys(native,['selectedNativeTUtc','cutoffUtc']) || !isUtc(native.selectedNativeTUtc) || !isUtc(native.cutoffUtc) || Date.parse(native.selectedNativeTUtc)-Date.parse(native.cutoffUtc)!==offset || Date.parse(context.issuedAtUtc)>Date.parse(native.cutoffUtc))
      throw new Error('PHASE7_TRANSFORM_REJECTED_NATIVE_DELTA_ANCHOR');
  }

  if (profile.featureDictionarySha256 !== contract.featureDictionarySha256 ||
      profile.termsReviewSha256 !== contract.termsReviewSha256 ||
      profile.derivedWorkReviewSha256 !== contract.derivedWorkReviewSha256 ||
      profile.mappingExpiryHours !== contract.sourceToReleaseMappingExpiryHours)
    throw new Error('PHASE7_TRANSFORM_REJECTED_REVIEW_BINDING_MISMATCH');
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
    if (contractField?.transformEvidenceSha256 !== field.transformEvidenceSha256)
      throw new Error('PHASE7_TRANSFORM_REJECTED_FIELD_REVIEW_BINDING_MISMATCH');
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
    } else if (Date.parse(decision.availableAtUtc) > Date.parse(field.role === 'feature' ? context.issuedAtUtc : context.releasedAtUtc)) {
      missing = true;
      qualityFlags |= QUALITY_NOT_AVAILABLE_AS_OF;
    } else if (decision.missingReason !== null || decision.value === null || decision.value === undefined) {
      missing = true;
      qualityFlags |= QUALITY_MISSING;
    } else {
      if (field.kind === 'frozen_native_t_delta_bucket' && native === undefined)
        throw new Error('PHASE7_TRANSFORM_REJECTED_NATIVE_DELTA_ANCHOR_REQUIRED');
      bucket = fieldBucket(field, decision.value,native);
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
