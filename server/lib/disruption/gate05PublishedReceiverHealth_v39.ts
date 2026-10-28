/**
 * Free, read-only published receiver identity check for Gate05 pre-CREATE.
 * Not a callback or provider POST. A cold/slow Replit publication must not
 * invalidate a prospective one-hour scientific cohort; no source clock,
 * T label, provider credit or sample is modified by retrying this GET.
 *
 * Bounded exposure: max six 20-second physical GET attempts, separated by
 * 1.5/3-second pauses (<=133.5 seconds excluding JS scheduling).
 * On status 200 the response must verify immutable live receiver source.
 * A malformed/incorrect identity NEVER becomes a success and is not retried.
 */
export interface Gate05PublishedReceiverHealthV39 {
  status: "PASS";
  git_head: string;
  published_deployment: true;
  prepaid_route_registered: true;
  provider_mutation: false;
}
const HEX40=/^[0-9a-f]{40}$/;
const defaultSleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));

export async function readGate05PublishedReceiverHealthV39(options:{
  url:string;
  expectedReceiver:string;
  maxAttempts?:number;
  timeoutMs?:number;
  fetchImpl?:typeof fetch;
  sleepImpl?:(ms:number)=>Promise<void>;
}):Promise<Gate05PublishedReceiverHealthV39>{
  const attempts=options.maxAttempts??3;
  const timeout=options.timeoutMs??20000;
  if(!HEX40.test(options.expectedReceiver)||
     !Number.isSafeInteger(attempts)||attempts<1||attempts>6||
     !Number.isSafeInteger(timeout)||timeout<1000||timeout>20000)
    throw Error("GATE05_PUBLISHED_RECEIVER_RETRY_CONFIGURATION_INVALID");
  const endpoint=new URL(options.url);
  if(endpoint.protocol!=="https:"||
     endpoint.hostname!=="replit-tranvr--hk84164.replit.app"||
     endpoint.pathname!=="/__v39/workspace-runtime"||
     endpoint.search||endpoint.hash||endpoint.port)
    throw Error("GATE05_PUBLISHED_RECEIVER_URL_INVALID");
  const read=options.fetchImpl??fetch;
  const wait=options.sleepImpl??defaultSleep;
  for(let attempt=1;attempt<=attempts;attempt++){
    let response:Response;
    try{
      response=await read(endpoint.toString(),{
        method:"GET",redirect:"error",cache:"no-store",
        signal:AbortSignal.timeout(timeout)
      });
    }catch{
      if(attempt===attempts)
        throw Error("GATE05_PUBLISHED_RECEIVER_TRANSPORT_RETRIES_EXHAUSTED");
      console.warn("[gate05] published receiver free health GET transport retry "+attempt+"/"+(attempts-1));
      await wait(attempt===1?1500:3000);
      continue;
    }
    if(response.status===502||response.status===503||response.status===504||
       response.status===500){
      if(attempt===attempts)
        throw Error("GATE05_PUBLISHED_RECEIVER_HTTP_TRANSIENT_RETRIES_EXHAUSTED");
      console.warn("[gate05] published receiver free health GET 5xx retry "+attempt+"/"+(attempts-1));
      await wait(attempt===1?1500:3000);
      continue;
    }
    if(response.status!==200)
      throw Error("GATE05_PUBLISHED_RECEIVER_HTTP_NONRETRYABLE_"+response.status);
    let body:unknown;
    try{body=await response.json();}
    catch{throw Error("GATE05_PUBLISHED_RECEIVER_INVALID_JSON");}
    const x=body as Partial<Gate05PublishedReceiverHealthV39>|null;
    if(x?.status!=="PASS"||x.git_head!==options.expectedReceiver||
       x.published_deployment!==true||
       x.prepaid_route_registered!==true||
       x.provider_mutation!==false)
      throw Error("GATE05_PUBLISHED_RECEIVER_SOURCE_OR_ADMISSION_UNVERIFIED");
    return x as Gate05PublishedReceiverHealthV39;
  }
  throw Error("GATE05_PUBLISHED_RECEIVER_UNREACHABLE");
}
