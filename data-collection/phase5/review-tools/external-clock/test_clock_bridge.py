import datetime as dt
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import clock_bridge as c

NOW=dt.datetime(2026,11,18,4,0,tzinfo=dt.timezone.utc)
PIN=c.REVIEW_MAIN

def env(mode='PROBE'):
    return {'TRAVNR_CLOCK_MODE':mode,'TRAVNR_CLOCK_MAIN_SHA':PIN,
            'TRAVNR_CLOCK_START_UTC':c.stamp(NOW-dt.timedelta(hours=1)),
            'TRAVNR_CLOCK_END_UTC':c.stamp(NOW+dt.timedelta(hours=2)),
            'TRAVNR_CLOCK_CONFIRM':'RUN_BOUNDED_PRIMARY_BACKUP_ONLY' if mode=='PRIMARY_BACKUP' else 'RUN_BOUNDED_READONLY_HEARTBEAT_ONLY',
            'TRAVNR_CLOCK_TRIAL_ID':'a'*32}

def row(workflow=c.HEARTBEAT,rid=123,at=NOW-dt.timedelta(hours=2),event='schedule',status='completed',conclusion='success',sha=PIN,attempt=1):
    return {'id':rid,'path':'.github/workflows/'+workflow,'head_branch':'main','head_sha':sha,'event':event,
            'status':status,'conclusion':conclusion,'run_attempt':attempt,'created_at':c.stamp(at)}

def job(r,workflow,conclusion='success',step='success'):
    at=c.instant(r['created_at']); return {'run_id':r['id'],'run_attempt':r['run_attempt'],'head_sha':r['head_sha'],
        'name':c.TARGETS[workflow][0],'status':'completed','conclusion':conclusion,'started_at':c.stamp(at+dt.timedelta(seconds=2)),
        'completed_at':c.stamp(at+dt.timedelta(seconds=30)),'steps':[{'name':c.TARGETS[workflow][1],'conclusion':step}]}

class API:
    def __init__(self,workflow=c.HEARTBEAT,rows=None):
        self.workflow=workflow; self.rows=rows if rows is not None else [row(workflow)]
        self.jobs={r['id']:job(r,workflow) for r in self.rows if r['status']=='completed'}
        self.by_id={r['id']:r for r in self.rows}; self.calls=[]; self.posts=[]; self.ack_id=987; self.main=PIN
        self.blob=c.TARGETS[workflow][3]; self.active_extra=[]; self.active_total=None; self.post_error=False; self.bad_ack=False
        self.vars={'P5_PRIMARY_FIDS_EXPIRY_ENABLED':'true','P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA':PIN,
            'P5_PRIMARY_FIDS_EXPIRY_APPROVAL':c.TARGETS[c.PRIMARY][2],'P6_PRIVATE_EPOCH_EXPIRY_MODE':'VERIFY_ONLY'}
        self.on_post=None
    def __call__(self,method,path,body=None):
        self.calls.append((method,path))
        if method=='POST':
            self.posts.append((path,body))
            if self.on_post:self.on_post()
            if self.post_error:raise TimeoutError('must never leak')
            rid=self.ack_id
            return 200,{'workflow_run_id':rid,'run_url':c.ROOT+'/actions/runs/'+str(rid),'html_url':'https://github.com/'+c.REPO+'/actions/runs/'+str(rid) if not self.bad_ack else 'https://invalid.example'}
        if path=='/git/ref/heads/main':return 200,{'ref':'refs/heads/main','object':{'sha':self.main}}
        if path.startswith('/contents/'):return 200,{'type':'file','sha':self.blob}
        if path.startswith('/actions/variables/'):
            name=path.rsplit('/',1)[1]; return 200,{'name':name,'value':self.vars[name]}
        if '/actions/workflows/' in path and '/runs?' in path:
            if '&status=' in path:
                status=path.split('&status=')[1].split('&')[0]
                matches=[r for r in self.rows+self.active_extra if r['status']==status]
                return 200,{'total_count':self.active_total if self.active_total is not None else len(matches),'workflow_runs':matches}
            return 200,{'total_count':len(self.rows),'workflow_runs':self.rows}
        if path.startswith('/actions/runs/'):
            rid=int(path.split('/')[3]);
            if '/jobs?' in path:return 200,{'total_count':1,'jobs':[self.jobs[rid]]}
            return 200,self.by_id[rid]
        raise AssertionError(path)

class ClockTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.dir=Path(self.tmp.name)/'journal'
        self.j=None
    def tearDown(self):
        if self.j:self.j.close()
        self.tmp.cleanup()
    def open(self,e=None,init=True):
        e=e or env(); self.j=c.Journal(self.dir,c.trial_scope(e,e['TRAVNR_CLOCK_MODE'],PIN),initialize=init); return self.j
    def tick(self,api,e=None,at=NOW):
        return c.tick(api,e or env(),now=lambda:at,journal=self.j)
    def assert_no_post(self,api):self.assertEqual(api.posts,[])
    def test_observe(self):
        api=API(); r=self.tick(api,env('OBSERVE')); self.assertEqual(r['status'],'OBSERVED_NO_DISPATCH'); self.assertEqual(r['latestObservedJob']['runToJobStartSeconds'],2); self.assert_no_post(api)
    def test_observe_primary(self):
        api=API(c.PRIMARY); self.assertEqual(self.tick(api,env('OBSERVE_PRIMARY'))['status'],'OBSERVED_NO_DISPATCH'); self.assert_no_post(api)
    def test_requires_journal(self):
        api=API(); self.assertRaisesRegex(c.Hold,'DURABLE_JOURNAL',self.tick,api); self.assert_no_post(api)
    def test_exact_post_and_durable_marker(self):
        api=API(); self.open()
        api.on_post=lambda:self.assertEqual(json.loads(self.j.path.read_text().splitlines()[-1])['kind'],'ATTEMPT')
        r=self.tick(api); self.assertEqual(r['runId'],987); self.assertEqual(self.j.pending['kind'],'ACK'); self.assertEqual(len(api.posts),1)
        self.assertEqual(api.posts[0][1],{'ref':'main','return_run_details':True,'inputs':{'confirm':c.TARGETS[c.HEARTBEAT][2],'approved_main_sha':PIN}})
    def test_unknown_dispatch_restart_no_replay(self):
        api=API(); self.open();api.post_error=True
        with self.assertRaisesRegex(c.Hold,'DISPATCH_UNKNOWN_DURABLE'):self.tick(api)
        self.j.close();self.open(init=False); api.post_error=False
        self.assertEqual(self.tick(api)['status'],'DEFER_ALREADY_OBSERVED_SLOT')
        with self.assertRaisesRegex(c.Hold,'UNKNOWN_DISPATCH_DURABLY'):self.tick(api,at=NOW+dt.timedelta(minutes=15))
        self.assertEqual(len(api.posts),1)
    def test_bad_ack_is_held(self):
        api=API();self.open();api.bad_ack=True
        with self.assertRaisesRegex(c.Hold,'DISPATCH_UNKNOWN_DURABLE'):self.tick(api)
        self.assertEqual(self.j.pending['kind'],'ATTEMPT');self.assertEqual(len(api.posts),1)
    def test_acked_active_defers(self):
        api=API();self.open();self.tick(api)
        r=row(rid=987,event='workflow_dispatch',at=NOW,status='in_progress',conclusion=None)
        api.by_id[987]=r
        self.assertEqual(self.tick(api,at=NOW+dt.timedelta(minutes=15))['status'],'DEFER_KNOWN_ACK_STILL_ACTIVE')
        self.assertEqual(len(api.posts),1)
    def test_terminal_readback_and_next_slot(self):
        api=API();self.open();self.tick(api); self.j.close(); self.open(init=False)
        r=row(rid=987,event='workflow_dispatch',at=NOW);api.by_id[987]=r;api.jobs[987]=job(r,c.HEARTBEAT);api.rows.append(r);api.ack_id=988
        self.assertEqual(self.tick(api,at=NOW+dt.timedelta(minutes=15))['runId'],988)
        events=[json.loads(x) for x in self.j.path.read_text().splitlines()];t=[x for x in events if x['kind']=='TERMINAL'][0]
        self.assertEqual(t['job']['dispatchToJobStartSeconds'],2);self.assertEqual(len(api.posts),2)
    def test_ack_identity_drift(self):
        api=API();self.open();self.tick(api);api.by_id[987]=row(rid=987,event='workflow_dispatch',at=NOW,sha='b'*40)
        with self.assertRaisesRegex(c.Hold,'ACK_RUN_IDENTITY_DRIFT'):self.tick(api,at=NOW+dt.timedelta(minutes=15))
        self.assertEqual(len(api.posts),1)
    def test_main_changed(self):
        api=API();api.main='b'*40;self.open();self.assertRaisesRegex(c.Hold,'MAIN_CHANGED',self.tick,api);self.assert_no_post(api)
    def test_blob_changed(self):
        api=API();api.blob='b'*40;self.open();self.assertRaisesRegex(c.Hold,'WORKFLOW_BLOB_DRIFT',self.tick,api);self.assert_no_post(api)
    def test_active_outside_recent_history(self):
        api=API();api.active_extra=[row(rid=444,status='queued',conclusion=None)];self.open();self.assertEqual(self.tick(api)['status'],'DEFER_ACTIVE_NO_DISPATCH');self.assert_no_post(api)
    def test_incomplete_active(self):
        api=API();api.active_total=101;self.open();self.assertRaisesRegex(c.Hold,'INVALID_HISTORY|INCOMPLETE_ACTIVE',self.tick,api);self.assert_no_post(api)
    def test_recent_manual(self):
        api=API(rows=[row(event='workflow_dispatch',at=NOW-dt.timedelta(minutes=3))]);self.open();self.assertEqual(self.tick(api)['status'],'DEFER_RECENT_MANUAL_NO_DISPATCH');self.assert_no_post(api)
    def test_outside_window(self):
        api=API();self.open();self.assertRaisesRegex(c.Hold,'OUTSIDE_BOUNDED_TRIAL',self.tick,api,env(),NOW+dt.timedelta(hours=2));self.assert_no_post(api)
    def test_forbidden_secret(self):
        api=API();self.open();e=env();e['DATABASE_URL']='never log';self.assertRaisesRegex(c.Hold,'FORBIDDEN_CREDENTIAL',self.tick,api,e);self.assert_no_post(api)
    def test_primary_stale_success(self):
        e=env('PRIMARY_BACKUP');api=API(c.PRIMARY);self.open(e);r=self.tick(api,e)
        self.assertTrue(r['childMayApplyPreviouslyApprovedDueCleanup']);self.assertEqual(api.posts[0][1]['inputs']['confirm'],c.TARGETS[c.PRIMARY][2])
        self.assertEqual(len([p for m,p in api.calls if '/actions/variables/' in p]),8)
    def test_primary_recent_success(self):
        e=env('PRIMARY_BACKUP');api=API(c.PRIMARY,rows=[row(c.PRIMARY,at=NOW-dt.timedelta(minutes=30))]);self.open(e);self.assertEqual(self.tick(api,e)['status'],'DEFER_RECENT_PRIMARY_EXECUTION_NO_DISPATCH');self.assert_no_post(api)
    def test_primary_wrong_private_mode(self):
        e=env('PRIMARY_BACKUP');api=API(c.PRIMARY);api.vars['P6_PRIVATE_EPOCH_EXPIRY_MODE']='APPLY_DUE_ONLY';self.open(e);self.assertRaisesRegex(c.Hold,'PRIMARY_APPROVAL_OR_PRIVATE_MODE_DRIFT',self.tick,api,e);self.assert_no_post(api)
    def test_primary_predecessor_failure(self):
        e=env('PRIMARY_BACKUP');api=API(c.PRIMARY,rows=[row(c.PRIMARY,conclusion='failure')]);self.open(e);self.assertRaisesRegex(c.Hold,'PRIMARY_PREDECESSOR_REVIEW_REQUIRED',self.tick,api,e);self.assert_no_post(api)
    def test_primary_predecessor_green_but_step_skipped(self):
        e=env('PRIMARY_BACKUP');api=API(c.PRIMARY);api.jobs[123]['steps'][0]['conclusion']='skipped';self.open(e);self.assertRaisesRegex(c.Hold,'PRIMARY_PREDECESSOR_REVIEW_REQUIRED',self.tick,api,e);self.assert_no_post(api)
    def test_primary_acked_failure_durable_hold(self):
        e=env('PRIMARY_BACKUP');api=API(c.PRIMARY);self.open(e);self.tick(api,e)
        r=row(c.PRIMARY,rid=987,event='workflow_dispatch',at=NOW,conclusion='failure');api.by_id[987]=r;api.jobs[987]=job(r,c.PRIMARY,conclusion='failure',step='failure')
        with self.assertRaisesRegex(c.Hold,'PRIMARY_TERMINAL_FAILURE'):self.tick(api,e,NOW+dt.timedelta(minutes=15))
        self.j.close();self.open(e,init=False)
        with self.assertRaisesRegex(c.Hold,'PRIMARY_TERMINAL_FAILURE'):self.tick(api,e,NOW+dt.timedelta(minutes=30))
        self.assertEqual(len(api.posts),1)
    def test_truncated_journal_no_replay(self):
        self.open(); self.j.close();self.j.path.write_bytes(self.j.path.read_bytes()+b'{')
        with self.assertRaisesRegex(c.Hold,'TRUNCATED_JOURNAL'):self.open(init=False)
    def test_wrong_scope(self):
        self.open();self.j.close()
        with self.assertRaisesRegex(c.Hold,'JOURNAL_SCOPE_DRIFT'):self.open(env('PRIMARY_BACKUP'),init=False)
    def test_reinitialize_refused(self):
        self.open();self.j.close()
        with self.assertRaisesRegex(c.Hold,'JOURNAL_UNAVAILABLE'):self.open()
    def test_second_instance_lock(self):
        self.open()
        with self.assertRaisesRegex(c.Hold,'JOURNAL_UNAVAILABLE'):c.Journal(self.dir,self.j.scope)
    def test_fsync_failure_blocks_future_attempt(self):
        api=API();self.open()
        with patch.object(c.os,'fsync',side_effect=OSError('disk failed')):
            with self.assertRaisesRegex(c.Hold,'JOURNAL_WRITE_UNCERTAIN'):self.tick(api)
        with self.assertRaisesRegex(c.Hold,'JOURNAL_WRITE_UNCERTAIN'):self.tick(api,at=NOW+dt.timedelta(minutes=15))
        self.assert_no_post(api)
    def test_main_drift_after_preflight(self):
        api=API();self.open();calls=0;original=api.__call__
        def change(m,p,b=None):
            nonlocal calls
            if p=='/git/ref/heads/main':
                calls+=1
                if calls==2:api.main='b'*40
            return original(m,p,b)
        self.assertRaisesRegex(c.Hold,'MAIN_CHANGED',c.tick,change,env(),lambda:NOW,lambda x:None,self.j);self.assert_no_post(api)
    def test_trial_id_required(self):
        api=API();e=env();e['TRAVNR_CLOCK_TRIAL_ID']='invalid';self.assertRaisesRegex(c.Hold,'INVALID_TRIAL_ID',self.tick,api,e);self.assert_no_post(api)

if __name__=='__main__':unittest.main()
