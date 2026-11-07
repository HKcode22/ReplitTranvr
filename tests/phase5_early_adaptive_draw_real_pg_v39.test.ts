/**
 * Disposable CI PostgreSQL16 only. Never run against an owner/live database.
 * Sets up a minimal authentic B0062 calendar/frame/authorization, then uses
 * the production early draw writer against actual serializable SQL/constraints.
 */
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import {
  commitEarlyPhase5Draw, type EarlyDrawOwnerPins,
} from "../server/lib/disruption/phase5EarlyAdaptiveDrawOwner_v39";

const URL="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const enabled=process.env.V39_P5_PG16_INTEGRATION==="1";
const suite=enabled?describe:describe.skip;
const hex=(c:string)=>c.repeat(64);
const pins:EarlyDrawOwnerPins={
  runDayIndex:1,
  expectedManifestSha256:hex("a"),expectedCalendarHash:hex("b"),
  expectedConfigHash:hex("c"),expectedFrameHash:hex("d"),
  phase5FreezeApproved:true,githubOnlyApproved:true,
};
suite("Phase5 atomic early writer on disposable B0062 PostgreSQL16 ONLY",()=>{
  let db:Pool;
  let serviceStart:string;
  beforeAll(async()=>{
    if(process.env.DATABASE_URL!==URL || process.env.GITHUB_ACTIONS!=="true" ||
       process.env.V39_P5_PG16_INTEGRATION!=="1")
      throw Error("REFUSED_NON_DISPOSABLE_REAL_PG16");
    db=new Pool({connectionString:URL,max:3});
    const today=await db.query("SELECT clock_timestamp() AS now");
    serviceStart=new Date(new Date(today.rows[0].now).getTime()+28*3_600_000)
      .toISOString();
    await db.query(
      `INSERT INTO clean.adb_phase6_authorization
        (authorization_id,manifest_sha256,calendar_hash,config_hash,code_sha,
         schema_version,phase6_start_date,alert_cap_per_parent_day,
         unsettled_burst_margin_credits,protected_alert_floor,enabled,
         predecessor_evidence_ids)
        VALUES ('CI-P5-EARLY', $1,$2,$3,$4,'v39',
                $5::date,1900,10,1000,true,'["ci-only"]'::jsonb)`,
      [pins.expectedManifestSha256,pins.expectedCalendarHash,pins.expectedConfigHash,
       "e".repeat(40),serviceStart.slice(0,10)],
    );
    await db.query(
      `INSERT INTO clean.adb_sampling_frame_registry
          (registry_key,active_frame_version,frame_hash)
        VALUES ('ACTIVE','ci-phase5', $1)`,
      [pins.expectedFrameHash],
    );
    const frame:[
      string,string,string
    ][] = [
      ["WSSS","HUB","ASIA"],
      ["OMAA","MID","MIDDLE_EAST"],
      ["SKBO","MID","SOUTH_AMERICA"],
      ["KGPT","REGIONAL","NORTH_AMERICA"],
    ];
    for(const [icao,tier,region] of frame){
      await db.query(
        `INSERT INTO clean.adb_sampling_frame
          (icao,tier,tier_source,traffic_prior,region,feed_schedule,
           feed_live,feed_adsb,pre_eligible,post_eligible,in_frame,
           frame_version,frame_hash)
         VALUES ($1,$2,'curated',10,$3,true,true,false,true,true,true,
                 'ci-phase5',$4)`,
        [icao,tier,region,pins.expectedFrameHash],
      );
    }
    await db.query(
      `INSERT INTO clean.adb_phase6_calendar_day
          (run_day_index,budget_day_id,calendar_hash,config_hash,date_utc,
           utc_slot,time_class,window_shape,evaluation_partition,draw_type,
           slot_regions,anchor_icao,pair_airport_set,frozen_draw_seed,
           scheduled_start_utc,active_duration_minutes,frame_hash)
        VALUES (1,'P6D01',$1,$2,$3::date,'CI','CI','4h','CI','NEW_TEMPLATE',
         $4::jsonb,'WSSS',NULL,'ci-phase5-seed',$5::timestamptz,240,$6)`,
      [pins.expectedCalendarHash,pins.expectedConfigHash,serviceStart.slice(0,10),
       JSON.stringify({HUB:"ASIA",MID_A:"MIDDLE_EAST",
         MID_B:"SOUTH_AMERICA",REGIONAL:"NORTH_AMERICA"}),
       serviceStart,pins.expectedFrameHash],
    );
  });
  afterAll(async()=>{if(db)await db.end();});

  it("commits real atomic four-row selections and advances historical washout state",async()=>{
    const output=await commitEarlyPhase5Draw(db,pins);
    expect(output.status).toBe("EARLY_DRAW_COMMITTED");
    expect(output.selectedAirportCount).toBe(4);
    expect(output.flightLevelPreVerified).toBe(false);
    expect(output.providerCalls).toBe(0);
    const rows=(await db.query(
      "SELECT slot_id,selected_icao,selected_at_utc FROM clean.adb_sampling_draw ORDER BY slot_id"
    )).rows;
    expect(rows).toHaveLength(4);
    expect(new Set(rows.map(r=>new Date(r.selected_at_utc).toISOString())).size).toBe(1);
    expect(new Set(rows.map(r=>r.selected_icao)).size).toBe(4);
    const states=await db.query(
      "SELECT icao,last_selected_run_day FROM clean.adb_airport_sampling_state"
    );
    expect(states.rows).toHaveLength(4);
    expect(states.rows.every(r=>Number(r.last_selected_run_day)===1)).toBe(true);
  });
  it("idempotent replay of the same real DB record does not update selection",async()=>{
    const before=(await db.query(
      "SELECT array_agg(draw_id ORDER BY slot_id) ids FROM clean.adb_sampling_draw"
    )).rows[0].ids;
    const reread=await commitEarlyPhase5Draw(db,pins);
    expect(reread.status).toBe("EARLY_DRAW_IDEMPOTENT_READBACK");
    const after=(await db.query(
      "SELECT array_agg(draw_id ORDER BY slot_id) ids FROM clean.adb_sampling_draw"
    )).rows[0].ids;
    expect(after).toEqual(before);
  });
  it("cannot admit authorization with the wrong calendar pin",async()=>{
    await expect(commitEarlyPhase5Draw(db,{
      ...pins,expectedCalendarHash:hex("f"),
    })).rejects.toThrow("NO_FROZEN_ENABLED_AUTHORIZATION");
    expect(Number((await db.query("SELECT count(*) AS n FROM clean.adb_sampling_draw")).rows[0].n)).toBe(4);
  });
});
