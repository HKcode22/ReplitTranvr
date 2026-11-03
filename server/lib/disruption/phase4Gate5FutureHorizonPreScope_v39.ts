/**
 * Future owned GitHub horizon source -> read-only PRE review scope.
 *
 * The caller must independently authenticate BOTH GitHub run and frozen
 * manifest/gridded SHA. This function never grants source rights, selects a
 * provider milestone, loads a credential, modifies a database or dispatches.
 * It keeps a SOURCE receipt and its PRE denominator in the same exact
 * frozen airport/service interval/horizon rather than a generic global query.
 */
import {createHash} from "node:crypto";
import {draftP4Gate5ThreeHorizonGridV39,
 type P4Gate5GridDraftInputV39} from "./phase4Gate5FrozenGridDraft_v39";
import type {P4G5HorizonPreexpiryScopeV39}
 from "./phase4Gate5HorizonPreexpiryReadOnly_v39";
import type {P4G5CaptureHorizonV39}
 from "./phase4Gate5IndependentCapturePartition_v39";

const SHA=/^[a-f0-9]{64}$/;
const RUN=/^\d{5,25}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const H=["T-24h","T-6h","T-90m"] as const;
function hold(label:string):never{
 throw Error("P4_G5_FUTURE_PRE_SCOPE_"+label+"_HOLD");
}
function object(x:unknown,label:string):Record<string,unknown>{
 if(!x||typeof x!=="object"||Array.isArray(x))hold(label);
 return x as Record<string,unknown>;
}
function time(x:unknown,label:string):number{
 if(typeof x!=="string"||!UTC.test(x)||
    !Number.isFinite(Date.parse(x))||
    new Date(Date.parse(x)).toISOString()!==x)
  hold(label);
 return Date.parse(x);
}
export interface P4G5FuturePreScopeInputV39 {
 reviewedFrozenGridBytes:string;
 independentlyReviewedFrozenGridSha256:string;
 expectedCohortId:string;
 githubAttestedSourceRunId:string;
 githubAttestedHorizon:P4G5CaptureHorizonV39;
 actualReadAtUtc:string;
}
export function deriveP4G5FutureHorizonPreScopeV39(
 input:P4G5FuturePreScopeInputV39
):P4G5HorizonPreexpiryScopeV39{
 if(!input||typeof input.reviewedFrozenGridBytes!=="string"||
    input.reviewedFrozenGridBytes.length>20000||
    !SHA.test(input.independentlyReviewedFrozenGridSha256)||
    !RUN.test(input.githubAttestedSourceRunId)||
    !H.includes(input.githubAttestedHorizon)||
    !/^[A-Z][A-Z0-9_-]{7,79}$/.test(input.expectedCohortId))
  hold("INVALID_INPUT");
 const hash=createHash("sha256")
  .update(input.reviewedFrozenGridBytes,"utf8").digest("hex");
 if(hash!==input.independentlyReviewedFrozenGridSha256)
  hold("REVIEWED_GRID_SHA_CHANGED");
 let p:unknown;
 try{p=JSON.parse(input.reviewedFrozenGridBytes)}catch{hold("JSON");}
 const manifest=object(p,"ROOT_OBJECT");
 if(input.reviewedFrozenGridBytes!==
     JSON.stringify(manifest,null,2)+"\n"||
    Object.keys(manifest).length!==2||
    manifest.cohortId!==input.expectedCohortId)
  hold("CANONICAL_COHORT");
 const grid=object(manifest.grid,"GRID_OBJECT");
 // Reuse the binding Plan's source-grid logic. Do not silently construct
 // arbitrary T-24/T-6/T-90m cutoffs or accept a user/env-provided clock.
 const g=grid as unknown as P4Gate5GridDraftInputV39;
 const drafted=draftP4Gate5ThreeHorizonGridV39(g);
 if(drafted.queries.filter(q=>q.horizon===input.githubAttestedHorizon)
   .length!==3)
  hold("NOT_THREE_QUERY_HORIZON");
 const read=time(input.actualReadAtUtc,"AUDIT");
 const start=time(grid.serviceWindowStartUtc,"START");
 const end=time(grid.serviceWindowEndUtc,"END");
 if(read<start-48*3600000||read>end+48*3600000||
   end<=start||end-start>4*3600000)
  hold("READ_OUTSIDE_COHORT_HORIZON");
 if(typeof grid.airportIcao!=="string"||
    !/^[A-Z]{4}$/.test(grid.airportIcao))
  hold("AIRPORT");
 return {
  airportIcao:grid.airportIcao,
  serviceStartUtc:String(grid.serviceWindowStartUtc),
  serviceEndUtc:String(grid.serviceWindowEndUtc),
  reviewedManifestSha256:hash,
  horizon:input.githubAttestedHorizon,
  expectedOwnerGithubRunId:input.githubAttestedSourceRunId,
  readAtUtc:input.actualReadAtUtc
 };
}
