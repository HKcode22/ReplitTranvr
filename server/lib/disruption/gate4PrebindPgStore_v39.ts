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
      const client=await pool.connect();
      let committed=false;
      try{
        await client.query("BEGIN");
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
        const x=await client.query(
          "SELECT scope_id::text,original_sha256,source_commit,"+
          " authorization_sha256,airport_icao,"+
          " claimed_provider_subscription_id,original_wire "+
          "FROM clean.gate4_alert_prebind_original_v39 "+
          "WHERE scope_id=$1::uuid AND original_sha256=$2 "+
          "FOR SHARE",[o.scopeId,o.originalSha256]
        );
        if(x.rows.length!==1||!same(x.rows[0],o))
          throw Error("GATE4_PREBIND_DUPLICATE_ORIGINAL_CONFLICT");
        await client.query("COMMIT");
        committed=true;
        return receipt(o,true);
      }catch{
        if(!committed)
          await client.query("ROLLBACK").catch(()=>undefined);
        throw Error("GATE4_PREBIND_SQL_COMMIT_UNCONFIRMED");
      }finally{client.release();}
    },
    async readBackOriginal(o){
      // A second query after COMMIT is essential. It may be backed by a
      // different connection, but it is NOT an independently protected store.
      const x=await pool.query(
        "SELECT scope_id::text,original_sha256,source_commit,"+
        " authorization_sha256,airport_icao,"+
        " claimed_provider_subscription_id,original_wire "+
        "FROM clean.gate4_alert_prebind_original_v39 "+
        "WHERE scope_id=$1::uuid AND original_sha256=$2",
        [o.scopeId,o.originalSha256]
      );
      const row=x.rows.length===1?x.rows[0]:null;
      // Digest alone does NOT prove the source/auth/airport/claimed-ID
      // metadata is identical to what was transactionally committed.
      const ok=same(row,o);
      return receipt(o,ok);
    }
  };
}
