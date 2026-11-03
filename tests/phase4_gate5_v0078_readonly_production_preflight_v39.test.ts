import {describe,expect,it} from "vitest";
import {
 classifyP4G5V0078ReadOnlyV39,
 parseP4G5V0078CatalogV39,
 P4_G5_V0078_PREFLIGHT_SCHEMA_V39
} from "../scripts/v39_phase4_gate5_v0078_production_readonly_preflight";

const LEGACY="UNIQUE (source_airport_icao, cutoff_utc, flight_number, carrier_iata, provider_record_key)";
const OBS="CREATE UNIQUE INDEX flight_population_observation_key ON clean.flight_population USING btree (population_query_id, analytic_identity_id, population_role)";
const NEW="CREATE UNIQUE INDEX flight_population_legacy_nonfids_key_v39 ON clean.flight_population USING btree (source_airport_icao, cutoff_utc, flight_number, carrier_iata, provider_record_key) WHERE (source_type <> 'fids'::text)";
function raw(role:"owner"|"worker"){
 return {
  db_name:"disposable_test",db_role:role,server_version:160010,
  read_only:true,uses_clean:true,creates_clean:role==="owner",
  population_exists:true,source_exists:true,v0077_exists:true,
  owns_population:role==="owner",
  legacy_definition:LEGACY,observation_index:OBS,replacement_index:null,
  referencing_foreign_keys:0
 };
}
function pair(){
 const admin=parseP4G5V0078CatalogV39(raw("owner"));
 const runtime=parseP4G5V0078CatalogV39(raw("worker"));
 return {admin,runtime};
}
describe("V0078 two-role read-only metadata preflight",()=>{
 it("preflight is catalog-only, no provider, production DDL, live science authority",()=>{
  const {admin,runtime}=pair();
  const out=classifyP4G5V0078ReadOnlyV39(admin,runtime);
  expect(out.schema).toBe(P4_G5_V0078_PREFLIGHT_SCHEMA_V39);
  expect(out.status).toBe("V0078_PREINSTALL_CATALOG_CANDIDATE_ONLY_NEEDS_OWNER_REVIEW");
  expect(out.databaseWrites).toBe(0);
  expect(out.providerCalls).toBe(0);
  expect(out.v0078InstalledByThisCheck).toBe(false);
  expect(out.originalOrNormalizedFlightContentRead).toBe(false);
  expect(out.legalSourceRightsVerified).toBe(false);
  expect(out.actualProviderNativeTVerified).toBe(false);
  expect(out.scientificGate5Passed).toBe(false);
 });
 it("missing schemas, owner privileges, role separation, PG16, runtime ACL leaks hold",()=>{
  for(const modify of [
   (a:any,b:any)=>{b.database="other_database"},
   (a:any,b:any)=>{b.role=a.role},
   (a:any,b:any)=>{a.pgVersion=150000},
   (a:any,b:any)=>{b.readOnly=false},
   (a:any,b:any)=>{b.createsClean=true},
   (a:any,b:any)=>{a.ownsPopulation=false},
   (a:any,b:any)=>{b.ownsPopulation=true},
   (a:any,b:any)=>{b.usesClean=false},
   (a:any,b:any)=>{a.hasSource=false},
   (a:any,b:any)=>{a.hasV0077=false},
   (a:any,b:any)=>{b.runtimeV0077Privileges[1]=true}
  ]){
   const {admin,runtime}=pair();modify(admin,runtime);
   const result=classifyP4G5V0078ReadOnlyV39(admin,runtime);
   expect(result.status).toBe("ROLE_DATABASE_OR_PRIVATE_ACL_HOLD");
  }
 });
 it("unexpected legacy constraint, absent source identity or dependent foreign key holds",()=>{
  for(const modify of [
   (a:any)=>{a.legacyDefinition="UNIQUE (provider_record_key)"},
   (a:any)=>{a.observationIndexDefinition=null},
   (a:any)=>{a.replacementDefinition="FAKE INDEX"},
   (a:any)=>{a.referencingForeignKeys=1},
   (a:any)=>{a.badNonexpiredFidsIdentities=1}
  ]){
   const {admin,runtime}=pair();modify(admin);
   expect(classifyP4G5V0078ReadOnlyV39(admin,runtime).status)
    .toBe("V0078_UNEXPECTED_SCHEMA_OR_DEPENDENCY_HOLD");
  }
 });
 it("an already migrated database is not authorized for reinstallation",()=>{
  const {admin,runtime}=pair();
  admin.legacyDefinition=null;
  admin.replacementDefinition=NEW;
  expect(classifyP4G5V0078ReadOnlyV39(admin,runtime).status)
   .toBe("V0078_ALREADY_PRESENT_DO_NOT_REINSTALL_HOLD");
 });
 it("rejects untyped catalog data instead of trusting ambiguous PostgreSQL flags",()=>{
  for(const changed of [
   {...raw("owner"),server_version:"160010"},
   {...raw("owner"),owns_population:1},
   {...raw("owner"),referencing_foreign_keys:"0"},
   {...raw("owner"),legacy_definition:{unsafe:true}},
   {...raw("owner"),db_role:""},
  ])
   expect(()=>parseP4G5V0078CatalogV39(changed)).toThrow(
    "P4_G5_V0078_INVALID_CATALOG_RESULT_HOLD");
 });
});
