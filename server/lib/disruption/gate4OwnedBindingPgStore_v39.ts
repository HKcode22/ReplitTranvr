/**
 * Gate4 DRAFT, NOT DEPLOYED: transactionally inserts an externally reviewed
 * exact subscription binding, then independently rereads every field after
 * commit. Import has NO I/O. Requires separately STAGED V0072 table and a
 * distinct binding writer role; do NOT grant the public receiver these writes.
 * Unknown commit response is a HOLD, never a blind retry.
 */
import type {Pool} from "pg";
import type {Gate4OwnedBindingV39,
 Gate4OwnedBindingStoreV39,Gate4OwnedBindingReceiptV39}
 from "./gate4VerifiedOwnerBinding_v39";

const same=(row:any,b:Gate4OwnedBindingV39):boolean=>
  !!row&&row.scope_id===b.scopeId&&
  row.authorization_sha256===b.authorizationSha256&&
  row.source_commit===b.sourceCommit&&
  row.airport_icao===b.airportIcao&&
  row.subscription_id===b.subscriptionId&&
  row.reviewed_create_receipt_sha256===b.reviewedCreateReceiptSha256&&
  row.signed_stop_ticket_sha256===b.signedStopTicketSha256;
const receipt=(ok:boolean):Gate4OwnedBindingReceiptV39=>({
  committed:ok,exactFieldsVerified:ok
});
const SELECT=
  "SELECT scope_id::text,authorization_sha256,source_commit,"+
  " airport_icao,subscription_id,reviewed_create_receipt_sha256,"+
  " signed_stop_ticket_sha256 FROM clean.gate4_alert_owned_binding_v39 "+
  "WHERE scope_id=$1::uuid";
export function createGate4OwnedBindingPgStoreV39(
  pool:Pick<Pool,"connect"|"query">
):Gate4OwnedBindingStoreV39{
  if(!pool||typeof pool.connect!=="function"||
      typeof pool.query!=="function")
    throw Error("GATE4_OWNER_BIND_DB_DEPENDENCIES_MISSING");
  return {
    async bindOnce(b){
      const client=await pool.connect();
      let inTransaction=false;
      try{
        await client.query("BEGIN");
        inTransaction=true;
        await client.query(
          "INSERT INTO clean.gate4_alert_owned_binding_v39 "+
          "(scope_id,authorization_sha256,source_commit,airport_icao,"+
          "subscription_id,reviewed_create_receipt_sha256,"+
          "signed_stop_ticket_sha256) VALUES "+
          "($1::uuid,$2,$3,$4,$5,$6,$7) "+
          "ON CONFLICT DO NOTHING",
          [b.scopeId,b.authorizationSha256,b.sourceCommit,b.airportIcao,
           b.subscriptionId,b.reviewedCreateReceiptSha256,
           b.signedStopTicketSha256]
        );
        // V0072 writer is deliberately INSERT+SELECT only. PostgreSQL
        // requires UPDATE privilege for SELECT ... FOR SHARE. Uniqueness
        // plus ON CONFLICT DO NOTHING and exact in-transaction readback
        // protect against mismatched/duplicate inserts without UPDATE rights.
        const x=await client.query(SELECT,[b.scopeId]);
        if(x.rows.length!==1||!same(x.rows[0],b))
          throw Error("GATE4_BIND_FOREIGN_OR_MUTATED_SCOPE_HOLD");
        await client.query("COMMIT");
        inTransaction=false;
        return receipt(true);
      }catch{
        if(inTransaction)
          await client.query("ROLLBACK").catch(()=>undefined);
        throw Error("GATE4_BIND_COMMIT_UNCERTAIN_HOLD");
      }finally{client.release();}
    },
    async readBack(b){
      const x=await pool.query(SELECT,[b.scopeId]);
      return receipt(x.rows.length===1&&same(x.rows[0],b));
    }
  };
}
