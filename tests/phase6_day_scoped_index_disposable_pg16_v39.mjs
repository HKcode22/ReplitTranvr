/**
 * Only executed against GitHub Actions disposable postgres:16 service.
 * NEVER receives the owner's existing Replit DATABASE_URL.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import pg from "pg";

const fail=s=>{throw Error("DISPOSABLE_DAY_EPOCH_TEST_HOLD_"+s);};
if(process.env.CI!=="true"||
 process.env.P6_DAY_EPOCH_DISPOSABLE_TEST_ONLY!=="1"||
 process.env.DATABASE_URL||
 process.env.AERODATABOX_API_KEY||
 process.env.RAPIDAPI_KEY||
 !process.env.P6_TEST_DATABASE_URL?.startsWith(
 "postgresql://neondb_owner:ci-only-day-epoch@127.0.0.1:5432/neondb?sslmode=disable"))
 fail("NOT_PROVEN_DISPOSABLE_NO_PROVIDER_PG16");

const TABLE="phase6_private.signed_run_day_index_revision_v39";
const CLAIM="phase6_private.signed_run_day_epoch_claim_v39";
const digest=b=>createHash("sha256").update(b).digest("hex");
const now=Date.now();
const reviewed=new Date(now-10_000).toISOString();
const expire=new Date(now+60*60*1000).toISOString();
const mk=(day,rev,prev=null,until=expire,at=reviewed)=>{
 const payload=Buffer.from(JSON.stringify({
  schema:"CI_TEST_DAY_EPOCH_NONPROVIDER",runDayIndex:day,revision:rev,
  payload:["ci-only",day,rev,"z".repeat(160)]
 }));
 return{
  payload,hash:digest(payload),
  params:[day,rev,prev,digest(payload),
   "a".repeat(40),"b".repeat(64),"c".repeat(64),
   "d".repeat(64),"e".repeat(64),"f".repeat(64),
   at,until,payload]
 };
};
const INSERT="INSERT INTO "+TABLE+
 " (run_day_index,revision,previous_index_sha256,content_sha256,"+
 " reviewed_code_sha,manifest_sha256,calendar_sha256,"+
 " release_sha256,rights_sha256,external_review_sha256,"+
 " externally_reviewed_at_utc,retention_not_after_utc,payload_bytes)"+
 " VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)";

const db=new pg.Client({connectionString:process.env.P6_TEST_DATABASE_URL});
await db.connect();
try{
 const status=(await db.query(
  "SELECT current_database() AS db,current_user AS actor,"+
  "current_setting('server_version_num')::integer AS version,"+
  "to_regclass('phase6_private.signed_day_shard_index_revision_v39') IS NOT NULL AS bad_legacy"
 )).rows[0];
 assert.equal(status.db,"neondb");
 assert.equal(status.actor,"neondb_owner");
 assert.equal(status.version>=160000&&status.version<170000,true);
 assert.equal(status.bad_legacy,false);
 const d1r1=mk(1,1),d2r1=mk(2,1),d31r1=mk(31,1);
 await db.query(INSERT,d1r1.params);
 await db.query(INSERT,d2r1.params);
 await db.query(INSERT,d31r1.params);
 const d1r2=mk(1,2,d1r1.hash);
 await db.query(INSERT,d1r2.params);
 const initial=await db.query("SELECT run_day_index,revision FROM "+TABLE+
  " ORDER BY run_day_index,revision");
 assert.deepEqual(initial.rows,[
  {run_day_index:1,revision:1},{run_day_index:1,revision:2},
  {run_day_index:2,revision:1},{run_day_index:31,revision:1}
 ]);
 // No cross-day parent hash is accepted, even if its literal SHA is valid.
 await assert.rejects(db.query(INSERT,mk(2,2,d1r2.hash).params),
  /P6_DAY_EPOCH_NO_LIVE_SAME_DAY_SHA_PREDECESSOR/);
 await assert.rejects(db.query(INSERT,mk(1,3,"0".repeat(64)).params),
  /P6_DAY_EPOCH_NO_LIVE_SAME_DAY_SHA_PREDECESSOR/);
 await assert.rejects(db.query(INSERT,mk(3,2,d1r1.hash).params),
  /P6_DAY_EPOCH_NO_LIVE_SAME_DAY_SHA_PREDECESSOR/);
 await assert.rejects(db.query(INSERT,mk(1,1).params));
 await assert.rejects(db.query(
  "UPDATE "+TABLE+" SET content_sha256=$1 WHERE run_day_index=1 AND revision=2",
  ["0".repeat(64)]),/P5_V0094_IMMUTABLE_PACKET_NO_UPDATE/);
 await assert.rejects(db.query(
  "DELETE FROM "+CLAIM+" WHERE run_day_index=1"),
  /P5_V0094_IMMUTABLE_PACKET_NO_UPDATE/);
 await assert.rejects(db.query(INSERT,
  mk(3,1,null,new Date(now-1000).toISOString(),new Date(now-3600000).toISOString()).params),
  /P6_DAY_EPOCH_FUTURE_REVIEW_OR_EXPIRED_INDEX/);
 await assert.rejects(db.query(INSERT,
  mk(3,1,null,new Date(now+8*86400000).toISOString()).params));

 // Physical byte removal by a separately approved owner must not erase
 // the day claim or permit genesis replay. No real deletion occurs here.
 const deleted=await db.query("DELETE FROM "+TABLE+" WHERE run_day_index=1");
 assert.equal(deleted.rowCount,2);
 await assert.rejects(db.query(INSERT,mk(1,1).params),
  /signed_run_day_epoch_claim_v39_pkey/);
 const remaining=await db.query(
  "SELECT run_day_index,revision FROM "+TABLE+" ORDER BY run_day_index");
 assert.deepEqual(remaining.rows,[
  {run_day_index:2,revision:1},{run_day_index:31,revision:1}
 ]);
 const claims=await db.query(
  "SELECT run_day_index FROM "+CLAIM+" ORDER BY run_day_index");
 assert.deepEqual(claims.rows,[
  {run_day_index:1},{run_day_index:2},{run_day_index:31}
 ]);
 // Other study-day epochs remain readable after the first day was purged.
 const d2r2=mk(2,2,d2r1.hash);
 await db.query(INSERT,d2r2.params);
 // All 31 parent study days have their OWN genesis. They do not inherit a
 // prior day's private provider bytes, prior hash or short retention clock.
 for(let day=3;day<=30;day++){
  await db.query(INSERT,mk(day,1).params);
 }
 const statusFinal=await db.query(
  "SELECT COUNT(*)::integer AS n FROM "+TABLE);
 assert.equal(statusFinal.rows[0].n,31); // day1 purged, day2 has 2 revisions
 const allClaims=await db.query(
  "SELECT COUNT(*)::integer AS n, COUNT(DISTINCT run_day_index)::integer AS days"+
  " FROM "+CLAIM);
 assert.deepEqual(allClaims.rows[0],{n:31,days:31});
 // Only original two groups may read/append, never delete/UPDATE.
 const acl=await db.query(
  "SELECT has_table_privilege('phase6_private_frozen_reader_v39',$1,'SELECT') AS reader_select,"+
  "has_table_privilege('phase6_private_frozen_reader_v39',$1,'INSERT') AS reader_insert,"+
  "has_table_privilege('phase6_private_frozen_publisher_v39',$1,'INSERT') AS publisher_insert,"+
  "has_table_privilege('phase6_private_frozen_publisher_v39',$1,'UPDATE') AS publisher_update,"+
  "has_table_privilege('phase6_private_frozen_publisher_v39',$1,'DELETE') AS publisher_delete,"+
  "has_table_privilege('phase6_private_frozen_publisher_v39',$2,'INSERT') AS claim_insert",
  [TABLE,CLAIM]);
 const a=acl.rows[0];
 assert.equal(a.reader_select,true);
 assert.equal(a.reader_insert,false);
 assert.equal(a.publisher_insert,true);
 assert.equal(a.publisher_update,false);
 assert.equal(a.publisher_delete,false);
 assert.equal(a.claim_insert,false);
 console.log(JSON.stringify({
  status:"DAY_SCOPED_PRIVATE_EPOCH_REAL_DISPOSABLE_PG16_PASS",
  syntheticRunDayEpochCount:31,
  liveIndexRevisionCountAfterDay1Purge:31,
  contentFreeDay1ReplayFencePresent:true,
  sameDayPriorSHAEnforced:true,
  noLegacyV0096Installed:true,
  existingV0094V0095RoleGroupsReused:true,
  externalSignerAndFull31DayWorkerStillRequired:true,
  productionDbWrites:0,providerCalls:0,phase6PaidGo:false
 }));
}finally{await db.end();}
