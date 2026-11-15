/** Metadata-only prospective randomization. Distinct random seeds generated
 * on a GitHub runner, commitment witnessed in workflow log BEFORE reveal.
 * No claim of independent human review, no reroll authorization, no flight
 * data, SQL, provider credentials or release. A first successful run must be
 * preserved even if the assignment is inconvenient.
 */
import {createHash,randomBytes} from "node:crypto";
import {readFileSync,writeFileSync,existsSync} from "node:fs";
import {pathToFileURL} from "node:url";
const SHA=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
const H=x=>createHash("sha256").update(x).digest("hex");
const fail=x=>{throw Error("HOLD_P5_PROSPECTIVE_SEED_"+x);};
const expectedPair="f5112a9ca432d9d3fede96a9805030d68e05ced5a19d029aa896805746c21592";
const old=new Set(["71c2e5b845c8fce696c5371e05c3b5f06a43e2378a4a308867eb9a0a5f4be1e0",
 "0490ed38116b3951b2cb5be213e3266938bcb5dbf18979b5aca4cf9d29b45a0d",
 "20a8aa4420d301673e7ff2fe472387578cf943772b5ada9e5208facd8984e182"]);
const utc=x=>typeof x==="string"&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
function checkIdentity(x){
 if(!x||x.schema!=="v39.phase5.prospective-study-seed-bundle.v1"||
    x.correctedPairSelectionSha256!==expectedPair||!CODE.test(x.reviewedCodeSha??"")||
    !SHA.test(x.dateCandidateBytesSha256??"")||!/^\d{5,25}$/.test(x.workflowRunId??"")||
    !/^\d{4}-\d\d-\d\d$/.test(x.firstRunDateUtc??"")||!utc(x.claimedCommitmentObservedAtUtc)||
    !Number.isFinite(Date.parse(x.firstRunDateUtc+"T00:00:00.000Z"))||
    new Date(x.firstRunDateUtc+"T00:00:00.000Z").toISOString().slice(0,10)!==x.firstRunDateUtc||
    Date.parse(x.claimedCommitmentObservedAtUtc)>=Date.parse(x.firstRunDateUtc+"T00:00:00.000Z")-48*3600000)
  fail("NOT_PROSPECTIVE_EXACT_STUDY_METADATA");
}
export function verifyP5ProspectiveStudySeedBundle(x,expected){
 checkIdentity(x);
 if(!expected||!SHA.test(expected.bundleCommitmentSha256??"")||
    x.reviewedCodeSha!==expected.reviewedCodeSha||x.workflowRunId!==expected.workflowRunId||
    x.dateCandidateBytesSha256!==expected.dateCandidateBytesSha256||x.firstRunDateUtc!==expected.firstRunDateUtc||
    !x.claimedRotationSeeds||Object.keys(x.claimedRotationSeeds).sort().join("|")!=="HUB|MID_A|MID_B|REGIONAL"||
    !Array.isArray(x.predeclaredDailyDrawSeeds)||x.predeclaredDailyDrawSeeds.length!==31||
    x.predeclaredDailyDrawSeeds.some((d,i)=>d.runDayIndex!==i+1))
  fail("BUNDLE_BINDING_OR_DAILY_SEEDS");
 const seeds=[x.treatmentSeedHex,...Object.values(x.claimedRotationSeeds),...x.predeclaredDailyDrawSeeds.map(d=>d.frozenDrawSeed)];
 if(seeds.length!==36||new Set(seeds).size!==36||seeds.some(s=>!SHA.test(s??"")||old.has(s))||
    x.announcedCommitmentSha256!==H("V39_P5_INDEPENDENT_CROSSOVER_ORDER_V1|"+x.treatmentSeedHex)||
    H("V39_P5_PROSPECTIVE_STUDY_BUNDLE_V1|"+JSON.stringify(x))!==expected.bundleCommitmentSha256||
    x.independentSeedWitnessVerified!==false||x.phase6PaidGo!==false)
  fail("COMMITMENT_MISMATCH_DUPLICATE_OR_REUSED_SEED");
 return {status:"PROSPECTIVE_SEED_COMMIT_REVEAL_BYTES_MATCH_NO_GO",
  bundleCommitmentSha256:expected.bundleCommitmentSha256,distinctSeeds:36,
  independentSeedWitnessVerified:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
}
export function generateP5ProspectiveStudySeedBundle(identity){
 // No alternate seed source, CLI seed override, retry-until-preferred-treatment,
 // or selector that sees any assignment. No treatment compiler is imported.
 const seed=()=>randomBytes(32).toString("hex");
 const treatmentSeedHex=seed();
 const bundle={schema:"v39.phase5.prospective-study-seed-bundle.v1",
  correctedPairSelectionSha256:expectedPair,
  reviewedCodeSha:identity.reviewedCodeSha,dateCandidateBytesSha256:identity.dateCandidateBytesSha256,
  workflowRunId:identity.workflowRunId,firstRunDateUtc:identity.firstRunDateUtc,
  claimedCommitmentObservedAtUtc:identity.claimedCommitmentObservedAtUtc,
  treatmentSeedHex,announcedCommitmentSha256:H("V39_P5_INDEPENDENT_CROSSOVER_ORDER_V1|"+treatmentSeedHex),
  claimedRotationSeeds:Object.fromEntries(["HUB","MID_A","MID_B","REGIONAL"].map(k=>[k,seed()])),
  predeclaredDailyDrawSeeds:Array.from({length:31},(_,i)=>({runDayIndex:i+1,frozenDrawSeed:seed()})),
  independentSeedWitnessVerified:false,phase6PaidGo:false};
 const bundleCommitmentSha256=H("V39_P5_PROSPECTIVE_STUDY_BUNDLE_V1|"+JSON.stringify(bundle));
 verifyP5ProspectiveStudySeedBundle(bundle,{...identity,bundleCommitmentSha256});
 return {bundle,bundleCommitmentSha256};
}
function run(){
 const e=process.env,mode=process.argv[2],file=process.argv[3];
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    e.GITHUB_REF!=="refs/heads/main"||e.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    e.GITHUB_RUN_ATTEMPT!=="1"||e.P5_SEED_CONFIRM!=="ONE_PROSPECTIVE_METADATA_SEED_COMMIT_REVEAL_NO_PROVIDER"||
    e.P5_SEED_APPROVED_MAIN!==e.GITHUB_SHA||e.ADB_AUTO_COLLECT!=="0"||
    e.V39_PHASE6_PROCESS_ARMED!=="0"||e.V39_PHASE6_OWNER_APPROVED!=="0"||
    [e.DATABASE_URL,e.V39_DATABASE_RUNTIME_URL,e.AERODATABOX_API_KEY,e.RAPIDAPI_KEY,e.AERODATABOX_WEBHOOK_SECRET].some(Boolean)||
    !file||!["generate","reveal"].includes(mode))
  fail("EXPLICIT_MAIN_ONLY_NONPAID_SCOPE");
 const raw=readFileSync("data-collection/phase5/planning/2026-11-15_nov22_service_start_date_only_candidate.json");
 const date=JSON.parse(raw.toString("utf8"));
 if(date.status!=="PROPOSED_NOT_SIGNED_NOT_APPROVED_NO_GO"||date.days?.length!==31||
    date.firstRunDateUtc!=="2026-11-22"||date.basisOwnerPairBlobSha!=="12ce1415a268660aa1b65d82807230e171ad8741")
  fail("EXACT_NOV22_DATE_CANDIDATE_REQUIRED");
 const identity={reviewedCodeSha:e.GITHUB_SHA,dateCandidateBytesSha256:H(raw),
  workflowRunId:e.GITHUB_RUN_ID,firstRunDateUtc:date.firstRunDateUtc};
 if(mode==="generate"){
  if(existsSync(file))fail("NO_OVERWRITE_OR_REROLL");
  const {bundle,bundleCommitmentSha256}=generateP5ProspectiveStudySeedBundle({...identity,claimedCommitmentObservedAtUtc:new Date().toISOString()});
  writeFileSync(file,JSON.stringify(bundle),{flag:"wx",mode:0o600});
  // Log ONLY commitment before the reveal workflow job, not seed hex.
  console.log(JSON.stringify({status:"P5_PROSPECTIVE_SEED_COMMITMENT",...identity,
   treatmentCommitmentSha256:bundle.announcedCommitmentSha256,bundleCommitmentSha256,
   claimedCommitmentObservedAtUtc:bundle.claimedCommitmentObservedAtUtc,providerCalls:0,phase6PaidGo:false}));
  if(!e.GITHUB_OUTPUT)fail("GITHUB_OUTPUT_REQUIRED");
  writeFileSync(e.GITHUB_OUTPUT,"commitment="+bundleCommitmentSha256+"\n",{flag:"a"});
 }else{
  const bytes=readFileSync(file);
  if(bytes.length>12000)fail("OVERSIZE_SEED_BUNDLE");
  const bundle=JSON.parse(bytes.toString("utf8"));
  if(JSON.stringify(bundle)!==bytes.toString("utf8"))fail("NONCANONICAL_REVEAL");
  const report=verifyP5ProspectiveStudySeedBundle(bundle,{...identity,bundleCommitmentSha256:e.P5_SEED_EXPECTED_COMMITMENT});
  // Metadata seeds are deliberate public prospective study inputs, NOT API
  // tokens, keys, provider contents, private packets or credentials.
  console.log(JSON.stringify({...report,seedBundle:bundle}));
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{run();}catch(e){console.error(/^HOLD_P5_PROSPECTIVE_SEED_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_P5_PROSPECTIVE_SEED_REDACTED");process.exitCode=2;}
}
