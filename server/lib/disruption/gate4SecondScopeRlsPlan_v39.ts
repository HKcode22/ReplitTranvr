/**
 * Gate4 second trial writer RLS blueprint — DRAFT / NO I/O.
 *
 * This module does NOT connect to PostgreSQL, execute DDL, provision roles,
 * modify secrets, call AeroDataBox, schedule GitHub STOP, or authorize spend.
 * Statements are a REVIEW artifact for a future independently approved owner
 * transaction. Do not run these without verification of current DB role
 * metadata, signed new AUTH, planned source and explicit production approval.
 *
 * Preserve historical V0071/V0072 evidence and policy names. Add two policies
 * for a distinct NOINHERIT NOBYPASSRLS writer. Do not add permissive PUBLIC or
 * shared-role policies, or any UPDATE/DELETE right.
 */
export type Gate4SecondScopeRlsSpecV39=Readonly<{
  previousScopeId:string;
  nextScopeId:string;
  nextAuthorizationSha256:string;
  nextReceiverSourceSha:string;
  airportIcao:"WSSS";
  nextWriterRole:string;
  legacyOwnedBindings:number;
  otherOwnedBindings:number;
  previousOriginalRows:number;
  previousWriterExists:boolean;
  nextWriterRoleExists:boolean;
  rlsEnabled:boolean;
  existingPolicyNames:readonly string[];
}>;

export type Gate4SecondScopeRlsReviewV39=Readonly<{
 schema:"v39.gate4.second-scope-rls-blueprint.v1";
 status:"HOLD_INVALID_NEXT_SCOPE"|"HOLD_EXISTING_DB_STATE"|"REVIEW_ONLY_READY";
 statements:readonly string[];
 preservesPreviousBinding:boolean;
 oldWriterRetirementStillSeparate:boolean;
 independentSTOPMustBeArmedBeforeCREATE:true;
 authorizesProductionDdl:false;
 authorizesProviderCreate:false;
 authorizesRepublish:false;
 providerRequests:0;
 databaseWrites:0;
}>;

const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const hash=/^[a-f0-9]{64}$/;
const sha=/^[a-f0-9]{40}$/;
const role=/^gate4_owner_writer_(?:20[2-9][0-9])[a-z0-9_]{5,28}$/;
const expectedPolicies=[
 "gate4_safety_select_v39",
 "gate4_writer_insert_20261023",
 "gate4_writer_select_20261023"
] as const;

function result(status:Gate4SecondScopeRlsReviewV39["status"],
 statements:readonly string[]=[]):Gate4SecondScopeRlsReviewV39{
 return {
  schema:"v39.gate4.second-scope-rls-blueprint.v1",
  status,statements,
  preservesPreviousBinding:status==="REVIEW_ONLY_READY",
  oldWriterRetirementStillSeparate:true,
  independentSTOPMustBeArmedBeforeCREATE:true,
  authorizesProductionDdl:false,
  authorizesProviderCreate:false,
  authorizesRepublish:false,
  providerRequests:0,databaseWrites:0
 };
}

/** Returns only proposed SQL fragments. Never executes them. */
export function reviewGate4SecondScopeRlsV39(
 s:Gate4SecondScopeRlsSpecV39
):Gate4SecondScopeRlsReviewV39{
 if(!s||!uuid.test(s.previousScopeId)||!uuid.test(s.nextScopeId)||
    s.previousScopeId.toLowerCase()===s.nextScopeId.toLowerCase()||
    !hash.test(s.nextAuthorizationSha256)||
    !sha.test(s.nextReceiverSourceSha)||
    s.airportIcao!=="WSSS"||
    !role.test(s.nextWriterRole)||
    s.nextWriterRole==="gate4_owner_writer_20261023")
  return result("HOLD_INVALID_NEXT_SCOPE");
 const policies=[...s.existingPolicyNames].sort();
 if(s.legacyOwnedBindings!==1||s.otherOwnedBindings!==0||
    !Number.isSafeInteger(s.previousOriginalRows)||
    s.previousOriginalRows<1||
    s.previousWriterExists!==true||
    s.nextWriterRoleExists!==false||
    s.rlsEnabled!==true||
    policies.length!==expectedPolicies.length||
    policies.some((name,i)=>name!==[...expectedPolicies].sort()[i]))
  return result("HOLD_EXISTING_DB_STATE");
 // Quoting through input restrictions above, NOT user-supplied raw SQL.
 // Future role provisioning requires a separate reviewed, expiring password
 // and NOINHERIT/NOBYPASSRLS privilege checks (not done by this planner).
 const table="clean.gate4_alert_owned_binding_v39";
 const predicate="scope_id='"+s.nextScopeId+"'::uuid"+
   " AND authorization_sha256='"+s.nextAuthorizationSha256+"'"+
   " AND source_commit='"+s.nextReceiverSourceSha+"'"+
   " AND airport_icao='WSSS'";
 const next=s.nextWriterRole;
 const sql=[
  "GRANT CONNECT ON DATABASE neondb TO "+next,
  "GRANT USAGE ON SCHEMA clean TO "+next,
  "GRANT SELECT,INSERT ON TABLE "+table+" TO "+next,
  "CREATE POLICY gate4_next_writer_select_v39 ON "+table+
    " FOR SELECT TO "+next+" USING ("+predicate+")",
  "CREATE POLICY gate4_next_writer_insert_v39 ON "+table+
    " FOR INSERT TO "+next+" WITH CHECK ("+predicate+")"
 ] as const;
 return result("REVIEW_ONLY_READY",sql);
}
