import {describe,it,expect} from "vitest";
import {
 auditP5CdV0091OneFlightReadOnly
} from "../scripts/v39_phase5_cd_v0091_exact_registration_owner_readonly_once";

const native="2035-11-25T12:00:00.000Z";
const base={
 DATABASE_URL:"unused-in-pure-test",
 GITHUB_ACTIONS:"false",
 P5_CD_AUDIT_MANIFEST_SHA256:"a".repeat(64),
 P5_CD_AUDIT_PACKET_SHA256:"b".repeat(64),
 P5_CD_AUDIT_FLIGHT_ID:"leg:ci:cd:v0091:001",
 P5_CD_AUDIT_HORIZON:"T-6h",
 P5_CD_AUDIT_SELECTED_NATIVE_T_UTC:native
};
function fake(rows:Record<string,unknown>[]){
 const sql:string[]=[];
 const db={query:async(q:string)=>{
  sql.push(q);
  if(q.includes("current_database()"))
   return{rows:[{
    db:"neondb",role:"neondb_owner",ver:160010,ro:"on",
    observed_utc:new Date("2035-11-25T04:00:00.000Z")
   }]};
  if(q.includes("FROM clean.phase5_cd_pre_task_v39"))
   return{rows};
  return{rows:[]};
 }};
 return{db,sql};
}
describe("V0091 owner READONLY exact task reconciliation (no auto-re-enroll)",()=>{
 it("confirms a matching source task and does not authorize replay",async()=>{
  const f=fake([{
   task_id:"77",state:"READY",
   manifest_sha256:base.P5_CD_AUDIT_MANIFEST_SHA256,
   packet_sha256:base.P5_CD_AUDIT_PACKET_SHA256,
   selected_native_t_utc:new Date(native),verified_snapshot_id:null
  }]);
  const r=await auditP5CdV0091OneFlightReadOnly(f.db,base);
  expect(r.status).toBe("EXACT_TASK_VISIBLE_NO_DUPLICATE_REGISTRATION");
  expect(r.taskId).toBe("77");
  expect(r.sourcePacketAndFirstNativeTMatch).toBe(true);
  expect(r.automaticRegistrationRetryAuthorizedByAudit).toBe(false);
  expect(r.databaseWrites).toBe(0);
  expect(f.sql.every(x=>!/^INSERT|^UPDATE|^DELETE|^CREATE/.test(x))).toBe(true);
  expect(f.sql.some(x=>x.includes("READ ONLY"))).toBe(true);
 });
 it("missing at readback does not prove the original commit was aborted",async()=>{
  const f=fake([]);
  const r=await auditP5CdV0091OneFlightReadOnly(f.db,base);
  expect(r.status).toBe(
   "NO_TASK_VISIBLE_IN_THIS_SNAPSHOT_NOT_PROOF_OF_ABORT");
  expect(r.taskId).toBeNull();
  expect(r.automaticRegistrationRetryAuthorizedByAudit).toBe(false);
  expect(r.providerCalls).toBe(0);
 });
 it("refuses changed native T or packet rather than overwriting",async()=>{
  const f=fake([{
   task_id:"77",state:"READY",
   manifest_sha256:base.P5_CD_AUDIT_MANIFEST_SHA256,
   packet_sha256:"c".repeat(64),
   selected_native_t_utc:new Date(native)
  }]);
  await expect(auditP5CdV0091OneFlightReadOnly(f.db,base))
   .rejects.toThrow("REGISTERED_TASK_MATCHES_FLIGHT_BUT_PACKET_OR_NATIVE_T_DRIFT");
  expect(f.sql.some(x=>x==="ROLLBACK")).toBe(true);
 });
 it("refuses broad/no exact flight scope without opening transaction",async()=>{
  const f=fake([]);
  await expect(auditP5CdV0091OneFlightReadOnly(f.db,{
   ...base,P5_CD_AUDIT_PACKET_SHA256:"bad"
  })).rejects.toThrow("EXACT_ONE_FLIGHT_PACKET_SCOPE_REQUIRED");
  expect(f.sql).toHaveLength(0);
 });
});
