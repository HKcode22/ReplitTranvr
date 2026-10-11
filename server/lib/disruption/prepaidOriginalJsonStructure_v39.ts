/**
 * P04/P11 paid prepaid HTTP JSON structural admission guard.
 *
 * Pure byte-to-structure validation on the *actual capped raw request body*
 * BEFORE Express JSON.parse drops earlier duplicate object fields.
 * This is not an independent origin signature or a raw retention service.
 * The existing production persistence still stores canonicalized JSON.
 *
 * Identical literal and escaped field names (e.g. "id" / "\\u0069d")
 * are considered the SAME identity. Nested duplicates are also rejected.
 */
export function assertPrepaidOriginalJsonStructureV39(bytes:Uint8Array):void{
  if(!(bytes instanceof Uint8Array))throw Error("PREPAID_ORIGINAL_JSON_BYTES_INVALID");
  let raw:string;
  try{raw=new TextDecoder("utf-8",{fatal:true}).decode(bytes);}
  catch{throw Error("PREPAID_ORIGINAL_JSON_UTF8_INVALID");}
  let pos=0;
  const fail=():never=>{throw Error("PREPAID_ORIGINAL_JSON_STRUCTURE_INVALID");};
  const ws=()=>{while(pos<raw.length&&/[ \t\r\n]/.test(raw[pos]))pos++;};
  const str=():string=>{
    if(raw[pos]!=='"')return fail();
    const start=pos++;
    let escaped=false;
    while(pos<raw.length){
      const c=raw[pos++];
      if(!escaped&&c==='"'){
        try{return JSON.parse(raw.slice(start,pos));}
        catch{return fail();}
      }
      if(!escaped&&c==="\\")escaped=true;
      else escaped=false;
    }
    return fail();
  };
  const val=(depth:number):void=>{
    if(depth>64)throw Error("PREPAID_ORIGINAL_JSON_TOO_DEEP");
    ws();
    if(raw[pos]==='"'){str();return;}
    if(raw[pos]==="{"){
      pos++;ws();
      const keys=new Set<string>();
      if(raw[pos]==="}"){pos++;return;}
      for(;;){
        ws();const key=str();
        if(keys.has(key))throw Error("PREPAID_ORIGINAL_DUPLICATE_JSON_KEY");
        keys.add(key);
        ws();if(raw[pos++]!==":")return fail();
        val(depth+1);
        ws();const sep=raw[pos++];
        if(sep==="}")return;
        if(sep!==",")return fail();
      }
    }
    if(raw[pos]==="["){
      pos++;ws();
      if(raw[pos]==="]"){pos++;return;}
      for(;;){
        val(depth+1);
        ws();const sep=raw[pos++];
        if(sep==="]")return;
        if(sep!==",")return fail();
      }
    }
    const start=pos;
    while(pos<raw.length&&!/[,\]\}\s]/.test(raw[pos]))pos++;
    if(start===pos)return fail();
    try{
      const token=JSON.parse(raw.slice(start,pos));
      if(token!==null&&typeof token==="object")return fail();
    }catch{return fail();}
  };
  val(0);ws();
  if(pos!==raw.length)return fail();
}
