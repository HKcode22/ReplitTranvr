import {describe,it,expect,beforeEach,afterEach} from "vitest";
import {mkdtemp,rm,mkdir,writeFile,readFile,readdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {createServer,request as rawHttpRequest,type Server} from "node:http";
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
  it("P13/P16 read-only spool crash audit distinguishes valid complete source and orphan claim/raw/receipt",async()=>{
    expect((await sender((await (async()=>{
      const gate=await createSyntheticFixedFrontdoorHttpV39({spool,token});
      opened.push(gate.server);return gate.url;
    })()),"source-good")).status).toBe(202);
    const a=sha("claim-without-any-source");
    await writeFile(join(root,"claims",a+".lock"),"interrupted-before-blob");
    const b=sha("orphan-raw-after-blob-before-receipt");
    await writeFile(join(root,"raw",b+".bin"),Buffer.from("unacknowledged-original"));
    await writeFile(join(root,"claims",b+".lock"),"interrupted-before-receipt");
    const c=sha("orphan-receipt-without-raw");
    await writeFile(join(root,"receipts",c+".json"),
      JSON.stringify({schema:"v39.synthetic-fixed-frontdoor-receipt.v1",
        attemptHash:c,rawSha256:sha("missing"),rawBytes:7}));
    const before={
      claims:(await readdir(join(root,"claims"))).length,
      raw:(await readdir(join(root,"raw"))).length,
      receipts:(await readdir(join(root,"receipts"))).length
    };
    const audit=await spool.auditCrashRecoveryReadOnly();
    expect(audit).toMatchObject({
      originalReceiptCount:2,verifiedOriginalReceiptCount:1,
      corruptedOriginalReceiptCount:1,
      claimedButNotReceiptedCount:2,rawWithoutReceiptCount:1,
      receiptWithoutRawCount:1,
      allOriginalReceiptsVerified:false,
      automaticRecoveryAuthorized:false,sourceDeletionAuthorized:false,
      providerOriginalSenderLedgerVerified:false,paidLaunchAuthorized:false
    });
    expect((await readdir(join(root,"claims"))).length).toBe(before.claims);
    expect((await readdir(join(root,"raw"))).length).toBe(before.raw);
    expect((await readdir(join(root,"receipts"))).length).toBe(before.receipts);
    expect(JSON.stringify(audit)).not.toContain("source-good");
    expect(JSON.stringify(audit)).not.toContain("unacknowledged-original");
  });
  it("P13/P16 recovered original spool may be internally consistent but not independent upstream source-complete",async()=>{
    const gate=await createSyntheticFixedFrontdoorHttpV39({spool,token});
    opened.push(gate.server);
    expect((await sender(gate.url,"source-complete")).status).toBe(202);
    const a=await spool.auditCrashRecoveryReadOnly();
    expect(a).toMatchObject({
      originalReceiptCount:1,verifiedOriginalReceiptCount:1,
      corruptedOriginalReceiptCount:0,
      allOriginalReceiptsVerified:true,
      automaticRecoveryAuthorized:false,
      providerOriginalSenderLedgerVerified:false,
      paidLaunchAuthorized:false
    });
    // Source on a single ephemeral runner is still not redundant HTTPS ingress.
    await writeFile(join(root,"raw",".writing-aborted-payload"),"partial-file");
    const failed=await spool.auditCrashRecoveryReadOnly();
    expect(failed.quarantinedPartialWriteCount).toBe(1);
    expect(failed.allOriginalReceiptsVerified).toBe(false);
    expect(failed.sourceDeletionAuthorized).toBe(false);
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
  it("truncated upstream POST never persists partial original or kills the fixed front-door server",async()=>{
    const edge=await createSyntheticFixedFrontdoorHttpV39({spool,token});
    opened.push(edge.server);
    const url=new URL(edge.url);
    await new Promise<void>(resolve=>{
      let complete=false;
      const done=()=>{if(complete)return;complete=true;resolve();};
      const client=rawHttpRequest({
        hostname:"127.0.0.1",port:Number(url.port),path:url.pathname,
        method:"POST",headers:{
          "x-synthetic-token":token,
          "x-synthetic-attempt-id":"truncated-source",
          "content-type":"application/json",
          "content-length":"4096"
        }
      },response=>{response.resume();response.on("end",done);});
      client.on("error",done);
      client.write(Buffer.alloc(48,65));
      setTimeout(()=>{client.destroy();done();},30);
    });
    await new Promise(r=>setTimeout(r,40));
    expect((await spool.readAll())).toHaveLength(0);
    const good=await sender(edge.url,"after-truncated");
    expect(good.status).toBe(202);
    expect((await spool.readAll())).toHaveLength(1);
    expect((await spool.get("after-truncated"))?.rawSha256)
      .toBe(createHash("sha256").update(raw("after-truncated")).digest("hex"));
  });
  it("P17/P20 VIRTUAL 120-minute source manifest stays exact across 8 bins and two 3-minute primary outages",async()=>{
    // Deterministically simulate UTC time stamps ONLY. HTTP test itself
    // completes quickly and does NOT prove a 120-minute published service.
    const pinned=await createSyntheticFixedFrontdoorHttpV39({spool,token});
    opened.push(pinned.server);
    const primaryDown=await receive("unavailable");
    const warmStandby=await receive("accept");
    const startUtc=Date.parse("2026-10-12T03:00:00.000Z");
    const manifest=new Map<string,{bin:number;original:Buffer}>();
    const perBin=new Array<number>(8).fill(0);
    let inFirstOutage=0,inSecondOutage=0;
    for(let bin=0;bin<8;bin++){
      for(let i=0;i<16;i++){
        const minute=bin*15+Math.min(14,Math.floor(i*15/16));
        const id="virtual-2h-"+bin+"-"+i;
        const original=Buffer.from(JSON.stringify({
          schema:"SYNTHETIC-ONLY-NOT-AERODATABOX",
          generatedAtUtc:new Date(startUtc+minute*60_000).toISOString(),
          syntheticSourceAttempt:id,
          syntheticFlightDelayMinutes:(i*17+bin*11)%145,
          physicalFlightId:"SYNTHETIC-"+bin+"-"+i,
          bin
        }));
        manifest.set(sha(id),{bin,original});
        if(minute>=29&&minute<32)inFirstOutage++;
        if(minute>=89&&minute<92)inSecondOutage++;
        const posted=await sender(pinned.url,id,original);
        expect(posted.status).toBe(202);
        perBin[bin]++;
      }
    }
    expect(perBin).toEqual(Array(8).fill(16));
    expect(inFirstOutage).toBeGreaterThan(0);
    expect(inSecondOutage).toBeGreaterThan(0);
    const received=await spool.readAll();
    expect(received).toHaveLength(128);
    const reconstructed=new Array<number>(8).fill(0);
    for(const {receipt,original} of received){
      const submitted=manifest.get(receipt.attemptHash);
      expect(submitted).toBeDefined();
      expect(Buffer.from(original).equals(submitted!.original)).toBe(true);
      expect(receipt.rawSha256).toBe(createHash("sha256").update(original).digest("hex"));
      reconstructed[submitted!.bin]++;
    }
    expect(reconstructed).toEqual(perBin);
    const delivered=await spool.replayToLocalReceivers([primaryDown.url,warmStandby.url]);
    expect(delivered).toMatchObject({
      considered:128,forwarded:128,rejectedOrUnavailable:0,
      originalProviderWitnessVerified:false,paidLaunchAuthorized:false
    });
    expect(receiverRecords.size).toBe(128);
    expect((await spool.replayToLocalReceivers([warmStandby.url])).skippedAlreadyAcknowledged).toBe(128);
    console.log("SYNTHETIC_VIRTUAL_120_MINUTES_PRESERVED=120");
    console.log("SYNTHETIC_VIRTUAL_8_BINS_SOURCE_COUNTS="+reconstructed.join(","));
    console.log("SYNTHETIC_VIRTUAL_TWO_3MIN_BACKEND_OUTAGES=true");
    console.log("SYNTHETIC_VIRTUAL_ORIGINAL_SOURCE_ITEMS=128");
    console.log("REAL_120MIN_HOSTED_REHEARSAL_PERFORMED=false");
    console.log("AERODATABOX_EXTERNAL_SOURCE_WITNESS=false");
  },30000);
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
