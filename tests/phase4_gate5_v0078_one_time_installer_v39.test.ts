import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 P4_G5_V0078_MIGRATION_V39,P4_G5_V0078_REVIEWED_GIT_BLOB_V39,
 P4_G5_V0078_ONE_TIME_INTENT_V39,
 assertP4G5V0078InstallIntentV39,assertP4G5V0078PinnedSqlV39,
 assertP4G5V0078TransactionalCatalogV39,
 assertP4G5V0078LockedPreCatalogV39,
 safeP4G5V0078InstallerErrorV39
} from "../scripts/v39_phase4_gate5_v0078_one_time_exact_sql_installer";
const OBS="CREATE UNIQUE INDEX flight_population_observation_key ON clean.flight_population USING btree (population_query_id, analytic_identity_id, population_role)";
const NEW="CREATE UNIQUE INDEX flight_population_legacy_nonfids_key_v39 ON clean.flight_population USING btree (source_airport_icao, cutoff_utc, flight_number, carrier_iata, provider_record_key) WHERE (source_type <> 'fids'::text)";
const OLD="UNIQUE (source_airport_icao, cutoff_utc, flight_number, carrier_iata, provider_record_key)";
const before=()=>({legacy:OLD,observed:OBS,replacement:null,dependent_fks:0,bad_fids:0,fids_guard:1});
const after=()=>({legacy_count:0,observed:OBS,replacement:NEW,fids_guard:1});
const acl=()=>({table_acl:null,table_owner:"10",relrowsecurity:false,relforcerowsecurity:false,custom_trigger_count:2});
describe("V0078 pinned one-time schema installer offline gate",()=>{
 it("only accepts explicit reviewed operator intent and no active collector",()=>{
  const env={
   V39_GATE5_V0078_INSTALL_INTENT:P4_G5_V0078_ONE_TIME_INTENT_V39,
   V39_GATE5_V0078_EXPECTED_BLOB:P4_G5_V0078_REVIEWED_GIT_BLOB_V39,
   ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0"
  };
  expect(()=>assertP4G5V0078InstallIntentV39(env)).not.toThrow();
  for(const changed of [
   {...env,V39_GATE5_V0078_INSTALL_INTENT:"NO"},
   {...env,V39_GATE5_V0078_EXPECTED_BLOB:"a".repeat(40)},
   {...env,ADB_AUTO_COLLECT:"true"},
   {...env,V39_PHASE6_PROCESS_ARMED:"1"}
  ])
   expect(()=>assertP4G5V0078InstallIntentV39(changed))
    .toThrow("P4_G5_V0078_UNREVIEWED_INTENT_OR_ACTIVE_AUTOCOLLECT_HOLD");
 });
 it("accepts only exact staged reviewed blob with narrow non-FIDS fallback",()=>{
  const text=readFileSync(P4_G5_V0078_MIGRATION_V39,"utf8");
  expect(()=>assertP4G5V0078PinnedSqlV39(text,P4_G5_V0078_REVIEWED_GIT_BLOB_V39)).not.toThrow();
  expect(()=>assertP4G5V0078PinnedSqlV39(text,"0".repeat(40))).toThrow();
  expect(()=>assertP4G5V0078PinnedSqlV39(text.replace(
   "WHERE (source_type <> 'fids');","WHERE (source_type = 'fids');"),
   P4_G5_V0078_REVIEWED_GIT_BLOB_V39)).toThrow();
  expect(()=>assertP4G5V0078PinnedSqlV39(text+"\nGRANT ALL ON clean.flight_population TO PUBLIC;",
   P4_G5_V0078_REVIEWED_GIT_BLOB_V39)).toThrow();
 });
 it("rechecks catalog under exclusive lock, refuses missing identities/foreign key dependents",()=>{
  expect(()=>assertP4G5V0078LockedPreCatalogV39(before())).not.toThrow();
  for(const change of [
   {...before(),legacy:null},
   {...before(),dependent_fks:1},
   {...before(),bad_fids:1},
   {...before(),fids_guard:0},
   {...before(),replacement:NEW},
   {...before(),observed:null},
  ])
   expect(()=>assertP4G5V0078LockedPreCatalogV39(change))
    .toThrow("P4_G5_V0078_LOCKED_PRE_DDL_CATALOG_CHANGED_HOLD");
 });
 it("post-DDL requires original query key, new partial unique, unchanged grants/owner/triggers",()=>{
  expect(()=>assertP4G5V0078TransactionalCatalogV39(
   before(),after(),acl(),acl())).not.toThrow();
  expect(()=>assertP4G5V0078TransactionalCatalogV39(
   before(),{...after(),legacy_count:1},acl(),acl())).toThrow();
  expect(()=>assertP4G5V0078TransactionalCatalogV39(
   before(),{...after(),observed:"INDEX MISSING"},acl(),acl())).toThrow();
  expect(()=>assertP4G5V0078TransactionalCatalogV39(
   before(),after(),acl(),{...acl(),table_acl:"unexpected"}))
   .toThrow("P4_G5_V0078_ACL_OWNER_OR_TRIGGER_MUTATION_HOLD");
  expect(()=>assertP4G5V0078TransactionalCatalogV39(
   before(),after(),acl(),{...acl(),custom_trigger_count:3}))
   .toThrow("P4_G5_V0078_ACL_OWNER_OR_TRIGGER_MUTATION_HOLD");
 });
 it("error reporting never includes connection details or raw SQL messages",()=>{
  expect(safeP4G5V0078InstallerErrorV39(
   Object.assign(new Error("password=secret"),{code:"55P03"})))
   .toBe("P4_G5_V0078_INSTALL_SQLSTATE_55P03_HOLD");
  expect(safeP4G5V0078InstallerErrorV39(
   new Error("P4_G5_V0078_LOCKED_PRE_DDL_CATALOG_CHANGED_HOLD")))
   .toBe("P4_G5_V0078_LOCKED_PRE_DDL_CATALOG_CHANGED_HOLD");
  expect(safeP4G5V0078InstallerErrorV39(new Error("admin@db password")))
   .toBe("P4_G5_V0078_INSTALL_UNCLASSIFIED_HOLD");
 });
});
