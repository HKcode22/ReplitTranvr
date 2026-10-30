/**
 * Reproducible content checksum for the prospective raw FIDS envelope.
 *
 * The preexisting response_hash is SHA-256 of JavaScript's insertion-ordered
 * JSON serialization. PostgreSQL jsonb can change object key order, so that
 * *historical* hash cannot reliably be recomputed after storage. This new
 * canonical hash supplements rather than replaces response_hash, and is
 * computed only for new observations.
 *
 * This is application-side consistency evidence, NOT a provider signature
 * or HTTP transport attestation. Store the hash in the same envelope; no
 * independent immutable signing authority is implied.
 */
import {createHash} from "node:crypto";

export const FIDS_CANONICAL_ENVELOPE_SCHEMA_V39 =
  "v39.fids-envelope-canonical-sha256.v1" as const;
const HASH=/^[a-f0-9]{64}$/;
const FIELD_HASH="canonicalEnvelopeSha256";
const FIELD_SCHEMA="canonicalEnvelopeHashSchema";

function object(x:unknown): x is Record<string,unknown>{
  if(x===null||typeof x!=="object"||Array.isArray(x))return false;
  const p=Object.getPrototypeOf(x);
  return p===Object.prototype||p===null;
}
function sortedJson(x:unknown):unknown{
  if(Array.isArray(x))return x.map(sortedJson);
  if(object(x)){
    const out:Record<string,unknown>={};
    for(const key of Object.keys(x).sort())out[key]=sortedJson(x[key]);
    return out;
  }
  return x;
}
export function canonicalEnvelopeSha256V39(value:unknown):string{
  if(!object(value))throw Error("FIDS_CANONICAL_ENVELOPE_NOT_OBJECT");
  const without={...value};
  delete without[FIELD_HASH];
  delete without[FIELD_SCHEMA];
  // JSON stringification here matches the payload's *actual stored JSON*
  // representation (undefined object keys stripped; no binary payloads).
  // Sorting only changes object key order, preserving arrays and values.
  const json=JSON.stringify(without);
  if(typeof json!=="string")throw Error("FIDS_CANONICAL_ENVELOPE_INVALID");
  const normalized=JSON.parse(json) as unknown;
  return createHash("sha256")
    .update(JSON.stringify(sortedJson(normalized)),"utf8").digest("hex");
}
export function addCanonicalFidsEnvelopeHashV39<T extends Record<string,unknown>>(
  value:T
):T & {canonicalEnvelopeHashSchema:typeof FIDS_CANONICAL_ENVELOPE_SCHEMA_V39;
       canonicalEnvelopeSha256:string}{
  if(FIELD_HASH in value||FIELD_SCHEMA in value)
    throw Error("FIDS_CANONICAL_ENVELOPE_FIELDS_ALREADY_PRESENT");
  return {
    ...value,
    canonicalEnvelopeHashSchema:FIDS_CANONICAL_ENVELOPE_SCHEMA_V39,
    canonicalEnvelopeSha256:canonicalEnvelopeSha256V39(value)
  };
}
export type FidsEnvelopeVerificationV39 =
  "verified"|"legacy_no_canonical_hash"|"rejected";
export function verifyCanonicalFidsEnvelopeV39(value:unknown):FidsEnvelopeVerificationV39{
  if(!object(value))return "rejected";
  const digest=value[FIELD_HASH],schema=value[FIELD_SCHEMA];
  if(digest===undefined&&schema===undefined)return "legacy_no_canonical_hash";
  if(schema!==FIDS_CANONICAL_ENVELOPE_SCHEMA_V39||
     typeof digest!=="string"||!HASH.test(digest))return "rejected";
  try{return canonicalEnvelopeSha256V39(value)===digest?"verified":"rejected";}
  catch{return "rejected";}
}
