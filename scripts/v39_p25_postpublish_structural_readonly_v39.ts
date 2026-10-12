/**
 * P25 operator convenience: one compact, READ-ONLY, post-publish check.
 * Immutable release expected here is the merged PR#30 commit, not the
 * inspection branch HEAD. No SQL modifications, storage operations or
 * AeroDataBox calls. No provider secrets or raw source content printed.
 * Exit 0 means post-publish/source + V0064 STRUCTURE verified, NOT paid GO.
 */
import {v39Pool as pool} from "../server/lib/disruption/db_v39.ts";

const RELEASE="89c3b170e56c89dc79df61dfaddbe94116280923";
const ENDPOINT="https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime";
const COLUMNS=[
 ["session_id","uuid",true],
 ["delivery_id","text",true],
 ["source_sha256","text",true],
 ["source_bytes","integer",true],
 ["blob_ref_id","uuid",true],
 ["object_name","text",true],
 ["first_node_received_utc","timestamp with time zone",true],
 ["source_retention_until","timestamp with time zone",true],
 ["state","text",true],
 ["verified_at_utc","timestamp with time zone",false]
] as const;
const REQUIRE_CONSTRAINTS=[
 "phase2g_prepaid_source_intent_v39_pkey",
 "phase2g_prepaid_source_intent_v39_blob_ref_id_key",
 "phase2g_prepaid_source_intent_v39_object_name_key",
 "p2g_source_intent_exact_object_name",
 "p2g_source_intent_exact_retention",
 "p2g_source_intent_state_shape",
 "phase2g_prepaid_source_intent_v39_delivery_id_check",
 "phase2g_prepaid_source_intent_v39_source_sha256_check",
 "phase2g_prepaid_source_intent_v39_source_bytes_check",
 "phase2g_prepaid_source_intent_v39_state_check"
];

async function main(){
 let endpointHttp=0, live:any=null;
 try{
   const response=await fetch(ENDPOINT,{
     headers:{accept:"application/json"},signal:AbortSignal.timeout(12_000)
   });
   endpointHttp=response.status;
   live=await response.json().catch(()=>null);
 }catch{ /* fail closed, no network specifics or secrets */ }
 const publicOk=endpointHttp===200&&live?.status==="PASS"&&
   live?.schema==="v39.phase2f-workspace-runtime.v1"&&
   live?.git_head===RELEASE&&
   live?.runtime_owner_mode==="replit-published-deployment"&&
   live?.published_deployment===true&&
   live?.prepaid_route_registered===true&&
   Number(live?.retention_hours)===168&&
   live?.provider_mutation===false;
 const publicResult={
   http_status:endpointHttp,
   expected_head:RELEASE,
   claimed_published_head:typeof live?.git_head==="string"?live.git_head:null,
   claimed_deployed_contract_pass:publicOk,
   callback_only_route_owner:
     live?.route_owner==="server/phase2gCallbackOnly.ts+server/routes_v3.ts",
   published_original_source_custody_ready:live?.prepaid_source_custody_ready===true,
   published_durability_class:live?.runtime_durability_class??null,
   // A passing GET cannot establish receipt or callback ACK reliability.
   actual_signed_post_proven_by_this_check:false
 };
 let database:any={status:"NOT_CHECKED"},error=false;
 let client;
 try{
   client=await pool.connect();
   await client.query("BEGIN TRANSACTION READ ONLY");
   await client.query("SET LOCAL statement_timeout='10000ms'");
   const rel=(await client.query(`
     SELECT c.relkind,c.relpersistence,c.relnamespace::regnamespace::text AS schema_name,
       c.relname
     FROM pg_class c
     WHERE c.oid=to_regclass('clean.phase2g_prepaid_source_intent_v39')
   `)).rows[0]??{};
   const columns=(await client.query(`
     SELECT a.attname,format_type(a.atttypid,a.atttypmod) AS sql_type,
       a.attnotnull
     FROM pg_attribute a
     WHERE a.attrelid=to_regclass('clean.phase2g_prepaid_source_intent_v39')
       AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum
   `)).rows;
   const cons=(await client.query(`
     SELECT conname,convalidated,condeferrable,
       pg_get_constraintdef(oid) AS definition
     FROM pg_constraint
     WHERE conrelid=to_regclass('clean.phase2g_prepaid_source_intent_v39')
   `)).rows;
   const trg=(await client.query(`
     SELECT t.tgname,t.tgenabled,t.tgisinternal,t.tgtype::int AS kind_flags,
       t.tgfoid=to_regprocedure('clean.guard_p2g_prepaid_source_intent_v39()') AS same_function
     FROM pg_trigger t
     WHERE t.tgrelid=to_regclass('clean.phase2g_prepaid_source_intent_v39')
       AND t.tgname='trg_p2g_prepaid_source_intent_v39'
   `)).rows;
   const fn=(await client.query(`
     SELECT pg_get_functiondef(to_regprocedure(
       'clean.guard_p2g_prepaid_source_intent_v39()')) AS body
   `)).rows[0]?.body??"";
   const cset=new Map(cons.map((r:any)=>[r.conname,r]));
   const constraintOk=REQUIRE_CONSTRAINTS.every(name=>{
     const c:any=cset.get(name);
     return c?.convalidated===true&&c?.condeferrable===false;
   });
   const definitions=new Map(cons.map((r:any)=>[r.conname,String(r.definition??"")]));
   const contains=(name:string,...needles:string[])=>
     needles.every(x=>String(definitions.get(name)??"").includes(x));
   const semanticsOk=
     contains("p2g_source_intent_exact_object_name",
       "v39/provider/raw_provider_content/","blob_ref_id")&&
     contains("p2g_source_intent_exact_retention",
       "source_retention_until","first_node_received_utc","168")&&
     contains("p2g_source_intent_state_shape","PENDING","VERIFIED","verified_at_utc")&&
     contains("phase2g_prepaid_source_intent_v39_source_bytes_check","2097152")&&
     contains("phase2g_prepaid_source_intent_v39_source_sha256_check","64");
   const colsOk=columns.length===COLUMNS.length&&
     COLUMNS.every(([name,typ,required],i)=>columns[i]?.attname===name&&
       columns[i]?.sql_type===typ&&columns[i]?.attnotnull===required);
   const expectedFn=[
     "P2G source-intent deletion forbidden",
     "P2G original source intent must begin unverified",
     "P2G original source intent identity/retention immutable",
     "P2G original source intent only permits PENDING to VERIFIED once"
   ];
   const functionOk=typeof fn==="string"&&expectedFn.every(t=>fn.includes(t));
   const triggerOk=trg.length===1&&trg[0].tgname==="trg_p2g_prepaid_source_intent_v39"&&
     trg[0].tgenabled==="O"&&trg[0].tgisinternal===false&&
     trg[0].kind_flags===31&&trg[0].same_function===true;
   const tableOk=rel.relkind==="r"&&rel.relpersistence==="p"&&
     rel.schema_name==="clean"&&rel.relname==="phase2g_prepaid_source_intent_v39";
   const active=(await client.query(`
     SELECT (SELECT count(*)::int FROM clean.adb_anchor_probe
       WHERE status IN ('probing','settling')) AS active_probes,
       (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime
       WHERE state='active') AS active_sessions,
       (SELECT count(*)::int FROM clean.adb_incident_stop
       WHERE resolved=false) AS unresolved_incidents,
       (SELECT count(*)::int FROM clean.phase2g_prepaid_source_intent_v39)
       AS persisted_source_intents
   `)).rows[0];
   const old=(await client.query(`
     SELECT count(*)::int AS original_refs,
       count(*) FILTER (WHERE deletion_verified_at_utc IS NULL)::int AS retained_refs
     FROM clean.provider_content_blob_ref
     WHERE source_kind='webhook'
       AND source_record_id LIKE $1
   `,["prepaid:6267293e-75a0-42a7-b977-89543f200ebc:%"])).rows[0];
   const schemaOk=tableOk&&colsOk&&constraintOk&&semanticsOk&&functionOk&&triggerOk;
   database={
     status:schemaOk?"V0064_STRUCTURAL_PASS":"V0064_STRUCTURAL_HOLD",
     logged_table:tableOk,exact_column_types_and_nullability:colsOk,
     required_constraints_validated:constraintOk,retention_identity_and_state_checks:semanticsOk,
     guard_function_behavior_text:functionOk,
     immutable_trigger_enabled:triggerOk,
     active_or_settling_probes:Number(active.active_probes),
     active_runtime_sessions:Number(active.active_sessions),
     unresolved_incidents:Number(active.unresolved_incidents),
     pending_or_verified_intent_rows:Number(active.persisted_source_intents),
     historical_source_references:Number(old.original_refs),
     historical_untombstoned_references:Number(old.retained_refs),
     schema_pass:schemaOk
   };
   await client.query("ROLLBACK");
 }catch{
   error=true;
   if(client)await client.query("ROLLBACK").catch(()=>undefined);
   database={status:"READ_ONLY_DATABASE_QUERY_FAILED"};
 }finally{
   if(client)client.release();
   await pool.end().catch(()=>undefined);
 }
 const report={
   schema:"v39.p25.postpublish-readonly-integrated.v1",
   observed_at_utc:new Date().toISOString(),
   public_receiver:publicResult,
   existing_v0064:database,
   result:publicOk&&database.schema_pass===true&&
     database.active_or_settling_probes===0&&database.active_runtime_sessions===0&&
     database.historical_source_references===30&&
     database.historical_untombstoned_references===30&&
     !error?"PASS_PUBLIC_SOURCE_AND_V0064_STRUCTURE_ONLY":"HOLD_INCOMPLETE",
   incident30_resolved_by_this_check:false,
   provider_inventory_reverified_by_this_check:false,
   scientific_p25_auth_granted_by_this_check:false,
   source_custody_flags_changed_by_this_check:false,
   provider_calls:0,provider_mutations:0,sql_mutations:0,
   object_storage_reads:0,object_storage_mutations:0,paid_alert_credits_spent:0
 };
 console.log(JSON.stringify(report,null,2));
 if(report.result!=="PASS_PUBLIC_SOURCE_AND_V0064_STRUCTURE_ONLY")process.exitCode=2;
}
main().catch(()=>{
 console.error("P25_POSTPUBLISH_AUDIT_UNAVAILABLE_ZERO_MUTATIONS");
 process.exitCode=2;
});
