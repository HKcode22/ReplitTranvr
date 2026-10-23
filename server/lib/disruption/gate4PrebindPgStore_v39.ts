/**
 * DRAFT / NOT DEPLOYED. Exact-scoped PostgreSQL original-byte store for
 * Gate4 pre-CREATE Alert quarantine. Only becomes usable AFTER the separate
 * STAGED V0071 schema is reviewed and installed by explicit future approval.
 * Importing this module does not connect to the DB or perform any writes.
 *
 * The runtime service principal and narrow SQL GRANTs MUST be independently
 * reviewed. This adapter does not provision roles, sign ownership, or certify
 * transport, billing, independent STOP, durable backup or provider receipt.
 */
import {createHash} from "node:crypto";
import type {Pool} from "pg";
import type {
 Gate4PrebindOriginalV39,Gate4PrebindOriginalStoreV39,
 Gate4PrebindReceiptV39
} from "./gate4PrebindIngress_v39";

const SAFE_STAGES=new Set([
  "ACQUIRE","BEGIN","INSERT","TX_READBACK","TX_COMPARE","COMMIT",
  "POST_COMMIT_QUERY"
]);
function logSafeGate4SqlFailureV39(stage:string,e:unknown):void{
  const permitted=SAFE_STAGES.has(stage)?stage:"UNKNOWN";
  const candidate=(e as {code?:unknown}|null)?.code;
  const sqlstate=typeof candidate==="string"&&
    /^[A-Z0-9]{5}$/.test(candidate)?candidate:"NONE";
  console.error("GATE4_PREBIND_SQL_STAGE",
    JSON.stringify({stage:permitted,sqlstate}));
}
function same(row:any,o:Gate4PrebindOriginalV39):boolean{
  return !!row&&row.scope_id===o.scopeId&&
    row.original_sha256===o.originalSha256&&
    row.source_commit===o.sourceCommit&&
    row.authorization_sha256===o.authorizationSha256&&
    row.airport_icao===o.airportIcao&&
    row.claimed_provider_subscription_id===o.claimedSubscriptionId&&
    Buffer.isBuffer(row.original_wire)&&
    row.original_wire.equals(o.originalBytes)&&
    createHash("sha256").update(row.original_wire).digest("hex")===
      o.originalSha256;
}
function receipt(o:Gate4PrebindOriginalV39,ok:boolean):
Gate4PrebindReceiptV39{
  return {
    scopeId:o.scopeId,originalSha256:o.originalSha256,
    committed:ok,originalBytesVerified:ok
  };
}
export function createGate4PrebindPgStoreV39(
  pool:Pick<Pool,"connect"|"query">
):Gate4PrebindOriginalStoreV39{
  if(!pool||typeof pool.connect!=="function"||
    typeof pool.query!=="function")
    throw Error("GATE4_PREBIND_PG_UNAVAILABLE");
  return {
    async writeOriginal(o){
      // Never print SQL text, connection URLs, raw wire, ID or credentials.
      // Fixed stage + validated SQLSTATE are sufficient for operational
      // diagnosis of a genuine hosted 503 without revealing provider data.
      let client:Awaited<ReturnType<typeof pool.connect>>;
      try{client=await pool.connect();}
      catch(e){
        logSafeGate4SqlFailureV39("ACQUIRE",e);
        throw Error("GATE4_PREBIND_ACQUIRE_HOLD");
      }
      let committed=false;
      let stage="BEGIN";
      try{
        await client.query("BEGIN");
        stage="INSERT";
        await client.query(
          "INSERT INTO clean.gate4_alert_prebind_original_v39 "+
          "(scope_id,original_sha256,source_commit,authorization_sha256,"+
          " airport_icao,claimed_provider_subscription_id,original_wire) "+
          "VALUES ($1::uuid,$2,$3,$4,$5,$6,$7) "+
          "ON CONFLICT (scope_id,original_sha256) DO NOTHING",[
            o.scopeId,o.originalSha256,o.sourceCommit,
            o.authorizationSha256,o.airportIcao,
            o.claimedSubscriptionId,o.originalBytes
          ]);
        stage="TX_READBACK";
        const x=await client.query(
          "SELECT scope_id::text,original_sha256,source_commit,"+
          " authorization_sha256,airport_icao,"+
          " claimed_provider_subscription_id,original_wire "+
          "FROM clean.gate4_alert_prebind_original_v39 "+
          "WHERE scope_id=$1::uuid AND original_sha256=$2",[
            o.scopeId,o.originalSha256
          ]
        );
        stage="TX_COMPARE";
        if(x.rows.length!==1||!same(x.rows[0],o))
          throw Error("GATE4_PREBIND_TX_COMPARE_HOLD");
        stage="COMMIT";
        await client.query("COMMIT");
        committed=true;
        return receipt(o,true);
      }catch(e){
        if(!committed)
          await client.query("ROLLBACK").catch(()=>undefined);
        logSafeGate4SqlFailureV39(stage,e);
        throw Error("GATE4_PREBIND_"+stage+"_HOLD");
      }finally{client.release();}
    },
    async readBackOriginal(o){
      // A second query after COMMIT is essential. It may be backed by a
      // different connection, but it is NOT an independently protected store.
      let x;
      try{
        x=await pool.query(
          "SELECT scope_id::text,original_sha256,source_commit,"+
        " authorization_sha256,airport_icao,"+
        " claimed_provider_subscription_id,original_wire "+
        "FROM clean.gate4_alert_prebind_original_v39 "+
        "WHERE scope_id=$1::uuid AND original_sha256=$2",
        [o.scopeId,o.originalSha256]
        );
      }catch(e){
        logSafeGate4SqlFailureV39("POST_COMMIT_QUERY",e);
        throw Error("GATE4_PREBIND_POST_COMMIT_QUERY_HOLD");
      }
      const row=x.rows.length===1?x.rows[0]:null;
      // Digest alone does NOT prove the source/auth/airport/claimed-ID
      // metadata is identical to what was transactionally committed.
      const ok=same(row,o);
      if(!ok)console.error("GATE4_PREBIND_SQL_STAGE",
        JSON.stringify({stage:"POST_COMMIT_COMPARE",sqlstate:"NONE"}));
      return receipt(o,ok);
    }
  };
}
