/** Phase5 owner-only READ ONLY active B0062 sampling frame inspection. NO provider. */
import pg from 'pg';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {Pool}=pg;
const SHA=/^[0-9a-f]{64}$/;
const ICAO=/^[A-Z]{4}$/;
const fail=s=>{throw Error('HOLD_P5_ACTIVE_FRAME_'+s)};
export async function inspectActiveFrameForP5Calendar(pool) {
 if(!pool||typeof pool.connect!=='function')fail('POOL_REQUIRED');
 let c,tx=false;
 try{
  c=await pool.connect();await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');tx=true;
  await c.query("SET LOCAL statement_timeout='12000ms'");
  await c.query("SET LOCAL lock_timeout='2000ms'");
  const db=(await c.query("SELECT current_database() name,current_setting('server_version_num')::int version,pg_is_in_recovery() replica,current_setting('transaction_read_only') ro,clock_timestamp() snapshot")).rows[0];
  if(!db||db.name!=='neondb'||db.version<160000||db.replica!==false||db.ro!=='on')fail('NOT_PG16_READONLY_PRIMARY');
  const catalog=(await c.query("SELECT to_regclass('clean.adb_sampling_frame_registry') IS NOT NULL registry,to_regclass('clean.adb_sampling_frame') IS NOT NULL frame,to_regclass('clean.adb_airport_sampling_state') IS NOT NULL state")).rows[0];
  if(!catalog?.registry||!catalog?.frame||!catalog?.state)fail('FRAME_BASELINE_TABLES_MISSING');
  const all=(await c.query('SELECT COUNT(*)::int n FROM clean.adb_sampling_frame')).rows[0]?.n;
  const state=(await c.query('SELECT COUNT(*)::int n FROM clean.adb_airport_sampling_state')).rows[0]?.n;
  if(!Number.isSafeInteger(all)||all<0||!Number.isSafeInteger(state)||state<0)fail('INVALID_BASELINE_COUNTS');
  const reg=(await c.query("SELECT active_frame_version,frame_hash,activated_at,traffic_reference_hash,region_mapping_hash,tier_hash,reference_period_start::text AS reference_period_start,reference_period_end::text AS reference_period_end,traffic_retrieval_date::text AS traffic_retrieval_date,traffic_source_name FROM clean.adb_sampling_frame_registry WHERE registry_key='ACTIVE' LIMIT 2")).rows;
  const out={
   status:'HOLD_NO_VERIFIED_ACTIVE_SAMPLING_FRAME',
   snapshotAtUtc:new Date(db.snapshot).toISOString(),database:'neondb',
   allFrameVersionRows:all,adaptiveSamplingStateRows:state,
   activeFrameVersion:null,activeFrameHash:null,referenceMetadata:null,
   versionRowCounts:null,eligibleRegionCounts:[],
   hubCandidatesNotYetApproved:[],eligibleMIDRegions:[],eligibleREGIONALRegions:[],
   unresolvedReasons:[],actualFiveAnchorPoolSelected:false,
   trueSourceCoverageCertifiedByThisScan:false,
   providerRightsVerifiedByThisScan:false,calendarSigned:false,
   phase5ScientificFreezePassed:false,phase6PaidGo:false,providerCalls:0,databaseWrites:0
  };
  if(reg.length!==1){
   out.unresolvedReasons.push('ACTIVE_FRAME_REGISTRY_NOT_EXACTLY_ONE');
  }else{
   const x=reg[0];
   if(typeof x.active_frame_version!=='string'||x.active_frame_version.length===0||!SHA.test(x.frame_hash??'')){
    out.unresolvedReasons.push('ACTIVE_FRAME_HASH_OR_VERSION_NOT_FROZEN');
   }else{
    const version=x.active_frame_version,hash=x.frame_hash;
    out.activeFrameVersion=version;out.activeFrameHash=hash;
    out.referenceMetadata={
     activatedAtUtc:x.activated_at?new Date(x.activated_at).toISOString():null,
     trafficReferenceHash:SHA.test(x.traffic_reference_hash??'')?x.traffic_reference_hash:null,
     regionMappingHash:SHA.test(x.region_mapping_hash??'')?x.region_mapping_hash:null,
     tierHash:SHA.test(x.tier_hash??'')?x.tier_hash:null,
     referencePeriodStart:x.reference_period_start?String(x.reference_period_start).slice(0,10):null,
     referencePeriodEnd:x.reference_period_end?String(x.reference_period_end).slice(0,10):null,
     trafficRetrievalDate:x.traffic_retrieval_date?String(x.traffic_retrieval_date).slice(0,10):null,
     trafficSourceName:x.traffic_source_name??null
    };
    const stats=(await c.query(
     'SELECT COUNT(*)::int all_rows,COUNT(*) FILTER(WHERE frame_hash=$2)::int hash_matched_rows,COUNT(*) FILTER(WHERE frame_hash IS DISTINCT FROM $2)::int hash_mismatched_rows,COUNT(*) FILTER(WHERE in_frame AND tier_verified AND pre_eligible AND post_eligible AND region IS NOT NULL)::int dual_eligible_verified FROM clean.adb_sampling_frame WHERE frame_version=$1',
     [version,hash])).rows[0];
    if(!stats||!['all_rows','hash_matched_rows','hash_mismatched_rows','dual_eligible_verified'].every(k=>Number.isSafeInteger(stats[k])&&stats[k]>=0))fail('FRAME_STATS_INVALID');
    out.versionRowCounts=stats;
    const groups=(await c.query(
     'SELECT tier,region,COUNT(*)::int eligible FROM clean.adb_sampling_frame WHERE frame_version=$1 AND frame_hash=$2 AND in_frame=true AND tier_verified=true AND pre_eligible=true AND post_eligible=true AND region IS NOT NULL GROUP BY tier,region ORDER BY tier,region',
     [version,hash])).rows;
    if(groups.length>120||groups.some(y=>!['HUB','MID','REGIONAL'].includes(y.tier)||typeof y.region!=='string'||y.region.length>80||!Number.isSafeInteger(y.eligible)||y.eligible<1))fail('REGION_GROUPS_INVALID');
    out.eligibleRegionCounts=groups.map(y=>({tier:y.tier,region:y.region,count:y.eligible}));
    const hubs=(await c.query(
     "SELECT icao,region FROM clean.adb_sampling_frame WHERE frame_version=$1 AND frame_hash=$2 AND in_frame=true AND tier='HUB' AND tier_verified=true AND pre_eligible=true AND post_eligible=true AND region IS NOT NULL ORDER BY traffic_metric_value DESC NULLS LAST,icao ASC LIMIT 20",
     [version,hash])).rows;
    if(hubs.some(y=>!ICAO.test(y.icao??'')||typeof y.region!=='string'||y.region.length>80))fail('HUB_ICAO_INVALID');
    out.hubCandidatesNotYetApproved=hubs.map(y=>({icao:y.icao,region:y.region}));
    out.eligibleMIDRegions=[...new Set(groups.filter(y=>y.tier==='MID').map(y=>y.region))];
    out.eligibleREGIONALRegions=[...new Set(groups.filter(y=>y.tier==='REGIONAL').map(y=>y.region))];
    if(stats.all_rows===0)out.unresolvedReasons.push('ACTIVE_FRAME_EMPTY');
    if(stats.hash_mismatched_rows!==0)out.unresolvedReasons.push('ACTIVE_FRAME_HASH_MISMATCH');
    if(groups.filter(y=>y.tier==='HUB').reduce((n,y)=>n+y.eligible,0)<5)out.unresolvedReasons.push('FEWER_THAN_FIVE_ELIGIBLE_HUBS');
    if(!out.eligibleMIDRegions.length)out.unresolvedReasons.push('NO_ELIGIBLE_MID_REGION');
    if(!out.eligibleREGIONALRegions.length)out.unresolvedReasons.push('NO_ELIGIBLE_REGIONAL_REGION');
    if(!out.referenceMetadata.trafficReferenceHash||!out.referenceMetadata.regionMappingHash)out.unresolvedReasons.push('TRAFFIC_OR_REGION_REFERENCE_HASH_MISSING');
    if(!out.unresolvedReasons.length)out.status='ACTIVE_FRAME_STRUCTURAL_CANDIDATE_REQUIRES_REVIEW';
   }
  }
  await c.query('ROLLBACK');tx=false;return out;
 }catch(e){if(tx&&c)await c.query('ROLLBACK').catch(()=>{});throw e;}
 finally{if(c)c.release();}
}
async function main(){
 let pool;
 try{
  if(!process.env.DATABASE_URL||!process.env.V39_DATABASE_RUNTIME_URL||
     process.env.DATABASE_URL===process.env.V39_DATABASE_RUNTIME_URL||
     process.env.GITHUB_ACTIONS==='true')fail('OWNER_DATABASE_REQUIRED');
  pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,
   connectionTimeoutMillis:12000,application_name:'p5_active_frame_readonly'});
  console.log(JSON.stringify(await inspectActiveFrameForP5Calendar(pool)));
  console.log('PHASE5_OWNER_ACTIVE_FRAME_READONLY_DONE_NO_PROVIDER_NO_DB_WRITES');
 }catch(e){console.error('HOLD_P5_OWNER_ACTIVE_FRAME_SCAN_UNAVAILABLE');process.exitCode=2;}
 finally{if(pool)await pool.end().catch(()=>{});}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await main();
