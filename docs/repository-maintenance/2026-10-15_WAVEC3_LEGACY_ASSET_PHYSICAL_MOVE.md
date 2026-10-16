# Wave C3 — proposed physical classification of 42 Replit root attachments (2026-10-15)

**Baseline `main=b4f147750662e9636a354aa271d373352d0069be`; isolated draft branch `repo-wavec3-legacy-client-assets-20261015`.** Do not merge until independently reviewed and exact-head offline build/tests pass. No Replit deployment, provider API access, SQL or budget use was part of this work.

## Why the old suggestion needed correction

Moving **all** `attached_assets/` objects to `client/src/assets/images/` would place 23 TXT files and a 584,612-byte ZIP into an image-only directory. This PR honors the intended cleanup *with role-based classification*:

- **18 PNG / 1,896,542 bytes** → `client/src/assets/images/legacy-attachments/` (separate from six active destination photos).
- **23 TXT + 1 ZIP / 719,772 bytes** → `docs/history/legacy-replit-attachments/` (non-current inputs).
- `vite.config.ts` updates `@assets` to the relocated image location. `scripts/repo_cleanup_reference_audit.mjs` replaces the old protected root with two preserved prefixes (the scanner still detects literal stale old-path references). Existing structural test updates the two required destinations, and a new SHA/absence test verifies all 42 moves.

**No original bytes are changed and no copy left at root.** These are the precise former path→new path mappings, verified against GitHub `main` Git tree (a file's Git SHA is a content identifier, not a claim its private content was reviewed).

| Before | After | Original Git blob SHA | Original bytes |
|---|---|---|---:|
| `attached_assets/IMG_5534_1772068196299.png` | `client/src/assets/images/legacy-attachments/IMG_5534_1772068196299.png` | `ebe6159f01214ffbf4f8518f6c337d8e755ffdba` | 454470 |
| `attached_assets/Pasted-Before-I-manually-configure-Bland-Dynamic-Data-in-the-B_1777685941718.txt` | `docs/history/legacy-replit-attachments/Pasted-Before-I-manually-configure-Bland-Dynamic-Data-in-the-B_1777685941718.txt` | `61eadd45efeb71af9a54272e7224719b5c0feec5` | 3411 |
| `attached_assets/Pasted-Build-a-full-stack-web-app-called-Travnr-a-personal-tra_1771098877225.txt` | `docs/history/legacy-replit-attachments/Pasted-Build-a-full-stack-web-app-called-Travnr-a-personal-tra_1771098877225.txt` | `85c83a422e68b89de394ca133f5cd43ae9545edd` | 14681 |
| `attached_assets/Pasted-Create-proper-Privacy-Policy-and-Terms-of-Service-pages_1777766650690.txt` | `docs/history/legacy-replit-attachments/Pasted-Create-proper-Privacy-Policy-and-Terms-of-Service-pages_1777766650690.txt` | `282cd9d8ba34e396b3d9f6f24edd4ba6247873aa` | 19931 |
| `attached_assets/Pasted-Five-fixes-additions-to-the-Travnr-admin-dashboard-Here_1776979699206.txt` | `docs/history/legacy-replit-attachments/Pasted-Five-fixes-additions-to-the-Travnr-admin-dashboard-Here_1776979699206.txt` | `47fd6bad0af4c4b0ae8e6384cb9ea43e2bd415e2` | 7617 |
| `attached_assets/Pasted-Fix-the-admin-dashboard-data-issues-in-server-routes-ts_1776965374887.txt` | `docs/history/legacy-replit-attachments/Pasted-Fix-the-admin-dashboard-data-issues-in-server-routes-ts_1776965374887.txt` | `70e2f3b9122f6623fe9fe792d583acb55653c871` | 2905 |
| `attached_assets/Pasted-Fix-the-admin-dashboard-data-issues-in-server-routes-ts_1776966481902.txt` | `docs/history/legacy-replit-attachments/Pasted-Fix-the-admin-dashboard-data-issues-in-server-routes-ts_1776966481902.txt` | `70e2f3b9122f6623fe9fe792d583acb55653c871` | 2905 |
| `attached_assets/Pasted-I-need-two-major-features-added-to-the-Travnr-app-Here-_1776963405019.txt` | `docs/history/legacy-replit-attachments/Pasted-I-need-two-major-features-added-to-the-Travnr-app-Here-_1776963405019.txt` | `c310919dbcf5b98c43eacfe7a90c5d87e36635a1` | 6735 |
| `attached_assets/Pasted-IMPORTANT-Do-not-change-anything-except-what-is-specifi_1777336931604.txt` | `docs/history/legacy-replit-attachments/Pasted-IMPORTANT-Do-not-change-anything-except-what-is-specifi_1777336931604.txt` | `0fa743b554df84a7f2c4f0d19df5a8ff666ba92c` | 2953 |
| `attached_assets/Pasted-IMPORTANT-This-codebase-is-in-active-use-and-mostly-wor_1777052446636.txt` | `docs/history/legacy-replit-attachments/Pasted-IMPORTANT-This-codebase-is-in-active-use-and-mostly-wor_1777052446636.txt` | `c157723d9094c24d9a0d2e1004c72286f3e6af55` | 4383 |
| `attached_assets/Pasted-IMPORTANT-This-codebase-is-in-active-use-and-mostly-wor_1777291230221.txt` | `docs/history/legacy-replit-attachments/Pasted-IMPORTANT-This-codebase-is-in-active-use-and-mostly-wor_1777291230221.txt` | `742ac3c3871c75e7ddb753d245ff0c57d7123e84` | 8702 |
| `attached_assets/Pasted-IMPORTANT-This-codebase-is-in-active-use-and-mostly-wor_1777291230346.txt` | `docs/history/legacy-replit-attachments/Pasted-IMPORTANT-This-codebase-is-in-active-use-and-mostly-wor_1777291230346.txt` | `742ac3c3871c75e7ddb753d245ff0c57d7123e84` | 8702 |
| `attached_assets/Pasted-IMPORTANT-This-codebase-is-in-active-use-and-mostly-wor_1777291272855.txt` | `docs/history/legacy-replit-attachments/Pasted-IMPORTANT-This-codebase-is-in-active-use-and-mostly-wor_1777291272855.txt` | `742ac3c3871c75e7ddb753d245ff0c57d7123e84` | 8702 |
| `attached_assets/Pasted-IMPORTANT-This-codebase-is-in-active-use-and-mostly-wor_1777300049409.txt` | `docs/history/legacy-replit-attachments/Pasted-IMPORTANT-This-codebase-is-in-active-use-and-mostly-wor_1777300049409.txt` | `7a52f3585ae4fa6baa8204ea17680f22db2f31b4` | 3547 |
| `attached_assets/Pasted-Read-every-file-in-the-project-before-making-any-change_1776823654318.txt` | `docs/history/legacy-replit-attachments/Pasted-Read-every-file-in-the-project-before-making-any-change_1776823654318.txt` | `cfe10f225dfe1d49628e39068f64388d26e0b108` | 2641 |
| `attached_assets/Pasted-Read-server-lib-bland-ts-in-full-before-making-any-chan_1776993442013.txt` | `docs/history/legacy-replit-attachments/Pasted-Read-server-lib-bland-ts-in-full-before-making-any-chan_1776993442013.txt` | `ad3ded00dfd9c3ca747e486a569c677735d8881f` | 2088 |
| `attached_assets/Pasted-Read-these-files-in-full-before-making-any-changes-serv_1776825621672.txt` | `docs/history/legacy-replit-attachments/Pasted-Read-these-files-in-full-before-making-any-changes-serv_1776825621672.txt` | `e33830840131e15b206e435ddf071283ea844f08` | 3766 |
| `attached_assets/Pasted-Read-these-files-in-full-before-making-any-changes-serv_1776996479994.txt` | `docs/history/legacy-replit-attachments/Pasted-Read-these-files-in-full-before-making-any-changes-serv_1776996479994.txt` | `9979304fed6489a075e7a4b57f8598c04260b8c8` | 2642 |
| `attached_assets/Pasted-Read-these-files-in-full-before-touching-anything-serve_1776820476065.txt` | `docs/history/legacy-replit-attachments/Pasted-Read-these-files-in-full-before-touching-anything-serve_1776820476065.txt` | `dc997d66d20bf705fe673527d44bebba8542a098` | 2157 |
| `attached_assets/Pasted-Set-up-Travnr-SMS-proposal-delivery-infrastructure-with_1777767597105.txt` | `docs/history/legacy-replit-attachments/Pasted-Set-up-Travnr-SMS-proposal-delivery-infrastructure-with_1777767597105.txt` | `76544d8d38b95e3d30644c64f52e91b12fdfab86` | 7073 |
| `attached_assets/Pasted-The-Bland-webhook-URL-in-the-Bland-dashboard-is-already_1777682924902.txt` | `docs/history/legacy-replit-attachments/Pasted-The-Bland-webhook-URL-in-the-Bland-dashboard-is-already_1777682924902.txt` | `c83a5016f6b0e5c4de29270f0b613d2c7ad62c38` | 3904 |
| `attached_assets/Pasted-We-are-adding-hidden-hotel-infrastructure-to-Travnr-but_1777777742955.txt` | `docs/history/legacy-replit-attachments/Pasted-We-are-adding-hidden-hotel-infrastructure-to-Travnr-but_1777777742955.txt` | `f123e480968853437779e0da73d3b09591965e8a` | 4802 |
| `attached_assets/Pasted-We-found-a-real-issue-with-inbound-caller-identity-When_1777761335968.txt` | `docs/history/legacy-replit-attachments/Pasted-We-found-a-real-issue-with-inbound-caller-identity-When_1777761335968.txt` | `10cf793db51f4308b04aeeb40b76bf089819bd78` | 3126 |
| `attached_assets/Pasted-You-are-working-on-the-Travnr-website-Goal-Improve-Trav_1777800542211.txt` | `docs/history/legacy-replit-attachments/Pasted-You-are-working-on-the-Travnr-website-Goal-Improve-Trav_1777800542211.txt` | `a7bfc5926acc95fae5d7553acf7a4f66e08e60ee` | 7787 |
| `attached_assets/Screenshot_2026-02-13_at_11.46.50_PM_1771098913727.png` | `client/src/assets/images/legacy-attachments/Screenshot_2026-02-13_at_11.46.50_PM_1771098913727.png` | `a5204b3a3451d2c0db63cf7300800a9bd6f03039` | 51601 |
| `attached_assets/Screenshot_2026-02-14_at_1.55.00_PM_1771098913727.png` | `client/src/assets/images/legacy-attachments/Screenshot_2026-02-14_at_1.55.00_PM_1771098913727.png` | `d86c2f9738f30c6dead113f71601619193cc334f` | 285463 |
| `attached_assets/Screenshot_2026-02-14_at_5.15.23_PM_1771111055053.png` | `client/src/assets/images/legacy-attachments/Screenshot_2026-02-14_at_5.15.23_PM_1771111055053.png` | `644e715e935d0d2c3621adfb8f80b2c6bdacbdd7` | 18361 |
| `attached_assets/Screenshot_2026-02-22_at_2.58.24_PM_1771793906904.png` | `client/src/assets/images/legacy-attachments/Screenshot_2026-02-22_at_2.58.24_PM_1771793906904.png` | `c86f250e9498555be323514dd6aea1a3d2ba9dc1` | 100636 |
| `attached_assets/Screenshot_2026-02-22_at_2.58.34_PM_1771793917353.png` | `client/src/assets/images/legacy-attachments/Screenshot_2026-02-22_at_2.58.34_PM_1771793917353.png` | `78a1f78e9344f3d8deba63146b2eb976581321ad` | 225231 |
| `attached_assets/Screenshot_2026-02-22_at_3.04.34_PM_1771794275524.png` | `client/src/assets/images/legacy-attachments/Screenshot_2026-02-22_at_3.04.34_PM_1771794275524.png` | `039af6e99db084448425c89ef8e5d1bd926fcef1` | 169603 |
| `attached_assets/Screenshot_2026-04-23_at_4.12.35_PM_1776978761554.png` | `client/src/assets/images/legacy-attachments/Screenshot_2026-04-23_at_4.12.35_PM_1776978761554.png` | `0ecae810f012cb5600412bde9b7a975cc4c5f4e3` | 23622 |
| `attached_assets/Screenshot_2026-05-03_at_1.10.21_AM_1777788686653.png` | `client/src/assets/images/legacy-attachments/Screenshot_2026-05-03_at_1.10.21_AM_1777788686653.png` | `614195d205a02e2f29db81600a7faa82be3a29fd` | 9046 |
| `attached_assets/Screenshot_2026-05-03_at_3.17.09_AM_1777796235646.png` | `client/src/assets/images/legacy-attachments/Screenshot_2026-05-03_at_3.17.09_AM_1777796235646.png` | `0b5e91a137f834e3033eae6c57a033c55867e19f` | 10988 |
| `attached_assets/Screenshot_2026-05-03_at_3.22.44_AM_1777796569780.png` | `client/src/assets/images/legacy-attachments/Screenshot_2026-05-03_at_3.22.44_AM_1777796569780.png` | `d9b8aa3373d50abb66bcdee0ebaa21ae48336e64` | 76093 |
| `attached_assets/Screenshot_2026-05-03_at_3.24.19_AM_1777796665591.png` | `client/src/assets/images/legacy-attachments/Screenshot_2026-05-03_at_3.24.19_AM_1777796665591.png` | `4ca8374b36b40afb6e6651794a0bfa5e31ca215d` | 62663 |
| `attached_assets/Screenshot_2026-05-03_at_4.00.45_AM_1777798931058.png` | `client/src/assets/images/legacy-attachments/Screenshot_2026-05-03_at_4.00.45_AM_1777798931058.png` | `2cb93bfe595444d6abb91a2f4c8dda2d14d85e24` | 9536 |
| `attached_assets/Screenshot_2026-05-03_at_4.01.53_AM_1777799212597.png` | `client/src/assets/images/legacy-attachments/Screenshot_2026-05-03_at_4.01.53_AM_1777799212597.png` | `f2c90f95e44c6cda10306f510a00e894dbf1d365` | 24820 |
| `attached_assets/_favicon_1771098927785.png` | `client/src/assets/images/legacy-attachments/_favicon_1771098927785.png` | `6f1f7fed24008c29014fc4b1f9eb4631febaab60` | 9844 |
| `attached_assets/image_1771521625481.png` | `client/src/assets/images/legacy-attachments/image_1771521625481.png` | `6b4271c0a2f40df22de26f56f4cb193be20f6dcd` | 4363 |
| `attached_assets/image_1772307616240.png` | `client/src/assets/images/legacy-attachments/image_1772307616240.png` | `cdc24076ee99b7a8fc0364bfb45f07cb135e1660` | 88393 |
| `attached_assets/travnr-airplane-icon.png` | `client/src/assets/images/legacy-attachments/travnr-airplane-icon.png` | `87be6b56acfd385bd30c1de0c982599a0407c6b3` | 271809 |
| `attached_assets/travnr-project_1771519817145.zip` | `docs/history/legacy-replit-attachments/travnr-project_1771519817145.zip` | `05a72519f63510d24b15e078d086af6656468dae` | 584612 |

## Limits and review requirements

- Before proposing this PR, a direct string/path scan of **109 client code files, 150 server code files, 161 scripts, 175 tests, and 13 GitHub workflow YAML files** found only the Vite alias, repo cleanup reference-audit protected root and historical Oct 4 structural test as operational old-asset references. This is a **literal scan only**, not proof about dynamic paths, built frontend runtime, hidden deployment overlays, or untracked Replit uploads. A full build/regression suite remains mandatory. `.replit` configuration also inspected (no direct attachment path).
- Client source files were read without modifications. The alias still supports image imports by original bare filename. No currently inspected client module directly used `@assets` or `attached_assets`.
- Historical uploaded TXT/ZIP contents and images were not opened or adjudicated safe to publish, duplicate or delete. This proposal **reclassifies directory placement**, not validity of their instructions or privacy status.
- Keep all 108 original scientific sources, all 352 original machine receipts, 32 AUTH files, Plan/Log/ledger, protected snapshot, old Git history and Gate 3 PR #36 undisturbed. YSSY P25 remains failed/DELIVERY_GAP, 231 billed/229 received.
- Independent unmerged Wave C1 [PR #48](https://github.com/HKcode22/ReplitTranvr/pull/48) and Wave C2 [PR #49](https://github.com/HKcode22/ReplitTranvr/pull/49) touch shared navigation docs. **Resolve merge order and rebase before any owner-approved main merge.** This proposal creates no paid workflow or historical branch deletions.

## CI/approval checklist

- [ ] New proposed head 42/42 SHA identity and zero old paths.
- [ ] Original structural test, repository scanner, full no-provider production build, TypeScript and Postgres safety suites on exact head.
- [ ] Owner review/approval before merge; do not assume an offline build proves Replit deployment equivalence.

**Next session:** check PR test results; inspect root/data-collection/docs/history navigation merge collisions across C1/C2/C3; then separately review old branch refs and paid Actions artifacts before any named deletion. No branch/Actions deletion is implied.
