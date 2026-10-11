import {describe,it,expect,beforeEach,afterEach} from "vitest";
import {mkdtemp,rm,mkdir,writeFile,readFile,readdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {createServer,type Server} from "node:http";
import {SyntheticFixedFrontdoorSpoolV39,
  createSyntheticFixedFrontdoorHttpV39}
  from "../experiments/phase2g_rehearsal/synthetic_fixed_frontdoor_spool_v39";

const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
const token="p2g-synthetic-only-token-"+"x".repeat(45);
const raw=(id:string)=>Buffer.from(JSON.stringify({
  id:"simulated-"+id,received:"upstream mock sender",
  flights:[{synthetic:"no paid AeroDataBox events",payload:"abc"}]
}));
type ReceiverMode="accept"|"unavailable"|"lying-ack";
let root:string;
let spool:SyntheticFixedFrontdoorSpoolV39;
const opened:Server[]=[];
const receiverRecords=new Map<string,{sha:string;body:Buffer;attempts:number}>();
const closeServer=async(s:Server)=>{
  if(!s.listening)return;
  await new Promise<void>((ok,reject)=>s.close(err=>err?reject(err):ok()));
};
const receive=async(mode:ReceiverMode)=>{
  const server=createServer(async(req,res)=>{
    const attempt=String(req.headers["x-synthetic-attempt-hash"]??"");
    const claimed=String(req.headers["x-synthetic-source-sha256"]??"");
    const chunks:Buffer[]=[];
    for await(const chunk of req)chunks.push(Buffer.from(chunk));
    const body=Buffer.concat(chunks);
    if(mode==="unavailable"){
      res.writeHead(503);res.end();return;
    }
    if(mode==="lying-ack"){
      res.writeHead(200,{"content-type":"application/json"});
      res.end(JSON.stringify({accepted:true,attemptHash:attempt,rawSha256:"0".repeat(64)}));
      return;
    }
    expect(createHash("sha256").update(body).digest("hex")).toBe(claimed);
    const prior=receiverRecords.get(attempt);
    if(prior){
      expect(prior.sha).toBe(claimed);
      expect(prior.body.equals(body)).toBe(true);
      prior.attempts++;
    }else receiverRecords.set(attempt,{sha:claimed,body,attempts:1});
    res.writeHead(200,{"content-type":"application/json"});
    res.end(JSON.stringify({accepted:true,attemptHash:attempt,rawSha256:claimed}));
  });
  opened.push(server);
  await new Promise<void>(ok=>server.listen(0,"127.0.0.1",ok));
  const a=server.address();
  if(!a||typeof a==="string")throw Error("SYNTHETIC_RECEIVER_BIND");
  return {server,url:"http://127.0.0.1:"+a.port+"/__synthetic__/receive"};
};
const sender=async(url:string,id:string,bytes=raw(id),sentToken=token)=>{
  return fetch(url,{method:"POST",headers:{
    "content-type":"application/json","x-synthetic-token":sentToken,
    "x-synthetic-attempt-id":id
  },body:bytes});
};
beforeEach(async()=>{
  if(process.env.AERODATABOX_API_KEY||process.env.V39_DATABASE_RUNTIME_URL||
     process.env.AERODATABOX_WEBHOOK_SECRET)
    throw Error("SYNTHETIC_REAL_CREDENTIALS_PRESENT_REFUSED");
  process.env.P2G_SYNTHETIC_FRONTDOOR_ONLY="YES";
  root=await mkdtemp(join(tmpdir(),"p2g-offline-frontdoor-"));
  spool=await SyntheticFixedFrontdoorSpoolV39.open(root);
  receiverRecords.clear();
});
afterEach(async()=>{
  await Promise.all(opened.splice(0).map(closeServer));
  if(root)await rm(root,{recursive:true,force:true});
  delete process.env.P2G_SYNTHETIC_FRONTDOOR_ONLY;
});

describe("P09/P18 one fixed source-spooling front door (actual LOCAL HTTP + fsync)",()=>{
  it("202 requires original disk receipt, survives a spool-process restart and preserves ORIGINAL WIRE BYTES",async()=>{
    const edge=await createSyntheticFixedFrontdoorHttpV39({spool,token});
    opened.push(edge.server);
    const original=Buffer.from('{\n "flights":[],"id":"source-wire-order", "x": 1 }\n');
    const first=await sender(edge.url,"wire-001",original);
    expect(first.status).toBe(202);
    const body=await first.json() as any;
    expect(body.durable).toBe(true);
    expect(body.rawSha256).toBe(createHash("sha256").update(original).digest("hex"));
    expect((await spool.readAll())).toHaveLength(1);
    expect(Buffer.from((await spool.readAll())[0].original).equals(original)).toBe(true);
    // Restart just the spooling object instance: original disk bytes remain.
    const reopened=await SyntheticFixedFrontdoorSpoolV39.open(root);
    expect(Buffer.from((await reopened.readAll())[0].original).equals(original)).toBe(true);
    const same=await sender(edge.url,"wire-001",original);
    expect(same.status).toBe(202);
    expect((await same.json() as any).reason).toBe("already_durable");
    const changed=await sender(edge.url,"wire-001",Buffer.from('{"changed":true}'));
    expect(changed.status).toBe(409);
    expect((await spool.readAll())).toHaveLength(1);
  });
  it("single pinned URL retains payload while primary is DOWN and replays to standby without multiple provider subscriptions",async()=>{
    const edge=await createSyntheticFixedFrontdoorHttpV39({spool,token});
    opened.push(edge.server);
    const primary=await receive("unavailable");
    const standby=await receive("accept");
    const incoming=await sender(edge.url,"during-primary-down");
    expect(incoming.status).toBe(202);
    expect(receiverRecords.size).toBe(0); // durable ingress, BEFORE backend.
    const out=await spool.replayToLocalReceivers([primary.url,standby.url]);
    expect(out).toMatchObject({considered:1,forwarded:1,
      rejectedOrUnavailable:0,paidLaunchAuthorized:false,
      originalProviderWitnessVerified:false});
    expect(receiverRecords.size).toBe(1);
    const [row]=receiverRecords.values();
    expect(row.body.equals(raw("during-primary-down"))).toBe(true);
    const newSpool=await SyntheticFixedFrontdoorSpoolV39.open(root);
    const repeat=await newSpool.replayToLocalReceivers([primary.url,standby.url]);
    expect(repeat.forwarded).toBe(0);
    expect(repeat.skippedAlreadyAcknowledged).toBe(1);
    expect(receiverRecords.size).toBe(1);
    expect(row.attempts).toBe(1);
    expect((await spool.readAll())).toHaveLength(1); // raw never auto-deleted
  });
  it("three receiver destinations are FAILOVER not THREE provider-subscription fanouts; reject lying 200 ACK",async()=>{
    const edge=await createSyntheticFixedFrontdoorHttpV39({spool,token});
    opened.push(edge.server);
    const first=await receive("unavailable");
    const second=await receive("lying-ack");
    const third=await receive("accept");
    expect((await sender(edge.url,"three-failover-test")).status).toBe(202);
    const out=await spool.replayToLocalReceivers([first.url,second.url,third.url]);
    expect(out.forwarded).toBe(1);
    expect(receiverRecords.size).toBe(1);
    expect((await spool.replayToLocalReceivers([third.url])).skippedAlreadyAcknowledged).toBe(1);
  });
  it("if both backends are offline, provider still gets durable 202; source can be replayed later",async()=>{
    const edge=await createSyntheticFixedFrontdoorHttpV39({spool,token});
    opened.push(edge.server);
    const down1=await receive("unavailable");
    const down2=await receive("unavailable");
    expect((await sender(edge.url,"backlog")).status).toBe(202);
    const first=await spool.replayToLocalReceivers([down1.url,down2.url]);
    expect(first).toMatchObject({forwarded:0,rejectedOrUnavailable:1});
    expect((await spool.readAll())).toHaveLength(1);
    const good=await receive("accept");
    const later=await spool.replayToLocalReceivers([good.url]);
    expect(later.forwarded).toBe(1);
    expect(receiverRecords.size).toBe(1);
  });
  it("lost receiver HTTP ACK AFTER receiver persisted requires safe idempotent replay",async()=>{
    const edge=await createSyntheticFixedFrontdoorHttpV39({spool,token});
    opened.push(edge.server);
    const one=await receive("accept");
    expect((await sender(edge.url,"commit-ack-loss")).status).toBe(202);
    const first=await spool.replayToLocalReceivers([one.url],{
      afterReceiverAckBeforeLocalMark(){throw Error("SYNTHETIC_CLIENT_PROCESS_DIED");}
    });
    expect(first).toMatchObject({forwarded:0,rejectedOrUnavailable:1});
    expect(receiverRecords.size).toBe(1);
    const original=[...receiverRecords.values()][0];
    expect(original.attempts).toBe(1);
    const reopened=await SyntheticFixedFrontdoorSpoolV39.open(root);
    const replay=await reopened.replayToLocalReceivers([one.url]);
    expect(replay.forwarded).toBe(1);
    expect(receiverRecords.size).toBe(1);
    expect(original.attempts).toBe(2); // two POSTs, one original row
  });
  it("tampered ORIGINAL source fails closed, no replay or deletion",async()=>{
    const edge=await createSyntheticFixedFrontdoorHttpV39({spool,token});
    opened.push(edge.server);
    expect((await sender(edge.url,"tamper")).status).toBe(202);
    const id=sha("tamper");
    const name=join(root,"raw",id+".bin");
    await writeFile(name,Buffer.from("tampered source"));
    const server=await receive("accept");
    await expect(spool.replayToLocalReceivers([server.url]))
      .rejects.toThrow("SYNTHETIC_FRONTDOOR_RAW_NOT_VERIFIED");
    expect(receiverRecords.size).toBe(0);
    expect((await readFile(name)).toString()).toBe("tampered source");
    await expect(spool.get("tamper")).rejects.toThrow("SYNTHETIC_FRONTDOOR_RAW_NOT_VERIFIED");
  });
  it("unacknowledged claim after crash is NEVER presumed durable; no automatic orphan deletion",async()=>{
    const id=sha("claim-without-raw");
    await writeFile(join(root,"claims",id+".lock"),"synthetic half-written crash claim");
    const response=await spool.admit("claim-without-raw",raw("claim-without-raw"));
    expect(response).toMatchObject({http:503,reason:"pending_claim_no_ack"});
    expect((await spool.readAll())).toHaveLength(0);
    expect((await readdir(join(root,"claims")))).toHaveLength(1);
  });
  it("unauthenticated request, invalid IDs and oversized bytes fail BEFORE durable sender ACK",async()=>{
    const edge=await createSyntheticFixedFrontdoorHttpV39({spool,token});
    opened.push(edge.server);
    expect((await sender(edge.url,"bad",raw("bad"),"wrong")).status).toBe(403);
    expect((await sender(edge.url,"bad/session",raw("bad"))).status).toBe(400);
    expect((await sender(edge.url,"oversized",Buffer.alloc(65537,1))).status).toBe(413);
    expect((await spool.readAll())).toHaveLength(0);
  });
  it("FRONTDOOR itself unavailable => backups cannot receive an upstream POST; fixed URL remains a single ingress dependency",async()=>{
    const edge=await createSyntheticFixedFrontdoorHttpV39({spool,token});
    opened.push(edge.server);
    await closeServer(edge.server);
    const standby=await receive("accept");
    await expect(sender(edge.url,"edge-down")).rejects.toThrow();
    expect((await spool.readAll())).toHaveLength(0);
    expect(receiverRecords.size).toBe(0);
    // An existing healthy standby elsewhere is not automatically the original URL.
    expect(standby.server.listening).toBe(true);
  });
  it("22 concurrent real loopback sender POSTs persist distinct original bytes then drain deterministically",async()=>{
    const edge=await createSyntheticFixedFrontdoorHttpV39({spool,token});
    opened.push(edge.server);
    const count=22;
    const start=performance.now();
    const res=await Promise.all(Array.from({length:count},(_,i)=>sender(edge.url,"load-"+i)));
    expect(res.every(x=>x.status===202)).toBe(true);
    const elapsed=performance.now()-start;
    expect((await spool.readAll())).toHaveLength(count);
    const receiver=await receive("accept");
    const processed=await spool.replayToLocalReceivers([receiver.url]);
    expect(processed.forwarded).toBe(count);
    expect(receiverRecords.size).toBe(count);
    expect(processed.originalProviderWitnessVerified).toBe(false);
    console.log("SYNTHETIC_FRONTDOOR_LOOPBACK_HTTP_22_ACK_ELAPSED_MS="+Math.round(elapsed));
    console.log("SYNTHETIC_FRONTDOOR_PROVIDER_CREDITS=0");
    console.log("SYNTHETIC_FRONTDOOR_PUBLISHED_HOSTED_REHEARSAL=false");
  },20000);
});
