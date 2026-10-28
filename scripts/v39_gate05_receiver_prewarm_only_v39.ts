/**
 * GitHub-clock prewarm of the immutable published Gate05 callback receiver.
 * Exactly one FREE read-only health check using source-locked proof; no
 * provider API calls, DB connections, subscription CREATE or timer on Replit.
 * A brief transport outage here is recorded but does NOT invalidate the
 * T-10 exact independent STOP, which retries its own strict prearm check.
 * A *successful wrong-source response* always aborts this trial admission.
 */
import {readGate05PublishedReceiverHealthV39} from
  "../server/lib/disruption/gate05PublishedReceiverHealth_v39";
const sleep=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
const hold=(v:string):never=>{throw Error("GATE05_PREWARM_"+v);};
export async function prewarmGate05ReceiverV39(options:{
  startUtc:string;receiver:string;now?:()=>number;
  readImpl?:typeof readGate05PublishedReceiverHealthV39;
  sleepImpl?:(ms:number)=>Promise<void>;
}):Promise<"PASS"|"DEGRADED"|"SKIPPED">{
 const start=Date.parse(options.startUtc);
 const now=options.now??Date.now;
 const wait=options.sleepImpl??sleep;
 if(!Number.isFinite(start)||new Date(start).toISOString()!==options.startUtc||
    !/^[a-f0-9]{40}$/.test(options.receiver))
   hold("INPUT");
 if(now()>start+60000)hold("ALREADY_EXPIRED");
 const target=start-15*60000;
 while(now()<target)await wait(Math.min(3000,target-now()));
 // Do not let the optional prewarm intrude on the mandatory T-10 ARM.
 if(now()>=start-10*60000){
   console.log("GATE05_PREWARM_SKIPPED_SAFE_MANDATORY_ARM_NEXT");
   return "SKIPPED";
 }
 try{
   await (options.readImpl??readGate05PublishedReceiverHealthV39)({
      url:"https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime",
      expectedReceiver:options.receiver,
      maxAttempts:2,timeoutMs:20000
   });
   console.log("GATE05_PREWARM_READONLY_EXACT_RECEIVER_PASS");
   return "PASS";
 }catch(e){
   const message=e instanceof Error?e.message:"UNKNOWN";
   // Wrong source / invalid route / malformed proof cannot be considered
   // a transient cold-start. A source mismatch still blocks the trial.
   if(message.includes("SOURCE_OR_ADMISSION_UNVERIFIED")||
      message.includes("INVALID_JSON")||
      message.includes("HTTP_NONRETRYABLE")||
      message.includes("URL_INVALID"))throw e;
   console.warn("GATE05_PREWARM_TRANSIENT_DEGRADED_T10_STRICT_ARM_STILL_REQUIRED");
   return "DEGRADED";
 }
}
if(process.argv[1]?.endsWith("v39_gate05_receiver_prewarm_only_v39.ts")){
 const [startUtc,receiver]=process.argv.slice(2);
 if(!startUtc||!receiver||process.argv.length!==4)
   hold("CLI");
 else void prewarmGate05ReceiverV39({startUtc,receiver}).catch(e=>{
   console.error(e instanceof Error?e.message:"GATE05_PREWARM_UNKNOWN");
   process.exitCode=2;
 });
}
