/**
 * Phase5 owner-only seeded 5-pair prospective CROSSOVER PRESELECTION.
 * Uses ALL current strict frozen MID+REGIONAL records, never a top-48-only
 * high-volume sample; output is five actual candidate airport sets, NOT an
 * approved/signed batch-day calendar or randomized treatment order.
 * Hard fail, NO PROVIDER HTTP, single READ ONLY PG16 tx and ROLLBACK.
 */
import pg from "pg";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";
import {resolve} from "node:path";
const {Pool}=pg;

const HUBS=Object.freeze([
 {icao:"WSSS",region:"Asia-Pacific"},
 {icao:"OMAA",region:"Gulf/Africa"},
 {icao:"SKBO",region:"South America"},
 {icao:"YSSY",region:"Oceania"}
]);
const REGIONS=Object.freeze([
 "Asia-Pacific","Europe","Gulf/Africa","North America","Oceania","South America"
]);
const TIERS=Object.freeze(["MID","REGIONAL"]);
const FRAME=Object.freeze({
 version:"frame_02ec6e78ba1fe3c2",
 frameHash:"02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94",
 trafficHash:"8dd10dd0b5e0e9f493ad823a37f0852b6882fef49f45ee7965af557408264424",
 regionHash:"4073cc05e958bf98b6501e418198305f80e7d17892318f6773d9e0aac9d3a764",
 tierHash:"18cd871421220e72cd96044ae790fc95bdae1d69b9f9e43ac35566fd786eb7dc",
 shortlistHash:"f960476cce18b0cb868440fc10c9815a3f95837da8b74a9a2f645ae659d22479"
});
// Generated via CSPRNG before looking at ANY FULL-FRAME selected airport IDs;
// recorded in reviewed source before DB query. Independent of future labels.
// Treatment-order random seed is NOT generated or revealed by this source.
export const PRECOMMITTED_AIRPORT_SELECTION_SEED=
 "71c2e5b845c8fce696c5371e05c3b5f06a43e2378a4a308867eb9a0a5f4be1e0";
export const SEED_COMMITMENT_SHA256=
 "c5e772c91a9e853f9db83378f4323a9670938fb9ec2a16ea4978ced60528703b";
const originalCounts={
 MID:[53,149,15,181,19,10],REGIONAL:[80,167,28,251,27,34]
};
const strictCounts={
 MID:[53,149,15,181,19,10],REGIONAL:[79,167,28,251,27,34]
};
const ICAO=/^[A-Z]{4}$/;
const SHA=/^[0-9a-f]{64}$/;
const fail=reason=>{throw Error("HOLD_PHASE5_FULL_FRAME_PAIR_PRESELECTION_"+reason);};
const sha=s=>createHash("sha256").update(s).digest("hex");
const hashJson=x=>sha(JSON.stringify(x));
const finite=x=>x!==null&&x!==undefined&&x!==""&&Number.isFinite(Number(x));
function normalized(xs){return [...new Set(xs.map(x=>x.trim()).filter(Boolean))].sort();}
function seededOrder(xs,seed){
 return [...xs].map((value,i)=>({
  value,k:hashJson(seed+"|"+i+"|"+JSON.stringify(value))
 })).sort((a,b)=>a.k.localeCompare(b.k)).map(x=>x.value);
}
function cyclePick(xs,i,seed){
 const cycle=Math.floor(i/xs.length);
 return seededOrder(xs,seed+"|cycle-"+cycle)[i%xs.length];
}
const CALENDAR_REGION_SEED=hashJson(
 PRECOMMITTED_AIRPORT_SELECTION_SEED+"|four-hub-calendar-region-seed");
const ANCHOR_ROTATION_SEED=hashJson(
 PRECOMMITTED_AIRPORT_SELECTION_SEED+"|four-hub-anchor-seed");
export function previewFirstFiveSlotRegions(){
 const regions=normalized(REGIONS);
 return Array.from({length:5},(_,i)=>{
  const HUB=cyclePick(HUBS,i,ANCHOR_ROTATION_SEED);
  const MID_A=cyclePick(regions,i,CALENDAR_REGION_SEED+"|MID_A");
  // Mirrors the reviewed calendar solver: when both MID slots have the
  // same six-region universe, shift a full seeded A permutation by a
  // nonzero reproducible offset. Both slots remain balanced per six draws.
  const cycle=Math.floor(i/regions.length);
  const aOrder=seededOrder(regions,CALENDAR_REGION_SEED+"|MID_A|cycle-"+cycle);
  const offset=1+(
   parseInt(hashJson(CALENDAR_REGION_SEED+
    "|MID_B_BALANCED_DERANGEMENT|cycle-"+cycle).slice(0,8),16)%
   (regions.length-1)
  );
  const MID_B=aOrder[((i%regions.length)+offset)%regions.length];
  if(MID_A===MID_B)fail("UNREACHABLE_BALANCED_MID_COLLISION");
  return {pairId:"pair-"+(i+1),HUB,
   MID_A,MID_B,
   REGIONAL:cyclePick(regions,i,CALENDAR_REGION_SEED+"|REGIONAL")};
 });
}
export function selectFiveRealPairCandidateTemplates(all){
 if(!Array.isArray(all)||all.length!==1013)fail("FULL_STRICT_CANDIDATE_COUNT_NOT_1013");
 if(!SHA.test(PRECOMMITTED_AIRPORT_SELECTION_SEED)||
    sha(Buffer.from(PRECOMMITTED_AIRPORT_SELECTION_SEED,"hex"))!==SEED_COMMITMENT_SHA256)
  fail("PRECOMMITTED_SELECTION_SEED_INVALID");
 const dedup=new Set(),byCell=new Map();
 for(const tier of TIERS)for(const region of REGIONS)
  byCell.set(tier+"|"+region,[]);
 for(const raw of all){
  const x=raw;
  if(!x||!ICAO.test(x.icao??"")||dedup.has(x.icao)||
     !TIERS.includes(x.tier)||!REGIONS.includes(x.region)||
     x.frame_hash!==FRAME.frameHash||
     x.traffic_reference_hash!==FRAME.trafficHash||
     x.feed_schedule!==true||
     (x.feed_live!==true&&x.feed_adsb!==true)||
     !finite(x.traffic_metric_value)||Number(x.traffic_metric_value)<=0||
     !finite(x.undirected_degree)||Number(x.undirected_degree)<0||
     !finite(x.effective_carriers)||Number(x.effective_carriers)<0||
     !finite(x.intl_share)||Number(x.intl_share)<0||
     Number(x.intl_share)>1||
     x.traffic_metric_name!=="observed_commercial_movements"||
     x.traffic_metric_units!=="resolved observed departures per fixed 365-day reference period")
   fail("INVALID_OR_DUPLICATED_FULL_FRAME_AIRPORT");
  dedup.add(x.icao);
  byCell.get(x.tier+"|"+x.region).push(x);
 }
 for(const tier of TIERS)for(let i=0;i<REGIONS.length;i++){
  const cell=tier+"|"+REGIONS[i],n=byCell.get(cell).length;
  if(n!==strictCounts[tier][i])fail("STRICT_REGION_COUNTS_CHANGED_"+cell);
 }
 const slots=previewFirstFiveSlotRegions(),used=new Set();
 const sets=slots.map(t=>{
  const result={HUB:{icao:t.HUB.icao,region:t.HUB.region}};
  for(const slot of ["MID_A","MID_B","REGIONAL"]){
   const tier=slot==="REGIONAL"?"REGIONAL":"MID",region=t[slot];
   // Independent hash ordering in each sampling stratum; 15 distinct
   // source-frame airports, never ranking by maximum traffic.
   const pool=byCell.get(tier+"|"+region);
   const order=[...pool].sort((a,b)=>{
    const ka=sha(PRECOMMITTED_AIRPORT_SELECTION_SEED+"|"+t.pairId+
     "|"+slot+"|"+a.icao);
    const kb=sha(PRECOMMITTED_AIRPORT_SELECTION_SEED+"|"+t.pairId+
     "|"+slot+"|"+b.icao);
    return ka.localeCompare(kb)||a.icao.localeCompare(b.icao);
   });
   const x=order.find(z=>!used.has(z.icao));
   if(!x)fail("NO_NEW_ELIGIBLE_AIRPORT_"+t.pairId+"_"+slot);
   used.add(x.icao);
   result[slot]={
    icao:x.icao,region:x.region,tier,
    frozenObservedDepartures:Number(x.traffic_metric_value),
    trafficMetricUnits:x.traffic_metric_units,
    undirectedDegree:Number(x.undirected_degree),
    effectiveCarriers:Number(x.effective_carriers),
    intlShare:Number(x.intl_share),
    feedSchedule:true,feedLive:x.feed_live===true,feedAdsb:x.feed_adsb===true
   };
  }
  if(new Set(["HUB","MID_A","MID_B","REGIONAL"].map(k=>result[k].icao)).size!==4)
   fail("PAIR_DUPLICATE_AIRPORT_"+t.pairId);
  return {pairId:t.pairId,airports:result,
   sourceFrameHashedSelection:true,
   templateOnlyBeforeTreatmentOrderRandomization:true};
 });
 if(used.size!==15)fail("NOT_15_DISTINCT_NON_HUB_AIRPORTS");
 if(new Set(sets.map(x=>x.airports.HUB.icao)).size!==4)
  fail("NOT_ALL_FOUR_OWNER_HUBS_IN_FIVE_PAIRS");
 return {
  schema:"phase5.full-b0062-five-pair-selection-review.v1",
  status:"FIVE_FULL_FRAME_PAIR_CANDIDATE_TEMPLATES_ONLY_NOT_FROZEN",
  frozenFrameVersion:FRAME.version,
  frozenFrameHash:FRAME.frameHash,
  trafficReferenceHash:FRAME.trafficHash,
  regionMappingHash:FRAME.regionHash,tierHash:FRAME.tierHash,
  sourceShortlistHash:FRAME.shortlistHash,
  independentAirportSelectionSeedHex:PRECOMMITTED_AIRPORT_SELECTION_SEED,
  airportSeedCommitmentSha256:SEED_COMMITMENT_SHA256,
  fourHubAnchorRotationSeed:ANCHOR_ROTATION_SEED,
  calendarRegionSeed:CALENDAR_REGION_SEED,
  scannedFullyQualifiedMidRegionalAirports:all.length,
  strictTierRegionCounts:TIERS.flatMap(tier=>REGIONS.map((region,i)=>({
   tier,region,originalB0062Eligible:originalCounts[tier][i],
   strictFeedQualified:strictCounts[tier][i]
  }))),
  firstFiveSlotRegions:slots,
  candidatePairAirportSets:sets,
  selectedAirportIcaosSha256:hashJson(
   sets.map(x=>({pairId:x.pairId,icaos:[
    x.airports.HUB.icao,x.airports.MID_A.icao,x.airports.MID_B.icao,
    x.airports.REGIONAL.icao]}))),
  sampledWithoutTop48TrafficTruncation:true,
  boundToOriginalFiveHubStage2Gate2:false,
  withinCrossoverPairTwoPeriodsReplaySameFourAirports:true,
  crossoverAirportSetSigned:false,
  independentTreatmentOrderSeedSet:false,
  treatmentOrderRandomized:false,
  thirtyOneBatchDayCalendarSigned:false,
  providerFidsSourceReachabilityVerified:false,
  providerContentsRightsVerified:false,
  sevenRestChargeCategoriesBudgetVerified:false,
  scientificPhase5FreezePassed:false,phase6PaidGo:false,
  providerCalls:0,databaseWrites:0,webhookPosts:0
 };
}
export async function inspectFiveCrossoverPairCandidatesReadOnly(pool){
 if(!pool||typeof pool.connect!=="function")fail("DB_POOL_REQUIRED");
 const c=await pool.connect();let begun=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");begun=true;
  await c.query("SET LOCAL statement_timeout='18000ms'");
  await c.query("SET LOCAL lock_timeout='2000ms'");
  const db=(await c.query(
   "SELECT current_database() db,current_setting('server_version_num')::int ver,pg_is_in_recovery() replica,current_setting('transaction_read_only') ro,clock_timestamp() observed_at"
  )).rows?.[0];
  if(!db||db.db!=="neondb"||db.ver<160000||db.replica!==false||db.ro!=="on")
   fail("NOT_PG16_PRIMARY_READONLY");
  const registry=(await c.query(
   "SELECT active_frame_version,frame_hash,traffic_reference_hash,region_mapping_hash,tier_hash FROM clean.adb_sampling_frame_registry WHERE registry_key='ACTIVE' LIMIT 2"
  )).rows;
  if(!Array.isArray(registry)||registry.length!==1||
     registry[0].active_frame_version!==FRAME.version||
     registry[0].frame_hash!==FRAME.frameHash||
     registry[0].traffic_reference_hash!==FRAME.trafficHash||
     registry[0].region_mapping_hash!==FRAME.regionHash||
     registry[0].tier_hash!==FRAME.tierHash)
   fail("FROZEN_FRAME_REFERENCE_DRIFT");
  const stats=(await c.query(
   "SELECT COUNT(*)::int n,COUNT(*) FILTER(WHERE frame_hash=$2)::int hashed,COUNT(*) FILTER(WHERE in_frame AND tier_verified AND pre_eligible AND post_eligible AND region IS NOT NULL)::int dual FROM clean.adb_sampling_frame WHERE frame_version=$1",
   [FRAME.version,FRAME.frameHash]
  )).rows?.[0];
  if(!stats||stats.n!==4346||stats.hashed!==4346||stats.dual!==1125)
   fail("ACTIVE_FRAME_4346_1125_CHANGED");
  const sql=[
   "SELECT icao,tier,region,frame_hash,traffic_reference_hash,",
   "feed_schedule,feed_live,feed_adsb,",
   "traffic_metric_name,traffic_metric_units,traffic_metric_value,",
   "undirected_degree,effective_carriers,intl_share",
   "FROM clean.adb_sampling_frame",
   "WHERE frame_version=$1 AND frame_hash=$2 AND traffic_reference_hash=$3",
   "AND tier=ANY($4::text[]) AND region=ANY($5::text[])",
   "AND in_frame=true AND tier_verified=true",
   "AND pre_eligible=true AND post_eligible=true",
   "AND feed_schedule=true AND (feed_live=true OR feed_adsb=true)",
   "AND exclusion_reason IS NULL",
   "AND traffic_metric_value>0 AND undirected_degree>=0",
   "AND effective_carriers>=0 AND intl_share>=0 AND intl_share<=1",
   "ORDER BY tier,region,icao"
  ].join(" ");
  const rows=(await c.query(sql,
   [FRAME.version,FRAME.frameHash,FRAME.trafficHash,TIERS,REGIONS])).rows;
  const out=selectFiveRealPairCandidateTemplates(rows);
  out.observedUtc=new Date(db.observed_at).toISOString();
  await c.query("ROLLBACK");begun=false;
  return out;
 }catch(e){if(begun)await c.query("ROLLBACK").catch(()=>{});throw e;}
 finally{c.release();}
}
async function main(){
 let pool;
 try{
  if(!process.env.DATABASE_URL||!process.env.V39_DATABASE_RUNTIME_URL||
     process.env.DATABASE_URL===process.env.V39_DATABASE_RUNTIME_URL||
     process.env.GITHUB_ACTIONS==="true")
   fail("OWNER_URLS_OR_ENV_INVALID");
  pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,
   connectionTimeoutMillis:15000,
   application_name:"p5_full_b0062_pair_preselection_readonly"});
  const out=await inspectFiveCrossoverPairCandidatesReadOnly(pool);
  console.log(JSON.stringify(out,null,2));
  console.log("PHASE5_FULL_FRAME_FIVE_PAIR_PRESELECTION_READONLY_NO_RELEASE");
 }catch(e){console.error("HOLD_PHASE5_PAIR_PRESELECTION_NO_PROVIDER_NO_MUTATIONS");
  process.exitCode=2;
 }finally{if(pool)await pool.end().catch(()=>{});}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)
 await main();
