/**
 * Metadata-only independent Phase5 day quality/audit CLI.
 * This does NOT read raw provider Content, call providers, mutate DB, or
 * certify flight PRE/POST. V0079 need be separately installed/released.
 */
import {Pool} from "pg";
import {auditPhase5SourceDay}
 from "../server/lib/disruption/phase5DaySourceQualityReadonly_v39";

async function main():Promise<void>{
 if(process.argv.length!==4||
    process.env.V39_P5_SOURCE_AUDITOR_ROLE_APPROVED!=="1"||
    !/^[a-f0-9]{64}$/.test(process.argv[2])||
    !/^(?:[1-9]|[12][0-9]|3[01])$/.test(process.argv[3]))
  throw Error("REFUSED_P5_DAILY_QA_OWNER_NOT_ADMITTED");
 const url=process.env.V39_P5_AUDITOR_DATABASE_URL;
 if(!url)throw Error("REFUSED_P5_DAILY_QA_READONLY_DB_ROLE_MISSING");
 const db=new Pool({
  connectionString:url,max:1,connectionTimeoutMillis:10000,
  application_name:"v39_phase5_source_quality_metadata_only",
 });
 try{
  const q=await auditPhase5SourceDay(db,process.argv[2],Number(process.argv[3]));
  console.log(JSON.stringify(q));
 }finally{await db.end().catch(()=>{});}
}
main().catch(error=>{
 const msg=error instanceof Error?error.message:"";
 console.error(/^REFUSED_P5_DAILY_QA_[A-Z0-9_]+$/.test(msg)
  ?msg:"REFUSED_P5_DAILY_QA_UNKNOWN_DB_ERROR");
 process.exitCode=2;
});
