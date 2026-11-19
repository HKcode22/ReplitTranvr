/**
 * Review-only Phase 6 schedule rebind helper.
 *
 * This module is intentionally not imported by a production workflow. It makes
 * a prospective date shift auditable without mutating the frozen calendar,
 * scheduler flags, approval ledger, database, or provider state.
 */
const UTC_DATE=/^\\d{4}-\\d{2}-\\d{2}$/;
const UTC_INSTANT=/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/;

export interface Phase6ScheduleRebindVerdict{
  pass:boolean;
  failures:string[];
  shiftedUtcFieldCount:number;
  templateCount:number;
}

function shiftUtc(value:string, offsetHours:number):string{
  if(UTC_DATE.test(value)){
    const shifted=new Date(\`\${value}T00:00:00.000Z\`);
    shifted.setUTCHours(shifted.getUTCHours()+offsetHours);
    return shifted.toISOString().slice(0,10);
  }
  if(!UTC_INSTANT.test(value)) throw new Error(\`unsupported-utc-value:\${value}\`);
  const shifted=new Date(value);
  shifted.setUTCHours(shifted.getUTCHours()+offsetHours);
  return shifted.toISOString();
}

function deepShift(value:unknown,offsetHours:number,counter:{n:number}):unknown{
  if(Array.isArray(value)) return value.map(item=>deepShift(item,offsetHours,counter));
  if(value&&typeof value==="object"){
    const out:Record<string,unknown>={};
    for(const [key,item] of Object.entries(value as Record<string,unknown>)){
      if(typeof item==="string"&&key.endsWith("Utc")&&(UTC_DATE.test(item)||UTC_INSTANT.test(item))){
        out[key]=shiftUtc(item,offsetHours);
        counter.n++;
      }else{
        out[key]=deepShift(item,offsetHours,counter);
      }
    }
    return out;
  }
  return value;
}

function canonicalNonUtc(value:unknown):unknown{
  if(Array.isArray(value)) return value.map(canonicalNonUtc);
  if(value&&typeof value==="object"){
    const out:Record<string,unknown>={};
    for(const [key,item] of Object.entries(value as Record<string,unknown>)){
      if(key.endsWith("Utc")) continue;
      out[key]=canonicalNonUtc(item);
    }
    return out;
  }
  return value;
}

function collectUtc(value:unknown,path:string,out:Map<string,string>):void{
  if(Array.isArray(value)){value.forEach((item,index)=>collectUtc(item,\`\${path}[\${index}]\`,out));return;}
  if(value&&typeof value==="object"){
    for(const [key,item] of Object.entries(value as Record<string,unknown>)){
      const next=path?\`\${path}.\${key}\`:key;
      if(typeof item==="string"&&key.endsWith("Utc")&&(UTC_DATE.test(item)||UTC_INSTANT.test(item))) out.set(next,item);
      else collectUtc(item,next,out);
    }
  }
}

export function rebindPhase6ScheduleForReviewOnly<T extends Record<string,unknown>>(
  plan:T,
  offsetHours:number,
):T{
  if(!Number.isInteger(offsetHours)||offsetHours<=0||offsetHours>168||offsetHours%24!==0)
    throw new Error("review-rebind-offset-must-be-positive-whole-days");
  const counter={n:0};
  return deepShift(plan,offsetHours,counter) as T;
}

export function verifyPhase6ScheduleRebind(
  original:Record<string,unknown>,
  candidate:Record<string,unknown>,
  offsetHours:number,
):Phase6ScheduleRebindVerdict{
  const failures:string[]=[];
  let shiftedUtcFieldCount=0;
  let templateCount=0;
  try{
    const expected=rebindPhase6ScheduleForReviewOnly(original,offsetHours);
    const originalUtc=new Map<string,string>();
    const candidateUtc=new Map<string,string>();
    collectUtc(original,"",originalUtc);
    collectUtc(candidate,"",candidateUtc);
    shiftedUtcFieldCount=originalUtc.size;
    if(JSON.stringify(canonicalNonUtc(candidate))!==JSON.stringify(canonicalNonUtc(original)))
      failures.push("non-utc-plan-content-changed");
    if(originalUtc.size!==candidateUtc.size)
      failures.push("utc-field-count-changed");
    for(const [path,value] of originalUtc){
      const expectedValue=new Map<string,string>();
      collectUtc(expected,"",expectedValue);
      if(candidateUtc.get(path)!==expectedValue.get(path))
        failures.push(\`utc-field-not-shifted:\${path}\`);
    }
    const originalTemplates=Array.isArray(original.templates)?original.templates:[];
    const candidateTemplates=Array.isArray(candidate.templates)?candidate.templates:[];
    templateCount=originalTemplates.length;
    if(candidateTemplates.length!==originalTemplates.length) failures.push("template-count-changed");
    const originalKeys=originalTemplates.map(row=>String((row as Record<string,unknown>).queryKey)).sort();
    const candidateKeys=candidateTemplates.map(row=>String((row as Record<string,unknown>).queryKey)).sort();
    if(JSON.stringify(originalKeys)!==JSON.stringify(candidateKeys)) failures.push("query-key-set-changed");
  }catch(error){
    failures.push(error instanceof Error?error.message:"rebind-verification-error");
  }
  return{pass:failures.length===0,failures:[...new Set(failures)],shiftedUtcFieldCount,templateCount};
}
