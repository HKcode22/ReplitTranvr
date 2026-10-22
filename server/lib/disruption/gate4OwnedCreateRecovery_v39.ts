/**
 * Gate4 actual V3.9 owned-subscription CREATE/rollback orchestration.
 *
 * No provider, PG or clocks in this module. Injected production deps perform
 * CREATE, source-ledger INSERT, owned DELETE, ended_at and incident journal.
 * Even a successful compensating DELETE attempt requires a fresh independent
 * account/source/subscription readback before another paid start.
 */
export interface Gate4CreatedSubscriptionV39<T> {
  selection:T;
  subscriptionId:string;
}
export interface Gate4CreateDependenciesV39<T> {
  create:(selection:T)=>Promise<string|null>;
  persist:(selection:T,id:string)=>Promise<void>;
  deleteOwned:(id:string)=>Promise<boolean>;
  markEnded:(id:string)=>Promise<void>;
  incident:(code:string,createdCount:number,
    unconfirmedCount:number)=>Promise<void>;
}

export async function runGate4OwnedSubscriptionCreatesV39<T>(
  selections:readonly T[],
  deps:Gate4CreateDependenciesV39<T>
):Promise<Array<Gate4CreatedSubscriptionV39<T>>> {
  if(!Array.isArray(selections)||!deps||
      !selections.length||selections.length>32)
    throw Error("GATE4_CREATE_INVALID_SELECTIONS");
  const created:Array<Gate4CreatedSubscriptionV39<T>>=[];
  let reason:string|null=null;
  for(const selection of selections){
    let id:string|null=null;
    try {
      id=await deps.create(selection);
    } catch {
      // The provider may have created the resource before a lost response.
      reason="CREATE_RESULT_AMBIGUOUS";
      break;
    }
    if(typeof id!=="string"||!id.trim()||id.length>512){
      reason="CREATE_ID_MISSING_OR_INVALID";
      break;
    }
    // CRITICAL: capture returned ID BEFORE persisting; if PG is down we
    // can still attempt to delete the billable remote subscription.
    created.push({selection,subscriptionId:id});
    try {
      await deps.persist(selection,id);
    } catch {
      reason="CREATE_DB_INSERT_UNCONFIRMED";
      break;
    }
  }
  if(reason===null)return created;
  let unconfirmedCount=(reason==="CREATE_RESULT_AMBIGUOUS"||
    reason==="CREATE_ID_MISSING_OR_INVALID")?1:0;
  // Keep deleting the other known subscriptions even if one attempt fails.
  for(const x of [...created].reverse()){
    let deleted=false;
    try { deleted=await deps.deleteOwned(x.subscriptionId)===true; }
    catch {deleted=false;}
    if(!deleted){unconfirmedCount++;continue;}
    try { await deps.markEnded(x.subscriptionId); }
    catch {unconfirmedCount++;}
  }
  let incidentRecorded=false;
  try {
    await deps.incident(reason,created.length,unconfirmedCount);
    incidentRecorded=true;
  } catch {
    // Write failure must never erase a possible paid resource.
  }
  if(unconfirmedCount>0||!incidentRecorded)
    throw Error("GATE4_CREATE_CUSTODY_UNCONFIRMED_HOLD");
  throw Error("GATE4_CREATE_COMPENSATION_REQUIRES_SETTLEMENT_HOLD");
}
