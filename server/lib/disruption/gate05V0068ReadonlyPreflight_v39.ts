/**
 * Gate05 V0068 pre-installation catalog + ledger preflight. DRAFT ONLY.
 *
 * NO database client, execution, DDL, credentials, provider I/O or implicit
 * authorization. An independently approved operator may run the TWO SELECTs
 * inside a read-only transaction on the correct production database.
 *
 * If an index with the expected name already exists, HOLD for a structural
 * inspection; never reapply V0068 or trust the index name alone.
 */
type Row=Record<string,unknown>;
const reject=(reason:string):never=>{
  throw Error("GATE05_V0068_"+reason+"_HOLD");
};
function exactlyOneRow(value:unknown):Row{
  if(!Array.isArray(value)||value.length!==1)return reject("RESULT_SHAPE");
  const row:unknown=value[0];
  if(row===null||typeof row!=="object"||Array.isArray(row))
    return reject("RESULT_SHAPE");
  return row as Row;
}
export function gate05V0068ReadonlyPreflightSqlV39(){
  return {
    schema:"v39.gate05.v0068-readonly-preflight-sql.v1" as const,
    // The caller must separately enforce a READ ONLY transaction and
    // independently attest the production DB identity.
    catalogSql:[
      "SELECT",
      " to_regclass('clean.gate05_fids_pilot_scope_v39') IS NOT NULL AS scope_table_exists,",
      " to_regclass('clean.gate05_fids_allowed_query_v39') IS NOT NULL AS allowed_query_table_exists,",
      " to_regclass('clean.gate05_fids_attempt_v39') IS NOT NULL AS attempt_table_exists,",
      " to_regprocedure('clean.reserve_gate05_fids_attempt_v39(uuid,uuid,text,text,text,text,text,text,integer,integer)') IS NOT NULL AS reserve_function_exists,",
      " to_regprocedure('clean.stop_gate05_fids_pilot_v39(uuid,text)') IS NOT NULL AS stop_function_exists,",
      " coalesce((SELECT NOT rolcanlogin FROM pg_roles WHERE rolname='gate05_fids_dispatch_v39'),false) AS dispatch_group_nonlogin,",
      " coalesce((SELECT NOT rolcanlogin FROM pg_roles WHERE rolname='gate05_fids_safety_v39'),false) AS safety_group_nonlogin,",
      " coalesce((SELECT NOT rolcanlogin FROM pg_roles WHERE rolname='gate05_fids_commission_v39'),false) AS commission_group_nonlogin,",
      " (to_regclass('clean.gate05_fids_one_open_scope_v39') IS NOT NULL OR",
      " to_regclass('clean.gate05_fids_one_authorization_id_v39') IS NOT NULL OR",
      " to_regclass('clean.gate05_fids_one_authorization_sha_v39') IS NOT NULL)",
      " AS v0068_index_name_exists"
    ].join("\n"),
    // Run only if ALL required prior schema/catalog checks passed.
    // Historical STOPPED evidence is not a reason to delete or suppress.
    inventorySql:[
      "SELECT",
      " count(*) FILTER (WHERE state IN ('PREPARED','ACTIVE'))::integer AS open_scope_count,",
      " count(*) FILTER (WHERE state='PREPARED')::integer AS prepared_scope_count,",
      " count(*) FILTER (WHERE state='ACTIVE')::integer AS active_scope_count,",
      " count(*) FILTER (WHERE state='STOPPED')::integer AS stopped_history_count,",
      " count(*)::integer AS total_scope_count,",
      " (SELECT count(*)::integer FROM clean.gate05_fids_allowed_query_v39) AS total_query_count,",
      " (SELECT count(*)::integer FROM clean.gate05_fids_attempt_v39) AS total_attempt_count",
      "FROM clean.gate05_fids_pilot_scope_v39"
    ].join("\n"),
    queryCount:2 as const,
    defaultTransactionReadOnlyRequired:true as const,
    allowsSchemaWrites:false as const,
    approvedForDeployment:false as const,
    paidPilotAuthorized:false as const
  };
}
export function reviewGate05V0068ReadonlyPreflightV39(
  catalogRows:unknown,inventoryRows:unknown
){
  const cat=exactlyOneRow(catalogRows);
  const required=[
    "scope_table_exists","allowed_query_table_exists","attempt_table_exists",
    "reserve_function_exists","stop_function_exists",
    "dispatch_group_nonlogin","safety_group_nonlogin",
    "commission_group_nonlogin"
  ] as const;
  if(required.some(k=>cat[k]!==true))return reject("PRIOR_SCHEMA");
  if(cat.v0068_index_name_exists!==false)
    return reject("INDEX_EXISTING_OR_UNKNOWN");
  const inv=exactlyOneRow(inventoryRows);
  const countKeys=[
    "open_scope_count","prepared_scope_count","active_scope_count",
    "stopped_history_count","total_scope_count",
    "total_query_count","total_attempt_count"
  ] as const;
  if(countKeys.some(k=>typeof inv[k]!=="number"||
    !Number.isSafeInteger(inv[k])||(inv[k] as number)<0))
    return reject("COUNTS");
  if((inv.open_scope_count as number)!==
      (inv.prepared_scope_count as number)+(inv.active_scope_count as number)||
     (inv.total_scope_count as number)!==
      (inv.open_scope_count as number)+(inv.stopped_history_count as number))
    return reject("ACCOUNTING");
  if(inv.open_scope_count!==0)return reject("EXISTING_OPEN_SCOPE");
  return {
    schema:"v39.gate05.v0068-readonly-preflight-review.v1" as const,
    status:"V0068_CATALOG_CANDIDATE_ONLY_NOT_RELEASED" as const,
    priorTablesAndRolesVerified:true as const,
    noOpenGate05ScopeVerified:true as const,
    v0068IndexNotInstalledVerified:true as const,
    historicalStoppedScopeCount:inv.stopped_history_count as number,
    historicalAllowedQueryCount:inv.total_query_count as number,
    historicalAttemptCount:inv.total_attempt_count as number,
    // Caller provided rows: this function does not attest DB origin.
    productionDatabaseIdentityAttested:false as const,
    migrationInstallationAuthorized:false as const,
    productionDatabaseWrites:0 as const,
    paidPilotAuthorized:false as const,
    providerRequests:0 as const
  };
}
