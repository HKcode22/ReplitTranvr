/**
 * Read-only owner-selected FOUR hub candidate check against the already ACTIVE
 * B0062 frame. Owner's Oct 14 research design direction is not a fifth-anchor
 * Gate2 pass, a legal Contents license, or Phase6 paid authorization.
 * No provider calls or writes. No Stage1/Stage2 promotions inferred from traffic.
 */
import pg from 'pg';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {Pool}=pg;
const ICAOS=Object.freeze(['WSSS','OMAA','SKBO','YSSY']);
const HASH=/^[0-9a-f]{64}$/;
const REGION=new Set(['North America','Europe','Asia-Pacific','Gulf/Africa','South America','Oceania']);
const fail=s=>{throw Error('HOLD_PHASE5_FOUR_ANCHOR_FRAME_'+s)};
const num=v=>v===null||v===undefined?null:Number.isFinite(Number(v))?Number(v):null;
export async function inspectOwnerFourAnchorFrame(pool) {
 if(!pool||typeof pool.connect!=='function')fail('NO_DATABASE_POOL');
 const c=await pool.connect();let begun=false;
 try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');begun=true;
  await c.query("SET LOCAL statement_timeout='12000ms'");
  await c.query("SET LOCAL lock_timeout='2000ms'");
  const db=(await c.query("SELECT current_database() db,current_setting('server_version_num')::int ver,pg_is_in_recovery() replica,current_setting('transaction_read_only') ro,clock_timestamp() now_utc")).rows?.[0];
  if(!db||db.db!=='neondb'||db.ver<160000||db.replica!==false||db.ro!=='on')
   fail('NOT_PG16_READONLY_PRIMARY');
  const reg=(await c.query("SELECT active_frame_version,frame_hash,traffic_reference_hash,region_mapping_hash,tier_hash FROM clean.adb_sampling_frame_registry WHERE registry_key='ACTIVE' LIMIT 2")).rows;
  if(reg?.length!==1||typeof reg[0].active_frame_version!=='string'||
     ![reg[0].frame_hash,reg[0].traffic_reference_hash,
       reg[0].region_mapping_hash,reg[0].tier_hash].every(x=>typeof x==='string'&&HASH.test(x)))
   fail('NO_EXACT_HASHED_ACTIVE_FRAME');
  const registry=reg[0];
  const rows=(await c.query(
   `SELECT icao,frame_version,frame_hash,traffic_reference_hash,
           tier,region,in_frame,tier_verified,pre_eligible,post_eligible,
           feed_schedule,feed_live,feed_adsb,exclusion_reason,
           country_iso2,airport_timezone,traffic_metric_name,traffic_metric_units,
           traffic_metric_value,out_degree,in_degree,undirected_degree,
           effective_carriers,intl_share
      FROM clean.adb_sampling_frame
     WHERE frame_version=$1 AND icao=ANY($2::text[])
     ORDER BY icao`,
   [registry.active_frame_version,ICAOS])).rows;
  if(!Array.isArray(rows)||rows.length>4)fail('INCONSISTENT_OR_DUPLICATE_ROWS');
  if(rows.some(x=>typeof x.icao!=='string'||!ICAOS.includes(x.icao)))
   fail('UNKNOWN_FRAME_CANDIDATE');
  const by=new Map(rows.map(x=>[x.icao,x]));
  const sites=ICAOS.map(icao=>{
   const x=by.get(icao);
   if(!x)return {icao,found:false,frameHubDualEligible:false,
     problems:['MISSING_FROM_ACTIVE_FRAME']};
   const problems=[];
   if(x.frame_version!==registry.active_frame_version||
      x.frame_hash!==registry.frame_hash||
      x.traffic_reference_hash!==registry.traffic_reference_hash)
     problems.push('FRAME_OR_REFERENCE_HASH_MISMATCH');
   if(x.tier!=='HUB'||x.tier_verified!==true||x.in_frame!==true)
     problems.push('NOT_VERIFIED_HUB_IN_FRAME');
   if(x.pre_eligible!==true||x.post_eligible!==true||
      x.feed_schedule!==true||(x.feed_live!==true&&x.feed_adsb!==true))
     problems.push('NOT_DUAL_PRE_POST_FEED_ELIGIBLE');
   if(!REGION.has(x.region))problems.push('UNMAPPED_REGION');
   if(x.exclusion_reason!==null)problems.push('EXCLUSION_REASON_PRESENT');
   const metrics={
     trafficMetricName:x.traffic_metric_name??null,
     trafficMetricUnits:x.traffic_metric_units??null,
     trafficMetricValue:num(x.traffic_metric_value),
     outDegree:num(x.out_degree),inDegree:num(x.in_degree),
     undirectedDegree:num(x.undirected_degree),
     effectiveCarriers:num(x.effective_carriers),intlShare:num(x.intl_share)
   };
   if(Object.values(metrics).slice(2).some(v=>v===null) ||
       !(metrics.trafficMetricValue>0)||
       metrics.undirectedDegree<0||metrics.effectiveCarriers<0||
       metrics.intlShare<0||metrics.intlShare>1)
     problems.push('MISSING_OR_INVALID_EXOGENOUS_METRICS');
   return {icao,found:true,region:x.region??null,tier:x.tier??null,
     feedSchedule:x.feed_schedule===true,feedLive:x.feed_live===true,
     feedAdsb:x.feed_adsb===true,preEligible:x.pre_eligible===true,
     postEligible:x.post_eligible===true,timezone:x.airport_timezone??null,
     countryIso2:x.country_iso2??null,metrics,
     frameHubDualEligible:problems.length===0,problems};
  });
  const findings=sites.flatMap(s=>s.problems.map(code=>({icao:s.icao,code})));
  const result={
   schema:'phase5.owner-four-anchor-exact-active-frame-readonly.v1',
   status:findings.length===0?
     'FOUR_OWNER_ANCHORS_FRAME_ELIGIBLE_ONLY_NOT_FREEZE':
     'HOLD_OWNER_FOUR_ANCHOR_FRAME_ELIGIBILITY',
   observedUtc:new Date(db.now_utc).toISOString(),
   frameVersion:registry.active_frame_version,
   frameHash:registry.frame_hash,trafficReferenceHash:registry.traffic_reference_hash,
   regionMappingHash:registry.region_mapping_hash,tierHash:registry.tier_hash,
   ownerChosenProspectiveAnchorIcaos:ICAOS,
   observedRows:rows.length,sites,findings,
   historicFiveAnchorGate2Pass:false,oldYssyP25DeliveryGapClosedScientifically:false,
   ownerFourAnchorPlanResearchDraftOnly:true,stage2CapacityAndScoreCertified:false,
   sourceRightsCertified:false,providerWindowLengthVerified:false,
   activeCalendarSigned:false,phase5ScientificFreeze:false,phase6PaidGo:false,
   providerCalls:0,dbWrites:0,webhookPosts:0
  };
  await c.query('ROLLBACK');begun=false;
  return result;
 }catch(e){if(begun)await c.query('ROLLBACK').catch(()=>{});throw e;}
 finally{c.release();}
}
async function main(){
 let pool;
 try{
  if(!process.env.DATABASE_URL||!process.env.V39_DATABASE_RUNTIME_URL||
     process.env.DATABASE_URL===process.env.V39_DATABASE_RUNTIME_URL||
     process.env.GITHUB_ACTIONS==='true')fail('OWNER_NONRUNTIME_URL_REQUIRED');
  pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,
    connectionTimeoutMillis:12000,application_name:'p5_four_anchor_frame_readonly'});
  console.log(JSON.stringify(await inspectOwnerFourAnchorFrame(pool),null,2));
  console.log('PHASE5_FOUR_ANCHOR_ACTIVE_FRAME_READONLY_NO_PROVIDER_NO_DB_WRITES');
 }catch(e){console.error('HOLD_PHASE5_OWNER_FOUR_ANCHOR_FRAME_READONLY_UNAVAILABLE');
  process.exitCode=2;
 }finally{if(pool)await pool.end().catch(()=>{});}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)
 await main();
