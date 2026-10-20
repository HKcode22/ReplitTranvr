/**
 * Gate0.5 FIDS scope-bound adapter (DRAFT / UNDEPLOYED).
 * The legacy global category budget is NOT used. A previously reviewed and
 * activated durable owner, exact allowed query hash, and per-attempt SQL
 * reservation are required before EVERY physical provider request.
 * This does not grant/persist AUTH or activate a scope.
 */
import {createHash,randomUUID} from "node:crypto";
import type {Pool} from "pg";
import {
  fetchFidsAirport,FIDS_REST_UNITS_PER_ATTEMPT,
  type FidsAirportResult,type FidsAttemptBudgetOwner
} from "./aerodataboxLimiter_v3";

export interface Gate05ScopedFidsIdentityV39 {
  scopeId:string;
  authorizationId:string;
  authorizationSha256:string;
  cycleId:string;
  icao:string;
  /** Exact reviewed query fingerprint, bound to this authorization. */
  querySha256:string;
}
export interface Gate05ScopedFidsQueryV39 {
  icao:string;
  fromLocal:string;
  toLocal:string;
  withLocation:boolean;
}
function safeId(x:string):boolean{return /^[a-fA-F0-9]{8}-(?:[a-fA-F0-9]{4}-){3}[a-fA-F0-9]{12}$/.test(x)}
function validLocal(v:string):boolean {
  return typeof v==="string" &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(v) &&
    Number.isFinite(Date.parse(v+":00Z"));
}
export function gate05FidsQueryFingerprintV39(q:Gate05ScopedFidsQueryV39):string {
  if(!q||typeof q.icao!=="string"||!/^[A-Z]{4}$/.test(q.icao)||
     !validLocal(q.fromLocal)||!validLocal(q.toLocal)||
     q.fromLocal>=q.toLocal || typeof q.withLocation!=="boolean")
    throw Error("GATE05_FIDS_QUERY_SHAPE_HOLD");
  const shape={
    contract:"v39.gate05.fids-query.v1",
    endpoint:"/flights/airports/icao/{icao}/{fromLocal}/{toLocal}",
    icao:q.icao,fromLocal:q.fromLocal,toLocal:q.toLocal,
    direction:"Departure",withLeg:true,withLocation:q.withLocation,
    withCancelled:true,withCodeshared:true,withCargo:false,withPrivate:false
  };
  return createHash("sha256").update(JSON.stringify(shape)).digest("hex");
}
export function makeGate05ScopedFidsBudgetOwnerV39(
  pool:Pick<Pool,"query">,
  owner:Gate05ScopedFidsIdentityV39,
  query:Gate05ScopedFidsQueryV39
):FidsAttemptBudgetOwner {
  const hash=gate05FidsQueryFingerprintV39(query);
  if(!owner||!safeId(owner.scopeId)||
     !/^AUTH-[A-Z0-9-]{8,100}$/.test(owner.authorizationId)||
     !/^[0-9a-f]{64}$/.test(owner.authorizationSha256)||
     !owner.cycleId||owner.cycleId.length<8||owner.cycleId.length>120||
     owner.icao!==query.icao || owner.querySha256!==hash)
    throw Error("GATE05_SCOPED_OWNER_BINDING_HOLD");
  return {
    async reserve(category,units,attemptNumber) {
      if(units!==FIDS_REST_UNITS_PER_ATTEMPT||
         !Number.isInteger(attemptNumber)||attemptNumber<1||attemptNumber>3||
         category!==(attemptNumber===1?"fids_base":"fids_retry"))
        throw Error("GATE05_SCOPED_ATTEMPT_CATEGORY_HOLD");
      const reservationId=randomUUID();
      // One atomic PostgreSQL statement. The stored function locks the owner
      // then the allowlisted query and commits counters + receipt together.
      const r=await pool.query(
        "SELECT clean.reserve_gate05_fids_attempt_v39($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10) AS reserved",
        [reservationId,owner.scopeId,owner.authorizationId,owner.authorizationSha256,
         owner.cycleId,owner.icao,hash,category,attemptNumber,units]
      );
      if(r.rowCount!==1||r.rows[0]?.reserved!==true)
        throw Error("GATE05_SCOPED_RESERVATION_NOT_COMMITTED");
      return reservationId;
    }
  };
}
export async function fetchGate05ScopedFidsV39(args:{
  db:Pick<Pool,"query">;
  owner:Gate05ScopedFidsIdentityV39;
  query:Gate05ScopedFidsQueryV39;
  /** Injectable only to run mock HTTP in tests. Production passes none. */
  fetchImpl?:typeof fetch;
  sleepImpl?:(ms:number)=>Promise<void>;
  /** Pilot controller may abort an in-flight GET, never refunds reservation. */
  signal?:AbortSignal;
}):Promise<FidsAirportResult|null>{
  const ledger=makeGate05ScopedFidsBudgetOwnerV39(args.db,args.owner,args.query);
  // No fallback to global category ledger or other direction flags.
  return fetchFidsAirport(args.query.icao,args.query.fromLocal,args.query.toLocal,{
    direction:"Departure",withLeg:true,withLocation:args.query.withLocation,
    strictDepartureList:true,category:"fids_base",budgetOwner:ledger,
    fetchImpl:args.fetchImpl,sleepImpl:args.sleepImpl,signal:args.signal
  });
}
