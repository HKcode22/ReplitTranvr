/** V3.9 Gate-2 Stage-2 owner. Requires verified wrapper mediation/AUTH. */
import { spawnSync } from "child_process";
import { pool } from "../server/db";
import { resolveOwnerAuthorization } from "./v39_paid_guard_v39";
import { loadFrozenProbeArtifact, selectStage2Top5, type Stage1ProbeEvidence } from "../server/lib/disruption/anchorPromotion_v39";

async function readStage1Evidence():Promise<Stage1ProbeEvidence[]>{
  const r=await pool.query(`SELECT icao,status,rows_per_hour,unique_flights_per_credit,tail_chain_links_per_credit,stability,
    confirmed_unique_lower,confirmed_plus_ambiguous_upper
    FROM clean.adb_anchor_probe WHERE stage=1 ORDER BY recorded_at ASC`);
  return r.rows.map((x:any)=>({icao:String(x.icao).toUpperCase(),status:String(x.status),rowsPerHour:x.rows_per_hour==null?null:Number(x.rows_per_hour),uniqueFlightsPerCredit:x.unique_flights_per_credit==null?null:Number(x.unique_flights_per_credit),tailChainLinksPerCredit:x.tail_chain_links_per_credit==null?null:Number(x.tail_chain_links_per_credit),stability:x.stability==null?null:Number(x.stability),confirmedUniqueLower:x.confirmed_unique_lower==null?null:Number(x.confirmed_unique_lower),confirmedPlusAmbiguousUpper:x.confirmed_plus_ambiguous_upper==null?null:Number(x.confirmed_plus_ambiguous_upper)}));
}
async function completedStage2(icao:string):Promise<boolean>{const r=await pool.query("SELECT 1 FROM clean.adb_anchor_probe WHERE stage=2 AND icao=$1 AND status='completed' LIMIT 1",[icao]);return (r.rowCount??0)>0;}

async function main(){
  const auth=resolveOwnerAuthorization("Phase 2 / Gate 2 Stage 2");
  const path=process.env.ADB_PREPROBE_ARTIFACT_PATH,hash=process.env.ADB_PREPROBE_ARTIFACT_SHA256;
  if(!path||!hash)throw new Error("REFUSED: Stage 2 requires ADB_PREPROBE_ARTIFACT_PATH + ADB_PREPROBE_ARTIFACT_SHA256");
  const frozen=loadFrozenProbeArtifact(path,hash),evidence=await readStage1Evidence(),promotion=selectStage2Top5(frozen.artifact,evidence);
  if(promotion.replacementsNeeded>0){
    throw new Error(`REFUSED: fewer than five Stage-1-valid candidates; next frozen replacement=${promotion.nextReplacement??"NONE"}. Complete required Stage 1 replacement before Stage 2.`);
  }
  let confirmed=0;
  // Ranked pool may contain more than five; if a selected Stage-2 confirmation
  // fails, only the next ranked Stage-1-valid candidate may replace it and must
  // itself complete Stage 2.
  for(const row of promotion.ranked){
    if(confirmed>=5)break;
    if(await completedStage2(row.icao)){confirmed++;continue;}
    const child=spawnSync(process.execPath,["--import","tsx","scripts/anchor_probe.ts","--stage","2","--icao",row.icao],{
      stdio:"inherit",env:{...process.env,V39_VERIFIED_AUTH:auth.authId,ADB_PREPROBE_ARTIFACT_PATH:path,ADB_PREPROBE_ARTIFACT_SHA256:hash},
    });
    if(child.status===0&&await completedStage2(row.icao))confirmed++;
  }
  if(confirmed!==5)throw new Error(`REFUSED: Stage-2 final pool has ${confirmed}/5 confirmed candidates; frozen ranked replacements exhausted/not confirmed`);
  console.log(JSON.stringify({schema:"v39.anchor-stage2-evidence.v1",status:"PASS",artifactSha256:frozen.artifactHash,confirmedFinalFive:5}));
}
main().catch((e:any)=>{console.error(JSON.stringify({schema:"v39.anchor-stage2-evidence.v1",status:"FAIL",error:e?.message??String(e)}));process.exitCode=1;});
