#!/usr/bin/env node
'use strict';
// Owner-local review only. No provider calls, DB mutations, draws or approvals.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {createRequire} = require('node:module');
const {execFileSync} = require('node:child_process');
const FRAME='02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94';
const TRAFFIC='8dd10dd0b5e0e9f493ad823a37f0852b6882fef49f45ee7965af557408264424';
const CAL='45a44fffeb774b5d0829487bd82f1a4a40f70085bc776f269cf04f0a8c70962c';
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const requireThat=(ok,reason)=>{if(!ok)throw Error('HOLD_P5_TIMEZONE_'+reason)};
const eligible=r=>r.in_frame===true&&r.pre_eligible===true&&r.post_eligible===true&&!r.exclusion_reason&&typeof r.region==='string'&&r.region!=='UNMAPPED';
const slots=['HUB','MID_A','MID_B','REGIONAL'];
function buildCatalog(rows, calendar) {
  const byCode=new Map(), fixed=new Set(), cells=new Set();
  for (const r of rows) {
    requireThat(typeof r.icao==='string'&&/^[A-Z]{4}$/.test(r.icao)&&!byCode.has(r.icao),'FRAME_CODE_OR_DUPLICATE');
    byCode.set(r.icao,r);
  }
  for (const d of calendar) {
    requireThat(d.slotRegions&&slots.every(s=>typeof d.slotRegions[s]==='string'),'CALENDAR_REGIONS');
    if (d.pairAirportSet) {
      for (const s of slots) {
        const f=d.pairAirportSet[s],r=byCode.get(f?.icao);
        requireThat(r&&eligible(r)&&r.region===d.slotRegions[s]&&f.region===r.region,'FIXED_PAIR_FRAME_MISMATCH');
        fixed.add(r.icao);
      }
    } else {
      const r=byCode.get(d.anchorIcao);
      requireThat(r&&eligible(r)&&r.tier==='HUB'&&r.region===d.slotRegions.HUB,'FIXED_ANCHOR_FRAME_MISMATCH');
      fixed.add(r.icao);
      for (const s of slots.slice(1)) cells.add(JSON.stringify([s==='REGIONAL'?'REGIONAL':'MID',d.slotRegions[s]]));
    }
  }
  const counts=new Map([...cells].map(c=>[c,0]));
  const included=rows.filter(r=>{
    const cell=JSON.stringify([r.tier,r.region]);
    const hit=eligible(r)&&cells.has(cell);
    if(hit)counts.set(cell,counts.get(cell)+1);
    return fixed.has(r.icao)||hit;
  });
  requireThat([...counts.values()].every(n=>n>0),'EMPTY_ADAPTIVE_CELL');
  requireThat(included.length>=4&&included.length<=2000,'CATALOG_SIZE');
  const groups=new Map(), valid=new Set(), missing=[];
  for(const r of included) {
    const z=r.airport_timezone;
    if(typeof z!=='string'||z.length<1||z.length>80||z.trim()!==z){missing.push(r.icao);continue;}
    if(!valid.has(z)){
      try{new Intl.DateTimeFormat('en-US',{timeZone:z}).format(0);valid.add(z);}catch{missing.push(r.icao);continue;}
    }
    if(!groups.has(z))groups.set(z,[]);
    groups.get(z).push(r.icao);
  }
  const airportTimezoneGroups=[...groups].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([ianaTimezone,icaos])=>({ianaTimezone,icaos:icaos.sort()}));
  requireThat(airportTimezoneGroups.length<=500,'TOO_MANY_ZONES');
  const privateCandidate=missing.length===0?{airportTimezoneGroups}:null;
  return {frameRows:rows.length,fixedAirportCount:fixed.size,adaptiveCellCount:cells.size,requiredAirportCount:included.length,validTimezoneCount:included.length-missing.length,missingOrInvalidTimezoneCount:missing.length,groupCount:groups.size,privateCandidate,missing:missing.sort()};
}
async function readOwnerSnapshot(client) {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    await client.query("SET LOCAL statement_timeout='12000ms'");
    await client.query("SET LOCAL lock_timeout='3000ms'");
    const state=(await client.query("SELECT current_database() db,current_setting('server_version_num')::int ver,pg_is_in_recovery() replica,current_setting('transaction_read_only') ro,clock_timestamp() at")).rows[0];
    requireThat(state?.db==='neondb'&&state.ver>=160000&&state.ver<170000&&state.replica===false&&state.ro==='on','WRONG_OWNER_DB_OR_TRANSACTION');
    const reg=(await client.query("SELECT active_frame_version,frame_hash,traffic_reference_hash FROM clean.adb_sampling_frame_registry WHERE registry_key='ACTIVE'")).rows;
    requireThat(reg.length===1&&reg[0].active_frame_version==='frame_02ec6e78ba1fe3c2'&&reg[0].frame_hash===FRAME&&reg[0].traffic_reference_hash===TRAFFIC,'ACTIVE_FRAME_OR_REFERENCE_DRIFT');
    const rows=(await client.query('SELECT icao,tier,region,in_frame,pre_eligible,post_eligible,exclusion_reason,airport_timezone,frame_hash,traffic_reference_hash FROM clean.adb_sampling_frame WHERE frame_version=$1 ORDER BY icao',[reg[0].active_frame_version])).rows;
    requireThat(rows.length>0&&rows.every(r=>r.frame_hash===FRAME&&r.traffic_reference_hash===TRAFFIC),'FRAME_ROW_IDENTITY_DRIFT');
    await client.query('ROLLBACK');
    return {rows,observedUtc:new Date(state.at).toISOString()};
  } catch(e) { await client.query('ROLLBACK').catch(()=>{});throw e; }
}
async function main() {
  const [pin,reviewDir]=process.argv.slice(2);
  requireThat(process.argv.length===4&&/^[a-f0-9]{40}$/.test(pin)&&process.env.GITHUB_ACTIONS!=='true','OWNER_ARGUMENTS');
  const root=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
  const remote=()=>execFileSync('gh',['api','repos/HKcode22/ReplitTranvr/git/ref/heads/main','--jq','.object.sha'],{encoding:'utf8'}).trim();
  requireThat(remote()===pin,'MAIN_CHANGED');
  const out=fs.realpathSync(reviewDir),home=fs.realpathSync(process.env.HOME);
  requireThat(path.dirname(out)===home&&path.basename(out).startsWith('.phase5-review-')&&!out.startsWith(root+'/')&&(fs.statSync(out).mode&0o077)===0,'PRIVATE_REVIEW_DIR');
  const receipt=JSON.parse(fs.readFileSync(path.join(out,'review-preparation-receipt.json'),'utf8'));
  const reviewRaw=fs.readFileSync(path.join(out,'review-only.json'));
  requireThat(receipt.status==='P5_EXACT_MAIN_PRIVATE_REVIEW_PREPARED_NOT_STAGE_OR_AUTH'&&receipt.mainSha===pin&&receipt.reviewOnlySha256===sha(reviewRaw)&&receipt.phase6PaidGo===false&&receipt.stagePacketExported===false,'REVIEW_RECEIPT');
  const calendar=JSON.parse(reviewRaw).calendarDraft?.calendarDays;
  requireThat(Array.isArray(calendar)&&calendar.length===31&&sha(JSON.stringify(calendar))===CAL,'CALENDAR_PIN');
  requireThat(process.env.DATABASE_URL&&process.env.V39_DATABASE_RUNTIME_URL&&process.env.DATABASE_URL!==process.env.V39_DATABASE_RUNTIME_URL,'EXISTING_DISTINCT_OWNER_URL_REQUIRED');
  const {Pool}=createRequire(path.join(root,'package.json'))('pg');
  const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:12000});
  let snapshot;
  try {const c=await pool.connect();try{snapshot=await readOwnerSnapshot(c);}finally{c.release();}}finally{await pool.end();}
  const {privateCandidate,missing,...counts}=buildCatalog(snapshot.rows,calendar);
  requireThat(remote()===pin,'MAIN_CHANGED_AFTER_READ');
  const result={status:privateCandidate?'P5_TIMEZONE_CATALOG_CANDIDATE_READONLY_NO_GO':'HOLD_P5_TIMEZONE_CATALOG_INCOMPLETE',mainSha:pin,frameHash:FRAME,trafficReferenceHash:TRAFFIC,calendarRowsSha256:CAL,observedUtc:snapshot.observedUtc,...counts,catalogSha256:null,catalogBytes:null,independentReviewRequired:true,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
  if(privateCandidate){
    const raw=JSON.stringify(privateCandidate);
    result.catalogBytes=Buffer.byteLength(raw);result.catalogSha256=sha(raw);
    requireThat(result.catalogBytes<35000,'CATALOG_ALONE_EXCEEDS_POLICY_LIMIT');
    fs.writeFileSync(path.join(out,'airport-timezone-catalog-CANDIDATE.json'),raw,{flag:'wx',mode:0o600});
  } else {
    fs.writeFileSync(path.join(out,'airport-timezone-missing-PRIVATE.json'),JSON.stringify(missing),{flag:'wx',mode:0o600});
  }
  fs.writeFileSync(path.join(out,'airport-timezone-review-receipt.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify(result,null,2));
  if(!privateCandidate)process.exitCode=2;
}
module.exports={buildCatalog,readOwnerSnapshot};
if(require.main===module)main().catch(e=>{const m=String(e?.message??'');console.error(/^HOLD_P5_TIMEZONE_[A-Z0-9_]+$/.test(m)?m:'HOLD_P5_TIMEZONE_REDACTED');process.exitCode=2;});
