import {describe,it,expect} from "vitest";
import {
 enqueueP5CdReviewedTaskV39,claimP5CdDueTasksV39,
 markP5CdStage14WriteStartedV39,acknowledgeP5CdStage14PostCommitV39,
 reapP5CdExpiredLeasesOnceV39
} from "../server/lib/disruption/phase5CdDurableQueueClient_v39";
const h=(x:string)=>x.repeat(64);
const t="2035-11-25T12:00:00.000Z";
const data={
 manifestSha256:h("a"),flightInstanceId:"leg:ci:durable:001",
 horizon:"T-6h" as const,selectedNativeTUtc:t,packetSha256:h("b"),
 sourcePopulationQueryId:"c23e4567-e89b-42d3-a456-426614174013",
 sourceResponseSha256:h("c"),reviewedSourceRightsSha256:h("d"),
 sourceExpiresAtUtc:"2035-11-26T12:00:00.000Z",
 externalSourceAndPolicyReviewed:true as const
};
describe("Phase5 V0087 thin GitHub-worker queue client (NO provider/DB)",()=>{
 it("enqueues reviewed T6 with exact 6h cutoff, no hidden provider calls",async()=>{
  let calls=0;
  const db={query:async(sql:string,args?:unknown[])=>{
   calls++;
   expect(sql).toContain("INSERT INTO clean.phase5_cd_pre_task_v39");
   expect(args?.[4]).toBe("2035-11-25T06:00:00.000Z");
   return{rows:[{task_id:"17"}]};
  }};
  expect(await enqueueP5CdReviewedTaskV39(db,data)).toBe("17");
  expect(calls).toBe(1);
 });
 it("rejects unreviewed/malformed source before touching SQL",async()=>{
  let count=0;const db={query:async()=>{count++;return{rows:[]};}};
  await expect(enqueueP5CdReviewedTaskV39(db,{
   ...data,externalSourceAndPolicyReviewed:false as any
  })).rejects.toThrow("UNREVIEWED_SOURCE_OR_IDENTITY");
  await expect(enqueueP5CdReviewedTaskV39(db,{
   ...data,selectedNativeTUtc:"2035-11-25T12:00:00Z"
  })).rejects.toThrow("INVALID_ISO_UTC");
  expect(count).toBe(0);
 });
 it("claims real PG timestamp types and refuses a retimed native T",async()=>{
  const row={
   task_id:"23",manifest_sha256:h("a"),
   flight_instance_id:"leg:ci:durable:001",horizon:"T-6h",
   selected_native_t_utc:new Date(t),
   prediction_cutoff_utc:new Date("2035-11-25T06:00:00.000Z"),
   packet_sha256:h("b"),source_population_query_id:data.sourcePopulationQueryId,
   source_response_sha256:h("c"),
   reviewed_source_rights_sha256:h("d"),
   source_expires_at_utc:new Date("2035-11-26T12:00:00.000Z"),
   state:"CLAIMED",lease_owner:"ci-worker-23",
   lease_generation:"3",lease_until_utc:new Date("2035-11-25T05:59:00.000Z")
  };
  const db={query:async()=>({rows:[row]})};
  const tasks=await claimP5CdDueTasksV39(db,"ci-worker-23",2,30);
  expect(tasks).toHaveLength(1);
  expect(tasks[0].leaseGeneration).toBe("3");
  expect(tasks[0].predictionCutoffUtc).toBe("2035-11-25T06:00:00.000Z");
  expect(tasks[0].reviewedSourceRightsSha256).toBe(h("d"));
  expect(tasks[0].sourceExpiresAtUtc).toBe("2035-11-26T12:00:00.000Z");
  await expect(claimP5CdDueTasksV39({
   query:async()=>({rows:[{
    ...row,selected_native_t_utc:new Date("2035-11-25T12:15:00.000Z")
   }]})
  },"ci-worker-23")).rejects.toThrow("DB_ROW_HORIZON_NATIVE_T_CHANGED");
 });
 it("uses reviewed Stage14 start and postcommit proof functions only",async()=>{
  const queries:string[]=[];
  const db={query:async(sql:string)=>{queries.push(sql);return{rows:[{ok:true}]};}};
  const task={
   taskId:"42",manifestSha256:h("a"),flightInstanceId:data.flightInstanceId,
   horizon:"T-6h" as const,selectedNativeTUtc:t,
   predictionCutoffUtc:"2035-11-25T06:00:00.000Z",
   packetSha256:h("b"),sourcePopulationQueryId:data.sourcePopulationQueryId,
   sourceResponseSha256:h("c"),
   reviewedSourceRightsSha256:h("d"),
   sourceExpiresAtUtc:"2035-11-26T12:00:00.000Z",
   state:"CLAIMED" as const,
   leaseOwner:"ci-worker-23",leaseGeneration:"2",leaseUntilUtc:"2035-11-25T05:59:00.000Z"
  };
  expect(await markP5CdStage14WriteStartedV39(db,task)).toBe(true);
  expect(await acknowledgeP5CdStage14PostCommitV39(db,task,"991",h("d")))
   .toBe(true);
  expect(queries).toHaveLength(2);
  expect(queries[0]).toContain("phase5_cd_mark_write_started_v39");
  expect(queries[1]).toContain("phase5_cd_ack_verified_v39");
  await expect(acknowledgeP5CdStage14PostCommitV39(db,task,"991","bad"))
   .rejects.toThrow("RECEIPT_NOT_REVIEWED");
  expect(queries).toHaveLength(2);
 });
 it("bounded reaper does not promise automatic replay of quarantined tasks",async()=>{
  const db={query:async()=>({rows:[{task_id:"1",new_state:"QUARANTINED"}]})};
  expect(await reapP5CdExpiredLeasesOnceV39(db,1))
   .toEqual([{taskId:"1",state:"QUARANTINED"}]);
  await expect(reapP5CdExpiredLeasesOnceV39(db,257))
   .rejects.toThrow("REAPER_BOUND_INVALID");
  await expect(reapP5CdExpiredLeasesOnceV39({
   query:async()=>({rows:[{task_id:"1",new_state:"VERIFIED_ON_TIME"}]})
  })).rejects.toThrow("REAPER_STATE_UNEXPECTED");
 });
});
