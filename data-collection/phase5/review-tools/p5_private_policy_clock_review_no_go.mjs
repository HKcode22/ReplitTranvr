#!/usr/bin/env node
// Review only: run from exact checked-out repository root. Reads planning metadata only.
// No SQL, HTTP, secrets, approval, writes or activation. Native POST +60/+20 is a scenario.
import {readFileSync} from 'node:fs';
function audit(d){
 const assert=(x)=>{if(!x)throw Error("INVALID_REVIEW_GEOMETRY")};
 assert(d&&d.schema==="v39.phase6.reviewed-future-day-source-plan.v1"&&Number.isSafeInteger(d.runDayIndex)&&d.runDayIndex>=1&&d.runDayIndex<=31&&Array.isArray(d.templates)&&[192,288].includes(d.templates.length));
 const time=s=>{const t=Date.parse(s);assert(Number.isFinite(t)&&new Date(t).toISOString()===s);return t};
 const m=60000,h=60*m;
 const first=Math.min(...d.templates.map(x=>time(x.scheduledRequestUtc)));
 const last=Math.max(...d.templates.map(x=>{
    const q=time(x.scheduledRequestUtc),c=time(x.earliestPlannedCutoffUtc);
    assert(x.runDayIndex===d.runDayIndex&&c-q===15*m&&x.maxResponseAndPersistSeconds===180);
    return Math.min(q+m,c-x.maxResponseAndPersistSeconds*1000-120000)
 }));
 const end=Math.max(...d.templates.map(x=>time(x.serviceWindowEndUtc)));
 const shape=d.reviewedSegmentedSource?.windowShape;
 assert(["4h","2x2h","up-to-6h"].includes(shape)&&end-time(d.expectedServiceStartUtc)==={"4h":4,"2x2h":5,"up-to-6h":6}[shape]*h);
 assert(first===time(d.expectedServiceStartUtc)-24*h-15*m);
 const windows={sourceHardLatestMinutes:(last-first)/m,illustrativeNativePostEndMinutes:(end+80*m-first)/m,allocatedOutcomeTailEndMinutes:(end+48*h-first)/m};
 return {runDayIndex:d.runDayIndex,shape,sourceQueries:d.templates.length,...windows,minimumLifetimeByPreparationLead:[20,90,120,180].map(lead=>({leadMinutes:lead,...Object.fromEntries(Object.entries(windows).map(([k,v])=>[k,v+lead]))})),sourceFits24hAtAnyProspectivePreparation:false,providerContentRetentionChanged:false};
}
function summarize(rows){
 if(rows.length!==31||new Set(rows.map(r=>r.runDayIndex)).size!==31||rows.reduce((n,r)=>n+r.sourceQueries,0)!==6144)throw Error("INCOMPLETE_31_DAY_AUDIT");
 const profiles=[24,30,36,48,72,84].map(hours=>{const lead=180;let src=0,post=0,tail=0;for(const r of rows){src+=Number(r.sourceHardLatestMinutes+lead<hours*60);post+=Number(r.illustrativeNativePostEndMinutes+lead<hours*60);tail+=Number(r.allocatedOutcomeTailEndMinutes+lead<hours*60)}return {hours,leadMinutes:lead,sourceDays:src,illustrativeNativePostDays:post,allocatedTailDays:tail}});
 return {schema:"v39.phase5.private-policy-clock-review-only.v1",status:"GEOMETRY_ONLY_NOT_APPROVED_POLICY",dayCount:31,sourceQueries:6144,profiles,rows,rawFidsMaxHoursUnchanged:24,operationalSourceAccessMaxHoursUnchanged:23,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
}
const rows=Array.from({length:31},(_,i)=>audit(JSON.parse(readFileSync('data-collection/phase5/planning/phase6-source-day-'+String(i+1).padStart(2,'0')+'.json','utf8'))));
console.log(JSON.stringify(summarize(rows),null,2));
