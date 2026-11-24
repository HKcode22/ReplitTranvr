"use strict";
// Only the four policy values, no provider keys, DB credentials or signing keys.
// Owner-generated X25519 key stays local. Authenticated envelope is short lived.
const fs=require("node:fs"), C=require("node:crypto"), {execFileSync}=require("node:child_process");
const R="HKcode22/ReplitTranvr", PIN="c8e065d665ccacb6d2575070e94c5500b7583044";
const names=["P6_NONPAID_DAILY_POLICY_BASE64","P6_NONPAID_DAILY_POLICY_SHA256","P6_NONPAID_TRANSPORT_TRUST_BASE64","P6_NONPAID_TRANSPORT_TRUST_SHA256"];
const sha=b=>C.createHash("sha256").update(b).digest("hex");
const b64=b=>Buffer.from(b).toString("base64");
const need=(v,n)=>{if(!v)throw Error("HOLD_P6_FRESH_POLICY_"+n)};
const decode=s=>{need(typeof s==="string"&&s.length<1000000&&/^[A-Za-z0-9+/]+={0,2}$/.test(s),"BASE64");const b=Buffer.from(s,"base64");need(b64(b)===s,"CANONICAL_BASE64");return b};
const json=s=>{const b=decode(s),x=JSON.parse(b.toString("utf8"));need(JSON.stringify(x)===b.toString("utf8"),"CANONICAL_JSON");return x};
const digest=x=>sha(JSON.stringify(x));
function correct(v){
 need(Object.keys(v).sort().join(",")===[...names].sort().join(","),"EXACT_FOUR");
 const d=json(v[names[0]]),t=json(v[names[2]]);
 need(digest(d)===v[names[1]]&&digest(t)===v[names[3]]&&t.dailyPolicySha256===v[names[1]],"ORIGINAL_LINKS");
 need(d.schema==="v39.phase6.delegated-daily-source-review-policy.v1"&&d.approvedCodeSha===PIN&&t.reviewedMainSha===PIN&&d.delegatedDailyPacketProductionApproved===true&&d.dayPlanSha256s?.length===31,"ORIGINAL_POLICY");
 need(d.nativeLaterReview?.approved===true&&d.nativeLaterReview.nativeT24ReviewApproved===true&&d.nativeLaterReview.independentT24WitnessProtocolReviewed===true&&d.nativeLaterReview.maximumT24ExecutionLanes===undefined,"EXACT_MISSING_LANE");
 const n=structuredClone(d);n.nativeLaterReview.maximumT24ExecutionLanes=1;
 const nt={...t,dailyPolicySha256:digest(n)};
 const back=structuredClone(n);delete back.nativeLaterReview.maximumT24ExecutionLanes;
 need(JSON.stringify(back)===JSON.stringify(d)&&JSON.stringify({...nt,dailyPolicySha256:t.dailyPolicySha256})===JSON.stringify(t),"ONLY_TWO_LEAVES");
 return {[names[0]]:b64(JSON.stringify(n)),[names[1]]:digest(n),[names[2]]:b64(JSON.stringify(nt)),[names[3]]:digest(nt)};
}
const spki=k=>C.createPublicKey(k).export({type:"spki",format:"der"});
const info=Buffer.from("Travnr T24 exact four policy repair v1");
function request(key){return {schema:"travnr.p6.t24-lane-owner-request.v1",main:PIN,nonce:C.randomBytes(24).toString("hex"),requestedAt:new Date().toISOString(),recipient:b64(spki(key))};}
function checkReq(r){need(r.schema==="travnr.p6.t24-lane-owner-request.v1"&&r.main===PIN&&/^[a-f0-9]{48}$/.test(r.nonce)&&Number.isFinite(Date.parse(r.requestedAt))&&Date.now()-Date.parse(r.requestedAt)<30*60000&&Date.parse(r.requestedAt)<=Date.now()+5000,"REQUEST_SCOPE");const p=C.createPublicKey({key:decode(r.recipient),type:"spki",format:"der"});need(p.asymmetricKeyType==="x25519","KEY_TYPE");return p;}
function seal(r,v){
 correct(v);const recipient=checkReq(r),ep=C.generateKeyPairSync("x25519"),salt=C.randomBytes(32),iv=C.randomBytes(12);
 const header={schema:"travnr.p6.t24-lane-envelope.v1",main:PIN,requestDigest:digest(r),recipientDigest:sha(decode(r.recipient)),ephemeral:b64(ep.publicKey.export({type:"spki",format:"der"})),salt:b64(salt),iv:b64(iv)};
 const key=Buffer.from(C.hkdfSync("sha256",C.diffieHellman({privateKey:ep.privateKey,publicKey:recipient}),salt,info,32));
 const cipher=C.createCipheriv("aes-256-gcm",key,iv);cipher.setAAD(Buffer.from(JSON.stringify(header)));
 const bytes=Buffer.concat([cipher.update(JSON.stringify(v)),cipher.final()]);
 return {...header,tag:b64(cipher.getAuthTag()),ciphertext:b64(bytes)};
}
function open(r,e,priv){
 checkReq(r);need(b64(spki(priv))===r.recipient,"OWNER_RECIPIENT");
 const {tag,ciphertext,...header}=e;
 need(header.schema==="travnr.p6.t24-lane-envelope.v1"&&header.main===PIN&&header.requestDigest===digest(r)&&header.recipientDigest===sha(decode(r.recipient)),"ENVELOPE_SCOPE");
 const p=C.createPublicKey({key:decode(header.ephemeral),type:"spki",format:"der"});need(p.asymmetricKeyType==="x25519","EPHEMERAL_TYPE");
 const key=Buffer.from(C.hkdfSync("sha256",C.diffieHellman({privateKey:priv,publicKey:p}),decode(header.salt),info,32));
 const dec=C.createDecipheriv("aes-256-gcm",key,decode(header.iv));dec.setAAD(Buffer.from(JSON.stringify(header)));dec.setAuthTag(decode(tag));
 return correct(JSON.parse(Buffer.concat([dec.update(decode(ciphertext)),dec.final()]).toString("utf8")));
}
function selftest(){
 const d={schema:"v39.phase6.delegated-daily-source-review-policy.v1",approvedCodeSha:PIN,delegatedDailyPacketProductionApproved:true,dayPlanSha256s:Array.from({length:31},(_,i)=>i),nativeLaterReview:{approved:true,nativeT24ReviewApproved:true,independentT24WitnessProtocolReviewed:true},budget:"synthetic"};
 const t={reviewedMainSha:PIN,dailyPolicySha256:digest(d),other:"synthetic"};
 const v={[names[0]]:b64(JSON.stringify(d)),[names[1]]:digest(d),[names[2]]:b64(JSON.stringify(t)),[names[3]]:digest(t)};
 const k=C.generateKeyPairSync("x25519").privateKey,r=request(k),e=seal(r,v),x=open(r,e,k);
 need(json(x[names[0]]).nativeLaterReview.maximumT24ExecutionLanes===1&&json(x[names[2]]).dailyPolicySha256===x[names[1]],"SELFTEST_CORRECT");
 let rejected=false;try{open(r,{...e,tag:b64(Buffer.alloc(16))},k)}catch{rejected=true}need(rejected,"SELFTEST_TAMPER");
 console.log("P6_FRESH_POLICY_ENVELOPE_SELFTEST_PASS");
}
function gh(args,input){try{return execFileSync("gh",args,{input,encoding:"utf8",timeout:30000,stdio:["pipe","pipe","pipe"],maxBuffer:3000000}).trim()}catch{throw Error("HOLD_P6_FRESH_POLICY_GH_UNKNOWN_NO_REPLAY")}}
function read(p){return JSON.parse(fs.readFileSync(p,"utf8"))}
function main(){
 const [mode,a,b,c]=process.argv.slice(2);
 if(mode==="selftest"){selftest();return;}
 if(mode==="request"){
  const k=C.generateKeyPairSync("x25519").privateKey;
  fs.writeFileSync(a,k.export({type:"pkcs8",format:"pem"}),{mode:0o600,flag:"wx"});
  fs.writeFileSync(b,JSON.stringify(request(k)),{mode:0o600,flag:"wx"});return;
 }
 if(mode==="seal"){
  need(process.env.GITHUB_ACTOR==="HKcode22"&&process.env.GITHUB_REPOSITORY===R&&process.env.GITHUB_EVENT_NAME==="push"&&process.env.GITHUB_RUN_ATTEMPT==="1","OWNER_PUSH");
  const v=Object.fromEntries(names.map(k=>[k,process.env[k]??""]));
  fs.writeFileSync(b,JSON.stringify(seal(read(a),v)),{mode:0o600,flag:"wx"});
  console.log("P6_FRESH_FOUR_POLICY_OWNER_ENVELOPE_SEALED_NO_WRITE");return;
 }
 need(mode==="verify"||mode==="apply","MODE");
 const priv=C.createPrivateKey(fs.readFileSync(a));const repair=open(read(b),read(c),priv);
 console.log(JSON.stringify({status:"P6_FRESH_NARROW_POLICY_CORRECTION_VERIFIED",newLane:1,newDailyDigest:repair[names[1]],newTransportDigest:repair[names[3]],secretValuesPrinted:false}));
 if(mode==="verify")return;
 const L="HKcode22/TravnrClockRelay",E="phase6-protected-runtime";
 need(gh(["api","user","--jq",".login"])==="HKcode22"&&gh(["api","repos/"+R+"/git/ref/heads/main","--jq",".object.sha"])===PIN,"OWNER_MAIN");
 const v=(r,k)=>gh(["variable","get",k,"-R",r]);
 need(v(L,"TRAVNR_RELAY_ROLLING_ENABLED")==="0"&&v(L,"TRAVNR_RELAY_PRIMARY_ENABLED")==="1"&&v(R,"P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED")==="false"&&v(R,"P6_PRIVATE_POST_PARENT_ENABLED")==="false"&&v(R,"P6_NATIVE_POST_PRODUCER_ENABLED")==="0"&&v(R,"P6_NONPAID_SOURCE_SCHEDULE_ENABLED")==="false","ROUTES_PAUSED");
 const repo=new Set(gh(["api","repos/"+R+"/actions/secrets?per_page=100","--paginate","--jq",".secrets[].name"]).split("\n"));
 const env=new Set(gh(["api","repos/"+R+"/environments/"+E+"/secrets?per_page=100","--paginate","--jq",".secrets[].name"]).split("\n"));
 need(names.every(k=>repo.has(k)&&!env.has(k)),"NO_ENV_SHADOW");
 fs.writeFileSync(a+".apply.started",JSON.stringify({daily:repair[names[1]],transport:repair[names[3]]}),{flag:"wx",mode:0o600});
 for(const k of names){gh(["secret","set",k,"-R",R],Buffer.from(repair[k]));console.log("P6_NARROW_POLICY_WRITE_ACK "+k);}
 console.log("P6_T24_ONE_LANE_POLICY_AND_LINKED_TRANSPORT_INSTALLED_PAID_ROUTES_PAUSED");
}
try{main()}catch(e){console.error(typeof e?.message==="string"&&/^HOLD_P6_FRESH_POLICY_[A-Z0-9_]+$/.test(e.message)?e.message:"HOLD_P6_FRESH_POLICY_REDACTED_NO_REPLAY");process.exitCode=2;}
