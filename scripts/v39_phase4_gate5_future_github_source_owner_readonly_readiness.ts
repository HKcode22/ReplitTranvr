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
    tables:{} as DbFacts["tables"]
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
