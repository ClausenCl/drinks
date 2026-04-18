# Improvement Backlog (Critical Check)

Last updated: 2026-04-18

## High Priority

1. **[PARTIAL] Decouple buy flow from menu navigation entirely**
   - **Impact:** removes the remaining edge case where deferred-PIN residents may still hit PIN flow before pure buy-only access in specific menu transitions.
   - **Effort:** medium.
   - **Next step:** add a dedicated lightweight buy landing route that goes straight to fridge selection.
   - **State check (2026-04-18):** fridge-first button menu is live, but no separate buy-only landing route exists yet.

2. **[OPEN] Run restore drills for backups**
   - **Impact:** verifies backups are actually usable during incidents.
   - **Effort:** medium.
   - **Next step:** monthly restore test on staging/temporary DB and checklist signoff.

3. **[OPEN] Session and auth observability**
   - **Impact:** faster debugging for login/PIN issues.
   - **Effort:** low.
   - **Next step:** structured logs for auth failures with route + outcome + rate-limit hits.

## Medium Priority

1. **[PARTIAL] Manager/Admin workflow shortcuts**
   - **Impact:** fewer clicks for frequent operations.
   - **Effort:** medium.
   - **Next step:** add top-level quick actions (resident edit, fridge item update, billing run).
   - **State check (2026-04-18):** redesigned domain navigation is live, but explicit one-click quick-action controls are still missing.

2. **[OPEN] Fridge item analytics**
   - **Impact:** better stocking and pricing decisions.
   - **Effort:** medium.
   - **Next step:** per-item consumption trends and simple CSV export.

3. **[PARTIAL] UI consistency pass**
   - **Impact:** cleaner professional feel across all pages.
   - **Effort:** medium.
   - **Next step:** apply shared spacing/typography/card patterns to manager and admin secondary pages.
   - **State check (2026-04-18):** major admin/manager redesign shipped; second-pass consistency cleanup is still open.

## Low Priority

1. **[OPEN] Print-ready bulk QR sheet**
   - **Impact:** easier physical setup in houses.
   - **Effort:** low.
   - **Next step:** one page showing all fridge QR codes with labels.

2. **[OPEN] PWA installability**
   - **Impact:** faster mobile access from dorm devices.
   - **Effort:** medium.
   - **Next step:** add manifest/icons and basic offline fallback page.

3. **[OPEN] Optional alerting for failed backup sends**
   - **Impact:** quicker response when email delivery breaks.
   - **Effort:** low.
   - **Next step:** add alert email or webhook when backup script exits with error.
