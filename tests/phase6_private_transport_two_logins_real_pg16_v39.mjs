import assert from "node:assert/strict";
import pg from "pg";
import {APPROVAL,ENTRIES,commissionP6PrivateTransportLogins,verifyP6PrivateTransportSession} from "../scripts/v39_phase6_private_transport_two_logins_owner_once.mjs";
const env={...process.env,P6_PRIVATE_TRANSPORT_LOGIN_APPROVAL:APPROVAL,
 P6_PRIVATE_TRANSPORT_REVIEWED_MAIN:"a".repeat(40),DATABASE_URL:"postgresql://neondb_owner:ci-only-day-real@127.0.0.1:5432/neondb?sslmode=disable"};
const values=new Map();
let bad=true;
const gh={getMainSha:async()=>env.P6_PRIVATE_TRANSPORT_REVIEWED_MAIN,listSecretNames:async()=>[...values.keys()],
 setSecret:async(k,v)=>{values.set(k,v);if(bad&&k===ENTRIES[1].secret)throw Error("INJECTED_SECRET_FAILURE");},
 deleteSecret:async(k)=>{values.delete(k);}};
await assert.rejects(commissionP6PrivateTransportLogins({env,gh,ci:true}),/INJECTED_SECRET_FAILURE/);
assert.equal(values.size,0);
const c=new pg.Client({connectionString:env.DATABASE_URL});await c.connect();
try{
 const n=(await c.query("SELECT count(*)::int n FROM pg_roles WHERE rolname=ANY($1::text[])",[ENTRIES.map(e=>e.login)])).rows[0].n;
 assert.equal(n,0);
}finally{await c.end();}
bad=false;
const success=await commissionP6PrivateTransportLogins({env,gh,ci:true});
assert.equal(success.rolesCreated,2);assert.equal(success.providerCalls,0);assert.equal(success.privatePayloadWrites,0);
for(const e of ENTRIES)assert.equal((await verifyP6PrivateTransportSession(values.get(e.secret),e,{ci:true})).readOnly,true);
await assert.rejects(commissionP6PrivateTransportLogins({env,gh,ci:true}),/SECRET_ALREADY_EXISTS_NEVER_OVERWRITE/);
console.log("P6_PRIVATE_TRANSPORT_TWO_LOGINS_REAL_PG16_ROLLBACK_AUTH_NO_REPLAY_PASS");
