/**
 * Gate4 second WSSS ordinary Alert receiver V0071 RLS — PURE REVIEW PLAN.
 * No database connection, DDL execution, provider request, callback, deploy,
 * role credential, or authorization. Existing historical V0071 original
 * must remain immutable. No privilege on V0072 may be granted to receivers.
 *
 * Keep the existing receiver isolated to OLD scope so an already published
 * historical binary is not silently granted the new trial's UUID.
 * New receiver is restricted by UUID, AUTH, compiled receiver source and ICAO.
 * Enabling RLS or adding roles requires separate signed production approval.
 */
export type Gate4SecondReceiverRlsInputsV39=Readonly<{
  oldScopeId:string;
  nextScopeId:string;
  nextAuthSha256:string;
  nextPublishedSourceSha:string;
  nextReceiverRole:string;
  oldOriginalCount:number;
  otherOriginalCount:number;
  oldReceiverExists:boolean;
  oldReceiverLoginEnabled:boolean;
  newReceiverAlreadyExists:boolean;
  rlsCurrentlyEnabled:boolean;
  existingPolicies:readonly string[];
}>;
export type Gate4SecondReceiverRlsResultV39=Readonly<{
  schema:"v39.gate4.second-receiver-rls-plan.v1";
  status:"REVIEW_ONLY_READY"|"HOLD_INVALID_SCOPE"|"HOLD_DATABASE_BASELINE";
  statements:readonly string[];
  authorizesDDL:false;
  authorizesDeploy:false;
  authorizesProvider:false;
  providerRequests:0;
  databaseWrites:0;
  keepsHistoricPrepaidRoute:true;
}>;
const OLD="498dccd7-5da3-4687-a6ea-e0dc03b54398";
const oldRole="gate4_receiver_20261022";
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const ROLE=/^gate4_receiver_20[2-9][0-9]_[a-z0-9_]{5,28}$/;
const policyNames=[
 "gate4_legacy_receiver_select_v39",
 "gate4_legacy_receiver_insert_v39",
 "gate4_next_receiver_select_v39",
 "gate4_next_receiver_insert_v39"
] as const;
function outcome(status:Gate4SecondReceiverRlsResultV39["status"],
 statements:readonly string[]=[]):Gate4SecondReceiverRlsResultV39{
 return {schema:"v39.gate4.second-receiver-rls-plan.v1",
  status,statements,authorizesDDL:false,authorizesDeploy:false,
  authorizesProvider:false,providerRequests:0,databaseWrites:0,
  keepsHistoricPrepaidRoute:true};
}
export function reviewGate4SecondReceiverRlsV39(
 x:Gate4SecondReceiverRlsInputsV39
):Gate4SecondReceiverRlsResultV39{
 if(!x||x.oldScopeId!==OLD||!UUID.test(x.nextScopeId)||
   x.nextScopeId.toLowerCase()===OLD||!HASH.test(x.nextAuthSha256)||
   !SHA.test(x.nextPublishedSourceSha)||
   !ROLE.test(x.nextReceiverRole)||
   x.nextReceiverRole===oldRole)
   return outcome("HOLD_INVALID_SCOPE");
 if(!Number.isSafeInteger(x.oldOriginalCount)||x.oldOriginalCount!==1||
   x.otherOriginalCount!==0||x.oldReceiverExists!==true||
   x.oldReceiverLoginEnabled!==true||x.newReceiverAlreadyExists!==false||
   x.rlsCurrentlyEnabled!==false||!Array.isArray(x.existingPolicies)||
   x.existingPolicies.length!==0)
   return outcome("HOLD_DATABASE_BASELINE");
 const t="clean.gate4_alert_prebind_original_v39";
 const oldScope="scope_id='"+OLD+"'::uuid";
 const newScope="scope_id='"+x.nextScopeId+"'::uuid"+
  " AND authorization_sha256='"+x.nextAuthSha256+"'"+
  " AND source_commit='"+x.nextPublishedSourceSha+"'"+
  " AND airport_icao='WSSS'";
 const role=x.nextReceiverRole;
 // Proposed DDL ORDER is deliberate: install policies and verify them
 // in the same transaction as ENABLE RLS; never commit partial admission.
 // Password/login creation and post-commit readback require separate review.
 const statements=[
  "GRANT CONNECT ON DATABASE neondb TO "+role,
  "GRANT USAGE ON SCHEMA clean TO "+role,
  "GRANT SELECT,INSERT ON TABLE "+t+" TO "+role,
  "CREATE POLICY "+policyNames[0]+" ON "+t+
   " FOR SELECT TO "+oldRole+" USING ("+oldScope+")",
  "CREATE POLICY "+policyNames[1]+" ON "+t+
   " FOR INSERT TO "+oldRole+" WITH CHECK ("+oldScope+")",
  "CREATE POLICY "+policyNames[2]+" ON "+t+
   " FOR SELECT TO "+role+" USING ("+newScope+")",
  "CREATE POLICY "+policyNames[3]+" ON "+t+
   " FOR INSERT TO "+role+" WITH CHECK ("+newScope+")",
  "ALTER TABLE "+t+" ENABLE ROW LEVEL SECURITY"
 ] as const;
 return outcome("REVIEW_ONLY_READY",statements);
}
