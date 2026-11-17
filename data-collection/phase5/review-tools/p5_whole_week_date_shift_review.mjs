/** Offline REVIEW ONLY: date contingency arithmetic, never an approved stage or calendar. */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";
const specs={
  "date": {
    "path": "data-collection/phase5/planning/2026-11-15_nov22_service_start_date_only_candidate.json",
    "ref": "de15816bccb867dc17dcd396f8bedec66960e115",
    "blob": "54544099c96875d69da63c88392d0a3febf681d3"
  },
  "source": {
    "path": "data-collection/phase5/evidence/2026-11-17_primary_expiry_nominal_source_backlog_REVIEW_ONLY.json",
    "ref": "1aabd21218f202b7470f5b9a8c855da34ff0fc3e",
    "blob": "613dd8827cfb4ec06102bcc07e2c51916a9c6613"
  },
  "seed": {
    "path": "data-collection/phase5/planning/2026-11-15_actual_first_seed_43700154416.json",
    "ref": "de15816bccb867dc17dcd396f8bedec66960e115",
    "blob": "9dc34c32541cde8db1e09c8bf4a06fe0af27f389"
  }
};
export function reviewWholeWeekShift({date,source,seed},offsetDays){
 const fail=x=>{throw Error("HOLD_P5_SHIFT_REVIEW_"+x)};
 const dayMs=86400000,h=3600000,m=60000;
 const iso=x=>new Date(x).toISOString(), day=x=>iso(x).slice(0,10);
 const weekday=x=>[0,6].includes(new Date(x).getUTCDay())?"weekend":"weekday";
 if(!Number.isSafeInteger(offsetDays)||offsetDays<0||offsetDays>28||offsetDays%7!==0)fail("WHOLE_WEEK_0_TO_28_ONLY");
 if(date?.firstRunDateUtc!=="2026-11-22"||date.days?.length!==31||date.phase6PaidGo!==false||
    source?.days?.length!==31||source.totalNominalTemplates!==6144||source.paidGo!==false||
    seed?.firstRunDateUtc!==date.firstRunDateUtc||seed.workflowRunId!=="43700154416"||
    seed.dateCandidateBytesSha256!=="9be154ce8ac2d897643558ff0c575a83a33bc8a4f77768d68fdd791a73c12311"||
    seed.phase6PaidGo!==false||seed.predeclaredDailyDrawSeeds?.length!==31||
    seed.predeclaredDailyDrawSeeds.some((x,i)=>x.runDayIndex!==i+1))fail("ORIGINAL_EVIDENCE_SCOPE");
 const offset=offsetDays*dayMs;
 // Independently reconstruct the existing greedy date geometry from its 5 known
 // first-period sets; never select new airports or mutate original seed bytes.
 const pairs=date.days.slice(0,5).map(d=>d.airportsIfKnown);
 const slots=["HUB","MID_A","MID_B","REGIONAL"];
 if(pairs.some(p=>!p||slots.some(s=>!/^[A-Z]{4}$/.test(p[s]))))fail("FIXED_PAIR_INPUT");
 const chosen=[],previous=new Map(),classes=new Map();
 let lastMidnight=Date.parse(date.firstRunDateUtc+"T00:00:00.000Z")+offset-dayMs,lastEnd=-Infinity;
 const base=lastMidnight+dayMs;
 for(let i=0;i<31;i++){
  const n=i+1,p=n<=5?n-1:n>=7&&n<=11?n-7:null,period=p===null?null:n<=5?1:2;
  let found=false;
  for(let midnight=lastMidnight+dayMs;midnight<base+120*dayMs;midnight+=dayMs){
   let start=midnight+((n-1)%6)*4*h,end=start+6*h;
   if(start<lastEnd||(period===2&&weekday(midnight)!==classes.get(p))||
      (p!==null&&slots.some(s=>start-(previous.get(pairs[p][s])??-Infinity)<dayMs)))continue;
   let old=date.days[i];
   if(old.runDayIndex!==n||start!==Date.parse(old.conservativeStartUtc)+offset||
      end!==Date.parse(old.conservativeEndUtc)+offset||weekday(midnight)!==old.weekdayClass||
      old.crossoverPeriod!==period||old.pairId!==(p===null?null:"pair-"+(p+1))||
      JSON.stringify(old.airportsIfKnown)!==JSON.stringify(p===null?null:pairs[p]))fail("GREEDY_TRANSLATION_DRIFT");
   chosen.push({n,start,shape:source.days[i].shape,p,period});lastMidnight=midnight;lastEnd=end;
   if(p!==null){if(period===1)classes.set(p,weekday(midnight));for(const s of slots)previous.set(pairs[p][s],end);}
   found=true;break;
  }
  if(!found)fail("NO_TRANSLATED_GEOMETRY");
 }
 const shapes={N:0,S:0,E:0},physical=new Map(),activeDates=new Set(),outcomeDates=new Set(),events=[],endpoints=[];
 let segmentCount=0,exposedHours=0;
 function dateRange(a,b,out){for(let t=Date.parse(day(a)+"T00:00:00.000Z");t<=b;t+=dayMs)out.add(day(t))}
 for(const d of chosen){
  const original=source.days[d.n-1];
  if(original.day!==d.n||!Object.hasOwn(shapes,d.shape)||Date.parse(original.start)!==d.start-offset-24*h-15*m||
     original.count!==(d.shape==="E"?288:192)||(d.p===null&&d.shape!=="N"))fail("ORIGINAL_TEMPLATE_SHAPE");
  shapes[d.shape]++;
  const segments=d.shape==="S"?[[0,2],[3,5]]:[[0,d.shape==="E"?6:4]];
  segmentCount+=segments.length;
  for(const [lo,hi] of segments){
   let a=d.start+lo*h,b=d.start+hi*h;exposedHours+=hi-lo;endpoints.push(b);
   dateRange(a,b-1,activeDates);dateRange(a,b+48*h,outcomeDates);
   for(let p=a;p<b;p+=4*h){
    let end=Math.min(b,p+4*h);
    for(const horizon of [24,6,1.5])for(let at=p-horizon*h-15*m;at<end-horizon*h-15*m;at+=15*m){
     const key=day(at),row=physical.get(key)??{base:0,split:0};
     row[p===a?"base":"split"]+=8;physical.set(key,row);
     events.push({at,units:8});
    }
   }
  }
 }
 if(shapes.N!==26||shapes.S!==3||shapes.E!==2||segmentCount!==34||exposedHours!==128||events.length*4!==6144)fail("ORIGINAL_DESIGN_COUNTS");
 const chargeDates=[...new Set([...physical.keys(),...outcomeDates])].sort();
 const rows=chargeDates.map(dateUtc=>{
  const {base,split}=physical.get(dateUtc)??{base:0,split:0};
  const categories={BASE_FIDS:base,SPLIT_FIDS:split,RETRY:2*Math.ceil((base+split)/20),VALIDATION:activeDates.has(dateUtc)?16:0,OUTCOME:outcomeDates.has(dateUtc)?640:0,HISTORY:0,DIAGNOSTIC:8};
  return {dateUtc,categories,total:Object.values(categories).reduce((a,b)=>a+b,0)}
 });
 const totals={};for(const r of rows)for(const [k,v] of Object.entries(r.categories))totals[k]=(totals[k]??0)+v;
 const reserve=rows.reduce((s,r)=>s+r.total,0),peak=Math.max(...rows.map(r=>r.total));
 if(reserve!==41960||peak!==1228||rows.length!==47||totals.BASE_FIDS!==11904||totals.SPLIT_FIDS!==384||totals.RETRY!==1280||totals.VALIDATION!==496||totals.OUTCOME!==27520||totals.HISTORY!==0||totals.DIAGNOSTIC!==376)fail("BUDGET_PARITY");
 const resets=["2026-12-04T02:21:21.000Z","2027-01-04T02:21:21.000Z","2027-02-04T02:21:21.000Z"];
 const cycleReview=resets.map(reset=>{
  const boundary=day(Date.parse(reset));let prior=0,resetDay=0,after=0;
  for(const r of rows){if(r.dateUtc<boundary)prior+=r.total;else if(r.dateUtc===boundary)resetDay+=r.total;else after+=r.total;}
  return {reset,observedDateOnly:reset===resets[0],prior,resetDay,after,conservativeBefore:prior+resetDay,conservativeAfter:after+resetDay,
   sourceUnitsBefore:events.filter(e=>e.at<Date.parse(reset)).reduce((s,e)=>s+e.units,0)};
 });
 const cycleWindows=[null,...resets,null].slice(0,-1).map((start,i)=>{
  const end=[...resets,null][i];
  const first=start?day(Date.parse(start)):"0000-01-01",last=end?day(Date.parse(end)):"9999-12-31";
  return {startReset:start,endReset:end,conservativeUnitsIncludingEntireBoundaryDates:rows.filter(r=>r.dateUtc>=first&&r.dateUtc<=last).reduce((s,r)=>s+r.total,0)};
 });
 const first=chosen[0].start,last=chosen.at(-1).start;
 const firstSource=Math.min(...events.map(x=>x.at)),lastSource=Math.max(...events.map(x=>x.at)),tail=Math.max(...endpoints)+48*h;
 return {offsetDays,firstServiceUtc:iso(first),lastParentStartUtc:iso(last),firstSourceUtc:iso(firstSource),strictEnableBeforeUtc:iso(first-24*h-50*m),
  firstDrawWindowOpensUtc:iso(first-72*h),firstDrawWindowLastInclusiveUtc:iso(first-24*h-45*m-1),lastSourceUtc:iso(lastSource),outcomeTailUtc:iso(tail),linkedCorpusSpanHours:(tail-firstSource)/h,
  shapeCounts:shapes,segmentCount,exposedHours,trainingDays:20,validationDays:5,testDays:6,pairedParents:10,ordinaryFutureDraws:21,nominalSourceTemplates:events.length*4,chargeDates:rows.length,totalReserve:reserve,peakDailyReserve:peak,categoryTotals:totals,cycleReview,cycleWindows,
  originalSeedDateBindingPreservedAsHistorical:true,newDateCommitmentOrApprovalCreated:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
}
export function readExactInputs(){return Object.fromEntries(Object.entries(specs).map(([k,s])=>{const b=readFileSync(s.path);const h=createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex");if(h!==s.blob)throw Error("HOLD_EXACT_ORIGINAL_BLOB");return[k,JSON.parse(b.toString("utf8"))]}))}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){if(process.argv.length!==2)throw Error("HOLD_REVIEW_ONLY_NO_OVERRIDE");console.log(JSON.stringify([0,7,14,21,28].map(n=>reviewWholeWeekShift(readExactInputs(),n)),null,2));}
