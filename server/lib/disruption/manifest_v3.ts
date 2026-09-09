/** V3.9-f.8 manifest inventory and hash proof. Old RUN IDs never certify changed bytes. */
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
export const MANIFEST_PLAN_VERSION="v3.9-f.8";
export interface ManifestEntry{type:"module"|"test"|"migration"|"config"|"document"|"rule"|"script";path:string;description:string;implemented:boolean;tested:boolean;evidenceId:string|null;requirements:string[]}
const changed=(type:ManifestEntry["type"],path:string,description:string,requirements:string[]=[]):ManifestEntry=>({type,path,description,implemented:true,tested:false,evidenceId:null,requirements});
export const V39_MANIFEST:ManifestEntry[]=[
 changed("module","server/lib/disruption/adbCollectionController_v3.ts","collection admission/selector owner"),
 changed("module","server/lib/disruption/adaptiveMi_v3.ts","binding REGIONAL adaptation",["REQ-ADAPT-001","REQ-ADAPT-002","REQ-ADAPT-003","REQ-ADAPT-004"]),
 changed("module","server/lib/disruption/aerodataboxLimiter_v3.ts","central provider transport/REST ledger",["REQ-RATE-001"]),
 changed("module","server/lib/disruption/fidsCensus_v3.ts","provider-observable FIDS population",["REQ-FIDS-001","REQ-FIDS-002","REQ-FIDS-003"]),
 changed("module","server/lib/disruption/flightInstanceCanonical_v3.ts","canonical physical flight identity",["REQ-CODESHARE-001","REQ-CODESHARE-002"]),
 changed("module","server/lib/disruption/flightNotificationExtractor_v3.ts","notification extraction/provenance"),
 changed("module","server/lib/disruption/rawIngress_v3.ts","raw-before-2xx immutable ingress",["REQ-RAW-001","REQ-RAW-002"]),
 changed("module","server/lib/disruption/flightDataPrePostStore_v3.ts","append-only semantic research events"),
 changed("module","server/lib/disruption/timestampTaxonomy_v3.ts","cutoff timestamp taxonomy",["REQ-TIMESTAMP-001","REQ-TIMESTAMP-002","REQ-TIMESTAMP-003"]),
 changed("module","server/lib/disruption/preSnapshotBuilder_v3.ts","population-defined PRE materializer"),
 changed("module","server/lib/disruption/airborneSnapshotBuilder_v3.ts","AIRBORNE snapshot pure builder"),
 changed("module","server/lib/disruption/airborneMaterializer_v39.ts","canonical cutoff-safe AIRBORNE materializer"),
 changed("module","server/lib/disruption/outcomeTerminalizer_v3.ts","target terminalizer"),
 changed("module","server/lib/disruption/outcomeRecoveryOrchestrator_v39.ts","bounded original-query outcome recovery"),
 changed("module","server/lib/disruption/historicalFeatureStore_v3.ts","bitemporal history",["REQ-HIST-001","REQ-HIST-002","REQ-HIST-003"]),
 changed("module","server/lib/disruption/weatherSignal.ts","cutoff-safe explicit-missing weather",["REQ-WEATHER-001","REQ-WEATHER-002"]),
 changed("module","server/lib/disruption/anchorPromotion_v39.ts","exact-five Stage-2 promotion"),
 changed("module","server/lib/disruption/experimentCalendarSolver_v39.ts","strict randomized crossover solver",["REQ-CAL-001","REQ-CAL-002","REQ-CAL-003"]),
 changed("module","server/lib/disruption/budgetAccounting_v3.ts","Alert/REST budget accounting",["REQ-BUDGET-001","REQ-BUDGET-002"]),
 changed("module","server/lib/disruption/settlement_v3.ts","stable balance settlement",["REQ-SETTLE-001"]),
 changed("module","server/lib/disruption/gates_v3.ts","gate computation"),
 changed("module","server/lib/disruption/retentionSecurity_v39.ts","security/retention machinery"),
 changed("module","server/lib/disruption/authRecord_v39.ts","authorization record verifier"),
 changed("module","server/lib/disruption/configRegistry_v3.ts","frozen configuration registry",["REQ-CONFIG-001"]),
 changed("module","server/lib/disruption/requirementMatrix_v3.ts","requirement traceability"),
 changed("module","server/lib/disruption/contradictionScan_v3.ts","contradiction scanner"),
 changed("test","tests/adaptation.test.ts","binding adaptation tests"),
 changed("test","tests/timestamps_raw.test.ts","timestamp/raw tests"),
 changed("test","tests/weather_history.test.ts","weather/history tests"),
 changed("test","tests/pre_materialize_v39.test.ts","PRE materialization tests"),
 changed("test","tests/airborne_materializer_v39.test.ts","AIRBORNE materializer tests"),
 changed("test","tests/outcome_recovery_v39.test.ts","outcome recovery tests"),
 changed("test","tests/anchor_promotion_v39.test.ts","Stage-2 promotion tests"),
 changed("test","tests/calendar_solver_strict_v39.test.ts","strict calendar tests"),
 changed("test","tests/fidsTimezone.test.ts","FIDS timezone/DST tests"),
 changed("test","tests/runtime_safety_v39.test.ts","runtime fail-closed tests"),
 changed("test","tests/gates_v39.test.ts","gate/settlement tests"),
 changed("migration","migrations/0017_collection_v39_credit_accounting.sql","credit accounting"),
 changed("migration","migrations/0018_collection_v39_delivery_failure_flag.sql","delivery-failure flag"),
 changed("migration","migrations/0019_collection_v39_population_and_events.sql","population/events"),
 changed("migration","migrations/0020_collection_v39_airborne_time_series.sql","airborne time-series base"),
 changed("migration","migrations/0021_collection_v39_sampling_frame.sql","sampling frame"),
 changed("migration","migrations/0022_collection_v39_design_probability.sql","design probability"),
 changed("migration","migrations/0023_anchor_probe_results.sql","anchor probe base"),
 changed("migration","migrations/0024_historical_feature_store.sql","historical feature store"),
 changed("migration","migrations/0025_raw_ingress_immutable_layers.sql","raw ingress"),
 changed("migration","migrations/0026_snapshot_outcome_tables.sql","PRE/outcome persistence"),
 changed("migration","migrations/0027_probe_budget_day.sql","probe budget-day lifecycle"),
 changed("migration","migrations/0028_frame_versioning.sql","frame versioning"),
 changed("migration","migrations/0029_fids_population_production.sql","FIDS production provenance"),
 changed("migration","migrations/0030_webhook_canonical_identity.sql","webhook canonical identity"),
 changed("migration","migrations/0031_retention_tombstone.sql","retention tombstone"),
 changed("migration","migrations/0032_airborne_canonical_identity.sql","airborne canonical identity"),
 changed("migration","migrations/0033_incident_stop.sql","persistent incident stop"),
 changed("migration","migrations/0034_airborne_phase0_conformance.sql","canonical AIRBORNE uniqueness/eligibility"),
 changed("migration","migrations/0035_anchor_probe_identity_bounds.sql","anchor ambiguity evidence"),
 changed("script","scripts/v39_probe_stage2_v39.ts","AUTH Stage-2 wrapper"),
 changed("script","scripts/v39_probe_stage2_owner_v39.ts","exact-five Stage-2 owner"),
 changed("script","scripts/calendar_solve.ts","strict calendar CLI"),
 changed("script","scripts/v39_security_verify_v39.ts","deployment-aware security verifier"),
 changed("script","scripts/v39_preflight_v39.ts","aggregate Phase-0 preflight"),
 changed("script","scripts/db_verify_phase0_v39.ts","migration/schema verification"),
 changed("document","SEPmd/V3.9_DataCollectPlan_f.8.md","binding Plan §§0-21"),
 changed("document","SEPmd/V3.9_IMPLEMENTATION_LOG.md","implementation manual"),
 changed("document","SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md","append-only evidence ledger"),
];
export function getManifestSummary(){const byType:Record<string,number>={};for(const e of V39_MANIFEST)byType[e.type]=(byType[e.type]??0)+1;return{total:V39_MANIFEST.length,implemented:V39_MANIFEST.filter(e=>e.implemented).length,tested:V39_MANIFEST.filter(e=>e.tested).length,withEvidence:V39_MANIFEST.filter(e=>e.evidenceId).length,byType};}
export type EvalPartition="TRAIN"|"VALIDATION"|"TEST";export const SPLIT_TRAIN_END=20,SPLIT_VALIDATION_END=25,SPLIT_TEST_END=31,SPLIT_HOLDOUT_GAP_BATCH_DAYS=0;
export function splitPartitionForDay(i:number):EvalPartition|null{if(!Number.isInteger(i)||i<1||i>31)return null;return i<=20?"TRAIN":i<=25?"VALIDATION":"TEST";}
function sha(s:string){return createHash("sha256").update(s).digest("hex");}
export function splitRuleHash(seed:string){return sha(JSON.stringify({train:[1,20],validation:[21,25],test:[26,31],gap:0,groupBy:"flight_instance_id",seed,ordering:"run_day_index_chronological"}));}
export const STALENESS_BUCKETS_MIN=[10,30,60,180,360,720,1440,2880];
export function stalenessBucket(sec:number){if(!Number.isFinite(sec)||sec<0)return"invalid";const m=sec/60;for(const b of STALENESS_BUCKETS_MIN)if(m<=b)return`<=${b}m`;return">2880m";}
export interface ManifestCompleteness{complete:boolean;missingEvidence:string[];missingImplementation:string[]}
export function checkManifestCompleteness(entries:ManifestEntry[]=V39_MANIFEST,evidenceByPath:Record<string,string>={}):ManifestCompleteness{const missingEvidence:string[]=[],missingImplementation:string[]=[];for(const e of entries){if(["document","config"].includes(e.type))continue;if(!e.implemented)missingImplementation.push(e.path);const evidence=evidenceByPath[e.path]??e.evidenceId;if(!evidence)missingEvidence.push(e.path);}return{complete:!missingEvidence.length&&!missingImplementation.length,missingEvidence,missingImplementation};}
export interface ArtifactHashProof{path:string;sha256:string;exists:boolean}
export interface ManifestHashProof{artifacts:ArtifactHashProof[];aggregateSha256:string;missing:string[]}
export function deriveManifestHashProof(root=process.cwd(),entries:ManifestEntry[]=V39_MANIFEST):ManifestHashProof{const artifacts:ArtifactHashProof[]=[],missing:string[]=[];for(const e of entries.filter(x=>!["document","config"].includes(x.type))){try{const bytes=readFileSync(join(root,e.path));artifacts.push({path:e.path,sha256:createHash("sha256").update(bytes).digest("hex"),exists:true});}catch{artifacts.push({path:e.path,sha256:"",exists:false});missing.push(e.path);}}const aggregateSha256=sha(JSON.stringify({plan:MANIFEST_PLAN_VERSION,artifacts:[...artifacts].sort((a,b)=>a.path.localeCompare(b.path)),splitRule:splitRuleHash("manifest-rule")}));return{artifacts,aggregateSha256,missing};}
export function checkManifestHashProof(proof:ManifestHashProof,entries:ManifestEntry[]=V39_MANIFEST){const failures:string[]=[];if(proof.missing.length)failures.push(...proof.missing.map(x=>`missing:${x}`));const required=new Set(entries.filter(x=>!["document","config"].includes(x.type)).map(x=>x.path));for(const p of proof.artifacts)if(required.has(p.path)&&(!p.exists||!/^[a-f0-9]{64}$/.test(p.sha256)))failures.push(`invalid-hash:${p.path}`);for(const path of required)if(!proof.artifacts.some(p=>p.path===path))failures.push(`unproved:${path}`);return{complete:!failures.length,failures};}
