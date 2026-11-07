/**
 * Staged GitHub-only Phase5 early adaptive selection owner.
 *
 * NO scheduled workflow dispatches this yet. When Phase5 is actually frozen,
 * the reviewed GitHub owner may invoke this from an isolated approved job
 * with a restricted PRE-SELECTION-ONLY DB role and exact signed pins.
 *
 * This file never calls AeroDataBox, ADSB.lol or external services. It only
 * atomically commits and verifies the sampling four-slot draw. T-24/T-6/T-90
 * FIDS source/PRE must be separately collected and independently verified.
 */
import { Pool } from "pg";
import {
  commitEarlyPhase5Draw, type EarlyDrawOwnerPins,
} from "../server/lib/disruption/phase5EarlyAdaptiveDrawOwner_v39";

const sha=/^[a-f0-9]{64}$/;
function refuse(): never {
  throw Error("REFUSED_PHASE5_EARLY_DRAW_OWNER_ADMISSION");
}
const env=process.env;
async function main(): Promise<void> {
  // Never run paid-related setup from interactive Replit Shell, PR CI, forks,
  // an arbitrary branch, or without a separate Phase5 freeze record.
  if(env.GITHUB_ACTIONS!=="true" ||
     env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr" ||
     env.GITHUB_REF!=="refs/heads/main" ||
     !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??"") ||
     env.V39_P5_EARLY_DRAW_OWNER_APPROVED!=="1" ||
     env.V39_PHASE5_FREEZE_SIGNED!=="1" ||
     env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1")
    refuse();
  if(process.argv.length!==3 ||
     !/^(?:[1-9]|[12][0-9]|3[01])$/.test(process.argv[2]))
    refuse();
  const keys=[
    env.V39_P5_MANIFEST_SHA256,env.V39_P5_CALENDAR_HASH,
    env.V39_P5_CONFIG_HASH,env.V39_P5_FRAME_HASH,
  ];
  if(!keys.every(x=>typeof x==="string"&&sha.test(x)))refuse();
  const url=env.V39_P5_EARLY_DRAW_DATABASE_URL;
  if(!url)refuse();
  const pins: EarlyDrawOwnerPins={
    runDayIndex:Number(process.argv[2]),
    expectedManifestSha256:keys[0]!,
    expectedCalendarHash:keys[1]!,
    expectedConfigHash:keys[2]!,
    expectedFrameHash:keys[3]!,
    phase5FreezeApproved:true,
    githubOnlyApproved:true,
  };
  const pool=new Pool({
    connectionString:url,
    max:1,connectionTimeoutMillis:10_000,
    application_name:"v39_phase5_early_github_preselector",
  });
  try{
    const r=await commitEarlyPhase5Draw(pool,pins);
    console.log("PHASE5_EARLY_SELECTION "+JSON.stringify({
      ...r,codeSha:env.GITHUB_SHA,
      // Still not an operator-flight provenance or provider rights audit.
      phase6LiveAuthorized:false,
    }));
  }finally{
    await pool.end().catch(()=>{});
  }
}
main().catch(e=>{
  const safe=typeof e?.message==="string"&&
    /^REFUSED_PHASE5_EARLY_DRAW_[A-Z0-9_]+$/.test(e.message)
      ?e.message:"REFUSED_PHASE5_EARLY_DRAW_UNVERIFIED_OR_DB_ERROR";
  console.error(safe);
  process.exitCode=2;
});
