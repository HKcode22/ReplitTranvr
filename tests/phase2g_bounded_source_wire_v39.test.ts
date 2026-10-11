import {describe,it,expect} from "vitest";
import {readBoundedSourceWireV39,SourceWireBodyErrorV39}
  from "../experiments/phase2g_cf_sandbox_ingress/bounded_wire_body";

const te=new TextEncoder();
function request(chunks:Uint8Array[],header?:string):Pick<Request,"body"|"headers">{
  let next=0;
  const body=new ReadableStream<Uint8Array>({
    pull(c){if(next<chunks.length)c.enqueue(chunks[next++]);else c.close();}
  });
  const headers=new Headers();
  if(header!==undefined)headers.set("content-length",header);
  return {body,headers};
}
async function reason(p:Promise<unknown>,expected:string){
  await expect(p).rejects.toMatchObject({
    name:"SourceWireBodyErrorV39",reason:expected
  });
}
describe("P09 streamed source bytes before synthetic 2xx (no cloud/provider)",()=>{
  it("exact-stream reconstruction preserves wire bytes and original byte count",async()=>{
    const parts=[te.encode('{"id":'),te.encode('"one"'),te.encode('}')];
    const original=te.encode('{"id":"one"}');
    const got=await readBoundedSourceWireV39(request(parts,String(original.length)),256);
    expect([...got]).toEqual([...original]);
  });
  it("terminates at cap DURING stream reading, not after unbounded arrayBuffer",async()=>{
    await reason(readBoundedSourceWireV39(request([
      new Uint8Array(4),new Uint8Array(3),new Uint8Array(100)
    ]),5),"SOURCE_WIRE_TOO_LARGE");
  });
  it("rejects advertised over-limit content length before streamed materialization",async()=>{
    await reason(readBoundedSourceWireV39(request([te.encode("{}")],"1000000"),64),
      "SOURCE_WIRE_TOO_LARGE");
  });
  it("rejects smaller and larger forged content length when actual bytes differ",async()=>{
    await reason(readBoundedSourceWireV39(request([te.encode('{"x":1}')],"2"),128),
      "SOURCE_WIRE_LENGTH_MISMATCH");
    await reason(readBoundedSourceWireV39(request([te.encode("{}")],"5"),128),
      "SOURCE_WIRE_LENGTH_MISMATCH");
  });
  it("refuses invalid, fractional and overflowing Content-Length",async()=>{
    for(const length of ["-1","1.1","abc","9007199254740993","1e4"]){
      await reason(readBoundedSourceWireV39(request([te.encode("{}")],length),100),
        "SOURCE_WIRE_LENGTH_INVALID");
    }
  });
  it("zero-body and declared nonzero cannot produce accepted source bytes",async()=>{
    expect((await readBoundedSourceWireV39({body:null,headers:new Headers()},1)).length).toBe(0);
    await reason(readBoundedSourceWireV39({body:null,headers:new Headers({"content-length":"1"})},2),
      "SOURCE_WIRE_LENGTH_MISMATCH");
  });
  it("refuses invalid cap and maps stream read errors to sanitized reason",async()=>{
    await expect(readBoundedSourceWireV39(request([te.encode("{}")]),Number.NaN))
      .rejects.toThrow("P09_WIRE_READER_LIMIT_INVALID");
    const broken=new ReadableStream<Uint8Array>({
      start(c){c.error(new Error("PRIVATE_RAW_STREAM_TOKEN_DO_NOT_PRINT"));}
    });
    await reason(readBoundedSourceWireV39({body:broken,headers:new Headers()},256),
      "SOURCE_WIRE_READ_FAILED");
    expect(new SourceWireBodyErrorV39("SOURCE_WIRE_READ_FAILED").message)
      .not.toContain("PRIVATE_RAW_STREAM_TOKEN");
  });
});
