"use strict";
/* PRE-APPLY ONLY: verify the existing authenticated G12 ciphertext recipient,
 * exact owner request, strict old+current validator attestation, expected
 * changed secret names, source-day preservation and canonical digest linkage.
 * No GitHub API, no secret writes, no provider and no DB access. */
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
const [keyFile,envelopeFile,requestFile]=process.argv.slice(2);
need(process.argv.length===5&&[keyFile,envelopeFile,requestFile].every(x=>typeof x==="string"&&x.startsWith("/")),"ARGS");
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
console.log(JSON.stringify({
 status:"P6_G12_OWNER_DECRYPTED_NEW_C8_CODE_SUCCESSOR_EXACT_17_VALUES_VERIFIED_NO_APPLY",
 originalReviewedSourceSha:previous,currentReviewedMainSha:pin,
 successorStaticSha256:expectedCurrent,changedSecretNameCount:expectedNames.length,
 original31DaysPreserved:true,authenticatedRecipientRequest:true,
 creatorFullValidatorAttestationBound:true,sourceCodePinsAndSHA256LinksValidated:true,
 privateKeyPrinted:false,plaintextPrinted:false,githubSecretWrites:0,
 providerCalls:0,databaseReads:0,databaseWrites:0,phase6PaidGo:false,
 applied:false
}));
