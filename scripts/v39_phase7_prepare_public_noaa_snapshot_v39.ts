/** No-provider SOURCE-job preparation. Download only a completed, signed,
 * calendar-scoped PUBLIC weather snapshot. No signing key/DB credential,
 * source flight identity or paid provider in this step. A missing snapshot
 * stays missing, and no free weather capture is triggered by SOURCE.
 */
import {execFileSync} from "node:child_process";
import {readP7LocalPreScope} from "../server/lib/disruption/phase7LocalPrivatePreHandoff_v39";
import {readP7ProtectedNoaaPlans} from "../server/lib/disruption/phase7NoaaProductionArchivePlan_v39";
import {openP7NoaaGithubArchiveReader,readP7LatestReviewedPublicNoaaSnapshot} from "../server/lib/disruption/phase7NoaaGithubArchiveReader_v39";
import {writeP7LocalPublicNoaaSnapshot,openP7LocalPublicNoaaSnapshotPort} from "../server/lib/disruption/phase7LocalPublicNoaaSnapshot_v39";
const hold=(s:string):never=>{throw Error("HOLD_P7_PREPARE_PUBLIC_NOAA_"+s)};
async function run(){
 const e=process.env,scope=readP7LocalPreScope(e);
 if(!e.GH_TOKEN||[e.V39_P5_SOURCE_DATABASE_URL,e.P6_PRIVATE_READER_DATABASE_URL,e.P6_PRIVATE_PUBLISHER_DATABASE_URL,e.P5_V39_PRE_DATABASE_URL,e.P6_PRIVATE_LATER_REVIEWER_KEY_BASE64,e.P6_PRIVATE_DAY_REVIEWER_KEY_BASE64].some(Boolean)||
  Object.entries(e).some(([k,v])=>k.startsWith("P6_PHASE7_")&&/PRIVATE_KEY|DATABASE_URL/.test(k)&&v))hold("NO_SIGNER_OR_DATABASE");
 if(execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8",timeout:5000,stdio:["ignore","pipe","ignore"]}).trim()!==scope.codeSha)hold("CHECKOUT");
 const plans=readP7ProtectedNoaaPlans(e),reader=openP7NoaaGithubArchiveReader(e.GH_TOKEN!);
 const result=await readP7LatestReviewedPublicNoaaSnapshot({env:e,clockUtc:new Date().toISOString(),plans,reader});
 const written=writeP7LocalPublicNoaaSnapshot(e,result.snapshot);
 const actual=openP7LocalPublicNoaaSnapshotPort(e);
 if(actual.snapshotSha256!==written.snapshotSha256||actual.stationCount!==written.stationCount||actual.snapshotSha256!==result.snapshotSha256)hold("LOCAL_READBACK");
 console.log(JSON.stringify({status:result.status,publicStationCount:result.stationCount,publicReceiptCount:result.receiptCount,snapshotSha256:result.snapshotSha256,providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
}
run().catch(err=>{const s=String(err?.message??"");console.error(/^HOLD_P7_[A-Z0-9_]+$/.test(s)?s:"HOLD_P7_PREPARE_PUBLIC_NOAA_REDACTED");process.exitCode=2});
