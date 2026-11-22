"use strict";
/* RESUME ONLY using the already-made owner ciphertext and private key. Decrypt a GitHub Actions artifact sealed to a local
 * ephemeral X25519 private key. --verify writes nothing. --apply updates only
 * exact 11 approved repository secrets, disarming paid switches before writes.
 * The decrypted values never print, become command arguments, or persist
 * to plaintext files. On unknown partial writes, STOP; do not blindly replay. */
const fs=require("node:fs"),path=require("node:path");
const {createHash,createPublicKey,createPrivateKey,diffieHellman,
       hkdfSync,createDecipheriv}=require("node:crypto");
const {execFileSync}=require("node:child_process");
const hold=s=>{throw Error("HOLD_P6_G8_OWNER_SEALED_"+s)};
const need=(b,s)=>{if(!b)hold(s)};
const sha=b=>createHash("sha256").update(b).digest("hex"),hash=x=>sha(JSON.stringify(x));
const repo="HKcode22/ReplitTranvr";
const pin="b432eb9a5bac7bc3c4537249e75ec7df41e8727c";
const prior="7e07047d7173cbcf84e966ab869d66477efef36df38c83c58325396f31b83728";
const expectedStatic="3bb538896d2023ed1ff54b1b0d914a8a134299eac3a5068827e93d82400864b0";
const expectedPost="0916015a99b379d4ff703f59530794577c5c5ab2404e6cdfc1112921f165b54d";
const keys=[
"P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64","P6_NONPAID_DAILY_POLICY_BASE64",
"P6_NONPAID_SIGNING_POLICY_BASE64","P6_NONPAID_TRANSPORT_TRUST_BASE64",
"P6_NATIVE_POST_POLICY_BASE64","P6_NONPAID_DAILY_POLICY_SHA256",
"P6_NONPAID_SIGNING_POLICY_SHA256","P6_NONPAID_TRANSPORT_TRUST_SHA256",
"P6_NATIVE_POST_POLICY_SHA256","P6_PHASE7_POST_PRESERVATION_POLICY_BASE64",
"P6_PHASE7_POST_PRESERVATION_POLICY_SHA256"].sort();
const [mode,privPath,envelopePath,requestPath]=process.argv.slice(2);
need(process.argv.length===6&&["--verify","--apply"].includes(mode)&&
 [privPath,envelopePath,requestPath].every(x=>typeof x==="string"&&path.isAbsolute(x)),
 "ARGS");
const st=fs.lstatSync(privPath);
need(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&st.uid===process.getuid()&&
 (st.mode&0o077)===0&&st.size>0&&st.size<10000,"PRIVATE_KEY_FILE_SCOPE");
const priv=createPrivateKey(fs.readFileSync(privPath));
need(priv.asymmetricKeyType==="x25519","OWNER_PRIVATE_KEY_TYPE");
const pubRaw=createPublicKey(priv).export({format:"der",type:"spki"});
const e=JSON.parse(fs.readFileSync(envelopePath,"utf8"));
const req=JSON.parse(fs.readFileSync(requestPath,"utf8"));
need(req.schema==="v39.phase6.gate8.owner-seal-request.v1"&&
 req.mainSha===pin&&req.historicalDigest===prior&&
 e.schema==="v39.phase6.gate8.policy-secret-envelope.v1"&&
 e.alg==="X25519-HKDF-SHA256-AES-256-GCM"&&e.mainSha===pin&&
 e.historicalDigest===prior&&e.ownerRequestNonce===req.nonce&&
 e.recipientSpkiSha256===sha(pubRaw)&&req.recipientPublicSpkiBase64===pubRaw.toString("base64")&&
 e.successorStaticDigest===expectedStatic&&
 /^[a-f0-9]{64}$/.test(e.successorStaticDigest),"SCOPE_AND_RECIPIENT");
const decode=(k,expectLen)=>{
 const s=e[k];need(typeof s==="string"&&/^[A-Za-z0-9+/]+={0,2}$/.test(s),"ENVELOPE_BASE64");
 const b=Buffer.from(s,"base64");
 need(b.toString("base64")===s&&b.length===expectLen||b.toString("base64")===s&&expectLen===null,"BASE64_LENGTH");
 return b;
};
const ephemeral=decode("ephemeralPublicSpkiBase64",null);
const epk=createPublicKey({key:ephemeral,format:"der",type:"spki"});
need(epk.asymmetricKeyType==="x25519","EPHEMERAL_X25519");
const salt=decode("saltBase64",32),iv=decode("nonceBase64",12),
 tag=decode("authTagBase64",16),ct=decode("ciphertextBase64",null);
need(ct.length>500&&ct.length<1000000,"CIPHERTEXT_SIZE");
const aad=Buffer.from(JSON.stringify({schema:e.schema,mainSha:e.mainSha,
 historicalDigest:e.historicalDigest,successorStaticDigest:e.successorStaticDigest,
 ownerRequestNonce:e.ownerRequestNonce,recipientSpkiSha256:e.recipientSpkiSha256}),"utf8");
const secret=diffieHellman({privateKey:priv,publicKey:epk});
const key=Buffer.from(hkdfSync("sha256",secret,salt,
 Buffer.from("Travnr Phase6 G8 x25519-aes256gcm successor v1","utf8"),32));
let payload;try{
 const cipher=createDecipheriv("aes-256-gcm",key,iv,{authTagLength:16});
 cipher.setAAD(aad);cipher.setAuthTag(tag);
 payload=JSON.parse(Buffer.concat([cipher.update(ct),cipher.final()]).toString("utf8"));
}catch{hold("AEAD_AUTHENTICATION_FAILED")}
const changes=payload?.changes,receipt=payload?.receipt;
need(changes&&typeof changes==="object"&&!Array.isArray(changes)&&
 JSON.stringify(Object.keys(changes).sort())===JSON.stringify(keys)&&
 Object.values(changes).every(x=>typeof x==="string"&&x.length>0&&Buffer.byteLength(x)<=48000)&&
 receipt?.status==="P6_G8_ELEVEN_EXISTING_POLICY_SUCCESSOR_VALUES_VALIDATED_NO_PAID_GO"&&
 receipt.mainSha===pin&&receipt.priorStaticSha256===prior&&
 receipt.successorStaticSha256===e.successorStaticDigest&&
 receipt.successorPostPolicySha256===expectedPost&&
 JSON.stringify(receipt.changesNames)===JSON.stringify(keys)&&
 receipt.phase6PaidGo===false&&receipt.sourceAuthReenabled===false&&
 receipt.dbWrites===0&&receipt.providerCalls===0,
 "EXACT_ELEVEN_DELTA_AND_RECEIPT");
const parse=(name)=>{
 const b=Buffer.from(changes[name],"base64");
 need(b.toString("base64")===changes[name],"SECRET_BASE64_"+name);
 const obj=JSON.parse(b.toString("utf8"));
 need(JSON.stringify(obj)===b.toString("utf8"),"SECRET_CANONICAL_"+name);
 return {raw:b,obj};
};
const source=parse("P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64").obj;
const daily=parse("P6_NONPAID_DAILY_POLICY_BASE64").obj;
const signing=parse("P6_NONPAID_SIGNING_POLICY_BASE64").obj;
const transport=parse("P6_NONPAID_TRANSPORT_TRUST_BASE64").obj;
const native=parse("P6_NATIVE_POST_POLICY_BASE64").obj;
const post=parse("P6_PHASE7_POST_PRESERVATION_POLICY_BASE64").obj;
for(const name of ["P6_NONPAID_DAILY_POLICY","P6_NONPAID_SIGNING_POLICY","P6_NONPAID_TRANSPORT_TRUST","P6_NATIVE_POST_POLICY"])
 need(sha(parse(name+"_BASE64").raw)===changes[name+"_SHA256"],"LINKED_DIGEST_"+name);
need(source.reviewedCodeSha===pin&&daily.approvedCodeSha===pin&&
 daily.nativeLaterReview?.dayAppendPolicy?.approvedCodeSha===pin&&
 signing.approvedCodeSha===pin&&transport.reviewedMainSha===pin&&
 native.reviewedCodeSha===pin&&
 transport.dailyPolicySha256===hash(daily)&&
 transport.signingPolicySha256===hash(signing)&&
 post.nativePostPolicySha256===changes.P6_NATIVE_POST_POLICY_SHA256&&
 sha(parse("P6_PHASE7_POST_PRESERVATION_POLICY_BASE64").raw)===changes.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256&&
 receipt.successorPostPolicySha256===changes.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256,
 "LINKED_MAIN_SHA_AND_POST_DIGEST");
console.log(JSON.stringify({status:"P6_G8_OWNER_ENCRYPTED_SUCCESSOR_DECRYPTED_AND_VALIDATED",
 currentMain:pin,staticDigest:receipt.successorStaticSha256,
 linkedPostDigest:receipt.successorPostPolicySha256,
 changedSecretCount:keys.length,decryptedValuesPrinted:false,
 providerCalls:0,databaseWrites:0,phase6PaidGo:false,
 applied:false}));
if(mode==="--verify")process.exit(0);
const gh=(a,input)=>{
 try{return execFileSync("gh",a,{input,encoding:"utf8",timeout:25000,maxBuffer:1000000,
  stdio:["pipe","pipe","pipe"]}).trim();}
 catch{hold("OWNER_GH_FAILED_NO_REPLAY")}
};
need(gh(["api","user","--jq",".login"])==="HKcode22","OWNER_LOGIN");
const main=()=>need(gh(["api","repos/"+repo+"/git/ref/heads/main","--jq",".object.sha"])===pin,"MAIN_DRIFT");
main();
const secrets=new Set(gh(["api","repos/"+repo+"/actions/secrets?per_page=100","--paginate","--jq",".secrets[].name"]).split("\n").filter(Boolean));
const shadow=new Set(gh(["api","repos/"+repo+"/environments/phase6-protected-runtime/secrets?per_page=100","--paginate","--jq",".secrets[].name"]).split("\n").filter(Boolean));
const stopKeys=["V39_PHASE6_PROCESS_ARMED","V39_PHASE6_OWNER_APPROVED"];
// Owner name-only remote readback proved 11 policies at repository scope only,
// and both paid STOP secrets at repository AND protected environment scope.
// Exact scopes are required; merely removing the old no-shadow check is unsafe.
need(keys.every(k=>secrets.has(k)&&!shadow.has(k))&&
     stopKeys.every(k=>secrets.has(k)&&shadow.has(k)),
 "EXACT_ELEVEN_REPO_ONLY_AND_TWO_DUAL_STOP_SCOPES");
// STOP comes FIRST at BOTH effective scopes; environment overrides repository.
// Unknown/partial CLI errors are a HOLD; NO blind replay and NO paid GO.
for(const k of stopKeys){
 main();gh(["secret","set",k,"-R",repo],Buffer.from("0"));
 main();gh(["secret","set",k,"-R",repo,"-e","phase6-protected-runtime"],Buffer.from("0"));
}
main();
console.log(JSON.stringify({status:"P6_G8_BOTH_GLOBAL_PAID_CONTROLS_DISARMED_AT_REPO_AND_PROTECTED_ENV",
 dualScopeStopSecretCount:2,paidGo:false,policyWritesStarted:false}));
// Policy values are known repository-only. Update exactly those 11 existing
// repository secrets; do not write/create any environment policy shadows.
for(const name of keys){
 main();
 gh(["secret","set",name,"-R",repo],Buffer.from(changes[name],"utf8"));
}
main();
console.log(JSON.stringify({status:"P6_G8_EXISTING_SEAL_ELEVEN_REPO_POLICY_VALUES_INSTALLED_AND_TWO_DUAL_SCOPE_STOPS_DISARMED_NO_PAID_GO",
 mainSha:pin,installedSecretCount:keys.length,sourceAuthorizationNotModified:true,
 oldSignedApprovalsNotRegenerated:true,staticSuccessorSha256:receipt.successorStaticSha256,
 postPreservationSha256:receipt.successorPostPolicySha256,providerCalls:0,
 databaseWrites:0,phase6PaidGo:false}));
