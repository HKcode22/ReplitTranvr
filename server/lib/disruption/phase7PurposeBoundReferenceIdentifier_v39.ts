/** Article 5.8 reference-identifier review candidate. Separate from Packet B.
 * Identifier-only, item/purpose-scoped resolution; no bulk list, schedule,
 * observation, outcome, releaseRowId or source-record reconstruction.
 * Format validity is not proof of authentic provider provenance or permission.
 */
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const H=/^[a-f0-9]{64}$/;
const types={
 airport_iata:/^[A-Z]{3}$/,
 airport_icao:/^[A-Z]{4}$/,
 airline_iata:/^[A-Z0-9]{2}$/,
 airline_icao:/^[A-Z]{3}$/,
 aircraft_type_iata:/^[A-Z0-9]{3}$/,
 aircraft_type_icao:/^[A-Z0-9]{2,4}$/,
 flight_designator:/^[A-Z0-9]{2,3}[0-9]{1,4}[A-Z]?$/,
 aircraft_registration:/^[A-Z0-9]{1,6}(?:-[A-Z0-9]{1,6})?$/,
 aircraft_icao24:/^[0-9A-F]{6}$/,
 api_retrieval_identifier:/^[A-Za-z0-9_-]{1,128}$/
} as const;
type Kind=keyof typeof types;
type Purpose="identify"|"link"|"retrieve";
export interface Phase7ReferenceIdentifierScope {
 schema:"v39.phase7.reference-identifier-scope.v1";
 itemScopeId:string;
 kind:Kind;
 purpose:Purpose;
 value:string;
 termsReviewSha256:string;
 purposeReviewSha256:string;
 independentScopeApproved:true;
}
const keys=["schema","itemScopeId","kind","purpose","value","termsReviewSha256","purposeReviewSha256","independentScopeApproved"];
const fail=()=>{throw Error("PHASE7_REFERENCE_SCOPE_REJECTED")};
const validHash=(x:unknown)=>typeof x==="string"&&H.test(x)&&!/^([a-f0-9])\1{63}$/.test(x);
/** One item only. The caller must authenticate the actual independent
 * purpose decision and original reference field, and ensure no substitute
 * dataset can be manufactured across calls. Never pass this to Packet B. */
export function admitPurposeBoundReferenceIdentifier(input:unknown):Readonly<Phase7ReferenceIdentifierScope>{
 if(!input||typeof input!=="object"||Array.isArray(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input))||
    Object.keys(input).length!==keys.length||keys.some(k=>!Object.hasOwn(input,k)))fail();
 const x=input as Phase7ReferenceIdentifierScope;
 if(x.schema!=="v39.phase7.reference-identifier-scope.v1"||typeof x.itemScopeId!=="string"||!UUID.test(x.itemScopeId)||
    typeof x.kind!=="string"||!Object.hasOwn(types,x.kind)||!["identify","link","retrieve"].includes(x.purpose)||
    typeof x.value!=="string"||!types[x.kind].test(x.value)||
    (x.kind==="api_retrieval_identifier"&&x.purpose!=="retrieve")||
    !validHash(x.termsReviewSha256)||!validHash(x.purposeReviewSha256)||x.independentScopeApproved!==true)fail();
 return Object.freeze({...x});
}
export const PHASE7_REFERENCE_BOUNDARY=Object.freeze({packetBOutput:false,sourceArchive:false,bulkExport:false,perFlightTrainingLinkApproved:false,providerCalls:0,authorizationEnabled:false,phase6PaidGo:false});
