/** F030/I024: one source of truth for prospective conditional service
 * route evidence and raw positive-operator ambiguity. No physical identity
 * certification or authority to issue PRE. Historical native/G5A paths
 * remain unchanged. */
import {createHash} from "node:crypto";
const ICAO=/^[A-Z]{4}$/;
type Route={carrier:string;number:string;origin:string;destination:string;originFromRequest:boolean};
type RouteResult={status:"ok";route:Route}|{status:"contraryOrigin"|"missingServiceFields"};
function record(x:unknown):Record<string,unknown>{return x!==null&&typeof x==="object"&&!Array.isArray(x)?x as Record<string,unknown>:{};}
function icao(x:unknown):string|null{if(typeof x!=="string")return null;const s=x.trim().toUpperCase();return ICAO.test(s)?s:null;}
export function inspectP5ConditionalRoute(f:unknown,airport:string):RouteResult{
 const x=record(f),dep=record(record(x.departure).airport).icao,dest=icao(record(record(x.arrival).airport).icao);
 const absent=dep===null||dep===undefined||dep==="";
 const origin=absent?airport:icao(dep);
 if(!ICAO.test(airport)||!origin||origin!==airport)return {status:"contraryOrigin"};
 const n=typeof x.number==="string"?x.number.trim().match(/^([A-Z0-9]{2})[ \t]*([0-9]{1,4})$/i):null;
 if(!n||!dest||dest===airport)return {status:"missingServiceFields"};
 return {status:"ok",route:{carrier:n[1].toUpperCase(),number:n[2].replace(/^0+/,"")||"0",origin,destination:dest,originFromRequest:absent}};
}
export function p5ConditionalPositiveOperator(f:unknown){const x=record(f);return x.codeshareStatus==="IsOperator"||x.codeshareStatus===1;}
export function p5ConditionalProviderIdAbsent(f:unknown){const id=record(f).id;return id===null||id===undefined||typeof id==="string"&&id.trim()==="";}
export function p5ConditionalServiceRouteKey(r:Pick<Route,"carrier"|"number"|"origin"|"destination">){return JSON.stringify([r.carrier,r.number,r.origin,r.destination]);}
export function p5ConditionalPositiveServiceCounts(departures:readonly unknown[],airport:string){
 const counts=new Map<string,number>();
 for(const f of departures){
  if(!p5ConditionalPositiveOperator(f))continue;
  const x=inspectP5ConditionalRoute(f,airport);if(x.status!=="ok")continue;
  const key=p5ConditionalServiceRouteKey(x.route);counts.set(key,(counts.get(key)??0)+1);
 }
 return counts;
}
export function p5ConditionalStage14Id(r:Pick<Route,"carrier"|"number"|"origin"|"destination">,cohortStartUtc:string){
 return "leg:g5a:"+createHash("sha256").update(JSON.stringify({protocol:"G5A_CONDITIONAL_IDLESS_OPERATOR_V2",frozenStudyStartUtc:cohortStartUtc,carrier:r.carrier,flightNumber:r.number,origin:r.origin,destination:r.destination})).digest("hex");
}
