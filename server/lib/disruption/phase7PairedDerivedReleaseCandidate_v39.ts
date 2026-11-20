import {randomUUID} from "node:crypto";
import {buildPhase7DerivedReleasePacket,type Phase7ApprovedDerivedInput} from "./phase7DerivedReleaseWriter_v39";
import {hashPhase7DerivedReleasePacket,type Phase7DerivedReleasePacket} from "./phase6DerivedTrainingReleasePacket_v39";
import type {Phase7DerivedReleaseContract,Phase6ReleaseHorizon,Phase7ReleaseSplit} from "./phase6DerivedTrainingReleaseContract_v39";

type Group = readonly Phase7ApprovedDerivedInput[];
export interface Phase7PairedDerivedAssociation {
  groupId:string;
  split:Phase7ReleaseSplit;
  rows:readonly {horizon:Phase6ReleaseHorizon;releaseRowId:string}[];
}
export interface Phase7PairedDerivedCandidate {
  packet:Phase7DerivedReleasePacket;
  association:{
    schema:"v39.phase7.paired-derived-association-candidate.v1";
    packetSha256:string;
    reviewEvidenceSha256:string;
    groups:readonly Phase7PairedDerivedAssociation[];
    sourceMappingPersisted:false;
    approvedForUse:false;
  };
}
const fail=(why:string):never=>{throw Error("PHASE7_PAIRED_CANDIDATE_REJECTED:"+why);};
const canonicalHorizons=["T-24h","T-6h","T-90m"] as const;
const validReview=(s:string)=>typeof s==="string"&&/^[a-f0-9]{64}$/.test(s)&&!/^([a-f0-9])\1{63}$/.test(s);
/**
 * Groups are built while the authenticated per-leg source binding is still
 * available. Caller must verify that binding and globally deduplicate across
 * packets. This pure representation never accepts a provider leg identifier,
 * cannot independently prove input membership, and grants no retention right.
 * Every horizon must be represented, including missing/censored/not_due.
 * Associations are an explicit candidate for reconstruction-risk review, not
 * approved long-term output. A groupId is generated here, not a source hash.
 */
export function buildPhase7PairedDerivedCandidate(
  contract:Phase7DerivedReleaseContract,
  groups:readonly Group[],
  reviewEvidenceSha256:string
):Phase7PairedDerivedCandidate {
  if(!validReview(reviewEvidenceSha256)||!Array.isArray(groups)||groups.length===0||groups.length>33333)
    fail("scope");
  if(contract.allowedHorizons.length!==3||canonicalHorizons.some(h=>!contract.allowedHorizons.includes(h)))
    fail("canonical-horizons-required");
  const flat:Phase7ApprovedDerivedInput[]=[];
  for(const group of groups){
    if(!Array.isArray(group)||group.length!==3||new Set(group.map(x=>x?.horizon)).size!==3||
       canonicalHorizons.some(h=>!group.some(x=>x?.horizon===h)))fail("incomplete-or-duplicate-horizon");
    if(group.some(x=>x.split!==group[0].split||x.cohortBucket!==group[0].cohortBucket))
      fail("paired-split-or-cohort-drift");
    for(const h of canonicalHorizons)flat.push(group.find(x=>x.horizon===h)!);
  }
  const packet=buildPhase7DerivedReleasePacket(contract,flat);
  const associationGroups:Phase7PairedDerivedAssociation[]=groups.map((_,i)=>{
    const rows=packet.rows.slice(i*3,i*3+3);
    return {groupId:randomUUID(),split:rows[0].split,rows:rows.map(x=>({horizon:x.horizon,releaseRowId:x.releaseRowId}))};
  });
  return {packet,association:{schema:"v39.phase7.paired-derived-association-candidate.v1",
    packetSha256:hashPhase7DerivedReleasePacket(packet),reviewEvidenceSha256,
    groups:associationGroups,sourceMappingPersisted:false,approvedForUse:false}};
}
