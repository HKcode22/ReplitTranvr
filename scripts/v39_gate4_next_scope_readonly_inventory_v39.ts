/**
 * Gate4 next-scope OWNER READ-ONLY METADATA INVENTORY.
 *
 * NO provider request, GitHub dispatch, subscription CREATE/DELETE, schema
 * changes or credential rotation. The Oct23 WSSS positive binding is protected
 * historical evidence; the old one-shot writer and exact UUID must NOT be
 * reused. Owner connection is used strictly for SELECT within BEGIN READ ONLY.
 *
 * Output intentionally omits secrets, URLs, callback wire, provider IDs,
 * notification content, auth hash, flight identity, policy SQL predicates.
 */
import "dotenv/config";
import pg from "pg";
import {pathToFileURL} from "node:url";

const OLD_SCOPE="498dccd7-5da3-4687-a6ea-e0dc03b54398";
const OWNER_ROLE="gate4_owner_writer_20261023";
const OWNER_TABLE="clean.gate4_alert_owned_binding_v39";
const ORIGINAL_TABLE="clean.gate4_alert_prebind_original_v39";
const SQL_TIMEOUT="7000ms";
type Stage="CONFIG"|"CONNECT"|"VERIFY_READONLY"|"TABLES"|
 "OWNER_RECEIPTS"|"ORIGINAL_COUNTS"|"ROLE_METADATA"|"RLS_METADATA";

async function main():Promise<void>{
 let stage:Stage="CONFIG";
 let db:pg.Client|undefined;
 let tx=false;
 try{
  if(process.argv.length!==2)
   throw Error("EXACT_READONLY_CLI_REQUIRED");
  // No fallback to the broad application runtime login, which may lack
  // scoped custody privileges and must never be granted them for this test.
  const url=process.env.V39_PRODUCTION_DATABASE_OWNER_URL;
  if(!url)throw Error("OWNER_CREDENTIAL_NOT_AVAILABLE");
  const u=new URL(url);
  if(!["postgres:","postgresql:"].includes(u.protocol)||
     !u.password||u.pathname!=="/neondb")
   throw Error("OWNER_CONNECTION_INVALID");
  const expectedRole=decodeURIComponent(u.username);
  stage="CONNECT";
  db=new pg.Client({
   connectionString:url,
   connectionTimeoutMillis:6000,
   query_timeout:8000,
   options:"-c default_transaction_read_only=on",
   application_name:"gate4_next_scope_readonly_metadata"
  });
  await db.connect();
  await db.query("BEGIN READ ONLY");
  tx=true;
  await db.query("SET LOCAL statement_timeout='"+SQL_TIMEOUT+"'");
  stage="VERIFY_READONLY";
  const me=(await db.query(
   "SELECT current_database() AS db,current_user AS actor,"+
   "current_setting('transaction_read_only') AS read_only"
  )).rows[0];
  if(me?.db!=="neondb"||me?.actor!==expectedRole||
     me?.read_only!=="on")
    throw Error("DATABASE_OR_ROLE_MISMATCH");
  stage="TABLES";
  const tables=(await db.query(
   "SELECT to_regclass($1) IS NOT NULL AS owner_found,"+
   "to_regclass($2) IS NOT NULL AS originals_found",
   [OWNER_TABLE,ORIGINAL_TABLE]
  )).rows[0];
  if(tables?.owner_found!==true||tables?.originals_found!==true)
    throw Error("CUSTODY_TABLES_NOT_PRESENT");
  stage="OWNER_RECEIPTS";
  const owned=(await db.query(
   "SELECT count(*)::int AS all_scopes,"+
   "count(*) FILTER (WHERE scope_id=$1::uuid)::int AS old_scope,"+
   "count(*) FILTER (WHERE scope_id<>$1::uuid)::int AS other_scopes "+
   "FROM clean.gate4_alert_owned_binding_v39",
   [OLD_SCOPE]
  )).rows[0];
  stage="ORIGINAL_COUNTS";
  const originals=(await db.query(
   "SELECT count(*) FILTER (WHERE scope_id=$1::uuid)::int AS old_scope,"+
   "count(*) FILTER (WHERE scope_id<>$1::uuid)::int AS other_scopes "+
   "FROM clean.gate4_alert_prebind_original_v39",
   [OLD_SCOPE]
  )).rows[0];
  stage="ROLE_METADATA";
  const previousRole=(await db.query(
   "SELECT count(*)::int AS found,"+
   "bool_or(rolcanlogin) AS login_enabled,"+
   "bool_or(rolvaliduntil IS NULL OR rolvaliduntil>now()) "+
   "AS not_expired "+
   "FROM pg_roles WHERE rolname=$1",
   [OWNER_ROLE]
  )).rows[0];
  stage="RLS_METADATA";
  const rls=(await db.query(
   "SELECT c.relrowsecurity AS enabled,"+
   "(SELECT count(*)::int FROM pg_policies "+
     "WHERE schemaname='clean' AND "+
     "tablename='gate4_alert_owned_binding_v39') AS count "+
   "FROM pg_class c WHERE c.oid=$1::regclass",
   [OWNER_TABLE]
  )).rows[0];
  const policies=(await db.query(
   "SELECT policyname FROM pg_policies "+
   "WHERE schemaname='clean' AND "+
   "tablename='gate4_alert_owned_binding_v39' "+
   "ORDER BY policyname"
  )).rows.map((x:{policyname:string})=>x.policyname);
  await db.query("ROLLBACK");
  tx=false;
  console.log(JSON.stringify({
   schema:"v39.gate4.next-scope-readonly-inventory.v1",
   status:"GATE4_NEXT_SCOPE_READONLY_INVENTORY",
   previousTrialScope:"historical_20261023_wsss",
   oldOwnedBindings:owned.old_scope,
   otherOwnedBindings:owned.other_scopes,
   oldOriginalRowCount:originals.old_scope,
   otherOriginalRowCount:originals.other_scopes,
   legacyWriterRolePresent:previousRole.found===1,
   legacyWriterLoginEnabled:previousRole.login_enabled===true,
   legacyWriterTimeValid:previousRole.not_expired===true,
   currentOwnerTableRlsEnabled:rls.enabled===true,
   currentOwnerTablePolicyCount:rls.count,
   currentOwnerTablePolicyNames:policies,
   nextScopeInstalled:false,
   nextScopeAuthorized:false,
   freshRoleAndScopedRlsReviewRequired:true,
   historicalRowsUntouched:true,
   noPaidAuthorizationGranted:true,
   providerRequests:0,databaseWrites:0
  },null,2));
 }catch(e){
  const raw=(e as {code?:unknown})?.code;
  const sqlstate=typeof raw==="string"&&
    /^[A-Z0-9]{5}$/.test(raw)?raw:"NONE";
  console.log(JSON.stringify({
    status:"GATE4_NEXT_SCOPE_READONLY_HOLD",failedStage:stage,
    sqlstate,providerRequests:0,databaseWrites:0
  },null,2));
  process.exitCode=2;
 }finally{
  if(tx)await db?.query("ROLLBACK").catch(()=>undefined);
  await db?.end().catch(()=>undefined);
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 main().catch(()=>{
  console.log(JSON.stringify({status:"GATE4_NEXT_SCOPE_UNEXPECTED_HOLD",
    providerRequests:0,databaseWrites:0}));
  process.exitCode=2;
 });
}
