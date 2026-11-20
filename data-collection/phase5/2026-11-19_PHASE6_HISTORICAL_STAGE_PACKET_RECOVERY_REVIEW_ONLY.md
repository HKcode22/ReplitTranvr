# Phase 6 historical Phase-5 stage packet recovery — review only

Date: 2026-11-19 Pacific  
Status: **RECOVERY FALLBACK ONLY / NO PROVIDER / NO DB / NO SOURCE ENABLE / NO PAID GO**

The successful Phase-5 final freeze wrote the exact private stage packet to:

`/home/runner/.travnr-phase5-freeze-ae0915d1eb0c/phase5-stage-input.json`

with SHA-256:

`b833c9f52a24a6f953ebf5e2f3df481310b6bedd25a1d41c4f7a5d5833b2e745`.

The preferred Nov-20 restage path uses that exact file directly.

Replit private home directories have disappeared after restarts in prior sessions, so this change provides a **fallback only when the exact file is absent**. It reconstructs the historical *private package bytes*, not the production database freeze:

1. Current production main must still be exactly `0a7b1a28f243de76d4c83026d15f585265ef6f7b`.
2. The fallback creates a detached worktree at the exact historical freeze code `ae0915d1eb0c37651d280ff3f178efdb640ed509`, tree `d08bd85c5c2ba9ca269ff5ffa34bb5fc0165af80`.
3. It fetches the immutable reviewed Phase-5 package compiler blob `d8c6983a8a69c14e11598c92035503bc079a121d`.
4. It changes exactly one historical-environment guard: the old compiler required GitHub `main` itself still to equal the historical commit. That is no longer true because reviewed Phase-6 bridge commits have since landed. The fallback replaces only that remote-main equality check; the historical checkout/code/tree guards remain exact.
5. It runs the compiler with provider credentials and database URLs removed and all collection/arming flags fixed to zero.
6. It accepts the recovery only if the generated stage, manifest, config, calendar and cost identities exactly equal the already-frozen historical hashes.

It does **not**:
- reinstall B0062/V0093;
- re-stage production;
- write PostgreSQL;
- call AeroDataBox;
- touch GitHub secrets;
- enable SOURCE;
- change the scientific freeze;
- change retention policy;
- issue paid GO.

If the original private file still exists and hashes correctly, do not use this fallback.
