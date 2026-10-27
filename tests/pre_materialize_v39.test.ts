/** PRE snapshot materializer tests — V3.9-f.8 population → PRE. */
import { describe, it, expect } from "vitest";
import {
  horizonEligibleForCutoff,
  materializePreSnapshotsForCutoff,
  resolveSelectedTMilestone,
} from "../server/lib/disruption/preSnapshotBuilder_v3";

function row(over: Record<string, unknown> = {}) {
  return {
    analytic_identity_id: "UA123_KLAX_KSFO_20260908_ab12cd34",
    dep_scheduled_utc: new Date("2026-09-09T12:00:00Z"),
    first_observed_schedule_utc: new Date("2026-09-09T12:00:00Z"),
    first_schedule_query_id:"first-verified-population-query",
    horizon:"T-24h",
    prediction_cutoff_utc:new Date("2026-09-08T12:00:00Z"),
    available_at: new Date("2026-09-08T11:59:00Z"),
    population_query_id: "00000000-0000-0000-0000-000000000001",
    response_hash: "r".repeat(64),
    population_role: "requested_airport_primary",
    scope_classification: "confirmed_core",
    codeshare_resolution_status: "confirmed_operating_leg",
    ...over,
  };
}
function fakePool(rows: unknown[], insertRowCount = 1, onInsert: (params: unknown[]) => void = () => undefined) {
  return {
    query: async (text: string, params: unknown[]) => {
      if (/FROM clean\.flight_population/.test(text)) return { rows, rowCount: rows.length };
      onInsert(params);
      return { rows: [], rowCount: insertRowCount };
    },
  };
}
const CUTOFF = new Date("2026-09-08T12:00:00Z");
const FROZEN_T = { milestone: "departure.scheduledTime.utc", version: "gate05-construct@1",
  artifactHash: "f".repeat(64), semanticsEvidenceSha256: "e".repeat(64),
  verifiedProviderNativeSchedule: true as const };

describe("selected T and horizon eligibility", () => {
  it("uses the actual frozen selected-T resolver", () => {
    expect(resolveSelectedTMilestone(row(), FROZEN_T)?.toISOString()).toBe("2026-09-09T12:00:00.000Z");
    expect(resolveSelectedTMilestone(row(), { ...FROZEN_T, milestone: "unverified_field" })).toBeNull();
    expect(resolveSelectedTMilestone(row({first_observed_schedule_utc:null}),FROZEN_T)).toBeNull();
    // The latest retimed departure MUST NOT redefine T for prior snapshots.
    expect(resolveSelectedTMilestone(row({
      dep_scheduled_utc:new Date("2026-09-09T13:30:00Z")
    }),FROZEN_T)?.toISOString()).toBe("2026-09-09T12:00:00.000Z");
    expect(resolveSelectedTMilestone(row(), { ...FROZEN_T, artifactHash: "not-a-hash" })).toBeNull();
  });
  it("computes horizon against selected T", () => {
    const t24 = new Date("2026-09-09T12:00:00Z");
    expect(horizonEligibleForCutoff(t24, CUTOFF, "T-24h")).toBe(true);
    const t2 = new Date("2026-09-08T14:00:00Z");
    expect(horizonEligibleForCutoff(t2, CUTOFF, "T-24h")).toBe(false);
    expect(horizonEligibleForCutoff(t2, CUTOFF, "T-90m")).toBe(false);
    expect(horizonEligibleForCutoff(new Date("2026-09-08T13:30:00Z"), CUTOFF, "T-90m")).toBe(true);
    expect(horizonEligibleForCutoff(new Date("2026-09-09T13:00:00Z"), CUTOFF, "T-24h")).toBe(false);
  });
});

describe("materializePreSnapshotsForCutoff", () => {
  it("blocks all horizons before a valid Gate-0.5 selected-T artifact exists", async () => {
    const result = await materializePreSnapshotsForCutoff(fakePool([row()]), {
      cutoffUtc: CUTOFF, batchId: null, frameHash: "f", configHash: "c", selectedTMilestoneConfig: null,
    });
    expect(result.built).toBe(0);
    expect(result.inserted).toBe(0);
    expect(result.blocked).toEqual({ t_unavailable: 1 });
  });

  it("builds and inserts one row per eligible horizon after valid T freeze", async () => {
    const inserted: unknown[][] = [];
    const result = await materializePreSnapshotsForCutoff(fakePool([row()], 1, (p) => inserted.push(p)), {
      cutoffUtc: CUTOFF, batchId: null, frameHash: "f", configHash: "c", selectedTMilestoneConfig: FROZEN_T,
    });
    expect(result.built).toBe(1);
    expect(result.inserted).toBe(1);
    expect(result.alreadyExisting).toBe(0);
    expect(inserted).toHaveLength(1);
  });

  it("distinguishes expected idempotent conflicts from failures", async () => {
    const result = await materializePreSnapshotsForCutoff(fakePool([row()], 0), {
      cutoffUtc: CUTOFF, batchId: null, frameHash: null, configHash: null, selectedTMilestoneConfig: FROZEN_T,
    });
    expect(result.built).toBe(1);
    expect(result.inserted).toBe(0);
    expect(result.alreadyExisting).toBe(1);
  });

  it("opposite movement never snapshots and missing T blocks as t_unavailable", async () => {
    const result = await materializePreSnapshotsForCutoff(fakePool([
      row({ population_role: "opposite_movement_context" }),
      row({ analytic_identity_id: "OTHER", dep_scheduled_utc: null, first_observed_schedule_utc: null }),
    ]), { cutoffUtc: CUTOFF, batchId: null, frameHash: null, configHash: null, selectedTMilestoneConfig: FROZEN_T });
    expect(result.built).toBe(0);
    expect(result.blocked).toEqual({ not_primary_role: 1, t_unavailable: 1 });
  });

  it("refuses marketing codeshare from PRE denominator",async()=>{
    const result=await materializePreSnapshotsForCutoff(
      fakePool([row({codeshare_resolution_status:"resolved_marketing"})]),{
        cutoffUtc:CUTOFF,batchId:null,frameHash:null,configHash:null,
        selectedTMilestoneConfig:FROZEN_T,horizons:["T-24h"]});
    expect(result.built).toBe(0);
    expect(result.blocked.unverified_operating_leg).toBe(1);
  });

  it("filters post-cutoff and absent population availability despite mock SELECT",async()=>{
    for(const available_at of [new Date("2026-09-08T12:00:01Z"),null]){
      const result=await materializePreSnapshotsForCutoff(fakePool([row({available_at})]),{
        cutoffUtc:CUTOFF,batchId:null,frameHash:null,configHash:null,
        selectedTMilestoneConfig:FROZEN_T,horizons:["T-24h"]});
      expect(result.built).toBe(0);
      expect(result.blocked.population_unobserved_at_cutoff).toBe(1);
    }
  });
  it("does not accept mere arbitrary SHA as verified T provenance",async()=>{
    const result=await materializePreSnapshotsForCutoff(fakePool([row()]),{
      cutoffUtc:CUTOFF,batchId:null,frameHash:null,configHash:null,
      selectedTMilestoneConfig:{...FROZEN_T,semanticsEvidenceSha256:"INVALID"}});
    expect(result.built).toBe(0);
    expect(result.blocked.t_unavailable).toBe(1);
  });


  it("builds two different flight-level T-24h cutoffs in one processing batch",async()=>{
    const inserts:unknown[][]=[];
    const secondT = new Date("2026-09-09T13:08:00Z");
    const secondC = new Date("2026-09-08T13:08:00Z");
    const output = await materializePreSnapshotsForCutoff(fakePool([
      row(),
      row({
        analytic_identity_id:"second-independent-operating-leg",
        first_observed_schedule_utc:secondT,
        prediction_cutoff_utc:secondC,
        available_at:new Date("2026-09-08T13:07:10Z")
      })
    ],1,(p)=>inserts.push(p)),{
      // Processing watermark != either flight's own scientific cutoff.
      cutoffUtc:new Date("2026-09-08T14:00:00Z"),
      batchId:null,frameHash:null,configHash:null,
      selectedTMilestoneConfig:FROZEN_T,horizons:["T-24h"]
    });
    expect(output.built).toBe(2);
    expect(output.inserted).toBe(2);
    expect(inserts.map(x=>(x[3] as Date).toISOString()).sort()).toEqual([
      "2026-09-08T12:00:00.000Z","2026-09-08T13:08:00.000Z"
    ]);
    expect(inserts.map(x=>(x[0] as string))).toEqual([
      "UA123_KLAX_KSFO_20260908_ab12cd34","second-independent-operating-leg"
    ]);
  });
  it("selects a verified T-90m cutoff and refuses an after-cutoff FIDS readback",async()=>{
    const c=new Date("2026-09-09T10:30:00Z");
    const T=new Date("2026-09-09T12:00:00Z");
    const valid=await materializePreSnapshotsForCutoff(fakePool([row({
      horizon:"T-90m",first_observed_schedule_utc:T,
      prediction_cutoff_utc:c,
      available_at:new Date("2026-09-09T10:29:50Z")
    })]),{
      cutoffUtc:new Date("2026-09-09T10:31:00Z"),batchId:null,frameHash:null,configHash:null,
      selectedTMilestoneConfig:FROZEN_T,horizons:["T-90m"]
    });
    expect(valid.built).toBe(1);
    const late=await materializePreSnapshotsForCutoff(fakePool([row({
      horizon:"T-90m",first_observed_schedule_utc:T,
      prediction_cutoff_utc:c,
      available_at:new Date("2026-09-09T10:30:01Z")
    })]),{
      cutoffUtc:new Date("2026-09-09T10:31:00Z"),batchId:null,frameHash:null,configHash:null,
      selectedTMilestoneConfig:FROZEN_T,horizons:["T-90m"]
    });
    expect(late.built).toBe(0);
    expect(late.blocked.population_unobserved_at_cutoff).toBe(1);
  });
  it("SQL joins latest as-of observations per flight and horizon, never assumes query-window cutoff equals decision cutoff",async()=>{
    let query="";
    await materializePreSnapshotsForCutoff({
      query:async(text:string)=>{query=text;return {rows:[],rowCount:0};}
    },{
      cutoffUtc:new Date("2026-09-09T15:00:00Z"),batchId:null,frameHash:null,configHash:null,
      selectedTMilestoneConfig:FROZEN_T
    });
    expect(query).toContain("LEFT JOIN LATERAL");
    expect(query).toContain("CROSS JOIN (VALUES");
    expect(query).toContain("p.available_at <= f.first_observed_schedule_utc - h.lag");
    expect(query).toContain("ORDER BY p.available_at DESC, p.id DESC");
    expect(query).not.toContain("AND cutoff_utc <= $1");
  });

  it("SELECT and INSERT DB failures throw fail-closed", async () => {
    const badSelect = { query: async () => { throw new Error("db down"); } };
    await expect(materializePreSnapshotsForCutoff(badSelect, {
      cutoffUtc: CUTOFF, batchId: null, frameHash: null, configHash: null, selectedTMilestoneConfig: null,
    })).rejects.toThrow("db down");

    let calls = 0;
    const badInsert = {
      query: async (text: string) => {
        if (/FROM clean\.flight_population/.test(text)) return { rows: [row()], rowCount: 1 };
        calls += 1;
        throw new Error("insert failed");
      },
    };
    await expect(materializePreSnapshotsForCutoff(badInsert, {
      cutoffUtc: CUTOFF, batchId: null, horizons: ["T-24h"], frameHash: null, configHash: null, selectedTMilestoneConfig: FROZEN_T,
    })).rejects.toThrow("insert failed");
    expect(calls).toBe(1);
  });
});
