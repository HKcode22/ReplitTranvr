import {createHmac,randomUUID} from "node:crypto";

export type Stage1DbLivenessResultV39={
  healthy:boolean;check:"runtime_db_connection";
  reason:"ok"|"missing_github_db_environment"|"database_not_connected"|"network_or_timeout"|"invalid_preflight_response";
  http_status:number|null;elapsed_ms:number;
};
/**
 * Pre-launch only: called AFTER the existing four binding checks, BEFORE
 * spawning the paid owner. Never invoked by the 15s callback watchdog.
 *
 * This function is a read-only server handshake, NOT a DB query in GitHub:
 * the published callback server performs authenticated SELECT 1.
 */
export async function verifyStage1PublishedDatabaseLiveV39(input:{
  base:string;
  githubRuntimeDbUrl:string;
  fetchImpl?:typeof fetch;
  nonce?:string;
}):Promise<Stage1DbLivenessResultV39>{
  const started=Date.now();
  const result=(healthy:boolean,reason:Stage1DbLivenessResultV39["reason"],http_status:number|null=null):Stage1DbLivenessResultV39=>({
    healthy,check:"runtime_db_connection",reason,http_status,elapsed_ms:Date.now()-started
  });
  const {base,githubRuntimeDbUrl}=input;
  if(!githubRuntimeDbUrl)return result(false,"missing_github_db_environment");
  const challenge="phase2g-stage1-db-live-"+(input.nonce??randomUUID());
  if(!/^[A-Za-z0-9_.:-]{16,256}$/.test(challenge))return result(false,"invalid_preflight_response");
  const proof=createHmac("sha256",githubRuntimeDbUrl)
    .update("phase2g-db-live-preflight:"+challenge).digest("hex");
  try{
    const response=await (input.fetchImpl??fetch)(base+"/__v39/phase2g/db-live-preflight",{
      method:"POST",headers:{
        accept:"application/json",
        "x-v39-phase2g-db-live-challenge":challenge,
        "x-v39-phase2g-db-live-proof":proof
      },signal:AbortSignal.timeout(6500)
    });
    const answer:any=await response.json().catch(()=>null);
    if(response.status!==200 ||
      answer?.schema!=="v39.phase2g-db-live-preflight.v1"||
      answer?.status!=="PASS"||
      answer?.database_connection_verified!==true||
      answer?.database_mutation!==false||
      answer?.provider_call!==false||
      answer?.provider_mutation!==false||
      Number(answer?.alert_credits_spent)!==0)
      return result(false,"database_not_connected",response.status);
    return result(true,"ok",200);
  }catch{
    return result(false,"network_or_timeout");
  }
}
