/**
 * Shared portable Worker/Node WebCrypto HMAC envelope for OFFLINE Stage1 tests.
 * Not wired into published Replit callback, not a real provider signature.
 */
export type EdgeProvenanceV1=Readonly<{
  v:1;sessionId:string;receiptId:string;providerAttemptId:string;
  sourceSha256:string;edgeReceivedAtUtc:string;
}>;
const encode=new TextEncoder();
function valid(v:EdgeProvenanceV1):boolean {
  return v.v===1 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.sessionId)&&
    /^[a-f0-9]{64}$/.test(v.receiptId)&&
    /^[a-f0-9]{64}$/.test(v.sourceSha256)&&
    /^[a-zA-Z0-9_.:-]{1,160}$/.test(v.providerAttemptId)&&
    Number.isFinite(Date.parse(v.edgeReceivedAtUtc)) &&
    new Date(v.edgeReceivedAtUtc).toISOString()===v.edgeReceivedAtUtc;
}
export function envelopeCanonicalV1(v:EdgeProvenanceV1):string {
  if(!valid(v))throw new Error("EDGE_PROVENANCE_INVALID");
  return ["p2g-edge-receipt-v1",v.sessionId,v.receiptId,
    v.providerAttemptId,v.sourceSha256,v.edgeReceivedAtUtc].join("\n");
}
async function macHex(v:EdgeProvenanceV1,secret:string):Promise<string> {
  if(secret.length<48)throw new Error("EDGE_SIGNING_KEY_TOO_SHORT");
  const key=await crypto.subtle.importKey(
    "raw",encode.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]
  );
  const raw=await crypto.subtle.sign("HMAC",key,encode.encode(envelopeCanonicalV1(v)));
  return [...new Uint8Array(raw)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
export async function signEdgeProvenanceV1(v:EdgeProvenanceV1,secret:string){
  return macHex(v,secret);
}
export async function verifyEdgeProvenanceV1(
  v:EdgeProvenanceV1,secret:string,provided:string,
  expected:{sessionId:string;receiptId:string;sourceSha256:string}
):Promise<boolean>{
  if(!/^[a-f0-9]{64}$/.test(provided))return false;
  if(v.sessionId!==expected.sessionId||v.receiptId!==expected.receiptId||
     v.sourceSha256!==expected.sourceSha256)return false;
  let actual:string;
  try{actual=await macHex(v,secret)}catch{return false}
  const a=encode.encode(actual),b=encode.encode(provided);
  let diff=0;
  for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
  return diff===0;
}
