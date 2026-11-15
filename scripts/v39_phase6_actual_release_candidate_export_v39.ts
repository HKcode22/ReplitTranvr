/** Owner-local exact first-seed release candidate exporter.
 * Reuses existing preview and assembly functions. No signing, staging,
 * secret changes, database, network, fresh randomness or approval inference.
 */
import {createHash} from "node:crypto";
import {readFileSync,writeFileSync,mkdirSync,realpathSync} from "node:fs";
import {resolve,dirname,relative,isAbsolute} from "node:path";
import {fileURLToPath} from "node:url";
import {buildP5ProspectiveSeedCalendarPreview} from "./v39_phase5_prospective_seed_to_calendar_preview_v39.mjs";
import {assembleP6ActualFirstSeedReleaseCandidate} from "../server/lib/disruption/phase5ActualNov22BudgetProposal_v39";
const hash=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const H=/^[a-f0-9]{64}$/;
const hold=(s:string):never=>{throw Error("HOLD_P6_ACTUAL_RELEASE_EXPORT_"+s);};
type AssemblyInput=Parameters<typeof assembleP6ActualFirstSeedReleaseCandidate>[0];
export function compileP6ActualCandidateExport(input:{
 externalBytes:Buffer;expectedExternalFileSha256:string;
 timingBytes:Buffer;expectedTimingFileSha256:string;
}){
 const {externalBytes,timingBytes}=input;
 if(!Buffer.isBuffer(externalBytes)||externalBytes.length<100||externalBytes.length>100000||
    !Buffer.isBuffer(timingBytes)||timingBytes.length<100||timingBytes.length>10000||
    !H.test(input.expectedExternalFileSha256)||!H.test(input.expectedTimingFileSha256)||
    hash(externalBytes)!==input.expectedExternalFileSha256||hash(timingBytes)!==input.expectedTimingFileSha256)
  hold("EXACT_REVIEW_INPUT_FILE_BYTES_REQUIRED");
 let external:AssemblyInput["external"],timing:AssemblyInput["timing"];
 try{external=JSON.parse(externalBytes.toString("utf8"));timing=JSON.parse(timingBytes.toString("utf8"));}
 catch{return hold("INVALID_REVIEW_JSON");}
 const seedBytes=readFileSync("data-collection/phase5/planning/2026-11-15_actual_first_seed_43700154416.json");
 if(hash(seedBytes)!=="66e523802a513b9ce57ca1130ad282577ff53fa7522c78364ba5ef72f72f0d93")hold("ORIGINAL_SEED_CHANGED");
 const preview=buildP5ProspectiveSeedCalendarPreview({
  seedBundle:JSON.parse(seedBytes.toString("utf8")),
  expected:{bundleCommitmentSha256:"925b94cbb236d0a981637eeccae985a2924cc3f11afcb47727b3acf93e792bcf",
   reviewedCodeSha:"09b80926caae24ba07a1f8a20c819090d8f2528c",workflowRunId:"43700154416",
   dateCandidateBytesSha256:"9be154ce8ac2d897643558ff0c575a83a33bc8a4f77768d68fdd791a73c12311",firstRunDateUtc:"2026-11-22"},
  ownerEvidenceBytes:readFileSync("data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json"),
  dateCandidateBytes:readFileSync("data-collection/phase5/planning/2026-11-15_nov22_service_start_date_only_candidate.json")});
 if(preview.sha256!=="003885e93f3a3daa1098f648502c5a7dd3beb6e317e906ffe281760aaba763af")hold("ORIGINAL_PREVIEW_CHANGED");
 const assembled=assembleP6ActualFirstSeedReleaseCandidate({draft:preview.result.calendarDraft,envelope:preview.result.shapeEnvelope,
  external,expectedExternalInputSha256:hash(JSON.stringify(external)),timing,expectedTimingJsonSha256:hash(JSON.stringify(timing))});
 const files=assembled.dayPlans.files.map(f=>({path:f.path,sha256:f.sha256,bytes:f.bytes}));
 const stageBytes=JSON.stringify(assembled.unsignedStageInput);
 if(hash(stageBytes)!==assembled.unsignedStageInputSha256||files.length!==31||
    files.some((f,i)=>f.path!=="data-collection/phase5/planning/phase6-source-day-"+String(i+1).padStart(2,"0")+".json"||hash(f.bytes)!==f.sha256))
  hold("EXACT_OUTPUT_PARITY");
 files.push({path:"unsigned-stage-input.json",sha256:hash(stageBytes),bytes:stageBytes});
 const summary={status:"ACTUAL_FIRST_SEED_LOCAL_REVIEW_EXPORT_UNSIGNED_NO_GO",
  originalPreviewSha256:preview.sha256,inputExternalFileSha256:input.expectedExternalFileSha256,inputTimingFileSha256:input.expectedTimingFileSha256,
  unsignedStageInputSha256:assembled.unsignedStageInputSha256,dayPlanSha256s:assembled.dayPlans.dayPlanSha256s,
  sourceQueries:assembled.dayPlans.totalPlannedQueries,totalReservedUnits:assembled.totalReservedUnits,peakDailyUnits:assembled.peakDailyUnits,
  independentReleaseStillRequired:true,providerCalls:0,databaseWrites:0,githubMutations:0,phase6PaidGo:false};
 return {summary,files};
}
export function writeP6ActualCandidateExport(result:ReturnType<typeof compileP6ActualCandidateExport>,destination:string){
 const root=realpathSync(process.cwd()),out=resolve(destination),parent=realpathSync(dirname(out));
 const verifiedOut=resolve(parent,out.slice(dirname(out).length+1));
 const rel=relative(root,verifiedOut);
 if(!rel||(!rel.startsWith(".."+"/")&&rel!==".."&&!isAbsolute(rel)))hold("OUTPUT_MUST_BE_OUTSIDE_REPOSITORY");
 // Atomic admission of a fresh directory; existing exports never overwritten.
 mkdirSync(verifiedOut,{mode:0o700});
 for(const f of result.files){
  if(hash(f.bytes)!==f.sha256||!(/^(?:data-collection\/phase5\/planning\/phase6-source-day-(?:0[1-9]|[12][0-9]|3[01])\.json|unsigned-stage-input\.json)$/.test(f.path)))hold("INVALID_OUTPUT_FILE");
  const path=resolve(verifiedOut,f.path);
  mkdirSync(dirname(path),{recursive:true,mode:0o700});
  writeFileSync(path,f.bytes,{flag:"wx",mode:0o600});
 }
 writeFileSync(resolve(verifiedOut,"review-summary.json"),JSON.stringify(result.summary),{flag:"wx",mode:0o600});
 return result.summary;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.env.GITHUB_ACTIONS==="true"||process.argv.length!==7)hold("OWNER_LOCAL_EXACT_ARGUMENTS");
  const [externalPath,externalSha,timingPath,timingSha,out]=process.argv.slice(2);
  const result=compileP6ActualCandidateExport({externalBytes:readFileSync(externalPath),expectedExternalFileSha256:externalSha,
   timingBytes:readFileSync(timingPath),expectedTimingFileSha256:timingSha});
  console.log(JSON.stringify(writeP6ActualCandidateExport(result,out)));
 }catch(e){const msg=String((e as Error)?.message??"");console.error(/^HOLD_P6_ACTUAL_RELEASE_EXPORT_[A-Z0-9_]+$/.test(msg)?msg:"HOLD_P6_ACTUAL_RELEASE_EXPORT_REDACTED_NO_RELEASE");process.exitCode=2;}
}
