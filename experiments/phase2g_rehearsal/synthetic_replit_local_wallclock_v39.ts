/**
 * P20 zero-provider LOCALHOST runtime rehearsal.
 * A real 120-minute elapsed-time test of the existing fsynced local original
 * wire spool, sender-side 10s deadline, and a receiver with two outages.
 * THIS IS NOT PUBLIC REPLIT INGRESS, REAL AERODATABOX, POSTGRES OR SCIENCE PASS.
 *
 * Execution uses only 127.0.0.1, a new /tmp spool, synthetic headers and
 * an isolated in-memory receiver. No paid account, DB, production callbacks,
 * or deployment. Must NEVER classify a local 120m pass as paid YSSY ready.
 */
import {createHash,randomBytes} from "node:crypto";
import {createServer,type Server} from "node:http";
import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {performance} from "node:perf_hooks";
import {
  SyntheticFixedFrontdoorSpoolV39,
  createSyntheticFixedFrontdoorHttpV39
} from "./synthetic_fixed_frontdoor_spool_v39";

const hash=(v:Uint8Array|string)=>createHash("sha256").update(v).digest("hex");
const sleep=(ms:number)=>new Promise<void>(r=>setTimeout(r,Math.max(0,ms)));
const isSha=(s:string)=>/^[0-9a-f]{64}$/.test(s);
export const P20_SYNTHETIC_WALLCLOCK_SECONDS_V39=7200 as const;
export type P20LocalWallclockResultV39=Readonly<{
  schema:"v39.p20-local-wallclock-synthetic.v1";
  mode:"SHORT_LOCAL_SMOKE"|"ACTUAL_LOCAL_120M";
  elapsedSeconds:number;
  plannedSeconds:number;
  syntheticSenderAttempts:number;
  syntheticSenderTimely202:number;
  syntheticSenderFailedOrLate:number;
  receiverUniqueOriginals:number;
  receiverRejectedDuringOutage:number;
  sourceReceiptsVerified:number;
  eightOriginalUtcBins:readonly number[];
  originalSpoolAuditPassed:boolean;
  allLocallySentSourcesReplayedExactly:boolean;
  localRuntimeResult:"PASS_LOCAL_ONLY"|"FAIL_OR_CENSORED";
  evidenceDirectory:string|null;
  publishedHttpsIngressProven:false;
  providerSourceIdentityAuthenticated:false;
  scientificFlightPhysicalV2Proven:false;
  originalProviderCreditsUsed:0;
  productionDatabaseReadOrWrite:false;
  liveSixPlusSixEnabled:false;
  paidYssyGoAuthorized:false;
}>;
function guard(){
  if(process.env.P2G_LOCAL_SYNTHETIC_ONLY!=="YES")
    throw Error("P20_EXPLICIT_LOCAL_SYNTHETIC_ONLY_REQUIRED");
  if(Object.keys(process.env).some(k=>/^AERODATABOX_/i.test(k)&&
      !!process.env[k])||
     ["V39_DATABASE_RUNTIME_URL","DATABASE_URL","PGPASSWORD",
      "V39_PROVIDER_BLOB_BUCKET_ID","V39_PROVIDER_BLOB_MODE"].some(k=>!!process.env[k]))
    throw Error("P20_PAID_OR_LIVE_DATABASE_OR_BLOB_ENVIRONMENT_FORBIDDEN");
}
async function close(s:Server|undefined){
  if(s?.listening)
    await new Promise<void>((resolve,reject)=>s.close(e=>e?reject(e):resolve()));
}
export async function runP20SyntheticLocalWallclockV39(args:Readonly<{
  durationMs:number;
  sourceCount:number;
  keepEvidence?:boolean;
}>):Promise<P20LocalWallclockResultV39>{
  guard();
  const isFull=args.durationMs===P20_SYNTHETIC_WALLCLOCK_SECONDS_V39*1000&&
    args.sourceCount===120;
  const isSmoke=args.durationMs>=750&&args.durationMs<=3000&&args.sourceCount===8;
  if(!isFull&&!isSmoke)
    throw Error("P20_ONLY_120M_OR_SHORT_SMOKE_MODES_ALLOWED");
  const previousGuard=process.env.P2G_SYNTHETIC_FRONTDOOR_ONLY;
  process.env.P2G_SYNTHETIC_FRONTDOOR_ONLY="YES";
  let root:string|undefined,edgeServer:Server|undefined,receiverServer:Server|undefined;
  let senderGood=0,senderBad=0,backendRejected=0;
  const seen=new Map<string,{sha:string;bytes:Buffer}>();
  const sourceManifest=new Map<string,{sha:string;bin:number}>();
  const binCounts=Array(8).fill(0) as number[];
  let unavailable=false;
  const started=performance.now();
  try{
    root=await mkdtemp(join(tmpdir(),"p2g-wallclock-synthetic-"));
    const spool=await SyntheticFixedFrontdoorSpoolV39.open(root);
    const token=randomBytes(48).toString("hex");
    const edge=await createSyntheticFixedFrontdoorHttpV39({spool,token});
    edgeServer=edge.server;
    receiverServer=createServer((req,res)=>{
      void(async()=>{
        if(req.method!=="POST"||req.url!=="/__synthetic__/receive"){
          res.writeHead(404);res.end();return;
        }
        if(unavailable){
          backendRejected++;res.writeHead(503);res.end();return;
        }
        const attempt=String(req.headers["x-synthetic-attempt-hash"]??"");
        const claimed=String(req.headers["x-synthetic-source-sha256"]??"");
        const chunks:Buffer[]=[];
        for await(const chunk of req)chunks.push(Buffer.from(chunk));
        const bytes=Buffer.concat(chunks);
        if(bytes.length===0||bytes.length>65536||!isSha(attempt)||
           !isSha(claimed)||hash(bytes)!==claimed){
          res.writeHead(409);res.end();return;
        }
        const old=seen.get(attempt);
        if(old&&(old.sha!==claimed||!old.bytes.equals(bytes))){
          res.writeHead(409);res.end();return;
        }
        if(!old)seen.set(attempt,{sha:claimed,bytes});
        res.writeHead(200,{"content-type":"application/json"});
        res.end(JSON.stringify({accepted:true,attemptHash:attempt,rawSha256:claimed}));
      })().catch(()=>{if(!res.headersSent){res.writeHead(503);res.end();}});
    });
    await new Promise<void>(ok=>receiverServer!.listen(0,"127.0.0.1",ok));
    const a=receiverServer.address();
    if(!a||typeof a==="string")throw Error("P20_RECEIVER_LOCAL_BIND_FAILED");
    const receiverUrl="http://127.0.0.1:"+a.port+"/__synthetic__/receive";
    const interval=args.durationMs/args.sourceCount;
    // Every sample is scheduled with a monotonic clock, not accelerated
    // event timestamps. Full mode is exactly one source send per minute.
    for(let i=0;i<args.sourceCount;i++){
      await sleep(started+i*interval-performance.now());
      const fraction=i/args.sourceCount;
      // Exactly two real 3m backend outages in full 120m mode.
      // Short smoke compresses faults only; never call it a two-hour test.
      unavailable=(fraction>=.25&&fraction<.275)||
        (fraction>=.75&&fraction<.775);
      const bin=Math.floor(i*8/args.sourceCount);
      const id="p20-no-provider-"+String(i).padStart(4,"0");
      const payload=Buffer.from(JSON.stringify({
        schema:"SYNTHETIC-ONLY-NOT-AERODATABOX",
        attemptId:id,originalSourceUtc:new Date().toISOString(),
        syntheticPhysicalFlight:"SYNTHETIC-LEG-"+String(i).padStart(4,"0"),
        originallyScheduledBin:bin
      }));
      sourceManifest.set(hash(id),{sha:hash(payload),bin});
      binCounts[bin]++;
      try{
        const response=await fetch(edge.url,{
          method:"POST",headers:{
            "content-type":"application/json",
            "x-synthetic-token":token,
            "x-synthetic-attempt-id":id
          },body:payload,signal:AbortSignal.timeout(10000)
        });
        const body=await response.json() as any;
        if(response.status===202&&body?.durable===true&&
           body?.rawSha256===hash(payload))senderGood++;
        else senderBad++;
      }catch{senderBad++;}
      // Every source is first stored by the fixed ingress; the backend may
      // be down while the sender sees 202. No direct sender->backend retry.
      await spool.replayToLocalReceivers([receiverUrl]);
    }
    await sleep(started+args.durationMs-performance.now());
    unavailable=false;
    await spool.replayToLocalReceivers([receiverUrl]);
    const originals=await spool.readAll();
    const audit=await spool.auditCrashRecoveryReadOnly();
    const matched=originals.every(({receipt,original})=>{
      const expected=sourceManifest.get(receipt.attemptHash);
      const receiver=seen.get(receipt.attemptHash);
      return expected?.sha===receipt.rawSha256&&
        expected?.bin>=0&&
        receiver?.sha===receipt.rawSha256&&
        receiver.bytes.equals(Buffer.from(original));
    });
    const ok=senderGood===args.sourceCount&&senderBad===0&&
      originals.length===args.sourceCount&&
      seen.size===args.sourceCount&&matched&&
      audit.allOriginalReceiptsVerified&&
      binCounts.length===8&&binCounts.every(n=>n>0)&&
      performance.now()-started>=args.durationMs;
    const result:P20LocalWallclockResultV39={
      schema:"v39.p20-local-wallclock-synthetic.v1",
      mode:isFull?"ACTUAL_LOCAL_120M":"SHORT_LOCAL_SMOKE",
      elapsedSeconds:+((performance.now()-started)/1000).toFixed(3),
      plannedSeconds:args.durationMs/1000,
      syntheticSenderAttempts:args.sourceCount,
      syntheticSenderTimely202:senderGood,
      syntheticSenderFailedOrLate:senderBad,
      receiverUniqueOriginals:seen.size,
      receiverRejectedDuringOutage:backendRejected,
      sourceReceiptsVerified:audit.verifiedOriginalReceiptCount,
      eightOriginalUtcBins:binCounts,
      originalSpoolAuditPassed:audit.allOriginalReceiptsVerified,
      allLocallySentSourcesReplayedExactly:matched&&seen.size===args.sourceCount,
      localRuntimeResult:ok?"PASS_LOCAL_ONLY":"FAIL_OR_CENSORED",
      evidenceDirectory:args.keepEvidence?root:null,
      publishedHttpsIngressProven:false,
      providerSourceIdentityAuthenticated:false,
      scientificFlightPhysicalV2Proven:false,
      originalProviderCreditsUsed:0,
      productionDatabaseReadOrWrite:false,
      liveSixPlusSixEnabled:false,
      paidYssyGoAuthorized:false
    };
    if(args.keepEvidence)
      await writeFile(join(root,"P20_LOCAL_ONLY_RESULT.json"),
        JSON.stringify(result,null,2),"utf8");
    return result;
  }finally{
    unavailable=true;
    await Promise.all([close(edgeServer),close(receiverServer)]);
    if(root&&!args.keepEvidence)await rm(root,{recursive:true,force:true});
    if(previousGuard===undefined)delete process.env.P2G_SYNTHETIC_FRONTDOOR_ONLY;
    else process.env.P2G_SYNTHETIC_FRONTDOOR_ONLY=previousGuard;
  }
}
if(process.argv[1]?.endsWith("synthetic_replit_local_wallclock_v39.ts")){
  const args=process.argv.slice(2);
  if(args.length!==1||!["--smoke","--full-120m"].includes(args[0])){
    process.stderr.write("P20_USAGE: --smoke OR --full-120m (local no provider only)\n");
    process.exitCode=2;
  }else{
    runP20SyntheticLocalWallclockV39({
      durationMs:args[0]==="--smoke"?1200:7_200_000,
      sourceCount:args[0]==="--smoke"?8:120,
      keepEvidence:true
    }).then(result=>{
      process.stdout.write(JSON.stringify(result,null,2)+"\n");
      if(result.localRuntimeResult!=="PASS_LOCAL_ONLY")process.exitCode=1;
    }).catch(()=>{
      process.stderr.write("P20_LOCAL_SYNTHETIC_RUN_REFUSED_OR_FAILED\n");
      process.exitCode=1;
    });
  }
}
