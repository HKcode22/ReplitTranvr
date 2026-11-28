/** Run only an existing reviewed consumer, with its original credentials.
 * Derive in memory before the actual worker; do not write policy bytes to disk.
 */
import {spawn} from "node:child_process";
import {deriveP6ConditionalRuntimeEnvironment} from "./v39_phase5b_conditional_policy_derivation_v39.mjs";
const allowed=new Map([["scripts/v39_phase6_nonpaid_source_day_github_runtime_v39.mjs","npx"],["scripts/v39_phase6_private_later_restartable_enrollment_v39.ts","npx"],["scripts/v39_phase6_private_t24_restartable_enrollment_v39.mjs","npx"],["scripts/v39_phase6_private_current_later_pre_schedule_v39.ts","npx"],["scripts/v39_phase5_cd_github_one_queued_t24_witness_v39.ts","npx"],["scripts/v39_phase6_private_current_t24_worker_v39.mjs","npx"],["scripts/v39_phase7_local_pre_evidence_roles_v39.ts","npx"],["scripts/v39_phase6_stored_source_postcommit_native_later_v39.mjs","npx"],["scripts/v39_phase6_stored_source_postcommit_native_audit_v39.mjs","npx"],["scripts/v39_phase6_stored_post_child_dispatcher_v39.mjs","npx"],["scripts/v39_phase6_native_post_producer_v39.mjs","npx"],["scripts/v39_phase6_direct_recovery_tick_v39.mjs","node"],["scripts/v39_phase6_bounded_rolling_session_v39.mjs","node"]]);
const args=process.argv.slice(2),bin=args.shift();
const target=bin==="node"?args[0]:bin==="npx"&&args[0]==="--no-install"&&args[1]==="tsx"?args[2]:null;
try{
 if(!target||allowed.get(target)!==bin)throw Error("HOLD_P6_CONDITIONAL_DERIVATION_EXEC_TARGET");
 const projected=deriveP6ConditionalRuntimeEnvironment(process.env,target);
 // Runner workflow command registers derived secret values for redaction
 // before the existing consumer starts. Never emit values as log text.
 for(const value of projected.maskValues)process.stdout.write("::add-mask::"+value+"\n");
 const child=spawn(bin==="node"?process.execPath:bin,args,{env:projected.env,stdio:"inherit",shell:false});
 const signals=["SIGINT","SIGTERM"];
 const forward=Object.fromEntries(signals.map(s=>[s,()=>child.kill(s)]));
 for(const s of signals)process.on(s,forward[s]);
 child.once("error",()=>{console.error("HOLD_P6_CONDITIONAL_DERIVATION_EXEC_START");process.exitCode=2;});
 child.once("exit",(code,signal)=>{
  for(const s of signals)process.removeListener(s,forward[s]);
  process.exitCode=code??(signal==="SIGINT"?130:143);
 });
}catch(e){
 const m=String(e?.message??"");
 console.error(/^HOLD_P6_CONDITIONAL_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_CONDITIONAL_DERIVATION_EXEC_REDACTED");
 process.exitCode=2;
}
