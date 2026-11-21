import {runPulse} from "./relay.mjs";
try{
 const out=await runPulse(process.env,{emit:x=>console.log(JSON.stringify(x))});
 console.log(JSON.stringify(out));
}catch(e){
 const m=e?.message??"";console.error(/^HOLD_EXTERNAL_CLOCK_[A-Z0-9_]{1,120}$/.test(m)?m:"HOLD_EXTERNAL_CLOCK_UNKNOWN_NO_REPLAY");
 process.exitCode=2;
}
