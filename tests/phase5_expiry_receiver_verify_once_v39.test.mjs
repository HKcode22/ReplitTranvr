import assert from "node:assert/strict";
import test from "node:test";
import {admitExpiryReceiverVerify,verifyExpiryReceiverOnce} from "../scripts/v39_phase5_expiry_receiver_verify_once_v39.mjs";
const sha="a".repeat(40),source="b".repeat(40),token="c".repeat(64);
const env={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_EVENT_NAME:"workflow_dispatch",
 GITHUB_REF:"refs/heads/main",GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:sha,P5_EXPIRY_RECEIVER_APPROVED_MAIN_SHA:sha,
 P5_EXPIRY_RECEIVER_DEPLOYED_SOURCE_SHA:source,P5_EXPIRY_RECEIVER_APPROVED_DEPLOYED_SHA:source,
 P5_EXPIRY_RECEIVER_AUTH_TOKEN:token,P5_EXPIRY_RECEIVER_CONFIRM:"VERIFY_PUBLISHED_EXPIRY_TRANSPORT_NO_PROVIDER_NO_DELETE",
 ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0"};
const health={schema:"v39.phase2f-workspace-runtime.v1",status:"PASS",git_head:source,prepaid_route_registered:true,
 provider_mutation:false,runtime_owner_mode:"replit-published-deployment",managed_replit_workflow:false,
 published_deployment:true,runtime_durability_class:"autoscale"};
const receipt={status:"SCOPED_RUNTIME_VERIFY_ONLY_NO_WRITES",mode:"VERIFY_ONLY",reviewedSourceSha:source,
 providerCalls:0,objectDownloads:0,distinctDbActorsVerified:true,separateStorageReadRequests:true,
 independentStorageIamVerified:false,backupRetentionVerified:false,phase6PaidGo:false,databaseWrites:0,objectDeletions:0};
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json"}});
test("manual exact main and approved receiver only, no provider or DB credentials, no reruns",()=>{
 assert.deepEqual(admitExpiryReceiverVerify(env),{source,token});
 for(const patch of [{GITHUB_RUN_ATTEMPT:"2"},{GITHUB_EVENT_NAME:"pull_request"},{GITHUB_REF:"refs/heads/dev"},
  {P5_EXPIRY_RECEIVER_APPROVED_DEPLOYED_SHA:sha},{P5_EXPIRY_RECEIVER_AUTH_TOKEN:"bad"},
  {P5_EXPIRY_RECEIVER_APPROVED_MAIN_SHA:source},{DATABASE_URL:"fictional"},{AERODATABOX_API_KEY:"fictional"},
  {P5_RECURRING_EXPIRY_READER_URL:"fictional"},{NODE_TLS_REJECT_UNAUTHORIZED:"0"},{V39_PHASE6_PROCESS_ARMED:"1"}])
  assert.throws(()=>admitExpiryReceiverVerify({...env,...patch}),/ADMISSION/);
});
test("one fixed public GET and one fixed read-only POST, no token on GET or raw token in receipt",async()=>{
 const calls=[];
 const result=await verifyExpiryReceiverOnce({source,token},async(url,options)=>{
  calls.push({url,options});return json(calls.length===1?health:receipt);
 });
 assert.equal(calls.length,2);
 assert.equal(calls[0].url,"https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime");
 assert.equal(calls[0].options.headers.authorization,undefined);
 assert.equal(calls[1].url,"https://replit-tranvr--hk84164.replit.app/__v39/phase5/recurring-expiry");
 assert.equal(calls[1].options.headers.authorization,"Bearer "+token);
 assert.equal(calls[1].options.headers["x-p5-expiry-mode"],"VERIFY_ONLY");
 assert.ok(calls.every(c=>c.options.redirect==="error"));
 assert.equal(result.status,"P5_PUBLISHED_EXPIRY_VERIFY_ONLY_PASS");
 assert.equal(JSON.stringify(result).includes(token),false);
});
test("mismatched public identity never sends token or POST",async()=>{
 let calls=0;
 await assert.rejects(verifyExpiryReceiverOnce({source,token},async()=>{calls++;return json({...health,git_head:sha});}),/PUBLIC_SOURCE_IDENTITY/);
 assert.equal(calls,1);
});
test("unknown, false, extra-field or failed POST never retries or prints raw response",async()=>{
 for(const response of [()=>{throw Error("fictional secret");},()=>json({...receipt,objectDeletions:1}),
  ()=>json({...receipt,extra:"fictional"}),()=>json({status:"UNKNOWN"},503)]){
  let calls=0;
  await assert.rejects(verifyExpiryReceiverOnce({source,token},async()=>++calls===1?json(health):response()),/HOLD_P5_EXPIRY_RECEIVER_VERIFY_/);
  assert.equal(calls,2);
 }
});
test("unbounded body, wrong content type and redirect evidence refused before token send",async()=>{
 for(const response of [new Response("x".repeat(16385),{headers:{"content-type":"application/json"}}),
  new Response("{}",{headers:{"content-type":"text/plain"}}),
  new Response("",{status:302,headers:{location:"https://other.invalid"}})]){
  let calls=0;
  await assert.rejects(verifyExpiryReceiverOnce({source,token},async()=>{calls++;return response;}),/HOLD_P5_EXPIRY_RECEIVER_VERIFY_/);
  assert.equal(calls,1);
 }
});
