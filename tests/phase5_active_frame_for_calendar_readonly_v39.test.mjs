import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectActiveFrameForP5Calendar} from '../scripts/v39_phase5_active_frame_for_calendar_readonly_once.mjs';
const H='a'.repeat(64),R='b'.repeat(64),M='c'.repeat(64);
function mock({noRegistry=false,badHash=false,emptyFrame=false,replica=false}={}){
 const queries=[];
 let rollback=0;
 const pool={async connect(){
   return {
    async query(sql,params=[]){
     queries.push([sql,params]);
     if(sql.startsWith('BEGIN ')||sql.startsWith('SET LOCAL ')||sql==='ROLLBACK'){
      if(sql==='ROLLBACK')rollback++;
      return {rows:[]};
     }
     if(sql.includes("current_database() name"))return {rows:[{name:'neondb',version:160000,replica,ro:'on',snapshot:'2026-11-08T10:00:00.000Z'}]};
     if(sql.includes("to_regclass('clean.adb_sampling_frame_registry')"))return {rows:[{registry:true,frame:true,state:true}]};
     if(sql==='SELECT COUNT(*)::int n FROM clean.adb_sampling_frame')return {rows:[{n:emptyFrame?0:88}]};
     if(sql==='SELECT COUNT(*)::int n FROM clean.adb_airport_sampling_state')return {rows:[{n:emptyFrame?0:88}]};
     if(sql.includes("WHERE registry_key='ACTIVE' LIMIT 2"))return {rows:noRegistry?[]:[{
      active_frame_version:'v39-phase5',frame_hash:badHash?'bad':H,activated_at:'2026-11-07T01:00:00.000Z',
      traffic_reference_hash:R,region_mapping_hash:M,tier_hash:H,reference_period_start:'2025-01-01',
      reference_period_end:'2025-12-31',traffic_retrieval_date:'2026-10-31',traffic_source_name:'TEST'
     }]};
     if(sql.includes('hash_mismatched_rows'))return {rows:[{
      all_rows:emptyFrame?0:88,hash_matched_rows:emptyFrame?0:88,hash_mismatched_rows:0,
      dual_eligible_verified:emptyFrame?0:88
     }]};
     if(sql.includes('GROUP BY tier,region'))return {rows:emptyFrame?[]:[
      {tier:'HUB',region:'Europe',eligible:6},
      {tier:'MID',region:'Europe',eligible:7},
      {tier:'REGIONAL',region:'Europe',eligible:11}
     ]};
     if(sql.includes("tier='HUB'"))return {rows:emptyFrame?[]:[
      {icao:'EGLL',region:'Europe'},{icao:'EHAM',region:'Europe'},
      {icao:'EDDF',region:'Europe'},{icao:'LFPG',region:'Europe'},
      {icao:'LEMD',region:'Europe'},{icao:'LIRF',region:'Europe'}
     ]};
     throw Error('UNEXPECTED_SQL');
    },release(){}
   };
 }};
 return {pool,queries,rollbacks:()=>rollback};
}
test('valid active frame is read as candidate but never signed',async()=>{
 const m=mock(),v=await inspectActiveFrameForP5Calendar(m.pool);
 assert.equal(v.status,'ACTIVE_FRAME_STRUCTURAL_CANDIDATE_REQUIRES_REVIEW');
 assert.equal(v.activeFrameHash,H);
 assert.equal(v.hubCandidatesNotYetApproved.length,6);
 assert.deepEqual(v.eligibleREGIONALRegions,['Europe']);
 assert.equal(v.actualFiveAnchorPoolSelected,false);
 assert.equal(v.phase5ScientificFreezePassed,false);
 assert.equal(v.providerCalls,0);
 assert.equal(v.databaseWrites,0);
 assert.equal(m.rollbacks(),1);
 assert(m.queries.some(([q])=>q==='BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'));
 assert(m.queries.every(([q])=>!/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|COMMIT)\b/i.test(q)));
});
test('absence of registry does not convert old rows to a frozen frame',async()=>{
 const m=mock({noRegistry:true}),v=await inspectActiveFrameForP5Calendar(m.pool);
 assert.equal(v.status,'HOLD_NO_VERIFIED_ACTIVE_SAMPLING_FRAME');
 assert(v.unresolvedReasons.includes('ACTIVE_FRAME_REGISTRY_NOT_EXACTLY_ONE'));
 assert.equal(v.allFrameVersionRows,88);
 assert.equal(v.activeFrameVersion,null);
 assert.equal(m.rollbacks(),1);
});
test('invalid frame hash is HOLD, no airport candidate claim',async()=>{
 const m=mock({badHash:true}),v=await inspectActiveFrameForP5Calendar(m.pool);
 assert(v.unresolvedReasons.includes('ACTIVE_FRAME_HASH_OR_VERSION_NOT_FROZEN'));
 assert.deepEqual(v.hubCandidatesNotYetApproved,[]);
});
test('empty version is HOLD, not fabricated eligibility',async()=>{
 const m=mock({emptyFrame:true}),v=await inspectActiveFrameForP5Calendar(m.pool);
 assert(v.unresolvedReasons.includes('ACTIVE_FRAME_EMPTY'));
 assert(v.unresolvedReasons.includes('FEWER_THAN_FIVE_ELIGIBLE_HUBS'));
 assert(v.unresolvedReasons.includes('NO_ELIGIBLE_MID_REGION'));
});
test('read replica fails closed and rolls back',async()=>{
 const m=mock({replica:true});
 await assert.rejects(inspectActiveFrameForP5Calendar(m.pool),/NOT_PG16_READONLY_PRIMARY/);
 assert.equal(m.rollbacks(),1);
});
