from pathlib import Path
import subprocess,tempfile,json,os,sys
assert len(sys.argv)==2
s=Path(sys.argv[1]).read_text()
functions=s[:s.index('if [[ "${1:-}" == SELF_TEST ]]')]
body=s[s.index('PAUSE_STARTED=0\n'):]
# Keep production fresh-census / day4 read code; fake node is a bounded
# offline port and records read kinds, never real DB.
base_cells=[]
for d in range(1,32):
 for h in ['T-24h','T-6h','T-90m']:
  x={'day':d,'horizon':h,'status':'NO_PREPARED_ROWS_OBSERVED_NOT_ZERO_YIELD'}
  if (d,h)==(3,'T-6h'): x.update(status='PREPARED_DENOMINATOR_OBSERVED',prepared=64,open_unreserved=0,future_unreserved=0)
  if (d,h)==(3,'T-90m'): x.update(status='PREPARED_DENOMINATOR_OBSERVED',prepared=64,reservations=8,bindings=4,timely_bindings=4,elapsed_unreserved=0,open_unreserved=4,future_unreserved=52,stopped_unreserved=0)
  if (d,h)==(4,'T-24h'): x.update(status='PREPARED_DENOMINATOR_OBSERVED',prepared=64,reservations=0,open_unreserved=0,future_unreserved=64,stopped_unreserved=0,next_planned_utc='2026-11-27T11:45:00.000Z')
  base_cells.append(x)
base={'status':'SIGNED_CALENDAR_PREPARED_QUERY_AND_SPLIT_COUNTS_READONLY','calendarDays':31,'providerCalls':0,'databaseWrites':0,'observedAtUtc':'2026-11-27T06:45:00.000Z','cells':base_cells}
funnel='\n'.join(json.dumps(x) for x in [{'status':'P6_SOURCE_RESERVATION_AND_STOP_READONLY','at':'2026-11-27T06:45:00.000Z','unresolvedStops':0,'providerCalls':0,'productionWrites':0},{'status':'P6_PRIVATE_PACKET_AND_PRE_TASK_CUSTODY_READONLY','at':'2026-11-27T06:45:00.000Z','tasks':[],'providerCalls':0,'productionWrites':0}])
mock=r'''
R=target; L=relay; OLD=old; ROLD=relayold; H=targethead; TARGET_PR=979; ENV=protected
stage=MOCK; OP="$MOCK_OP"; OUTER="$MOCK_ROOT/outer"; TMP="$MOCK_ROOT/tmp"; mkdir -p "$OUTER" "$TMP"
log(){ echo "$*" >> "$MOCK_ROOT/events"; }
hold(){ echo "HOLD_$1" >&2;exit 2; }
main(){ if [[ "$1" == "$R" ]];then cat "$MOCK_ROOT/main";else echo relayold;fi; }
pr(){ if [[ "$(main "$R")" == old ]];then echo '{"state":"OPEN"}';else echo '{"state":"MERGED"}';fi; }
statecheck(){ if [[ "$(main "$R")" == old ]];then echo OPEN;else echo MERGED;fi; }
ci(){ log "ci $3"; [[ "$MOCK_CASE" != CI_FAIL ]] || hold CI_NOT_GREEN; }
v(){ if [[ "$2" == P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED ]];then cat "$MOCK_ROOT/source";else cat "$MOCK_ROOT/$2";fi; }
vars(){ echo '[]'; }
value(){ echo __ABSENT__; }
pin(){ log "pin $2 $4"; if [[ "$2" == P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED ]];then echo "$4" > "$MOCK_ROOT/source";else if [[ "$MOCK_CASE" == PIN_FAIL && "$2" == P7_EXPIRY_APPROVED_MAIN_SHA ]];then hold INJECT_PIN_FAIL;fi; echo "$4" > "$MOCK_ROOT/$2";fi; }
guard(){ [[ "$(v "$1" "$2")" == "$3" ]] || hold GUARD; }
merge_exact(){ log merge; [[ "$(cat "$MOCK_ROOT/source")" == false ]] || hold MERGE_SOURCE_NOT_PAUSED; echo new > "$MOCK_ROOT/main"; }
all_main_quiet(){ if [[ "$MOCK_CASE" == ACTIVE ]];then return 3;fi; return 0; }
wait_all_quiet(){ all_main_quiet || hold ACTIVE; }
cutover_pre_tasks_ok(){ [[ "$MOCK_CASE" != STOP ]] ; }
blob(){ case "$2" in */pins.sh) cat > "$2" <<'EOF'
set -e
mode="$3"; target="$1"; test "$(cat "$MOCK_ROOT/main")" = "$target"
case "$mode" in PAUSED) test "$(cat "$MOCK_ROOT/source")" = false;; SOURCE_ONLY) test "$(cat "$MOCK_ROOT/source")" = true;; *) exit 2;; esac
for k in P6_PHASE5B_RUNTIME_EXECUTABLE_SHA P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA P7_EXPIRY_APPROVED_MAIN_SHA TRAVNR_APPROVED_TARGET_MAIN_SHA;do test "$(cat "$MOCK_ROOT/$k")" = "$target";done
echo "P6_POST_CUTOVER_VARIABLE_READBACK_PASS_${mode}_NO_WRITES"
EOF
;; */retention.sh) cat > "$2" <<'EOF'
set -e
echo "retention $2" >> "$MOCK_ROOT/events"
if [[ "$2" == new && "$MOCK_CASE" == RETENTION_FAIL ]];then exit 2;fi
EOF
;; *) : > "$2";; esac; }
node(){ case "$1" in --check) return 0;; --input-type=module) cat >/dev/null; log unarmed; [[ "$MOCK_CASE" != DAY4_ARMED ]] || return 2; echo '{"status":"MAINTENANCE_DAY4_T24_EXACT_64_UNARMED","providerCalls":0,"databaseWrites":0}' ;; */funnel.cjs) cat "$MOCK_ROOT/funnel";; */census.mjs) cat "$MOCK_ROOT/census";; *) return 8;; esac; }
date(){ if [[ "$*" == '-u +%s' ]];then command date -u -d '2026-11-27 06:45:01 UTC' +%s;else command date "$@";fi; }
'''
# avoid any network in fixture; all functions mocked before execution.
for case,op,start,expected_rc,expected_main,expected_source in [
 ('SUCCESS','PAUSE_NEW_SOURCE_DAY3_T90_AND_DEPLOY_979','old',0,'new','true'),
 ('CI_FAIL','PAUSE_NEW_SOURCE_DAY3_T90_AND_DEPLOY_979','old',2,'old','true'),
 ('STOP','PAUSE_NEW_SOURCE_DAY3_T90_AND_DEPLOY_979','old',2,'old','true'),
 ('DAY4_ARMED','PAUSE_NEW_SOURCE_DAY3_T90_AND_DEPLOY_979','old',2,'old','true'),
 ('ACTIVE','PAUSE_NEW_SOURCE_DAY3_T90_AND_DEPLOY_979','old',2,'old','true'),
 ('PIN_FAIL','PAUSE_NEW_SOURCE_DAY3_T90_AND_DEPLOY_979','old',2,'new','false'),
 ('RETENTION_FAIL','PAUSE_NEW_SOURCE_DAY3_T90_AND_DEPLOY_979','old',2,'new','false'),
 ('RECOVER','RECOVER_EXACT_MERGED_PAUSED_979','new',0,'new','true'),
]:
 with tempfile.TemporaryDirectory() as td:
  root=Path(td);(root/'main').write_text(start+'\n');(root/'source').write_text(('false' if start=='new' else 'true')+'\n')
  for k in ['P6_PHASE5B_RUNTIME_EXECUTABLE_SHA','P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA','P7_EXPIRY_APPROVED_MAIN_SHA','TRAVNR_APPROVED_TARGET_MAIN_SHA']:(root/k).write_text('old\n')
  (root/'census').write_text(json.dumps(base));(root/'funnel').write_text(funnel);(root/'events').write_text('')
  p=subprocess.run(['bash','-c',functions+mock+body],env={**os.environ,'MOCK_OP':op,'MOCK_ROOT':td,'MOCK_CASE':case},capture_output=True,text=True,timeout=10)
  events=(root/'events').read_text();actual=(p.returncode,(root/'main').read_text().strip(),(root/'source').read_text().strip())
  assert actual==(expected_rc,expected_main,expected_source), (case,actual,p.stdout,p.stderr,events)
  if case in ('SUCCESS','RECOVER'):
   assert events.index('retention new') < events.rindex('pin P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED true')
   if case=='SUCCESS': assert events.index('ci 21')<events.index('pin P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED false')<events.index('merge')
  if case in ('CI_FAIL','STOP','DAY4_ARMED'):assert 'pin ' not in events and 'merge' not in events
  if case=='ACTIVE':assert 'merge' not in events and 'MAINTENANCE_ABORT_OLD_EXACT_SOURCE_ROUTE_RESTORED' in p.stdout
  if case in ('PIN_FAIL','RETENTION_FAIL'):assert 'pin P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED true' not in events
  print(case, 'PASS', actual)
print('8 mock orchestration scenarios passed; no live GitHub or DB operations')
