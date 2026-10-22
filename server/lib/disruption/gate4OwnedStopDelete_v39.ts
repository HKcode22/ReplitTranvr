/**
 * Gate4 owned STOP: attempt every known subscription even when one provider
 * DELETE or SQL ended_at write fails. Never logs/returns subscription IDs.
 * Absence of database rows is NOT proof that no remote orphan exists.
 * Real provider DELETE, settlement and inventory are injected by caller.
 */
export interface Gate4OwnedDeleteDeps {
  deleteOwned(id:string):Promise<boolean>;
  markEnded(id:string):Promise<boolean>;
}
export interface Gate4DeleteSummary {
  attempted:number;
  deleteReturnedTrue:number;
  markedEnded:number;
  unconfirmed:number;
  allKnownOwnedClosed:boolean;
  independentlyVerified:false;
}
export async function attemptGate4AllOwnedDeletesV39(
  ids:readonly string[],deps:Gate4OwnedDeleteDeps
):Promise<Gate4DeleteSummary> {
  if(!Array.isArray(ids)||!deps || !deps.deleteOwned || !deps.markEnded)
    throw Error("GATE4_OWNED_DELETE_INVALID_INPUT");
  let deleteReturnedTrue=0,markedEnded=0,unconfirmed=0;
  const seen=new Set<string>();
  for(const value of ids){
    // Invalid or duplicate IDs must not prevent attempting later valid IDs.
    if(typeof value!=="string"||!value.trim()||value.length>512||seen.has(value)){
      unconfirmed++;
      continue;
    }
    seen.add(value);
    let deleted=false;
    try { deleted=await deps.deleteOwned(value)===true; }
    catch { deleted=false; }
    if(!deleted){unconfirmed++;continue;}
    deleteReturnedTrue++;
    let persisted=false;
    try { persisted=await deps.markEnded(value)===true; }
    catch { persisted=false; }
    if(persisted)markedEnded++;
    else unconfirmed++;
  }
  return {
    attempted:ids.length,deleteReturnedTrue,markedEnded,unconfirmed,
    allKnownOwnedClosed:unconfirmed===0,independentlyVerified:false
  };
}
