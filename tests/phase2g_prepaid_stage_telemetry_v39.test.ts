import {describe,it,expect} from "vitest";
import {subscribe,unsubscribe} from "node:diagnostics_channel";
import {PHASE2G_PREPAID_STAGE_CHANNEL_V39,
  recordPrepaidStageTimingV39,timePrepaidStageV39,
  type PrepaidStageTimingV39
} from "../server/lib/disruption/phase2gPrepaidStageTelemetry_v39";

describe("P08 actual prepaid stage diagnostics: only timing, bounded labels and zero source secrets",()=>{
  it("records exactly the allowed fields; never serializes original source, URL or session",async()=>{
    const events:unknown[]=[];
    const listener=(x:unknown)=>{events.push(x);};
    subscribe(PHASE2G_PREPAID_STAGE_CHANNEL_V39,listener);
    try{
      const secret="secret-not-to-emit-this-string";
      const result=await timePrepaidStageV39("original_blob_upload_readback",
        async()=>{await new Promise(r=>setTimeout(r,12));return {secret};});
      expect(result.secret).toBe(secret);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        schema:"v39.phase2g-prepaid-stage.v1",
        stage:"original_blob_upload_readback",outcome:"completed",
        provider_calls:0,database_mutations_by_telemetry:0,
        independent_original_source_proven:false
      });
      expect((events[0] as PrepaidStageTimingV39).elapsed_ms).toBeGreaterThanOrEqual(8);
      expect(Object.keys(events[0] as object).sort()).toEqual([
        "database_mutations_by_telemetry","elapsed_ms",
        "independent_original_source_proven","outcome",
        "provider_calls","schema","stage"
      ]);
      expect(JSON.stringify(events)).not.toContain(secret);
    }finally{unsubscribe(PHASE2G_PREPAID_STAGE_CHANNEL_V39,listener);}
  });
  it("an async stage failure still emits failed and never obscures the original error",async()=>{
    const events:unknown[]=[];const listener=(e:unknown)=>{events.push(e);};
    subscribe(PHASE2G_PREPAID_STAGE_CHANNEL_V39,listener);
    try{
      const reason=Error("TEST_STORAGE_FAILURE");
      await expect(timePrepaidStageV39("final_sql_commit",async()=>{throw reason;}))
        .rejects.toBe(reason);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({outcome:"failed",stage:"final_sql_commit"});
      expect(JSON.stringify(events)).not.toContain(reason.message);
    }finally{unsubscribe(PHASE2G_PREPAID_STAGE_CHANNEL_V39,listener);}
  });
  it("subscriber malfunction never causes a false HTTP 5xx",async()=>{
    const listener=()=>{throw Error("SIMULATED_METRICS_SUBSCRIBER_FAILURE");};
    subscribe(PHASE2G_PREPAID_STAGE_CHANNEL_V39,listener);
    try{
      await expect(timePrepaidStageV39("db_pool_acquire",async()=>17))
        .resolves.toBe(17);
    }finally{unsubscribe(PHASE2G_PREPAID_STAGE_CHANNEL_V39,listener);}
  });
  it("refuses invalid stage names and impossible timing values",()=>{
    expect(()=>recordPrepaidStageTimingV39("secrets" as any,1,"completed"))
      .toThrow("PREPAID_STAGE_METRIC_INVALID");
    expect(()=>recordPrepaidStageTimingV39("db_session_lock",-1,"completed"))
      .toThrow("PREPAID_STAGE_METRIC_INVALID");
    expect(()=>recordPrepaidStageTimingV39("db_session_lock",NaN,"failed"))
      .toThrow("PREPAID_STAGE_METRIC_INVALID");
  });
});
