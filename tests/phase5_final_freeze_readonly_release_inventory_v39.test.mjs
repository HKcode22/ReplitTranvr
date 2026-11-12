import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPhase5ReleaseInventory} from '../scripts/v39_phase5_final_freeze_readonly_release_inventory_once.mjs';

const names=[
 'phase5_fids_prepare_prod_20261107','phase5_fids_source_prod_20261107',
 'phase5_fids_pre_writer_prod_20261107','phase5_fids_t24_witness_prod_20261107',
 'phase5_fids_budget_freeze_prod_20261108','phase5_other_rest_review_prod_20261108',
 'phase5_other_rest_reserve_prod_20261108'
];
function fake({missing=[],roles=names,replica=false,counts={}}={}){
 const calls=[]; let release=0;
 const client={
  async query(sql,params=[]){
   calls.push([sql,params]);
   if(sql.startsWith('BEGIN ')||sql.startsWith('SET LOCAL ')||sql==='ROLLBACK'){
    if(sql==='ROLLBACK')release++;
    return {rows:[],rowCount:0};
   }
   if(sql.includes("current_database() db"))return {rows:[{
    db:'neondb',ver:160000,replica,ro:'on',at:'2026-11-08T08:00:00.000Z'
   }]};
   if(sql.includes('to_regclass($1::text)')){
    const n=params[0].slice('clean.'.length);
    return {rows:[{present:!missing.includes(n)}]};
   }
   if(sql.includes('FROM pg_catalog.pg_roles'))return {
    rows:roles.map(n=>({rolname:n,rolcanlogin:false}))
   };
   if(sql.includes('COUNT(*) FILTER (WHERE category_rows=7')){
    const days=counts.phase5_fids_utc_charge_budget_v39??0;
    const catRows=counts.phase5_fids_utc_rest_category_budget_v39??0;
    const complete=Math.min(days,Math.floor(catRows/7));
    return {rows:[{
     ledger_days:days,category_rows:catRows,
     complete_days:complete,incomplete_days:days-complete
    }]};
   }
   if(sql.includes('WHERE singleton_key=true AND enabled=true'))return {rows:[{n:0}]};
   if(sql.startsWith('SELECT COUNT(*)::int AS n FROM clean.')){
    const table=sql.slice('SELECT COUNT(*)::int AS n FROM clean.'.length);
    return {rows:[{n:counts[table]??0}]};
   }
   throw Error('UNEXPECTED_SQL');
  },
  release(){},
 };
 return {
  pool:{async connect(){return client;}},
  calls,rollbacks:()=>release
 };
}
test('read-only counts, full seven groups and no science FREEZE from one query',async()=>{
 const x=fake({counts:{
  adb_phase6_calendar_day:31,adb_sampling_draw:124,
  phase5_fids_seven_rest_release_v39:1,
  phase5_fids_cycle_rest_category_cap_v39:7,
  phase5_fids_cycle_budget_v39:1,
  phase5_fids_utc_charge_budget_v39:31,
  phase5_fids_utc_rest_category_budget_v39:217,
  phase5_fids_allowed_query_v39:20,
  phase5_fids_original_binding_v39:17,
  phase5_t24_postcommit_witness_v39:1
 }});
 const res=await inspectPhase5ReleaseInventory(x.pool);
 assert.equal(res.tableRowCounts.calendar,31);
 assert.equal(res.tableRowCounts.sourceCategoryCaps,7);
 assert.equal(res.physicalUtcChargeDayCategoryCoverage.ledgerDays,31);
 assert.equal(res.physicalUtcChargeDayCategoryCoverage.completeDays,31);
 assert.equal(res.physicalUtcChargeDayCategoryCoverage.incompleteDays,0);
 assert.equal(res.missingNoLoginRoles.length,0);
 assert.equal(res.providerCalls,0);
 assert.equal(res.databaseWrites,0);
 assert.equal(res.phase5ScientificFreezePassed,false);
 assert.equal(res.phase6PaidGo,false);
 assert.equal(res.blockers.length,0);
 assert.equal(res.noPhase6Day1EvidenceRequiredToReadPrelaunchInventory,true);
 assert.equal(res.releaseAuthorityFromCounts,false);
 assert.equal(res.previousPhase2To4EvidenceAssessed,false);
 assert.equal(res.independentReviewsNotAssessedByThisSql.length,4);
 assert.equal(res.phase6Day1EvidencePendingAfterGo.length,0);
 assert.equal(x.rollbacks(),1);
 assert(x.calls.some(([s])=>s==='BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'));
 assert(x.calls.every(([s])=>!/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|COMMIT)\b/i.test(s)));
});
test('empty installed schema reports real gaps, not readiness',async()=>{
 const x=fake(),res=await inspectPhase5ReleaseInventory(x.pool);
 assert.equal(res.tableRowCounts.sourceSevenRestRelease,0);
 assert(res.blockers.includes('ACTUAL_SIGNED_31_BATCH_DAY_CALENDAR_NOT_PROVEN'));
 assert(res.blockers.includes('SEVEN_CATEGORY_SOURCE_BUDGET_NOT_FROZEN'));
 assert(!res.blockers.includes('NO_LIVE_PHASE5_SOURCE_ORIGINAL_BINDING'));
 assert(res.phase6Day1EvidencePendingAfterGo.includes('DAY1_LIVE_SOURCE_ORIGINAL_NOT_YET_BOUND'));
 assert(res.phase6Day1EvidencePendingAfterGo.includes('DAY1_DURABLE_T24_WITNESS_NOT_YET_OBSERVED'));
 assert(res.phase6Day1EvidencePendingAfterGo.includes('DAY1_FOUR_AIRPORT_DRAW_NOT_YET_COMMITTED'));
 assert.equal(res.independentReviewsNotAssessedByThisSql.length,4);
 assert.equal(res.phase5ScientificFreezePassed,false);
 assert.equal(res.phase6PaidGo,false);
 assert.equal(x.rollbacks(),1);
});
test('a fully prepared prelaunch calendar and budget needs no real Day1 flights before FREEZE',async()=>{
 const x=fake({counts:{
  adb_phase6_calendar_day:31,
  phase5_fids_seven_rest_release_v39:1,
  phase5_fids_cycle_rest_category_cap_v39:7,
  phase5_fids_cycle_budget_v39:1,
  phase5_fids_utc_charge_budget_v39:31,
  phase5_fids_utc_rest_category_budget_v39:217
 }});
 const res=await inspectPhase5ReleaseInventory(x.pool);
 assert.deepEqual(res.blockers,[]);
 assert.equal(res.phase6AuthorizationEnabled,false);
 assert.equal(res.phase6Day1EvidencePendingAfterGo.length,4);
 assert.equal(res.independentReviewsNotAssessedByThisSql.length,4);
 assert.equal(res.phase5ScientificFreezePassed,false);
 assert.equal(res.phase6PaidGo,false);
 assert.equal(res.providerCalls,0);
 assert.equal(res.databaseWrites,0);
 assert.equal(x.rollbacks(),1);
});

test('seven source categories appearing on just one UTC day cannot pass 31-day readiness',async()=>{
 const x=fake({counts:{
  adb_phase6_calendar_day:31,
  phase5_fids_seven_rest_release_v39:1,
  phase5_fids_cycle_rest_category_cap_v39:7,
  phase5_fids_cycle_budget_v39:1,
  phase5_fids_utc_charge_budget_v39:1,
  phase5_fids_utc_rest_category_budget_v39:7
 }});
 const res=await inspectPhase5ReleaseInventory(x.pool);
 assert.equal(res.physicalUtcChargeDayCategoryCoverage.completeDays,1);
 assert.equal(res.physicalUtcChargeDayCategoryCoverage.incompleteDays,0);
 assert(res.prelaunchStructuralHolds.includes(
  'FULL_31_DAY_UTC_CHARGE_CATEGORY_COVERAGE_NOT_PROVEN'));
 assert.equal(res.phase5ScientificFreezePassed,false);
 assert.equal(res.phase6PaidGo,false);
 assert.equal(x.rollbacks(),1);
});
test('one missing category on Day31 blocks readiness despite all 31 charge-day rows',async()=>{
 const x=fake({counts:{
  adb_phase6_calendar_day:31,
  phase5_fids_seven_rest_release_v39:1,
  phase5_fids_cycle_rest_category_cap_v39:7,
  phase5_fids_cycle_budget_v39:1,
  phase5_fids_utc_charge_budget_v39:31,
  phase5_fids_utc_rest_category_budget_v39:216
 }});
 const res=await inspectPhase5ReleaseInventory(x.pool);
 assert.equal(res.physicalUtcChargeDayCategoryCoverage.ledgerDays,31);
 assert.equal(res.physicalUtcChargeDayCategoryCoverage.completeDays,30);
 assert.equal(res.physicalUtcChargeDayCategoryCoverage.incompleteDays,1);
 assert.equal(res.physicalUtcChargeDayCategoryCoverage.allLedgerDaysHaveSevenCategories,false);
 assert(res.prelaunchStructuralHolds.includes(
  'FULL_31_DAY_UTC_CHARGE_CATEGORY_COVERAGE_NOT_PROVEN'));
 assert.equal(res.providerCalls,0);
 assert.equal(res.databaseWrites,0);
 assert.equal(x.rollbacks(),1);
});
test('full seven category budget matrix is metadata only, never a license or GO',async()=>{
 const x=fake({counts:{
  adb_phase6_calendar_day:31,
  phase5_fids_seven_rest_release_v39:1,
  phase5_fids_cycle_rest_category_cap_v39:7,
  phase5_fids_cycle_budget_v39:1,
  phase5_fids_utc_charge_budget_v39:32,
  phase5_fids_utc_rest_category_budget_v39:224
 }});
 const res=await inspectPhase5ReleaseInventory(x.pool);
 assert.deepEqual(res.prelaunchStructuralHolds,[]);
 assert.deepEqual(res.physicalUtcChargeDayCategoryCoverage,{
  ledgerDays:32,categoryRows:224,completeDays:32,incompleteDays:0,
  allLedgerDaysHaveSevenCategories:true
 });
 assert.equal(res.releaseAuthorityFromCounts,false);
 assert.equal(res.phase5ScientificFreezePassed,false);
 assert.equal(res.phase6PaidGo,false);
 assert.equal(x.rollbacks(),1);
});
test('missing catalog is reported; no unauthorized data read',async()=>{
 const x=fake({missing:['phase5_other_rest_reviewed_call_v39'],roles:names.slice(0,5)});
 const res=await inspectPhase5ReleaseInventory(x.pool);
 assert(res.missingTables.includes('restReviewedCall'));
 assert.equal(res.tableRowCounts.restReviewedCall,null);
 assert.equal(res.missingNoLoginRoles.length,2);
 assert(res.blockers.includes('SCHEMA_OR_SOURCE_LEDGER_MISSING'));
});
test('replica or unexpected primary is refused in a read-only transaction',async()=>{
 const x=fake({replica:true});
 await assert.rejects(inspectPhase5ReleaseInventory(x.pool),/NOT_POSTGRES16_READONLY_PRIMARY/);
 assert.equal(x.rollbacks(),1);
});
