/**
 * Gate3 real owner admission PREVIEW: exact AUTH + LOGGED/UNLOGGED
 * same-session PostgreSQL verification. READ ONLY; no provider or paid owner.
 * A ledger-hash match is not a cryptographic signature or a spend token.
 */
import {readFileSync} from "node:fs";
import {join} from "node:path";
import type {PoolClient} from "pg";
import {v39Pool} from "../server/lib/disruption/db_v39";
import {sha256HexString} from "../server/lib/disruption/authRecord_v39";
import {reviewGate3OwnerPreflightV39} from
  "../server/lib/disruption/gate3OwnerAuthorizationPreflight_v39";

type Client=Pick<PoolClient,"query"|"release">;
export type Gate3ReadOnlyDeps=Readonly<{
  loadText?:(path:string)=>string;
  connect?:()=>Promise<Client>;
  nowUtc?:Date;
}>;
export type Gate3ReadOnlyResult=Readonly<{
  schema:"v39.phase3.gate3.owner-readonly.v1";
  status:"HOLD"|"READONLY_AUTH_SESSION_MATCH_NOT_PAID_AUTH";
  reasons:readonly string[];
  sessionId:string|null;
  ledgerHashApproved:boolean;
  preparedSessionChecked:boolean;
  providerCalls:0;
  databaseWrites:0;
  hostedPostCalls:0;
  paidCanaryAuthorized:false;
}>;
export type Gate3Args=Readonly<{
  authId:string;authFile:string;sessionId:string;icao:string;
  credits:number;seconds:number;airportFilterWindow:string;
}>;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUTH=/^AUTH-\d{8}-[A-Z0-9]+$/;
const flags=["--auth-id","--auth-file","--session-id","--icao",
             "--credits","--seconds","--airport-filter-window"] as const;
export function parseGate3ReadOnlyArgs(args:readonly string[]):Gate3Args{
  if(args.length!==flags.length*2)
    throw Error("GATE3_READONLY_SEVEN_EXACT_OPTIONS_REQUIRED");
  const map=new Map<string,string>();
  for(let i=0;i<args.length;i+=2){
    const flag=args[i],val=args[i+1];
    if(!(flags as readonly string[]).includes(flag)||
       map.has(flag)||!val||val.startsWith("--"))
      throw Error("GATE3_READONLY_FLAG_OR_VALUE_INVALID");
    map.set(flag,val);
  }
  if(map.size!==flags.length)throw Error("GATE3_READONLY_MISSING_FLAG");
  const authId=map.get("--auth-id")!;
  const authFile=map.get("--auth-file")!;
  const sessionId=map.get("--session-id")!;
  const icao=map.get("--icao")!;
  const c=map.get("--credits")!;
  const s=map.get("--seconds")!;
  const airportFilterWindow=map.get("--airport-filter-window")!;
  const credits=Number(c),seconds=Number(s);
  if(!AUTH.test(authId)||!UUID.test(sessionId)||!/^[A-Z]{4}$/.test(icao)||
     !/^[1-9]\d{0,2}$/.test(c)||credits>100||
     !/^[1-9]\d{0,3}$/.test(s)||seconds>3600||
     !airportFilterWindow.startsWith(icao+"/departures/")||
     !airportFilterWindow.endsWith("+"+seconds+"s")||
     authFile!==authFile.trim())
    throw Error("GATE3_READONLY_EXACT_SCOPE_INVALID");
  return {authId,authFile,sessionId,icao,credits,seconds,airportFilterWindow};
}
function hold(reasons:readonly string[],sessionId:string|null=null):Gate3ReadOnlyResult{
  return {schema:"v39.phase3.gate3.owner-readonly.v1",status:"HOLD",
    reasons,sessionId,ledgerHashApproved:false,preparedSessionChecked:false,
    providerCalls:0,databaseWrites:0,hostedPostCalls:0,paidCanaryAuthorized:false};
}

/**
 * Real SQL access is constrained by PostgreSQL BEGIN TRANSACTION READ ONLY.
 * Never publish a paid GO; even a source match requires independent hosted
 * receipt proof, account exposure review, approved V0065, and exact paid AUTH.
 */
export async function inspectGate3OwnerReadonly(
  argv:readonly string[],deps:Gate3ReadOnlyDeps={},
):Promise<Gate3ReadOnlyResult>{
  let args:Gate3Args;
  try{args=parseGate3ReadOnlyArgs(argv);}
  catch{return hold(["GATE3_READONLY_ARGS_INVALID"]);}
  if(deps.nowUtc!==undefined&&
     (!(deps.nowUtc instanceof Date)||!Number.isFinite(deps.nowUtc.getTime())))
    return hold(["GATE3_READONLY_CLOCK_INVALID"],args.sessionId);
  const load=deps.loadText??((p:string)=>readFileSync(p,"utf8"));
  let raw:string,ledger:string;
  try{
    raw=load(args.authFile);
    ledger=load(join(process.cwd(),"data-collection","evidence","ledgers","V3.9_RUN_REPORTS_AND_EVIDENCE.md"));
  }catch{return hold(["GATE3_READONLY_ARTIFACT_OR_LEDGER_MISSING"],args.sessionId);}
  if(typeof raw!=="string"||typeof ledger!=="string")
    return hold(["GATE3_READONLY_ARTIFACT_FORMAT_INVALID"],args.sessionId);
  const connect=deps.connect??(()=>v39Pool.connect());
  let client:Client;
  try{client=await connect();}
  catch{return hold(["GATE3_READONLY_DB_CONNECTION_FAILED"],args.sessionId);}
  let began=false,unknown=false;
  let checked:Awaited<ReturnType<typeof reviewGate3OwnerPreflightV39>>|null=null;
  const failures:string[]=[];
  try {
    await client.query("BEGIN TRANSACTION READ ONLY");
    began=true;
    checked=await reviewGate3OwnerPreflightV39(client,{
      authArtifactRaw:raw,evidenceLedgerRaw:ledger,
      expectedAuthId:args.authId,
      expectedAirportFilterWindow:args.airportFilterWindow,
      expectedSession:{
        sessionId:args.sessionId,icao:args.icao,
        authorizationEvidenceSha256:sha256HexString(raw),
        canaryCreditCeiling:args.credits,
        fixedExposureSeconds:args.seconds,
      },
      nowUtc:deps.nowUtc,
    });
  }catch{
    failures.push("GATE3_READONLY_QUERY_FAILED");
    unknown=!began;
  }finally{
    if(began){
      try{await client.query("ROLLBACK");}
      catch{unknown=true;failures.push("GATE3_READONLY_ROLLBACK_ACK_LOST");}
    }
    client.release(unknown);
  }
  if(!checked||failures.length)
    return hold(failures.length?failures:["GATE3_READONLY_NO_REVIEW"],args.sessionId);
  return {
    schema:"v39.phase3.gate3.owner-readonly.v1",
    status:checked.status==="OFFLINE_AUTH_SESSION_CONSISTENT"
      ?"READONLY_AUTH_SESSION_MATCH_NOT_PAID_AUTH":"HOLD",
    reasons:checked.reasons,sessionId:args.sessionId,
    ledgerHashApproved:checked.approvalEvidenceInLedger,
    preparedSessionChecked:checked.preparedSessionShapeVerified,
    providerCalls:0,databaseWrites:0,hostedPostCalls:0,
    paidCanaryAuthorized:false,
  };
}
if(import.meta.url==="file://"+process.argv[1]){
  void inspectGate3OwnerReadonly(process.argv.slice(2)).then(result=>{
    console.log(JSON.stringify(result,null,2));
    if(result.status==="HOLD")process.exitCode=2;
  }).catch(()=>{
    console.error("GATE3_READONLY_UNEXPECTED_FAILURE_HOLD");
    process.exitCode=2;
  });
}
