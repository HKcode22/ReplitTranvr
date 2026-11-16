/** Independent read-only DB reservation/original metadata audit.
 * Exact known GitHub child IDs are inputs, NOT independently authenticated
 * by this module. Never returns provider contents, refunds, bill proof,
 * automatic closure or new-root permission. Existing ledger only.
 */
const hold=s=>{throw Error("HOLD_P6_REST_SETTLEMENT_"+s);};
const SHA=/^[a-f0-9]{64}$/,ID=x=>Number.isSafeInteger(x)&&x>0&&x<1e15;
const CAT=["FIDS_BASE_UNITS","FIDS_SPLIT_UNITS","FIDS_RETRY_UNIT_BUDGET","VALIDATION_UNIT_BUDGET","OUTCOME_REST_UNIT_BUDGET","HISTORY_BOOTSTRAP_UNIT_BUDGET","DIAGNOSTIC_UNIT_BUDGET"];
const utc=x=>{if(typeof x!=="string"||!Number.isFinite(Date.parse(x))||new Date(x).toISOString()!==x)hold("CLOCK");return Date.parse(x);};
const dbtime=x=>{const t=x instanceof Date?x.getTime():Date.parse(x);if(!Number.isSafeInteger(t))hold("DB_CLOCK");return t;};
const count=x=>{if(!Number.isSafeInteger(x)||x<0)hold("COUNT");return x;};
const sum=(xs,key)=>xs.reduce((n,x)=>n+count(x[key]),0);
function scope(input){
 if(!input||!SHA.test(input.manifestSha256??"")||!Array.isArray(input.paidCapableChildRuns)||input.paidCapableChildRuns.length>384)hold("SCOPE");
 const from=utc(input.epochUtc),until=utc(input.chainDeadlineUtc);
 if(from>=until||until-from>7200000)hold("CLOCK");
 const runs=input.paidCapableChildRuns.map(x=>{
  if(!x||Object.keys(x).sort().join(",")!=="lane,parentRunId,runId"||!ID(x.runId)||!ID(x.parentRunId)||x.runId===x.parentRunId||
   !["SOURCE","POST"].includes(x.lane))hold("CHILD_SCOPE");
  return {...x};
 });
 if(new Set(runs.map(x=>x.runId)).size!==runs.length||runs.some(x=>runs.some(y=>y.runId===x.parentRunId)))hold("CHILD_SCOPE");
 return {manifest:input.manifestSha256,from,until,runs,ids:runs.map(x=>String(x.runId))};
}
/** FIDS binding is an immutable committed metadata record. It is NOT
 * proof that still-retained raw bytes were fetched or externally billed.
 * POST uses its existing reservation marker; no raw payload leaves PG.
 */
export const P6_SOURCE_RESERVATION_SQL=`
SELECT a.github_run_id run_id,a.charged_reserved_units::int units,
 a.committed_at_utc reserved_at,
 CASE WHEN b.reservation_sha256 IS NULL THEN 'NO_ORIGINAL_METADATA'
 WHEN b.manifest_sha256 IS DISTINCT FROM a.manifest_sha256
 OR b.query_digest IS DISTINCT FROM a.query_digest
 OR q.population_query_id IS NULL
 OR q.fids_retrieval_utc<a.committed_at_utc OR b.bound_at_utc<a.committed_at_utc
 THEN 'ORIGINAL_METADATA_DRIFT'
 WHEN q.raw_expired_at_utc IS NOT NULL AND q.response_hash IS NULL AND q.raw_payload IS NULL
 AND q.raw_expired_at_utc>=q.fids_retrieval_utc
 THEN 'EXPIRED_SOURCE_BINDING_METADATA_ONLY'
 WHEN q.raw_expired_at_utc IS NOT NULL OR q.response_hash IS DISTINCT FROM b.response_hash
 THEN 'ORIGINAL_METADATA_DRIFT'
 ELSE 'COMMITTED_SOURCE_BINDING_METADATA' END original_state
 FROM clean.phase5_fids_physical_attempt_v39 a
 LEFT JOIN clean.phase5_fids_original_binding_v39 b ON b.reservation_sha256=a.reservation_sha256
 LEFT JOIN clean.fids_query_response q ON q.population_query_id=b.population_query_id
 WHERE a.manifest_sha256=$1 AND a.github_run_id=ANY($2::text[])
 ORDER BY a.github_run_id,a.reservation_sha256`;
export const P6_OTHER_RESERVATION_SQL=`
SELECT a.github_run_id run_id,a.approved_api_units::int units,a.reserved_at_utc reserved_at,a.rest_category category,
 CASE WHEN a.rest_category<>'OUTCOME_REST_UNIT_BUDGET' THEN 'NOT_POST_CATEGORY'
 WHEN o.n=0 THEN 'NO_ORIGINAL_METADATA'
 WHEN o.n<>1 OR o.good<>1 THEN 'ORIGINAL_METADATA_DRIFT'
 ELSE 'COMMITTED_POST_MARKER_METADATA' END original_state
 FROM clean.phase5_other_rest_physical_reservation_v39 a
 LEFT JOIN LATERAL (
 SELECT count(*)::int n,count(*) FILTER(WHERE q.fids_retrieval_utc>=a.reserved_at_utc
 AND q.response_hash ~ '^[a-f0-9]{64}$'
 AND q.raw_payload->>'phase5PostPurpose'='FUTURE_POST_SOURCE_OBSERVATION_NOT_AN_ACTUAL_PHYSICAL_LABEL'
 AND q.raw_payload->>'originalDecodedEntityBodyPreserved'='true'
 AND q.raw_payload#>>'{originalDecodedEntityBodyEvidence,bodySha256}' ~ '^[a-f0-9]{64}$'
 AND q.raw_payload#>>'{originalDecodedEntityBodyEvidence,representation}'='FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE')::int good
 FROM clean.fids_query_response q
 WHERE a.rest_category='OUTCOME_REST_UNIT_BUDGET'
 AND q.raw_payload->>'phase5PostReservationSha256'=a.reservation_sha256
 ) o ON true
 WHERE a.manifest_sha256=$1 AND a.github_run_id=ANY($2::text[])
 ORDER BY a.github_run_id,a.reservation_sha256`;
export const P6_CATEGORY_ACCOUNTING_SQL=`
WITH charges AS (
 SELECT a.charged_utc_date AS charge_day,p.rest_category category,a.charged_reserved_units units
 FROM clean.phase5_fids_physical_attempt_v39 a
 LEFT JOIN clean.phase5_fids_exact_query_partition_v39 p ON p.query_digest=a.query_digest AND p.manifest_sha256=a.manifest_sha256
 WHERE a.manifest_sha256=$1
 UNION ALL
 SELECT a.charged_utc_date AS charge_day,a.rest_category category,a.approved_api_units units
 FROM clean.phase5_other_rest_physical_reservation_v39 a WHERE a.manifest_sha256=$1
 ), actual AS (SELECT charge_day,coalesce(category,'UNCLASSIFIED') category,sum(units)::int units FROM charges GROUP BY 1,2),
 budget AS (SELECT charge_day_utc AS charge_day,category,planned_units,physically_reserved_units
 FROM clean.phase5_fids_utc_rest_category_budget_v39 WHERE manifest_sha256=$1)
 SELECT coalesce(b.charge_day,a.charge_day)::text AS "day",coalesce(b.category,a.category) category,
 b.planned_units planned_units,b.physically_reserved_units reserved_units,coalesce(a.units,0)::int ledger_units
 FROM budget b FULL JOIN actual a ON a.charge_day=b.charge_day AND a.category=b.category
 ORDER BY 1,2`;
const P6_UNATTRIBUTED_SQL=`
 SELECT count(*)::int n FROM (
 SELECT 1 FROM clean.phase5_fids_physical_attempt_v39 WHERE manifest_sha256=$1
 AND committed_at_utc >= $3::timestamptz AND committed_at_utc < $4::timestamptz AND NOT(github_run_id=ANY($2::text[]))
 UNION ALL
 SELECT 1 FROM clean.phase5_other_rest_physical_reservation_v39 WHERE manifest_sha256=$1
 AND reserved_at_utc >= $3::timestamptz AND reserved_at_utc < $4::timestamptz AND NOT(github_run_id=ANY($2::text[]))
 ) x`;
export function summarizeP6RestLedger(input,{sourceRows,otherRows,categoryRows,observedAt,unattributedReservationCount}){
 const a=scope(input),clock=dbtime(observedAt);
 if(clock<a.from||![sourceRows,otherRows,categoryRows].every(Array.isArray)||
  sourceRows.length+otherRows.length>1536||categoryRows.length>500)hold("READBACK_BOUND");
 const known=new Map(a.runs.map(x=>[String(x.runId),[]]));
 for(const [kind,rows] of [["SOURCE",sourceRows],["OTHER",otherRows]]){
  for(const row of rows){
   if(!known.has(row.run_id)||count(row.units)<1||row.units>100||dbtime(row.reserved_at)>clock||
      !["NO_ORIGINAL_METADATA","ORIGINAL_METADATA_DRIFT",kind==="SOURCE"?"COMMITTED_SOURCE_BINDING_METADATA":"COMMITTED_POST_MARKER_METADATA",
      ...(kind==="OTHER"?["NOT_POST_CATEGORY"]:["EXPIRED_SOURCE_BINDING_METADATA_ONLY"])].includes(row.original_state)||
      (kind==="SOURCE"&&row.units!==2)||(kind==="OTHER"&&!CAT.slice(2).includes(row.category)))hold("RESERVATION_METADATA");
   known.get(row.run_id).push({...row,kind,at:dbtime(row.reserved_at)});
  }
 }
 const children=[];
 for(const child of a.runs){
  const rows=known.get(String(child.runId)),r=rows[0];
  let disposition;
  if(rows.length===0)disposition="NO_RESERVATION_ROW_FOUND_NOT_BILL_PROOF";
  else if(rows.length!==1||(child.lane==="SOURCE"?r.kind!=="SOURCE":r.kind!=="OTHER"||r.category!=="OUTCOME_REST_UNIT_BUDGET")||r.units!==2)
   disposition="MULTIPLE_OR_WRONG_RESERVATION_SCOPE";
  else if(r.at<a.from)disposition="RESERVATION_BEFORE_ROOT_SCOPE";
  else disposition=r.original_state;
  children.push({...child,reservationCount:rows.length,reservedUnits:sum(rows,"units"),
   committedOriginalMetadataCount:rows.filter(x=>x.original_state.startsWith("COMMITTED_")||x.original_state==="EXPIRED_SOURCE_BINDING_METADATA_ONLY").length,
   reservationsAtOrAfterChainDeadline:rows.filter(x=>x.at>=a.until).length,disposition});
 }
 const days=new Map(),seen=new Set();let mismatches=0,ledgerUnits=0,budgetReservedUnits=0;
 for(const row of categoryRows){
  if(typeof row.day!=="string"||!/^\d{4}-\d\d-\d\d$/.test(row.day)||typeof row.category!=="string"||
    seen.has(row.day+"|"+row.category))hold("BUDGET_ROW_SCOPE");
  seen.add(row.day+"|"+row.category);ledgerUnits+=count(row.ledger_units);
  if(row.reserved_units!==null)budgetReservedUnits+=count(row.reserved_units);
  if(!days.has(row.day))days.set(row.day,new Set());days.get(row.day).add(row.category);
  if(!CAT.includes(row.category)||row.planned_units===null||row.reserved_units===null||
    count(row.reserved_units)!==row.ledger_units||row.reserved_units>count(row.planned_units))mismatches++;
 }
 const incompleteDays=[...days.values()].filter(x=>x.size!==7||CAT.some(k=>!x.has(k))).length;
 const expiredBindings=children.filter(x=>x.disposition==="EXPIRED_SOURCE_BINDING_METADATA_ONLY").length;
 const committed=children.filter(x=>["COMMITTED_SOURCE_BINDING_METADATA","COMMITTED_POST_MARKER_METADATA"].includes(x.disposition)).length+expiredBindings;
 return {schema:"v39.phase6.rest-settlement-readonly-inventory.v1",
  status:"READONLY_RESERVATION_AND_ORIGINAL_METADATA_NOT_PROVIDER_SETTLEMENT",
  observedDbUtc:new Date(clock).toISOString(),windowElapsed:clock>=a.until,requestedChildCount:children.length,children,
  knownChildReservedUnits:sum(children,"reservedUnits"),knownChildCommittedOriginalMetadataCount:committed,
  knownChildExpiredSourceBindingMetadataCount:expiredBindings,
  knownChildWithoutMatchedOriginalMetadata:children.length-committed,unattributedReservationCountInWindow:count(unattributedReservationCount),
  manifestCategoryAccounting:{chargeDays:days.size,incompleteDays,categoryCountMismatches:mismatches,ledgerUnits,budgetReservedUnits,
   completeAndConsistent:days.size>0&&incompleteDays===0&&mismatches===0&&ledgerUnits===budgetReservedUnits},
  sourceOriginalBytesIndependentlyVerified:false,githubChildIdentityIndependentlyVerifiedByThisReader:false,
  actualProviderBilledUnitsVerified:false,providerSettlementVerified:false,permitClose:false,permitNewRoot:false,permitReplay:false,
  providerCalls:0,databaseWrites:0,phase6PaidGo:false};
}

/** Match the runtime's committed ownership metadata to the owner database.
 * No policy signature inference, no lock, no closure, works after STOP.
 * The caller's transaction MUST be read-only; the owner audit creates it.
 */
export async function verifyP6RecordedDbRootMetadata(input,evidence,client){
 const a=scope(input),w=evidence?.recordedWindowCustody;
 if(!w||!ID(evidence.rootRunId)||w.rootRunId!==evidence.rootRunId||!ID(evidence.terminalRunId)||
   !/^[a-f0-9]{40}$/.test(evidence.reviewedMainSha??"")||!SHA.test(evidence.policyCommitment??"")||
   w.policyCommitment!==evidence.policyCommitment||!SHA.test(evidence.terminalReceiptSha256??"")||
   evidence.epochUtc!==input.epochUtc||evidence.chainDeadlineUtc!==input.chainDeadlineUtc||
   w.windowStartUtc!==evidence.windowStartUtc||w.windowEndUtc!==evidence.windowEndUtc||
   !Number.isSafeInteger(w.windowIndex)||w.windowIndex<0||w.windowIndex>719)hold("ROOT_SCOPE");
 const start=utc(w.windowStartUtc),end=utc(w.windowEndUtc),claimed=utc(w.claimedAtUtc);
 if(start>=end||a.from<start||a.until>end||claimed<a.from||claimed>=a.until)hold("ROOT_CLOCK");
 const out=await client.query(`
 SELECT w.root_run_id::text root_run_id,w.window_index,w.window_start_utc,w.window_end_utc,w.claimed_at_utc,
 w.release_code_sha,w.closed_at_utc,w.terminal_run_id::text terminal_run_id,w.terminal_receipt_sha256,
 EXISTS(SELECT 1 FROM clean.adb_phase6_authorization a WHERE a.singleton_key
 AND a.authorization_id=w.authorization_id AND a.manifest_sha256=w.manifest_sha256
 AND a.calendar_hash=w.calendar_sha256 AND a.config_hash=w.config_sha256 AND a.code_sha=w.release_code_sha) AS current_authorization_matches
 FROM clean.phase6_rolling_window_custody_v39 w
 WHERE w.root_run_id=$1::bigint AND w.manifest_sha256=$2 AND current_setting('transaction_read_only')='on'`,[String(w.rootRunId),a.manifest]);
 const row=out.rows?.[0];
 if(out.rowCount!==1||row?.root_run_id!==String(w.rootRunId)||row.window_index!==w.windowIndex||
   row.release_code_sha!==evidence.reviewedMainSha||dbtime(row.window_start_utc)!==start||
   dbtime(row.window_end_utc)!==end||dbtime(row.claimed_at_utc)!==claimed||
   typeof row.current_authorization_matches!=="boolean")hold("ROOT_DB_DRIFT");
 const alreadyClosed=row.closed_at_utc!==null;
 if(alreadyClosed&&(row.terminal_run_id!==String(evidence.terminalRunId)||row.terminal_receipt_sha256!==evidence.terminalReceiptSha256))hold("ROOT_EXISTING_CLOSURE_DRIFT");
 return {rootRunId:w.rootRunId,windowIndex:w.windowIndex,actualDbOwnershipMetadataMatched:true,rootAlreadyClosed:alreadyClosed,
  currentAuthorizationIdentityMatches:row.current_authorization_matches,policyCommitmentIndependentlyRecomputed:false,permitClose:false};
}

export async function readP6RestLedgerAccounting(input,client,{expectedActor="neondb_owner",rootEvidence}={}){
 const a=scope(input);
 if(!client||typeof client.query!=="function"||!["neondb_owner","postgres"].includes(expectedActor))hold("READONLY_CLIENT");
 let open=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");open=true;
  await client.query("SET LOCAL statement_timeout='15000ms'");
  await client.query("SET LOCAL lock_timeout='2000ms'");
  const ident=(await client.query("SELECT current_database() db,current_user actor,session_user login,current_setting('server_version_num')::int ver,pg_is_in_recovery() replica,current_setting('transaction_read_only') ro,current_setting('transaction_isolation') isolation,clock_timestamp() at")).rows[0];
  if(!ident||ident.db!=="neondb"||ident.actor!==expectedActor||ident.login!==expectedActor||
    Math.floor(ident.ver/10000)!==16||ident.replica!==false||ident.ro!=="on"||ident.isolation!=="repeatable read")hold("DB_IDENTITY");
  const root=rootEvidence===undefined?null:await verifyP6RecordedDbRootMetadata(input,rootEvidence,client);
  const sourceRows=(await client.query(P6_SOURCE_RESERVATION_SQL,[a.manifest,a.ids])).rows;
  const otherRows=(await client.query(P6_OTHER_RESERVATION_SQL,[a.manifest,a.ids])).rows;
  const categoryRows=(await client.query(P6_CATEGORY_ACCOUNTING_SQL,[a.manifest])).rows;
  const unmatched=(await client.query(P6_UNATTRIBUTED_SQL,[a.manifest,a.ids,new Date(a.from).toISOString(),new Date(a.until).toISOString()])).rows[0]?.n;
  const out=summarizeP6RestLedger(input,{sourceRows,otherRows,categoryRows,observedAt:ident.at,unattributedReservationCount:unmatched});
  await client.query("ROLLBACK");open=false;
  return {...out,actualDbClock:true,readOnlyRepeatableRead:true,actualDbOwnershipVerified:false,
   ...(root?{rootCustody:root}:{})};
 }finally{if(open)await client.query("ROLLBACK").catch(()=>{});}
}
