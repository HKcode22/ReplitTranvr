/**
 * P09 SYNTHETIC-ONLY upstream source admission: enforce the wire-byte cap
 * WHILE reading a streamed HTTP body, never after materializing an unbounded
 * request.arrayBuffer(). This is an availability/privacy-safety guard, not
 * proof of provider authenticity or downstream scientific completeness.
 */
export class SourceWireBodyErrorV39 extends Error {
  constructor(readonly reason:
    "SOURCE_WIRE_TOO_LARGE"|"SOURCE_WIRE_LENGTH_INVALID"|
    "SOURCE_WIRE_LENGTH_MISMATCH"|"SOURCE_WIRE_READ_FAILED") {
    super(reason);
    this.name="SourceWireBodyErrorV39";
  }
}

export async function readBoundedSourceWireV39(
  request:Pick<Request,"body"|"headers">,
  capBytes:number
):Promise<Uint8Array>{
  if(!Number.isSafeInteger(capBytes)||capBytes<1||capBytes>2_097_152)
    throw new Error("P09_WIRE_READER_LIMIT_INVALID");
  const given=request.headers.get("content-length");
  let expected:number|null=null;
  if(given!==null){
    if(!/^(0|[1-9][0-9]*)$/.test(given)||!Number.isSafeInteger(Number(given)))
      throw new SourceWireBodyErrorV39("SOURCE_WIRE_LENGTH_INVALID");
    expected=Number(given);
    if(expected>capBytes)
      throw new SourceWireBodyErrorV39("SOURCE_WIRE_TOO_LARGE");
  }
  if(!request.body){
    if(expected!==null&&expected!==0)
      throw new SourceWireBodyErrorV39("SOURCE_WIRE_LENGTH_MISMATCH");
    return new Uint8Array();
  }
  const reader=request.body.getReader();
  const chunks:Uint8Array[]=[];
  let count=0;
  try {
    for(;;){
      const next=await reader.read();
      if(next.done)break;
      const part=next.value;
      if(!(part instanceof Uint8Array))
        throw new SourceWireBodyErrorV39("SOURCE_WIRE_READ_FAILED");
      // Overflow-safe: never add a huge chunk before enforcing the cap.
      if(part.byteLength>capBytes-count){
        // Do not wait for cancellation, which can be arbitrarily slow.
        void reader.cancel().catch(()=>undefined);
        throw new SourceWireBodyErrorV39("SOURCE_WIRE_TOO_LARGE");
      }
      count+=part.byteLength;
      chunks.push(part);
    }
  }catch(error){
    if(error instanceof SourceWireBodyErrorV39)throw error;
    throw new SourceWireBodyErrorV39("SOURCE_WIRE_READ_FAILED");
  }finally{
    reader.releaseLock();
  }
  if(expected!==null&&count!==expected)
    throw new SourceWireBodyErrorV39("SOURCE_WIRE_LENGTH_MISMATCH");
  const result=new Uint8Array(count);
  let offset=0;
  for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength;}
  return result;
}
