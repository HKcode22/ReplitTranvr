import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectOwnerFourAnchorFrame} from '../scripts/v39_phase5_owner_four_anchor_active_frame_readonly_once.mjs';
const H='a'.repeat(64),R='b'.repeat(64),M='c'.repeat(64),T='d'.repeat(64);
const sites=['WSSS','OMAA','SKBO','YSSY'];
function makeMock(opts={}){
 const queries=[],frameRows=sites.map((icao,i)=>({
  icao,frame_version:'frame_01',frame_hash:opts.mismatch===icao?'0'.repeat(64):H,
  traffic_reference_hash:R,tier:opts.wrongTier===icao?'MID':'HUB',
  region:['Asia-Pacific','Gulf/Africa','South America','Oceania'][i],
  in_frame:true,tier_verified:true,pre_eligible:true,
  post_eligible:opts.ineligible===icao?false:true,
  feed_schedule:true,feed_live:true,feed_adsb:false,
  exclusion_reason:null,country_iso2:['SG','AE','CO','AU'][i],
  airport_timezone:['Asia/Singapore','Asia/Dubai','America/Bogota','Australia/Sydney'][i],
  traffic_metric_name:'observed_movements',traffic_metric_units:'count',
  traffic_metric_value:10000-i*1000,out_degree:50,in_degree:50,
  undirected_degree:100,effective_carriers:30,intl_share:0.7
 }));
 if(opts.missing)frameRows.splice(frameRows.findIndex(x=>x.icao===opts.missing),1);
 if(opts.badMetric)frameRows.find(x=>x.icao===opts.badMetric).traffic_metric_value=null;
 let rollback=0;
 const pool={async connect(){return {
  async query(sql,params=[]){
   queries.push({sql,params});
   if(sql.startsWith('BEGIN ')||sql.startsWith('SET LOCAL ')||sql==='ROLLBACK'){
    if(sql==='ROLLBACK')rollback++;return {rows:[]};
   }
   if(sql.includes('current_database() db'))return {rows:[{db:'neondb',ver:160000,
     replica:opts.replica??false,ro:'on',now_utc:'2026-11-08T14:20:54.706Z'}]};
   if(sql.includes("FROM clean.adb_sampling_frame_registry WHERE registry_key='ACTIVE'"))
    return {rows:opts.noRegistry?[]:[{active_frame_version:'frame_01',
      frame_hash:H,traffic_reference_hash:R,region_mapping_hash:M,tier_hash:T}]};
   if(sql.includes('FROM clean.adb_sampling_frame')) {
    assert.deepEqual(params,['frame_01',sites]);
    return {rows:frameRows};
   }
   throw Error('UNEXPECTED_SQL');
  },release(){}
 }}};
 return {pool,queries,rollbacks:()=>rollback};
}
test('all four owner-chosen sites yield structural candidate only; zero DB/provider writes',async()=>{
 const m=makeMock(),r=await inspectOwnerFourAnchorFrame(m.pool);
 assert.equal(r.status,'FOUR_OWNER_ANCHORS_FRAME_ELIGIBLE_ONLY_NOT_FREEZE');
 assert.deepEqual(r.ownerChosenProspectiveAnchorIcaos,sites);
 assert.deepEqual(r.sites.map(x=>x.icao),sites);
 assert.equal(r.sites.filter(x=>x.frameHubDualEligible).length,4);
 assert.equal(r.frameHash,H);assert.equal(r.phase5ScientificFreeze,false);
 assert.equal(r.historicFiveAnchorGate2Pass,false);
 assert.equal(r.stage2CapacityAndScoreCertified,false);
 assert.equal(r.providerCalls,0);assert.equal(r.dbWrites,0);
 assert.equal(m.rollbacks(),1);
 assert(m.queries.some(({sql})=>sql==='BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'));
 assert(m.queries.every(({sql})=>!/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|COMMIT)\b/i.test(sql)));
});
test('missing one owner site is recorded; not automatically replaced by high traffic HUB',async()=>{
 const r=await inspectOwnerFourAnchorFrame(makeMock({missing:'SKBO'}).pool);
 assert.equal(r.status,'HOLD_OWNER_FOUR_ANCHOR_FRAME_ELIGIBILITY');
 assert(r.findings.some(x=>x.icao==='SKBO'&&x.code==='MISSING_FROM_ACTIVE_FRAME'));
 assert.equal(r.observedRows,3);
});
test('tier mismatch, broken POST, reference hash and missing exogenous input each prevent structural certification',async()=>{
 for(const opts of [{wrongTier:'YSSY'},{ineligible:'OMAA'},{mismatch:'WSSS'},{badMetric:'SKBO'}]){
  const r=await inspectOwnerFourAnchorFrame(makeMock(opts).pool);
  assert.equal(r.status,'HOLD_OWNER_FOUR_ANCHOR_FRAME_ELIGIBILITY');
  assert(r.findings.length>0);
 }
});
test('no active frozen registry refuses and rolls back',async()=>{
 const m=makeMock({noRegistry:true});
 await assert.rejects(inspectOwnerFourAnchorFrame(m.pool),/NO_EXACT_HASHED_ACTIVE_FRAME/);
 assert.equal(m.rollbacks(),1);
});
test('read replica refuses before frame candidates and rolls back',async()=>{
 const m=makeMock({replica:true});
 await assert.rejects(inspectOwnerFourAnchorFrame(m.pool),/NOT_PG16_READONLY_PRIMARY/);
 assert.equal(m.rollbacks(),1);
});
