/**
 * Gate05 two-query WSSS source-feasibility operator.
 * DRAFT: never run until separate safety worker is proven live, exact scope
 * ACTIVE under consumed human-approved permit, current provider entitlements
 * and signed pins independently reviewed. Real FIDS GETs are BILLABLE.
 *
 * Only connects as dedicated dispatcher LOGIN, SET ROLE dispatch. Does not
 * issue roles, insert permits, activate, STOP, create Alerts or use admin DB
 * URL. NEVER silently fall back to default fidsRestLedger.
 *
 * Invocation requires exact --confirm OWNER_APPROVED_WSSS12_PAID_GET and
 * privately mounted signed bundle/pins. A command line *confirmation*
 * is not itself independent proof of owner identity or signed authority.
 */
import "dotenv/config";
import pg from "pg";
import {readFileSync,writeFileSync,statSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {
  previewGate05SignedExpiryGuardPlanV39
} from "../server/lib/disruption/gate05SignedExpiryGuardPlan_v39";
import {
  fetchGate05ScopedFidsV39,gate05FidsQueryFingerprintV39
} from "../server/lib/disruption/gate05ScopedFidsOwner_v39";
import {
  getBalanceEvidenceStrict,listSubscriptionsStrict
} from "../server/lib/disruption/aerodataboxLimiter_v3";

const SOURCE=/^[0-9a-f]{40}$/;
const safetyMessage="GATE05_DISPATCH_HOLD";
function refuse(s:string):never {throw Error(safetyMessage+"_"+s);}
export function inspectGate05DispatcherLaunchV39(
 args:{head:string;confirm:string},
 env:Record<string,string|undefined>
){
  if(!args||!SOURCE.test(args.head)||
     args.confirm!=="OWNER_APPROVED_WSSS12_PAID_GET")
    refuse("EXACT_COMMAND");
  const raw=env.GATE05_DISPATCH_DATABASE_URL;
  if(!raw||!env.GATE05_EXPECTED_DB_HOST||
     !env.AERODATABOX_API_KEY)
    refuse("RESTRICTED_SECRETS");
  let url:URL;
  try{url=new URL(raw);}catch{refuse("DATABASE_URL");}
  const login=decodeURIComponent(url.username);
  if(!["postgres:","postgresql:"].includes(url.protocol)||
     !/^gate05_fids_dispatch_login_2026[0-9_]{8,60}[a-f0-9]*$/.test(login)||
     !url.password||url.pathname!=="/neondb"||
     url.searchParams.get("sslmode")!=="verify-full"||
     url.hostname!==env.GATE05_EXPECTED_DB_HOST||
     ["localhost","127.0.0.1"].includes(url.hostname))
    refuse("RESTRICTED_CONNECTION");
  return {head:args.head,login,host:url.hostname,providerKeyPresent:true,
    dedicatedDispatchRequired:true,activationAllowed:false,
    maximumApiUnits:12};
}
function cli(argv:string[]){
  if(argv.length!==10)refuse("CLI");
  const m=new Map<string,string>();
  for(let i=0;i<argv.length;i+=2){
    if(!argv[i].startsWith("--")||!argv[i+1]||m.has(argv[i]))
      refuse("CLI");
    m.set(argv[i],argv[i+1]);
  }
  if([...m.keys()].sort().join("|")!==
     ["--bundle","--pins","--head","--confirm","--output"].sort().join("|"))
    refuse("CLI");
  return {head:m.get("--head")!,confirm:m.get("--confirm")!,
    bundle:m.get("--bundle")!,pins:m.get("--pins")!,
    output:m.get("--output")!};
}
function loadPrivate(path:string):any{
  if(!path.startsWith("/")||path.length>1024)refuse("FILE");
  const st=statSync(path);
  if(!st.isFile()||(st.mode&0o077)!==0||st.size>32768||st.size<2)
    refuse("PRIVATE_FILE_MODE");
  return JSON.parse(readFileSync(path,"utf8"));
}
function extractTime(start:string,end:string,now:number){
  const st=Date.parse(start),en=Date.parse(end);
  if(!Number.isFinite(st)||!Number.isFinite(en)||
     now<st||now>=en-15000||en-st>3600000)
    refuse("WINDOW");
}
export async function runGate05SignedFidsOperatorV39(input:ReturnType<typeof cli>,
 env:NodeJS.ProcessEnv=process.env){
  const selected=inspectGate05DispatcherLaunchV39(input,env);
  const checked=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
  if(checked!==selected.head)refuse("SOURCE_SHA");
  const bundle=loadPrivate(input.bundle);
  const pins=loadPrivate(input.pins);
  const bytes=Buffer.from(bundle.authorizationBytesBase64,"base64");
  const reviewed=previewGate05SignedExpiryGuardPlanV39({
    authorizationBytes:bytes,
    detachedSignatureBase64:bundle.detachedSignatureBase64,
    signerPublicKeySpkiDerBase64:bundle.signerPublicKeySpkiDerBase64,
    independentPins:pins
  });
  const a=JSON.parse(bytes.toString("utf8"));
  if(reviewed.sourceCommit!==checked||a.airportIcao!=="WSSS"||
     a.ianaTimezone!=="Asia/Singapore"||
     a.maxBaseUnits!==4||a.maxRetryUnits!==8||
     a.maxTotalUnits!==12||a.maxAlertCreates!==0)
    refuse("SIGNED_SCOPE");
  const queryBase={icao:"WSSS",fromLocal:a.fromLocal,toLocal:a.toLocal};
  const hashOff=gate05FidsQueryFingerprintV39({...queryBase,withLocation:false});
  const hashOn=gate05FidsQueryFingerprintV39({...queryBase,withLocation:true});
  if(a.noLocationQuerySha256!==hashOff||
     a.locationQuerySha256!==hashOn)refuse("QUERY_BINDING");
  extractTime(a.startsAtUtc,a.expiresAtUtc,Date.now());

  // FREE account GETs. Do not send a billable FIDS GET without fresh quota
  // and zero external subscription conflicts.
  const balance=await getBalanceEvidenceStrict();
  const subs=await listSubscriptionsStrict();
  if(balance.quota.apiUnitsRemaining<12||
     subs.some(s=>s.isActive))
    refuse("PROVIDER_ACCOUNT");
  const client=new pg.Client({
    connectionString:env.GATE05_DISPATCH_DATABASE_URL,
    connectionTimeoutMillis:3000,statement_timeout:4000,
    lock_timeout:1500,query_timeout:6000,
    application_name:"gate05_wsss12_restricted_dispatch"
  });
  let connected=false;
  try{
    await client.connect();connected=true;
    const who=(await client.query(
      "SELECT current_database() AS db,session_user AS login,"+
      "current_user AS role,pg_is_in_recovery() AS replica"
    )).rows[0];
    if(who?.db!=="neondb"||who.login!==selected.login||
       who.role!==selected.login||who.replica!==false)
      refuse("DB_IDENTITY");
    await client.query("SET ROLE gate05_fids_dispatch_v39");
    if((await client.query("SELECT current_user AS r")).rows[0].r!==
       "gate05_fids_dispatch_v39")refuse("ROLE");
    extractTime(a.startsAtUtc,a.expiresAtUtc,Date.now());

    if(!input.output.startsWith("/")||input.output.length>1024||
       !input.output.endsWith(".json"))refuse("OUTPUT_PATH");
    const receipt={
      schema:"v39.gate05.wsss12.feasibility-receipt.v1",
      status:"STARTED_UNSETTLED",
      scopeId:reviewed.scopeId,authorizationSha256:reviewed.reviewedAuthorizationSha256,
      sourceCommit:checked,queryHashes:[hashOff,hashOn],
      startedUtc:new Date().toISOString(),maximumApiUnits:12,
      alertCreates:0,providerGetCountUnconfirmed:true
    };
    // A fresh, operator-selected private filepath must be created BEFORE
    // any reserved attempt, preventing silent replay on rerun.
    writeFileSync(input.output,JSON.stringify(receipt,null,2)+"\n",
      {flag:"wx",mode:0o600});
    const output:any[]=[];
    for(const withLocation of [false,true]){
      extractTime(a.startsAtUtc,a.expiresAtUtc,Date.now());
      const query={...queryBase,withLocation};
      const res=await fetchGate05ScopedFidsV39({
        db:client,query,owner:{
          scopeId:reviewed.scopeId,
          authorizationId:reviewed.authorizationId,
          authorizationSha256:reviewed.reviewedAuthorizationSha256,
          cycleId:a.cycleId,icao:"WSSS",
          querySha256:withLocation?hashOn:hashOff
        }
      });
      // A null API or schema result is UNKNOWN, never zero flights.
      const departures=res===null?null:res.departures.length;
      output.push({withLocation,
        response:"RECEIVED"=== (res===null?"MISSING":"RECEIVED")?"RECEIVED":"MISSING",
        departures,
        departureFieldNames:res===null?[]:[
          ...new Set(res.departures.flatMap((d:unknown)=>
            d!==null&&typeof d==="object"&&!Array.isArray(d)?
              Object.keys(d):[]))
        ].sort().slice(0,80)
      });
    }
    const completed={...receipt,status:"PROVIDER_RESPONSES_RETURNED_ACCOUNTING_UNSETTLED",
      finishedUtc:new Date().toISOString(),
      providerGetCountUnconfirmed:true,queries:output,
      // No raw provider identifiers or payloads are written by this runner.
      departureFlightIdentifiersRetained:0
    };
    writeFileSync(input.output,JSON.stringify(completed,null,2)+"\n",
      {mode:0o600});
    console.log(JSON.stringify({
      status:completed.status,scopeId:reviewed.scopeId,
      output:input.output,counts:output.map(x=>x.departures),
      independentlyReconciled:false,stopConfirmed:false
    }));
  }finally{
    if(connected)await client.end().catch(()=>{});
  }
}
if(import.meta.url===`file://${process.argv[1]}`){
  runGate05SignedFidsOperatorV39(cli(process.argv.slice(2))).catch(e=>{
    const message=e instanceof Error?e.message:"";
    console.error(JSON.stringify({status:"GATE05_PAID_OPERATOR_HOLD",
      reason:message.startsWith(safetyMessage)?message:
        "GATE05_PAID_OPERATOR_UNEXPECTED_FAILURE",
      mayHaveReservedUnits:true,stopConfirmed:false
    }));
    process.exitCode=2;
  });
}
