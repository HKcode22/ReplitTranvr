/**
 * V3.9-f.8 Gate-2 Stage-2 promotion owner. Pure selection; no provider calls.
 * Binding authority: Plan §9/§9.1/§9.2.
 */
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { anchorScore, carrierScore, geoScore, trafficScore } from "./adbAirportCatalog_v3";

export interface FrozenProbeCandidate {
  icao: string;
  region: string;
  tier: string;
  preEligible: boolean;
  postEligible: boolean;
  trafficMetricValue: number;
  degree: number;
  effectiveCarriers: number;
  intlShare: number;
  regionShare: number;
}
export interface FrozenProbeArtifact {
  version: string;
  shortlist: FrozenProbeCandidate[];
  replacements: FrozenProbeCandidate[];
  hubCutMetric: number;
  degreeCap: number;
  carriersCap: number;
}
export interface Stage1ProbeEvidence {
  icao: string;
  status: string;
  rowsPerHour: number | null;
  creditsSpent: number | null;
  uniqueFlightsPerCredit: number | null;
  tailChainLinksPerCredit: number | null;
  stability: number | null;
  confirmedUniqueLower: number | null;
  confirmedPlusAmbiguousUpper: number | null;
}
export interface PromotionRow {
  icao: string;
  anchorScore: number;
  anchorScoreLower: number;
  anchorScoreUpper: number;
  yieldScore: number;
  yieldScoreLower: number;
  yieldScoreUpper: number;
  capacityPass: true;
  ambiguityInvariant: true;
  source: "shortlist" | "replacement";
}
export interface PromotionResult {
  selected: string[];
  ranked: PromotionRow[];
  nextReplacement: string | null;
  replacementsNeeded: number;
  primaryStage1Complete: boolean;
  ambiguityMembershipInvariant: boolean;
  referenceIcao: "WSSS" | "OMAA";
}

const CAPACITY_GATE = 60;
const EPS = 1e-12;
function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
function sha(raw: string): string { return createHash("sha256").update(raw).digest("hex"); }
function normalizedIcao(x: unknown): string { return String(x ?? "").trim().toUpperCase(); }

export function loadFrozenProbeArtifact(
  path: string,
  expectedHash: string,
): { artifact: FrozenProbeArtifact; artifactHash: string } {
  if (!/^[a-f0-9]{64}$/i.test(expectedHash)) throw new Error("REFUSED: invalid expected preprobe artifact hash");
  const raw = readFileSync(path, "utf8");
  const actual = sha(raw);
  if (actual !== expectedHash.toLowerCase()) {
    throw new Error(`REFUSED: preprobe artifact hash mismatch expected=${expectedHash} actual=${actual}`);
  }
  const p = JSON.parse(raw) as FrozenProbeArtifact;
  if (!Array.isArray(p.shortlist) || p.shortlist.length !== 12) {
    throw new Error("REFUSED: Stage-1 shortlist must contain exactly 12 candidates");
  }
  p.replacements = Array.isArray(p.replacements) ? p.replacements : [];
  const primary = p.shortlist.map((x) => normalizedIcao(x.icao));
  const all = [...p.shortlist, ...p.replacements].map((x) => normalizedIcao(x.icao));
  if (new Set(primary).size !== 12 || new Set(all).size !== all.length) {
    throw new Error("REFUSED: frozen shortlist/replacement ICAOs are not unique");
  }
  for (const must of ["WSSS", "OMAA"]) {
    if (!primary.includes(must)) throw new Error(`REFUSED: required yield-reference candidate ${must} missing`);
  }
  for (const c of [...p.shortlist, ...p.replacements]) {
    c.icao = normalizedIcao(c.icao);
    if (c.tier !== "HUB" || c.preEligible !== true || c.postEligible !== true) {
      throw new Error(`REFUSED: ${c.icao} is not frozen dual-eligible HUB`);
    }
    if (!c.region) throw new Error(`REFUSED: ${c.icao} has no frozen region`);
    if (![c.trafficMetricValue, c.degree, c.effectiveCarriers, c.intlShare, c.regionShare].every(Number.isFinite)) {
      throw new Error(`REFUSED: ${c.icao} has invalid frozen exogenous inputs`);
    }
  }
  if (!(p.hubCutMetric > 0 && p.degreeCap > 0 && p.carriersCap > 0)) {
    throw new Error("REFUSED: frozen normalization caps invalid");
  }
  return { artifact: p, artifactHash: actual };
}

function evidenceByIcao(rows: Stage1ProbeEvidence[]): Map<string, Stage1ProbeEvidence> {
  const out = new Map<string, Stage1ProbeEvidence>();
  for (const row of rows) out.set(normalizedIcao(row.icao), { ...row, icao: normalizedIcao(row.icao) });
  return out;
}
function isTerminalStatus(status: string | undefined): boolean {
  return status === "completed" || status === "failed" || status === "abandoned";
}
function hasValidBounds(r: Stage1ProbeEvidence): boolean {
  return r.confirmedUniqueLower !== null && r.confirmedPlusAmbiguousUpper !== null &&
    Number.isFinite(r.confirmedUniqueLower) && Number.isFinite(r.confirmedPlusAmbiguousUpper) &&
    r.confirmedUniqueLower >= 0 && r.confirmedPlusAmbiguousUpper >= r.confirmedUniqueLower;
}
function baseProbeValid(r: Stage1ProbeEvidence | undefined): r is Stage1ProbeEvidence {
  return !!r && r.status === "completed" && (r.rowsPerHour ?? -Infinity) >= CAPACITY_GATE &&
    r.creditsSpent !== null && Number.isFinite(r.creditsSpent) && r.creditsSpent > 0 &&
    r.uniqueFlightsPerCredit !== null && Number.isFinite(r.uniqueFlightsPerCredit) &&
    r.tailChainLinksPerCredit !== null && Number.isFinite(r.tailChainLinksPerCredit) &&
    r.stability !== null && Number.isFinite(r.stability) && r.stability >= 0 && hasValidBounds(r);
}

/** WSSS primary; OMAA only when WSSS is invalid/capacity-failed, exactly §9.2. */
function selectReference(rows: Stage1ProbeEvidence[]): Stage1ProbeEvidence {
  const by = evidenceByIcao(rows);
  const wsss = by.get("WSSS");
  if (baseProbeValid(wsss) && wsss.uniqueFlightsPerCredit! > 0 && wsss.tailChainLinksPerCredit! > 0 && wsss.stability! > 0 && wsss.confirmedUniqueLower! > 0) {
    return wsss;
  }
  const omaa = by.get("OMAA");
  if (baseProbeValid(omaa) && omaa.uniqueFlightsPerCredit! > 0 && omaa.tailChainLinksPerCredit! > 0 && omaa.stability! > 0 && omaa.confirmedUniqueLower! > 0) {
    return omaa;
  }
  throw new Error("REFUSED_REFERENCE_INVALID: neither WSSS nor OMAA has a valid positive capacity-passing reference probe");
}

function standardized(candidate: number, reference: number): number {
  if (!Number.isFinite(candidate) || !Number.isFinite(reference) || reference <= 0) {
    throw new Error("REFUSED_NOT_SCORABLE: invalid yield component/reference");
  }
  return clamp01(candidate / reference);
}

function scoreOne(
  artifact: FrozenProbeArtifact,
  c: FrozenProbeCandidate,
  r: Stage1ProbeEvidence,
  reference: Stage1ProbeEvidence,
  source: "shortlist" | "replacement",
): PromotionRow | null {
  if (!baseProbeValid(r)) return null;
  const refCredits = reference.creditsSpent!;
  const candCredits = r.creditsSpent!;
  const refUfLower = reference.confirmedUniqueLower! / refCredits;
  const refUfUpper = reference.confirmedPlusAmbiguousUpper! / refCredits;
  const candUfLower = r.confirmedUniqueLower! / candCredits;
  const candUfUpper = r.confirmedPlusAmbiguousUpper! / candCredits;
  if (!(refUfLower > 0) || !(refUfUpper >= refUfLower)) {
    throw new Error("REFUSED_REFERENCE_INVALID: identity-bound reference denominator is invalid");
  }

  // The unique-flight component is the only recorded identity-bounded yield
  // component. To bound the ratio conservatively, minimum = candidate lower /
  // reference upper; maximum = candidate upper / reference lower.
  const ufNominal = standardized(r.uniqueFlightsPerCredit!, reference.uniqueFlightsPerCredit!);
  const ufLower = standardized(candUfLower, refUfUpper);
  const ufUpper = standardized(candUfUpper, refUfLower);
  const chain = standardized(r.tailChainLinksPerCredit!, reference.tailChainLinksPerCredit!);
  const stability = standardized(r.stability!, reference.stability!);
  const y = (ufNominal + chain + stability) / 3;
  const yLower = (ufLower + chain + stability) / 3;
  const yUpper = (ufUpper + chain + stability) / 3;

  const t = trafficScore(c.trafficMetricValue, artifact.hubCutMetric);
  const g = geoScore(c.degree / artifact.degreeCap, c.intlShare, clamp01(1 - c.regionShare));
  const car = carrierScore(c.effectiveCarriers / artifact.carriersCap, c.intlShare);
  const score = anchorScore(t, g, car, y);
  const scoreLower = anchorScore(t, g, car, yLower);
  const scoreUpper = anchorScore(t, g, car, yUpper);
  if (score === null || scoreLower === null || scoreUpper === null) return null;
  return {
    icao: r.icao,
    anchorScore: score,
    anchorScoreLower: Math.min(scoreLower, scoreUpper),
    anchorScoreUpper: Math.max(scoreLower, scoreUpper),
    yieldScore: y,
    yieldScoreLower: Math.min(yLower, yUpper),
    yieldScoreUpper: Math.max(yLower, yUpper),
    capacityPass: true,
    ambiguityInvariant: true,
    source,
  };
}

function scoreCandidates(
  artifact: FrozenProbeArtifact,
  evidence: Stage1ProbeEvidence[],
  candidates: FrozenProbeCandidate[],
  reference: Stage1ProbeEvidence,
  source: "shortlist" | "replacement",
): PromotionRow[] {
  const byEvidence = evidenceByIcao(evidence);
  const out: PromotionRow[] = [];
  for (const c of candidates) {
    const r = byEvidence.get(c.icao);
    if (!r) continue;
    const scored = scoreOne(artifact, c, r, reference, source);
    if (scored) out.push(scored);
  }
  return out;
}

function rank(rows: PromotionRow[]): PromotionRow[] {
  return [...rows].sort((a, b) => b.anchorScore - a.anchorScore || a.icao.localeCompare(b.icao));
}

/**
 * Strong membership proof: every selected candidate's worst-case score must
 * outrank every outsider's best-case score (lexical ICAO resolves exact ties).
 * This proves final-five membership under all independent recorded score bounds,
 * not merely under the all-lower and all-upper endpoints.
 */
export function finalFiveMembershipInvariant(rankedRows: PromotionRow[]): boolean {
  if (rankedRows.length <= 5) return true;
  const nominal = rank(rankedRows);
  const selected = nominal.slice(0, 5);
  const outsiders = nominal.slice(5);
  for (const inside of selected) {
    for (const outside of outsiders) {
      if (inside.anchorScoreLower > outside.anchorScoreUpper + EPS) continue;
      if (Math.abs(inside.anchorScoreLower - outside.anchorScoreUpper) <= EPS && inside.icao.localeCompare(outside.icao) < 0) continue;
      return false;
    }
  }
  return true;
}

/**
 * Exact Stage-2 promotion/replacement protocol.
 * - All 12 frozen primary Stage-1 candidates must reach a terminal probe state
 *   before replacements are consumed.
 * - Capacity is a gate, not a score component.
 * - Frozen replacements are consumed sequentially only when <5 valid primary
 *   candidates remain.
 * - Final-five membership must be invariant under the recorded identity bounds.
 */
export function selectStage2Top5(
  artifact: FrozenProbeArtifact,
  evidence: Stage1ProbeEvidence[],
): PromotionResult {
  const by = evidenceByIcao(evidence);
  const primaryStage1Complete = artifact.shortlist.every((c) => isTerminalStatus(by.get(c.icao)?.status));
  const reference = selectReference(evidence);

  let scored = scoreCandidates(artifact, evidence, artifact.shortlist, reference, "shortlist");
  let nextReplacement: string | null = null;

  if (primaryStage1Complete && scored.length < 5) {
    for (const replacement of artifact.replacements) {
      const ev = by.get(replacement.icao);
      if (!ev || !isTerminalStatus(ev.status)) {
        nextReplacement = replacement.icao;
        break;
      }
      const one = scoreOne(artifact, replacement, ev, reference, "replacement");
      if (one) scored.push(one);
      if (scored.length >= 5) break;
    }
  }

  const ranked = rank(scored);
  const selected = ranked.slice(0, 5).map((r) => r.icao);
  const replacementsNeeded = Math.max(0, 5 - selected.length);
  const invariant = selected.length === 5 ? finalFiveMembershipInvariant(ranked) : false;
  if (selected.length === 5 && !invariant) {
    throw new Error("INSUFFICIENT_IDENTITY_RESOLUTION: final anchor-score top-five membership is not invariant under recorded identity bounds");
  }

  return {
    selected,
    ranked,
    nextReplacement,
    replacementsNeeded,
    primaryStage1Complete,
    ambiguityMembershipInvariant: invariant,
    referenceIcao: reference.icao as "WSSS" | "OMAA",
  };
}
