/**
 * P09/P13/P18: single fixed HTTP front-door / original-byte spool REHEARSAL.
 * Only disposable localhost testing. This is NOT an independently deployed
 * durable webhook ingress and is not connected to paid AeroDataBox callbacks.
 *
 * Original bytes are written/fsynced BEFORE sender 202, then asynchronously
 * (in a separate explicit test step) forwarded to one healthy backend.
 * The file spool is not crash-/replication-safe cloud durable storage. A
 * down FRONTDOOR still loses webhooks with provider retries disabled.
 * The original uploaded bytes must never be stored as PostgreSQL plaintext.
 */
import {createHash,timingSafeEqual} from "node:crypto";
import {createServer,type Server} from "node:http";
import {promises as fs} from "node:fs";
import {resolve,join} from "node:path";

const sha=(value:string|Uint8Array)=>createHash("sha256").update(value).digest("hex");
const ID=/^[a-zA-Z0-9_-]{1,100}$/;
const HASH=/^[a-f0-9]{64}$/;
export type FrontdoorReceiptV39=Readonly<{
  schema:"v39.synthetic-fixed-frontdoor-receipt.v1";
  attemptHash:string;
  rawSha256:string;
  rawBytes:number;
}>;
export type FrontdoorReplayResultV39=Readonly<{
  considered:number;forwarded:number;skippedAlreadyAcknowledged:number;
  rejectedOrUnavailable:number;
  paidLaunchAuthorized:false;
  originalProviderWitnessVerified:false;
}>;
function guard(){
  if(process.env.P2G_SYNTHETIC_FRONTDOOR_ONLY!=="YES"||
     process.env.AERODATABOX_API_KEY||
     process.env.V39_DATABASE_RUNTIME_URL||
     process.env.AERODATABOX_WEBHOOK_SECRET)
    throw Error("SYNTHETIC_FRONTDOOR_DISPOSABLE_ONLY");
}
async function readMaybe(path:string):Promise<Uint8Array|null>{
  try{return new Uint8Array(await fs.readFile(path));}
  catch(e:any){if(e?.code==="ENOENT")return null;throw e;}
}
async function syncDirectory(path:string){
  const handle=await fs.open(path,"r");
  try{await handle.sync();}finally{await handle.close();}
}
async function writeExclusiveSynced(path:string,data:Uint8Array){
  const h=await fs.open(path,"wx",0o600);
  try{await h.writeFile(data);await h.sync();}finally{await h.close();}
}
async function durableNewFile(dir:string,name:string,data:Uint8Array){
  const temp=join(dir,".writing-"+sha(name).slice(0,32)+"-"+process.pid+"-"+Date.now()+"-"+Math.random().toString(36).slice(2));
  // NEVER delete source on ambiguous rename. Uncommitted .writing artifacts
  // are quarantined for explicit audit; never automatically acknowledged.
  await writeExclusiveSynced(temp,data);
  await fs.rename(temp,join(dir,name));
  await syncDirectory(dir);
}
const utf=(s:string)=>new TextEncoder().encode(s);
export class SyntheticFixedFrontdoorSpoolV39{
  private root:string;
  private constructor(root:string){this.root=root;}
  static async open(root:string){
    guard();
    const dir=resolve(root);
    if(!dir.startsWith("/tmp/")&&!dir.startsWith("/private/tmp/")&&
       !dir.startsWith("/var/folders/"))
      throw Error("SYNTHETIC_FRONTDOOR_TMP_DIRECTORY_REQUIRED");
    const instance=new SyntheticFixedFrontdoorSpoolV39(dir);
    for(const sub of ["raw","claims","receipts","forwarded"])
      await fs.mkdir(join(dir,sub),{recursive:true,mode:0o700});
    return instance;
  }
  private file(section:string,id:string,extension:string){
    if(!HASH.test(id))throw Error("SYNTHETIC_FRONTDOOR_BAD_HASH");
    return join(this.root,section,id+"."+extension);
  }
  async get(attemptId:string):Promise<FrontdoorReceiptV39|null>{
    guard();
    if(!ID.test(attemptId))throw Error("SYNTHETIC_FRONTDOOR_ATTEMPT_INVALID");
    const id=sha(attemptId);
    const buf=await readMaybe(this.file("receipts",id,"json"));
    if(!buf)return null;
    let receipt:FrontdoorReceiptV39;
    try{receipt=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(buf));}
    catch{throw Error("SYNTHETIC_FRONTDOOR_RECEIPT_CORRUPT");}
    if(receipt.schema!=="v39.synthetic-fixed-frontdoor-receipt.v1"||
       receipt.attemptHash!==id||!HASH.test(receipt.rawSha256)||
       !Number.isSafeInteger(receipt.rawBytes)||receipt.rawBytes<1||receipt.rawBytes>65536)
      throw Error("SYNTHETIC_FRONTDOOR_RECEIPT_TAMPERED");
    const raw=await readMaybe(this.file("raw",id,"bin"));
    if(!raw||sha(raw)!==receipt.rawSha256||
       raw.byteLength!==receipt.rawBytes)
      throw Error("SYNTHETIC_FRONTDOOR_RAW_NOT_VERIFIED");
    return receipt;
  }
  async admit(attemptId:string,raw:Uint8Array):
    Promise<{http:202|409|413|503;reason:string;receipt:FrontdoorReceiptV39|null}>{
    guard();
    if(!ID.test(attemptId)||!(raw instanceof Uint8Array))
      throw Error("SYNTHETIC_FRONTDOOR_ATTEMPT_INVALID");
    if(raw.byteLength===0||raw.byteLength>65536)
      return {http:413,reason:"bounded_original_bytes",receipt:null};
    const id=sha(attemptId),expectedSha=sha(raw);
    const existing=await this.get(attemptId);
    if(existing)return existing.rawSha256===expectedSha?
      {http:202,reason:"already_durable",receipt:existing}:
      {http:409,reason:"attempt_original_conflict",receipt:null};
    const claim=this.file("claims",id,"lock");
    try{
      await writeExclusiveSynced(claim,utf("synthetic claim only"));
      await syncDirectory(join(this.root,"claims"));
    }catch(e:any){
      if(e?.code==="EEXIST")return {http:503,reason:"pending_claim_no_ack",receipt:null};
      throw e;
    }
    // Only one writer can reach here. FAIL CLOSED on errors. Do NOT
    // clear claims automatically; orphan audit must prove original custody.
    await durableNewFile(join(this.root,"raw"),id+".bin",raw);
    const receipt:FrontdoorReceiptV39={
      schema:"v39.synthetic-fixed-frontdoor-receipt.v1",
      attemptHash:id,rawSha256:expectedSha,rawBytes:raw.byteLength
    };
    await durableNewFile(join(this.root,"receipts"),id+".json",
      utf(JSON.stringify(receipt)));
    return {http:202,reason:"source_fsynced",receipt};
  }
  async readAll():Promise<readonly {receipt:FrontdoorReceiptV39;original:Uint8Array}[]>{
    guard();
    const result:{receipt:FrontdoorReceiptV39;original:Uint8Array}[]=[];
    const names=(await fs.readdir(join(this.root,"receipts"))).filter(n=>HASH.test(n.slice(0,-5))&&n.endsWith(".json")).sort();
    for(const name of names){
      const id=name.slice(0,-5);
      const bytes=await readMaybe(this.file("receipts",id,"json"));
      if(!bytes)throw Error("SYNTHETIC_FRONTDOOR_LIST_RACE");
      let r:FrontdoorReceiptV39;
      try{r=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}
      catch{throw Error("SYNTHETIC_FRONTDOOR_RECEIPT_CORRUPT");}
      if(r.schema!=="v39.synthetic-fixed-frontdoor-receipt.v1"||r.attemptHash!==id||
         !HASH.test(r.rawSha256)||!Number.isSafeInteger(r.rawBytes))
        throw Error("SYNTHETIC_FRONTDOOR_RECEIPT_TAMPERED");
      const original=await readMaybe(this.file("raw",id,"bin"));
      if(!original||sha(original)!==r.rawSha256||original.byteLength!==r.rawBytes)
        throw Error("SYNTHETIC_FRONTDOOR_RAW_NOT_VERIFIED");
      result.push({receipt:r,original});
    }
    return result;
  }
  async replayToLocalReceivers(urls:readonly string[],opts?:{
    afterReceiverAckBeforeLocalMark?:()=>void
  }):Promise<FrontdoorReplayResultV39>{
    guard();
    if(urls.length<1||urls.length>3||urls.some(u=>{
      try{const v=new URL(u);return v.protocol!=="http:"||
        v.hostname!=="127.0.0.1"||!!v.username||!!v.password||
        v.pathname!=="/__synthetic__/receive"||!!v.hash||!!v.search;}
      catch{return true;}
    }))throw Error("SYNTHETIC_FRONTDOOR_LOCAL_RECEIVERS_ONLY");
    const rows=await this.readAll();
    let forwarded=0,skippedAlreadyAcknowledged=0,rejectedOrUnavailable=0;
    for(const {receipt,original} of rows){
      const marked=await readMaybe(this.file("forwarded",receipt.attemptHash,"json"));
      if(marked){
        let ack:any;
        try{ack=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(marked));}
        catch{throw Error("SYNTHETIC_FRONTDOOR_ACK_MARK_CORRUPT");}
        if(ack.rawSha256!==receipt.rawSha256||
           ack.attemptHash!==receipt.attemptHash||
           ack.status!=="receiver_accepted")
          throw Error("SYNTHETIC_FRONTDOOR_ACK_MARK_TAMPERED");
        skippedAlreadyAcknowledged++;continue;
      }
      let accepted=false;
      for(const uri of urls){
        try{
          const response=await fetch(uri,{
            method:"POST",headers:{
              "content-type":"application/octet-stream",
              "x-synthetic-attempt-hash":receipt.attemptHash,
              "x-synthetic-source-sha256":receipt.rawSha256
            },body:Buffer.from(original),signal:AbortSignal.timeout(1500)
          });
          if(!response.ok)continue;
          const ack=await response.json() as any;
          if(ack?.attemptHash!==receipt.attemptHash||
             ack?.rawSha256!==receipt.rawSha256||
             ack?.accepted!==true)continue;
          // The receiver may already have committed when a response/mark
          // fails. Replay requires receiver idempotency by attempt+SHA.
          opts?.afterReceiverAckBeforeLocalMark?.();
          await durableNewFile(join(this.root,"forwarded"),
            receipt.attemptHash+".json",utf(JSON.stringify({
              attemptHash:receipt.attemptHash,rawSha256:receipt.rawSha256,
              status:"receiver_accepted"
            })));
          accepted=true;forwarded++;break;
        }catch{
          // Local mock receiver unreachable or ACK was lost. Keep source.
        }
      }
      if(!accepted)rejectedOrUnavailable++;
    }
    return {
      considered:rows.length,forwarded,skippedAlreadyAcknowledged,
      rejectedOrUnavailable,paidLaunchAuthorized:false,
      originalProviderWitnessVerified:false
    };
  }
}
export async function createSyntheticFixedFrontdoorHttpV39(args:{
  spool:SyntheticFixedFrontdoorSpoolV39;
  token:string;
}):Promise<{server:Server;url:string}>{
  guard();
  if(args.token.length<32)throw Error("SYNTHETIC_FRONTDOOR_TOKEN_TOO_SHORT");
  const server=createServer((req,res)=>{
    void (async()=>{
    if(req.method!=="POST"||req.url!=="/__synthetic__/ingress"){
      res.writeHead(404);res.end();return;
    }
    const supplied=req.headers["x-synthetic-token"];
    const got=Buffer.from(typeof supplied==="string"?supplied:"");
    const exp=Buffer.from(args.token);
    if(got.byteLength!==exp.byteLength||!timingSafeEqual(got,exp)){
      res.writeHead(403);res.end();return;
    }
    const attempt=req.headers["x-synthetic-attempt-id"];
    if(typeof attempt!=="string"||!ID.test(attempt)){
      res.writeHead(400);res.end();return;
    }
    const chunks:Buffer[]=[];let length=0;
    for await(const piece of req){
      length+=piece.length;
      if(length>65536){res.writeHead(413);res.end();return;}
      chunks.push(piece);
    }
    try{
      const response=await args.spool.admit(attempt,new Uint8Array(Buffer.concat(chunks)));
      res.writeHead(response.http,{"content-type":"application/json"});
      res.end(JSON.stringify({durable:response.http===202,
        reason:response.reason,
        attemptHash:response.receipt?.attemptHash??null,
        rawSha256:response.receipt?.rawSha256??null}));
    }catch{
      res.writeHead(503);res.end(JSON.stringify({durable:false}));
    }
    })().catch(()=>{
      // A truncated/aborted request may throw from async iteration.
      // Never crash the frontdoor and never ACK uncommitted partial bytes.
      if(!res.headersSent&&!res.destroyed&&!res.writableEnded){
        res.writeHead(503);res.end(JSON.stringify({durable:false}));
      }
    });
  });
  await new Promise<void>(ok=>server.listen(0,"127.0.0.1",ok));
  const address=server.address();
  if(!address||typeof address==="string")throw Error("SYNTHETIC_FRONTDOOR_BIND_FAILED");
  return {server,url:"http://127.0.0.1:"+address.port+"/__synthetic__/ingress"};
}
