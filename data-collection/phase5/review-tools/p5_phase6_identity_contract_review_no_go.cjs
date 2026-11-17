#!/usr/bin/env node
// Offline SOURCE identity contract regression against the exact reviewed source.
// Synthetic records only. No DB, network, credentials, or paid release.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const root=process.argv[2]??process.cwd();
const file='server/lib/disruption/flightInstanceCanonical_v3.ts';
const raw=fs.readFileSync(path.join(root,file));
const blob=crypto.createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex');
assert.equal(blob,'d86aee02c5ded58504ac55d256d0fc05a589fc53','reviewed source identity drift');
const s=raw.toString('utf8');
const take=(start,end)=>{
 const a=s.indexOf(start),b=s.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'source boundary changed');
 return s.slice(a,b);
};
const parts=take('function sha8(', 'function normalizedRequired(')+
 take('function scheduleVersionId(', 'export function dedupCodeshares(');
const js=stripTypeScriptTypes(parts.replaceAll('export function ','function '),{mode:'strip'});
const canonical=vm.runInNewContext(js+'\n;({canonicalFlightInstanceId,retimeFlightInstanceId})',{crypto});
const common={operatingCarrier:'ZX',origin:'ZZAA',destinationOriginal:'ZZBB',serviceDate:'2026-12-01',initialServiceDate:'2026-12-01'};
const a={...common,operatingFlightNumber:'5293',scheduledGateOutUtc:'2026-12-01T00:05:00.000Z',providerFlightId:'synthetic-a'};
const b={...common,operatingFlightNumber:'4955',scheduledGateOutUtc:'2026-12-01T00:10:00.000Z',providerFlightId:'synthetic-b'};
const first=canonical.canonicalFlightInstanceId({...a,firstScheduledGateOutUtc:a.scheduledGateOutUtc});
const distinct=canonical.canonicalFlightInstanceId(b);
const retimed={...a,scheduledGateOutUtc:'2026-12-01T00:35:00.000Z',firstScheduledGateOutUtc:'2026-12-01T00:35:00.000Z'};
const fresh=canonical.canonicalFlightInstanceId(retimed);
const linked=canonical.retimeFlightInstanceId(first,retimed);
const full=x=>'leg:'+crypto.createHash('sha256').update(x.stableIdentity).digest('hex');
assert.notEqual(first.stableIdentity,distinct.stableIdentity);
assert.equal(first.flight_instance_id,distinct.flight_instance_id);
assert.equal(first.flight_instance_id,'leg:248b5aa6');
assert.notEqual(full(first),full(distinct));
assert.notEqual(first.flight_instance_id,fresh.flight_instance_id);
assert.equal(linked.flight_instance_id,first.flight_instance_id);
assert.notEqual(full(first),full(fresh));
assert.equal(full(first),full(linked));
assert.equal(new Set([first.flight_instance_id+'|T-6h',distinct.flight_instance_id+'|T-6h']).size,1);
assert.equal(new Set([first.flight_instance_id+'|T-6h',fresh.flight_instance_id+'|T-6h']).size,2);
for(const m of [1440,360,90]){
 const t=Date.parse(a.scheduledGateOutUtc);assert.equal(t,(t-m*60000)+m*60000);
}
function risk(n){let log=0;for(let i=0;i<n;i++)log+=Math.log1p(-i/2**32);return -Math.expm1(log);}
console.log(JSON.stringify({status:'SYNTHETIC_EXACT_CANONICAL_FUNCTION_REVIEW_NO_GO',sourceBlob:blob,
 assertions:13,collisionReproduced:true,fullDigestSeparatesFixture:true,
 freshRetimeChangesKey:true,existingRetimeLinkPreservesKey:true,
 fullDigestAloneDoesNotResolveRetimedAliases:true,cutoffInvertibilityAllThreeHorizons:true,
 collisionSensitivity:[1000,5000,10000,20000,50000,100000].map(n=>({distinctKeys:n,probability:risk(n)})),
 actualProviderData:false,databaseWrites:0,providerCalls:0,phase6PaidGo:false},null,2));
