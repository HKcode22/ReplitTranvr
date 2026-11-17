'use strict';
// No provider, DB, protected data or model fit. Nominal geometry only.
function analyze(c){
 const M=60000,H=60*M,iso=x=>new Date(x).toISOString(),P=["train","validation","test"],hs=[24,6,1.5];
 const rows=c.rows.map(d=>({day:d.runDayIndex,partition:d.partition,start:Date.parse(d.segments[0].startUtc),end:Date.parse(d.segments.at(-1).endUtc),segments:d.segments}));
 if(rows.length!==31||rows.some((d,i)=>d.day!==i+1||d.partition!==(i<20?"train":i<25?"validation":"test")||!Number.isFinite(d.start)||!(d.end>d.start)))throw Error("HOLD_FROZEN_PARTITION_OR_CLOCK_DRIFT");
 const finalTail=rows.at(-1).end+48*H,firstSource=rows[0].start-24*H-15*M;
 const partitions=P.map(partition=>{
  const a=rows.filter(d=>d.partition===partition),first=a[0].start-24*H-15*M,tail=a.at(-1).end+48*H;
  return {partition,days:a.length,firstNominalSourceUtc:iso(first),lastServiceEndUtc:iso(tail-48*H),allocatedTailUtc:iso(tail),spanHours:(tail-first)/H,
   horizons:hs.map(h=>{let ts=[];for(const d of a)for(const s of d.segments)for(let i=Date.parse(s.startUtc);i<Date.parse(s.endUtc);i+=15*M)for(let k=0;k<4;k++)ts.push(i-h*H-15*M);
    return {horizonHours:h,templates:ts.length,nominalAgeStrictlyBelow168hAtOwnTail:ts.filter(i=>tail-i<168*H).length,nominalAgeStrictlyBelow168hAtFinalTail:ts.filter(i=>finalTail-i<168*H).length};
   })};
 });
 if(partitions.flatMap(p=>p.horizons).reduce((s,d)=>s+d.templates,0)!==6144)throw Error("HOLD_TEMPLATE_COUNT_DRIFT");
 const boundaries=P.slice(0,2).map((from,i)=>{const to=P[i+1],a=rows.filter(d=>d.partition===from),b=rows.find(d=>d.partition===to),tail=a.at(-1).end+48*H;
  return {from,to,previousAllocatedTailUtc:iso(tail),horizons:hs.map(h=>{const t=b.start-h*H;return {horizonHours:h,firstNominalIssueUtc:iso(t),priorTailAfterIssueHours:(tail-t)/H,priorDaysWithAllocatedTailAfterIssue:a.filter(d=>d.end+48*H>t).map(d=>d.day)};})};
 });
 if(iso(firstSource)!==c.firstSourceUtc||iso(finalTail)!==c.allocatedOutcomeTailUtc)throw Error("HOLD_COMPACT_BOUNDARY_DRIFT");
 return {schema:"v39.phase5.compact_partition_retention_and_replay_review.v1",status:"REVIEW_ONLY_NOT_AUTH_OR_MODEL_FIT",firstSourceUtc:iso(firstSource),finalTailUtc:iso(finalTail),spanHours:(finalTail-firstSource)/H,partitions,boundaries,providerCalls:0,databaseWrites:0,actualLabelCountsMeasured:false,scientificFreezeApproved:false,phase6PaidGo:false};
}
module.exports={analyze};
if(require.main===module){const fs=require('node:fs');const {createHash}=require('node:crypto');const raw=fs.readFileSync(process.argv[2]||"data-collection/phase5/evidence/2026-11-17_compact_actual_shape_calendar_REVIEW_ONLY.json");if(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex')!=='ee17a694594356e2b0c772545c490c198db11b42')throw Error('HOLD_EXACT_COMPACT_RECEIPT_DRIFT');console.log(JSON.stringify(analyze(JSON.parse(raw).cases[0]),null,2));}
