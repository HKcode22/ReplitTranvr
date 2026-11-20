/** Public-only signed weather snapshot staged once before SOURCE in the
 * existing private runner scratch directory. All three roles verify the
 * same immutable signed bytes independently. No provider payload, flight
 * selector, DB credential or GitHub token is persisted in this file.
 */
import {lstatSync,readFileSync,realpathSync,writeFileSync,unlinkSync} from "node:fs";
import {join} from "node:path";
import {p7LocalPreSocketPaths} from "./phase7LocalPrivatePreHandoff_v39";
import {makeP7PublicWeatherSnapshotPort,type P7PublicNoaaSnapshot} from "./phase7NoaaProductionReviewedSnapshot_v39";
const hold=(s:string):never=>{throw Error("HOLD_P7_LOCAL_PUBLIC_NOAA_"+s)};
const filename="reviewed-public-noaa.json";
const exact=(x:unknown,k:string[])=>!!x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(v=>Object.hasOwn(x,v));
function safeFile(path:string){
 const st=lstatSync(path);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.uid!==process.getuid?.()||(st.mode&0o077)!==0||st.size<100||st.size>10000000||realpathSync(path)!==path)hold("SCRATCH_FILE");
}
export function writeP7LocalPublicNoaaSnapshot(env:NodeJS.ProcessEnv,snapshot:P7PublicNoaaSnapshot|null){
 const local=p7LocalPreSocketPaths(env,true),port=makeP7PublicWeatherSnapshotPort(env,snapshot);
 const file=join(local.dir,filename),bytes=JSON.stringify({schema:"v39.phase7.local-public-noaa-snapshot.v1",githubRunId:local.scope.runId,codeSha:local.scope.codeSha,manifestSha256:local.scope.manifestSha256,rightsSha256:local.scope.rightsSha256,snapshot});
 if(Buffer.byteLength(bytes)>10000000)hold("SCRATCH_BOUND");
 writeFileSync(file,bytes,{flag:"wx",mode:0o600});safeFile(file);
 return {snapshotSha256:port.snapshotSha256,stationCount:port.stationCount};
}
export function openP7LocalPublicNoaaSnapshotPort(env:NodeJS.ProcessEnv){
 const local=p7LocalPreSocketPaths(env,false),path=join(local.dir,filename);safeFile(path);
 const x=JSON.parse(readFileSync(path,"utf8"));
 if(!exact(x,["schema","githubRunId","codeSha","manifestSha256","rightsSha256","snapshot"])||x.schema!=="v39.phase7.local-public-noaa-snapshot.v1"||x.githubRunId!==local.scope.runId||x.codeSha!==local.scope.codeSha||
  x.manifestSha256!==local.scope.manifestSha256||x.rightsSha256!==local.scope.rightsSha256)hold("EXACT_LOCAL_SCOPE");
 return makeP7PublicWeatherSnapshotPort(env,x.snapshot);
}
export function removeP7LocalPublicNoaaSnapshot(dir:string){
 const path=join(dir,filename);
 try{safeFile(path);unlinkSync(path)}catch(err){if((err as NodeJS.ErrnoException).code!=="ENOENT")throw err}
}

/** Optional NOAA acquisition is a recorded release setting, not an extra
 * launch gate. An enabled reader must validate its exact signed snapshot;
 * failures must not be converted to ordinary missing observations. In
 * disabled mode no public archive observation is claimed. The existing
 * evidence producer still rejects any present unverified weather fields. */
export function openP7LocalPublicNoaaSnapshotPortIfEnabled(env:NodeJS.ProcessEnv){
 const mode=env.P6_NOAA_PUBLIC_ARCHIVE_ENABLED??"";
 if(mode==="1")return openP7LocalPublicNoaaSnapshotPort(env);
 if(mode===""||mode==="0")return undefined;
 return hold("INVALID_ARCHIVE_MODE");
}
