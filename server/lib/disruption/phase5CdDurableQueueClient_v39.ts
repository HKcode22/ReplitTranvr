/**
 * Phase5 C+D durable PostgreSQL queue adapter.
 *
 * Only a thin typed client of V0087 SQL. No second queue state machine,
 * no provider HTTP, no background timer, no new Stage14 writer.
 * A GitHub-only worker with a separately commissioned limited DB role must
 * supply the executor and authentic source/permitted policy packets.
 *
 * IMPORTANT: Strings/SHA fields are NOT a signature or independent license.
 * This adapter DOES NOT grant or imply Phase5 FREEZE / Phase6 paid GO.
 */
export type P5CdHorizon="T-24h"|"T-6h"|"T-90m";
export type P5CdQueueState="READY"|"CLAIMED"|
 "WRITE_STARTED_UNKNOWN"|"VERIFIED_ON_TIME"|"MISSED"|"QUARANTINED";
export interface P5CdTaskExecutor{
 query(sql:string,args?:unknown[]):Promise<{rows:any[];rowCount?:number|null}>;
}
export interface P5CdReviewedEnqueue{
 manifestSha256:string;
 flightInstanceId:string;
 horizon:P5CdHorizon;
 selectedNativeTUtc:string;
 packetSha256:string;
 sourcePopulationQueryId:string;
 sourceResponseSha256:string;
 reviewedSourceRightsSha256:string;
 sourceExpiresAtUtc:string;
 /** External source/flight/legal review, not authenticated by this code. */
 externalSourceAndPolicyReviewed:true;
}
export interface P5CdClaimedTask{
 taskId:string;
 manifestSha256:string;
 flightInstanceId:string;
 horizon:P5CdHorizon;
 selectedNativeTUtc:string;
 predictionCutoffUtc:string;
 packetSha256:string;
 sourcePopulationQueryId:string;
 sourceResponseSha256:string;
 /** Immutable rights/source expiry from the REAL V0087 claimed row. */
 reviewedSourceRightsSha256:string;
 sourceExpiresAtUtc:string;
 state:"CLAIMED";
 leaseOwner:string;
 leaseGeneration:string;
 leaseUntilUtc:string;
}
export const P5_CD_V0087_OFFSETS_MS={
 "T-24h":86_400_000,"T-6h":21_600_000,"T-90m":5_400_000
} as const;
const HASH=/^[0-9a-f]{64}$/;
const ID=/^[A-Za-z0-9_.:|-]{5,200}$/;
const WORKER=/^[A-Za-z0-9_.:-]{5,96}$/;
const POSITIVE=/^[1-9][0-9]{0,18}$/;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
function reject(reason:string):never{
 throw Error("REFUSED_P5_CD_V0087_QUEUE_"+reason);
}
function stamp(x:unknown):number{
 if(typeof x!=="string"||!ISO.test(x))reject("INVALID_ISO_UTC");
 const ms=Date.parse(x);
 if(!Number.isFinite(ms)||new Date(ms).toISOString()!==x)
  reject("NONCANONICAL_UTC");
 return ms;
}
function exactHash(s:string){return typeof s==="string"&&HASH.test(s);}
function checkedId(s:unknown){
 if(typeof s!=="string"||!POSITIVE.test(s))reject("ID_OR_GENERATION_INVALID");
 return s;
}
function getRows(r:unknown):any[]{
 if(!r||typeof r!=="object"||!Array.isArray((r as any).rows))
  reject("DB_QUERY_RESULT_INVALID");
 return (r as any).rows;
}
function utc(x:unknown):string{
 if(x instanceof Date){if(!Number.isFinite(x.getTime()))reject("INVALID_DB_DATE");return x.toISOString();}
 if(typeof x==="string")return new Date(stamp(x)).toISOString();
 return reject("INVALID_DB_DATE");
}
function taskFromDb(r:any):P5CdClaimedTask{
 if(!r||r.state!=="CLAIMED"||!ID.test(r.flight_instance_id)||
  !Object.hasOwn(P5_CD_V0087_OFFSETS_MS,r.horizon)||
  !exactHash(r.manifest_sha256)||!exactHash(r.packet_sha256)||
  !exactHash(r.source_response_sha256)||
  !exactHash(r.reviewed_source_rights_sha256)||
  typeof r.source_population_query_id!=="string"||
  typeof r.lease_owner!=="string"||!WORKER.test(r.lease_owner))
   reject("CLAIMED_DB_ROW_INVALID");
 const native=utc(r.selected_native_t_utc),cutoff=utc(r.prediction_cutoff_utc);
 if(Date.parse(native)-Date.parse(cutoff)!==
    P5_CD_V0087_OFFSETS_MS[r.horizon as P5CdHorizon])
  reject("DB_ROW_HORIZON_NATIVE_T_CHANGED");
 return{
  taskId:checkedId(String(r.task_id)),
  manifestSha256:r.manifest_sha256,flightInstanceId:r.flight_instance_id,
  horizon:r.horizon,selectedNativeTUtc:native,predictionCutoffUtc:cutoff,
  packetSha256:r.packet_sha256,
  sourcePopulationQueryId:r.source_population_query_id,
  sourceResponseSha256:r.source_response_sha256,
  reviewedSourceRightsSha256:r.reviewed_source_rights_sha256,
  sourceExpiresAtUtc:utc(r.source_expires_at_utc),state:"CLAIMED",
  leaseOwner:r.lease_owner,
  leaseGeneration:checkedId(String(r.lease_generation)),
  leaseUntilUtc:utc(r.lease_until_utc)
 };
}
export async function enqueueP5CdReviewedTaskV39(
 db:P5CdTaskExecutor,input:P5CdReviewedEnqueue
):Promise<string>{
 if(!db||typeof db.query!=="function"||!input||
   input.externalSourceAndPolicyReviewed!==true||
   !exactHash(input.manifestSha256)||!ID.test(input.flightInstanceId)||
   !Object.hasOwn(P5_CD_V0087_OFFSETS_MS,input.horizon)||
   !exactHash(input.packetSha256)||!exactHash(input.sourceResponseSha256)||
   !exactHash(input.reviewedSourceRightsSha256)||
   typeof input.sourcePopulationQueryId!=="string"||
   input.sourcePopulationQueryId.length<8||
   input.sourcePopulationQueryId.length>128)
   reject("UNREVIEWED_SOURCE_OR_IDENTITY");
 const t=stamp(input.selectedNativeTUtc),expiry=stamp(input.sourceExpiresAtUtc);
 const cutoff=new Date(t-P5_CD_V0087_OFFSETS_MS[input.horizon]).toISOString();
 // DB clock is authoritative; this local check is *only* a preliminary
 // refusal. The SQL's DB-clock trigger repeats it authoritatively.
 if(expiry<=Date.now()||Date.parse(cutoff)<=Date.now()+2000)
   reject("EXPIRED_OR_RETROSPECTIVE_PRE");
 const rows=getRows(await db.query(
  "INSERT INTO clean.phase5_cd_pre_task_v39("+
  "manifest_sha256,flight_instance_id,horizon,selected_native_t_utc,"+
  "prediction_cutoff_utc,packet_sha256,source_population_query_id,"+
  "source_response_sha256,reviewed_source_rights_sha256,source_expires_at_utc)"+
  " VALUES($1,$2,$3,$4::timestamptz,$5::timestamptz,$6,$7,$8,$9,"+
  "$10::timestamptz) RETURNING task_id::text",
  [input.manifestSha256,input.flightInstanceId,input.horizon,
   input.selectedNativeTUtc,cutoff,input.packetSha256,
   input.sourcePopulationQueryId,input.sourceResponseSha256,
   input.reviewedSourceRightsSha256,input.sourceExpiresAtUtc]));
 if(rows.length!==1)return reject("DURABLE_INSERT_NOT_ACKNOWLEDGED");
 return checkedId(rows[0].task_id);
}
export async function claimP5CdDueTasksV39(
 db:P5CdTaskExecutor,owner:string,limit=4,leaseSeconds=60
):Promise<P5CdClaimedTask[]>{
 if(!db||typeof db.query!=="function"||!WORKER.test(owner)||
  !Number.isInteger(limit)||limit<1||limit>16||
  !Number.isInteger(leaseSeconds)||leaseSeconds<15||leaseSeconds>120)
  reject("INVALID_CLAIM_REQUEST");
 const rows=getRows(await db.query(
  "SELECT * FROM clean.phase5_cd_claim_due_v39($1,$2,$3)",
  [owner,limit,leaseSeconds]));
 if(rows.length>limit)reject("CLAIM_OVER_RETURNED");
 return rows.map(taskFromDb);
}
export async function markP5CdStage14WriteStartedV39(
 db:P5CdTaskExecutor,task:P5CdClaimedTask
):Promise<boolean>{
 if(!db||typeof db.query!=="function"||!task||
  task.state!=="CLAIMED"||!WORKER.test(task.leaseOwner))
  reject("INVALID_START_REQUEST");
 const rows=getRows(await db.query(
  "SELECT clean.phase5_cd_mark_write_started_v39("+
  "$1::bigint,$2,$3::bigint) AS ok",
  [checkedId(task.taskId),task.leaseOwner,checkedId(task.leaseGeneration)]));
 if(rows.length!==1||typeof rows[0].ok!=="boolean")
  reject("START_ACK_AMBIGUOUS_QUARANTINE");
 return rows[0].ok;
}
export async function acknowledgeP5CdStage14PostCommitV39(
 db:P5CdTaskExecutor,task:P5CdClaimedTask,
 snapshotId:string,independentReviewedReceiptSha256:string
):Promise<boolean>{
 if(!db||typeof db.query!=="function"||!task||
   !exactHash(independentReviewedReceiptSha256))reject("RECEIPT_NOT_REVIEWED");
 const rows=getRows(await db.query(
  "SELECT clean.phase5_cd_ack_verified_v39("+
  "$1::bigint,$2,$3::bigint,$4::bigint,$5) AS ok",
  [checkedId(task.taskId),task.leaseOwner,checkedId(task.leaseGeneration),
   checkedId(snapshotId),independentReviewedReceiptSha256]));
 if(rows.length!==1||typeof rows[0].ok!=="boolean")
  reject("VERIFY_ACK_AMBIGUOUS_RECONCILE");
 return rows[0].ok;
}
export async function reapP5CdExpiredLeasesOnceV39(
 db:P5CdTaskExecutor,limit=64
):Promise<Array<{taskId:string;state:P5CdQueueState}>>{
 if(!db||typeof db.query!=="function"||
   !Number.isInteger(limit)||limit<1||limit>256)
  reject("REAPER_BOUND_INVALID");
 const rows=getRows(await db.query(
  "SELECT task_id::text,new_state FROM clean.phase5_cd_reap_once_v39($1)",
  [limit]));
 if(rows.length>limit)reject("REAPER_OVER_RETURNED");
 return rows.map((r:any)=>{
  if(!["READY","MISSED","QUARANTINED"].includes(r.new_state))
   reject("REAPER_STATE_UNEXPECTED");
  return {taskId:checkedId(r.task_id),state:r.new_state};
 });
}
