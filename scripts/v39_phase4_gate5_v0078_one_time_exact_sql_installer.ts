/**
 * V0078 narrowly reviewed SINGLE-USE schema installer, NOT a collector.
 * Never executed by boot migrations/Actions against production.
 *
 * Needs exact source Git blob, explicit operator intent, two independently
 * read-only role preflights, a bounded ACCESS EXCLUSIVE DDL lock, and one
 * SERIALIZABLE transaction. Any failure before COMMIT rolls everything back.
 * An ambiguous COMMIT outcome requires a separate read-only check, never
 * blindly rerun the installer.
 */
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import pg from "pg";
import {inspectP4G5V0078TwoRoleV39} from "./v39_phase4_gate5_v0078_production_readonly_preflight";

export const P4_G5_V0078_MIGRATION_V39=
 "migrations/staged/V0078__phase4_gate5_fids_reobservation_uniqueness_v39.sql";
export const P4_G5_V0078_REVIEWED_GIT_BLOB_V39=
 "24d305fc4be6f426e762f5665c5ce37b55b666b7";
export const P4_G5_V0078_ONE_TIME_INTENT_V39=
 "V0078_ONE_TIME_ORIGINAL_FIDS_OBSERVATION_UNIQUENESS_NO_PROVIDER_NO_GRANTS";

export function assertP4G5V0078InstallIntentV39(env:NodeJS.ProcessEnv){
 if(env.V39_GATE5_V0078_INSTALL_INTENT!==P4_G5_V0078_ONE_TIME_INTENT_V39||
    env.V39_GATE5_V0078_EXPECTED_BLOB!==P4_G5_V0078_REVIEWED_GIT_BLOB_V39||
    ["1","true","yes","on"].includes(String(env.ADB_AUTO_COLLECT??"").toLowerCase())||
    ["1","true","yes","on"].includes(String(env.V39_PHASE6_PROCESS_ARMED??"").toLowerCase()))
  throw Error("P4_G5_V0078_UNREVIEWED_INTENT_OR_ACTIVE_AUTOCOLLECT_HOLD");
}
export function assertP4G5V0078PinnedSqlV39(bytes:string,gitBlob:string){
 if(gitBlob!==P4_G5_V0078_REVIEWED_GIT_BLOB_V39||
    typeof bytes!=="string"||bytes.length<4000||bytes.length>6500||
    !bytes.startsWith("-- V0078")||
    !bytes.includes("DROP CONSTRAINT flight_population_key;")||
    !bytes.includes("CREATE UNIQUE INDEX flight_population_legacy_nonfids_key_v39")||
    !bytes.includes("WHERE (source_type <> 'fids');")||
    !bytes.includes("V0078_TARGET_INDEX_ALREADY_EXISTS_HOLD")||
    !bytes.includes("V0078_QUERY_SOURCE_OBSERVATION_UNIQUENESS_UNVERIFIED_HOLD")||
    /^(?!\s*--).*\b(?:GRANT|REVOKE|TRUNCATE|DROP\s+(?:TABLE|SCHEMA)|ALTER\s+ROLE|CREATE\s+ROLE)\b/im.test(bytes))
  throw Error("P4_G5_V0078_PINNED_SQL_NOT_REVIEWED_HOLD");
}
const LEGACY=
 "UNIQUE (source_airport_icao, cutoff_utc, flight_number, carrier_iata, provider_record_key)";
const PRE_CATALOG_SQL=[
 "SELECT",
 "(SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c",
 "WHERE c.conrelid='clean.flight_population'::regclass",
 "AND c.conname='flight_population_key' AND c.contype='u') AS legacy,",
 "(SELECT pg_get_indexdef(i.oid) FROM pg_class i",
 "WHERE i.oid=to_regclass('clean.flight_population_observation_key')) AS observed,",
 "(SELECT count(*)::int FROM pg_constraint f",
 "WHERE f.contype='f' AND f.conindid=(",
 "SELECT c.conindid FROM pg_constraint c",
 "WHERE c.conrelid='clean.flight_population'::regclass",
 "AND c.conname='flight_population_key')) AS dependent_fks,",
 "(SELECT count(*)::int FROM clean.flight_population p",
 "WHERE p.source_type='fids' AND p.provider_content_expired_at_utc IS NULL",
 "AND (p.population_query_id IS NULL OR p.analytic_identity_id IS NULL",
 "OR p.population_role IS NULL)) AS bad_fids,"
 ,"(SELECT count(*)::int FROM pg_constraint c",
 "WHERE c.conrelid='clean.flight_population'::regclass",
 "AND c.conname='flight_population_fids_complete') AS fids_guard,",
 "(SELECT pg_get_indexdef(i.oid) FROM pg_class i",
 "WHERE i.oid=to_regclass('clean.flight_population_legacy_nonfids_key_v39')) AS replacement"
].join(" ");
const POST_CATALOG_SQL=[
 "SELECT",
 "(SELECT count(*)::int FROM pg_constraint c",
 "WHERE c.conrelid='clean.flight_population'::regclass",
 "AND c.conname='flight_population_key') AS legacy_count,",
 "(SELECT pg_get_indexdef(i.oid) FROM pg_class i",
 "WHERE i.oid=to_regclass('clean.flight_population_observation_key')) AS observed,",
 "(SELECT pg_get_indexdef(i.oid) FROM pg_class i",
 "WHERE i.oid=to_regclass('clean.flight_population_legacy_nonfids_key_v39')) AS replacement,",
 "(SELECT count(*)::int FROM pg_constraint c",
 "WHERE c.conrelid='clean.flight_population'::regclass",
 "AND c.conname='flight_population_fids_complete') AS fids_guard"
].join(" ");
const TABLE_PRIVS_SQL=[
 "SELECT c.relacl::text AS table_acl,c.relowner::text AS table_owner,",
 "c.relrowsecurity,c.relforcerowsecurity,",
 "(SELECT count(*)::int FROM pg_trigger t",
 "WHERE t.tgrelid=c.oid AND NOT t.tgisinternal) AS custom_trigger_count",
 "FROM pg_class c WHERE c.oid='clean.flight_population'::regclass"
].join(" ");
function obj(x:unknown){
 if(!x||typeof x!=="object"||Array.isArray(x))
  throw Error("P4_G5_V0078_BAD_CATALOG_HOLD");
 return x as Record<string,unknown>;
}
function single(rows:unknown[]){
 if(rows.length!==1)throw Error("P4_G5_V0078_BAD_CATALOG_HOLD");
 return obj(rows[0]);
}
export function assertP4G5V0078TransactionalCatalogV39(
 before:Record<string,unknown>,after:Record<string,unknown>,
 prePrivileges:Record<string,unknown>,postPrivileges:Record<string,unknown>
){
 if(before.legacy!==LEGACY||
    !String(before.observed??"").includes(
     "UNIQUE INDEX flight_population_observation_key")||
    !String(before.observed??"").includes(
     "(population_query_id, analytic_identity_id, population_role)")||
    before.replacement!==null||before.dependent_fks!==0||
    before.bad_fids!==0||before.fids_guard!==1)
  throw Error("P4_G5_V0078_LOCKED_PRE_DDL_CATALOG_CHANGED_HOLD");
 if(after.legacy_count!==0||after.fids_guard!==1||
    after.observed!==before.observed||
    !String(after.replacement??"").includes(
     "UNIQUE INDEX flight_population_legacy_nonfids_key_v39")||
    !String(after.replacement??"").includes(
     "WHERE (source_type <> 'fids'::text)"))
  throw Error("P4_G5_V0078_POST_DDL_SCHEMA_NOT_EXACT_HOLD");
 for(const f of ["table_acl","table_owner","relrowsecurity",
   "relforcerowsecurity","custom_trigger_count"])
  if(JSON.stringify(prePrivileges[f])!==JSON.stringify(postPrivileges[f]))
   throw Error("P4_G5_V0078_ACL_OWNER_OR_TRIGGER_MUTATION_HOLD");
}
export function assertP4G5V0078LockedPreCatalogV39(row:Record<string,unknown>){
 // Reuse post-validator with a synthetic *expected* policy output. Never
 // substitute this for the actual post-DDL catalog verification.
 if(row.legacy!==LEGACY||row.dependent_fks!==0||
    row.bad_fids!==0||row.replacement!==null||row.fids_guard!==1||
    !String(row.observed??"").includes(
     "UNIQUE INDEX flight_population_observation_key")||
    !String(row.observed??"").includes(
     "(population_query_id, analytic_identity_id, population_role)"))
  throw Error("P4_G5_V0078_LOCKED_PRE_DDL_CATALOG_CHANGED_HOLD");
}
export async function installP4G5V0078OnceV39(){
 assertP4G5V0078InstallIntentV39(process.env);
 const gitBlob=execFileSync("git",["rev-parse","HEAD:"+P4_G5_V0078_MIGRATION_V39],
  {encoding:"utf8",timeout:4000}).trim();
 const bytes=readFileSync(P4_G5_V0078_MIGRATION_V39,"utf8");
 assertP4G5V0078PinnedSqlV39(bytes,gitBlob);
 const reviewed=await inspectP4G5V0078TwoRoleV39();
 if(reviewed.status!=="V0078_PREINSTALL_CATALOG_CANDIDATE_ONLY_NEEDS_OWNER_REVIEW")
  throw Error("P4_G5_V0078_TWO_ROLE_PRODUCTION_READONLY_PREFLIGHT_HOLD");
 const url=process.env.DATABASE_URL;
 if(!url||!process.env.V39_DATABASE_RUNTIME_URL||url===
    process.env.V39_DATABASE_RUNTIME_URL)
  throw Error("P4_G5_V0078_DISTINCT_CONNECTIONS_REQUIRED_HOLD");
 const db=new pg.Client({connectionString:url,
  connectionTimeoutMillis:8000,query_timeout:70000,
  application_name:"v39_gate5_one_time_v0078_schema_owner"});
 let stage="CONNECT_PRIVILEGED",connected=false,tx=false,committed=false;
 try{
  await db.connect();connected=true;
  stage="BEGIN_BOUNDED_SERIALIZABLE_DDL";
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  tx=true;
  await db.query("SET LOCAL statement_timeout='60000ms'");
  await db.query("SET LOCAL lock_timeout='2000ms'");
  await db.query("SET LOCAL idle_in_transaction_session_timeout='65000ms'");
  stage="TAKE_OWNER_MIGRATION_ADVISORY_LOCK";
  const ownerLock=single((await db.query(
   "SELECT pg_try_advisory_xact_lock(78,39) AS owner_lock"
  )).rows);
  if(ownerLock.owner_lock!==true)
   throw Error("P4_G5_V0078_MIGRATION_OWNER_ADVISORY_LOCK_BUSY_HOLD");
  // A failed try-lock is a hard refusal, not a spin-wait.
  // The next LOCK TABLE serializes DDL and original source writes.
  stage="LOCK_POPULATION_EXCLUSIVELY_BOUNDED";
  await db.query("LOCK TABLE clean.flight_population IN ACCESS EXCLUSIVE MODE NOWAIT");
  stage="RECHECK_EXACT_PRODUCTION_SCHEMA_UNDER_LOCK";
  const before=single((await db.query(PRE_CATALOG_SQL)).rows);
  assertP4G5V0078LockedPreCatalogV39(before);
  const aclBefore=single((await db.query(TABLE_PRIVS_SQL)).rows);
  stage="APPLY_EXACT_PINNED_V0078_STAGE_SQL";
  await db.query(bytes);
  stage="POST_DDL_SCHEMA_ACL_AND_TRIGGER_VERIFICATION";
  const after=single((await db.query(POST_CATALOG_SQL)).rows);
  const aclAfter=single((await db.query(TABLE_PRIVS_SQL)).rows);
  assertP4G5V0078TransactionalCatalogV39(before,after,aclBefore,aclAfter);
  stage="COMMIT_ONCE_NO_RETRY";
  await db.query("COMMIT");
  tx=false;committed=true;
 }catch(e){
  console.error("P4_G5_V0078_INSTALL_STAGE_"+stage+"_HOLD");
  if(tx)await db.query("ROLLBACK").catch(()=>undefined);
  throw e;
 }finally{
  if(connected)await db.end().catch(()=>undefined);
 }
 // A failed post-COMMIT verification is NOT permission to re-run the DDL.
 // It requires independent read-only diagnosis of the possible committed state.
 if(committed){
  const post=await inspectP4G5V0078TwoRoleV39();
  if(post.status!=="V0078_ALREADY_PRESENT_DO_NOT_REINSTALL_HOLD"||
     !post.flags.alreadyV0078Present||!post.flags.v0077PrivateToRuntime)
   throw Error("P4_G5_V0078_POSTCOMMIT_READONLY_VERIFY_HOLD_DO_NOT_RETRY");
  const receipt={
   status:"V0078_PRODUCTION_LEGACY_KEY_REPLACEMENT_INSTALLED_ONCE",
   reviewedMigrationGitBlob:gitBlob,
   privateV0077Unchanged:true,
   nonFidsLegacyUniquenessPreserved:true,
   newFidsOriginalObservationUniquenessKeepsQueryIdentity:true,
   noRuntimeGrantOrSourceContentAlterations:true,
   providerCalls:0,databaseContentWrites:0,
   sourceRightsCertified:false,selectedTProviderNativeCertified:false,
   realProspectiveThreeHorizonPRECertified:false,
   scientificGate5Passed:false,phase5FreezeAuthorized:false,
   phase6Authorized:false
  };
  console.log(JSON.stringify(receipt));
  return receipt;
 }
 throw Error("P4_G5_V0078_NO_UNAMBIGUOUS_COMMIT_HOLD");
}
export function safeP4G5V0078InstallerErrorV39(error:unknown){
 const m=error instanceof Error?error.message:"";
 const code=error&&typeof error==="object"?(error as {code?:unknown}).code:null;
 if(/^P4_G5_V0078_[A-Z0-9_]{3,150}_HOLD(?:_DO_NOT_RETRY)?$/.test(m))
  return m;
 return typeof code==="string"&&/^[A-Z0-9]{5}$/.test(code)?
  "P4_G5_V0078_INSTALL_SQLSTATE_"+code+"_HOLD":
  "P4_G5_V0078_INSTALL_UNCLASSIFIED_HOLD";
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_v0078_one_time_exact_sql_installer.ts"))
 void installP4G5V0078OnceV39().catch(e=>{
  console.error(safeP4G5V0078InstallerErrorV39(e));process.exitCode=2;
 });
