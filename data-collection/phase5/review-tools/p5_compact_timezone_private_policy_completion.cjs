#!/usr/bin/env node
"use strict";
// Owner-local reuse of already verified private bytes. No provider, DB, secret,
// signature, or dispatch. Output is deliberately non-runtime, never approval.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
function check(ok,r){if(!ok)throw Error("HOLD_P5_PRIVATE_POLICY_"+r)}
function moveCalendar(rows,c){
 check(Array.isArray(rows)&&rows.length===31&&Array.isArray(c?.rows)&&c.rows.length===31,"SHAPE");
 return rows.map((r,i)=>{const p=c.rows[i];check(r.runDayIndex===i+1&&p.runDayIndex===i+1&&r.startUtc===p.originalStartUtc&&r.anchorIcao===p.anchorIcao,"ASSIGNMENT");check(typeof p.startUtc==="string"&&Number.isFinite(Date.parse(p.startUtc))&&new Date(p.startUtc).toISOString()===p.startUtc&&p.startUtc.slice(11)===r.startUtc.slice(11),"DATE_ONLY");return {...r,startUtc:p.startUtc,budgetDayId:"p5-f8-"+p.startUtc.slice(0,10).replace(/-/g,"")+"-"+String(i+1).padStart(2,"0")}});
}
function scope(rows){
 const fixed=new Set(),cells=new Set(),slots=["HUB","MID_A","MID_B","REGIONAL"];
 for(const r of rows){check(r.slotRegions&&slots.every(s=>typeof r.slotRegions[s]==="string"&&r.slotRegions[s]),"REGIONS");
 if(r.pairAirportSet){for(const s of slots){const a=r.pairAirportSet[s];check(a&&/^[A-Z]{4}$/.test(a.icao)&&a.region===r.slotRegions[s],"PAIR");fixed.add(a.icao)}}else{check(/^[A-Z]{4}$/.test(r.anchorIcao),"ANCHOR");fixed.add(r.anchorIcao);for(const s of slots.slice(1))cells.add(JSON.stringify([s==="REGIONAL"?"REGIONAL":"MID",r.slotRegions[s]]))}}
 return {fixed:[...fixed].sort(),cells:[...cells].sort()};
}
function validateCatalog(c,required,expectedAirports=1017,expectedGroups=168){
 check(c&&Object.keys(c).length===1&&Array.isArray(c.airportTimezoneGroups)&&c.airportTimezoneGroups.length===expectedGroups,"GROUPS");const seen=new Set(),zones=new Set();
 for(const g of c.airportTimezoneGroups){check(g&&typeof g.ianaTimezone==="string"&&g.ianaTimezone.length>0&&g.ianaTimezone.length<=80&&!zones.has(g.ianaTimezone)&&Array.isArray(g.icaos)&&g.icaos.length>0,"GROUP");try{new Intl.DateTimeFormat("en-US",{timeZone:g.ianaTimezone}).format(0)}catch{check(false,"TIMEZONE")};zones.add(g.ianaTimezone);for(const i of g.icaos){check(typeof i==="string"&&/^[A-Z]{4}$/.test(i)&&!seen.has(i),"ICAO");seen.add(i)}}
 check(seen.size===expectedAirports&&required.every(i=>seen.has(i)),"COVERAGE");return {airports:seen.size,groups:zones.size};
}
const PIN="70580b3749544dfcbeff39da181b2aa42b1b4476";
const OLD="45a44fffeb774b5d0829487bd82f1a4a40f70085bc776f269cf04f0a8c70962c";
const COMPACT="7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c";
const CAT="4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534";
const OLD_REVIEW="c305d382317de29b47d615e7a4c5e223041e187392bb64c68036fe68b10a8bb4";
const MANIFEST="9f6a12965dcf3eb911da4b13b3d58e5b8ebd0c6544861f499b7ec807cf0dbe25";
const CONFIG="4055c04207222f5dbdda7d124c30f7bfdc40e852e68fef38df4d1e93e0659edb";
const hash=b=>crypto.createHash("sha256").update(b).digest("hex");
const digest=x=>hash(JSON.stringify(x));
const gh=args=>execFileSync("gh",args,{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:20000,maxBuffer:3*1024*1024}).trim();
const head=()=>gh(["api","repos/HKcode22/ReplitTranvr/git/ref/heads/main","--jq",".object.sha"]);
function blob(id){const b=Buffer.from(gh(["api","repos/HKcode22/ReplitTranvr/git/blobs/"+id,"--jq",".content"]),"base64");check(crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex")===id,"BLOB");return JSON.parse(b.toString("utf8"))}
function exact(p,sha){const st=fs.lstatSync(p);check(st.isFile()&&!st.isSymbolicLink()&&(st.mode&0o077)===0&&st.size<=10*1024*1024,"FILE");const b=fs.readFileSync(p);check(hash(b)===sha,"DIGEST");return JSON.parse(b.toString("utf8"))}
function privateDir(p){const st=fs.lstatSync(p);return st.isDirectory()&&!st.isSymbolicLink()&&(st.mode&0o077)===0}
function pick(home,pattern,read){const found=[];for(const name of fs.readdirSync(home).filter(n=>pattern.test(n)).sort()){const p=path.join(home,name);try{if(privateDir(p))found.push(read(p))}catch{}}check(found.length>=1,"EXISTING_PRIVATE_INPUT_NOT_FOUND");return found[0]}
function run(){
 check(process.env.GITHUB_ACTIONS!=="true"&&process.argv.length===2,"OWNER_ONLY");check(head()===PIN,"MAIN_CHANGED");
 const home=fs.realpathSync(os.homedir());
 const a=pick(home,/^\.phase5-review-[A-Za-z0-9_-]+$/,p=>({review:exact(path.join(p,"review-only.json"),OLD_REVIEW),cat:exact(path.join(p,"airport-timezone-catalog-CANDIDATE.json"),CAT)}));
 const b=pick(home,/^\.phase5-final-review-[A-Za-z0-9_-]+$/,p=>{const d=path.join(p,"nov18-"+PIN.slice(0,12));check(privateDir(d),"CANDIDATE_DIR");const m=exact(path.join(d,"manifest-candidate.json"),MANIFEST),cfg=exact(path.join(d,"config-candidate.json"),CONFIG);check(m.scientificFreezeApproved===false&&m.phase6PaidGo===false&&m.configCandidateSha256===CONFIG&&cfg.status==="PROPOSED_NOT_FROZEN"&&cfg.calendarRowsSha256===COMPACT,"CANDIDATE_SCOPE");return {d,cfg}});
 const compact=blob("ee17a694594356e2b0c772545c490c198db11b42"),work=blob("c0f4f26cdf831ae8a85b3c3ac1a06cc5dc913b4b");
 check(compact.status==="PROSPECTIVE_COMPACT_REVIEW_NOT_RELEASE"&&compact.phase6PaidGo===false&&compact.cases[0].totalReserve===37388,"COMPACT_SCOPE");
 check(work.main===PIN&&work.manifestCandidateSha256===MANIFEST&&work.manifestApproved===false&&work.phase6PaidGo===false,"WORKPAPER_SCOPE");
 const rows=a.review.calendarDraft?.calendarDays;check(digest(rows)===OLD,"ORIGINAL_CALENDAR");
 const moved=moveCalendar(rows,compact.cases[0]);check(digest(moved)===COMPACT,"COMPACT_CALENDAR");
 const s=scope(rows);check(JSON.stringify(s)===JSON.stringify(scope(moved))&&s.fixed.length===19&&s.cells.length===12,"SCOPE_CHANGED");
 const stats=validateCatalog(a.cat,s.fixed);
 const daily=work.policyDrafts.P6_NONPAID_DAILY_POLICY_BASE64;
 check(daily.delegatedDailyPacketProductionApproved===false&&daily.airportTimezoneGroups===null&&daily.airportFrames===undefined,"DRAFT_SCOPE");
 daily.airportTimezoneGroups=a.cat.airportTimezoneGroups;
 work.status="PRIVATE_TIMEZONE_POLICY_CANDIDATE_NOT_RUNTIME";
 work.timezoneScopeProof={originalCalendarSha256:OLD,compactCalendarSha256:COMPACT,originalCatalogSha256:CAT,scopeSha256:digest(s),fixedAirportCount:s.fixed.length,adaptiveCellCount:s.cells.length,catalogAirports:stats.airports,catalogGroups:stats.groups,independentFinalPolicyApproval:false};
 work.candidateCategoryRowsSha256=b.cfg.physicalUtcCategoryRowsSha256;
 check(/^[a-f0-9]{64}$/.test(work.candidateCategoryRowsSha256),"CATEGORY_DIGEST");
 // Do not assign approved provider/budget/rights/release digests or approval booleans.
 check(head()===PIN,"MAIN_CHANGED_AFTER_ASSEMBLY");
 const out=path.join(b.d,"policy-with-timezone-NOT-RUNTIME.json"),raw=JSON.stringify(work);
 fs.writeFileSync(out,raw,{flag:"wx",mode:0o600});
 console.log(JSON.stringify({status:work.status,main:PIN,manifestCandidateSha256:MANIFEST,timezoneScopeProof:work.timezoneScopeProof,candidateCategoryRowsSha256:work.candidateCategoryRowsSha256,privateWorkpaperSha256:hash(raw),privateWorkpaperBytes:Buffer.byteLength(raw),policyInstalled:false,providerCalls:0,databaseWrites:0,githubMutations:0,phase6PaidGo:false}));
}
module.exports={moveCalendar,scope,validateCatalog};
if(require.main===module)try{run()}catch(e){const s=String(e.message||"");console.error(/^HOLD_P5_PRIVATE_POLICY_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_PRIVATE_POLICY_REDACTED");process.exitCode=2}
