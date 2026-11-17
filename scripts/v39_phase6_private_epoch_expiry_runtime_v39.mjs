/** Bounded private epoch expiry transaction core, staged review only.
 * The production entrypoint must independently verify exact V0103/V0105
 * function bodies, grants, distinct restricted logins, endpoint and TLS.
 * No CLI, environment reads, provider, owner login, or scheduler here.
 */
const F="clean.phase6_private_epoch_expiry_";
const SHA=/^[a-f0-9]{64}$/;
const RUN=/^P6-PRIVATE-SWEEP-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const n=x=>Number.isSafeInteger(x)&&x>=0;
const hold=x=>{throw Error("HOLD_P6_PRIVATE_EXPIRY_RUNTIME_"+x);};
const STATUS=["duePackets","dueIndexes","expiredHeads","foreignDuePackets","foreignDueIndexes","claims"];
const RECEIPT=["packets","indexRevisions","earlierIndexRevisionsRetired","claimsPreserved","remainingDuePackets","remainingExpiredHeads"];
const clock=x=>typeof x==="string"&&Number.isFinite(Date.parse(x));
async function ro(pool,sql,args){
 const c=await pool.connect();let poison=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await c.query("SET LOCAL statement_timeout='12000ms'");
  const z=await c.query(sql,args);
  if(z.rows.length!==1)hold("NO_UNIQUE_READBACK");
  return z.rows[0].v;
 }finally{
  try{await c.query("ROLLBACK");}catch{poison=true;}
  c.release(poison?Error("PRIVATE_READONLY_ROLLBACK_UNKNOWN"):undefined);
  if(poison)hold("READONLY_ROLLBACK_UNKNOWN");
 }
}
async function status(reader,m){
 const v=await ro(reader,"SELECT "+F+"status_v39($1) v",[m]);
 if(!v||v.schema!=="v39.phase6.private-epoch-expiry-status.v1"||STATUS.some(k=>!n(v[k]))||
    v.claims>31||v.expiredHeads>v.claims||v.expiredHeads>v.dueIndexes||!clock(v.observedAtUtc)||
    typeof v.deletionStopUnresolved!=="boolean"||v.providerCalls!==0||v.databaseWrites!==0||
    v.backupOrPitrVerified!==false||v.phase6PaidGo!==false)hold("INVALID_STATUS");
 return {observedAtUtc:v.observedAtUtc,...Object.fromEntries(STATUS.map(k=>[k,v[k]])),deletionStopUnresolved:v.deletionStopUnresolved};
}
function sweepReceipt(v,limit){
 if(!v||v.schema!=="v39.phase6.private-epoch-expiry-sweep.v1"||
    v.status!=="PRIVATE_DUE_ONLY_IN_TX_NOT_COMMIT_PROOF"||!RUN.test(v.runId??"")||
    !clock(v.observedAtUtc)||RECEIPT.some(k=>!n(v[k]))||v.packets>limit||
    v.indexRevisions>1024||v.earlierIndexRevisionsRetired>v.indexRevisions||
    v.claimsPreserved>31||v.remainingExpiredHeads>v.claimsPreserved||
    v.providerCalls!==0||v.backupOrPitrVerified!==false||v.phase6PaidGo!==false)
  hold("INVALID_SWEEP_RESULT");
 return {runId:v.runId,observedAtUtc:v.observedAtUtc,...Object.fromEntries(RECEIPT.map(k=>[k,v[k]]))};
}
async function independentReceipt(reader,m,r){
 const v=await ro(reader,"SELECT "+F+"receipt_v39($1,$2) v",[m,r.runId]);
 if(!v||v.schema!=="v39.phase6.private-epoch-expiry-receipt.v1"||
    v.runId!==r.runId||v.providerCalls!==0||v.databaseWrites!==0||v.phase6PaidGo!==false||
    v.committedAggregateReceiptFound!==(r.packets+r.indexRevisions>0))
  hold("RECEIPT_MISMATCH");
 if(v.committedAggregateReceiptFound&&(v.observedAtUtc!==r.observedAtUtc||
    RECEIPT.some(k=>v[k]!==r[k])||v.backupOrPitrVerified!==false))hold("RECEIPT_MISMATCH");
}
async function stop(writer,reader,m,r){
 try{
  const c=await writer.connect();
  try{
   const z=await c.query("SELECT "+F+"stop_v39($1) v",[r.runId]);
   if(z.rows.length!==1||z.rows[0].v!==true)hold("STOP_NOT_ACKNOWLEDGED");
  }finally{c.release();}
  if((await status(reader,m)).deletionStopUnresolved!==true)hold("STOP_NOT_READ_BACK");
 }catch{hold("STOP_UNVERIFIED_NO_REPLAY");}
 hold("STOP_RECORDED_NO_REPLAY");
}
async function one(writer,reader,m,limit){
 const c=await writer.connect();let r,attempted=false,ack=false,poison=false;
 try{
  await c.query("BEGIN");
  await c.query("SET LOCAL statement_timeout='20000ms'");
  await c.query("SET LOCAL lock_timeout='3000ms'");
  r=sweepReceipt((await c.query("SELECT "+F+"sweep_v39($1,$2) v",[m,limit])).rows[0]?.v,limit);
  attempted=true;await c.query("COMMIT");ack=true;
 }catch(e){
  if(!attempted){try{await c.query("ROLLBACK");}catch{poison=true;}throw e;}
 }finally{c.release(poison||attempted&&!ack?Error("PRIVATE_SWEEP_CONNECTION_OUTCOME_UNKNOWN"):undefined);}
 if(!r)hold("NO_BATCH_RESULT");
 try{
  if(!ack&&r.packets+r.indexRevisions===0)hold("ZERO_WORK_COMMIT_UNKNOWN");
  await independentReceipt(reader,m,r);
 }catch{await stop(writer,reader,m,r);}
 return {...r,commitAck:ack,independentAggregateReceiptVerified:r.packets+r.indexRevisions>0};
}
/** Run only AFTER exact separate actor/ACL/body authentication by the
 * reviewed production wrapper. Default read-only. No replay on unknown.
 * At most 4 invocations, each at most 128 packets + one 1024-revision epoch.
 * Actual production throughput and deadlines are NOT certified here.
 */
export async function runP6PrivateEpochExpiryCore({writer,reader,manifest,apply=false,limit=128,maxBatches=4}){
 if(!writer||!reader||writer===reader||!SHA.test(manifest??"")||
    typeof apply!=="boolean"||!n(limit)||limit<1||limit>128||
    !n(maxBatches)||maxBatches<1||maxBatches>4)hold("INVALID_SCOPE");
 const before=await status(reader,manifest);
 const base={before,providerCalls:0,backupOrPitrVerified:false,completeRetentionDeploymentVerified:false,phase6PaidGo:false};
 if(!apply)return {...base,status:"PRIVATE_EXPIRY_VERIFY_ONLY_NO_WRITES",databaseWrites:0};
 if(before.deletionStopUnresolved)hold("DELETION_STOP");
 const receipts=[];let current=before;
 for(let i=0;i<maxBatches&&(current.duePackets||current.dueIndexes);i++){
  const r=await one(writer,reader,manifest,limit);receipts.push(r);
  current=await status(reader,manifest);
  if(current.deletionStopUnresolved)hold("DELETION_STOP_AFTER_SWEEP");
  if(r.packets+r.indexRevisions===0)break;
 }
 const due=current.duePackets+current.dueIndexes+current.foreignDuePackets+current.foreignDueIndexes;
 return {...base,status:due?"PRIVATE_EXPIRY_BACKLOG_REMAINS":"PRIVATE_EXPIRY_DUE_AT_READBACK_CLEARED",
  after:current,receipts,databaseWritesPossible:receipts.some(r=>r.packets+r.indexRevisions>0)};
}
