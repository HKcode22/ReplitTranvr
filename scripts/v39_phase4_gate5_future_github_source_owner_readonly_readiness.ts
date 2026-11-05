/**
 * Phase4 Gate5 prospective GitHub-only owner: READ-ONLY CREDENTIAL/ACL AUDIT.
 *
 * Runs only on reviewed MAIN GitHub Actions. It DOES NOT make a provider GET,
 * mutate a database, grant/revoke roles, stage an owner, expose any secret,
 * certify T/actuality/license, or activate a paid collector.
 *
 * A dedicated narrowly scoped P4_G5_SOURCE_OWNER_DATABASE_URL is distinct
 * from the independent GATE05_AUTOMATION_DATABASE_URL audit reader. Neither
 * secret, their usernames or database names are ever printed.
 */
import pg from "pg";
import {execFileSync} from "node:child_process";

export const P4_G5_GITHUB_OWNER_READINESS_SCHEMA_V39=
 "v39.phase4.gate5-github-owner-credential-capability-readonly.v1" as const;

type Seen={exists:boolean;select:boolean;insert:boolean;update:boolean;delete:boolean};
type DbFacts={
  dbName:string;roleName:string;pg16:boolean;txReadOnly:boolean;
  isSuperuser:boolean;canCreateSchema:boolean;canCreateDatabase:boolean;
  tables:Record<keyof typeof OBJECTS,Seen>
  // PostgreSQL sequences need their own USAGE privilege: INSERT alone does
  // not grant nextval() on serial-backed id columns.
  serialUsage:{populationId:boolean;preSnapshotId:boolean}
  membershipTrigger:{
   enabled:boolean;securityInvoker:boolean;ownerCanInsert:boolean;ownerCanSelect:boolean
  }
  postLedger:{exists:boolean;select:boolean;insert:boolean;update:boolean;delete:boolean}
  canExecutePhysicalReserve:boolean
};
const OBJECTS={
 original:"clean.fids_query_response",
 population:"clean.flight_population",
 binding:"clean.phase4_g5_fids_original_binding_v39",
 cohortBudget:"clean.phase4_g5_fids_cohort_budget_v39",
 physicalOwner:"clean.phase4_g5_fids_physical_owner_v39",
 allowedQuery:"clean.phase4_g5_fids_allowed_query_v39",
 physicalAttempt:"clean.phase4_g5_fids_physical_attempt_v39",
 preSnapshots:"clean.flight_snapshots"
} as const;
const SHA=/^[a-f0-9]{40}$/;
const context=(e:NodeJS.ProcessEnv,localSha:string)=>{
 if(e.GITHUB_ACTIONS!=="true"||
   e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
   e.GITHUB_REF!=="refs/heads/main"||
   !["push","workflow_dispatch"].includes(e.GITHUB_EVENT_NAME??"")||
   e.GITHUB_RUN_ATTEMPT!=="1"||
   e.GITHUB_JOB!=="future-owner-readiness"||
   e.GITHUB_WORKFLOW!=="Phase4 Gate5 Future Owner Credentials Readiness (No Provider)"||
   e.GITHUB_WORKFLOW_REF!==
    "HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-future-owner-credentials-readiness-no-provider.yml@refs/heads/main"||
   !SHA.test(e.GITHUB_SHA??"")||e.GITHUB_SHA!==localSha||
   e.P4_G5_OWNER_READONLY_INTENT!=="CHECK_CREDENTIALS_AND_ROLES_NO_PROVIDER"||
   !!e.DATABASE_URL||!!e.V39_DATABASE_RUNTIME_URL||
   !!e.RAPIDAPI_KEY)
  throw Error("P4_G5_FUTURE_GITHUB_OWNER_READINESS_CONTEXT_HOLD");
};
const needed=(v:unknown)=>v===true;
function string(v:unknown,label:string){
 if(typeof v!=="string"||v.length<1||v.length>120)
  throw Error("P4_G5_GITHUB_OWNER_READINESS_BAD_"+label+"_HOLD");
 return v;
}
const obj=(v:unknown):Record<string,unknown>=>{
 if(!v||typeof v!=="object"||Array.isArray(v))
  throw Error("P4_G5_GITHUB_OWNER_READINESS_INVALID_CATALOG_HOLD");
 return v as Record<string,unknown>;
};
const SQL_ROLE=[
 "SELECT current_database() AS db_name,current_user AS db_role,",
 "(current_setting('server_version_num')::int >=160000) AS pg16,",
 "(current_setting('transaction_read_only')='on') AS read_only,",
 "(SELECT r.rolsuper FROM pg_roles r WHERE r.rolname=current_user) AS is_superuser,",
 "has_schema_privilege(current_user,'clean','CREATE') AS can_create_schema,",
 "has_database_privilege(current_user,current_database(),'CREATE') AS can_create_database"
].join(" ");
const PRIVILEGE_SQL=[
 "SELECT to_regclass($1) IS NOT NULL AS exists,",
 "CASE WHEN to_regclass($1) IS NULL THEN false",
 "ELSE has_table_privilege(current_user,$1,'SELECT') END AS can_select,",
 "CASE WHEN to_regclass($1) IS NULL THEN false",
 "ELSE has_table_privilege(current_user,$1,'INSERT') END AS can_insert,",
 "CASE WHEN to_regclass($1) IS NULL THEN false",
 "ELSE has_table_privilege(current_user,$1,'UPDATE') END AS can_update,",
 "CASE WHEN to_regclass($1) IS NULL THEN false",
 "ELSE has_table_privilege(current_user,$1,'DELETE') END AS can_delete"
].join(" ");

export const G5A_OWNER_SERIAL_CATALOG_SQL_V39=[
 "SELECT pg_get_serial_sequence('clean.flight_population','id') AS population_seq,",
 "pg_get_serial_sequence('clean.flight_snapshots','id') AS pre_snapshot_seq"
].join(" ");
export const G5A_OWNER_SERIAL_USAGE_SQL_V39=
 "SELECT has_sequence_privilege(current_user,$1,'USAGE') AS usable";
export const G5A_PHYSICAL_RESERVE_EXECUTE_SQL_V39=[
 "SELECT to_regprocedure(",
 "'clean.reserve_phase4_g5_fids_physical_attempt_v39(text,text,text,text,integer,text)')",
 "IS NOT NULL AS exists,",
 "has_function_privilege(current_user,",
 "'clean.reserve_phase4_g5_fids_physical_attempt_v39(text,text,text,text,integer,text)',",
 "'EXECUTE') AS allowed"
].join(" ");
export const G5A_MEMBERSHIP_TRIGGER_CATALOG_SQL_V39=[
 "SELECT",
 "(SELECT count(*)::int FROM pg_trigger WHERE tgrelid=",
 "'clean.flight_population'::regclass AND",
 "tgname='trg_flight_population_research_membership'",
 "AND tgenabled IN ('O','A'))=1 AS enabled,",
 "(SELECT count(*)::int FROM pg_proc p",
 "JOIN pg_namespace n ON n.oid=p.pronamespace",
 "WHERE n.nspname='clean' AND p.proname=",
 "'ensure_population_research_membership' AND NOT p.prosecdef)=1",
 "AS security_invoker,",
 "has_table_privilege(current_user,",
 "'clean.population_research_membership','INSERT') AS owner_can_insert,",
 "has_column_privilege(current_user,",
 "'clean.population_research_membership','population_member_id','SELECT') AS owner_can_select"
].join(" ");
const failure=(side:"READER"|"OWNER",e:unknown):never=>{
 const c=e&&typeof e==="object"?(e as {code?:unknown}).code:null;
 const suffix=typeof c==="string"&&/^[A-Z0-9]{5}$/.test(c)?"_SQLSTATE_"+c:"";
 throw Error("P4_G5_FUTURE_GITHUB_"+side+"_READONLY_CONNECT_HOLD"+suffix);
};
async function readOne(url:string,side:"READER"|"OWNER"):Promise<DbFacts>{
 const db=new pg.Client({connectionString:url,
  application_name:"p4_g5_future_owner_no_provider_readonly",
  connectionTimeoutMillis:9000,query_timeout:13000,
  options:"-c default_transaction_read_only=on"});
 let connected=false,tx=false;
 try{
  await db.connect();connected=true;
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  tx=true;
  await db.query("SET LOCAL statement_timeout='12000ms'");
  const res=await db.query(SQL_ROLE);
  if(res.rows.length!==1)
   throw Error("P4_G5_GITHUB_OWNER_READINESS_BAD_ROLE_QUERY_HOLD");
  const r=obj(res.rows[0]);
  const facts:DbFacts={
    dbName:string(r.db_name,"DB"),roleName:string(r.db_role,"ROLE"),
    pg16:needed(r.pg16),txReadOnly:needed(r.read_only),
    isSuperuser:needed(r.is_superuser),
    canCreateSchema:needed(r.can_create_schema),
    canCreateDatabase:needed(r.can_create_database),
    tables:{} as DbFacts["tables"],
    serialUsage:{populationId:false,preSnapshotId:false},
    membershipTrigger:{enabled:false,securityInvoker:true,ownerCanInsert:false,ownerCanSelect:false},
    postLedger:{exists:false,select:false,insert:false,update:false,delete:false},
    canExecutePhysicalReserve:false
  };
  for(const [key,table] of Object.entries(OBJECTS)){
   const result=await db.query(PRIVILEGE_SQL,[table]);
   if(result.rows.length!==1)
    throw Error("P4_G5_GITHUB_OWNER_READINESS_BAD_PRIVILEGE_RESULT_HOLD");
   const q=obj(result.rows[0]);
   for(const k of ["exists","can_select","can_insert","can_update","can_delete"])
    if(typeof q[k]!=="boolean")
     throw Error("P4_G5_GITHUB_OWNER_READINESS_BAD_BOOLEAN_HOLD");
   facts.tables[key as keyof typeof OBJECTS]={
    exists:q.exists===true,
    select:q.can_select===true,
    insert:q.can_insert===true,
    update:q.can_update===true,
    delete:q.can_delete===true
   };
  }
  const seqCatalog=await db.query(G5A_OWNER_SERIAL_CATALOG_SQL_V39);
  const names=seqCatalog.rows[0];
  if(seqCatalog.rows.length!==1||typeof names?.population_seq!=="string"||
     typeof names?.pre_snapshot_seq!=="string")
   throw Error("P4_G5_SOURCE_WRITER_SERIAL_DEFAULTS_MISSING_HOLD");
  const a=await db.query(G5A_OWNER_SERIAL_USAGE_SQL_V39,[names.population_seq]);
  const b=await db.query(G5A_OWNER_SERIAL_USAGE_SQL_V39,[names.pre_snapshot_seq]);
  if(a.rows.length!==1||b.rows.length!==1||
     typeof a.rows[0]?.usable!=="boolean"||
     typeof b.rows[0]?.usable!=="boolean")
   throw Error("P4_G5_SOURCE_WRITER_SERIAL_CATALOG_BAD_HOLD");
  facts.serialUsage={
   populationId:a.rows[0].usable,preSnapshotId:b.rows[0].usable
  };
  const membership=await db.query(G5A_MEMBERSHIP_TRIGGER_CATALOG_SQL_V39);
  if(membership.rows.length!==1||[
   membership.rows[0]?.enabled,membership.rows[0]?.security_invoker,
   membership.rows[0]?.owner_can_insert,
   membership.rows[0]?.owner_can_select
  ].some(x=>typeof x!=="boolean"))
   throw Error("P4_G5_SOURCE_OWNER_MEMBERSHIP_CATALOG_BAD_HOLD");
  facts.membershipTrigger={
   enabled:membership.rows[0].enabled,
   securityInvoker:membership.rows[0].security_invoker,
   ownerCanInsert:membership.rows[0].owner_can_insert,
   ownerCanSelect:membership.rows[0].owner_can_select
  };
  const ledger=await db.query(PRIVILEGE_SQL,["clean.adb_rest_attempt_ledger"]);
  const l=ledger.rows[0];
  if(ledger.rows.length!==1||[
   l?.exists,l?.can_select,l?.can_insert,l?.can_update,l?.can_delete
  ].some(v=>typeof v!=="boolean"))
   throw Error("P4_G5_POST_LEDGER_CATALOG_INVALID_HOLD");
  facts.postLedger={
   exists:l.exists,select:l.can_select,insert:l.can_insert,
   update:l.can_update,delete:l.can_delete
  };
  const fn=await db.query(G5A_PHYSICAL_RESERVE_EXECUTE_SQL_V39);
  if(fn.rows.length!==1||typeof fn.rows[0]?.exists!=="boolean"||
     typeof fn.rows[0]?.allowed!=="boolean")
   throw Error("P4_G5_RESERVE_FUNCTION_CATALOG_INVALID_HOLD");
  facts.canExecutePhysicalReserve=fn.rows[0].exists&&fn.rows[0].allowed;
  await db.query("ROLLBACK");tx=false;
  return facts;
 }catch(e){failure(side,e)}
 finally{
  if(tx)await db.query("ROLLBACK").catch(()=>undefined);
  if(connected)await db.end().catch(()=>undefined);
 }
}
export type SourceReadinessInputV39={
  providerApiCredentialPresent:boolean;
  readerCredentialPresent:boolean;
  ownerCredentialPresent:boolean;
  reader:DbFacts|null;
  owner:DbFacts|null;
};
export function classifyP4G5GithubOwnerReadinessV39(input:SourceReadinessInputV39){
 const {reader,owner}=input;
 const evidenceReader=reader!==null&&
  reader.pg16&&reader.txReadOnly&&!reader.isSuperuser&&
  reader.tables.original.exists&&reader.tables.original.select&&
  reader.tables.binding.exists&&reader.tables.binding.select&&
  reader.tables.allowedQuery.select&&
  reader.tables.physicalOwner.select&&reader.tables.physicalAttempt.select&&
  reader.tables.preSnapshots.select;
 const sourceWriter=owner!==null&&
  owner.pg16&&owner.txReadOnly&&!owner.isSuperuser&&
  !owner.canCreateSchema&&!owner.canCreateDatabase&&
  Object.entries(owner.tables).every(([k,v])=>{
   if(!v.exists||v.delete)return false;
   const writer=["original","population","binding","cohortBudget",
    "physicalOwner","allowedQuery","physicalAttempt","preSnapshots"].includes(k);
   return !writer||v.insert;
  });
 const ownerSequences=owner!==null&&owner.serialUsage.populationId&&
  owner.serialUsage.preSnapshotId;
 const ownerMembershipPath=owner!==null&&owner.membershipTrigger.enabled&&
  (!owner.membershipTrigger.securityInvoker||
    (owner.membershipTrigger.ownerCanInsert&&owner.membershipTrigger.ownerCanSelect));
 const postLedger=owner!==null&&owner.postLedger.exists&&
  owner.postLedger.select&&owner.postLedger.insert&&
  !owner.postLedger.update&&!owner.postLedger.delete;
 const reserveFunction=owner?.canExecutePhysicalReserve===true;
 const ownerDistinct=reader!==null&&owner!==null&&
  owner.dbName===reader.dbName&&owner.roleName!==reader.roleName;
 const rolesSafe=reader!==null&&owner!==null&&
  !reader.isSuperuser&&!reader.canCreateSchema&&!reader.canCreateDatabase&&
  !owner.isSuperuser&&!owner.canCreateSchema&&!owner.canCreateDatabase;
 const flags={
  providerCredentialInGithubEnvironment:input.providerApiCredentialPresent,
  independentReadonlyDbSecretPresent:input.readerCredentialPresent,
  futureDedicatedDbOwnerSecretPresent:input.ownerCredentialPresent,
  independentReadOnlySourceAndPREMetadataVisible:evidenceReader,
  prospectiveOwnerInsertRightsAvailableInReadOnlyCatalog:sourceWriter,
  sourceOwnerCanUsePopulationIdSequence:owner?.serialUsage.populationId===true,
  sourceOwnerCanUsePreSnapshotIdSequence:owner?.serialUsage.preSnapshotId===true,
  sourceOwnerPopulationMembershipTriggerEnabled:
   owner?.membershipTrigger.enabled===true,
  sourceOwnerMembershipTriggerRunsAsInvoker:
   owner?.membershipTrigger.securityInvoker===true,
  sourceOwnerCanInsertMembership:
   owner?.membershipTrigger.ownerCanInsert===true,
  sourceOwnerCanSelectMembership:
   owner?.membershipTrigger.ownerCanSelect===true,
  sourceOwnerMembershipTriggerHasEffectiveWritePath:ownerMembershipPath,
  sourceOwnerCanSelectPostLedger:owner?.postLedger.select===true,
  sourceOwnerCanInsertPostLedger:owner?.postLedger.insert===true,
  sourceOwnerPostLedgerMinimalACL:postLedger,
  sourceOwnerCanExecuteCommittedReservation:reserveFunction,
  separateSameDatabaseReaderAndOwnerRoles:ownerDistinct,
  neitherRoleHasSchemaOrDbAdminPrivilege:rolesSafe,
  // Disaggregated, non-identifying flags: distinguishes an elevated audit
  // reader from a safely scoped paid owner without printing roles or URLs.
  readerNotSuperuser:reader!==null&&!reader.isSuperuser,
  readerCannotCreateSchema:reader!==null&&!reader.canCreateSchema,
  readerCannotCreateDatabase:reader!==null&&!reader.canCreateDatabase,
  sourceOwnerNotSuperuser:owner!==null&&!owner.isSuperuser,
  sourceOwnerCannotCreateSchema:owner!==null&&!owner.canCreateSchema,
  sourceOwnerCannotCreateDatabase:owner!==null&&!owner.canCreateDatabase,
  noLiveRequestAuthorized:true
 };
 const status=!input.readerCredentialPresent?
   "HOLD_GITHUB_READER_SECRET_ABSENT":
  !input.ownerCredentialPresent?
   "HOLD_GITHUB_DEDICATED_SOURCE_OWNER_SECRET_ABSENT":
  !input.providerApiCredentialPresent?
   "HOLD_GITHUB_PROVIDER_KEY_ABSENT":
  !evidenceReader?"HOLD_GITHUB_READER_V0077_SOURCE_PRE_ACL":
  !sourceWriter?"HOLD_GITHUB_SOURCE_OWNER_LEAST_PRIVILEGE_ACL":
  !ownerSequences?"HOLD_GITHUB_SOURCE_OWNER_SEQUENCE_USAGE":
  !ownerMembershipPath?"HOLD_GITHUB_SOURCE_OWNER_MEMBERSHIP_TRIGGER_WRITE":
  !reserveFunction?"HOLD_GITHUB_SOURCE_OWNER_RESERVATION_FUNCTION_EXECUTE":
  !postLedger?"HOLD_GITHUB_SOURCE_OWNER_POST_LEDGER_ACL":
  !ownerDistinct||!rolesSafe?"HOLD_GITHUB_DB_ROLE_SEPARATION":
   "TECHNICAL_CREDENTIALS_CANDIDATE_ONLY_SCIENCE_RELEASE_HOLD";
 return{
  schema:P4_G5_GITHUB_OWNER_READINESS_SCHEMA_V39,status,flags,
  verifiedActualTimeMilestone:false as const,
  verifiedPerRecordActualOnlyRunway:false as const,
  lawfulOriginalAndDerivedUseCertified:false as const,
  liveManifestPromotionPinAssigned:false as const,
  liveRestApiRequestMade:false as const,databaseWrites:0 as const,
  providerCalls:0 as const,scientificGate5Passed:false as const,
  phase5FreezeAuthorized:false as const,phase6Authorized:false as const
 };
}
export async function main(){
 const e=process.env;
 const head=execFileSync("git",["rev-parse","HEAD"],
  {encoding:"utf8",timeout:4000}).trim();
 context(e,head);
 const keys={
  providerApiCredentialPresent:!!e.AERODATABOX_API_KEY,
  readerCredentialPresent:!!e.GATE05_AUTOMATION_DATABASE_URL,
  ownerCredentialPresent:!!e.P4_G5_SOURCE_OWNER_DATABASE_URL
 };
 let reader:DbFacts|null=null,owner:DbFacts|null=null;
 // Never query the provider. Only open explicitly read-only PostgreSQL
 // sessions; do not log raw database errors/roles/identifiers/URLs.
 if(keys.readerCredentialPresent)
  reader=await readOne(e.GATE05_AUTOMATION_DATABASE_URL!,"READER");
 if(keys.ownerCredentialPresent)
  owner=await readOne(e.P4_G5_SOURCE_OWNER_DATABASE_URL!,"OWNER");
 const result=classifyP4G5GithubOwnerReadinessV39({...keys,reader,owner});
 console.log(JSON.stringify(result));
 return result;
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_future_github_source_owner_readonly_readiness.ts"))
 void main().catch((e:unknown)=>{
  const message=e instanceof Error?e.message:"";
  console.error(/^P4_G5_[A-Z0-9_]+(?:_SQLSTATE_[A-Z0-9]{5})?$/.test(message)?
   message:"P4_G5_FUTURE_OWNER_READINESS_UNCLASSIFIED_HOLD");
  process.exitCode=2;
 });
