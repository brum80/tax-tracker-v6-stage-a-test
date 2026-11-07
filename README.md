# Tax Tracker V6 — Stage A provider-independent reporting prototype

**Date:** 4 November 2026. **Status:** Development only; no HMRC filing capability.

## Scope

This build starts from the V6 data-safety package and **does not alter** the Friday, Expenses or Sites workflows, saved schema, local-storage keys, backup/restore, or tax calculator. It adds `reporting-engine.js`, a pure read-only JavaScript reporting engine, and an expandable reporting card in Summary with generic CSV export buttons.

The reporting module never accesses localStorage, mutates source records, writes audit trails or calls HMRC. Standard reporting periods (6 April–5 July, 6 April–5 October, 6 April–5 January, 6 April–5 April) appear in the UI. Calendar period schedules can be passed to the module only with an explicitly approved configuration; the user interface deliberately does not guess an election.

The engine creates canonical income, expense and mileage data, calculates *cumulative* accounting summaries, annual reconciliation and CIS totals, and exports five generic CSV types: income, expenses, cumulative quarters, CIS and journey mileage. CSV examples in `samples/` are **fully fictional**. They are not provider templates.

## Installation

Use a separate disposable browser origin or a copy of the existing `tax-tracker-v6-dev` repository. Do not deploy over production V5 or import real backups into public GitHub. For a normal development replacement, upload `index.html`, `tax-engine.js`, `reporting-engine.js`, and `manifest.webmanifest` at the site root; retain test files separately. `index.html` now loads both JavaScript modules.

Before updating the development site, export and locally verify a fresh JSON backup. Browser data at the same Pages origin is persistent even if application files change. For safer sandbox testing, run this package at a separate origin or browser profile.

## Tests

On Node.js (22+):

```
node test-engine.js
node test-sites.js
node test-friday.js
node test-safety.js
node test-reporting.js
node create-samples.js
```

All 58 automated checks (42 legacy + 16 Stage A) are self-contained and use fictional fixtures, including the bundled `fictional-v5-fixture.json`. Private V5 and V6 backups were independently reconciled offline during preparation; **private data is not included** in this release.

## Supported output vs unresolved tax rules

- Recognised turnover = recorded net receipt + recorded CIS deduction; no reconstruction where either is missing.
- CIS deductions shown separately, never as expenses.
- Original expense amount and provisional business-use amount retained separately.
- Quarterly *HMRC* allowable expense figures remain **null/unavailable**; category mapping and quarterly reporting treatment are not yet authorised.
- Mileage allowance is informational and **not** included in quarterly expense CSV totals. The module has rate schedules for 2025/26 and 2026/27 car/van mileage; other years return an explicit warning and no invented amount.
- Source mileage eligibility is assumed for simulation, not independently verified.
- No financial inputs are rewritten, no retention ledger, no provider adapters, no filings, no export-state history or persistent audit log.

## Known limitations / Stage B dependencies

1. Tax Rules must approve HMRC category mappings, mixed-use quarterly treatment, mileage adjustment treatment and filing-stage rounding.
2. Additional CIS material/deduction-base exceptions cannot be reconstructed from bank net alone. The engine warns rather than fabricates missing values.
3. Historical V5 records can lack explicit CIS rate and contractor snapshots; stored CIS is used, and an informational review warning is issued.
4. Source corrections are handled by recalculating from current input; Stage A does not retain historical revisions or previously generated report snapshots.
5. Calendar reporting requires explicit approval of start and four end dates; there is no claimed election for the user.
6. CSV exports are generic two-decimal-pound formats, not MTD-compatible provider templates. Export alone is not a digital filing or acknowledgement.
7. Browser integration has passed JavaScript syntax and code-level regression tests; isolated desktop browser and manual iPhone tests still required. The package is NOT yet accepted for deployment.
8. The legacy V6 Summary's existing tax calculator and quarterly overview are retained; the new Stage A reporting section is supplemental, not a replacement.

## Rollback

1. Preserve a clean user-downloaded V6 JSON backup outside browser storage.
2. In the **development repository only**, restore the previous `index.html` and remove `reporting-engine.js` and Stage A reporting files; leave V5 untouched.
3. Reload the development page. Stage A uses no new persistent storage fields or migration, so existing V6 browser data should remain readable.
4. Compare Summary to the established clean baseline before further use. If necessary, restore the verified clean backup via the app's normal restore workflow.

**Release decision:** Stage A can be reviewed in isolation; Stage B must wait for formal tax-rule mapping and filing-treatment approvals. No production deployment has been performed.

## Stage A acceptance note — 7 November 2026

The test fixture dependency in `test-sites.js` and `test-friday.js` has been replaced by a wholly fictional, bundled V5-style JSON fixture. All 58 checks pass from the extracted folder without any private backup. Financial benchmarks were separately verified with private backups locally, **not included in this ZIP**. The application and reporting engine have not been otherwise modified by this packaging update. See `STAGE_A_ACCEPTANCE_REPORT.md` for the outstanding acceptance checks and decision.
