/** V3.9-f.8 Gate-2 Stage-2 promotion owner. Pure selection; no provider calls. */
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { anchorScore, carrierScore, geoScore, trafficScore } from "./adbAirportCatalog_v3";

export interface FrozenProbeCandidate {
  icao:string; region:string; tier:string; preEligible:boolean; postEligible:boolean;
  trafficMetricValue:number; degree:number; effectiveCarriers:number; intlShare:number; regionShare:number;
}
export interface FrozenProbeArtifact {
  version:string; shortlist:FrozenProbeCandidate[]; replacements:FrozenProbeCandidate[];
  hubCutMetric:number; degreeCap:number; carriersCap:number;
}
export interface Stage1ProbeEvidence {
  icao:string; status:string; rowsPerHour:number|null; uniqueFlightsPerCredit:number|null;
  tailChainLinksPerCredit:number|null; stability:number|null;
  confirmedUniqueLower:number|null; confirmedPlusAmbiguousUpper:number|null;
}
export interface PromotionRow { icao:string; anchorScore:number; yieldScore:number; capacityPass:boolean; ambiguityInvariant:boolean }
export interface PromotionResult { selected:string[]; ranked:PromotionRow[]; replacementsNeeded:number; artifactHash:string }

function clamp01(x:number){return Math.max(0,Math.min(1,x));}
function sha(raw:string){return createHash("sha256").update(raw).digest("hex");}
export function loadFrozenProbeArtifact(path:string, expectedHash:string):{artifact:FrozenProbeArtifact;artifactHash:string}{
  if(!/^[a-f0-9]{64}$/i.test(expectedHash))throw new Error("REFUSED: invalid expected preprobe artifact hash");
  const raw=readFileSync(path,"utf8"),actual=sha(raw);if(actual!==expectedHash.toLowerCase())throw new Error(`REFUSED: preprobe artifact hash mismatch expected=${expectedHash} actual=${actual}`);
  const p=JSON.parse(raw) as FrozenProbeArtifact;
  if(!Array.isArray(p.shortlist)||p.shortlist.length!==12)throw new Error(`REFUSED: Stage-1 shortlist must contain exactly 12 candidates`);
  const names=p.shortlist.map(x=>String(x.icao).toUpperCase());if(new Set(names).size!==12)throw new Error("REFUSED: Stage-1 shortlist contains duplicate ICAO");
  for(const must of ["WSSS","OMAA"])if(!names.includes(must))throw new Error(`REFUSED: required calibration candidate ${must} missing`);
  for(const c of [...p.shortlist,...(p.replacements??[])]){
    if(c.tier!=="HUB"||c.preEligible!==true||c.postEligible!==true)throw new Error(`REFUSED: ${c.icao} is not frozen dual-eligible HUB`);
    if(!c.region)throw new Error(`REFUSED: ${c.icao} has no frozen region`);
  }
  if(!(p.hubCutMetric>0&&p.degreeCap>0&&p.carriersCap>0))throw new Error("REFUSED: frozen normalization caps invalid");
  return{artifact:p,artifactHash:actual};
}

function calibration(rows:Stage1ProbeEvidence[]):Stage1ProbeEvidence{
  const b=rows.find(r=>r.icao==="WSSS"&&r.status==="completed")??rows.find(r=>r.icao==="OMAA"&&r.status==="completed");
  if(!b)throw new Error("REFUSED: no completed WSSS/OMAA calibration baseline");
  if(!(b.uniqueFlightsPerCredit!>0)||!(b.tailChainLinksPerCredit!>0)||!(b.stability!>0))throw new Error("REFUSED: calibration baseline has invalid yield components");
  return b;
}
function yieldScore(r:Stage1ProbeEvidence,b:Stage1ProbeEvidence):number|null{
  if(r.uniqueFlightsPerCredit===null||r.tailChainLinksPerCredit===null||r.stability===null)return null;
  return (clamp01(r.uniqueFlightsPerCredit/b.uniqueFlightsPerCredit!)+clamp01(r.tailChainLinksPerCredit/b.tailChainLinksPerCredit!)+clamp01(r.stability/b.stability!))/3;
}
function ambiguityOrder(rows:Stage1ProbeEvidence[],key:"confirmedUniqueLower"|"confirmedPlusAmbiguousUpper"):string[]{
  return rows.filter(r=>r[key]!==null).sort((a,b)=>(b[key]!-a[key]!)||a.icao.localeCompare(b.icao)).map(r=>r.icao);
}
export function ambiguityRankingInvariant(rows:Stage1ProbeEvidence[]):boolean{
  if(rows.some(r=>r.confirmedUniqueLower===null||r.confirmedPlusAmbiguousUpper===null))return false;
  const a=ambiguityOrder(rows,"confirmedUniqueLower"),b=ambiguityOrder(rows,"confirmedPlusAmbiguousUpper");return a.length===b.length&&a.every((v,i)=>v===b[i]);
}

/** Exact Stage-2 promotion: capacity pass + valid score + global ambiguity-rank invariance + lexical tie. */
export function selectStage2Top5(artifact:FrozenProbeArtifact,evidence:Stage1ProbeEvidence[]):PromotionResult{
  const baseline=calibration(evidence);
  const member=new Map(artifact.shortlist.map(c=>[c.icao,c]));
  const completed=evidence.filter(r=>r.status==="completed"&&member.has(r.icao));
  if(!ambiguityRankingInvariant(completed))throw new Error("INSUFFICIENT_IDENTITY_RESOLUTION: Stage-1 ranking is not invariant under ambiguity bounds");
  const ranked:PromotionRow[]=[];
  for(const r of completed){
    const c=member.get(r.icao)!;const y=yieldScore(r,baseline);if(y===null)continue;
    const capacityPass=(r.rowsPerHour??-Infinity)>=60;if(!capacityPass)continue;
    const t=trafficScore(c.trafficMetricValue,artifact.hubCutMetric),g=geoScore(c.degree/artifact.degreeCap,c.intlShare,clamp01(1-c.regionShare)),car=carrierScore(c.effectiveCarriers/artifact.carriersCap,c.intlShare),score=anchorScore(t,g,car,y);
    if(score!==null)ranked.push({icao:r.icao,anchorScore:score,yieldScore:y,capacityPass:true,ambiguityInvariant:true});
  }
  ranked.sort((a,b)=>b.anchorScore-a.anchorScore||a.icao.localeCompare(b.icao));
  const selected=ranked.slice(0,5).map(r=>r.icao);
  return{selected,ranked,replacementsNeeded:Math.max(0,5-selected.length),artifactHash:""};
}
