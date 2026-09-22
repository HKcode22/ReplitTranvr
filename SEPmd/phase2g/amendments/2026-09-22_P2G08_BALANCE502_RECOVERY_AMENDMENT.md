# Phase-2G Binding Supplement — P2G08 Balance-Control-Plane Recovery

> Frozen prospectively after P2G08 ended and before any further paid WSSS attempt.
> P2G08 is not accepted as a two-hour Stage-1 result.

## P2G08 failure classification

Probe 6/WSSS ended with:
- `duration_censored=true`;
- `stop_reason=balance_read_failed_after_retries`;
- final exact reconciliation `MATCH`;
- provider subscription deleted and no active billable subscription remaining;
- no unresolved incident.

The child process incorrectly returned PASS because the pre-P2G08 code permitted a censored exact-MATCH window to flow into the completed path. That classification is corrected prospectively and P2G08 is excluded from scoring.

## Final bounded recovery authorization

Exactly one further WSSS recovery attempt is authorized. It is an infrastructure/control-plane recovery only, not a scientific-outcome retry.

It requires:
- P2G08 adjudicated to historical `failed` while preserving its metrics and exact reconciliation evidence;
- a fresh runtime/budget and fresh AUTH;
- a new Git HEAD containing the post-P2G08 fail-closed fixes;
- 5-second local callback/credit watchdog retained;
- provider balance cross-check cadence decoupled to 60 seconds;
- repeated provider-balance failures required before fail-closed stop;
- every censored Stage-1 window rejected as completed;
- a pre-launch balance stability canary of three consecutive successful, equal reads;
- unchanged WSSS target, 120-minute duration, frozen weekday time class, exact reconciliation rule, and 500-credit protected exposure ceiling.

No further WSSS retry is automatically authorized after this recovery attempt.

## Scientific anti-bias

The retry is authorized solely by documented provider/control-plane and execution-classification failures. P2G08 yield, flight-count, tail, or ranking metrics are not used to decide whether to retry.

Machine-readable binding:
`artifacts/phase2g-compact6-p2g08-balance502-recovery-freeze-20260922.json`
