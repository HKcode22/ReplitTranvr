// Offline evidence projection. No network, provider, database, signing or mutation.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const fail=()=>{throw Error('HOLD_PROGRESS_EVIDENCE_CONTRADICTION');};
const sha=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
const date=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT/.test(x)&&Number.isFinite(Date.parse(x));
export function buildProgressReport(matrix,evidence){
 if(!matrix||!date(matrix.asOfUtc)||!Array.isArray(matrix.failures)||!evidence||!date(evidence.observedAtUtc)||!sha(evidence.mainSha)||!Array.isArray(evidence.runs)||!Number.isSafeInteger(evidence.sampleLimit)||evidence.sampleLimit<evidence.runs.length)fail();
 const ids=new Set(),classes={NARROW_CORRECTION_RECORDED:0,EXACT_CI_GREEN_DEPLOYMENT_PENDING:0,PARTIAL_OR_OPEN:0,HISTORICAL_LOSS_NO_BACKFILL:0};
 for(const [i,f] of matrix.failures.entries()){
  if(f.id!==`F${String(i+1).padStart(3,'0')}`||ids.has(f.id)||!Object.hasOwn(classes,f.classification)||!['CLOSED','NOT_CLOSED'].includes(f.closureStatus)||!Array.isArray(f.implementations)||!f.implementations.every(x=>/^I\d{3}$/.test(x))||typeof f.next!=='string')fail();
  if((f.closureStatus==='CLOSED')!==(f.classification==='NARROW_CORRECTION_RECORDED')||(f.closureStatus==='CLOSED'&&!f.closureEvidence))fail();
  ids.add(f.id);classes[f.classification]++;
 }
 const expected={narrowCorrected:classes.NARROW_CORRECTION_RECORDED,exactCiGreenPendingDeployment:classes.EXACT_CI_GREEN_DEPLOYMENT_PENDING,partialOrOpen:classes.PARTIAL_OR_OPEN,historicalLoss:classes.HISTORICAL_LOSS_NO_BACKFILL};
 if(!matrix.counts||Object.entries(expected).some(([k,v])=>matrix.counts[k]!==v))fail();
 const runIds=new Set(),sourceSample={total:0,active:0,queued:0,succeeded:0,failed:0,otherTerminal:0};
 for(const r of evidence.runs){
  if(!Number.isSafeInteger(r.id)||r.id<1||runIds.has(r.id)||!sha(r.headSha)||!['SOURCE','CI','RETENTION','OTHER'].includes(r.lane)||!['queued','in_progress','completed','waiting','requested','pending'].includes(r.status)||
   (r.status!=='completed'&&r.conclusion!==null)||(r.status==='completed'&&!['success','failure','cancelled','timed_out','neutral','skipped','action_required','stale','startup_failure'].includes(r.conclusion)))fail();
  runIds.add(r.id);
  if(r.lane!=='SOURCE'||r.headSha!==evidence.mainSha)continue;
  sourceSample.total++;
  if(r.status==='in_progress')sourceSample.active++;
  else if(r.status!=='completed')sourceSample.queued++;
  else if(r.conclusion==='success')sourceSample.succeeded++;
  else if(['failure','timed_out','startup_failure'].includes(r.conclusion))sourceSample.failed++;
  else sourceSample.otherTerminal++;
 }
 const priority={P0_SCIENTIFIC:0,P1_SCIENTIFIC:1,OPERATIONAL:2};
 const closedFailures=matrix.failures.filter(f=>f.closureStatus==='CLOSED');
 const openFailures=matrix.failures.filter(f=>f.closureStatus==='NOT_CLOSED').sort((a,b)=>(priority[a.scientificRisk]??3)-(priority[b.scientificRisk]??3)||a.id.localeCompare(b.id));
 return {schema:'v39.phase5b.owner-progress-report.v1',observedAtUtc:evidence.observedAtUtc,matrixAsOfUtc:matrix.asOfUtc,mainSha:evidence.mainSha,
  counts:{total:matrix.failures.length,closed:closedFailures.length,notClosed:openFailures.length},classifications:expected,
  sourceSample,runs:evidence.runs,openFailures,closedFailures,actualPreCommitVerified:false,softwareCausalImprovementVerified:false,
  interpretation:'Actions sample only; not a complete study denominator. Green CI, SOURCE success and ACKs cannot prove PRE, Packet B, POST or physical labels.'};
}
const evidenceLinks=(text,revision)=>text.replace(/\]\(([^)]+)\)/g,(match,target)=>/^https?:/.test(target)?match:']('+new URL(target,'https://github.com/HKcode22/ReplitTranvr/blob/'+revision+'/data-collection/phase6/').href+')');
const cell=x=>String(x??'UNCLASSIFIED').replaceAll('|','\\|').replace(/[\r\n]/g,' ');
export function renderProgressMarkdown(r){
 const lines=['# Phase5B recovery progress and evidence', '',`Observed: ${r.observedAtUtc}. Closure matrix: ${r.matrixAsOfUtc}.`, '',
  `**${r.counts.total} failure families: ${r.counts.closed} scoped corrections CLOSED; ${r.counts.notClosed} NOT_CLOSED.**`, '',
  '**Scientific improvement is not demonstrated by these workflow receipts.** Positive PRE/Packet B and separate POST/physical-label evidence remain required. This report does not certify current database counts.', '',
  `Production main: [${r.mainSha.slice(0,8)}](https://github.com/HKcode22/ReplitTranvr/commit/${r.mainSha}).`, '',
  `Recent current-main SOURCE sample: ${r.sourceSample.total} runs; ${r.sourceSample.active} running, ${r.sourceSample.queued} queued/waiting, ${r.sourceSample.succeeded} successful, ${r.sourceSample.failed} failed, ${r.sourceSample.otherTerminal} other terminal. This is not a complete study denominator.`, '',
  'Workflow failures count executions, not unique failure families. In-progress/queued work is not a failure. Successful SOURCE jobs require original receipts and independent database reconciliation before acquisition claims.', '',
  '## Open work in priority order', '', '| ID | Priority | Evidence category | Implementations | Required next evidence/action |','|---|---|---|---|---|',
  ...r.openFailures.map(f=>`| ${f.id} | ${cell(f.scientificRisk)} | ${cell(f.classification)} | ${f.implementations.join(', ')} | ${cell(f.next)} |`), '',
  '## Closed corrections preserved', '', 'These are scoped corrections, not full component or scientific closure. No gate is reopened by this report.', '',
  '| ID | Recorded evidence |','|---|---|',...r.closedFailures.map(f=>`| ${f.id} | ${cell(evidenceLinks(f.closureEvidence,r.mainSha))} |`), '',
  '## Workflow evidence sample', '', '| Run | Lane | SHA | Status | Conclusion |','|---|---|---|---|---|',
  ...r.runs.map(x=>`| [${x.id}](https://github.com/HKcode22/ReplitTranvr/actions/runs/${x.id}) | ${x.lane} | ${x.headSha.slice(0,8)} | ${x.status} | ${x.conclusion??'pending'} |`), '',
  'Regenerate locally: `node scripts/v39_phase5b_progress_report_v39.mjs <closure-matrix.json> <evidence.json>`. This reads existing files only and prints Markdown; it does not refresh evidence or alter production.', ''];
 return lines.join('\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  if(process.argv.length!==4)throw Error('USAGE');
  process.stdout.write(renderProgressMarkdown(buildProgressReport(JSON.parse(readFileSync(process.argv[2],'utf8')),JSON.parse(readFileSync(process.argv[3],'utf8')))));
 }catch{console.error('HOLD_PROGRESS_REPORT_INVALID_INPUT');process.exitCode=2;}
}
