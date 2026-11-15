/** Existing private transport expiry: owner-only, no new schema/role.
 * Physical SQL deletion only. Independent policy approval and account
 * backup/PITR handling are NOT supplied by this helper. Never hydrate
 * expired payloads, print paths, or retire a single latest revision.
 */
const I="phase6_private.signed_run_day_index_revision_v39",P="phase6_private.frozen_native_packet_v39",C="phase6_private.signed_run_day_epoch_claim_v39";
const H=/^[a-f0-9]{64}$/;
const hold=s=>{throw Error("HOLD_P6_PRIVATE_EXPIRY_"+s);};
const max=5000;
export async function maintainP6PrivateExpiryOnce({client,scope}){
 if(typeof client?.query!=="function"||scope?.independentPrivateExpiryPolicyApproved!==true||
    !H.test(scope.retentionPolicySha256??"")||!H.test(scope.manifestSha256??"")||
    scope.existingPaidDispatchApproved!==false||
    !["PREVIEW_ONLY","DELETE_EXPIRED_PRIMARY"].includes(scope.mode)||
    !Number.isSafeInteger(scope.packetBatchLimit)||scope.packetBatchLimit<1||scope.packetBatchLimit>max)
  hold("NO_EXACT_POLICY_SCOPE");
 const apply=scope.mode==="DELETE_EXPIRED_PRIMARY",m=scope.manifestSha256,limit=scope.packetBatchLimit;
 let tx=false,commitStarted=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL "+(apply?"SERIALIZABLE READ WRITE":"REPEATABLE READ READ ONLY"));tx=true;
  await client.query("SET LOCAL statement_timeout='20000ms'");
  await client.query("SET LOCAL lock_timeout='3000ms'");
  const who=await client.query("SELECT current_database() db,current_user actor,session_user login,current_setting('server_version_num')::int version,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica");
  const a=who.rows[0];
  if(who.rowCount!==1||a.db!=="neondb"||a.actor!=="neondb_owner"||a.login!==a.actor||a.version<160000||a.version>=170000||a.replica!==false||a.ro!==(apply?"off":"on"))hold("NOT_EXISTING_PRIMARY_OWNER");
  // Same order as V0101. Keep the write lock brief; readers retain access.
  if(apply)await client.query("LOCK TABLE "+P+", "+I+" IN SHARE ROW EXCLUSIVE MODE");
  const now=(await client.query("SELECT clock_timestamp() now")).rows[0]?.now;
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))hold("CLOCK");
  // One day cannot belong to two manifests. Never touch other studies.
  const foreign=await client.query("SELECT count(*)::int n FROM (SELECT run_day_index FROM "+I+" GROUP BY run_day_index HAVING count(DISTINCT manifest_sha256)>1) x");
  if(foreign.rows[0]?.n!==0)hold("CROSS_STUDY_DAY");
  const q=await client.query("WITH d AS (SELECT run_day_index,revision,retention_not_after_utc,lag(retention_not_after_utc) OVER (PARTITION BY run_day_index ORDER BY revision) former FROM "+I+" WHERE manifest_sha256=$1) SELECT run_day_index day,count(*)::int n,min(revision)::int first,max(revision)::int last,bool_or(retention_not_after_utc<=$2) expired,bool_or(former IS NOT NULL AND retention_not_after_utc>former) extended,EXISTS(SELECT 1 FROM "+C+" c WHERE c.run_day_index=d.run_day_index) claimed FROM d GROUP BY run_day_index ORDER BY run_day_index",[m,now]);
  const retire=[];let revisions=0;
  for(const x of q.rows){
   if(!Number.isSafeInteger(x.day)||x.day<1||x.day>31||x.first!==1||x.n!==x.last||x.n<1||x.n>1024||x.extended!==false||x.claimed!==true||typeof x.expired!=="boolean")hold("DAY_CHAIN_DRIFT");
   // Non-increasing expiry guarantees an expired revision means expired
   // head. Retire all revisions (even if an older one is still retained)
   // under the reviewed policy: no accidental prior-head fallback.
   if(x.expired){retire.push(x.day);revisions+=x.n;}
  }
  const counts=await client.query("SELECT count(*)::int n FROM "+P+" WHERE manifest_sha256=$1 AND retention_not_after_utc<=$2",[m,now]);
  const eligible=counts.rows[0]?.n;
  if(!Number.isSafeInteger(eligible)||eligible<0)hold("PACKET_COUNT");
  let removedPackets=0,removedRevisions=0;
  if(apply){
   if(retire.length){
    const d=await client.query("DELETE FROM "+I+" WHERE manifest_sha256=$1 AND run_day_index=ANY($2::int[])",[m,retire]);
    removedRevisions=d.rowCount;
    if(removedRevisions!==revisions)hold("REVISION_COUNT_DRIFT");
    const left=await client.query("SELECT (SELECT count(*)::int FROM "+I+" WHERE run_day_index=ANY($1::int[])) revisions,(SELECT count(*)::int FROM "+C+" WHERE run_day_index=ANY($1::int[])) claims",[retire]);
    if(left.rows[0]?.revisions!==0||left.rows[0]?.claims!==retire.length)hold("CLAIM_OR_REVISION_DRIFT");
   }
   // Selection is oldest expiry then path, but no paths/text are returned.
   // Expired leaf bytes are removed even if a live root refers to them.
   // Existing authenticated readers must refuse such missing references.
   if(eligible){
    const d=await client.query("WITH batch AS (SELECT logical_path FROM "+P+" WHERE manifest_sha256=$1 AND retention_not_after_utc<=$2 ORDER BY retention_not_after_utc,logical_path LIMIT $3) DELETE FROM "+P+" p USING batch b WHERE p.logical_path=b.logical_path AND p.manifest_sha256=$1 AND p.retention_not_after_utc<=$2",[m,now,limit]);
    removedPackets=d.rowCount;if(removedPackets!==Math.min(eligible,limit))hold("PACKET_COUNT_DRIFT");
   }
   const remaining=(await client.query("SELECT count(*)::int n FROM "+P+" WHERE manifest_sha256=$1 AND retention_not_after_utc<=$2",[m,now])).rows[0]?.n;
   if(remaining!==eligible-removedPackets)hold("PACKET_READBACK_DRIFT");
   commitStarted=true;await client.query("COMMIT");
  }else await client.query("ROLLBACK");
  tx=false;
  return {status:apply?"P6_PRIVATE_EXPIRED_PRIMARY_BATCH_COMMITTED":"P6_PRIVATE_EXPIRY_PREVIEW_NO_WRITE",observedDbClockUtc:now.toISOString(),
   eligibleDayCount:retire.length,eligibleRevisionCount:revisions,eligiblePacketCount:eligible,
   removedRevisionCount:removedRevisions,removedPacketCount:removedPackets,remainingAtObservedClock:eligible-removedPackets,
   preservedGenesisClaims:true,providerCalls:0,otherTablesTouched:false,backupDeletionCertified:false,phase6PaidGo:false};
 }catch(e){
  if(tx)await client.query("ROLLBACK").catch(()=>{});
  if(commitStarted)hold("UNKNOWN_COMMIT_FRESH_READBACK_REQUIRED");
  if(/^HOLD_P6_PRIVATE_EXPIRY_[A-Z0-9_]+$/.test(e?.message??""))throw e;
  hold("TRANSACTION_REDACTED");
 }
}
