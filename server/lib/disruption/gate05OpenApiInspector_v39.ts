/**
 * Gate0.5 OFFLINE OpenAPI shape/semantic warning inspector.
 * Parsed bytes come from operator-supplied LOCAL file, not a provider REST call.
 * A structurally valid JSON document is NOT authenticated official provenance,
 * per-observation actuality, content coverage, tariff, or paid authorization.
 */
import {createHash} from "node:crypto";
export interface Gate05OpenApiReadbackV39 {
  schema:"v39.gate05.openapi-inspect.v1";
  status:"CONTRACT_SHAPE_REVIEW_ONLY_NOT_PILOT_PASS";
  sha256:string;
  version:string;
  movementFields:{
    scheduledTime:boolean;
    revisedTime:boolean;
    runwayTime:boolean;
    revisedMayBeEstimate:boolean;
    runwayMayBeEstimate:boolean;
    revisedGateRunwayAmbiguity:boolean;
  };
  fids:{localRangeGetTier2:boolean;withLocationQueryBoolean:boolean;
    withLegQueryBoolean:boolean;directionQueryPresent:boolean};
  sourceAuthenticityVerified:false;
  observedMovementActualityVerified:false;
  providerCurrentTariffVerified:false;
  canAuthorizePaidPilot:false;
}
function record(x:unknown):Record<string,any>{
  return x!==null&&typeof x==="object"&&!Array.isArray(x)?x as Record<string,any>:{};
}
function described(o:unknown,k:string):string{
  const d=record(record(o)[k]).description;
  return typeof d==="string"?d:"";
}
function param(op:unknown,name:string):Record<string,any>|null{
  const ps=record(op).parameters;
  if(!Array.isArray(ps))return null;
  const p=ps.find(v=>record(v).name===name&&record(v).in==="query");
  return p?record(p):null;
}
export function inspectGate05OpenApiBytesV39(raw:Buffer|string):Gate05OpenApiReadbackV39{
  const bytes=Buffer.isBuffer(raw)?raw:Buffer.from(raw,"utf8");
  if(bytes.length===0||bytes.length>12000000)throw Error("GATE05_OPENAPI_SIZE_HOLD");
  let document:Record<string,any>;
  try{document=record(JSON.parse(bytes.toString("utf8")));}
  catch{throw Error("GATE05_OPENAPI_JSON_INVALID");}
  const version=record(document.info).version;
  if(typeof version!=="string"||!/^\d+\.\d+\.\d+\.\d+$/.test(version))
    throw Error("GATE05_OPENAPI_VERSION_MISSING");
  const movement=record(record(document.components).schemas).FlightAirportMovementContract;
  const fields=record(record(movement).properties);
  const scheduled=described(fields,"scheduledTime");
  const revised=described(fields,"revisedTime");
  const runway=described(fields,"runwayTime");
  // If meaning changed, do not silently certify a stale alias mapping.
  if(!/scheduled/i.test(scheduled)||
     !/actual/i.test(revised)||!/estimated/i.test(revised)||
     !/gate/i.test(revised)||!/runway/i.test(revised)||
     !/actual/i.test(runway)||!/estimated/i.test(runway)||
     !/runway/i.test(runway))
    throw Error("GATE05_OPENAPI_MOVEMENT_SEMANTICS_DRIFT_HOLD");
  const endpoint=record(record(document.paths)["/flights/airports/{codeType}/{code}/{fromLocal}/{toLocal}"]).get;
  const loc=param(endpoint,"withLocation");
  const leg=param(endpoint,"withLeg");
  const direction=param(endpoint,"direction");
  const tier2=/TIER\s*2/i.test(String(record(endpoint).summary??""));
  if(!tier2||!loc||!leg||!direction||
     record(loc.schema).type!=="boolean"||
     record(loc.schema).default!==false||
     record(leg.schema).type!=="boolean")
    throw Error("GATE05_OPENAPI_FIDS_CONTRACT_DRIFT_HOLD");
  return {
    schema:"v39.gate05.openapi-inspect.v1",
    status:"CONTRACT_SHAPE_REVIEW_ONLY_NOT_PILOT_PASS",
    sha256:createHash("sha256").update(bytes).digest("hex"),
    version,
    movementFields:{
      scheduledTime:true,revisedTime:true,runwayTime:true,
      revisedMayBeEstimate:true,runwayMayBeEstimate:true,
      revisedGateRunwayAmbiguity:true
    },
    fids:{localRangeGetTier2:true,withLocationQueryBoolean:true,
      withLegQueryBoolean:true,directionQueryPresent:true},
    sourceAuthenticityVerified:false,
    observedMovementActualityVerified:false,
    providerCurrentTariffVerified:false,
    canAuthorizePaidPilot:false
  };
}
