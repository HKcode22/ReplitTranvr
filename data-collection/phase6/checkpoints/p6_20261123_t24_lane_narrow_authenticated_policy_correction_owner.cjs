"use strict";
/* Narrow Nov23 T24 lane policy correction, reuse authenticated G12 owner successor: verify existing encrypted artifact first,
 * exact owner request, strict old+current validator attestation, expected
 * changed secret names, source-day preservation and canonical digest linkage.
 * --verify: no writes. --apply: only exactly 17 repo policy/code secret updates, after paid STOP=0 at both scopes. Never paid GO. */
const fs=require("node:fs");
const {createHash,createPublicKey,createPrivateKey,diffieHellman,
 hkdfSync,createDecipheriv}=require("node:crypto");
const sha=b=>createHash("sha256").update(b).digest("hex");
const hash=x=>sha(Buffer.from(JSON.stringify(x),"utf8"));
const hold=s=>{throw Error("HOLD_P6_G12_OWNER_CIPHERTEXT_"+s)};
const need=(b,s)=>{if(!b)hold(s)};
const pin="c8e065d665ccacb6d2575070e94c5500b7583044";
const previous="b432eb9a5bac7bc3c4537249e75ec7df41e8727c";
const historical="3bb538896d2023ed1ff54b1b0d914a8a134299eac3a5068827e93d82400864b0";
const expectedCurrent="7dc679d27f7d9b3db7d011f1cb53a6b960513a88e5de6c720192ca8b35b01f61";
const outer=[
"V39_P5_APPROVED_CODE_SHA","P6_NONPAID_SOURCE_APPROVED_MAIN_SHA",
"V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA","P5_CD_GH_PRE_APPROVED_CODE_SHA",
"P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA","V39_P5_QUEUE_APPROVED_CODE_SHA"];
const inner=["P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64","P6_NONPAID_DAILY_POLICY_BASE64",
"P6_NONPAID_SIGNING_POLICY_BASE64","P6_NONPAID_TRANSPORT_TRUST_BASE64",
"P6_NATIVE_POST_POLICY_BASE64","P6_NONPAID_DAILY_POLICY_SHA256",
"P6_NONPAID_SIGNING_POLICY_SHA256","P6_NONPAID_TRANSPORT_TRUST_SHA256",
"P6_NATIVE_POST_POLICY_SHA256","P6_PHASE7_POST_PRESERVATION_POLICY_BASE64",
"P6_PHASE7_POST_PRESERVATION_POLICY_SHA256"];
const expectedNames=[...outer,...inner].sort();
const [mode,keyFile,envelopeFile,requestFile]=process.argv.slice(2);
need(process.argv.length===6&&["--verify","--repair-t24-lane"].includes(mode)&&[keyFile,envelopeFile,requestFile].every(x=>typeof x==="string"&&x.startsWith("/")),"ARGS");
const st=fs.lstatSync(keyFile);
need(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&st.uid===process.getuid()&&(st.mode&0o077)===0&&st.size>0&&st.size<10000,"OWNER_PRIVATE_KEY");
const priv=createPrivateKey(fs.readFileSync(keyFile));
need(priv.asymmetricKeyType==="x25519","KEY_TYPE");
const spki=createPublicKey(priv).export({format:"der",type:"spki"});
const request=JSON.parse(fs.readFileSync(requestFile,"utf8"));
const e=JSON.parse(fs.readFileSync(envelopeFile,"utf8"));
need(request.schema==="v39.phase6.g12.owner-code-repin-seal-request.v1"&&request.mainSha===pin&&
 request.historicalDigest===historical&&request.recipientPublicSpkiBase64===spki.toString("base64")&&
 e.schema==="v39.phase6.g12.policy-code-repin-envelope.v1"&&e.alg==="X25519-HKDF-SHA256-AES-256-GCM"&&
 e.mainSha===pin&&e.historicalDigest===historical&&e.ownerRequestNonce===request.nonce&&
 e.recipientSpkiSha256===sha(spki)&&e.successorStaticDigest===expectedCurrent,"REQUEST_OR_ENVELOPE_SCOPE");
const decode=(k,l)=>{
 const s=e[k];need(typeof s==="string"&&/^[A-Za-z0-9+/]+={0,2}$/.test(s),"BASE64_"+k);
 const b=Buffer.from(s,"base64");
 need(b.toString("base64")===s&&(l===null||b.length===l),"BASE64_LENGTH_"+k);
 return b;
};
const epk=createPublicKey({key:decode("ephemeralPublicSpkiBase64",null),format:"der",type:"spki"});
need(epk.asymmetricKeyType==="x25519","EPHEMERAL_KEY_TYPE");
const shared=diffieHellman({privateKey:priv,publicKey:epk});
const key=Buffer.from(hkdfSync("sha256",shared,decode("saltBase64",32),
 Buffer.from("Travnr Phase6 G12 c8 x25519-aes256gcm source-code-repin successor v1"),32));
const aad=Buffer.from(JSON.stringify({
 schema:e.schema,mainSha:e.mainSha,historicalDigest:e.historicalDigest,
 successorStaticDigest:e.successorStaticDigest,ownerRequestNonce:e.ownerRequestNonce,
 recipientSpkiSha256:e.recipientSpkiSha256}),"utf8");
let payload;
try{
 const cipher=createDecipheriv("aes-256-gcm",key,decode("nonceBase64",12),{authTagLength:16});
 cipher.setAAD(aad);cipher.setAuthTag(decode("authTagBase64",16));
 payload=JSON.parse(Buffer.concat([cipher.update(decode("ciphertextBase64",null)),
 cipher.final()]).toString("utf8"));
}catch{hold("AEAD_AUTHENTICATION_FAILED")}
const changes=payload?.changes,receipt=payload?.receipt;
need(changes&&typeof changes==="object"&&!Array.isArray(changes)&&
 JSON.stringify(Object.keys(changes).sort())===JSON.stringify(expectedNames)&&
 Object.values(changes).every(x=>typeof x==="string"&&x.length>0&&Buffer.byteLength(x)<48000),"CHANGES_SCOPE");
need(receipt?.status==="P6_G12_CODE_ONLY_LINKED_SOURCE_SUCCESSOR_VALIDATED_NO_PAID_GO"&&
 receipt.mainSha===pin&&receipt.priorStaticSha256===historical&&
 receipt.successorStaticSha256===expectedCurrent&&
 receipt.successorPostPolicySha256===changes.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256&&
 JSON.stringify(receipt.changesNames)===JSON.stringify(expectedNames)&&
 receipt.phase6PaidGo===false&&receipt.sourceAuthReenabled===false&&
 receipt.dbWrites===0&&receipt.providerCalls===0&&receipt.policyCount===6,
 "CREATOR_FULL_VALIDATOR_ATTESTATION");
for(const name of outer)need(changes[name]===pin,"OUTER_SOURCE_SHA_"+name);
function jsonPolicy(name){
 const value=changes[name];
 need(typeof value==="string"&&/^[A-Za-z0-9+/]+={0,2}$/.test(value),"POLICY_ENCODING_"+name);
 const raw=Buffer.from(value,"base64");
 need(raw.toString("base64")===value,"POLICY_BASE64_"+name);
 const text=raw.toString("utf8");
 const obj=JSON.parse(text);
 need(JSON.stringify(obj)===text,"POLICY_CANONICAL_"+name);
 return {raw,obj};
}
const source=jsonPolicy("P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64").obj;
const daily=jsonPolicy("P6_NONPAID_DAILY_POLICY_BASE64").obj;
const signing=jsonPolicy("P6_NONPAID_SIGNING_POLICY_BASE64").obj;
const transport=jsonPolicy("P6_NONPAID_TRANSPORT_TRUST_BASE64").obj;
const native=jsonPolicy("P6_NATIVE_POST_POLICY_BASE64").obj;
const p7=jsonPolicy("P6_PHASE7_POST_PRESERVATION_POLICY_BASE64").obj;
for(const base of ["P6_NONPAID_DAILY_POLICY","P6_NONPAID_SIGNING_POLICY","P6_NONPAID_TRANSPORT_TRUST","P6_NATIVE_POST_POLICY"]){
 const blob=jsonPolicy(base+"_BASE64");
 need(sha(blob.raw)===changes[base+"_SHA256"],"SHA_LINK_"+base);
}
need(sha(jsonPolicy("P6_PHASE7_POST_PRESERVATION_POLICY_BASE64").raw)===
 changes.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256,"SHA_LINK_P7");
need(source.reviewedCodeSha===pin&&daily.approvedCodeSha===pin&&
 daily.nativeLaterReview?.dayAppendPolicy?.approvedCodeSha===pin&&
 signing.approvedCodeSha===pin&&transport.reviewedMainSha===pin&&
 native.reviewedCodeSha===pin&&
 transport.dailyPolicySha256===hash(daily)&&
 transport.signingPolicySha256===hash(signing)&&
 p7.nativePostPolicySha256===changes.P6_NATIVE_POST_POLICY_SHA256,
 "LINKED_POLICY_AUTHORITIES");
need(daily.dayPlanSha256s?.length===31&&daily.delegatedDailyPacketProductionApproved===true&&
 Date.parse(daily.validUntilUtc)>Date.parse(daily.validFromUtc)&&
 daily.dayPlanSha256s.every((x,i)=>x?.runDayIndex===i+1&&/^[a-f0-9]{64}$/.test(x.sha256)),"SIGNED_DAY_PLAN_SCOPE");

/* No new policy or key generation. Explicitly approve one bounded lane
 * initially (original code allows 1-4); science, sampling, budget and
 * identities unchanged. Reuse original canonical authenticated bytes. */
const oldLane=daily.nativeLaterReview?.maximumT24ExecutionLanes;
need(daily.nativeLaterReview?.approved===true&&daily.nativeLaterReview.nativeT24ReviewApproved===true&&
 daily.nativeLaterReview.independentT24WitnessProtocolReviewed===true&&
 !(Number.isSafeInteger(oldLane)&&oldLane>=1&&oldLane<=4),"ORIGINAL_INVALID_T24_LANE_FIELD");
const fixed=JSON.parse(JSON.stringify(daily));
fixed.nativeLaterReview.maximumT24ExecutionLanes=1;
const fixedTransport={...transport,dailyPolicySha256:hash(fixed)};
const verify=JSON.parse(JSON.stringify(fixed));
if(oldLane===undefined)delete verify.nativeLaterReview.maximumT24ExecutionLanes;
else verify.nativeLaterReview.maximumT24ExecutionLanes=oldLane;
need(JSON.stringify(verify)===JSON.stringify(daily)&&
 JSON.stringify({...fixedTransport,dailyPolicySha256:transport.dailyPolicySha256})===JSON.stringify(transport),"ONLY_LANE_AND_TRANSPORT_LINK_CHANGED");
const repair={
 P6_NONPAID_DAILY_POLICY_BASE64:Buffer.from(JSON.stringify(fixed)).toString("base64"),
 P6_NONPAID_DAILY_POLICY_SHA256:hash(fixed),
 P6_NONPAID_TRANSPORT_TRUST_BASE64:Buffer.from(JSON.stringify(fixedTransport)).toString("base64"),
 P6_NONPAID_TRANSPORT_TRUST_SHA256:hash(fixedTransport)
};
need(Object.keys(repair).every(k=>repair[k]!==changes[k])&&Object.values(repair).every(v=>Buffer.byteLength(v)<48000),"EXACT_FOUR_LINKED_VALUES");
console.log(JSON.stringify({status:"P6_AUTHENTICATED_ONE_LANE_POLICY_CORRECTION_VERIFIED_NO_WRITE",previousLane:oldLane===undefined?"ABSENT":Number.isSafeInteger(oldLane)&&oldLane>=0&&oldLane<=100?oldLane:"INVALID",newLane:1,priorDailySha256:changes.P6_NONPAID_DAILY_POLICY_SHA256,newDailySha256:repair.P6_NONPAID_DAILY_POLICY_SHA256,newTransportSha256:repair.P6_NONPAID_TRANSPORT_TRUST_SHA256,unchangedCalendarAndCode:true,secretValuesPrinted:false,providerCalls:0,databaseWrites:0}));
if(mode==="--verify")process.exit(0);
const {execFileSync}=require("node:child_process"),path=require("node:path");
const R="HKcode22/ReplitTranvr",L="HKcode22/TravnrClockRelay",E="phase6-protected-runtime";
const gh=(args,input)=>{try{return execFileSync("gh",args,{input,encoding:"utf8",timeout:30000,maxBuffer:3000000,stdio:["pipe","pipe","pipe"]}).trim();}catch{hold("OWNER_GH_UNKNOWN_NO_REPLAY")}};
need(gh(["api","user","--jq",".login"])==="HKcode22","OWNER");
need(gh(["api","repos/"+R+"/git/ref/heads/main","--jq",".object.sha"])===pin,"MAIN_DRIFT");
need(gh(["api","repos/"+L+"/git/ref/heads/main","--jq",".object.sha"])==="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed","RELAY_DRIFT");
const variable=(r,k)=>gh(["variable","get",k,"-R",r]);
need(variable(L,"TRAVNR_RELAY_ROLLING_ENABLED")==="0"&&variable(L,"TRAVNR_RELAY_PRIMARY_ENABLED")==="1"&&
 variable(R,"P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED")==="false"&&variable(R,"P6_PRIVATE_POST_PARENT_ENABLED")==="false"&&
 variable(R,"P6_NATIVE_POST_PRODUCER_ENABLED")==="0","PAID_ROUTES_MUST_STAY_PAUSED");
const repoNames=new Set(gh(["api","repos/"+R+"/actions/secrets?per_page=100","--paginate","--jq",".secrets[].name"]).split("\n"));
const envNames=new Set(gh(["api","repos/"+R+"/environments/"+E+"/secrets?per_page=100","--paginate","--jq",".secrets[].name"]).split("\n"));
need(Object.keys(repair).every(k=>repoNames.has(k)&&!envNames.has(k)),"FOUR_POLICY_NAMES_MUST_BE_REPO_ONLY");
const marker=path.join(path.dirname(keyFile),"p6-t24-lane-correction.started");
need(!fs.existsSync(marker),"ALREADY_ATTEMPTED_RECONCILE_NO_REPLAY");
fs.writeFileSync(marker,JSON.stringify({priorDaily:changes.P6_NONPAID_DAILY_POLICY_SHA256,newDaily:repair.P6_NONPAID_DAILY_POLICY_SHA256,newTransport:repair.P6_NONPAID_TRANSPORT_TRUST_SHA256}),{flag:"wx",mode:0o600});
for(const [name,value] of Object.entries(repair)){
 gh(["secret","set",name,"-R",R],Buffer.from(value));
 console.log("P6_NARROW_POLICY_WRITE_ACK "+name);
}
console.log("P6_T24_ONE_LANE_POLICY_AND_LINKED_TRANSPORT_INSTALLED_PAID_ROUTES_PAUSED");
