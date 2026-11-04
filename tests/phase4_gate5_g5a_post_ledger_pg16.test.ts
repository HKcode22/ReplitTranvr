import {describe,it,expect} from "vitest";
import pg from "pg";
import {postReservationUuidV39,reserveG5APostSlotDbV39,
 G5A_POST_AGGREGATE_AUDIT_SQL_V39}
 from "../scripts/v39_phase4_gate5_g5a_prospective_post_schedule_observation";

const suite=process.env.G5A_POST_TEST_PG16==="1"?describe:describe.skip;
const M="a".repeat(64), N="b".repeat(64), K="c".repeat(64);
const url=process.env.G5A_POST_TEST_WRITER_URL??"";
const qid="WSSS_G5A_20261105_1400Z";
suite("actual isolated PG16 immutable G5A POST budget, rights, replay",()=>{
 it("runs the actual schedule-revision SQL under the restricted POST writer on PG16",async()=>{
  const db=new pg.Client({connectionString:url});
  await db.connect();
  let tx=false;
  try{
   await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
   tx=true;
   const fixedIds=[0,1,2].map(n=>postReservationUuidV39(M,n));
   const result=await db.query(G5A_POST_AGGREGATE_AUDIT_SQL_V39,[M,fixedIds]);
   // No real flight records exist in the disposable fixture. A zero-row
   // result is correct, but the actual SQL must parse, typecheck and execute
   // with the exact restricted reader grants used by the live POST job.
   expect(result.rows).toEqual([]);
   await db.query("ROLLBACK");tx=false;
  }finally{
   if(tx)await db.query("ROLLBACK").catch(()=>undefined);
   await db.end().catch(()=>undefined);
  }
 });
 it("reserves only 3 unique 2-unit POST attempts after 18 source units",async()=>{
  const db=new pg.Client({connectionString:url});
  await db.connect();
  try{
   // The disposable test setup pre-inserts three cohort budgets as
   // privileged schema bootstrap; this writer must NOT have INSERT on
   // the budget table merely to run a postflight observation.
   const id0=await reserveG5APostSlotDbV39(db,M,qid,0);
   const id1=await reserveG5APostSlotDbV39(db,M,qid,1);
   const id2=await reserveG5APostSlotDbV39(db,M,qid,2);
   expect([id0,id1,id2]).toEqual([0,1,2].map(i=>postReservationUuidV39(M,i)));
   const result=await db.query(
    "SELECT reserved_units FROM clean.phase4_g5_fids_cohort_budget_v39 "+
    "WHERE manifest_sha256=$1",[M]);
   expect(Number(result.rows[0].reserved_units)).toBe(24);
   const ledger=await db.query(
    "SELECT count(*)::int n,sum(units)::int spent FROM clean.adb_rest_attempt_ledger "+
    "WHERE cycle_id=$1",["G5A_NOV05_1400Z_"+M.slice(0,32)]);
   expect(ledger.rows[0].n).toBe(3);
   expect(ledger.rows[0].spent).toBe(6);
   await expect(reserveG5APostSlotDbV39(db,M,qid,0))
    .rejects.toThrow("P4_G5_G5A_POST_PROJECT_24_UNIT_BUDGET_HOLD");
   // Missing earlier POST attempts are genuinely unknown, not a reason to
   // prohibit the later independent source observation opportunity.
   const last=await reserveG5APostSlotDbV39(db,N,qid+'_N',2);
   expect(last).toBe(postReservationUuidV39(N,2));
   const gap=await db.query(
    "SELECT reserved_units FROM clean.phase4_g5_fids_cohort_budget_v39 "+
    "WHERE manifest_sha256=$1",[N]);
   expect(Number(gap.rows[0].reserved_units)).toBe(20);
   await expect(reserveG5APostSlotDbV39(db,N,qid+'_N',1))
    .rejects.toThrow("P4_G5_G5A_POST_POST_RESERVATION_REPLAY_OR_FOREIGN_SLOT_HOLD");
   await expect(reserveG5APostSlotDbV39(db,K,qid+'_K',0))
    .rejects.toThrow("P4_G5_G5A_POST_PROJECT_24_UNIT_BUDGET_HOLD");
   const all=await db.query(
    "SELECT count(*)::int n FROM clean.adb_rest_attempt_ledger "+
    "WHERE category='g5a_post_schedule_fids'");
   expect(all.rows[0].n).toBe(4);
   const perms=await db.query(`SELECT
    has_table_privilege(current_user,'clean.adb_rest_attempt_ledger','INSERT') i,
    has_table_privilege(current_user,'clean.adb_rest_attempt_ledger','SELECT') s,
    has_table_privilege(current_user,'clean.adb_rest_attempt_ledger','UPDATE') u,
    has_table_privilege(current_user,'clean.adb_rest_attempt_ledger','DELETE') d,
    has_schema_privilege(current_user,'clean','CREATE') c`);
   expect(perms.rows[0]).toMatchObject({
    i:true,s:true,u:false,d:false,c:false
   });
  }finally{await db.end().catch(()=>undefined)}
 });
});
