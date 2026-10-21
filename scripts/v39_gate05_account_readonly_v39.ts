/**
 * Gate0.5 NO-PAID / READ ONLY account + FIDS SQL budget diagnostic.
 * Exact flags: --read-only. Calls free provider GET balance and subscription
 * LIST only, plus READ ONLY SELECTs. It NEVER calls FIDS endpoint or CREATE.
 * Does not echo credentials, subscription IDs or connection strings.
 */
import "dotenv/config";
import pg from "pg";
import {getBalanceEvidenceStrict,listSubscriptionsStrictWithRetry}
  from "../server/lib/disruption/aerodataboxLimiter_v3";
import {evaluateGate05ReadOnlyAdmissionV39}
  from "../server/lib/disruption/gate05ReadOnlyAdmission_v39";

async function execute(argv:string[]){
  if(argv.length!==1||argv[0]!=="--read-only")
    throw Error("GATE05_READONLY_FLAG_REQUIRED");
  const v39=process.env.V39_DATABASE_RUNTIME_URL;
  const rest=process.env.DATABASE_RUNTIME_URL||process.env.DATABASE_URL;
  if(process.env.V39_DATABASE_TARGET_CONFIRM!=="production"||!v39||!rest)
    throw Error("GATE05_READONLY_RUNTIME_DB_HOLD");
  const pool=new pg.Pool({
    connectionString:rest,max:1,connectionTimeoutMillis:5000,query_timeout:10000,
    options:"-c default_transaction_read_only=on -c statement_timeout=9000"
  });
  const db=await pool.connect();
  let budgetRows:any[]=[],tablePresent=false;
  try{
    await db.query("BEGIN TRANSACTION READ ONLY");
    const found=await db.query("SELECT to_regclass('clean.adb_rest_budget_control') IS NOT NULL AS present");
    tablePresent=found.rows[0]?.present===true;
    if(tablePresent){
      const rows=await db.query(
        "SELECT category,cap_units,used_units,enabled "+
        "FROM clean.adb_rest_budget_control ORDER BY category LIMIT 100"
      );
      budgetRows=rows.rows;
    }
    await db.query("ROLLBACK");
  }catch{
    await db.query("ROLLBACK").catch(()=>{});
    throw Error("GATE05_READONLY_REST_BUDGET_SQL_HOLD");
  }finally{
    db.release();await pool.end();
  }
  const [account,subs]=await Promise.all([
    getBalanceEvidenceStrict(),listSubscriptionsStrictWithRetry()
  ]);
  const billable=subs.filter(s=>s.isActive&&s.billingType==="CreditBased");
  const other=subs.filter(s=>s.isActive&&s.billingType!=="CreditBased");
  const evalResult=evaluateGate05ReadOnlyAdmissionV39({
    creditsRemaining:account.balance.creditsRemaining,
    apiUnitsRemaining:account.quota.apiUnitsRemaining,
    apiUnitsLimit:account.quota.apiUnitsLimit,
    requestsRemaining:account.quota.requestsRemaining,
    observedAtUtc:account.quota.observedAtUtc,
    activeBillableSubscriptions:billable.length,
    activeUnrelatedSubscriptions:other.length,
    configuredRestDbSameAsV39:rest===v39,
    restBudgetTablePresent:tablePresent,
    restBudgetCategories:budgetRows.map(r=>({
      category:String(r.category),
      capUnits:Number(r.cap_units),
      usedUnits:Number(r.used_units),
      enabled:r.enabled===true
    }))
  });
  console.log(JSON.stringify(evalResult,null,2));
  return evalResult;
}
if(import.meta.url==="file://"+process.argv[1]){
  execute(process.argv.slice(2)).catch(()=>{
    console.error("GATE05_READONLY_ACCOUNT_AUDIT_HOLD (details redacted)");
    process.exitCode=1;
  });
}
export {execute as runGate05ReadOnlyAdmissionV39};
