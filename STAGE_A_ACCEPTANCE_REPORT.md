# Tax Tracker V6 — Stage A Acceptance Report (interim)

**Date:** 7 November 2026  
**From:** App Development  
**To:** HMRC & MTD Research  
**Status:** Automated acceptance passed; full Stage A acceptance pending manual isolated-browser and iPhone tests  
**Deployment:** Not authorised. Live V5 untouched. Accountant Pack Phase 1 not authorised.

## Scope examined

- Isolated Stage A ZIP: provider-neutral `reporting-engine.js`, V6 app and five fictional generic CSV examples.
- No application source changes were needed for this acceptance packaging pass.
- Replaced the two private-backup-dependent legacy test fixtures with `fictional-v5-fixture.json` and updated test assertions.
- No change to stored record format, JSON backup/restore, tax engine, payment workflow or production deployment.

## Automated tests — verified 7 November 2026

| Suite | Result |
|---|---|
| `test-engine.js` | 16/16 pass |
| `test-sites.js` | 6/6 pass |
| `test-friday.js` | 8/8 pass |
| `test-safety.js` | 12/12 pass |
| `test-reporting.js` | 16/16 pass |
| **Total** | **58/58 pass** |

Tests run in Node.js 22.16.0 against the isolated extracted package using fictional test data. This demonstrates code-level behaviours, not real-browser integration or complete HMRC compliance.

## Independently recalculated private-backup benchmarks

| Field | Original V5 (25 payments) | Clean V6 (26 payments) |
|---|---:|---:|
| Net bank receipts | £20,136.96 | £20,906.96 |
| CIS deducted | £5,034.24 | £5,226.74 |
| Cash-basis recognised turnover | £25,171.20 | £26,133.70 |
| Business miles | 9,440 | 9,864 |
| Mileage allowance | £5,192.00 | £5,425.20 |
| Recorded ordinary expenses | £185.46 | £185.46 |

All six Stage A reporting benchmarks match. Historical original contractual gross is not used as recognised turnover. Private backup files are **not** included in the distribution.

## Required accounting behaviours

- Cumulative quarters include transactions in earlier quarters; no-activity quarters retain cumulative totals.
- Recomputing after an earlier-dated correction changes subsequent cumulative results.
- CIS remains separately summed and is not counted as ordinary expense.
- Mileage schedule is year-specific; unverified years return missing allowance with warning rather than invented values.
- CSV outputs are constructed from the canonical reporting data, with source record IDs.
- Missing CIS, unsupported values and ambiguous reporting classifications produce warnings or exclusion, not invented financial amounts.
- Input data remains unmodified by reporting functions.
- No persistent journal, storage migration, provider format or HMRC API.

## Remaining manual acceptance tests (NOT yet passed)

1. Isolated browser origin: load all four tabs; create, edit and delete fictional payments and expenses; verify Sites behaviour.
2. Verify `Summary` Stage A quarter selector and all five CSV download buttons; inspect resulting downloaded files.
3. Back up, restore and recover the fictional dataset; confirm existing safety prompts and unchanged totals; avoid personal devices/data while testing corruption handling.
4. On iPhone Safari, verify all four tabs, Summary scrolling, quarter selection, CSV downloads and backup/export handling.
5. Compare fresh screenshots or exported totals with the clean V6 benchmark only after preserving a safe JSON backup; do not test destructive restore on main V6 storage.
6. Record app and browser versions and final pass/fail evidence.

## Limitations and blockers

- Category mappings, mixed-use quarterly filing treatment, filing-stage rounding and mileage filing treatment remain unapproved.
- Mileage eligibility is assumed from recorded source; current allowance is informational in quarterly reporting.
- Browser localStorage is device/browser-origin scoped; there is no sync or guarantee against clearing data.
- Legacy source may lack explicit CIS rates or contractor snapshots.
- No formal correction audit or previously-exported snapshot history.
- Current tests check code-level backup validation, not the complete Safari restore/download UI journey.
- Accountant Pack PDF/ZIP/manifests are a separate approved **design**, not implemented functionality.

## Rollback

1. Keep a verified JSON backup in a separate safe location.
2. On the development repository/origin **only**, restore the prior V6 `index.html` and remove the Stage A `reporting-engine.js` reference/files.
3. Reload and verify stored V6 financial totals; restore the verified backup only if necessary through safe restore controls.
4. Never modify V5 or upload personal backup data to GitHub.

## Recommendation

**Conditionally ready for isolated browser and iPhone acceptance tests. Not yet accepted for Stage B or Accountant Pack Phase 1 coding, and not authorised for deployment.**
