/**
 * Phase5 public callback-only V2 release identity: independent metadata GET.
 * No secrets, DB, provider API, external POST, deployment or paid activation.
 */
import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
const EXPECTED='6c187d58e2b1339aace71079e27767523d8ca3ce';
const SHA=/^[a-f0-9]{40}$/;
export function assessV2PublishedIdentity({httpCode,curlExit,elapsedMs,body}){
 let data=null;
 try{
  if(typeof body==='string' && body.length<=16384) data=JSON.parse(body);
 }catch{}
 const raw=typeof data?.git_head==='string'?data.git_head.toLowerCase():'';
 const claimed=SHA.test(raw)?raw:null;
 const schemaOk=data?.schema==='v39.phase2f-workspace-runtime.v1';
 const basic=httpCode===200 && curlExit===0 && schemaOk && data?.status==='PASS' &&
   data?.published_deployment===true && data?.prepaid_route_registered===true;
 const matched=basic && claimed===EXPECTED;
 return {
  schema:'v39.phase5.published-v2-source-observation.v1',
  status:matched?'OBSERVED_V2_SOURCE_PIN_MATCH_NOT_SIGNED_POST_PROOF':
   !basic?'HOLD_PUBLIC_RUNTIME_UNAVAILABLE_OR_INVALID':
   'HOLD_PUBLISHED_SOURCE_NOT_REVIEWED_V2_PIN',
  expectedReviewedExecutableSourcePin:EXPECTED,
  claimedPublishedGitHead:claimed,
  hostedHttpStatus:Number.isInteger(httpCode)?httpCode:null,
  hostedCurlExit:Number.isInteger(curlExit)?curlExit:null,
  hostedElapsedMs:Number.isFinite(elapsedMs)?Math.round(elapsedMs):null,
  publicCallbackOnlyMetadataValid:basic,
  sourcePinMatchesReviewedV2:matched,
  publishedAutoscaleClaim:data?.runtime_durability_class==='autoscale',
  publishedRawCustodyClaim:data?.prepaid_source_custody_ready===true,
  signedNonemptyExternalPostDurableAckVerified:false,
  restartSurvivalVerified:false,
  providerStopReconciliationVerified:false,
  phase5ScientificFreezePassed:false,
  phase6PaidGo:false,
  providerCalls:0,databaseReads:0,databaseWrites:0,publisherChanges:0
 };
}
if(process.argv[1] && process.argv[1].endsWith('v39_phase5_published_v2_identity_readonly.mjs') &&
   process.env.P5_V2_PUBLIC_READONLY_CLI==='1'){
 try{
  const [bodyPath,outPath,code,exit,elapsed]=process.argv.slice(2);
  if(!bodyPath||!outPath||!/^\\d{3}$/.test(String(code))||
     !/^\\d+$/.test(String(exit))||!/^[\\d.]+$/.test(String(elapsed)))
    throw Error('INVALID_CLI_ARGS');
  let body='';
  try{body=readFileSync(bodyPath,'utf8');}catch{}
  const result=assessV2PublishedIdentity({
   body,httpCode:Number(code),curlExit:Number(exit),elapsedMs:Number(elapsed)*1000
  });
  const row={checkedAtUtc:new Date().toISOString(),...result};
  writeFileSync(outPath,JSON.stringify(row,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify(row));
  if(process.env.GITHUB_STEP_SUMMARY){
   appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '### Phase5 V2 independent public-only receiver check (NOT scientific GO)\n'+
    '- Status: **'+row.status+'**\n'+
    '- HTTP '+row.hostedHttpStatus+'; claim '+(row.claimedPublishedGitHead??'UNAVAILABLE')+
    '; reviewed SOURCE PIN '+EXPECTED+'\n'+
    '- Signed nonempty POST/durable original and STOP: **NOT VERIFIED**\n'+
    '- Provider calls/DB writes: **0**\n');
  }
 }catch{
  console.error('HOLD_P5_V2_PUBLIC_OBSERVER_NO_RELEASE_AUTHORITY');
  process.exitCode=2;
 }
}
