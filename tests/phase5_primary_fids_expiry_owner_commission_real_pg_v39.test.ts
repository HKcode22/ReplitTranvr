/** Actual owner installation transaction in a fresh disposable PG16 only. */
import {describe,it,expect} from "vitest";
import {Client,Pool} from "pg";
import {readFileSync} from "node:fs";
import {inspectP5PrimaryExpiryOwner,commissionP5PrimaryExpiryDb} from "../scripts/v39_phase5_primary_fids_expiry_owner_commission_v39.mjs";
import {P5_PRIMARY_WRITER as W,P5_PRIMARY_READER as R,P5_PRIMARY_SQL,runP5PrimaryExpiry} from "../scripts/v39_phase5_primary_fids_expiry_github_v39.mjs";
const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const suite=process.env.V39_P5_PRIMARY_FIDS_DISPOSABLE_PG16==="1"?describe:describe.skip;
suite("exact V0103 owner commissioning on a fresh disposable database",()=>{
 it("rolls back partial DDL, installs four functions and one login, reuses reader and verifies distinct logins with no data mutation",async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||process.env.DATABASE_URL!==URL||
     process.env.V39_PHASE6_PROCESS_ARMED!=="0"||process.env.ADB_AUTO_COLLECT!=="0"||
     process.env.AERODATABOX_API_KEY||process.env.RAPIDAPI_KEY||process.env.AERODATABOX_WEBHOOK_SECRET)throw Error("DISPOSABLE_ONLY");
  const c=new Client({connectionString:URL});
  const password="ci_owner_commission_test_password_1234567890",readerPassword="ci_reader_only_test";
  let w:Pool|undefined,r:Pool|undefined;
  await c.connect();
  const opt={test:true};
  try{
   await c.query("CREATE ROLE "+R+" LOGIN NOINHERIT PASSWORD '"+readerPassword+"'");
   await c.query("GRANT CONNECT ON DATABASE neondb TO "+R);
   await c.query("GRANT USAGE ON SCHEMA clean TO "+R);
   await c.query("GRANT SELECT(expires_at_utc,deletion_verified_at_utc,content_class,storage_kind,retention_hours) ON clean.provider_content_blob_ref TO "+R);
   const before=await inspectP5PrimaryExpiryOwner(c,opt);
   expect(before).toEqual({existingFunctions:0,writerExists:false,existingReaderVerified:true,stopped:true});
   const sql=readFileSync(P5_PRIMARY_SQL,"utf8");
   const broken=sql.replace(/\nCOMMIT;\s*$/,"\nSELECT nonexistent_fixture_only_function();\nCOMMIT;\n");
   await expect(commissionP5PrimaryExpiryDb(c,broken,password,opt)).rejects.toThrow();
   expect(await inspectP5PrimaryExpiryOwner(c,opt)).toEqual(before);
   const done=await commissionP5PrimaryExpiryDb(c,sql,password,opt);
   expect(done).toEqual({functionsInstalled:4,newWriterLogin:1,existingReaderReused:true,newTables:0,primaryContentWrites:0,providerCalls:0});
   expect(await inspectP5PrimaryExpiryOwner(c,opt)).toEqual({...before,existingFunctions:4,writerExists:true});
   await expect(commissionP5PrimaryExpiryDb(c,sql,password,opt)).rejects.toThrow("ALREADY_COMMISSIONED_DO_NOT_REPLAY");
   w=new Pool({connectionString:"postgresql://"+W+":"+password+"@localhost:5432/neondb?sslmode=disable",max:1});
   r=new Pool({connectionString:"postgresql://"+R+":"+readerPassword+"@localhost:5432/neondb?sslmode=disable",max:1});
   const proof=await runP5PrimaryExpiry({writer:w,reader:r,apply:false,
      verifyOptions:{writer:{test:true,role:W,owner:"postgres"},reader:{test:true,role:R,owner:"postgres"}}});
   expect(proof).toMatchObject({status:"PRIMARY_FIDS_VERIFY_ONLY_NO_WRITES",before:{liveOriginals:0,eligibleOriginals:0},
      databaseWrites:0,distinctDbActorsVerified:true,phase6PaidGo:false});
   await expect(r.query("SELECT clean.phase5_primary_fids_expiry_sweep_v39(1)")).rejects.toMatchObject({code:"42501"});
   await expect(w.query("SELECT raw_payload FROM clean.fids_query_response")).rejects.toMatchObject({code:"42501"});
   expect((await c.query("SELECT count(*)::int n FROM clean.retention_tombstone")).rows[0].n).toBe(0);
  }finally{await Promise.all([w?.end(),r?.end(),c.end()]);}
 },60000);
});
