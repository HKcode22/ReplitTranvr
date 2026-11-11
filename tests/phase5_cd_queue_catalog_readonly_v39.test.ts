import {describe,it,expect} from "vitest";
import {describeP5CDCatalogOnly}
 from "../scripts/v39_phase5_cd_queue_catalog_owner_readonly_once.mjs";
describe("Phase5 C+D real metadata inventory is a decision aid, NOT a live queue migration",()=>{
 it("identifies existing Phase5 source tables without pretending they are a PRE task lease queue",()=>{
  const r=describeP5CDCatalogOnly(
   [{table_name:"phase5_fids_physical_attempt_v39"},
    {table_name:"phase5_fids_original_binding_v39"},
    {table_name:"flight_snapshots"}],
   [{table_name:"flight_snapshots",column_name:"flight_instance_id"},
    {table_name:"flight_snapshots",column_name:"horizon"},
    {table_name:"flight_snapshots",column_name:"prediction_cutoff_utc"}],
   [{table_name:"flight_snapshots",index_name:"flight_snapshot_unique",
     is_unique:true,index_definition:
      "CREATE UNIQUE INDEX flight_snapshot_unique ON clean.flight_snapshots (flight_instance_id,horizon,prediction_cutoff_utc)"}]);
  expect(r.possibleExistingOperationalTaskTables).toHaveLength(0);
  expect(r.snapshotUniqueIndexDefinitions[0].definition)
   .toContain("prediction_cutoff_utc");
  expect(r.changedNativeTTwoCutoffConflictDefinitelyExcludedHere).toBe(false);
  expect(r.queueTableReuseApprovedHere).toBe(false);
  expect(r.databaseWrites).toBe(0);
 });
 it("a name containing queue is a candidate for review, not verified reusable",()=>{
  const r=describeP5CDCatalogOnly(
   [{table_name:"phase5_pre_task_queue_v39"}],
   [{table_name:"phase5_pre_task_queue_v39",column_name:"lease_until_utc"}],
   [{table_name:"phase5_pre_task_queue_v39",index_name:"queue_unique",
     is_unique:true,index_definition:
      "CREATE UNIQUE INDEX queue_unique ON clean.phase5_pre_task_queue_v39 (task_key)"}]);
  expect(r.possibleExistingOperationalTaskTables).toHaveLength(1);
  expect(r.possibleExistingOperationalTaskTables[0].
    actuallyConfirmedReusableQueue).toBe(false);
  expect(r.phase6PaidGo).toBe(false);
 });
 it("refuses unbounded/malformed catalog metadata instead of publishing arbitrary data",()=>{
  expect(()=>describeP5CDCatalogOnly(
   [{table_name:"credential_bad"}],[],[])).toThrow();
  expect(()=>describeP5CDCatalogOnly(
   [{table_name:"flight_snapshots"}],
   [{table_name:"flight_snapshots",column_name:"secret-text"}],[]))
   .toThrow();
  expect(()=>describeP5CDCatalogOnly(
   [{table_name:"flight_snapshots"},{table_name:"flight_snapshots"}],[],[]))
   .toThrow();
 });
});
