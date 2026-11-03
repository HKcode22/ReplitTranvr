/**
 * Phase4 Gate5 V0078 prospective FIDS source-uniqueness production metadata
 * preflight. READ ONLY, NO DDL, no provider, no Contents, no grants.
 * This is NOT a V0078 installer or authority to run a live paid producer.
 */
import pg from "pg";

export const P4_G5_V0078_PREFLIGHT_SCHEMA_V39=
 "v39.phase4.gate5-v0078-two-role-production-readonly-preflight.v1" as const;
const OLD_UNIQUE=
 "UNIQUE (source_airport_icao, cutoff_utc, flight_number, carrier_iata, provider_record_key)";
const PARTIAL_WHERE="WHERE (source_type <> 'fids'::text)";
const OBS_COLS="(population_query_id, analytic_identity_id, population_role)";
type Facts={
 database:string;role:string;pgVersion:number;readOnly:boolean;
 usesClean:boolean;createsClean:boolean;ownsPopulation:boolean;
 hasPopulation:boolean;hasSource:boolean;hasV0077:boolean;
 legacyDefinition:string|null;
 observationIndexDefinition:string|null;
 replacementDefinition:string|null;
 referencingForeignKeys:number;
 badNonexpiredFidsIdentities:number;
 runtimeV0077Privileges:[boolean,boolean,boolean,boolean];
};
function bad():never{throw Error("P4_G5_V0078_INVALID_CATALOG_RESULT_HOLD");}
function object(x:unknown):Record<string,unknown>{
 if(!x||typeof x!=="object"||Array.isArray(x))bad();
 return x as Record<string,unknown>;
}
const PG_ROLES_CATALOG_SQL=[
 "SELECT current_database() AS db_name,current_user AS db_role,",
 "current_setting('server_version_num')::int AS server_version,",
 "current_setting('transaction_read_only')='on' AS read_only,",
 "has_schema_privilege(current_user,'clean','USAGE') AS uses_clean,",
 "has_schema_privilege(current_user,'clean','CREATE') AS creates_clean,",
 "to_regclass('clean.flight_population') IS NOT NULL AS population_exists,",
 "to_regclass('clean.fids_query_response') IS NOT NULL AS source_exists,",
 "to_regclass('clean.phase4_g5_fids_original_binding_v39') IS NOT NULL AS v0077_exists,",
 "COALESCE((SELECT pg_has_role(c.relowner,'USAGE')",
 "FROM pg_class c WHERE c.oid=to_regclass('clean.flight_population')),false)",
 "AS owns_population,",
 "(SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c",
 "WHERE c.conrelid=to_regclass('clean.flight_population')",
 "AND c.conname='flight_population_key' AND c.contype='u') AS legacy_definition,",
 "(SELECT pg_get_indexdef(i.oid) FROM pg_class i",
 "WHERE i.oid=to_regclass('clean.flight_population_observation_key')) AS observation_index,",
 "(SELECT pg_get_indexdef(i.oid) FROM pg_class i",
 "WHERE i.oid=to_regclass('clean.flight_population_legacy_nonfids_key_v39')) AS replacement_index,",
 "(SELECT count(*)::int FROM pg_constraint fk",
 "WHERE fk.contype='f' AND fk.conindid=(",
 "SELECT c.conindid FROM pg_constraint c",
 "WHERE c.conrelid=to_regclass('clean.flight_population')",
 "AND c.conname='flight_population_key')) AS referencing_foreign_keys"
].join(" ");
const ADMIN_ACTIVE_FIDS_SQL=[
 "SELECT count(*)::int AS bad FROM clean.flight_population",
 "WHERE source_type='fids' AND provider_content_expired_at_utc IS NULL",
 "AND (population_query_id IS NULL OR analytic_identity_id IS NULL",
 "OR population_role IS NULL)"
].join(" ");
const V0077_RUNTIME_ACL_SQL=[
 "SELECT",
 "has_table_privilege(current_user,",
 "'clean.phase4_g5_fids_original_binding_v39','SELECT') AS can_select,",
 "has_table_privilege(current_user,",
 "'clean.phase4_g5_fids_original_binding_v39','INSERT') AS can_insert,",
 "has_table_privilege(current_user,",
 "'clean.phase4_g5_fids_original_binding_v39','UPDATE') AS can_update,",
 "has_table_privilege(current_user,",
 "'clean.phase4_g5_fids_original_binding_v39','DELETE') AS can_delete"
].join(" ");
export function parseP4G5V0078CatalogV39(raw:unknown):Facts{
 const r=object(raw);
 for(const key of ["db_name","db_role"])
  if(typeof r[key]!=="string"||!String(r[key]).trim())bad();
 if(!Number.isSafeInteger(r.server_version)||Number(r.server_version)<120000||
  ["read_only","uses_clean","creates_clean","population_exists",
   "source_exists","v0077_exists","owns_population"].some(k=>typeof r[k]!=="boolean")||
  !Number.isSafeInteger(r.referencing_foreign_keys)||
  Number(r.referencing_foreign_keys)<0||
  [r.legacy_definition,r.observation_index,r.replacement_index].some(
   x=>x!==null&&typeof x!=="string"))bad();
 return{
  database:r.db_name as string,role:r.db_role as string,
  pgVersion:r.server_version as number,readOnly:r.read_only as boolean,
  usesClean:r.uses_clean as boolean,createsClean:r.creates_clean as boolean,
  ownsPopulation:r.owns_population as boolean,
  hasPopulation:r.population_exists as boolean,hasSource:r.source_exists as boolean,
  hasV0077:r.v0077_exists as boolean,
  legacyDefinition:r.legacy_definition as string|null,
  observationIndexDefinition:r.observation_index as string|null,
  replacementDefinition:r.replacement_index as string|null,
  referencingForeignKeys:r.referencing_foreign_keys as number,
  badNonexpiredFidsIdentities:0,
  runtimeV0077Privileges:[false,false,false,false]
 };
}
const properObservation=(s:string|null)=>
 typeof s==="string"&&
 s.includes("UNIQUE INDEX flight_population_observation_key")&&
 s.includes(OBS_COLS);
const properReplacement=(s:string|null)=>
 typeof s==="string"&&
 s.includes("UNIQUE INDEX flight_population_legacy_nonfids_key_v39")&&
 s.includes("(source_airport_icao, cutoff_utc, flight_number, carrier_iata, provider_record_key)")&&
 s.includes(PARTIAL_WHERE);
export function classifyP4G5V0078ReadOnlyV39(admin:Facts,worker:Facts){
 const flags={
  sameNamedDatabase:admin.database===worker.database,
  distinctRoles:admin.role!==worker.role,
  serverPg16OrLater:admin.pgVersion>=160000&&worker.pgVersion>=160000,
  bothTransactionsReadOnly:admin.readOnly&&worker.readOnly,
  cleanVisibleToBoth:admin.usesClean&&worker.usesClean,
  adminOwnsPopulation:admin.ownsPopulation,
  runtimeDoesNotOwnPopulation:!worker.ownsPopulation,
  runtimeCannotCreateClean:!worker.createsClean,
  sourceAndPopulationPresent:admin.hasPopulation&&worker.hasPopulation&&
    admin.hasSource&&worker.hasSource,
  v0077PresentToBoth:admin.hasV0077&&worker.hasV0077,
  v0077PrivateToRuntime:worker.runtimeV0077Privileges.every(x=>!x),
  legacyUniquenessExact:admin.legacyDefinition===OLD_UNIQUE,
  sourceObservationIndexValid:properObservation(admin.observationIndexDefinition),
  v0078NotInstalled:admin.replacementDefinition===null,
  alreadyV0078Present:properReplacement(admin.replacementDefinition)&&
    admin.legacyDefinition===null,
  noLegacyForeignKeyDependents:admin.referencingForeignKeys===0,
  noIncompleteActiveFids:admin.badNonexpiredFidsIdentities===0
 };
 const base=flags.sameNamedDatabase&&flags.distinctRoles&&
  flags.serverPg16OrLater&&flags.bothTransactionsReadOnly&&
  flags.cleanVisibleToBoth&&flags.adminOwnsPopulation&&
  flags.runtimeDoesNotOwnPopulation&&flags.runtimeCannotCreateClean&&
  flags.sourceAndPopulationPresent&&flags.v0077PresentToBoth&&
  flags.v0077PrivateToRuntime;
 const status=(!base)?"ROLE_DATABASE_OR_PRIVATE_ACL_HOLD":
  flags.alreadyV0078Present?"V0078_ALREADY_PRESENT_DO_NOT_REINSTALL_HOLD":
  flags.legacyUniquenessExact&&flags.sourceObservationIndexValid&&
   flags.v0078NotInstalled&&flags.noLegacyForeignKeyDependents&&
   flags.noIncompleteActiveFids?
   "V0078_PREINSTALL_CATALOG_CANDIDATE_ONLY_NEEDS_OWNER_REVIEW":
   "V0078_UNEXPECTED_SCHEMA_OR_DEPENDENCY_HOLD";
 return {
  schema:P4_G5_V0078_PREFLIGHT_SCHEMA_V39,status,flags,
  databaseNameOrRoleNamesPrinted:false as const,
  originalOrNormalizedFlightContentRead:false as const,
  v0078InstalledByThisCheck:false as const,
  legalSourceRightsVerified:false as const,
  actualProviderNativeTVerified:false as const,
  providerCalls:0 as const,databaseWrites:0 as const,
  scientificGate5Passed:false as const,
  phase5FreezeAuthorized:false as const,phase6Authorized:false as const
 };
}
async function readRole(url:string,which:"ADMIN"|"RUNTIME"):Promise<Facts>{
 const db=new pg.Client({
  connectionString:url,connectionTimeoutMillis:9000,
  query_timeout:15000,application_name:"gate5_v0078_catalog_readonly",
  options:"-c default_transaction_read_only=on"
 });
 let connected=false,tx=false;
 try{
  await db.connect();connected=true;
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  tx=true;await db.query("SET LOCAL statement_timeout='12000ms'");
  const r=await db.query(PG_ROLES_CATALOG_SQL);
  if(r.rows.length!==1)bad();
  const facts=parseP4G5V0078CatalogV39(r.rows[0]);
  if(which==="ADMIN"){
   const result=await db.query(ADMIN_ACTIVE_FIDS_SQL);
   const badCount=result.rows[0]?.bad;
   if(result.rows.length!==1||!Number.isSafeInteger(badCount)||badCount<0)bad();
   facts.badNonexpiredFidsIdentities=badCount;
  }
  if(which==="RUNTIME"&&facts.hasV0077){
   const acl=await db.query(V0077_RUNTIME_ACL_SQL);
   const row=object(acl.rows[0]);
   if(acl.rows.length!==1||
      ["can_select","can_insert","can_update","can_delete"].some(k=>typeof row[k]!=="boolean"))bad();
   facts.runtimeV0077Privileges=[
    row.can_select===true,row.can_insert===true,
    row.can_update===true,row.can_delete===true
   ];
  }
  await db.query("ROLLBACK");tx=false;
  return facts;
 }catch(e:unknown){
  const c=e&&typeof e==="object"?(e as {code?:unknown}).code:null;
  const sqlstate=typeof c==="string"&&/^[A-Z0-9]{5}$/.test(c)?
   "_SQLSTATE_"+c:"";
  throw Error("P4_G5_V0078_READONLY_"+which+sqlstate+"_HOLD");
 }finally{
  if(tx)await db.query("ROLLBACK").catch(()=>undefined);
  if(connected)await db.end().catch(()=>undefined);
 }
}
export async function runP4G5V0078ReadOnlyPreflightV39(){
 const a=process.env.DATABASE_URL,b=process.env.V39_DATABASE_RUNTIME_URL;
 if(!a||!b||a===b)throw Error("P4_G5_V0078_DISTINCT_OWNER_RUNTIME_URL_REQUIRED_HOLD");
 const admin=await readRole(a,"ADMIN");
 const worker=await readRole(b,"RUNTIME");
 const result=classifyP4G5V0078ReadOnlyV39(admin,worker);
 console.log(JSON.stringify(result));
 return result.status==="V0078_PREINSTALL_CATALOG_CANDIDATE_ONLY_NEEDS_OWNER_REVIEW"?0:2;
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_v0078_production_readonly_preflight.ts"))
 void runP4G5V0078ReadOnlyPreflightV39().then(x=>{process.exitCode=x}).catch(e=>{
  const m=e instanceof Error?e.message:"";
  console.error(m.startsWith("P4_G5_V0078_")?m:
   "P4_G5_V0078_READONLY_UNCLASSIFIED_HOLD");
  process.exitCode=2;
 });
