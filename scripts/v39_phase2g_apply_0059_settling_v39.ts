import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";

const MIGRATION="migrations/0059_phase2g_settling_state.sql";

function has(name:string):boolean { return process.argv.includes(name); }
function sha256(raw:Buffer|string):string { return createHash("sha256").update(raw).digest("hex"); }

async function state(){
  const r=await pool.query(
    `SELECT
       (SELECT count(*)::int FROM clean.adb_anchor_probe WHERE status IN ('probing','settling')) AS active_or_settling,
       (SELECT count(*)::int FROM clean.adb_incident_stop WHERE resolved=false) AS open_incidents,
       EXISTS (
         SELECT 1 FROM pg_constraint
          WHERE conrelid='clean.adb_anchor_probe'::regclass
            AND conname='adb_anchor_probe_status_check'
            AND pg_get_constraintdef(oid) ILIKE '%settling%'
       ) AS settling_status,
       EXISTS (
         SELECT 1 FROM pg_constraint
          WHERE conrelid='clean.adb_anchor_probe'::regclass
            AND conname='adb_anchor_probe_safe_settling_shape'
       ) AS safe_shape,
       to_regclass('clean.idx_adb_anchor_probe_settling') IS NOT NULL AS settling_index`
  );
  return r.rows[0];
}

async function main():Promise<void>{
  const apply=has("--apply");
  const file=path.resolve(MIGRATION);
  const raw=fs.readFileSync(file);
  const before=await state();
  if(Number(before.active_or_settling)!==0){
    throw new Error(`REFUSED:ACTIVE_OR_SETTLING_PROBES:${before.active_or_settling}`);
  }
  if(Number(before.open_incidents)!==0){
    throw new Error(`REFUSED:OPEN_INCIDENTS:${before.open_incidents}`);
  }

  const base={
    schema:"v39.phase2g-0059-settling-migration.v1",
    mode:apply?"APPLY":"DRY_RUN",
    migration:MIGRATION,
    migration_sha256:sha256(raw),
    provider_call:false,
    provider_mutation:false,
    alert_credits_spent:0,
    before,
  };

  if(!apply){
    console.log(JSON.stringify({
      ...base,
      status:before.settling_status&&before.safe_shape&&before.settling_index
        ?"PASS_ALREADY_APPLIED"
        :"READY_FOR_APPLY",
    },null,2));
    return;
  }

  if(before.settling_status&&before.safe_shape&&before.settling_index){
    console.log(JSON.stringify({...base,status:"PASS_ALREADY_APPLIED",after:before},null,2));
    return;
  }

  await pool.query(raw.toString("utf8"));
  const after=await state();
  if(
    after.settling_status!==true||
    after.safe_shape!==true||
    after.settling_index!==true||
    Number(after.active_or_settling)!==0||
    Number(after.open_incidents)!==0
  ){
    throw new Error(`0059_POSTCHECK_FAILED:${JSON.stringify(after)}`);
  }
  console.log(JSON.stringify({
    ...base,
    status:"PASS_APPLIED_AND_VERIFIED",
    applied_at_utc:new Date().toISOString(),
    after,
  },null,2));
}

main().catch((error)=>{
  console.error(JSON.stringify({
    schema:"v39.phase2g-0059-settling-migration.v1",
    status:"REFUSED_OR_FAILED",
    provider_call:false,
    provider_mutation:false,
    alert_credits_spent:0,
    error:error instanceof Error?error.message:String(error),
  },null,2));
  process.exitCode=1;
}).finally(async()=>{await pool.end().catch(()=>undefined);});
