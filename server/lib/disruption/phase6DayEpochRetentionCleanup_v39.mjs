/** Owner-only private day-index expiry maintenance. No new table, role,
 * provider request, or packet deletion. Plan by metadata, retire an entire
 * day atomically, preserve the existing content-free genesis claim.
 * A production caller still needs separately approved retention policy and
 * owner execution. Do not infer permission from a digest or test receipt.
 */
const INDEX="phase6_private.signed_run_day_index_revision_v39";
const CLAIM="phase6_private.signed_run_day_epoch_claim_v39";
const fail=s=>{throw Error("HOLD_P6_DAY_EXPIRY_CLEANUP_"+s);};
const sha=/^[a-f0-9]{64}$/;
export async function retireP6ExpiredDayEpochsOnce({client,scope}){
 if(!client||typeof client.query!=="function"||
    scope?.independentDayIndexRetentionCleanupApproved!==true||
    !sha.test(scope.approvedRetentionPolicySha256??"")||
    scope.existingPaidDispatchApproved!==false||
    !["PREVIEW_ONLY","RETIRE_EXPIRED_DAYS"].includes(scope.mode)||
    !Array.isArray(scope.runDayIndices)||scope.runDayIndices.length<1||
    scope.runDayIndices.length>31||
    new Set(scope.runDayIndices).size!==scope.runDayIndices.length||
    scope.runDayIndices.some(n=>!Number.isSafeInteger(n)||n<1||n>31))
   fail("UNAPPROVED_EXACT_DAY_SCOPE");
 const days=[...scope.runDayIndices].sort((a,b)=>a-b),apply=scope.mode==="RETIRE_EXPIRED_DAYS";
 let tx=false,commitStarted=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL "+(apply?"SERIALIZABLE READ WRITE":"REPEATABLE READ READ ONLY"));tx=true;
  await client.query("SET LOCAL statement_timeout='15000ms'");
  await client.query("SET LOCAL lock_timeout='3000ms'");
  const who=await client.query("SELECT current_database() AS db,current_user AS actor,session_user AS login,current_setting('server_version_num')::int AS version,current_setting('transaction_read_only') AS ro,pg_is_in_recovery() AS replica");
  const ident=who.rows[0];
  if(who.rowCount!==1||ident.db!=="neondb"||ident.actor!=="neondb_owner"||
     ident.login!=="neondb_owner"||ident.version<160000||ident.version>=170000||
     ident.replica!==false||ident.ro!==(apply?"off":"on"))fail("NOT_EXISTING_PG16_OWNER");
  // Prevent concurrent append or another cleanup between selecting head and
  // deleting all versions. No provider work and no byte hydration in lock.
  if(apply)await client.query("LOCK TABLE "+INDEX+" IN SHARE ROW EXCLUSIVE MODE");
  const now=(await client.query("SELECT clock_timestamp() AS now")).rows[0]?.now;
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))fail("ACTUAL_CLOCK");
  const q=await client.query("WITH d AS (SELECT run_day_index,revision,retention_not_after_utc, "+
   "lag(retention_not_after_utc) OVER(PARTITION BY run_day_index ORDER BY revision) AS previous_expiry FROM "+INDEX+
   " WHERE run_day_index=ANY($1::int[])) SELECT run_day_index AS day,count(*)::int AS n,min(revision)::int AS first,"+
   "max(revision)::int AS last,bool_or(retention_not_after_utc <= $2::timestamptz) AS any_expired,"+
   "bool_or(previous_expiry IS NOT NULL AND retention_not_after_utc>previous_expiry) AS expiry_extended FROM d GROUP BY run_day_index ORDER BY run_day_index",[days,now]);
  const claims=await client.query("SELECT run_day_index FROM "+CLAIM+" WHERE run_day_index=ANY($1::int[]) ORDER BY run_day_index",[days]);
  const claimDays=new Set(claims.rows.map(x=>x.run_day_index));
  const eligible=[];let expected=0;
  for(const row of q.rows){
   if(!days.includes(row.day)||!claimDays.has(row.day)||row.first!==1||
      !Number.isSafeInteger(row.n)||row.n!==row.last||row.n<1||row.n>1024||
      row.expiry_extended!==false||typeof row.any_expired!=="boolean")
    fail("INDEX_CHAIN_OR_RETENTION_DRIFT");
   // Retention never extends on append; if any revision expired then the
   // latest has expired. Retire all rather than reveal an older live head.
   if(row.any_expired){eligible.push(row.day);expected+=row.n;}
  }
  let removed=0;
  if(apply&&eligible.length){
   const ret=await client.query("DELETE FROM "+INDEX+" WHERE run_day_index=ANY($1::int[])",[eligible]);
   removed=ret.rowCount;
   if(removed!==expected)fail("ATOMIC_RETIRE_COUNT_DRIFT");
   const left=await client.query("SELECT count(*)::int AS n FROM "+INDEX+" WHERE run_day_index=ANY($1::int[])",[eligible]);
   const kept=await client.query("SELECT count(*)::int AS n FROM "+CLAIM+" WHERE run_day_index=ANY($1::int[])",[eligible]);
   if(left.rows[0]?.n!==0||kept.rows[0]?.n!==eligible.length)fail("RETIRE_READBACK_OR_CLAIM_DRIFT");
  }
  if(apply){commitStarted=true;await client.query("COMMIT");}else await client.query("ROLLBACK");
  tx=false;
  return {status:apply?"EXPIRED_DAY_INDEX_ATOMIC_RETIRE_COMMITTED":"EXPIRED_DAY_INDEX_RETIRE_PREVIEW_NO_WRITE",
   requestedDays:days.length,eligibleDayCount:eligible.length,eligibleRevisionCount:expected,
   removedRevisionCount:removed,retiredRunDayIndices:apply?eligible:[],eligibleRunDayIndices:eligible,
   observedDbClockUtc:now.toISOString(),providerCalls:0,packetDeletes:0,
   providerContentsRightsCertifiedHere:false,backupDeletionCertifiedHere:false,phase6PaidGo:false};
 }catch(e){
  if(tx)await client.query("ROLLBACK").catch(()=>{});
  if(commitStarted)fail("COMMIT_UNKNOWN_READBACK_NO_BLIND_RETRY");
  if(/^HOLD_P6_DAY_EXPIRY_CLEANUP_[A-Z0-9_]+$/.test(String(e?.message??"")))throw e;
  fail("OWNER_TRANSACTION_REDACTED");
 }
}
