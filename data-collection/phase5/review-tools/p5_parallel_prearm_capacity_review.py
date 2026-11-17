import json, zipfile, hashlib, bisect, math, collections, sys
from datetime import datetime, timezone
from pathlib import Path
if len(sys.argv)!=2: raise SystemExit('usage: python p5_parallel_prearm_capacity_review.py <original-review-artifact.zip>')
p=Path(sys.argv[1])
assert hashlib.sha256(p.read_bytes()).hexdigest()=='53ad64037ab06194e6f4d4e2f40e91e07e0d42cb0acc44ffabdc545c576a8ff5'
with zipfile.ZipFile(p) as z: raw=z.read('review-only.json')
assert hashlib.sha256(raw).hexdigest()=='a4f9229ea4454ca17301f2f2a518dfba1eda2c86f1c8bc55ceede13f8e70ca48'
x=json.loads(raw)
mins=lambda s:int(datetime.fromisoformat(s.replace('Z','+00:00')).timestamp()//60)
rows=[]; day_ready={}; firsts={}
for d in x['shapeEnvelope']['days']:
 day=d['runDayIndex']; dayrows=[]
 for s in d['activeSegments']:
  for t in range(mins(s['startUtc']),mins(s['endUtc']),15):
   for h,offset in [('T-24h',1440),('T-6h',360),('T-90m',90)]:
    for slot in range(4): dayrows.append((t-offset-15,day,h,slot,s['segmentIndex']))
 assert len(dayrows)==len(set(dayrows)); firsts[day]=min(r[0] for r in dayrows)
 rows+=dayrows
rows.sort(); assert len(rows)==len(set(rows))==6144 and len(firsts)==31
assert collections.Counter(r[2] for r in rows)=={'T-24h':2048,'T-6h':2048,'T-90m':2048}
assert len([r for r in rows if r[1]==1])==192
# Exact queue admission model, not actual GitHub/external service simulation.
# Available rows may be restricted by a hypothetical per-day readiness clock.
def sim(rows,lead=90,cap=24,batch=8,tail=3,blackout=None,ready_before=None,offset=5,interval=10):
 times=[r[0] for r in rows]; lo=math.ceil((times[0]-lead-offset)/interval)*interval+offset
 active=[]; seen=set(); peak=0; blocked=0; prep=0; missed_by_day=collections.Counter()
 for tick in range(lo,times[-1]-15+1,interval):
  active=[t for t in active if t>tick]
  if blackout and blackout[0]<=tick<blackout[1]:continue
  a=bisect.bisect_left(times,tick+15); b=bisect.bisect_right(times,tick+lead)
  eligible=[i for i in range(a,b) if i not in seen and (ready_before is None or tick>=firsts[rows[i][1]]-ready_before)]
  n=min(batch, cap-len(active),len(eligible))
  if n<min(batch,len(eligible)):blocked+=1
  for i in eligible[:n]:
   seen.add(i);active.append(times[i]+tail);prep+=times[i]-tick
  peak=max(peak,len(active))
 for i,r in enumerate(rows):
  if i not in seen:missed_by_day[r[1]]+=1
 return dict(admitted=len(seen),missed=len(rows)-len(seen),peak=peak,blockedTicks=blocked,meanAdvanceMin=round(prep/len(seen),2) if seen else None,missedByDay=dict(missed_by_day))
out={'schema':'p5.review.capacity_sensitivity.v1','status':'DETERMINISTIC_CAPACITY_SCENARIO_NOT_LIVE_MEASUREMENT','archivedInputSha256':hashlib.sha256(raw).hexdigest(),'templates':len(rows),'fullCalendarProfiles':[],'day1Worst60mByReadiness':[],'providerCalls':0,'databaseWrites':0,'phase6PaidGo':False}
for lead in (35,60,90,105):
 for cap in (12,16,20,24):
  for tail in (3,15):
   out['fullCalendarProfiles'].append(dict(lead=lead,cap=cap,batch=8,tail=tail,**sim(rows,lead,cap,tail=tail)))
day1=[r for r in rows if r[1]==1]
for lead in (35,60,90,105):
 for ready in (None,120,60,30,20):
  normal=sim(day1,lead,ready_before=ready)
  worst=-1; worst_start=None
  for t in range(math.ceil((day1[0][0]-120-5)/10)*10+5,day1[-1][0]-15+1,10):
   r=sim(day1,lead,ready_before=ready,blackout=(t,t+60))
   if r['missed']>worst:worst=r['missed'];worst_start=t
  out['day1Worst60mByReadiness'].append(dict(lead=lead,readyBeforeFirstRequestMinutes=ready,nominal=normal,worst60mMissed=worst,worstStartUtc=datetime.fromtimestamp(worst_start*60,timezone.utc).isoformat()))
# Reproduce the separately executed day-1 comparison, using identical geometry.
assert [(sim(day1,l)['missed'],sim(day1,l)['peak']) for l in (35,60,90,105)]==[(0,12),(0,20),(0,24),(0,24)]
print(json.dumps(out,indent=2))
