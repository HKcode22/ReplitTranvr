"""Independent clock, initial bounded trial. No flight provider or DB access.
GitHub retains every collection, budget, STOP and expiry authority.
"""
import datetime as dt
import fcntl
import json
import os
import re
import sys
import stat
import time
from pathlib import Path
import urllib.request

REPO = 'HKcode22/ReplitTranvr'
ROOT = 'https://api.github.com/repos/' + REPO
REVIEW_MAIN = '6f518add10d00567a95fbcaf3650ebf608da8a60'
HEARTBEAT = 'phase6-autonomous-gh-controller-heartbeat-no-provider.yml'
PRIMARY = 'phase5-primary-fids-expiry-no-provider.yml'
ACTIVE = {'queued', 'in_progress', 'waiting', 'requested', 'pending'}
SHA = re.compile(r'[0-9a-f]{40}\Z')
TRIAL_MODES = {'PROBE', 'PRIMARY_BACKUP'}
SLOT_SECONDS = 900
MAX_EVENTS = 800
MAX_JOURNAL_BYTES = 1_000_000
TARGETS = {
    HEARTBEAT: ('actual-main-nonpaid-controller-heartbeat',
                'Read only GH workflow history and primary expiry execution metadata',
                'READONLY_GITHUB_CONTROLLER_HEALTH_NO_PROVIDER_NO_GO',
                '5467733d8fb2fc69e261ebae3415325f1057a1dc'),
    PRIMARY: ('primary-fids-expiry',
              'Verify exact main and execute only bounded primary FIDS expiry',
              'APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER',
              'cfc05a5ebed5c76cff41d7987e775d81b2ce1f3e'),
}

class Hold(Exception):
    pass

def check(ok, reason):
    if not ok:
        raise Hold(reason)

def instant(value):
    check(isinstance(value, str) and bool(re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z', value)), 'BAD_CLOCK')
    try:
        return dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        raise Hold('BAD_CLOCK') from None

def utcnow():
    return dt.datetime.now(dt.timezone.utc)

def ident(value):
    return type(value) is int and 0 < value < 10**16

def stamp(value):
    return value.isoformat(timespec='milliseconds').replace('+00:00','Z')

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def github(token):
    opener = urllib.request.build_opener(NoRedirect())
    def call(method, path, body=None):
        check(path.startswith('/') and not path.startswith('//'), 'BAD_API_PATH')
        headers = {'Accept':'application/vnd.github+json','Authorization':'Bearer '+token,
                   'X-GitHub-Api-Version':'2022-11-28','User-Agent':'travnr-independent-clock-v1'}
        raw = None if body is None else json.dumps(body,separators=(',',':')).encode()
        if raw is not None:
            headers['Content-Type'] = 'application/json'
        req = urllib.request.Request(ROOT+path,data=raw,headers=headers,method=method)
        try:
            with opener.open(req,timeout=10) as res:
                payload = res.read(4_000_001)
                check(len(payload)<=4_000_000, 'OVERSIZED_API_RESPONSE')
                return res.status,json.loads(payload)
        except Hold:
            raise
        except Exception:
            raise Hold('GITHUB_REQUEST_UNCERTAIN' if method=='POST' else 'GITHUB_READ_FAILED') from None
    return call

def get(api,path):
    code, data = api('GET',path)
    check(code==200 and isinstance(data,dict),'GITHUB_READ_FAILED')
    return data

def checked_main(api,pin):
    ref = get(api,'/git/ref/heads/main')
    check(ref.get('ref')=='refs/heads/main' and ref.get('object',{}).get('sha')==pin,'MAIN_CHANGED')

def run_row(row,workflow,clock):
    check(isinstance(row,dict) and ident(row.get('id')) and row.get('path')=='.github/workflows/'+workflow and row.get('head_branch')=='main' and isinstance(row.get('head_sha'),str) and bool(SHA.fullmatch(row['head_sha'])) and row.get('event') in {'schedule','workflow_dispatch'} and type(row.get('run_attempt')) is int and row['run_attempt']>=1,'INVALID_RUN')
    status=row.get('status'); conclusion=row.get('conclusion')
    check((status in ACTIVE and conclusion is None) or (status=='completed' and isinstance(conclusion,str)), 'INVALID_RUN_STATE')
    created=instant(row.get('created_at'))
    check(created<=clock+dt.timedelta(seconds=5),'FUTURE_RUN')
    return created

def page(api,path,workflow,clock,active=False):
    data=get(api,path); rows=data.get('workflow_runs'); n=data.get('total_count')
    check(type(n) is int and n>=0 and isinstance(rows,list) and len(rows)<=100 and n>=len(rows) and (n==0)==(len(rows)==0),'INVALID_HISTORY')
    if active:
        check(n==len(rows),'INCOMPLETE_ACTIVE_HISTORY')
    seen=set()
    for row in rows:
        run_row(row,workflow,clock)
        check(row['id'] not in seen,'DUPLICATE_HISTORY'); seen.add(row['id'])
        if active:
            check(row['status'] in ACTIVE,'ACTIVE_HISTORY_CHANGED')
    return rows

def observe_job(api,row,workflow,clock):
    if not row or row['status']!='completed':
        return None
    data=get(api,f"/actions/runs/{row['id']}/jobs?filter=latest&per_page=10")
    jobs=data.get('jobs')
    check(isinstance(jobs,list) and data.get('total_count')==len(jobs)<=10,'JOBS_INCOMPLETE')
    job_name,step_name,_,_=TARGETS[workflow]
    selected=[j for j in jobs if j.get('name')==job_name]
    check(len(selected)==1,'EXPECTED_JOB_MISSING')
    job=selected[0]
    check(job.get('run_id')==row['id'] and job.get('run_attempt')==row['run_attempt'] and job.get('head_sha')==row['head_sha'] and job.get('status')=='completed','JOB_IDENTITY_MISMATCH')
    start=job.get('started_at'); finish=job.get('completed_at'); created=run_row(row,workflow,clock)
    wait=None if start is None else round((instant(start)-created).total_seconds(),3)
    if wait is not None:
        check(wait>=0 and instant(start)<=clock+dt.timedelta(seconds=5),'INVALID_JOB_CLOCK')
    if finish is not None:
        check(start is not None and instant(start)<=instant(finish)<=clock+dt.timedelta(seconds=5),'INVALID_JOB_CLOCK')
    steps=job.get('steps',[]); check(isinstance(steps,list),'INVALID_STEPS')
    executed=[s for s in steps if s.get('name')==step_name]
    check(len(executed)<=1,'DUPLICATE_TARGET_STEP')
    return {'runId':row['id'],'event':row['event'],'createdUtc':row['created_at'],'jobStartedUtc':start,'jobCompletedUtc':finish,
            'runToJobStartSeconds':wait,'jobConclusion':job.get('conclusion'),
            'observationStepConclusion':executed[0].get('conclusion') if executed else None,
            'clockArrivalMeasured':wait is not None,'schedulerHealthCertified':False}

def exact_primary_authority(api,pin):
    # Never broaden the already-reviewed primary cleanup to private APPLY.
    required={'P5_PRIMARY_FIDS_EXPIRY_ENABLED':'true',
              'P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA':pin,
              'P5_PRIMARY_FIDS_EXPIRY_APPROVAL':TARGETS[PRIMARY][2],
              'P6_PRIVATE_EPOCH_EXPIRY_MODE':'VERIFY_ONLY'}
    for name,value in required.items():
        data=get(api,'/actions/variables/'+name)
        check(data.get('name')==name and data.get('value')==value,'PRIMARY_APPROVAL_OR_PRIVATE_MODE_DRIFT')

def trial_scope(env, mode, pin, clock=None):
    check(mode in TRIAL_MODES and pin == REVIEW_MAIN, 'INVALID_TRIAL_SCOPE')
    start = instant(env.get('TRAVNR_CLOCK_START_UTC'))
    end = instant(env.get('TRAVNR_CLOCK_END_UTC'))
    check(dt.timedelta(0) < end-start <= dt.timedelta(hours=48), 'INVALID_TRIAL_WINDOW')
    if clock is not None:
        check(start<=clock<end, 'OUTSIDE_BOUNDED_TRIAL')
    confirm = 'RUN_BOUNDED_PRIMARY_BACKUP_ONLY' if mode=='PRIMARY_BACKUP' else 'RUN_BOUNDED_READONLY_HEARTBEAT_ONLY'
    check(env.get('TRAVNR_CLOCK_CONFIRM')==confirm, 'NO_TRIAL_PERMISSION')
    trial = env.get('TRAVNR_CLOCK_TRIAL_ID','')
    check(isinstance(trial,str) and bool(re.fullmatch(r'[0-9a-f]{32}',trial)), 'INVALID_TRIAL_ID')
    return {'schema':'travnr.independent.clock.journal.v1','trialId':trial,'mode':mode,
            'main':pin,'startUtc':stamp(start),'endUtc':stamp(end)}

def journal_dir(env):
    # Render's writable root filesystem is ephemeral. Require the reviewed
    # persistent mount, never silently create an ephemeral substitute.
    mount = Path('/var/data')
    try:
        mounts = Path('/proc/self/mountinfo').read_text().splitlines()
        is_mount = mount.is_mount() or any(len(line.split())>4 and line.split()[4]==str(mount) for line in mounts)
    except OSError:
        is_mount = False
    check(is_mount and mount.is_dir() and not mount.is_symlink(), 'PERSISTENT_MOUNT_REQUIRED')
    where = env.get('TRAVNR_CLOCK_STATE_DIR','/var/data/travnr-clock')
    check(where == '/var/data/travnr-clock', 'UNREVIEWED_JOURNAL_PATH')
    return Path(where)

class Journal:
    """Append-only, fsynced attempt custody. No flight rows or credentials.
    An uncertain POST remains unresolved across process restarts. Reinitializing
    or restoring an old disk snapshot is explicitly NOT a recovery operation.
    """
    def __init__(self, directory, scope, initialize=False):
        self.scope = scope
        self.fd = None
        self.pending = None
        self.run_ids = set()
        self.last_slot = None
        self.blocked = False
        self.events = 0
        self.poisoned = False
        directory = Path(directory)
        if initialize:
            directory.mkdir(mode=0o700, exist_ok=True)
        st = directory.lstat()
        check(stat.S_ISDIR(st.st_mode) and st.st_uid==os.getuid() and st.st_mode & 0o077==0, 'UNSAFE_JOURNAL_DIRECTORY')
        self.path = directory/'journal.jsonl'
        flags = os.O_RDWR | os.O_APPEND | os.O_NOFOLLOW
        if initialize:
            flags |= os.O_CREAT | os.O_EXCL
        try:
            self.fd = os.open(self.path, flags, 0o600)
            fcntl.flock(self.fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            st=os.fstat(self.fd)
            check(stat.S_ISREG(st.st_mode) and st.st_uid==os.getuid() and st.st_nlink==1 and st.st_mode & 0o077==0 and st.st_size<MAX_JOURNAL_BYTES,'UNSAFE_JOURNAL_FILE')
            if initialize:
                self._append({'kind':'INIT','scope':scope})
                dfd=os.open(directory,os.O_RDONLY|os.O_DIRECTORY)
                try:
                    os.fsync(dfd)
                finally:
                    os.close(dfd)
            else:
                with os.fdopen(os.dup(self.fd),'rb') as f:
                    raw=f.read(MAX_JOURNAL_BYTES+1)
                check(0<len(raw)<MAX_JOURNAL_BYTES and raw.endswith(b'\n'),'TRUNCATED_JOURNAL_NO_REPLAY')
                lines=raw.splitlines()
                check(len(lines)<=MAX_EVENTS,'JOURNAL_LIMIT')
                for line in lines:
                    try:
                        event=json.loads(line)
                    except Exception:
                        raise Hold('INVALID_JOURNAL_NO_REPLAY') from None
                    check(isinstance(event,dict),'INVALID_JOURNAL_NO_REPLAY')
                    self._apply(event)
        except Hold:
            self.close()
            raise
        except Exception:
            self.close()
            raise Hold('JOURNAL_UNAVAILABLE_OR_ALREADY_EXISTS_NO_REPLAY') from None

    def _apply(self,event):
        kind=event.get('kind')
        if kind=='INIT':
            check(self.events==0 and set(event)=={'kind','scope'} and event['scope']==self.scope,'JOURNAL_SCOPE_DRIFT_NO_REPLAY')
        else:
            check(self.events>0,'JOURNAL_INITIALIZATION_MISSING')
            if kind=='TICK':
                check(set(event)=={'kind','slot','observedUtc'} and type(event['slot']) is int and (self.last_slot is None or event['slot']>self.last_slot),'JOURNAL_TICK_DRIFT')
                observed=instant(event['observedUtc'])
                check(int(observed.timestamp())//SLOT_SECONDS==event['slot'] and instant(self.scope['startUtc'])<=observed<instant(self.scope['endUtc']),'JOURNAL_TICK_DRIFT')
                self.last_slot=event['slot']
            elif kind=='ATTEMPT':
                expected=PRIMARY if self.scope['mode']=='PRIMARY_BACKUP' else HEARTBEAT
                sent=instant(event.get('sentUtc'))
                check(set(event)=={'kind','workflow','sentUtc'} and self.pending is None and not self.blocked and self.last_slot is not None and len(self.run_ids)<193 and event['workflow']==expected and instant(self.scope['startUtc'])<=sent<instant(self.scope['endUtc']),'JOURNAL_ATTEMPT_DRIFT')
                self.pending=dict(event)
            elif kind=='ACK':
                check(set(event)=={'kind','runId','ackUtc'} and self.pending and self.pending['kind']=='ATTEMPT' and ident(event['runId']) and event['runId'] not in self.run_ids and instant(event['ackUtc'])>=instant(self.pending['sentUtc']),'JOURNAL_ACK_DRIFT')
                self.run_ids.add(event['runId'])
                self.pending=dict(self.pending,kind='ACK',runId=event['runId'],ackUtc=event['ackUtc'])
            elif kind=='TERMINAL':
                check(set(event)=={'kind','runId','job','recordedUtc'} and self.pending and self.pending['kind']=='ACK' and event['runId']==self.pending['runId'] and isinstance(event['job'],dict) and event['job'].get('runId')==event['runId'] and instant(event['recordedUtc'])>=instant(self.pending['ackUtc']),'JOURNAL_TERMINAL_DRIFT')
                job=event['job']
                if self.scope['mode']=='PRIMARY_BACKUP' and (job.get('jobConclusion')!='success' or job.get('observationStepConclusion')!='success'):
                    self.blocked=True
                self.pending=None
            else:
                raise Hold('INVALID_JOURNAL_EVENT_NO_REPLAY')
        self.events+=1

    def _append(self,event):
        check(not self.poisoned,'JOURNAL_WRITE_UNCERTAIN_NO_REPLAY')
        check(self.fd is not None and self.events<MAX_EVENTS,'JOURNAL_LIMIT')
        raw=(json.dumps(event,separators=(',',':'),sort_keys=True)+'\n').encode()
        check(os.fstat(self.fd).st_size+len(raw)<MAX_JOURNAL_BYTES,'JOURNAL_LIMIT')
        # If fsync or process termination leaves partial bytes, the next
        # instance refuses rather than forgetting a possible POST.
        self.poisoned=True
        try:
            written=os.write(self.fd,raw)
            check(written==len(raw),'JOURNAL_PARTIAL_WRITE_NO_REPLAY')
            os.fsync(self.fd)
        except Hold:
            raise
        except Exception:
            raise Hold('JOURNAL_WRITE_UNCERTAIN_NO_REPLAY') from None
        self._apply(event)
        self.poisoned=False

    def begin_tick(self,clock):
        check(not self.poisoned,'JOURNAL_WRITE_UNCERTAIN_NO_REPLAY')
        slot=int(clock.timestamp())//SLOT_SECONDS
        if self.last_slot is not None and slot<=self.last_slot:
            return False
        self._append({'kind':'TICK','slot':slot,'observedUtc':stamp(clock)})
        return True

    def begin_attempt(self,workflow,sent):
        self._append({'kind':'ATTEMPT','workflow':workflow,'sentUtc':stamp(sent)})

    def acknowledge(self,run_id,clock):
        self._append({'kind':'ACK','runId':run_id,'ackUtc':stamp(clock)})

    def reconcile(self,api,workflow,pin,clock):
        check(not self.poisoned,'JOURNAL_WRITE_UNCERTAIN_NO_REPLAY')
        check(not self.blocked,'PRIMARY_TERMINAL_FAILURE_REVIEW_REQUIRED')
        if self.pending is None:
            return None
        check(self.pending['workflow']==workflow,'JOURNAL_WORKFLOW_DRIFT')
        check(self.pending['kind']=='ACK','UNKNOWN_DISPATCH_DURABLY_HELD_NO_REPLAY')
        rid=self.pending['runId']
        row=get(api,'/actions/runs/'+str(rid))
        created=run_row(row,workflow,clock)
        check(row['id']==rid and row['run_attempt']==1 and row['head_sha']==pin and row['event']=='workflow_dispatch' and created>=instant(self.pending['sentUtc'])-dt.timedelta(seconds=5),'ACK_RUN_IDENTITY_DRIFT_NO_REPLAY')
        if row['status']!='completed':
            return {'status':'DEFER_KNOWN_ACK_STILL_ACTIVE','runId':rid}
        job=observe_job(api,row,workflow,clock)
        check(job is not None,'ACK_JOB_UNAVAILABLE_NO_REPLAY')
        job['externalDispatchSentUtc']=self.pending['sentUtc']
        job['externalDispatchAckUtc']=self.pending['ackUtc']
        job['dispatchToRunCreatedSeconds']=round((created-instant(self.pending['sentUtc'])).total_seconds(),3)
        if job['jobStartedUtc'] is not None:
            job['dispatchToJobStartSeconds']=round((instant(job['jobStartedUtc'])-instant(self.pending['sentUtc'])).total_seconds(),3)
        self._append({'kind':'TERMINAL','runId':rid,'job':job,'recordedUtc':stamp(clock)})
        check(not self.blocked,'PRIMARY_TERMINAL_FAILURE_REVIEW_REQUIRED')
        return {'status':'RECONCILED_EXACT_ACK_JOB_NOT_COLLECTION_PROOF','job':job}

    def close(self):
        if self.fd is not None:
            os.close(self.fd)
            self.fd=None

    def __enter__(self):
        return self

    def __exit__(self,*args):
        self.close()

def tick(api,env,now=utcnow,emit=lambda row:None,journal=None):
    mode=env.get('TRAVNR_CLOCK_MODE','OBSERVE'); pin=env.get('TRAVNR_CLOCK_MAIN_SHA','')
    check(mode in {'OBSERVE','OBSERVE_PRIMARY'}|TRIAL_MODES and pin==REVIEW_MAIN,'INVALID_CONFIGURATION')
    check(not any(env.get(k) for k in ('DATABASE_URL','V39_DATABASE_RUNTIME_URL','AERODATABOX_API_KEY','RAPIDAPI_KEY','AERODATABOX_WEBHOOK_SECRET')), 'FORBIDDEN_CREDENTIAL')
    clock=now(); check(clock.tzinfo is not None,'BAD_CLOCK')
    write=mode in TRIAL_MODES; primary=mode in {'OBSERVE_PRIMARY','PRIMARY_BACKUP'}
    workflow=PRIMARY if primary else HEARTBEAT; runs='/actions/workflows/'+workflow+'/runs'
    receipt={'mode':mode,'observedUtc':stamp(clock),'main':pin,'workflow':workflow,
             'providerCallsByClock':0,'databaseWritesByClock':0,'phase6PaidGo':False,
             'childMayApplyPreviouslyApprovedDueCleanup':mode=='PRIMARY_BACKUP'}
    if write:
        scope=trial_scope(env,mode,pin,clock)
        check(isinstance(journal,Journal) and journal.scope==scope and journal.fd is not None,'DURABLE_JOURNAL_REQUIRED')
        if not journal.begin_tick(clock):
            return dict(receipt,status='DEFER_ALREADY_OBSERVED_SLOT')
        slot=int(clock.timestamp())//SLOT_SECONDS
        emit({'status':'EXTERNAL_UTC_TICK','slotUtc':stamp(dt.datetime.fromtimestamp(slot*SLOT_SECONDS,dt.timezone.utc)), 'observedUtc':stamp(clock),'trialId':scope['trialId']})
        # Reconcile previously accepted work even if the repository main later
        # changes. Subsequent new dispatch still needs exact main and blob.
        reconciled=journal.reconcile(api,workflow,pin,clock)
        if reconciled:
            emit(reconciled)
            if reconciled['status']=='DEFER_KNOWN_ACK_STILL_ACTIVE':
                return dict(receipt,**reconciled)
    checked_main(api,pin)
    wf=get(api,'/contents/.github/workflows/'+workflow+'?ref='+pin)
    check(wf.get('type')=='file' and wf.get('sha')==TARGETS[workflow][3],'WORKFLOW_BLOB_DRIFT')
    rows=page(api,runs+'?branch=main&per_page=100',workflow,clock)
    rows.sort(key=lambda r:(instant(r['created_at']),r['id']),reverse=True)
    manual=[r for r in rows if r['event']=='workflow_dispatch' and r['head_sha']==pin and r['run_attempt']==1]
    scheduled=[r for r in rows if r['event']=='schedule']
    gaps=[round((instant(a['created_at'])-instant(b['created_at'])).total_seconds()/60,2) for a,b in zip(scheduled,scheduled[1:])]
    latest=rows[0] if rows else None
    receipt.update(latestObservedJob=observe_job(api,latest,workflow,clock),scheduleIntervals=len(gaps),maxObservedScheduleGapMinutes=max(gaps,default=None))
    if not write:
        return dict(receipt,status='OBSERVED_NO_DISPATCH')
    if primary:
        exact_primary_authority(api,pin)
    # Independent active sweeps avoid mistaking truncated recent history for idleness.
    active=[]
    for state in sorted(ACTIVE):
        active.extend(page(api,runs+'?branch=main&status='+state+'&per_page=100',workflow,now(),active=True))
    if active or any(r['status'] in ACTIVE for r in rows):
        return dict(receipt,status='DEFER_ACTIVE_NO_DISPATCH')
    if primary:
        # A failed, skipped, rerun or old-main predecessor is not a safe
        # stale-success trigger. Do not retry it or silently ignore uncertainty.
        job=receipt['latestObservedJob']
        check(latest and latest['head_sha']==pin and latest['run_attempt']==1 and latest['conclusion']=='success' and job and job['jobConclusion']=='success' and job['observationStepConclusion']=='success' and job['jobCompletedUtc'],'PRIMARY_PREDECESSOR_REVIEW_REQUIRED')
        if clock-instant(job['jobCompletedUtc'])<dt.timedelta(minutes=45):
            return dict(receipt,status='DEFER_RECENT_PRIMARY_EXECUTION_NO_DISPATCH')
    elif manual and clock-instant(manual[0]['created_at'])<dt.timedelta(minutes=10):
        return dict(receipt,status='DEFER_RECENT_MANUAL_NO_DISPATCH')
    checked_main(api,pin)
    if primary:
        exact_primary_authority(api,pin)
    sent=now(); trial_scope(env,mode,pin,sent)
    journal.begin_attempt(workflow,sent)
    emit({'status':'CLOCK_DISPATCH_ATTEMPT_DURABLE','sentUtc':stamp(sent),'workflow':workflow,'mode':mode})
    try:
        code, ack=api('POST','/actions/workflows/'+workflow+'/dispatches',{'ref':'main','return_run_details':True,'inputs':{'confirm':TARGETS[workflow][2],'approved_main_sha':pin}})
        rid=ack.get('workflow_run_id') if isinstance(ack,dict) else None
        check(code==200 and ident(rid) and ack.get('run_url')==ROOT+'/actions/runs/'+str(rid) and ack.get('html_url')=='https://github.com/'+REPO+'/actions/runs/'+str(rid),'ACK_NOT_EXACT')
        journal.acknowledge(rid,now())
    except Exception:
        raise Hold('DISPATCH_UNKNOWN_DURABLE_HOLD_NO_RETRY') from None
    return dict(receipt,status='CLOCK_ACK_NOT_EXECUTION_PROOF',runId=rid,sentUtc=stamp(sent),ackUtc=stamp(now()))

def output(row):
    print(json.dumps(row,separators=(',',':')),flush=True)

def loop(api,env,journal=None):
    write=env.get('TRAVNR_CLOCK_MODE') in TRIAL_MODES
    ended=False
    while True:
        clock=utcnow()
        if write and clock>=instant(journal.scope['endUtc']):
            if not ended:
                # Allow read-only final ACK reconciliation after the deadline.
                try:
                    result=journal.reconcile(api,PRIMARY if journal.scope['mode']=='PRIMARY_BACKUP' else HEARTBEAT,REVIEW_MAIN,clock)
                    if result:
                        output(result)
                    ended=journal.pending is None
                except Hold as e:
                    print('HOLD_TRAVNR_CLOCK_'+str(e),file=sys.stderr,flush=True)
                output({'status':'TRIAL_ENDED_NO_NEW_DISPATCH','observedUtc':stamp(clock),'pendingAck':journal.pending is not None})
            time.sleep(SLOT_SECONDS)
            continue
        try:
            output(tick(api,env,emit=output,journal=journal))
        except Hold as e:
            print('HOLD_TRAVNR_CLOCK_'+str(e),file=sys.stderr,flush=True)
        except Exception:
            print('HOLD_TRAVNR_CLOCK_UNEXPECTED_REDACTED',file=sys.stderr,flush=True)
        # Absolute UTC slots, no catch-up storm following a delayed tick.
        seconds=SLOT_SECONDS-(utcnow().timestamp()%SLOT_SECONDS)
        time.sleep(max(1,seconds))

def main():
    try:
        check(len(sys.argv)<=2 and (len(sys.argv)==1 or sys.argv[1] in {'--loop','--init-journal'}),'INVALID_COMMAND')
        command=sys.argv[1] if len(sys.argv)==2 else '--once'
        mode=os.environ.get('TRAVNR_CLOCK_MODE','OBSERVE')
        scope=trial_scope(os.environ,mode,os.environ.get('TRAVNR_CLOCK_MAIN_SHA','')) if mode in TRIAL_MODES else None
        if command=='--init-journal':
            check(scope is not None,'EXPLICIT_TRIAL_INIT_REQUIRED')
            with Journal(journal_dir(os.environ),scope,initialize=True):
                output({'status':'CLOCK_JOURNAL_INITIALIZED_NO_NETWORK','scope':scope})
            return 0
        token=os.environ.get('TRAVNR_CLOCK_GITHUB_TOKEN','')
        check(len(token)>=16,'SCOPED_GITHUB_TOKEN_REQUIRED')
        api=github(token)
        if scope is None:
            if command=='--loop':
                loop(api,os.environ)
            else:
                output(tick(api,os.environ,emit=output))
        else:
            with Journal(journal_dir(os.environ),scope) as journal:
                if command=='--loop':
                    loop(api,os.environ,journal)
                else:
                    output(tick(api,os.environ,emit=output,journal=journal))
        return 0
    except Hold as e:
        print('HOLD_TRAVNR_CLOCK_'+str(e),file=sys.stderr)
        return 2
    except Exception:
        print('HOLD_TRAVNR_CLOCK_UNEXPECTED_REDACTED',file=sys.stderr)
        return 2

if __name__=='__main__':
    sys.exit(main())
