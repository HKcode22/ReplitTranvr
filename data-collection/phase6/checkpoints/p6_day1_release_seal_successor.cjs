"use strict";
/* G12 owner X25519 sealed source-code-only successor: source existing 31 repo secrets in runner
 * memory ONLY. Prove exact historical bundle, run original pure validator on
 * old and new policies, and seal JUST 11 changed secret values to an owner-held
 * ephemeral X25519 public key. Never print or persist secret plaintext. */
const fs=require("node:fs"),path=require("node:path");
const {createHash,createPublicKey,generateKeyPairSync,diffieHellman,randomBytes,
       hkdfSync,createCipheriv}=require("node:crypto");
const hold=s=>{throw Error("HOLD_P6_G8_SEAL_"+s)};
const need=(b,s)=>{if(!b)hold(s)};
const sha=x=>createHash("sha256").update(x).digest("hex");
const hash=x=>sha(JSON.stringify(x));
const old="c8e065d665ccacb6d2575070e94c5500b7583044";
const pin=process.env.P6_DAY1_SUCCESSOR_TARGET_SHA;
const prior="7dc679d27f7d9b3db7d011f1cb53a6b960513a88e5de6c720192ca8b35b01f61";
const tail="2026-12-29T04:00:00.000Z";
const names=[
"V39_P5_APPROVED_CODE_SHA","P6_NONPAID_SOURCE_APPROVED_MAIN_SHA","V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA",
"P5_CD_GH_PRE_APPROVED_CODE_SHA","V39_P5_POST_APPROVED_CODE_SHA","P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA",
"V39_P5_QUEUE_APPROVED_CODE_SHA","V39_P5_MANIFEST_SHA256","V39_P5_CALENDAR_HASH","V39_P5_CONFIG_HASH",
"V39_P5_FRAME_HASH","V39_P5_RELEASE_SHA256","V39_P5_RIGHTS_SHA256","V39_P5_PROVIDER_CONTRACT_SHA256",
"P6_INERT_STAGE_INPUT_JSON","P6_INERT_STAGE_INPUT_SHA256","P6_INERT_COST_ENVELOPE_SHA256",
"P6_PRIVATE_POST_OUTCOME_TAIL_HOURS","V39_P5_POST_PROVIDER_CONTRACT_SHA256","V39_P5_POST_CATEGORY_BUDGET_SHA256",
"V39_P5_POST_PRICE_SHA256","P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64","P6_NONPAID_DAILY_POLICY_BASE64",
"P6_NONPAID_SIGNING_POLICY_BASE64","P6_NONPAID_TRANSPORT_TRUST_BASE64","P6_PRIVATE_POST_REVIEWER_TRUST_BASE64",
"P6_NATIVE_POST_POLICY_BASE64","P6_NONPAID_DAILY_POLICY_SHA256","P6_NONPAID_SIGNING_POLICY_SHA256",
"P6_NONPAID_TRANSPORT_TRUST_SHA256","P6_NATIVE_POST_POLICY_SHA256"];
const policyNames=names.slice(21,27);
const postB="P6_PHASE7_POST_PRESERVATION_POLICY_BASE64",postH="P6_PHASE7_POST_PRESERVATION_POLICY_SHA256";
const e=process.env;
need(e.GITHUB_ACTIONS==="true"&&e.GITHUB_REPOSITORY==="HKcode22/ReplitTranvr"&&
 e.GITHUB_REF==="refs/heads/phase6/20261122-g8-502-readback-evidence"&&
 e.GITHUB_EVENT_NAME==="push"&&e.GITHUB_RUN_ATTEMPT==="1"&&e.GITHUB_ACTOR==="HKcode22"&&
 e.ADB_AUTO_COLLECT==="0"&&e.V39_PHASE6_PROCESS_ARMED==="0"&&e.V39_PHASE6_OWNER_APPROVED==="0"&&
 !e.AERODATABOX_API_KEY&&!e.RAPIDAPI_KEY&&!e.DATABASE_URL&&names.length===31&&
 new Set(names).size===31&&["OWNER_REVIEWED_ENCRYPTED_G12_CODE_REPIN_SUCCESSOR_NO_PAID_GO","OWNER_READONLY_POLICY_SUCCESSOR_PREFLIGHT_NO_GO"].includes(e.P6_G8_OWNER_SEAL_TRIGGER),
 "HOST_AND_STOP_SCOPE");
const v=Object.fromEntries(names.map(k=>[k,e[k]]));
need(Object.values(v).every(x=>typeof x==="string"&&x.length>0&&Buffer.byteLength(x)<60000),
 "MISSING_STATIC_SECRET");
need(/^[a-f0-9]{40}$/.test(pin??"")&&pin!==old&&names.slice(0,7).every(k=>v[k]===old),"EXACT_C8_OUTER_PINS");
const original={...v};
need(hash(original)===prior,"HISTORICAL_31_VALUE_DIGEST");
const b64=k=>{
 const b=v[k];need(typeof b==="string"&&/^[A-Za-z0-9+/]+={0,2}$/.test(b),"BASE64_"+k);
 const raw=Buffer.from(b,"base64");need(raw.toString("base64")===b,"CANONICAL_BASE64_"+k);
 let x;try{x=JSON.parse(raw.toString("utf8"));}catch{hold("JSON_"+k)}
 need(JSON.stringify(x)===raw.toString("utf8"),"CANONICAL_JSON_"+k);
 return {raw,x};
};
const six=Object.fromEntries(policyNames.map(k=>[k,b64(k)]));
for(const base of ["P6_NONPAID_DAILY_POLICY","P6_NONPAID_SIGNING_POLICY","P6_NONPAID_TRANSPORT_TRUST","P6_NATIVE_POST_POLICY"]){
 const raw=six[base+"_BASE64"].raw;
 need(sha(raw)===v[base+"_SHA256"],"EXISTING_POLICY_DIGEST_"+base);
}
const postRaw=e[postB],postHash=e[postH];
need(typeof postRaw==="string"&&typeof postHash==="string"&&postHash.length===64,
 "POST_PRESERVATION_MISSING");
const post=(()=>{
 const raw=Buffer.from(postRaw,"base64");
 need(raw.toString("base64")===postRaw&&sha(raw)===postHash,"OLD_POST_PRESERVATION_DIGEST");
 const x=JSON.parse(raw.toString("utf8"));
 need(JSON.stringify(x)===raw.toString("utf8")&&x.schema==="v39.phase7.independent-post-settlement-policy.v1"&&
  x.nativePostPolicySha256===v.P6_NATIVE_POST_POLICY_SHA256&&
  x.manifestSha256===v.V39_P5_MANIFEST_SHA256&&
  x.rightsSha256===v.V39_P5_RIGHTS_SHA256&&
  x.unverifiedLabelDisposition==="CENSOR_AFTER_REVIEWED_POST_OBSERVATION"&&
  x.independentBoundedSettlementApproved===true&&
  Date.parse(x.validFromUtc)<=Date.now()&&Date.parse(x.validUntilUtc)>Date.now(),
  "POST_PRESERVATION_SCOPE");
 return x;
})();
const p=Object.fromEntries(policyNames.map(k=>[k,six[k].x]));
const [source,daily,signing,transport,postTrust,native]=policyNames.map(k=>p[k]);
need(source.reviewedCodeSha===old&&daily.approvedCodeSha===old&&
 daily.nativeLaterReview?.dayAppendPolicy?.approvedCodeSha===old&&
 signing.approvedCodeSha===old&&transport.reviewedMainSha===old&&native.reviewedCodeSha===old,
 "EXACT_OLD_EMBEDDED_PINS");
const publicFingerprint=pem=>{
 const k=createPublicKey(pem);
 need(k.asymmetricKeyType==="ed25519","SIGNER_TYPE");
 return sha(k.export({type:"spki",format:"der"}));
};
const ops={hash,publicFingerprint,byteLength:Buffer.byteLength};
const validator=require(e.P6_G8_PINNED_VALIDATOR_PATH);
need(typeof validator.validateFinalPolicies==="function","VALIDATOR_IDENTITY");
const ctx={
 codeSha:old,manifestSha256:v.V39_P5_MANIFEST_SHA256,
 calendarSha256:v.V39_P5_CALENDAR_HASH,releaseSha256:v.V39_P5_RELEASE_SHA256,
 rightsSha256:v.V39_P5_RIGHTS_SHA256,configSha256:v.V39_P5_CONFIG_HASH,
 frameSha256:v.V39_P5_FRAME_HASH,providerContractSha256:v.V39_P5_PROVIDER_CONTRACT_SHA256,
 costSha256:v.P6_INERT_COST_ENVELOPE_SHA256,dayPlanSha256s:daily.dayPlanSha256s,
 airportTimezoneCatalogSha256:"4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534",
 dailyRestCeiling:1900,cycleRestCeiling:49468,minimumProtectedFloor:1000,
 maxQueriesPerDay:288,nowUtc:new Date().toISOString(),outcomeTailUtc:tail
};
validator.validateFinalPolicies(p,ctx,ops);
const clone=x=>JSON.parse(JSON.stringify(x));
const w=Object.fromEntries(policyNames.map(k=>[k,clone(p[k])]));
const [s2,d2,g2,t2,pt2,n2]=policyNames.map(k=>w[k]);
s2.reviewedCodeSha=pin;
d2.approvedCodeSha=pin;
d2.nativeLaterReview.dayAppendPolicy.approvedCodeSha=pin;
g2.approvedCodeSha=pin;
t2.reviewedMainSha=pin;
t2.dailyPolicySha256=hash(d2);
t2.signingPolicySha256=hash(g2);
n2.reviewedCodeSha=pin;
need(JSON.stringify(pt2)===JSON.stringify(postTrust),"REVIEWER_TRUST_MODIFIED");
validator.validateFinalPolicies(w,{...ctx,codeSha:pin},ops);

// Structural delta proof: only the eight explicitly allowed inner policy leaves.
const delta=(a,b,at="")=>{
 if(JSON.stringify(a)===JSON.stringify(b))return [];
 if(a&&b&&typeof a==="object"&&typeof b==="object"&&!Array.isArray(a)&&!Array.isArray(b)&&
    JSON.stringify(Object.keys(a))===JSON.stringify(Object.keys(b)))
   return Object.keys(a).flatMap(k=>delta(a[k],b[k],at?at+"."+k:k));
 return [at];
};
const orig=Object.fromEntries(policyNames.map(k=>[k,p[k]]));
const actualLeaves=delta(orig,w).sort();
const expectedLeaves=[
 policyNames[0]+".reviewedCodeSha",
 policyNames[1]+".approvedCodeSha",
 policyNames[1]+".nativeLaterReview.dayAppendPolicy.approvedCodeSha",
 policyNames[2]+".approvedCodeSha",
 policyNames[3]+".reviewedMainSha",
 policyNames[3]+".dailyPolicySha256",
 policyNames[3]+".signingPolicySha256",
 policyNames[5]+".reviewedCodeSha"].sort();
need(JSON.stringify(actualLeaves)===JSON.stringify(expectedLeaves),"UNEXPECTED_POLICY_LEAF_DELTA");
const successor={...v};
const outerChanged=names.slice(0,7).filter(k=>v[k]!==pin);
need(outerChanged.length>=1&&outerChanged.every(k=>v[k]===old),"UNREVIEWED_OUTER_CODE_PINS");
for(const k of names.slice(0,7))successor[k]=pin;
for(const k of policyNames)successor[k]=Buffer.from(JSON.stringify(w[k])).toString("base64");
for(const k of names.slice(27)){
 const src=k.replace(/_SHA256$/,"_BASE64");
 successor[k]=sha(Buffer.from(successor[src],"base64"));
}
const targetPost={...post,nativePostPolicySha256:successor.P6_NATIVE_POST_POLICY_SHA256};
need(delta(post,targetPost).join(",")==="nativePostPolicySha256","POST_PRESERVATION_NONPIN_MUTATION");
const changes=Object.fromEntries(names.filter(k=>successor[k]!==v[k]).map(k=>[k,successor[k]]));
const expectedChanges=[
 ...outerChanged,
 ...policyNames.filter(k=>k!=="P6_PRIVATE_POST_REVIEWER_TRUST_BASE64"),
 ...names.slice(27)].sort();
need(JSON.stringify(Object.keys(changes).sort())===JSON.stringify(expectedChanges)&&
 Object.keys(changes).length===expectedChanges.length,"EXACT_EXPECTED_CODE_AND_LINK_UPDATES");
changes[postB]=Buffer.from(JSON.stringify(targetPost)).toString("base64");
changes[postH]=hash(targetPost);
need(Object.keys(changes).length===expectedChanges.length+2,"EXACT_STATIC_AND_POST_LINK_SECRET_WRITES");
const currentStaticDigest=hash(successor);

if(e.P6_G8_OWNER_SEAL_TRIGGER==="OWNER_READONLY_POLICY_SUCCESSOR_PREFLIGHT_NO_GO"){
 console.log(JSON.stringify({status:"P6_C8_FULL_ORIGINAL_AND_SUCCESSOR_VALIDATOR_PASS_ONLY_NO_GO",
 historical31DigestExact:true,originalAndCurrentFullValidatorPassed:true,
 expectedSecretChanges:Object.keys(changes).length,
 originalDayPlanSha256sUnchanged:JSON.stringify(daily.dayPlanSha256s)===JSON.stringify(d2.dayPlanSha256s),
 unchangedScientificBudgetAndRightsFieldsEnforcedByFullValidator:true,
 repoSecretsNeverModified:true,providerCalls:0,databaseWrites:0,phase6PaidGo:false,
 sourceSuccessorNotSignedOrInstalled:true}));
 process.exit(0);
}
const reqPath="data-collection/phase6/checkpoints/p6_day1_release_owner_request.json";
let req;try{req=JSON.parse(fs.readFileSync(reqPath,"utf8"));}catch{hold("EXACT_OWNER_REQUEST_ABSENT")}
need(req.schema==="v39.phase6.day1.owner-code-repin-seal-request.v1"&&req.mainSha===pin&&
 req.historicalDigest===prior&&/^[a-f0-9]{32}$/.test(req.nonce)&&
 typeof req.recipientPublicSpkiBase64==="string"&&
 Date.parse(req.requestedAtUtc)<=Date.now()&&Date.now()-Date.parse(req.requestedAtUtc)<30*60000,
 "OWNER_REQUEST_SCOPE");
const recipientRaw=Buffer.from(req.recipientPublicSpkiBase64,"base64");
need(recipientRaw.toString("base64")===req.recipientPublicSpkiBase64,"RECIPIENT_BASE64");
const recipient=createPublicKey({key:recipientRaw,format:"der",type:"spki"});
need(recipient.asymmetricKeyType==="x25519"&&recipientRaw.byteLength<=256,"RECIPIENT_X25519");
const {publicKey:epub,privateKey:epriv}=generateKeyPairSync("x25519");
const ePubRaw=epub.export({format:"der",type:"spki"});
const shared=diffieHellman({privateKey:epriv,publicKey:recipient});
const salt=randomBytes(32),iv=randomBytes(12);
const aadObj={schema:"v39.phase6.day1.policy-code-repin-envelope.v1",mainSha:pin,
 historicalDigest:prior,successorStaticDigest:currentStaticDigest,ownerRequestNonce:req.nonce,
 recipientSpkiSha256:sha(recipientRaw)};
const aad=Buffer.from(JSON.stringify(aadObj),"utf8");
const info=Buffer.from("Travnr Phase6 Day1 x25519-aes256gcm source-code-repin successor v1","utf8");
const key=Buffer.from(hkdfSync("sha256",shared,salt,info,32));
const cipher=createCipheriv("aes-256-gcm",key,iv,{authTagLength:16});
cipher.setAAD(aad);
const sealed={changes,receipt:{status:"P6_DAY1_CODE_ONLY_LINKED_SOURCE_SUCCESSOR_VALIDATED_NO_PAID_GO",
 mainSha:pin,priorStaticSha256:prior,successorStaticSha256:currentStaticDigest,
 successorPostPolicySha256:changes[postH],changesNames:expectedChanges.concat([postB,postH]).sort(),
 policyCount:6,phase6PaidGo:false,sourceAuthReenabled:false,dbWrites:0,providerCalls:0}};
const raw=Buffer.from(JSON.stringify(sealed),"utf8");
const ciphertext=Buffer.concat([cipher.update(raw),cipher.final()]);
const envelope={...aadObj,alg:"X25519-HKDF-SHA256-AES-256-GCM",
 ephemeralPublicSpkiBase64:ePubRaw.toString("base64"),
 saltBase64:salt.toString("base64"),nonceBase64:iv.toString("base64"),
 authTagBase64:cipher.getAuthTag().toString("base64"),
 ciphertextBase64:ciphertext.toString("base64")};
const outFile=path.join(e.RUNNER_TEMP||"","p6-day1-owner-sealed-code-repin-successor.json");
need(path.isAbsolute(outFile)&&fs.existsSync(e.RUNNER_TEMP),"OUTPUT_SCOPE");
fs.writeFileSync(outFile,JSON.stringify(envelope),{mode:0o600,flag:"wx"});
console.log(JSON.stringify({status:"P6_G12_OWNER_SEALED_EXACT_LINKED_CODE_SUCCESSOR_CREATED_NO_GO",targetMain:pin,
 historical31DigestExact:true,newStaticSha256:currentStaticDigest,
 linkedNewPostPolicySha256:changes[postH],changesCount:Object.keys(changes).length,outerAlreadyApprovedCodeNames:7-outerChanged.length,
 canonicalValidatorOldAndNew:true,secretValuesPrinted:false,
 recipientSpkiSha256:sha(recipientRaw),providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
