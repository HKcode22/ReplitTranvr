import {describe,it,expect} from "vitest";
import {Pool,type PoolClient} from "pg";
import {commissionP5ExpiryActorPair,admitP5ExpiryCommission} from "../scripts/v39_phase5_recurring_expiry_owner_commission_v39";
import {P5_EXPIRY_ACTORS} from "../scripts/v39_phase5_recurring_expiry_owner_inventory_v39";
import {verifyP5RecurringExpiryActor} from "../scripts/v39_phase5_recurring_blob_expiry_runtime_v39";
const url="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
describe("exact expiry commissioning rejects unreviewed owner request",()=>{
 it("refuses wrong endpoint before SQL",()=>{
  const sha="a".repeat(40);
  expect(()=>admitP5ExpiryCommission({DATABASE_URL:"postgresql://neondb_owner:synthetic@ep-example.neon.tech/neondb?sslmode=require",
   ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0",V39_PROVIDER_BLOB_MODE:"required",
   V39_PROVIDER_BLOB_BUCKET_ID:"replit-objstore-synthetic",P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA:sha},sha,sha)).toThrow();
 });
});
const suite=process.env.V39_P5_DAILY_QA_REAL_PG16==="1"?describe:describe.skip;
suite("actual disposable PG16 atomic role pair",()=>{
 it("persists first, rolls both back on second role grant failure, then commissions and refuses duplicate",async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||process.env.DATABASE_URL!==url||process.env.V39_PHASE6_PROCESS_ARMED!=="0"||process.env.AERODATABOX_API_KEY)throw Error("NOT_DISPOSABLE_PG16");
  const db=new Pool({connectionString:url,max:2}),c=await db.connect();
  const pw={writer:"w".repeat(64),reader:"r".repeat(64)};let writes=0;
  const count=async()=> (await c.query("SELECT count(*)::int n FROM pg_roles WHERE rolname=ANY($1::text[])",[Object.values(P5_EXPIRY_ACTORS)])).rows[0].n;
  let writer:Pool|undefined,reader:Pool|undefined;
  try{
   expect(await count()).toBe(0);
   // Inject one real server-side SQL failure on the second role grant,
   // with all preceding CREATE and GRANT statements in the same actual transaction.
   const wrapped={query:async(sql:string,args?:unknown[])=>{
    if(sql.startsWith("GRANT CONNECT")&&sql.endsWith(P5_EXPIRY_ACTORS.reader))return c.query("SELECT nonexistent_column_for_ci_rollback");
    return c.query(sql,args);
   }} as unknown as PoolClient;
   await expect(commissionP5ExpiryActorPair(wrapped,pw,()=>{writes++;},"postgres")).rejects.toThrow();
   expect(writes).toBe(1);expect(await count()).toBe(0);
   await commissionP5ExpiryActorPair(c,pw,()=>{writes++;},"postgres");
   expect(writes).toBe(2);expect(await count()).toBe(2);
   await expect(commissionP5ExpiryActorPair(c,pw,()=>{writes++;},"postgres")).rejects.toThrow("EXISTING_ACTOR_RECONCILE");
   expect(writes).toBe(2);
   writer=new Pool({connectionString:url.replace("postgres:postgres@",P5_EXPIRY_ACTORS.writer+":"+pw.writer+"@")});
   reader=new Pool({connectionString:url.replace("postgres:postgres@",P5_EXPIRY_ACTORS.reader+":"+pw.reader+"@"),options:"-c default_transaction_read_only=on"});
   await verifyP5RecurringExpiryActor(writer,P5_EXPIRY_ACTORS.writer,"writer",false);
   await verifyP5RecurringExpiryActor(reader,P5_EXPIRY_ACTORS.reader,"reader",false);
  }finally{
   await writer?.end();await reader?.end();
   for(const role of Object.values(P5_EXPIRY_ACTORS)){
    await c.query("DROP OWNED BY "+role).catch(()=>{});await c.query("DROP ROLE IF EXISTS "+role);
   }
   c.release();await db.end();
  }
 });
});
