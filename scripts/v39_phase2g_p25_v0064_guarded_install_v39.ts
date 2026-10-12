/**
 * P25 additive metadata-only V0064 installer. Default = READ-ONLY.
 * This is NOT a paid-launch authorization or approval to republish/enable
 * four source-custody flags. Historical provider originals are untouched.
 *
 * APPLY requires explicit reviewed source SHA and a second operator approval
 * token, with zero active/settling probes and no existing/partial V0064.
 * Review live provider subscription inventory separately before approval.
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {v39Pool as pool} from "../server/lib/disruption/db_v39";

const file="migrations/current/V0064__phase2g_prepaid_source_pending_intent_v39.sql";
const args=process.argv.slice(2);
const apply=args.includes("--apply");
const expectedArg=args.indexOf("--expected-head");
const expected=expectedArg<0?"":args[expectedArg+1]??"";
const approvedFlag=process.env.P25_V0064_METADATA_APPLY_APPROVAL??"";
if(args.some((a,i)=>a!=="--apply"&&a!=="--expected-head"&&i!==expectedArg+1))
  throw Error("P25_V0064_UNSUPPORTED_ARGUMENT");
if(expectedArg>=0&&!/^[a-f0-9]{40}$/.test(expected))
  throw Error("P25_V0064_EXPECTED_HEAD_INVALID");
if(apply&&(!expected||
   approvedFlag!=="I_APPROVE_ONLY_ADDITIVE_V0064_ON_IDLE_PRODUCTION"))
  throw Error("P25_V0064_APPLY_NEEDS_EXPLICIT_HEAD_AND_OPERATOR_APPROVAL");
const sha=(v:Buffer|string)=>createHash("sha256").update(v).digest("hex");

async function main(){
  const head=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
  const fileBytes=readFileSync(file);
  const committed=execFileSync("git",["show",`HEAD:${file}`],{encoding:"buffer"});
  if(!fileBytes.equals(committed))
    throw Error("P25_V0064_SOURCE_DIRTY_OR_UNREVIEWED");
  if(apply&&head!==expected)
    throw Error("P25_V0064_SOURCE_HEAD_CHANGED");
  const sql=fileBytes.toString("utf8");
  if(!sql.startsWith("-- V0064: metadata-only LOGGED original-source PENDING intent")||
     !sql.includes("CREATE TRIGGER trg_p2g_prepaid_source_intent_v39")||
     !sql.includes("P2G source-intent deletion forbidden")||
     /\b(?:DROP|TRUNCATE|ALTER\s+TABLE|DELETE\s+FROM|UPDATE\s+clean\.)\b/i.test(sql))
    throw Error("P25_V0064_UNREVIEWED_MIGRATION_CONTRACT");
  const client=await pool.connect();
  let tx=false;
  try{
    await client.query(apply?"BEGIN":"BEGIN TRANSACTION READ ONLY");
    tx=true;
    await client.query("SET LOCAL lock_timeout='3000ms'");
    await client.query("SET LOCAL statement_timeout='10000ms'");
    const q=await client.query(`
      SELECT current_database() AS database_name,
        to_regclass('clean.adb_anchor_probe') IS NOT NULL AS has_probes,
        to_regclass('clean.provider_content_blob_ref') IS NOT NULL AS has_original_refs,
        to_regclass('clean.prepaid_probe_session_runtime') IS NOT NULL AS has_runtime,
        to_regclass('clean.phase2g_prepaid_source_intent_v39') IS NOT NULL AS has_v0064,
        to_regprocedure('clean.guard_p2g_prepaid_source_intent_v39()') IS NOT NULL AS has_v0064_function
    `);
    const r=q.rows[0];
    if(r?.has_probes!==true||r?.has_original_refs!==true||r?.has_runtime!==true)
      throw Error("P25_V0064_REQUIRED_BASE_SCHEMA_MISSING");
    const active=await client.query(
      "SELECT count(*)::int AS n FROM clean.adb_anchor_probe WHERE status IN ('probing','settling')");
    const runtime=await client.query(
      "SELECT count(*)::int AS n FROM clean.prepaid_probe_session_runtime WHERE state='active'");
    const activeN=Number(active.rows[0]?.n??-1);
    const runtimeN=Number(runtime.rows[0]?.n??-1);
    const idle=activeN===0&&runtimeN===0;
    const absent=r.has_v0064===false&&r.has_v0064_function===false;
    const review={
      schema:"v39.p25.v0064.additive-install.v1",
      status:!absent?"HOLD_EXISTING_OR_PARTIAL_V0064":
        !idle?"HOLD_ACTIVE_PROBE_OR_RUNTIME":
        apply?"PENDING_POST_DDL_VERIFICATION":"REVIEWED_DRY_RUN_ONLY",
      observed_at_utc:new Date().toISOString(),
      production_database_name_redacted:true,
      git_head:head,
      exact_migration_sha256:sha(fileBytes),
      has_v0064:r.has_v0064===true,has_v0064_function:r.has_v0064_function===true,
      probing_or_settling_count:activeN,active_runtime_sessions:runtimeN,
      database_mutations:0,provider_calls:0,paid_alert_credits_spent:0,
      paid_yssy_go_authorized:false,
      independent_provider_zero_billable_verified_by_this_script:false
    };
    if(!apply){
      console.log(JSON.stringify(review,null,2));
      await client.query("ROLLBACK");
      tx=false;
      if(!idle||!absent)process.exitCode=2;
      return;
    }
    if(!idle||!absent)throw Error(review.status);
    const lock=await client.query(
      "SELECT pg_try_advisory_xact_lock(943023,64) AS acquired");
    if(lock.rows[0]?.acquired!==true)
      throw Error("P25_V0064_ANOTHER_MIGRATION_IN_PROGRESS");
    // Recheck after taking the transaction-scoped installer lock.
    const p=await client.query(
      "SELECT to_regclass('clean.phase2g_prepaid_source_intent_v39') IS NOT NULL AS present");
    if(p.rows[0]?.present!==false)
      throw Error("P25_V0064_RACE_EXISTING_SOURCE_TABLE");
    await client.query(sql);
    const post=await client.query(`
      SELECT to_regclass('clean.phase2g_prepaid_source_intent_v39') IS NOT NULL AS table_ok,
        EXISTS(
          SELECT 1 FROM pg_trigger tg
          WHERE tg.tgrelid=to_regclass('clean.phase2g_prepaid_source_intent_v39')
           AND tg.tgname='trg_p2g_prepaid_source_intent_v39'
           AND tg.tgfoid=to_regprocedure('clean.guard_p2g_prepaid_source_intent_v39()')
           AND tg.tgenabled='O'
        ) AS trigger_ok,
        (SELECT count(*)::int FROM clean.phase2g_prepaid_source_intent_v39) AS existing_new_rows
    `);
    if(post.rows[0]?.table_ok!==true||
       post.rows[0]?.trigger_ok!==true||
       Number(post.rows[0]?.existing_new_rows)!==0)
      throw Error("P25_V0064_POST_DDL_PROOF_FAILED_ROLLBACK");
    await client.query("COMMIT");
    tx=false;
    console.log(JSON.stringify({
      ...review,status:"PASS_V0064_ADDITIVE_SCHEMA_ONLY_NOT_PAID_GO",
      has_v0064:true,trigger_enabled:true,new_intent_rows:0,
      database_mutations:1,paid_yssy_go_authorized:false
    },null,2));
  }catch(e){
    if(tx)await client.query("ROLLBACK").catch(()=>undefined);
    throw e;
  }finally{
    client.release();await pool.end().catch(()=>undefined);
  }
}
main().catch(e=>{
  console.error("P25_V0064_INSTALL_BLOCKED_NO_PAID_ACTION",
    String(e instanceof Error?e.message:e).slice(0,200));
  process.exitCode=2;
});
