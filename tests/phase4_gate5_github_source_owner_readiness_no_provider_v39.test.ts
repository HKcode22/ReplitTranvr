import {describe,expect,it} from "vitest";
import {
 classifyP4G5GithubOwnerReadinessV39,
 P4_G5_GITHUB_OWNER_READINESS_SCHEMA_V39
} from "../scripts/v39_phase4_gate5_future_github_source_owner_readonly_readiness";

type Facts=NonNullable<Parameters<typeof classifyP4G5GithubOwnerReadinessV39>[0]["reader"]>;
const tables=["original","population","binding","cohortBudget",
 "physicalOwner","allowedQuery","physicalAttempt","preSnapshots"] as const;
function role(n:"audit"|"owner"):Facts{
 const t={} as Facts["tables"];
 for(const key of tables)
  t[key]={exists:true,select:true,insert:n==="owner",
   update:false,delete:false};
 return {
  dbName:"same-synthetic-db",roleName:n,
  pg16:true,txReadOnly:true,isSuperuser:false,
  canCreateSchema:false,canCreateDatabase:false,tables:t,
  serialUsage:{populationId:n==="owner",preSnapshotId:n==="owner"}
 };
}
function evidence(){
 return {
  providerApiCredentialPresent:true,readerCredentialPresent:true,
  ownerCredentialPresent:true,reader:role("audit"),owner:role("owner")
 };
}
describe("prospective Gate5 GitHub-only source owner readiness",()=>{
 it("can only report technical candidate — never paid/science authority",()=>{
  const x=classifyP4G5GithubOwnerReadinessV39(evidence());
  expect(x.schema).toBe(P4_G5_GITHUB_OWNER_READINESS_SCHEMA_V39);
  expect(x.status).toBe("TECHNICAL_CREDENTIALS_CANDIDATE_ONLY_SCIENCE_RELEASE_HOLD");
  expect(Object.values(x.flags).every(Boolean)).toBe(true);
  for(const key of ["verifiedActualTimeMilestone","verifiedPerRecordActualOnlyRunway",
   "lawfulOriginalAndDerivedUseCertified","liveManifestPromotionPinAssigned",
   "liveRestApiRequestMade","scientificGate5Passed","phase5FreezeAuthorized",
   "phase6Authorized"] as const)
   expect(x[key]).toBe(false);
  expect(x.databaseWrites).toBe(0);
  expect(x.providerCalls).toBe(0);
 });
 it("isolated DB reader secret absence wins over every other status",()=>{
  expect(classifyP4G5GithubOwnerReadinessV39({
   ...evidence(),readerCredentialPresent:false,reader:null
  }).status).toBe("HOLD_GITHUB_READER_SECRET_ABSENT");
 });
 it("a missing dedicated database owner secret is diagnosed, never broaden the audit role",()=>{
  const o=classifyP4G5GithubOwnerReadinessV39({
   ...evidence(),ownerCredentialPresent:false,owner:null
  });
  expect(o.status).toBe("HOLD_GITHUB_DEDICATED_SOURCE_OWNER_SECRET_ABSENT");
  expect(o.flags.prospectiveOwnerInsertRightsAvailableInReadOnlyCatalog).toBe(false);
 });
 it("paid key missing never authorizes a source GET",()=>{
  expect(classifyP4G5GithubOwnerReadinessV39({
   ...evidence(),providerApiCredentialPresent:false
  }).status).toBe("HOLD_GITHUB_PROVIDER_KEY_ABSENT");
 });
 it("restricted audit role requires readable V0077 and PRE, not fake zero rows",()=>{
  for(const k of ["original","binding","allowedQuery","physicalOwner",
    "physicalAttempt","preSnapshots"] as const){
   const x=evidence();x.reader!.tables[k].select=false;
   expect(classifyP4G5GithubOwnerReadinessV39(x).status)
    .toBe("HOLD_GITHUB_READER_V0077_SOURCE_PRE_ACL");
  }
 });
 it("dedicated write role cannot silently inherit DDL, DELETE or superuser",()=>{
  for(const mutate of [
   (x:ReturnType<typeof evidence>)=>{x.owner!.isSuperuser=true},
   (x:ReturnType<typeof evidence>)=>{x.owner!.canCreateSchema=true},
   (x:ReturnType<typeof evidence>)=>{x.owner!.canCreateDatabase=true},
   (x:ReturnType<typeof evidence>)=>{x.owner!.tables.binding.delete=true},
   (x:ReturnType<typeof evidence>)=>{x.owner!.tables.original.insert=false},
   (x:ReturnType<typeof evidence>)=>{x.owner!.tables.preSnapshots.exists=false},
  ]){
   const x=evidence();mutate(x);
   expect(classifyP4G5GithubOwnerReadinessV39(x).status)
    .toBe("HOLD_GITHUB_SOURCE_OWNER_LEAST_PRIVILEGE_ACL");
  }
 });
 it("separately verifies sequence USAGE for the restricted source writer",()=>{
  for(const key of ["populationId","preSnapshotId"] as const){
   const x=evidence();x.owner!.serialUsage[key]=false;
   const r=classifyP4G5GithubOwnerReadinessV39(x);
   expect(r.status).toBe("HOLD_GITHUB_SOURCE_OWNER_SEQUENCE_USAGE");
   expect(r.flags.prospectiveOwnerInsertRightsAvailableInReadOnlyCatalog).toBe(true);
   expect(r.flags[key==="populationId"?"sourceOwnerCanUsePopulationIdSequence":
    "sourceOwnerCanUsePreSnapshotIdSequence"]).toBe(false);
   expect(r.databaseWrites).toBe(0);expect(r.providerCalls).toBe(0);
  }
 });
 it("reader and owner roles must be distinct and on one exact database",()=>{
  for(const mutate of [
   (x:ReturnType<typeof evidence>)=>{x.owner!.roleName=x.reader!.roleName},
   (x:ReturnType<typeof evidence>)=>{x.owner!.dbName="different-synthetic-db"}
  ]){
   const x=evidence();mutate(x);
   expect(classifyP4G5GithubOwnerReadinessV39(x).status)
    .toBe("HOLD_GITHUB_DB_ROLE_SEPARATION");
  }
 });
 it("pinpoints excessive independent reader privileges without inventing an owner problem",()=>{
  for(const key of ["isSuperuser","canCreateSchema","canCreateDatabase"] as const){
   const x=evidence();
   x.reader![key]=true;
   const r=classifyP4G5GithubOwnerReadinessV39(x);
   expect(r.status).toBe(key==="isSuperuser" ?
    "HOLD_GITHUB_READER_V0077_SOURCE_PRE_ACL":
    "HOLD_GITHUB_DB_ROLE_SEPARATION");
   expect(r.flags.prospectiveOwnerInsertRightsAvailableInReadOnlyCatalog).toBe(true);
   expect(r.flags.separateSameDatabaseReaderAndOwnerRoles).toBe(true);
   expect(r.flags.neitherRoleHasSchemaOrDbAdminPrivilege).toBe(false);
   expect(r.flags.readerNotSuperuser).toBe(key!=="isSuperuser");
   expect(r.flags.readerCannotCreateSchema).toBe(key!=="canCreateSchema");
   expect(r.flags.readerCannotCreateDatabase).toBe(key!=="canCreateDatabase");
   expect(r.flags.sourceOwnerNotSuperuser).toBe(true);
   expect(r.flags.sourceOwnerCannotCreateSchema).toBe(true);
   expect(r.flags.sourceOwnerCannotCreateDatabase).toBe(true);
   expect(r.providerCalls).toBe(0);expect(r.databaseWrites).toBe(0);
  }
 });
 it("a superuser reader cannot be approved for independent least-privilege audit",()=>{
  const x=evidence();
  x.reader!.isSuperuser=true;
  expect(classifyP4G5GithubOwnerReadinessV39(x).status)
   .toBe("HOLD_GITHUB_READER_V0077_SOURCE_PRE_ACL");
 });
 it("zero credential flags are always a diagnostic HOLD",()=>{
  const x=classifyP4G5GithubOwnerReadinessV39({
   providerApiCredentialPresent:false,readerCredentialPresent:false,
   ownerCredentialPresent:false,reader:null,owner:null
  });
  expect(x.status).toBe("HOLD_GITHUB_READER_SECRET_ABSENT");
  expect(x.providerCalls).toBe(0);
 });
});
