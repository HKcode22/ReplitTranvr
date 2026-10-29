/**
 * Gate05 finite live ADS-B research continuity assessor (pure, zero I/O).
 * Repeated ICAO24 observations are aircraft candidates, never confirmed
 * operating flights or actual wheels-off time. Aggregate output is anonymous.
 */
import type {Gate05AdsbResultV39} from "./gate05ZeroCostAdsbEvidence_v39";

export type Gate05AdsbContinuityV39=Readonly<{
  schema:"v39.gate05.adsb-prospective-continuity.v1";
  snapshotCount:number;originalAircraftRows:number;freshPositionObservations:number;
  uniqueAircraftCandidates:number;repeatedAircraftCandidates:number;
  plausibleConsecutiveSegments:number;implausibleJumpSegments:number;
  duplicateOrNonmonotoneSegments:number;maxObservedGapSeconds:number;
  source:"adsb.lol";license:"ODbL-1.0";
  physicalOperatingFlightMatchesCertified:false;
  scheduledWheelsOffCertified:false;actualWheelsOffCertified:false;
}>;

const rad=Math.PI/180;
function nm(a:number,b:number,c:number,d:number):number{
  const z=Math.sin((c-a)*rad/2)**2+
    Math.cos(a*rad)*Math.cos(c*rad)*Math.sin((d-b)*rad/2)**2;
  return 3440.0695*2*Math.asin(Math.sqrt(Math.min(1,z)));
}

/** No raw aircraft keys, coordinates or callsigns escape this function. */
export function summarizeGate05AdsbContinuityV39(
  samples:readonly Gate05AdsbResultV39[]
):Gate05AdsbContinuityV39{
  if(samples.length>6)throw Error("GATE05_FREE_SAMPLE_CAP_EXCEEDED");
  const byHex=new Map<string,{lat:number;lon:number;ms:number;count:number}>();
  let fresh=0,rows=0,plausible=0,implausible=0,duplicate=0,maxGap=0;
  for(const sample of samples){
    if(sample.provider!=="adsb.lol"||sample.httpGetCalls!==0||
       sample.databaseWrites!==0||sample.points.length>sample.originalRows)
      throw Error("GATE05_FREE_SAMPLE_PROVENANCE_HOLD");
    rows+=sample.originalRows;
    fresh+=sample.points.length;
    const seenInSample=new Set<string>();
    for(const p of sample.points){
      if(seenInSample.has(p.icao24Hex)){duplicate++;continue;}
      seenInSample.add(p.icao24Hex);
      const ms=Date.parse(p.approximatePositionUtc);
      if(!Number.isFinite(ms)||Date.parse(p.receivedAtUtc)<ms-5000)
        throw Error("GATE05_FREE_SAMPLE_CLOCK_HOLD");
      const old=byHex.get(p.icao24Hex);
      if(!old){byHex.set(p.icao24Hex,{lat:p.lat,lon:p.lon,ms,count:1});continue;}
      const dt=(ms-old.ms)/1000;
      if(dt<=0){duplicate++;continue;}
      maxGap=Math.max(maxGap,dt);
      // 800 kt + 1 nm tolerance is deliberately generous; NOT a truth label.
      const distance=nm(old.lat,old.lon,p.lat,p.lon);
      if(dt>900||distance>(800*dt/3600)+1)implausible++;
      else plausible++;
      byHex.set(p.icao24Hex,{lat:p.lat,lon:p.lon,ms,count:old.count+1});
    }
  }
  return {
    schema:"v39.gate05.adsb-prospective-continuity.v1",
    snapshotCount:samples.length,originalAircraftRows:rows,
    freshPositionObservations:fresh,uniqueAircraftCandidates:byHex.size,
    repeatedAircraftCandidates:[...byHex.values()].filter(x=>x.count>=2).length,
    plausibleConsecutiveSegments:plausible,implausibleJumpSegments:implausible,
    duplicateOrNonmonotoneSegments:duplicate,maxObservedGapSeconds:maxGap,
    source:"adsb.lol",license:"ODbL-1.0",
    physicalOperatingFlightMatchesCertified:false,
    scheduledWheelsOffCertified:false,actualWheelsOffCertified:false
  };
}