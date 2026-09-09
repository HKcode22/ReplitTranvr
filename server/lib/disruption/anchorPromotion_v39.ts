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
export interface PromotionRow { icao:string; anchorScore:number; yieldScore:number; capacityPass:boolean; ambiguityInvariant:boolean; source:"shortlist"|"replacement" }
export interface PromotionResult { selected:string[]; ranked:PromotionRow[]; nextReplacement:string|null; replacementsNeeded:number }

function clamp01(x:number){return Math.max(0,Math.min(1,x));}
function sha(raw:string){return createHash("sha256").update(raw).digest("hex");}
export function loadFrozenProbeArtifact(path:string, expectedHash:string):{artifact:FrozenProbeArtifact;artifactHash:string}{
  if(!/^[a-f0-9]{64}$/i.test(expectedHash))throw new Error("REFUSED: invalid expected preprobe artifact hash");
  const raw=readFileSync(path,"utf8"),actual=sha(raw);if(actual!==expectedHash.toLowerCase())throw new Error(`REFUSED: preprobe artifact hash mismatch expected=${expectedHash} actual=${actual}`);
  const p=JSON.parse(raw) as FrozenProbeArtifact;
  if(!Array.isArray(p.shortlist)||p.shortlist.length!==12)throw new Error("REFUSED: Stage-1 shortlist must contain exactly 12 candidates");
  p.replacements=Array.isArray(p.replacements)?p.replacements:[];
  const primary=p.shortlist.map(x=>String(x.icao).toUpperCase());
  const all=[...p.shortlist,...p.replacements].map(x=>String(x.icao).toUpperCase());
  if(new Set(primary).size!==12||new Set(all).size!==all.length)throw new Error("REFUSED: frozen shortlist/replacement ICAOs are not unique");
  for(const must of ["WSSS","OMAA"])if(!primary.includes(must))throw new Error(`REFUSED: required calibration candidate ${must} missing`);
  for(const c of [...p.shortlist,...p.replacements]){
    c.icao=String(c.icao).toUpperCase();
    if(c.tier!=="HUB"||c.preEligible!==true||c.postEligible!==true)throw new Error(`REFUSED: ${c.icao} is not frozen dual-eligible HUB`);
    if(!c.region)throw new Error(`REFUSED: ${c.icao} has no frozen region`);
    if(![c.trafficMetricValue,c.degree,c.effectiveCarriers,c.intlShare,c.regionShare].every(Number.isFinite))throw new Error(`REFUSED: ${c.icao} has invalid frozen exogenous inputs`);
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
  return [...rows].sort((a,b)=>(b[key]!-a[key]!)||a.icao.localeCompare(b.icao)).map(r=>r.icao);
}
export function ambiguityRankingInvariant(rows:Stage1ProbeEvidence[]):boolean{
  if(!rows.length||rows.some(r=>r.confirmedUniqueLower===null||r.confirmedPlusAmbiguousUpper===null))return false;
  const a=ambiguityOrder(rows,"confirmedUniqueLower"),b=ambiguityOrder(rows,"confirmedPlusAmbiguousUpper");return a.every((v,i)=>v===b[i]);
}
function scoreRows(artifact:FrozenProbeArtifact,evidence:Stage1ProbeEvidence[],candidates:FrozenProbeCandidate[],baseline:Stage1ProbeEvidence,source:"shortlist"|"replacement"):PromotionRow[]{
  const member=new Map(candidates.map(c=>[c.icao,c]));
  const completed=evidence.filter(r=>r.status==="completed"&&member.has(r.icao));
  if(completed.length&&!ambiguityRankingInvariant(completed))throw new Error(`INSUFFICIENT_IDENTITY_RESOLUTION: ${source} ranking is not invariant under ambiguity bounds`);
  const ranked:PromotionRow[]=[];
  for(const r of completed){
    const c=member.get(r.icao)!;const y=yieldScore(r,baseline);if(y===null)continue;
    if((r.rowsPerHour??-Infinity)<60)continue;
    const t=trafficScore(c.trafficMetricValue,artifact.hubCutMetric);
    const g=geoScore(c.degree/artifact.degreeCap,c.intlShare,clamp01(1-c.regionShare));
    const car=carrierScore(c.effectiveCarriers/artifact.carriersCap,c.intlShare);
    const score=anchorScore(t,g,car,y);if(score!==null)ranked.push({icao:r.icao,anchorScore:score,yieldScore:y,capacityPass:true,ambiguityInvariant:true,source});
  }
  return ranked;
}
/**
 * Rank Stage-1-valid primary candidates, then consume already-completed frozen
 * replacements only when fewer than five primary candidates survive. If the
 * next ordered replacement has not completed Stage 1, return it explicitly so
 * Stage 2 cannot skip ahead or silently proceed with fewer than five.
 */
export function selectStage2Top5(artifact:FrozenProbeArtifact,evidence:Stage1ProbeEvidence[]):PromotionResult{
  const baseline=calibration(evidence);
  let ranked=scoreRows(artifact,evidence,artifact.shortlist,baseline,"shortlist");
  ranked.sort((a,b)=>b.anchorScore-a.anchorScore||a.icao.localeCompare(b.icao));
  let nextReplacement:string|null=null;
  if(ranked.length<5){
    for(const replacement of artifact.replacements){
      const ev=evidence.find(r=>r.icao===replacement.icao&&r.status==="completed");
      if(!ev){nextReplacement=replacement.icao;break;}
      const add=scoreRows(artifact,evidence,[replacement],baseline,"replacement");
      ranked=[...ranked,...add].sort((a,b)=>b.anchorScore-a.anchorScore||a.icao.localeCompare(b.icao));
      if(ranked.length>=5)break;
    }
  }
  const selected=ranked.slice(0,5).map(r=>r.icao);
  return{selected,ranked,nextReplacement,replacementsNeeded:Math.max(0,5-selected.length)};
}
