import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Authenticated, read-only PostgreSQL connectivity gate for Phase2G Stage1.
 * IMPORTANT: Matching DB URL strings is NOT equivalent to connecting to DB.
 * This routine is only used by a separately authorized prelaunch probe; it
 * never creates sessions or mutates scientific/provider records.
 */
export type DbLivePreflightAnswerV39 = {
  schema:"v39.phase2g-db-live-preflight.v1";
  status:"PASS"|"FAIL";
  database_connection_verified:boolean;
  provider_call:false;
  provider_mutation:false;
  database_mutation:false;
  alert_credits_spent:0;
};
export type DbLivePreflightResponseV39 = {
  http:200|404|503;
  body:DbLivePreflightAnswerV39|{error:"Not found"};
};
const FAIL:DbLivePreflightAnswerV39={
  schema:"v39.phase2g-db-live-preflight.v1",status:"FAIL",
  database_connection_verified:false,
  provider_call:false,provider_mutation:false,database_mutation:false,
  alert_credits_spent:0
};
export async function verifyReadOnlyDbLivePreflightV39(input:{
  runtimeUrl:string;
  challenge:string;
  suppliedProof:string;
  selectOne:()=>Promise<{rows:Array<{connected:unknown}>}>;
}):Promise<DbLivePreflightResponseV39>{
  const {runtimeUrl,challenge,suppliedProof,selectOne}=input;
  if(!runtimeUrl)return {http:503,body:FAIL};
  if(!/^[A-Za-z0-9_.:-]{16,256}$/.test(challenge)||
     !/^[a-f0-9]{64}$/.test(suppliedProof))
    return {http:404,body:{error:"Not found"}};
  const expected=createHmac("sha256",runtimeUrl)
    .update("phase2g-db-live-preflight:"+challenge).digest("hex");
  if(!timingSafeEqual(Buffer.from(expected,"hex"),Buffer.from(suppliedProof,"hex")))
    return {http:404,body:{error:"Not found"}};
  try{
    const actual=await selectOne();
    if(actual.rows.length!==1||Number(actual.rows[0].connected)!==1)
      return {http:503,body:FAIL};
    return {http:200,body:{...FAIL,status:"PASS",database_connection_verified:true}};
  }catch{
    // Avoid leaking driver error messages, connection URLs or table contents.
    return {http:503,body:FAIL};
  }
}
