# Improvement Backlog (Critical Check)

Last updated: 2026-04-19

## High Priority

1. **[DONE] Decouple buy flow from menu navigation entirely**
   - **Impact:** removes the remaining edge case where deferred-PIN residents may still hit PIN flow before pure buy-only access in specific menu transitions.
   - **Effort:** medium.
   - **Delivered (2026-04-19):** dedicated `/buy` route now exists and resident house selection defaults there.

2. **[DONE] Run restore drills for backups**
   - **Impact:** verifies backups are actually usable during incidents.
   - **Effort:** medium.
   - **Delivered (2026-04-19):** restore drill script (`npm run backup:restore:drill`) added with table-count sanity checks and checklist output.

3. **[DONE] Session and auth observability**
   - **Impact:** faster debugging for login/PIN issues.
   - **Effort:** low.
   - **Delivered (2026-04-19):** structured auth logging now covers admin/resident/legacy login outcomes and auth rate-limit hits.

## Medium Priority

1. **[DONE] Manager/Admin workflow shortcuts**
   - **Impact:** fewer clicks for frequent operations.
   - **Effort:** medium.
   - **Delivered (2026-04-19):** operation homes now include quick actions for resident edit, fridge item update, and billing-run creation.

2. **[DONE] Fridge item analytics**
   - **Impact:** better stocking and pricing decisions.
   - **Effort:** medium.
   - **Delivered (2026-04-19):** per-item consumption panel added with range selector and CSV export.

3. **[PARTIAL] UI consistency pass**
   - **Impact:** cleaner professional feel across all pages.
   - **Effort:** medium.
   - **Next step:** apply shared spacing/typography/card patterns to manager and admin secondary pages.
   - **State check (2026-04-18):** major admin/manager redesign shipped; second-pass consistency cleanup is still open.

## Low Priority

1. **[DONE] Print-ready bulk QR sheet**
   - **Impact:** easier physical setup in houses.
   - **Effort:** low.
   - **Delivered (2026-04-19):** admin/manager fridge pages now link to a printable all-fridge QR sheet.

2. **[DONE] PWA installability**
   - **Impact:** faster mobile access from dorm devices.
   - **Effort:** medium.
   - **Delivered (2026-04-19):** manifest, icons, service worker registration, and offline fallback page added.

3. **[DONE] Optional alerting for failed backup sends**
   - **Impact:** quicker response when email delivery breaks.
   - **Effort:** low.
   - **Delivered (2026-04-19):** backup loop now posts optional webhook alerts on failure/crash.
