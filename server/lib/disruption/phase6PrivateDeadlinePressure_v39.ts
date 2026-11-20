/** Restricted read-only deadline pressure census, not an expiry sweep or
 * permission to retire live custody. The original 2m/10m/24h/7d limits stay
 * unchanged. No packet payload, identity, content hash or path is selected.
 * Existing reader role only; no source/owner/paid credentials or new grant. */
import {readP6DayEpochRestrictedReaderClock} from "./phase6DayEpochSignedIndexOnce_v39.mjs";
type DB={query:(sql:string,args?:any[])=>Promise<any>};
const hold=(s:string):never=>{throw Error("HOLD_P6_PRIVATE_DEADLINE_PRESSURE_"+s);};
const knownKinds=new Set(["SOURCE_DAY_REGISTRY","SOURCE_QUERY_PACKET","LATER_PRE_PACKET","LATER_PRE_DAY_REGISTRY","POST_PACKET","SOURCE_DAY_PREPARE_REVIEW","T24_PRE_PACKET","T24_PRE_DAY_REGISTRY","T24_WITNESS_RECEIPT_CANDIDATE","PHASE7_SIGNED_REVIEW","PHASE7_RECOVERY_RECEIPT","PHASE7_RECOVERY_FENCE","INDEX_REVISION"]);
const counts=["total","due","withinTwoMinutes","withinTenMinutes","withinFifteenMinutes","withinOneHour"] as const;
type CensusGroup={kind:string;scope:"CURRENT"|"OTHER";total:number;due:number;withinTwoMinutes:number;withinTenMinutes:number;withinFifteenMinutes:number;withinOneHour:number;earliestSecondsRemaining:number};
const isCount=(v:unknown):v is number=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0;
const ms=(s:string)=>{const n=Date.parse(s);if(!Number.isFinite(n)||new Date(n).toISOString()!==s)hold("CLOCK");return n};
export const P6_PRIVATE_DEADLINE_PRESSURE_SQL=`
 WITH t AS MATERIALIZED (SELECT clock_timestamp() AS at),
 objects AS (
  SELECT kind,CASE WHEN manifest_sha256=$1 THEN 'CURRENT' ELSE 'OTHER' END AS scope,retention_not_after_utc AS deadline
  FROM phase6_private.frozen_native_packet_v39
  UNION ALL
  SELECT 'INDEX_REVISION',CASE WHEN manifest_sha256=$1 THEN 'CURRENT' ELSE 'OTHER' END,retention_not_after_utc
  FROM phase6_private.signed_run_day_index_revision_v39
 ),
 grouped AS (
  SELECT kind,scope,count(*)::int AS total,
   count(*) FILTER (WHERE deadline<=at)::int AS due,
   count(*) FILTER (WHERE deadline>at AND deadline<=at+interval '2 minutes')::int AS two,
   count(*) FILTER (WHERE deadline>at AND deadline<=at+interval '10 minutes')::int AS ten,
   count(*) FILTER (WHERE deadline>at AND deadline<=at+interval '15 minutes')::int AS fifteen,
   count(*) FILTER (WHERE deadline>at AND deadline<=at+interval '1 hour')::int AS hour,
   floor(min(extract(epoch FROM (deadline-at))))::bigint AS earliest
  FROM objects CROSS JOIN t GROUP BY kind,scope
 )
 SELECT t.at AS observed_at,coalesce((SELECT jsonb_agg(jsonb_build_object(
  'kind',kind,'scope',scope,'total',total,'due',due,'withinTwoMinutes',two,
  'withinTenMinutes',ten,'withinFifteenMinutes',fifteen,'withinOneHour',hour,
  'earliestSecondsRemaining',earliest) ORDER BY kind,scope) FROM grouped),'[]'::jsonb) AS groups
 FROM t`;
/** Positive-slack counts are exclusive of already due rows and cumulative.
 * These are observed clock buckets, not a guaranteed scheduler latency.
 * Report all foreign-manifest metadata too, never source contents or IDs. */
export async function readP6PrivateDeadlinePressure(client:DB,expectedReaderSessionLogin:string,reviewedManifestSha256:string){
 if(!/^[a-f0-9]{64}$/.test(reviewedManifestSha256??"")||/^([a-f0-9])\1{63}$/.test(reviewedManifestSha256))hold("MANIFEST");
 let tx=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await client.query("SET LOCAL statement_timeout='12000ms'");
  const before=await readP6DayEpochRestrictedReaderClock(client,expectedReaderSessionLogin);
  const q=await client.query(P6_PRIVATE_DEADLINE_PRESSURE_SQL,[reviewedManifestSha256]),x=q.rows?.[0];
  if(q.rowCount!==1||!(x?.observed_at instanceof Date)||!Array.isArray(x.groups)||x.groups.length>knownKinds.size*2)hold("BOUNDED_CENSUS");
  const at=x.observed_at.toISOString(),seen=new Set<string>(),groups:CensusGroup[]=[];
  for(const raw of x.groups){
   if(!raw||!knownKinds.has(raw.kind)||!["CURRENT","OTHER"].includes(raw.scope)||
    Object.keys(raw).length!==9||!counts.every(k=>isCount(raw[k]))||
    !Number.isSafeInteger(raw.earliestSecondsRemaining)||raw.total<1||
    raw.due>raw.total||raw.withinTwoMinutes>raw.withinTenMinutes||
    raw.withinTenMinutes>raw.withinFifteenMinutes||raw.withinFifteenMinutes>raw.withinOneHour||
    raw.due+raw.withinOneHour>raw.total||
    (raw.earliestSecondsRemaining<0&&raw.due===0)||
    (raw.earliestSecondsRemaining>0&&raw.due>0)||
    seen.has(raw.kind+":"+raw.scope))hold("INVALID_GROUP");
   seen.add(raw.kind+":"+raw.scope);
   groups.push(Object.freeze({kind:raw.kind,scope:raw.scope,total:raw.total,due:raw.due,
    withinTwoMinutes:raw.withinTwoMinutes,withinTenMinutes:raw.withinTenMinutes,
    withinFifteenMinutes:raw.withinFifteenMinutes,withinOneHour:raw.withinOneHour,
    earliestSecondsRemaining:raw.earliestSecondsRemaining}));
  }
  const end=await readP6DayEpochRestrictedReaderClock(client,expectedReaderSessionLogin);
  if(ms(before)>ms(at)||ms(at)>ms(end))hold("CLOCK_ORDER");
  const totals=Object.fromEntries(counts.map(k=>[k,groups.reduce((n,g)=>n+g[k],0)])) as Record<typeof counts[number],number>;
  if(!Object.values(totals).every(isCount))hold("TOTAL_OVERFLOW");
  const boundaryMayHaveCrossed=groups.some(g=>g.due===0&&g.earliestSecondsRemaining*1000<=ms(end)-ms(at));
  await client.query("ROLLBACK");tx=false;
  return Object.freeze({status:"PRIVATE_DEADLINE_PRESSURE_READONLY_NO_GO" as const,observedAtUtc:at,readCompletedAtUtc:end,
   groups:Object.freeze(groups),totals:Object.freeze(totals),otherManifestObjects:groups.filter(g=>g.scope==="OTHER").reduce((n,g)=>n+g.total,0),
   deadlineDueObserved:totals.due>0,deadlineBoundaryMayHaveCrossedDuringRead:boundaryMayHaveCrossed,
   withinExistingFifteenMinuteRelayCadence:totals.withinFifteenMinutes>0,
   physicalDeletionVerified:false,backupOrPitrVerified:false,schedulerLatencyBoundVerified:false,
   providerCalls:0,databaseWrites:0,phase6PaidGo:false});
 }finally{if(tx)await client.query("ROLLBACK").catch(()=>{});}
}
