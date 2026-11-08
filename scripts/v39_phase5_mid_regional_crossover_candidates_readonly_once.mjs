/**
 * Phase5 owner-only B0062 MID/REGIONAL crossover candidate metadata.
 * One verified PG16 neondb READ ONLY REPEATABLE READ + ROLLBACK;
 * NO paid provider HTTP, no raw original bytes, no database writes,
 * no preselected future random airport draw or signed crossover pair.
 */
import pg from "pg";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";
import {resolve} from "node:path";
const {Pool}=pg;
const FRAME=Object.freeze({
 version:"frame_02ec6e78ba1fe3c2",
 hash:"02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94",
 trafficHash:"8dd10dd0b5e0e9f493ad823a37f0852b6882fef49f45ee7965af557408264424",
 regionHash:"4073cc05e958bf98b6501e418198305f80e7d17892318f6773d9e0aac9d3a764",
 tierHash:"18cd871421220e72cd96044ae790fc95bdae1d69b9f9e43ac35566fd786eb7dc"
});
export const REGIONS=Object.freeze([
 "Asia-Pacific","Europe","Gulf/Africa","North America","Oceania","South America"
]);
export const TIERS=Object.freeze(["MID","REGIONAL"]);
const ICAO=/^[A-Z]{4}$/;
const fail=code=>{throw Error("HOLD_P5_B0062_MID_REGIONAL_CANDIDATES_"+code);};
const integer=v=>Number.isSafeInteger(Number(v))&&Number(v)>=0;
const finite=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v));
const expected=Object.freeze({
 MID:[53,149,15,181,19,10],
 REGIONAL:[80,167,28,251,27,34]
});
const checksum=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
export async function inspectP5MidRegionalCandidateFrame(pool){
 if(!pool||typeof pool.connect!=="function")fail("POOL_REQUIRED");
 const client=await pool.connect();let active=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");active=true;
  await client.query("SET LOCAL statement_timeout='15000ms'");
  await client.query("SET LOCAL lock_timeout='2000ms'");
  const db=(await client.query("SELECT current_database() db,current_setting('server_version_num')::int ver,pg_is_in_recovery() replica,current_setting('transaction_read_only') ro,clock_timestamp() observed_at")).rows?.[0];
  if(!db||db.db!=="neondb"||db.ver<160000||db.replica!==false||db.ro!=="on")
   fail("NOT_LIVE_PG16_NEONDB_READONLY_PRIMARY");
  const registry=(await client.query(
   "SELECT active_frame_version,frame_hash,traffic_reference_hash,region_mapping_hash,tier_hash FROM clean.adb_sampling_frame_registry WHERE registry_key='ACTIVE' LIMIT 2"
  )).rows;
  if(!Array.isArray(registry)||registry.length!==1||
     registry[0].active_frame_version!==FRAME.version||
     registry[0].frame_hash!==FRAME.hash||
     registry[0].traffic_reference_hash!==FRAME.trafficHash||
     registry[0].region_mapping_hash!==FRAME.regionHash||
     registry[0].tier_hash!==FRAME.tierHash)
   fail("ACTIVE_REFERENCE_CHANGED_SINCE_FOUR_HUB_READBACK");
  const counts=(await client.query(
   "SELECT COUNT(*)::int active_rows,COUNT(*) FILTER (WHERE frame_hash=$2)::int hash_matched,COUNT(*) FILTER (WHERE in_frame AND tier_verified AND pre_eligible AND post_eligible AND region IS NOT NULL)::int dual_eligible FROM clean.adb_sampling_frame WHERE frame_version=$1",
   [FRAME.version,FRAME.hash])).rows?.[0];
  if(!counts||counts.active_rows!==4346||counts.hash_matched!==4346||
     counts.dual_eligible!==1125)
   fail("ACTIVE_FRAME_COUNTS_CHANGED");
  // Original 14:20 UTC B0062 tier x region census before extra feed filters.
  const tiers=(await client.query(
   "SELECT tier,region,COUNT(*)::int n FROM clean.adb_sampling_frame WHERE frame_version=$1 AND frame_hash=$2 AND in_frame=true AND tier_verified=true AND pre_eligible=true AND post_eligible=true AND region=ANY($3::text[]) AND tier=ANY($4::text[]) GROUP BY tier,region ORDER BY tier,region",
   [FRAME.version,FRAME.hash,REGIONS,TIERS])).rows;
  if(!Array.isArray(tiers)||tiers.length!==12)fail("MISSING_TIER_REGION_CELL");
  const seenCells=new Set();
  for(const row of tiers){
   if(!TIERS.includes(row.tier)||!REGIONS.includes(row.region)||
      !integer(row.n)||seenCells.has(row.tier+"|"+row.region))
    fail("INVALID_REGION_CELL");
   seenCells.add(row.tier+"|"+row.region);
   if(row.n!==expected[row.tier][REGIONS.indexOf(row.region)])
    fail("REGION_COUNTS_DIFFER_FROM_LIVE_B0062");
  }
  const sql=[
   "WITH eligible AS (",
   " SELECT icao,tier,region,frame_hash,traffic_reference_hash,",
   " country_iso2,airport_timezone,feed_schedule,feed_live,feed_adsb,",
   " traffic_metric_name,traffic_metric_units,traffic_metric_value,",
   " out_degree,in_degree,undirected_degree,effective_carriers,intl_share",
   " FROM clean.adb_sampling_frame",
   " WHERE frame_version=$1 AND frame_hash=$2 AND traffic_reference_hash=$3",
   " AND tier=ANY($4::text[]) AND region=ANY($5::text[])",
   " AND in_frame=true AND tier_verified=true AND pre_eligible=true",
   " AND post_eligible=true AND feed_schedule=true",
   " AND (feed_live=true OR feed_adsb=true) AND exclusion_reason IS NULL",
   " AND traffic_metric_value>0 AND undirected_degree>=0",
   " AND effective_carriers>=0 AND intl_share>=0 AND intl_share<=1",
   "), ranked AS (",
   " SELECT *,COUNT(*) OVER (PARTITION BY tier,region)::int cell_count,",
   " ROW_NUMBER() OVER (PARTITION BY tier,region",
   " ORDER BY traffic_metric_value DESC NULLS LAST,icao ASC)::int rank",
   " FROM eligible",
   ") SELECT * FROM ranked WHERE rank<=4 ORDER BY tier,region,rank"
  ].join(" ");
  const ranked=(await client.query(sql,[
   FRAME.version,FRAME.hash,FRAME.trafficHash,TIERS,REGIONS
  ])).rows;
  if(!Array.isArray(ranked)||ranked.length>48)fail("OVERSIZED_CANDIDATE_RESULT");
  const candidates=[],seenIcaos=new Set(),seenRanks=new Set(),strictCounts=new Map();
  for(const x of ranked){
   const key=x.tier+"|"+x.region,rankKey=key+"|"+x.rank;
   if(!TIERS.includes(x.tier)||!REGIONS.includes(x.region)||
      !ICAO.test(x.icao??"")||seenIcaos.has(x.icao)||
      !integer(x.rank)||x.rank<1||x.rank>4||seenRanks.has(rankKey)||
      !integer(x.cell_count)||x.cell_count<1||
      x.frame_hash!==FRAME.hash||x.traffic_reference_hash!==FRAME.trafficHash||
      x.feed_schedule!==true||(x.feed_live!==true&&x.feed_adsb!==true)||
      x.traffic_metric_name!=="observed_commercial_movements"||
      x.traffic_metric_units!=="resolved observed departures per fixed 365-day reference period"||
      !finite(x.traffic_metric_value)||Number(x.traffic_metric_value)<=0||
      !finite(x.undirected_degree)||!finite(x.effective_carriers)||
      !finite(x.intl_share)||Number(x.intl_share)<0||Number(x.intl_share)>1)
    fail("INVALID_CANDIDATE_METADATA");
   seenIcaos.add(x.icao);seenRanks.add(rankKey);
   if(strictCounts.has(key)&&strictCounts.get(key)!==x.cell_count)
    fail("INCONSISTENT_STRICT_CELL_COUNT");
   strictCounts.set(key,x.cell_count);
   candidates.push({
    icao:x.icao,tier:x.tier,region:x.region,referenceRank:x.rank,
    strictlyQualifiedInRegion:x.cell_count,
    country:x.country_iso2??null,timezone:x.airport_timezone??null,
    observedDepartures:Number(x.traffic_metric_value),
    undirectedDegree:Number(x.undirected_degree),
    effectiveCarriers:Number(x.effective_carriers),
    observedInternationalShare:Number(x.intl_share),
    hasScheduleFeed:true,hasLiveFeed:x.feed_live===true,hasAdsbFeed:x.feed_adsb===true
   });
  }
  const lacking=[];
  for(const tier of TIERS)for(const region of REGIONS){
   const k=tier+"|"+region,count=expected[tier][REGIONS.indexOf(region)];
   const list=candidates.filter(x=>x.tier===tier&&x.region===region);
   if(!list.length||list.length!==Math.min(4,strictCounts.get(k)??0)||
      list.length>count)lacking.push(k);
  }
  const result={
   schema:"phase5.b0062.mid-regional-crossover-shortlist-readonly.v1",
   status:lacking.length?"HOLD_INCOMPLETE_STRICT_MID_REGIONAL_CELLS":
     "MID_REGIONAL_12_CELLS_CANDIDATES_ONLY_NOT_PAIR_FREEZE",
   observedUtc:new Date(db.observed_at).toISOString(),
   frameVersion:FRAME.version,frameHash:FRAME.hash,
   trafficReferenceHash:FRAME.trafficHash,
   regionMappingHash:FRAME.regionHash,tierHash:FRAME.tierHash,
   totalActiveFrameRows:counts.active_rows,verifiedDualEligibleRows:counts.dual_eligible,
   exactTierRegionCounts:tiers.map(x=>({tier:x.tier,region:x.region,count:x.n})),
   missingStrictCells:lacking,
   shortlistPolicy:"up_to_4_per_tier_region_by_frozen_historical_departures_not_selected_airports",
   candidatesSha256:checksum({frameHash:FRAME.hash,regionHash:FRAME.regionHash,
      tierHash:FRAME.tierHash,candidates}),
   candidates,ownerHubAnchors:["WSSS","OMAA","SKBO","YSSY"],
   crossoverPairsSelected:false,crossoverPairAirportsFrozen:false,
   ordinaryRunDayAirportsPreselected:false,randomizationPerformed:false,
   historicalFiveAnchorGate2Passed:false,sourceRightsCertified:false,
   realFidsReachabilityCertified:false,calendarSigned:false,
   phase5ScientificFreeze:false,phase6PaidGo:false,
   providerCalls:0,dbWrites:0,webhookPosts:0
  };
  await client.query("ROLLBACK");active=false;
  return result;
 }catch(e){if(active)await client.query("ROLLBACK").catch(()=>{});throw e;}
 finally{client.release();}
}
async function main(){
 let pool;
 try{
  if(!process.env.DATABASE_URL||!process.env.V39_DATABASE_RUNTIME_URL||
     process.env.DATABASE_URL===process.env.V39_DATABASE_RUNTIME_URL||
     process.env.GITHUB_ACTIONS==="true")fail("OWNER_NONRUNTIME_URL_REQUIRED");
  pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,
   connectionTimeoutMillis:12000,application_name:"p5_b0062_mid_regional_readonly"});
  const result=await inspectP5MidRegionalCandidateFrame(pool);
  console.log(JSON.stringify(result,null,2));
  console.log("P5_MID_REGIONAL_CANDIDATE_FRAME_READONLY_NO_PROVIDER_NO_DB_WRITES");
 }catch(e){console.error("HOLD_P5_MID_REGIONAL_CANDIDATE_READONLY_NO_RELEASE");
  process.exitCode=2;
 }finally{if(pool)await pool.end().catch(()=>{});}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)
 await main();
